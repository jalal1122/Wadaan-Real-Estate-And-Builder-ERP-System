import { prisma } from '../config/db';
import { Decimal } from 'decimal.js';
import { CreateCustomerInput } from '../utils/validation.util';
import { AppError } from '../middleware/errorHandler';
import { getCache, setCache, bustCache } from '../utils/cache.util';

export class CustomerService {
  /**
   * Lists all clients with their active walletBalance (Mobilization advances held)
   * and count of deals and receipts.
   */
  static async getAllCustomers() {
    const CACHE_KEY = 'customers:all';
    const cached = getCache<any>(CACHE_KEY);
    if (cached) return cached;

    const results = await prisma.customer.findMany({
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

    setCache(CACHE_KEY, results, 60_000);
    return results;
  }

  /**
   * Retrieves a single customer by ID along with their deals, invoices, and receipts.
   */
  static async getCustomerById(id: string) {
    const CACHE_KEY = `customers:${id}:profile`;
    const cached = getCache<any>(CACHE_KEY);
    if (cached) return cached;

    // Fetch the customer basic profile
    const customer = await prisma.customer.findUnique({
      where: { id }
    });

    if (!customer) {
      throw new AppError(`Customer with ID '${id}' not found`, 404, 'CUSTOMER_NOT_FOUND');
    }

    // Parallelize heavy nested fetches to avoid Prisma Cartesian explosions
    const [deals, dealClients, receipts] = await Promise.all([
      // 1. Primary Deals
      prisma.deal.findMany({
        where: { customerId: id },
        include: {
          asset: true,
          invoices: {
            include: {
              receipt: {
                include: {
                  customer: { select: { id: true, fullName: true, phone: true } }
                }
              }
            },
            orderBy: { dueDate: 'asc' }
          },
          coClients: {
            include: {
              customer: { select: { id: true, fullName: true, phone: true, walletBalance: true } }
            }
          },
          project: {
            include: { expenseBills: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      // 2. Co-Client Deals
      prisma.dealClient.findMany({
        where: { customerId: id },
        include: {
          deal: {
            include: {
              asset: true,
              customer: { select: { id: true, fullName: true, phone: true } },
              invoices: {
                include: {
                  receipt: {
                    include: {
                      customer: { select: { id: true, fullName: true, phone: true } }
                    }
                  }
                },
                orderBy: { dueDate: 'asc' }
              },
              coClients: {
                include: {
                  customer: { select: { id: true, fullName: true, phone: true, walletBalance: true } }
                }
              },
              project: {
                include: { expenseBills: true }
              }
            }
          }
        }
      }),
      // 3. Receipts
      prisma.receipt.findMany({
        where: { customerId: id },
        include: {
          invoices: true,
          customer: { select: { id: true, fullName: true, phone: true } }
        },
        orderBy: { receiptDate: 'desc' }
      })
    ]);

    const formatDeal = (deal: any, isPrimary: boolean, shareLabel?: string | null, primaryCustomer?: any) => {
      const pendingBalance = deal.invoices
        .filter((inv: any) => inv.paymentStatus !== 'PAID')
        .reduce((sum: Decimal, inv: any) => {
          const invPaid = new Decimal(inv.paidAmount || 0);
          const remaining = new Decimal(inv.amount).minus(invPaid);
          return sum.plus(remaining.greaterThan(0) ? remaining : 0);
        }, new Decimal(0));

      const totalCollected = deal.invoices.reduce((sum: Decimal, inv: any) => {
        const invPaid = new Decimal(inv.paidAmount || (inv.paymentStatus === 'PAID' ? inv.amount : 0));
        return sum.plus(invPaid);
      }, new Decimal(0));

      let spentOnSite = new Decimal(0);
      if (deal.project && deal.project.expenseBills) {
        spentOnSite = deal.project.expenseBills.reduce(
          (sum: Decimal, b: any) => sum.plus(new Decimal(b.grandTotal)),
          new Decimal(0)
        );
      }

      const netMargin = totalCollected.minus(spentOnSite);

      return {
        ...deal,
        isPrimary,
        shareLabel: shareLabel || null,
        primaryCustomer: primaryCustomer || null,
        pendingBalance,
        totalCollected,
        spentOnSite,
        netMargin
      };
    };

    const primaryDeals = deals.map((deal) => formatDeal(deal, true));
    const coDeals = dealClients
      .filter((dc) => !deals.some((d) => d.id === dc.deal.id))
      .map((dc) => formatDeal(dc.deal, false, dc.shareLabel, dc.deal.customer));

    const allCustomerDeals = [...primaryDeals, ...coDeals];

    const result = {
      ...customer,
      deals: allCustomerDeals,
      dealClients,
      receipts
    };

    setCache(CACHE_KEY, result, 60_000);
    return result;
  }

  /**
   * Creates a new customer with an initial 0.00 walletBalance.
   */
  static async createCustomer(data: CreateCustomerInput) {
    const customer = await prisma.customer.create({
      data: {
        fullName: data.fullName,
        phone: data.phone,
        walletBalance: 0
      }
    });
    bustCache('customers');
    return customer;
  }
}
