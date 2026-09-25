import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PayablesPage from './page';

// Mock mutations and hooks
const mockCreateBillMutate = vi.fn();
const mockCreateVendorMutate = vi.fn();
const mockExecutePaymentMutate = vi.fn();
const mockRefetchQueue = vi.fn();

const mockVendors = [
  {
    id: 'vend-1',
    vendorName: 'Bestway Cement',
    phone: '+92 300 1111111',
    totalOutstanding: 500000,
    totalPaid: 200000,
    unpaidBillsCount: 2,
  },
  {
    id: 'vend-2',
    vendorName: 'Fast Cables',
    phone: null,
    totalOutstanding: 0,
    totalPaid: 150000,
    unpaidBillsCount: 0,
  },
];

const mockProjects = [
  {
    id: 'proj-1',
    projectName: 'Wadaan Heights',
    projectPrefix: 'WHT',
    masterBOQ: 10000000,
    status: 'ACTIVE',
    spentToDate: 4000000,
    budgetVariance: 6000000,
    isOverBudget: false,
    budgetBurnPercentage: 40.0,
  },
];

const mockAccounts = [
  {
    id: 'acc-safe',
    accountCode: '1001',
    accountName: 'Office Cash Safe',
    category: 'ASSET',
  },
  {
    id: 'acc-bank',
    accountCode: '1002',
    accountName: 'Meezan Bank - Ops',
    category: 'ASSET',
  },
  {
    id: 'acc-ap',
    accountCode: '2000',
    accountName: 'Accounts Payable',
    category: 'LIABILITY',
  },
];

const mockUnpaidQueue = {
  vendorId: 'vend-1',
  vendorName: 'Bestway Cement',
  totalOutstanding: 500000,
  bills: [
    {
      id: 'bill-1',
      vendorId: 'vend-1',
      projectId: 'proj-1',
      invoiceNumber: 'INV-101',
      billDate: '2026-01-10T00:00:00Z',
      paymentType: 'ACCOUNTS_PAYABLE',
      paymentStatus: 'UNPAID' as const,
      grandTotal: 300000,
      pendingAmount: 300000,
      createdAt: '2026-01-10T00:00:00Z',
      project: {
        id: 'proj-1',
        projectName: 'Wadaan Heights',
        projectPrefix: 'WHT',
      },
    },
    {
      id: 'bill-2',
      vendorId: 'vend-1',
      projectId: null,
      invoiceNumber: 'INV-102',
      billDate: '2026-02-15T00:00:00Z',
      paymentType: 'ACCOUNTS_PAYABLE',
      paymentStatus: 'PARTIAL' as const,
      grandTotal: 300000,
      pendingAmount: 200000,
      createdAt: '2026-02-15T00:00:00Z',
      project: null,
    },
  ],
};

vi.mock('@/features/vendors/hooks/useVendors', () => ({
  useVendors: () => ({
    data: mockVendors,
    isLoading: false,
  }),
  useCreateVendor: () => ({
    mutate: mockCreateVendorMutate,
    isPending: false,
  }),
}));

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useProjects: () => ({
    data: mockProjects,
    isLoading: false,
  }),
}));

vi.mock('@/features/accounting/hooks/useAccounting', () => ({
  useChartOfAccounts: () => ({
    data: { accounts: mockAccounts },
    isLoading: false,
  }),
}));

vi.mock('@/features/bills/hooks/useBills', () => ({
  useCreateBill: () => ({
    mutate: mockCreateBillMutate,
    isPending: false,
  }),
}));

vi.mock('@/features/payments/hooks/usePayments', () => ({
  useVendorUnpaidBills: (vendorId: string | null) => ({
    data: vendorId === 'vend-1' ? mockUnpaidQueue : undefined,
    isLoading: false,
    refetch: mockRefetchQueue,
  }),
  useExecutePaymentRun: () => ({
    mutate: mockExecutePaymentMutate,
    isPending: false,
  }),
}));

