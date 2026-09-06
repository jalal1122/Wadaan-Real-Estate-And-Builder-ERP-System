import { prisma } from '../config/db';
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
            invoices: true,
            project: true
          }
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

    return customer;
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
