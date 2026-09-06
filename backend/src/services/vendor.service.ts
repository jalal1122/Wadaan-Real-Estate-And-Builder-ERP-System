import Decimal from 'decimal.js';
import { prisma } from '../config/db';
import { AppError } from '../middleware/errorHandler';
import { CreateVendorInput } from '../utils/validation.util';

export class VendorService {
  /**
   * Adds a new supplier.
   */
  static async createVendor(data: CreateVendorInput) {
    return await prisma.vendor.create({
      data: {
        vendorName: data.vendorName,
        phone: data.phone || null
      }
    });
  }

  /**
   * Lists all suppliers with live calculated Total Outstanding balances.
   */
  static async getAllVendors() {
    const vendors = await prisma.vendor.findMany({
      include: {
        expenseBills: {
          where: {
            paymentStatus: { in: ['UNPAID', 'PARTIAL'] }
          }
        },
        payments: true
      },
      orderBy: { vendorName: 'asc' }
    });

    return vendors.map((vendor) => {
      const totalOutstanding = vendor.expenseBills.reduce(
        (sum, bill) => sum.plus(new Decimal(bill.pendingAmount)),
        new Decimal(0)
      );

      const totalPaid = vendor.payments.reduce(
        (sum, payment) => sum.plus(new Decimal(payment.amountPaid)),
        new Decimal(0)
      );

      return {
        id: vendor.id,
        vendorName: vendor.vendorName,
        phone: vendor.phone,
        totalOutstanding,
        totalPaid,
        unpaidBillsCount: vendor.expenseBills.length
      };
    });
  }

  /**
   * Fetches unpaid/partial bills for a vendor in strict FIFO order (by billDate ascending).
   */
  static async getUnpaidBillsByVendor(vendorId: string) {
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId }
    });

    if (!vendor) {
      throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
    }

    const bills = await prisma.expenseBill.findMany({
      where: {
        vendorId,
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        pendingAmount: { gt: 0 }
      },
      include: {
        project: true,
        lineItems: true
      },
      orderBy: [
        { billDate: 'asc' },
        { id: 'asc' }
      ]
    });

    const totalOutstanding = bills.reduce(
      (sum, b) => sum.plus(new Decimal(b.pendingAmount)),
      new Decimal(0)
    );

    return {
      vendorId: vendor.id,
      vendorName: vendor.vendorName,
      totalOutstanding,
      bills
    };
  }
}