describe('Accounts Payable Page (Screens 5 & 7)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('switches between Record Bill and Payment Run tabs', () => {
    render(<PayablesPage />);

    // Default is Record Bill
    expect(screen.getByText('Bill Metadata')).toBeInTheDocument();

    // Click Payment Run
    const paymentRunBtn = screen.getByRole('button', { name: /Payment Run/i });
    fireEvent.click(paymentRunBtn);

    expect(screen.getByText('Suppliers & Debt')).toBeInTheDocument();
    expect(
      screen.getByText('Select Supplier to Initiate Payment Run')
    ).toBeInTheDocument();

    // Switch back
    const recordBillBtn = screen.getByRole('button', { name: /Record Bill/i });
    fireEvent.click(recordBillBtn);

    expect(screen.getByText('Bill Metadata')).toBeInTheDocument();
  });

  describe('Record Bill Panel (Screen 5)', () => {
    it('shows WIP routing indicator when project is selected and slate overhead when none selected', () => {
      render(<PayablesPage />);

      // Initially "None" is selected -> Office Overhead (5000)
      const routingBadge = screen.getByTestId('wip-routing-badge');
      expect(routingBadge).toHaveTextContent(/Office Overhead \(5000\)/i);

      // Select project Wadaan Heights
      const projectSelect = screen.getByLabelText(/Project Allocation/i);
      fireEvent.change(projectSelect, { target: { value: 'proj-1' } });

      expect(routingBadge).toHaveTextContent(/WIP Asset \(1200\)/i);
    });

    it('auto-calculates line total and grand total as quantity and price are entered', () => {
      render(<PayablesPage />);

      // Row 0 inputs
      const qtyInput = screen.getByPlaceholderText('Qty');
      const priceInput = screen.getByPlaceholderText('Unit Price');

      fireEvent.change(qtyInput, { target: { value: '10' } });
      fireEvent.change(priceInput, { target: { value: '500' } });

      // Grand total should be 10 * 500 = 5,000
      const grandTotalDisplay = screen.getByTestId('grand-total-display');
      expect(grandTotalDisplay).toHaveTextContent(/5,000/i);
    });

    it('shows Source Account select ONLY when DIRECT_CASH is chosen and only includes ASSET accounts', () => {
      render(<PayablesPage />);

      // Initially ACCOUNTS_PAYABLE -> source account select does not exist
      expect(screen.queryByTestId('source-account-section')).not.toBeInTheDocument();

      // Toggle to DIRECT_CASH
      const directCashBtn = screen.getByRole('button', { name: /Direct Cash \/ Bank/i });
      fireEvent.click(directCashBtn);

      expect(screen.getByTestId('source-account-section')).toBeInTheDocument();

      // Check options in the select: Office Cash Safe and Meezan Bank should be present, Accounts Payable (LIABILITY) should NOT be present
      const select = screen.getByTestId('source-account-select');
      expect(select).toHaveTextContent('Office Cash Safe');
      expect(select).toHaveTextContent('Meezan Bank - Ops');
      expect(select).not.toHaveTextContent('Accounts Payable');
    });

    it('renders duplicate invoice error inline when server returns DUPLICATE_INVOICE', () => {
      mockCreateBillMutate.mockImplementation((payload, { onError }) => {
        onError({
          response: {
            data: {
              error: {
                code: 'DUPLICATE_INVOICE',
                message: "Invoice number 'INV-999' already exists for this vendor",
              },
            },
          },
        });
      });

      render(<PayablesPage />);

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/Vendor \/ Supplier/i), {
        target: { value: 'vend-1' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. INV-2026-0891/i), {
        target: { value: 'INV-999' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Item or service description/i), {
        target: { value: 'Steel Bars' },
      });
      fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '2' } });
      fireEvent.change(screen.getByPlaceholderText('Unit Price'), { target: { value: '1000' } });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /Save Bill & Post Ledger/i }));

      // Inline error must appear
      expect(
        screen.getByText(/Invoice #INV-999 already exists for this vendor/i)
      ).toBeInTheDocument();
    });

    it('displays over-budget warning banner when bill causes project to exceed BOQ', () => {
      mockCreateBillMutate.mockImplementation((payload, { onSuccess }) => {
        onSuccess({
          bill: { invoiceNumber: 'INV-100', grandTotal: 7000000 },
          isOverBudget: true,
          overBudgetAmount: 1000000,
          journalEntry: {},
        });
      });

      render(<PayablesPage />);

      fireEvent.change(screen.getByLabelText(/Vendor \/ Supplier/i), {
        target: { value: 'vend-1' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. INV-2026-0891/i), {
        target: { value: 'INV-100' },
      });
      fireEvent.change(screen.getByPlaceholderText(/Item or service description/i), {
        target: { value: 'Foundation Work' },
      });
      fireEvent.change(screen.getByPlaceholderText('Qty'), { target: { value: '1' } });
      fireEvent.change(screen.getByPlaceholderText('Unit Price'), { target: { value: '7000000' } });

      fireEvent.click(screen.getByRole('button', { name: /Save Bill & Post Ledger/i }));

      const banner = screen.getByTestId('bill-notification-banner');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(/Project exceeds approved BOQ/i);
    });
  });

  describe('Payment Run Panel (Screen 7)', () => {
    beforeEach(() => {
      // Switch to Payment Run tab
      render(<PayablesPage />);
      const paymentRunBtn = screen.getByRole('button', { name: /Payment Run/i });
      fireEvent.click(paymentRunBtn);
    });

    it('selects vendor and renders FIFO unpaid bills queue', () => {
      // Click Bestway Cement
      const vendorBtn = screen.getByText('Bestway Cement');
      fireEvent.click(vendorBtn);

      // Detail header displays Bestway Cement and total debt
      expect(screen.getByRole('heading', { name: 'Bestway Cement' })).toBeInTheDocument();
      const debtDisplay = screen.getByTestId('total-outstanding-display');
      expect(debtDisplay).toHaveTextContent(/500,000/i);

      // Table shows 2 bills in FIFO order
      expect(screen.getByText('INV-101')).toBeInTheDocument();
      expect(screen.getByText('INV-102')).toBeInTheDocument();
    });

    it('enforces Guardrail 1 (No-overpay lock): disables submit and shows error if amount exceeds total debt', () => {
      fireEvent.click(screen.getByText('Bestway Cement'));

      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '600000' } }); // 600,000 > 500,000

      // Overpay error appears
      expect(screen.getByTestId('overpay-error-message')).toBeInTheDocument();
      expect(screen.getByTestId('overpay-error-message')).toHaveTextContent(
        /Payment exceeds outstanding debt/i
      );

      // Submit button is disabled
      const submitBtn = screen.getByRole('button', {
        name: /Execute Payment & Print/i,
      });
      expect(submitBtn).toBeDisabled();
    });

    it('enforces Guardrail 2 (Cheque Lock): requires chequeRef when Bank account is selected', () => {
      fireEvent.click(screen.getByText('Bestway Cement'));

      // Enter valid amount: 100,000
      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '100000' } });

      // 1. Select Office Cash Safe -> no cheque lock container
      const accountSelect = screen.getByLabelText(/Disbursement Account/i);
      fireEvent.change(accountSelect, { target: { value: 'acc-safe' } });

      expect(screen.queryByTestId('cheque-ref-container')).not.toBeInTheDocument();
      const submitBtn = screen.getByRole('button', {
        name: /Execute Payment & Print/i,
      });
      // Submit is enabled for Cash
      expect(submitBtn).not.toBeDisabled();

      // 2. Select Bank account -> Cheque lock container appears, submit disabled
      fireEvent.change(accountSelect, { target: { value: 'acc-bank' } });
      expect(screen.getByTestId('cheque-ref-container')).toBeInTheDocument();
      expect(submitBtn).toBeDisabled();

      // 3. Enter cheque reference -> Submit becomes enabled
      const chequeInput = screen.getByPlaceholderText(/e\.g\. CHQ-994201/i);
      fireEvent.change(chequeInput, { target: { value: 'CHQ-55441' } });
      expect(submitBtn).not.toBeDisabled();
    });

    it('supports Online Transfer mode for Bank account: toggles mode, requires transactionId, and submits transactionId', () => {
      fireEvent.click(screen.getByText('Bestway Cement'));

      const amountInput = screen.getByPlaceholderText('0.00');
      fireEvent.change(amountInput, { target: { value: '150000' } });

      const accountSelect = screen.getByLabelText(/Disbursement Account/i);
      fireEvent.change(accountSelect, { target: { value: 'acc-bank' } });

      // Default is Cheque
      expect(screen.getByTestId('cheque-ref-container')).toBeInTheDocument();
      expect(screen.queryByTestId('online-ref-container')).not.toBeInTheDocument();

      // Switch to Online Transfer
      const onlineToggleBtn = screen.getByRole('button', { name: /Online Transfer/i });
      fireEvent.click(onlineToggleBtn);

      // Now Online container is rendered, Cheque container is gone
      expect(screen.queryByTestId('cheque-ref-container')).not.toBeInTheDocument();
      expect(screen.getByTestId('online-ref-container')).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', {
        name: /Execute Payment & Print/i,
      });
      // Submit is disabled because transactionId is empty
      expect(submitBtn).toBeDisabled();

      // Enter transaction ID
      const txInput = screen.getByPlaceholderText(/e\.g\. FT-202609-8819/i);
      fireEvent.change(txInput, { target: { value: 'FT-99220011' } });

      expect(submitBtn).not.toBeDisabled();

      // Submit payment
      fireEvent.click(submitBtn);

      expect(mockExecutePaymentMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: 'vend-1',
          sourceAccountId: 'acc-bank',
          amountPaid: 150000,
          chequeRef: null,
          transactionId: 'FT-99220011',
        }),
        expect.anything()
      );
    });

    it('renders invoice selection checkboxes and toggles specific bills', () => {
      fireEvent.click(screen.getByText('Bestway Cement'));

      const chk1 = screen.getByTestId('select-bill-bill-1');
      const chk2 = screen.getByTestId('select-bill-bill-2');

      expect(chk1).toBeInTheDocument();
      expect(chk2).toBeInTheDocument();
      expect(chk1).not.toBeChecked();
      expect(chk2).not.toBeChecked();

      // Select bill 1 (INV-101 with pending 300,000)
      fireEvent.click(chk1);
      expect(chk1).toBeChecked();

      // Summary badge appears
      const summary = screen.getByTestId('selected-invoices-summary');
      expect(summary).toHaveTextContent(/1 of 2 selected/i);
      expect(summary).toHaveTextContent(/300,000/i);

      // Allocation input is visible with full pending amount
      const allocInput1 = screen.getByTestId('allocation-input-bill-1') as HTMLInputElement;
      expect(allocInput1.value).toBe('300000');
    });

    it('allows editing allocation amount for a selected bill and recalculates total payment', () => {
      fireEvent.click(screen.getByText('Bestway Cement'));

      // Check Bill 2 (pending 200,000)
      const chk2 = screen.getByTestId('select-bill-bill-2');
      fireEvent.click(chk2);

      // Partial allocation: change 200,000 to 75,000
      const allocInput2 = screen.getByTestId('allocation-input-bill-2');
      fireEvent.change(allocInput2, { target: { value: '75000' } });

      const summary = screen.getByTestId('selected-invoices-summary');
      expect(summary).toHaveTextContent(/75,000/i);
    });

    it('disables submit when row allocation exceeds bill pending amount', () => {
      fireEvent.click(screen.getByText('Bestway Cement'));

      // Check Bill 2 (pending 200,000)
      const chk2 = screen.getByTestId('select-bill-bill-2');
      fireEvent.click(chk2);

      // Select disbursement account
      const accountSelect = screen.getByLabelText(/Disbursement Account/i);
      fireEvent.change(accountSelect, { target: { value: 'acc-safe' } });

      // Overpay on Bill 2: 250,000 > 200,000
      const allocInput2 = screen.getByTestId('allocation-input-bill-2');
      fireEvent.change(allocInput2, { target: { value: '250000' } });

      // Row error displayed
      expect(screen.getByTestId('row-error-bill-2')).toBeInTheDocument();

      // Submit button is disabled
      const submitBtn = screen.getByRole('button', { name: /Execute Payment & Print/i });
      expect(submitBtn).toBeDisabled();
    });

    it('submits invoiceAllocations payload when selective mode is active', () => {
      fireEvent.click(screen.getByText('Bestway Cement'));

      // Check Bill 1 only, set allocation to 120,000
      const chk1 = screen.getByTestId('select-bill-bill-1');
      fireEvent.click(chk1);

      const allocInput1 = screen.getByTestId('allocation-input-bill-1');
      fireEvent.change(allocInput1, { target: { value: '120000' } });

      // Select safe account
      const accountSelect = screen.getByLabelText(/Disbursement Account/i);
      fireEvent.change(accountSelect, { target: { value: 'acc-safe' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /Execute Payment & Print/i });
      expect(submitBtn).not.toBeDisabled();
      fireEvent.click(submitBtn);

      expect(mockExecutePaymentMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          vendorId: 'vend-1',
          sourceAccountId: 'acc-safe',
          amountPaid: 120000,
          invoiceAllocations: [
            {
              billId: 'bill-1',
              amount: 120000,
            },
          ],
        }),
        expect.anything()
      );
    });

    it('Select All button checks all invoices with full pending amounts', () => {
      fireEvent.click(screen.getByText('Bestway Cement'));

      const selectAllBtn = screen.getByRole('button', { name: /Select All Invoices/i });
      fireEvent.click(selectAllBtn);

      expect(screen.getByTestId('select-bill-bill-1')).toBeChecked();
      expect(screen.getByTestId('select-bill-bill-2')).toBeChecked();

      const summary = screen.getByTestId('selected-invoices-summary');
      expect(summary).toHaveTextContent(/2 of 2 selected/i);
      expect(summary).toHaveTextContent(/500,000/i);
    });
  });
});
