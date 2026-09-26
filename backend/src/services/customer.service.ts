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
              include: {
                receipt: {
                  include: {
                    customer: {
                      select: {
                        id: true,
                        fullName: true,
                        phone: true
                      }
                    }
                  }
                }
              },
              orderBy: { dueDate: 'asc' }
            },
            coClients: {
              include: {
                customer: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true,
                    walletBalance: true
                  }
                }
              }
            },
            project: {
              include: {
                expenseBills: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        dealClients: {
          include: {
            deal: {
              include: {
                customer: {
                  select: {
                    id: true,
                    fullName: true,
                    phone: true
                  }
                },
                invoices: {
                  include: {
                    receipt: {
                      include: {
                        customer: {
                          select: {
                            id: true,
                            fullName: true,
                            phone: true
                          }
                        }
                      }
                    }
                  },
                  orderBy: { dueDate: 'asc' }
                },
                coClients: {
                  include: {
                    customer: {
                      select: {
                        id: true,
                        fullName: true,
                        phone: true,
                        walletBalance: true
                      }
                    }
                  }
                },
                project: {
                  include: {
                    expenseBills: true
                  }
                }
              }
            }
          }
        },
        receipts: {
          include: {
            invoices: true,
            customer: {
              select: {
                id: true,
                fullName: true,
                phone: true
              }
            }
          },
          orderBy: { receiptDate: 'desc' }
        }
      }
    });

    if (!customer) {
      throw new AppError(`Customer with ID '${id}' not found`, 404, 'CUSTOMER_NOT_FOUND');
    }

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

    const primaryDeals = customer.deals.map((deal) => formatDeal(deal, true));
    const coDeals = (customer.dealClients || [])
      .filter((dc) => !customer.deals.some((d) => d.id === dc.deal.id))
      .map((dc) => formatDeal(dc.deal, false, dc.shareLabel, dc.deal.customer));

    const allCustomerDeals = [...primaryDeals, ...coDeals];

    return {
      ...customer,
      deals: allCustomerDeals
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
