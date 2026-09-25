import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MasterReportsHubPage from './page';

// Mock the report hooks
const mockRefetchSnapshot = vi.fn();
const mockRefetchMargins = vi.fn();
const mockRefetchAging = vi.fn();
const mockRefetchNetIncome = vi.fn();

const mockSnapshotData = {
  liquidCash: '12092655.00',
  clientFundsHeld: '500000.00',
  totalAR: '32000000.00',
  totalAP: '1542500.00',
};

const mockDealMarginsData = [
  {
    dealId: 'deal-001',
    dealType: 'CONSTRUCTION' as const,
    customerName: 'Chaudhry Aslam',
    projectName: 'Wadaan Heights',
    totalValue: '16000000.00',
    revenueCollected: '8000000.00',
    totalProjectCost: '3000000.00',
    grossProfit: '5000000.00',
    marginPercentage: '62.50',
    isWipAsset: false,
  },
  {
    dealId: 'deal-002',
    dealType: 'WADAAN_SALE' as const,
    customerName: 'Tariq Mehmood',
    projectName: null,
    totalValue: '6000000.00',
    revenueCollected: '2000000.00',
    totalProjectCost: '1500000.00',
    grossProfit: '5000000.00',
    marginPercentage: '25.00',
    isWipAsset: true,
  },
];

const mockAgingRadarData = {
  receivables: [
    {
      invoiceId: 'inv-101',
      customerName: 'Tariq Mehmood',
      description: 'Down Payment',
      amount: '3000000.00',
      dueDate: '2026-09-20T00:00:00.000Z',
      daysOverdue: 3,
    },
  ],
  payables: [
    {
      billId: 'bill-201',
      vendorName: 'Ali Hardware',
      invoiceNumber: 'INV-STEEL-101',
      pendingAmount: '1500000.00',
      billDate: '2026-09-20T00:00:00.000Z',
      daysOverdue: 3,
    },
  ],
};

const mockNetIncomeData = {
  period: {
    startDate: '2026-07-01T00:00:00.000Z',
    endDate: '2027-06-30T23:59:59.999Z',
  },
  grossDealProfit: '5000000.00',
  brokerageCommissions: '200000.00',
  generalOverhead: '694845.00',
  netIncome: '4505155.00',
};

const mockProjectLedgerData = {
  project: {
    id: 'proj-1',
    projectName: 'Wadaan Heights',
    projectPrefix: 'WH',
  },
  lineItems: [
    {
      billId: 'bill-1',
      lineItemId: 'line-1',
      billDate: '2026-09-15T00:00:00.000Z',
      vendorName: 'Al-Hadeed Steel Mills',
      invoiceNumber: 'INV-1001',
      description: 'Deformed Grade 60 Steel 10mm',
      quantity: '10',
      unitPrice: '25000',
      lineTotal: '250000.00',
    },
  ],
  totalProjectCost: '250000.00',
};

const mockOverheadData = {
  bills: [
    {
      billId: 'bill-oh-1',
      billDate: '2026-09-10T00:00:00.000Z',
      vendorName: 'WAPDA Electricity',
      invoiceNumber: 'BILL-ELEC-01',
      grandTotal: '75000.00',
      paymentStatus: 'PAID',
    },
  ],
  totalOverhead: '75000.00',
};

const mockEquityData = {
  arshad: {
    partnerName: 'Arshad Khalil',
    accountCode: '3010-01',
    accountName: 'Owner Drawings & Distributions',
    lines: [
      {
        id: 'line-draw-1',
        date: '2026-09-08T14:30:00.000Z',
        reference: 'JV-MOD1-002',
        memo: 'Cheque #991024 personal withdrawal',
        accountCode: '3010-01',
        amount: '200000.00',
      },
    ],
    totalDrawings: '200000.00',
  },
  zeeshan: {
    partnerName: 'Zeeshan Yousafzai',
    accountCode: '3020',
    accountName: 'Zeeshan Yousafzai Drawings (3020)',
    lines: [],
    totalDrawings: '0.00',
  },
  grandTotal: '200000.00',
};

vi.mock('@/features/reports/hooks/useReports', () => ({
  useExecutiveSnapshot: () => ({
    data: mockSnapshotData,
    isLoading: false,
    refetch: mockRefetchSnapshot,
  }),
  useDealMargins: () => ({
    data: mockDealMarginsData,
    isLoading: false,
    refetch: mockRefetchMargins,
  }),
  useAgingRadar: () => ({
    data: mockAgingRadarData,
    isLoading: false,
    refetch: mockRefetchAging,
  }),
  useNetIncome: () => ({
    data: mockNetIncomeData,
    isLoading: false,
    refetch: mockRefetchNetIncome,
  }),
  useProjectLedger: () => ({
    data: mockProjectLedgerData,
    isLoading: false,
    isError: false,
  }),
  useOverheadLedger: () => ({
    data: mockOverheadData,
    isLoading: false,
    isError: false,
  }),
  useEquityLedger: () => ({
    data: mockEquityData,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock('@/features/projects/hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      { id: 'proj-1', projectName: 'Wadaan Heights', projectCode: 'WH' },
      { id: 'proj-2', projectName: 'Wadaan Residency', projectCode: 'WR' },
    ],
    isLoading: false,
  }),
}));

