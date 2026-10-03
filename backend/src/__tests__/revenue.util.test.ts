import { WalletManager } from '../utils/revenue.util';
import { JournalService } from '../services/journal.service';
import Decimal from 'decimal.js';

describe('WalletManager.consumeAdvance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('stamps walletPayerId on invoice and updates customer wallet balance', async () => {
    const mockCustomer = {
      id: 'cust-101',
      fullName: 'Muhammad Usman',
      walletBalance: new Decimal(1000000),
    };

    const mockInvoice = {
      id: 'inv-202',
      dealId: 'deal-303',
      description: 'Milestone 1',
      amount: new Decimal(500000),
      paidAmount: new Decimal(0),
      paymentStatus: 'UNPAID',
      deal: {
        id: 'deal-303',
        customerId: 'cust-101',
      },
    };

    const mockWalletAccount = { id: 'acc-2100', accountCode: '2100' };
    const mockArAccount = { id: 'acc-1100', accountCode: '1100' };

    const mockTx: any = {
      customer: {
        findUnique: jest.fn().mockResolvedValue(mockCustomer),
        update: jest.fn().mockResolvedValue({
          ...mockCustomer,
          walletBalance: new Decimal(500000),
        }),
      },
      dealInvoice: {
        findUnique: jest.fn().mockResolvedValue(mockInvoice),
        update: jest.fn().mockResolvedValue({
          ...mockInvoice,
          paidAmount: new Decimal(500000),
          paymentStatus: 'PAID',
          walletPayerId: 'cust-101',
        }),
      },
      account: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.accountCode === '2100') return Promise.resolve(mockWalletAccount);
          if (where.accountCode === '1100') return Promise.resolve(mockArAccount);
          return Promise.resolve(null);
        }),
      },
    };

    jest.spyOn(JournalService, 'postEntry').mockResolvedValue({ id: 'jv-1' } as any);

    const result = await WalletManager.consumeAdvance(
      'cust-101',
      '500000',
      'inv-202',
      mockTx
    );

    expect(result.invoicePaid).toBe(true);
    expect(result.walletBalanceRemaining.toString()).toBe('500000');

    // Assert that walletPayerId was stamped on the dealInvoice update
    expect(mockTx.dealInvoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-202' },
        data: expect.objectContaining({
          paymentStatus: 'PAID',
          walletPayerId: 'cust-101',
        }),
      })
    );
    const updateCall = mockTx.dealInvoice.update.mock.calls[0][0];
    expect(updateCall.data.paidAmount.toString()).toBe('500000');

    // Assert that customer wallet balance was decremented
    expect(mockTx.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'cust-101' },
      })
    );
    const custUpdateCall = mockTx.customer.update.mock.calls[0][0];
    expect(custUpdateCall.data.walletBalance.decrement.toString()).toBe('500000');
  });
});
