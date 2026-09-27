import Decimal from 'decimal.js';
import { AccountCategory, Account, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateAccountInput, UpdateAccountInput } from '../utils/validation.util';
import { getCache, setCache, bustCache } from '../utils/cache.util';

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
    const CACHE_KEY = `accounts:live:${fiscalStartDate?.toISOString() ?? 'all'}`;
    const cached = getCache<LiveBalancesResult>(CACHE_KEY);
    if (cached) return cached;

    // 1. Single roundtrip Raw SQL to aggregate all balances
    const dateFilter = fiscalStartDate 
      ? Prisma.sql`AND (a.category IN ('ASSET'::"AccountCategory", 'LIABILITY'::"AccountCategory", 'EQUITY'::"AccountCategory") OR (SELECT "entryDate" FROM "JournalEntry" WHERE id = jl."journalId") >= ${fiscalStartDate})`
      : Prisma.empty;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        accountCode: string;
        accountName: string;
        category: AccountCategory;
        isSystemLocked: boolean;
        isArchived: boolean;
        totalDebit: Decimal | number | string;
        totalCredit: Decimal | number | string;
      }>
    >`
      SELECT 
        a.id, 
        a."accountCode", 
        a."accountName", 
        a.category, 
        a."isSystemLocked", 
        a."isArchived",
        COALESCE(SUM(jl."debitAmount"), 0) AS "totalDebit",
        COALESCE(SUM(jl."creditAmount"), 0) AS "totalCredit"
      FROM "Account" a
      LEFT JOIN "JournalLine" jl ON jl."accountId" = a.id ${dateFilter}
      WHERE a."isArchived" = false
      GROUP BY a.id, a."accountCode", a."accountName", a.category, a."isSystemLocked", a."isArchived"
      ORDER BY a."accountCode" ASC
    `;

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

    // 2. Calculate live balances per account
    for (const row of rows) {
      const acc = row;
      const totalDebit = new Decimal(row.totalDebit || 0);
      const totalCredit = new Decimal(row.totalCredit || 0);

      let balance: Decimal;
      if (
        acc.category === AccountCategory.ASSET ||
        acc.category === AccountCategory.EXPENSE
      ) {
        balance = totalDebit.minus(totalCredit);
      } else {
        balance = totalCredit.minus(totalDebit);
      }

      const item: AccountWithBalance = {
        id: acc.id,
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        category: acc.category,
        isSystemLocked: acc.isSystemLocked,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
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

    const result: LiveBalancesResult = {
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

    setCache(CACHE_KEY, result, 60_000); // 60s TTL
    return result;
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

    bustCache('accounts');
    return newAccount;
  }

  /**
   * Updates an existing account's name or category.
   * - accountName can always be updated.
   * - category can only be updated if isSystemLocked === false.
   */
  static async updateAccount(id: string, data: UpdateAccountInput): Promise<Account> {
    const account = await prisma.account.findUnique({
      where: { id }
    });

    if (!account) {
      throw new AppError('Account not found.', 404, 'NOT_FOUND');
    }

    if (account.isArchived) {
      throw new AppError('Cannot modify an archived account.', 400, 'ACCOUNT_ARCHIVED');
    }

    if (data.category && data.category !== account.category) {
      if (account.isSystemLocked) {
        throw new AppError(
          'Cannot change category of a system-locked account.',
          403,
          'OPERATION_FORBIDDEN'
        );
      }
    }

    const updated = await prisma.account.update({
      where: { id },
      data: {
        ...(data.accountName ? { accountName: data.accountName } : {}),
        ...(data.category ? { category: data.category } : {})
      }
    });

    bustCache('accounts');
    return updated;
  }

  /**
   * Deletes or archives an account using the three-tier policy:
   * Tier 1: System-locked accounts cannot be deleted or archived.
   * Tier 2: Accounts with journal transactions are soft-deleted (isArchived: true).
   * Tier 3: Accounts without transactions are permanently deleted.
   */
  static async deleteAccount(id: string): Promise<{ message: string; action: 'DELETED' | 'ARCHIVED' }> {
    const account = await prisma.account.findUnique({
      where: { id },
      include: {
        _count: {
          select: { journalLines: true }
        }
      }
    });

    if (!account) {
      throw new AppError('Account not found.', 404, 'NOT_FOUND');
    }

    if (account.isArchived) {
      throw new AppError('Account is already archived.', 400, 'ALREADY_ARCHIVED');
    }

    // Tier 1: System-locked accounts are protected
    if (account.isSystemLocked) {
      throw new AppError(
        'System-locked accounts cannot be deleted or archived.',
        403,
        'OPERATION_FORBIDDEN'
      );
    }

    // Tier 2: Account has journal activity -> soft-delete (archive)
    if (account._count.journalLines > 0) {
      await prisma.account.update({
        where: { id },
        data: { isArchived: true }
      });

      bustCache('accounts');
      return {
        message: `Account '${account.accountName}' (${account.accountCode}) has transaction history and was archived.`,
        action: 'ARCHIVED'
      };
    }

    // Tier 3: Zero journal activity -> hard delete
    await prisma.account.delete({
      where: { id }
    });

    bustCache('accounts');
    return {
      message: `Account '${account.accountName}' (${account.accountCode}) was deleted successfully.`,
      action: 'DELETED'
    };
  }
}
