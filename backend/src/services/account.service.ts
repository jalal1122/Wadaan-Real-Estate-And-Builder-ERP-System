import Decimal from 'decimal.js';
import { AccountCategory, Account } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateAccountInput } from '../utils/validation.util';

export interface AccountWithBalance {
  id: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  isSystemLocked: boolean;
  totalDebit: string;
  totalCredit: string;
  balance: string;
}

export interface GroupedAccounts {
  ASSET: AccountWithBalance[];
  LIABILITY: AccountWithBalance[];
  EQUITY: AccountWithBalance[];
  REVENUE: AccountWithBalance[];
  EXPENSE: AccountWithBalance[];
}

export interface AccountsSummary {
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  totalRevenue: string;
  totalExpenses: string;
}

export interface LiveBalancesResult {
  accounts: AccountWithBalance[];
  grouped: GroupedAccounts;
  summary: AccountsSummary;
}

export class AccountService {
  /**
   * Retrieves all Chart of Accounts with live-calculated balances.
   *
   * Accounting Math:
   * - ASSET & EXPENSE: Balance = SUM(Debits) - SUM(Credits)
   * - LIABILITY, EQUITY & REVENUE: Balance = SUM(Credits) - SUM(Debits)
   *
   * Fiscal Year Splitting:
   * - ASSET, LIABILITY, EQUITY: Aggregated across all historical time.
   * - REVENUE, EXPENSE: If fiscalStartDate is provided, aggregated strictly
   *   for transactions where entryDate >= fiscalStartDate.
   */
  static async getLiveBalances(fiscalStartDate?: Date): Promise<LiveBalancesResult> {
    // 1. Fetch all accounts in the system
    const allAccounts = await prisma.account.findMany({
      orderBy: { accountCode: 'asc' }
    });

    // Partition account IDs by category type
    const permanentAccounts = allAccounts.filter(
      (a) =>
        a.category === AccountCategory.ASSET ||
        a.category === AccountCategory.LIABILITY ||
        a.category === AccountCategory.EQUITY
    );
    const annualAccounts = allAccounts.filter(
      (a) =>
        a.category === AccountCategory.REVENUE ||
        a.category === AccountCategory.EXPENSE
    );

    const permanentIds = permanentAccounts.map((a) => a.id);
    const annualIds = annualAccounts.map((a) => a.id);

    // 2. Query aggregations for permanent accounts (all-time)
    const permanentAggregations = permanentIds.length > 0
      ? await prisma.journalLine.groupBy({
          by: ['accountId'],
          _sum: {
            debitAmount: true,
            creditAmount: true
          },
          where: {
            accountId: { in: permanentIds }
          }
        })
      : [];

    // 3. Query aggregations for annual accounts (filtered by fiscalStartDate if supplied)
    const annualAggregations = annualIds.length > 0
      ? await prisma.journalLine.groupBy({
          by: ['accountId'],
          _sum: {
            debitAmount: true,
            creditAmount: true
          },
          where: {
            accountId: { in: annualIds },
            ...(fiscalStartDate
              ? {
                  journal: {
                    entryDate: {
                      gte: fiscalStartDate
                    }
                  }
                }
              : {})
          }
        })
      : [];

    // Map accountId -> { totalDebit, totalCredit }
    const totalsMap = new Map<string, { totalDebit: Decimal; totalCredit: Decimal }>();

    for (const row of [...permanentAggregations, ...annualAggregations]) {
      totalsMap.set(row.accountId, {
        totalDebit: new Decimal(row._sum.debitAmount?.toString() || '0'),
        totalCredit: new Decimal(row._sum.creditAmount?.toString() || '0')
      });
    }

    const grouped: GroupedAccounts = {
      ASSET: [],
      LIABILITY: [],
      EQUITY: [],
      REVENUE: [],
      EXPENSE: []
    };

    const summaryDecimals = {
      totalAssets: new Decimal(0),
      totalLiabilities: new Decimal(0),
      totalEquity: new Decimal(0),
      totalRevenue: new Decimal(0),
      totalExpenses: new Decimal(0)
    };

    const accountsWithBalance: AccountWithBalance[] = [];

    // 4. Calculate live balances per account
    for (const acc of allAccounts) {
      const totals = totalsMap.get(acc.id) || {
        totalDebit: new Decimal(0),
        totalCredit: new Decimal(0)
      };

      let balance: Decimal;
      if (
        acc.category === AccountCategory.ASSET ||
        acc.category === AccountCategory.EXPENSE
      ) {
        balance = totals.totalDebit.minus(totals.totalCredit);
      } else {
        balance = totals.totalCredit.minus(totals.totalDebit);
      }

      const item: AccountWithBalance = {
        id: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        category: acc.category,
        isSystemLocked: acc.isSystemLocked,
        totalDebit: totals.totalDebit.toFixed(2),
        totalCredit: totals.totalCredit.toFixed(2),
        balance: balance.toFixed(2)
      };

      accountsWithBalance.push(item);
      grouped[acc.category].push(item);

      // Accumulate category summaries
      switch (acc.category) {
        case AccountCategory.ASSET:
          summaryDecimals.totalAssets = summaryDecimals.totalAssets.plus(balance);
          break;
        case AccountCategory.LIABILITY:
          summaryDecimals.totalLiabilities = summaryDecimals.totalLiabilities.plus(balance);
          break;
        case AccountCategory.EQUITY:
          summaryDecimals.totalEquity = summaryDecimals.totalEquity.plus(balance);
          break;
        case AccountCategory.REVENUE:
          summaryDecimals.totalRevenue = summaryDecimals.totalRevenue.plus(balance);
          break;
        case AccountCategory.EXPENSE:
          summaryDecimals.totalExpenses = summaryDecimals.totalExpenses.plus(balance);
          break;
      }
    }

    return {
      accounts: accountsWithBalance,
      grouped,
      summary: {
        totalAssets: summaryDecimals.totalAssets.toFixed(2),
        totalLiabilities: summaryDecimals.totalLiabilities.toFixed(2),
        totalEquity: summaryDecimals.totalEquity.toFixed(2),
        totalRevenue: summaryDecimals.totalRevenue.toFixed(2),
        totalExpenses: summaryDecimals.totalExpenses.toFixed(2)
      }
    };
  }

  /**
   * Creates a new custom Chart of Accounts bucket.
   */
  static async createAccount(data: CreateAccountInput): Promise<Account> {
    const existing = await prisma.account.findUnique({
      where: { accountCode: data.accountCode }
    });

    if (existing) {
      throw new AppError(
        `Account with code '${data.accountCode}' already exists.`,
        409,
        'DUPLICATE_RECORD'
      );
    }

    const newAccount = await prisma.account.create({
      data: {
        accountCode: data.accountCode,
        accountName: data.accountName,
        category: data.category,
        isSystemLocked: false
      }
    });

    return newAccount;
  }
}
