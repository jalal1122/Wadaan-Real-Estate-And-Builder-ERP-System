import { VendorService } from '../services/vendor.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => ({
  prisma: {
    vendor: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    expenseBill: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('VendorService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createVendor', () => {
    test('1. creates a new vendor with name and optional phone', async () => {
      (mockPrisma.vendor.create as jest.Mock).mockResolvedValue({
        id: 'vend-1',
        vendorName: 'Falcon Steel',
        phone: '+92 300 9876543',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await VendorService.createVendor({
        vendorName: 'Falcon Steel',
        phone: '+92 300 9876543',
      });

      expect(result.vendorName).toBe('Falcon Steel');
      expect(result.phone).toBe('+92 300 9876543');
      expect(mockPrisma.vendor.create).toHaveBeenCalledWith({
        data: {
          vendorName: 'Falcon Steel',
          phone: '+92 300 9876543',
        },
      });
    });
  });

  describe('getAllVendors', () => {
    test('2. totalOutstanding sums pendingAmount of UNPAID and PARTIAL bills and excludes PAID bills', async () => {
      (mockPrisma.vendor.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'vend-1',
          vendorName: 'Bestway Cement',
          phone: null,
          expenseBills: [
            { pendingAmount: new Decimal(250000), paymentStatus: 'UNPAID' },
            { pendingAmount: new Decimal(150000), paymentStatus: 'PARTIAL' },
          ],
          payments: [{ amountPaid: new Decimal(100000) }],
        },
        {
          id: 'vend-2',
          vendorName: 'Clear Supplier',
          phone: null,
          expenseBills: [], // No unpaid bills
          payments: [{ amountPaid: new Decimal(500000) }],
        },
      ]);

      const vendors = await VendorService.getAllVendors();
      expect(vendors).toHaveLength(2);

      const v1 = vendors[0];
      expect(v1.totalOutstanding.toString()).toBe('400000'); // 250k + 150k
      expect(v1.totalPaid.toString()).toBe('100000');
      expect(v1.unpaidBillsCount).toBe(2);

      const v2 = vendors[1];
      expect(v2.totalOutstanding.toString()).toBe('0');
      expect(v2.totalPaid.toString()).toBe('500000');
      expect(v2.unpaidBillsCount).toBe(0);
    });
  });

  describe('getUnpaidBillsByVendor', () => {
    test('3. returns unpaid bills in strict billDate ASC order and computes totalOutstanding', async () => {
      (mockPrisma.vendor.findUnique as jest.Mock).mockResolvedValue({
        id: 'vend-1',
        vendorName: 'Bestway Cement',
      });

      (mockPrisma.expenseBill.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'bill-old',
          vendorId: 'vend-1',
          invoiceNumber: 'INV-001',
          billDate: new Date('2026-01-01'),
          paymentStatus: 'UNPAID',
          pendingAmount: new Decimal(300000),
          grandTotal: new Decimal(300000),
        },
        {
          id: 'bill-new',
          vendorId: 'vend-1',
          invoiceNumber: 'INV-002',
          billDate: new Date('2026-02-01'),
          paymentStatus: 'PARTIAL',
          pendingAmount: new Decimal(200000),
          grandTotal: new Decimal(400000),
        },
      ]);

      const result = await VendorService.getUnpaidBillsByVendor('vend-1');
      expect(result.vendorId).toBe('vend-1');
      expect(result.totalOutstanding.toString()).toBe('500000');
      expect(result.bills).toHaveLength(2);
      expect(result.bills[0].id).toBe('bill-old');
      expect(result.bills[1].id).toBe('bill-new');

      // Verify query enforced sorting by billDate asc
      expect(mockPrisma.expenseBill.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            vendorId: 'vend-1',
            paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
            pendingAmount: { gt: 0 },
          },
          orderBy: [{ billDate: 'asc' }, { id: 'asc' }],
        })
      );
    });

    test('4. throws VENDOR_NOT_FOUND (404) if vendor does not exist', async () => {
      (mockPrisma.vendor.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(VendorService.getUnpaidBillsByVendor('non-existent')).rejects.toMatchObject({
        statusCode: 404,
        code: 'VENDOR_NOT_FOUND',
      });
    });
  });
});
