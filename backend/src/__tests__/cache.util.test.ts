import { getCache, setCache, bustCache, clearCache, appCache } from '../utils/cache.util';
import { ReportService } from '../services/report.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    account: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    journalLine: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    customer: {
      aggregate: jest.fn(),
    },
    dealInvoice: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    expenseBill: {
      findMany: jest.fn(),
      aggregate: jest.fn(),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('In-Memory Micro-Cache Engine (cache.util)', () => {
  const originalEnv = process.env.ENABLE_TEST_CACHE;

  beforeAll(() => {
    process.env.ENABLE_TEST_CACHE = 'true';
  });

  afterAll(() => {
    process.env.ENABLE_TEST_CACHE = originalEnv;
  });

  beforeEach(() => {
    clearCache();
    jest.clearAllMocks();
  });

  describe('Basic TTL & Invalidation Semantics', () => {
    test('1. sets and retrieves an item from cache', () => {
      setCache('test:key', { foo: 'bar' }, 5000);
      expect(getCache('test:key')).toEqual({ foo: 'bar' });
    });

    test('2. returns null for non-existent key', () => {
      expect(getCache('non:existent')).toBeNull();
    });

    test('3. respects TTL expiration', () => {
      setCache('test:expired', { hello: 'world' }, -1); // expired immediately
      expect(getCache('test:expired')).toBeNull();
    });

    test('4. bustCache removes exact and prefixed keys', () => {
      setCache('reports:snapshot', { val: 1 }, 10000);
      setCache('reports:deal-margins', { val: 2 }, 10000);
      setCache('deals:all', { val: 3 }, 10000);

      bustCache('reports');

      expect(getCache('reports:snapshot')).toBeNull();
      expect(getCache('reports:deal-margins')).toBeNull();
      expect(getCache('deals:all')).toEqual({ val: 3 });
    });

    test('5. clearCache clears all entries', () => {
      setCache('key1', 1, 10000);
      setCache('key2', 2, 10000);
      expect(appCache.size).toBe(2);

      clearCache();
      expect(appCache.size).toBe(0);
      expect(getCache('key1')).toBeNull();
      expect(getCache('key2')).toBeNull();
    });
  });

  describe('Service Caching Integration', () => {
    test('6. ReportService.calculateSnapshot caches result and bypasses Prisma on second call', async () => {
      // Mock liquidCash (1000 Cash, 1010 Bank)
      (mockPrisma.account.findMany as jest.Mock).mockResolvedValue([
        { id: 'acc-cash', accountCode: '1000', category: 'ASSET' },
        { id: 'acc-bank', accountCode: '1010', category: 'ASSET' },
      ]);

      (mockPrisma.journalLine.groupBy as jest.Mock).mockResolvedValue([
        { accountId: 'acc-cash', _sum: { debitAmount: new Decimal(50000), creditAmount: new Decimal(10000) } },
        { accountId: 'acc-bank', _sum: { debitAmount: new Decimal(100000), creditAmount: new Decimal(20000) } },
      ]);

      // Mock client funds (Escrow 2100)
      (mockPrisma.account.findUnique as jest.Mock).mockResolvedValue({
        id: 'acc-escrow',
        accountCode: '2100',
        category: 'LIABILITY',
      });

      // Mock customer wallets
      (mockPrisma.customer.aggregate as jest.Mock).mockResolvedValue({ _sum: { walletBalance: new Decimal(0) } });

      // Mock AR and AP
      (mockPrisma.dealInvoice.aggregate as jest.Mock).mockResolvedValue({ _sum: { amount: new Decimal(0) } });
      (mockPrisma.expenseBill.aggregate as jest.Mock).mockResolvedValue({ _sum: { pendingAmount: new Decimal(0) } });

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        { liquidCash: 120000.00, clientFundsHeld: 0, totalAR: 0, totalAP: 0 }
      ]);

      // First call -> hits DB
      const firstResult = await ReportService.calculateSnapshot();
      expect(firstResult).toBeDefined();
      expect(firstResult.liquidCash).toBe('120000.00');
      const firstCallCount = (mockPrisma.$queryRaw as jest.Mock).mock.calls.length;
      expect(firstCallCount).toBeGreaterThan(0);

      // Second call -> hits cache (no new DB calls)
      const secondResult = await ReportService.calculateSnapshot();
      expect(secondResult).toEqual(firstResult);
      expect((mockPrisma.$queryRaw as jest.Mock).mock.calls.length).toBe(firstCallCount);

      // Bust cache -> third call hits DB again
      bustCache('reports');
      const thirdResult = await ReportService.calculateSnapshot();
      expect(thirdResult).toEqual(firstResult);
      expect((mockPrisma.$queryRaw as jest.Mock).mock.calls.length).toBeGreaterThan(firstCallCount);
    });
  });
});
