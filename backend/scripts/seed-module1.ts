import { PrismaClient, AccountCategory } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Module 1 Test Data (Chart of Accounts & General Journal)...');

  // 1. Ensure required parties and projects exist
  let project = await prisma.project.findFirst({ where: { projectPrefix: 'WH' } });
  if (!project) {
    project = await prisma.project.create({
      data: {
        projectName: 'Wadaan Heights',
        projectPrefix: 'WH',
        masterBOQ: new Decimal('150000000.00'),
        status: 'ACTIVE',
      },
    });
    console.log('  Created project: Wadaan Heights (WH)');
  }

  let vendor = await prisma.vendor.findFirst({ where: { vendorName: 'Ali Hardware' } });
  if (!vendor) {
    vendor = await prisma.vendor.create({
      data: {
        vendorName: 'Ali Hardware',
        phone: '0300-1234567',
      },
    });
    console.log('  Created vendor: Ali Hardware');
  }

  let customer = await prisma.customer.findFirst({ where: { fullName: 'Tariq Mehmood' } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        fullName: 'Tariq Mehmood',
        phone: '0321-9876543',
        walletBalance: new Decimal('0.00'),
      },
    });
    console.log('  Created customer: Tariq Mehmood');
  }

  // 2. Seed standard Chart of Accounts for Module 1
  const accountsToCreate = [
    // ASSETS (1000–1999)
    { accountCode: '1030-01', accountName: 'Habib Bank Ltd (HBL) Operations', category: AccountCategory.ASSET },
    { accountCode: '1500-01', accountName: 'Site Surveying & IT Equipment', category: AccountCategory.ASSET },

    // LIABILITIES (2000–2999)
    { accountCode: '2150-01', accountName: 'Subcontractor Retention Monies', category: AccountCategory.LIABILITY },
    { accountCode: '2300-01', accountName: 'Federal & Provincial Tax Withheld', category: AccountCategory.LIABILITY },

    // EQUITY (3000–3999)
    { accountCode: '3010-01', accountName: 'Owner Drawings & Distributions', category: AccountCategory.EQUITY },

    // REVENUE (4000–4999)
    { accountCode: '4010-01', accountName: 'Brokerage & File Commission Income', category: AccountCategory.REVENUE },
    { accountCode: '4020-01', accountName: 'Design & Architectural Consultancy Fees', category: AccountCategory.REVENUE },

    // EXPENSES (5000–5999)
    { accountCode: '5100-01', accountName: 'Head Office Rent & Facility Utilities', category: AccountCategory.EXPENSE },
    { accountCode: '5200-01', accountName: 'Marketing, Digital Ads & Billboard Signage', category: AccountCategory.EXPENSE },
    { accountCode: '5300-01', accountName: 'Site Staff Salaries & Welfare', category: AccountCategory.EXPENSE },
  ];

  const accountMap = new Map<string, string>();

  // Fetch all existing accounts first
  const existingAccounts = await prisma.account.findMany();
  for (const acc of existingAccounts) {
    accountMap.set(acc.accountCode, acc.id);
  }

  for (const acc of accountsToCreate) {
    if (!accountMap.has(acc.accountCode)) {
      const created = await prisma.account.create({
        data: {
          accountCode: acc.accountCode,
          accountName: acc.accountName,
          category: acc.category,
          isSystemLocked: false,
        },
      });
      accountMap.set(created.accountCode, created.id);
      console.log(`  Created Account: [${acc.accountCode}] ${acc.accountName} (${acc.category})`);
    } else {
      console.log(`  Account already exists: [${acc.accountCode}] ${acc.accountName}`);
    }
  }

  // 3. Seed realistic Journal Vouchers for Module 1 testing
  const testVouchers = [
    {
      entryNumber: 'JV-MOD1-001',
      entryDate: new Date('2026-09-08T10:00:00Z'),
      description: 'Head office WAPDA electricity bill and generator diesel payment',
      lines: [
        {
          accountCode: '5100-01',
          debitAmount: new Decimal('75000.00'),
          creditAmount: new Decimal('0.00'),
          memo: 'WAPDA bill for current month & diesel fuel',
        },
        {
          accountCode: '1010-01',
          debitAmount: new Decimal('0.00'),
          creditAmount: new Decimal('75000.00'),
          memo: 'Disbursed in cash from office safe',
        },
      ],
    },
    {
      entryNumber: 'JV-MOD1-002',
      entryDate: new Date('2026-09-08T14:30:00Z'),
      description: 'Owner monthly drawing for personal expenses from Meezan Bank',
      lines: [
        {
          accountCode: '3010-01',
          debitAmount: new Decimal('200000.00'),
          creditAmount: new Decimal('0.00'),
          memo: 'Cheque #991024 personal withdrawal',
        },
        {
          accountCode: '1020-01',
          debitAmount: new Decimal('0.00'),
          creditAmount: new Decimal('200000.00'),
          memo: 'Debited from Meezan corporate account',
        },
      ],
    },
    {
      entryNumber: 'JV-MOD1-003',
      entryDate: new Date('2026-09-09T11:15:00Z'),
      description: 'Urgent site safety equipment and concrete testing for Wadaan Heights',
      lines: [
        {
          accountCode: '5000',
          debitAmount: new Decimal('120000.00'),
          creditAmount: new Decimal('0.00'),
          vendorId: vendor.id,
          projectId: project.id,
          memo: 'Fall protection harnesses for Tower A crew',
        },
        {
          accountCode: '1020-01',
          debitAmount: new Decimal('0.00'),
          creditAmount: new Decimal('120000.00'),
          memo: 'Online bank transfer TRX-9921',
        },
      ],
    },
    {
      entryNumber: 'JV-MOD1-004',
      entryDate: new Date('2026-09-09T16:00:00Z'),
      description: 'Brokerage commission fee received for Sector C plot resale',
      lines: [
        {
          accountCode: '1020-01',
          debitAmount: new Decimal('450000.00'),
          creditAmount: new Decimal('0.00'),
          memo: 'RTGS transfer from client',
        },
        {
          accountCode: '4010-01',
          debitAmount: new Decimal('0.00'),
          creditAmount: new Decimal('450000.00'),
          customerId: customer.id,
          memo: 'Plot #88 brokerage commission clearance',
        },
      ],
    },
    {
      entryNumber: 'JV-MOD1-005',
      entryDate: new Date('2026-09-10T09:30:00Z'),
      description: 'Owner equity capital injection split between Meezan Bank and Office Safe',
      lines: [
        {
          accountCode: '1020-01',
          debitAmount: new Decimal('1500000.00'),
          creditAmount: new Decimal('0.00'),
          memo: 'Pay order deposit #PO-5501',
        },
        {
          accountCode: '1010-01',
          debitAmount: new Decimal('300000.00'),
          creditAmount: new Decimal('0.00'),
          memo: 'Petty cash reserve addition',
        },
        {
          accountCode: '3000',
          debitAmount: new Decimal('0.00'),
          creditAmount: new Decimal('1800000.00'),
          memo: 'Capital contribution approved by owner',
        },
      ],
    },
  ];

  for (const v of testVouchers) {
    const existing = await prisma.journalEntry.findUnique({ where: { entryNumber: v.entryNumber } });
    if (existing) {
      console.log(`  Voucher ${v.entryNumber} already exists. Skipping.`);
      continue;
    }

    await prisma.journalEntry.create({
      data: {
        entryNumber: v.entryNumber,
        entryDate: v.entryDate,
        description: v.description,
        lines: {
          create: v.lines.map((l) => ({
            accountId: accountMap.get(l.accountCode)!,
            debitAmount: l.debitAmount,
            creditAmount: l.creditAmount,
            memo: l.memo,
            customerId: (l as any).customerId ?? null,
            vendorId: (l as any).vendorId ?? null,
            projectId: (l as any).projectId ?? null,
          })),
        },
      },
    });
    console.log(`  ✅ Posted Voucher: ${v.entryNumber} - "${v.description}"`);
  }

  console.log('\n🎉 Module 1 Test Data successfully seeded!');
  console.log('You can now open http://localhost:3000 and view:');
  console.log('  1. Chart of Accounts: /accounts');
  console.log('  2. General Journal: /journals');
  console.log('  3. Trial Balance: /trial-balance');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
