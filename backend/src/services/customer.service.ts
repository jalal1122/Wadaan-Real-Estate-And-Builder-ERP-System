import { prisma } from '../config/db';
import { Decimal } from 'decimal.js';
import { CreateCustomerInput } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';

export class CustomerService {
  /**
   * Lists all clients with their active walletBalance (Mobilization advances held)
   * and count of deals and receipts.
   */
  static async getAllCustomers() {
    return prisma.customer.findMany({
      include: {
        _count: {
          select: {
            deals: true,
            receipts: true
          }
        }
      },
      orderBy: { fullName: 'asc' }
    });
  }

  /**
   * Retrieves a single customer by ID along with their deals, invoices, and receipts.
   */
  static async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        deals: {
          include: {
            invoices: {
              orderBy: { dueDate: 'asc' }
            },
            project: true
          },
          orderBy: { createdAt: 'desc' }
        },
        receipts: {
          include: {
            invoices: true
          },
          orderBy: { receiptDate: 'desc' }
        }
      }
    });

    if (!customer) {
      throw new AppError(`Customer with ID '${id}' not found`, 404, 'CUSTOMER_NOT_FOUND');
    }

    const dealsWithPending = customer.deals.map((deal) => {
      const pendingBalance = deal.invoices
        .filter((inv) => inv.paymentStatus !== 'PAID')
        .reduce((sum, inv) => {
          const invPaid = new Decimal(inv.paidAmount || 0);
          const remaining = new Decimal(inv.amount).minus(invPaid);
          return sum.plus(remaining.greaterThan(0) ? remaining : 0);
        }, new Decimal(0));

      return {
        ...deal,
        pendingBalance
      };
    });

    return {
      ...customer,
      deals: dealsWithPending
    };
  }

  /**
   * Creates a new customer with an initial 0.00 walletBalance.
   */
  static async createCustomer(data: CreateCustomerInput) {
    return prisma.customer.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        walletBalance: 0
      }
    });
  }
}