describe('Master Reports Hub Page (Screen 10)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Master Reports Hub title, export button, and all 5 sub-tabs', () => {
    render(<MasterReportsHubPage />);

    expect(screen.getByText('Master Reports Hub')).toBeDefined();
    expect(screen.getByText('Export to PDF / Print')).toBeDefined();
    expect(screen.getByTestId('tab-snapshot')).toBeDefined();
    expect(screen.getByTestId('tab-deal-margins')).toBeDefined();
    expect(screen.getByTestId('tab-project-costs')).toBeDefined();
    expect(screen.getByTestId('tab-overhead')).toBeDefined();
    expect(screen.getByTestId('tab-drawings')).toBeDefined();
  });

  it('renders all 4 survival snapshot KPI cards on Tab 1', () => {
    render(<MasterReportsHubPage />);

    expect(screen.getByText('Total Liquid Cash')).toBeDefined();
    expect(screen.getByText('Client Funds Held')).toBeDefined();
    expect(screen.getByText('Total Receivables')).toBeDefined();
    expect(screen.getByText('Total Payables')).toBeDefined();
  });

  it('switches to Deal Margins tab and opens drill-down drawer', () => {
    render(<MasterReportsHubPage />);

    const dealMarginsTab = screen.getByTestId('tab-deal-margins');
    fireEvent.click(dealMarginsTab);

    expect(screen.getByText('Chaudhry Aslam')).toBeDefined();
    expect(screen.getAllByText('Wadaan Heights').length).toBeGreaterThanOrEqual(1);

    // Click on Chaudhry Aslam deal row
    const row = screen.getByTestId('deal-margin-row-deal-001');
    fireEvent.click(row);

    // Drawer should open displaying financial breakdown
    expect(screen.getByText('Financial Breakdown')).toBeDefined();
    expect(screen.getByText('Close Drill-Down')).toBeDefined();
  });

  it('switches to Project Cost Ledger tab and renders line items', () => {
    render(<MasterReportsHubPage />);

    const projectCostsTab = screen.getByTestId('tab-project-costs');
    fireEvent.click(projectCostsTab);

    expect(screen.getByTestId('project-cost-ledger')).toBeDefined();
    expect(screen.getByText('Al-Hadeed Steel Mills')).toBeDefined();
    expect(screen.getByText('Deformed Grade 60 Steel 10mm')).toBeDefined();
    expect(screen.getByTestId('project-total-cost')).toBeDefined();
  });

  it('switches to Office Overhead tab and renders overhead bills', () => {
    render(<MasterReportsHubPage />);

    const overheadTab = screen.getByTestId('tab-overhead');
    fireEvent.click(overheadTab);

    expect(screen.getByTestId('office-overhead-ledger')).toBeDefined();
    expect(screen.getByText('WAPDA Electricity')).toBeDefined();
    expect(screen.getByTestId('overhead-total-amount')).toBeDefined();
  });

  it('switches to Partner Drawings tab and displays both partner sections', () => {
    render(<MasterReportsHubPage />);

    const drawingsTab = screen.getByTestId('tab-drawings');
    fireEvent.click(drawingsTab);

    expect(screen.getByTestId('equity-drawings-ledger')).toBeDefined();
    expect(screen.getByTestId('partner-arshad-section')).toBeDefined();
    expect(screen.getByTestId('partner-zeeshan-section')).toBeDefined();
    expect(screen.getByText('Arshad Khalil')).toBeDefined();
    expect(screen.getByText('Zeeshan Yousafzai')).toBeDefined();
    expect(screen.getByText('Cheque #991024 personal withdrawal')).toBeDefined();
    expect(screen.getByTestId('equity-grand-total')).toBeDefined();
  });

  it('triggers refresh of all report metrics when Refresh button is clicked', async () => {
    render(<MasterReportsHubPage />);

    const refreshButton = screen.getByRole('button', { name: /Refresh/i });
    fireEvent.click(refreshButton);

    expect(mockRefetchSnapshot).toHaveBeenCalledTimes(1);
    expect(mockRefetchMargins).toHaveBeenCalledTimes(1);
    expect(mockRefetchAging).toHaveBeenCalledTimes(1);
    expect(mockRefetchNetIncome).toHaveBeenCalledTimes(1);
  });
});
