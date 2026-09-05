import Decimal from 'decimal.js';
import {
  AccountCategory,
  PaymentType,
  PaymentStatus,
  ClearanceStatus,
  DealType
} from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CryptoUtility } from '../utils/crypto.util';
import { GoLivePayload, DoubleEntryValidator } from '../utils/validation.util';

export class SystemService {
  /**
   * Returns current initialization status of the ERP system.
   * Auto-creates the singleton SystemSetting row if it does not exist yet.
   */
  static async getStatus(): Promise<{ isInitialized: boolean; goLiveDate: Date | null }> {
    const setting = await prisma.systemSetting.upsert({
      where: { id: 1 },
      update: {},
      create: { id: 1, isInitialized: false }
    });

    return {
      isInitialized: setting.isInitialized,
      goLiveDate: setting.goLiveDate
    };
  }

  /**
   * Executes the atomic Go-Live initialization in a single Prisma Interactive Transaction.
   * Translates real-world cut-off data into balanced opening ledgers and locks the system.
   */
  static async executeGoLive(
    payload: GoLivePayload
  ): Promise<{ success: boolean; masterRecoveryKey: string | null; goLiveDate: Date }> {
    return prisma.$transaction(
      async (tx) => {
        // 1. Pre-flight Check: Guard against race conditions and double submissions
        const existingSetting = await tx.systemSetting.findUnique({ where: { id: 1 } });
        if (existingSetting && existingSetting.isInitialized) {
          throw new AppError('System is already initialized.', 409, 'ALREADY_INITIALIZED');
        }

        // 2. Admin Creation (Atomic inside transaction)
        let masterRecoveryKey: string | null = null;
        const userCount = await tx.user.count();

        if (payload.admin) {
          if (userCount > 0) {
            throw new AppError(
              'An administrator account already exists. System is locked.',
              403,
              'ADMIN_ALREADY_EXISTS'
            );
          }

          const pinHash = await CryptoUtility.hashPin(payload.admin.pin);
          const rawRecoveryKey = CryptoUtility.generateRecoveryKey();
          const hashedRecoveryKey = CryptoUtility.hashRecoveryKey(rawRecoveryKey);

          await tx.user.create({
            data: {
              email: payload.admin.email,
              fullName: payload.admin.fullName,
              pinHash,
              masterRecoveryKey: hashedRecoveryKey,
              failedAttempts: 0,
              lockoutTier: 0
            }
          });

          masterRecoveryKey = rawRecoveryKey;
        } else {
          // If no admin payload, verify that one was created via standalone setup
          if (userCount === 0) {
            throw new AppError(
              'Administrator credentials are required for system initialization.',
              400,
              'ADMIN_REQUIRED'
            );
          }
        }

        // 3. Base Chart of Accounts Generation (9 Immutable System Accounts)
        const systemAccountsData = [
          {
            accountCode: '1000',
            accountName: 'Cash and Liquid Assets',
            category: AccountCategory.ASSET,
            isSystemLocked: true
          },
          {
            accountCode: '1100',
            accountName: 'Accounts Receivable (AR)',
            category: AccountCategory.ASSET,
            isSystemLocked: true
          },
          {
            accountCode: '1200',
            accountName: 'Construction Work-in-Progress (WIP)',
            category: AccountCategory.ASSET,
            isSystemLocked: true
          },
          {
            accountCode: '2000',
            accountName: 'Accounts Payable (AP)',
            category: AccountCategory.LIABILITY,
            isSystemLocked: true
          },
          {
            accountCode: '2100',
            accountName: 'Customer Advances (Mobilization)',
            category: AccountCategory.LIABILITY,
            isSystemLocked: true
          },
          {
            accountCode: '2200',
            accountName: 'Escrow Holdings',
            category: AccountCategory.LIABILITY,
            isSystemLocked: true
          },
          {
            accountCode: '3000',
            accountName: "Owner's Opening Equity",
            category: AccountCategory.EQUITY,
            isSystemLocked: true
          },
          {
            accountCode: '4000',
            accountName: 'Sales & Project Revenue',
            category: AccountCategory.REVENUE,
            isSystemLocked: true
          },
          {
            accountCode: '5000',
            accountName: 'Cost of Goods Sold (COGS)',
            category: AccountCategory.EXPENSE,
            isSystemLocked: true
          }
        ];

        const accountMap = new Map<string, string>(); // accountCode -> id
        for (const acc of systemAccountsData) {
          const created = await tx.account.upsert({
            where: { accountCode: acc.accountCode },
            update: {},
            create: acc
          });
          accountMap.set(acc.accountCode, created.id);
        }

        // 4. Asset Bank/Cash Accounts Generation
        const bankJournalLines: { accountId: string; debitAmount: Decimal; creditAmount: Decimal }[] = [];
        let totalCashAndBanks = new Decimal(0);
        let firstBankAccountId: string | null = null;

        for (const bank of payload.cashAndBanks) {
          const bankAccount = await tx.account.create({
            data: {
              accountCode: bank.code,
              accountName: bank.name,
              category: AccountCategory.ASSET,
              isSystemLocked: false
            }
          });

          if (!firstBankAccountId) {
            firstBankAccountId = bankAccount.id;
          }

          const balance = new Decimal(bank.balance);
          if (balance.gt(0)) {
            totalCashAndBanks = totalCashAndBanks.plus(balance);
            bankJournalLines.push({
              accountId: bankAccount.id,
              debitAmount: balance,
              creditAmount: new Decimal(0)
            });
          }
        }

        // 5. Active Projects & Construction WIP Hydration
        const projectMap = new Map<string, string>(); // projectName or prefix -> projectId
        let totalWIP = new Decimal(0);

        for (const p of payload.activeProjects) {
          const boqVal = p.masterBOQ !== undefined ? p.masterBOQ : (p.boq ?? 0);
          const spentVal = new Decimal(p.spentToDate || 0);

          const createdProject = await tx.project.create({
            data: {
              projectName: p.name,
              projectPrefix: p.prefix.toUpperCase(),
              masterBOQ: new Decimal(boqVal),
              status: 'ACTIVE'
            }
          });

          projectMap.set(p.name, createdProject.id);
          projectMap.set(p.prefix.toUpperCase(), createdProject.id);

          if (spentVal.gt(0)) {
            totalWIP = totalWIP.plus(spentVal);
          }
        }

        // 6. Vendors & Unpaid Payables Hydration
        let totalAP = new Decimal(0);

        for (let i = 0; i < payload.unpaidPayables.length; i++) {
          const payable = payload.unpaidPayables[i];
          const amountDue = new Decimal(payable.amountDue);

          const vendor = await tx.vendor.create({
            data: {
              vendorName: payable.vendorName,
              phone: payable.phone || null
            }
          });

          if (amountDue.gt(0)) {
            totalAP = totalAP.plus(amountDue);

            await tx.expenseBill.create({
              data: {
                vendorId: vendor.id,
                projectId: payable.projectId || null,
                invoiceNumber: `OPENING-BILL-${i + 1}`,
                billDate: new Date(),
                paymentType: PaymentType.ACCOUNTS_PAYABLE,
                paymentStatus: PaymentStatus.UNPAID,
                grandTotal: amountDue,
                lineItems: {
                  create: [
                    {
                      description: 'Opening Balance Payable',
                      quantity: 1,
                      unitPrice: amountDue,
                      lineTotal: amountDue
                    }
                  ]
                }
              }
            });
          }
        }

        // 7. Customers, Active Deals & Deal Invoices Hydration
        let totalAR = new Decimal(0);

        for (let i = 0; i < payload.activeDeals.length; i++) {
          const deal = payload.activeDeals[i];
          const totalValue = new Decimal(deal.totalDealValue);
          const receivedPast = new Decimal(deal.amountReceivedPast || 0);
          const remainingDue = totalValue.minus(receivedPast);

          const customer = await tx.customer.create({
            data: {
              fullName: deal.customerName,
              phone: deal.phone,
              walletBalance: new Decimal(0)
            }
          });

          let linkedProjectId: string | null = null;
          if (deal.projectName && projectMap.has(deal.projectName)) {
            linkedProjectId = projectMap.get(deal.projectName)!;
          }

          const dealTypeEnum: DealType = deal.dealType
            ? (deal.dealType as DealType)
            : DealType.CONSTRUCTION;

          const createdDeal = await tx.deal.create({
            data: {
              customerId: customer.id,
              projectId: linkedProjectId,
              dealType: dealTypeEnum,
              totalValue: totalValue
            }
          });

          // Log past cleared receipt for customer account history
          if (receivedPast.gt(0)) {
            await tx.receipt.create({
              data: {
                customerId: customer.id,
                amount: receivedPast,
                paymentMethod: 'CASH',
                clearanceStatus: ClearanceStatus.CLEARED,
                receiptDate: new Date()
              }
            });
          }

          // Generate unpaid deal invoice for remaining receivable
          if (remainingDue.gt(0)) {
            totalAR = totalAR.plus(remainingDue);

            await tx.dealInvoice.create({
              data: {
                dealId: createdDeal.id,
                description: 'Opening Balance Installment',
                amount: remainingDue,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                paymentStatus: PaymentStatus.UNPAID
              }
            });
          }
        }

        // 8. Double-Entry Balancing Math:
        // Assets (Cash + Banks + WIP + AR) = Liabilities (AP) + Owner's Equity
        const totalAssets = totalCashAndBanks.plus(totalWIP).plus(totalAR);
        const totalLiabilities = totalAP;
        const ownersEquity = totalAssets.minus(totalLiabilities);

        const journalLines: { accountId: string; debitAmount: Decimal; creditAmount: Decimal }[] = [];

        // Cash & Bank balances (Debits)
        for (const bl of bankJournalLines) {
          journalLines.push(bl);
        }

        // Construction WIP (Debit)
        if (totalWIP.gt(0)) {
          journalLines.push({
            accountId: accountMap.get('1200')!,
            debitAmount: totalWIP,
            creditAmount: new Decimal(0)
          });
        }

        // Accounts Receivable (Debit)
        if (totalAR.gt(0)) {
          journalLines.push({
            accountId: accountMap.get('1100')!,
            debitAmount: totalAR,
            creditAmount: new Decimal(0)
          });
        }

        // Accounts Payable (Credit)
        if (totalAP.gt(0)) {
          journalLines.push({
            accountId: accountMap.get('2000')!,
            debitAmount: new Decimal(0),
            creditAmount: totalAP
          });
        }

        // Owner's Opening Equity (Credit if positive, Debit if negative)
        if (ownersEquity.gt(0)) {
          journalLines.push({
            accountId: accountMap.get('3000')!,
            debitAmount: new Decimal(0),
            creditAmount: ownersEquity
          });
        } else if (ownersEquity.lt(0)) {
          journalLines.push({
            accountId: accountMap.get('3000')!,
            debitAmount: ownersEquity.abs(),
            creditAmount: new Decimal(0)
          });
        }

        // Guardrail: Prisma requires at least 2 lines for a valid JournalEntry
        if (journalLines.length < 2) {
          const fallbackAccountId = firstBankAccountId || accountMap.get('1000')!;
          journalLines.push({
            accountId: fallbackAccountId,
            debitAmount: new Decimal(0),
            creditAmount: new Decimal(0)
          });
          journalLines.push({
            accountId: accountMap.get('3000')!,
            debitAmount: new Decimal(0),
            creditAmount: new Decimal(0)
          });
        }

        // 9. Rigorous Double-Entry Zero-Sum Verification
        DoubleEntryValidator.validate(journalLines);

        // Create Master Opening Journal Entry
        await tx.journalEntry.create({
          data: {
            entryNumber: 'JV-OPENING-001',
            description: 'System Go-Live Opening Balances',
            entryDate: new Date(),
            lines: {
              create: journalLines.map((line) => ({
                accountId: line.accountId,
                debitAmount: line.debitAmount,
                creditAmount: line.creditAmount
              }))
            }
          }
        });

        // 10. Lock the System Permanently
        const goLiveDate = new Date();
        await tx.systemSetting.upsert({
          where: { id: 1 },
          update: { isInitialized: true, goLiveDate },
          create: { id: 1, isInitialized: true, goLiveDate }
        });

        return {
          success: true,
          masterRecoveryKey,
          goLiveDate
        };
      },
      {
        timeout: 30000 // 30 seconds max for massive initial setup
      }
    );
  }
}
