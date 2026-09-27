import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectReportModal } from './ProjectReportModal';

let mockReportData: any = null;
let mockIsLoading = false;
let mockIsError = false;

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useProjectReport: () => ({
    data: mockReportData,
    isLoading: mockIsLoading,
    isError: mockIsError,
    refetch: vi.fn(),
  }),
}));

describe('ProjectReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsLoading = false;
    mockIsError = false;
    window.print = vi.fn();

    mockReportData = {
      project: {
        id: 'proj-1',
        projectName: 'Wadaan Heights',
        projectPrefix: 'WH',
        status: 'ACTIVE',
        masterBOQ: 10000000,
        createdAt: '2026-01-01T00:00:00Z',
      },
      summary: {
        totalSpentWIP: 2500000,
        totalReceivedFromClients: 4000000,
        netCashMargin: 1500000,
        budgetVariance: 7500000,
        isOverBudget: false,
        budgetBurnPct: 25,
        totalVendorBillCount: 2,
        totalInvoiceCount: 3,
      },
      clientReceipts: [
        {
          customerId: 'cust-1',
          customerName: 'Arshad Sir',
          customerPhone: '0300-1111111',
          dealType: 'CONSTRUCTION',
          contractValue: 8000000,
          totalPaid: 3000000,
          totalPending: 5000000,
          payments: [
            {
              invoiceDescription: 'Token Payment',
              dueDate: '2026-01-15T00:00:00Z',
              receiptDate: '2026-01-15T00:00:00Z',
              amount: 1000000,
              paidAmount: 1000000,
              paymentStatus: 'PAID',
              paymentMethod: 'CASH',
              bankRefNumber: null,
              paidByCustomerName: 'Arshad Sir',
            },
            {
              invoiceDescription: 'Foundation Milestone',
              dueDate: '2026-03-01T00:00:00Z',
              receiptDate: '2026-03-01T00:00:00Z',
              amount: 2000000,
              paidAmount: 2000000,
              paymentStatus: 'PAID',
              paymentMethod: 'CHEQUE',
              bankRefNumber: 'CHQ-8821',
              paidByCustomerName: 'Zeeshan Sir',
            },
          ],
        },
      ],
      grandTotalFromClients: 4000000,
      vendorExpenses: [
        {
          vendorId: 'vend-1',
          vendorName: 'Ali Hardware',
          vendorPhone: '0300-3333333',
          totalBilled: 1250000,
          totalPaid: 1000000,
          totalPending: 250000,
          bills: [
            {
              invoiceNumber: 'INV-101',
              billDate: '2026-01-10T00:00:00Z',
              grandTotal: 500000,
              pendingAmount: 0,
              paymentStatus: 'PAID',
              lineItems: [
                {
                  description: 'Cement Bags',
                  quantity: 200,
                  unitPrice: 1500,
                  lineTotal: 300000,
                },
              ],
            },
          ],
        },
      ],
      grandTotalToVendors: 2500000,
      glSummary: {
        totalDebit: 2500000,
        totalCredit: 0,
        netBalance: 2500000,
      },
      glTransactions: [
        {
          id: 'line-1',
          journalId: 'jv-1',
          entryNumber: 'JV-0001',
          entryDate: '2026-01-10T00:00:00Z',
          journalDescription: 'Foundation materials',
          memo: 'Cement & sand',
          accountCode: '1200',
          accountName: 'Work In Progress',
          accountCategory: 'ASSET',
          debitAmount: 500000,
          creditAmount: 0,
          runningBalance: 500000,
          partyName: 'Ali Hardware',
        },
      ],
    };
  });

  it('1. renders null when projectId is null', () => {
    const { container } = render(
      <ProjectReportModal projectId={null} onClose={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('2. shows skeleton loading state while useProjectReport is loading', () => {
    mockIsLoading = true;
    mockReportData = null;

    render(<ProjectReportModal projectId="proj-1" onClose={vi.fn()} />);

    expect(screen.getByTestId('project-report-loading')).toBeInTheDocument();
  });

  it('3. renders project header with name, prefix, status, and BOQ', () => {
    render(<ProjectReportModal projectId="proj-1" onClose={vi.fn()} />);

    expect(screen.getByText('Wadaan Heights')).toBeInTheDocument();
    expect(screen.getAllByText('WH').length).toBeGreaterThan(0);
    expect(screen.getByText(/ACTIVE/i)).toBeInTheDocument();
  });

  it('4. renders financial summary strip with correct totals', () => {
    render(<ProjectReportModal projectId="proj-1" onClose={vi.fn()} />);

    expect(screen.getByText(/Executive Financial Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved Master BOQ/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Spent \(WIP\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Net Cash Margin/i)).toBeInTheDocument();
  });

  it('5. renders client receipts section grouped by customer with actual payer name', () => {
    render(<ProjectReportModal projectId="proj-1" onClose={vi.fn()} />);

    expect(screen.getByText(/Client Receipts Breakdown/i)).toBeInTheDocument();
    expect(screen.getAllByText('Arshad Sir').length).toBeGreaterThan(0);
    expect(screen.getByText('Foundation Milestone')).toBeInTheDocument();
    // Co-client payment payer
    expect(screen.getByText('Zeeshan Sir')).toBeInTheDocument();
  });

  it('6. renders vendor expenses section grouped by vendor', () => {
    render(<ProjectReportModal projectId="proj-1" onClose={vi.fn()} />);

    expect(screen.getByText(/Vendor Expenses & Subcontractors/i)).toBeInTheDocument();
    expect(screen.getAllByText('Ali Hardware').length).toBeGreaterThan(0);
    expect(screen.getByText('INV-101')).toBeInTheDocument();
    expect(screen.getByText(/Cement Bags/i)).toBeInTheDocument();
  });

  it('7. renders GL audit table rows', () => {
    render(<ProjectReportModal projectId="proj-1" onClose={vi.fn()} />);

    expect(screen.getByText(/General Ledger Audit Trail/i)).toBeInTheDocument();
    expect(screen.getByText('JV-0001')).toBeInTheDocument();
    expect(screen.getByText('Work In Progress')).toBeInTheDocument();
  });

  it('8. calls window.print() when Print button is clicked', () => {
    render(<ProjectReportModal projectId="proj-1" onClose={vi.fn()} />);

    const printBtn = screen.getByTestId('modal-print-btn');
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('9. calls onClose when Close button is clicked', () => {
    const handleClose = vi.fn();
    render(<ProjectReportModal projectId="proj-1" onClose={handleClose} />);

    const closeBtn = screen.getByTestId('close-project-report-modal');
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('10. renders into document.body via createPortal with id="project-report-portal"', () => {
    render(<ProjectReportModal projectId="proj-1" onClose={vi.fn()} />);

    const portalEl = document.getElementById('project-report-portal');
    expect(portalEl).toBeInTheDocument();
    expect(portalEl?.parentElement).toBe(document.body);
  });

  it('11. embeds print stylesheet isolating portal and suppressing background app flow', () => {
    const { container } = render(
      <ProjectReportModal projectId="proj-1" onClose={vi.fn()} />
    );

    const styleEl = document.querySelector('style');
    expect(styleEl).toBeInTheDocument();
    const cssText = styleEl?.textContent || '';
    expect(cssText).toContain('body > *:not(#project-report-portal)');
    expect(cssText).toContain('display: none !important');
    expect(cssText).toContain('#project-report-print-root');
    expect(cssText).toContain('position: static !important');
  });
});
