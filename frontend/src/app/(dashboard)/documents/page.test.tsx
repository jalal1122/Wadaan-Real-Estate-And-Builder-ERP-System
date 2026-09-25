import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DocumentArchivePage from './page';
import * as receiptPrinter from '@/lib/receiptPrinter';

// Mock navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/documents',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

// Mock useDocumentArchive hook
const mockUseDocumentArchive = vi.fn();
vi.mock('@/features/documents/hooks/useDocuments', () => ({
  useDocumentArchive: (filter: any) => mockUseDocumentArchive(filter),
}));

describe('DocumentArchivePage Component', () => {
  const mockDocuments = [
    {
      id: 'pay-001',
      documentType: 'CPV',
      documentNumber: 'CPV-PAY00001',
      date: '2026-09-20T10:00:00.000Z',
      partyName: 'Ali Hardware',
      partyType: 'VENDOR',
      reference: 'Cheque: CHQ-1002',
      amount: 120000,
      paymentMethod: 'CHEQUE',
      status: 'PENDING_CLEARANCE',
      projectName: null,
      printPayload: { id: 'pay-001', amountPaid: 120000, chequeRef: 'CHQ-1002' },
    },
    {
      id: 'bill-002',
      documentType: 'DPR',
      documentNumber: 'DPR-BILL0002',
      date: '2026-09-19T14:30:00.000Z',
      partyName: 'Peshawar Electric Supply',
      partyType: 'VENDOR',
      reference: 'Invoice: ELEC-45',
      amount: 45000,
      paymentMethod: 'DIRECT_CASH',
      status: 'POSTED',
      projectName: 'Wadaan Heights',
      printPayload: { billId: 'bill-002', invoiceNumber: 'ELEC-45', grandTotal: 45000 },
    },
    {
      id: 'rec-003',
      documentType: 'REC',
      documentNumber: 'REC-REC00003',
      date: '2026-09-18T11:00:00.000Z',
      partyName: 'Farhan Shah',
      partyType: 'CUSTOMER',
      reference: 'Ref: UTR-982134',
      amount: 350000,
      paymentMethod: 'ONLINE',
      status: 'CLEARED',
      projectName: null,
      printPayload: { id: 'rec-003', amount: 350000, paymentMethod: 'ONLINE' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDocumentArchive.mockReturnValue({
      data: {
        documents: mockDocuments,
        total: 3,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it('1. Renders Document Archive page with title and all documents', () => {
    render(<DocumentArchivePage />);

    expect(screen.getByText(/Document Archive & Receipts/i)).toBeInTheDocument();
    expect(screen.getByText('CPV-PAY00001')).toBeInTheDocument();
    expect(screen.getByText('DPR-BILL0002')).toBeInTheDocument();
    expect(screen.getByText('REC-REC00003')).toBeInTheDocument();
    expect(screen.getByText('Ali Hardware')).toBeInTheDocument();
    expect(screen.getByText('Peshawar Electric Supply')).toBeInTheDocument();
    expect(screen.getByText('Farhan Shah')).toBeInTheDocument();
  });

  it('2. Type filter tab triggers filter change', () => {
    render(<DocumentArchivePage />);

    const cpvTab = screen.getByRole('button', { name: /Payment Vouchers \(CPV\)/i });
    fireEvent.click(cpvTab);

    expect(mockUseDocumentArchive).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'CPV',
        page: 1,
      })
    );
  });

  it('3. Search input updates search filter', () => {
    render(<DocumentArchivePage />);

    const searchInput = screen.getByPlaceholderText(/Search by Document #, Vendor, Customer, or Reference/i);
    fireEvent.change(searchInput, { target: { value: 'Ali Hardware' } });

    expect(mockUseDocumentArchive).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'Ali Hardware',
      })
    );
  });

  it('4. Re-print button on CPV row triggers printPaymentReceiptDocument', () => {
    const printSpy = vi.spyOn(receiptPrinter, 'printPaymentReceiptDocument').mockImplementation(() => {});

    render(<DocumentArchivePage />);

    const printButtons = screen.getAllByRole('button', { name: /Print/i });
    expect(printButtons.length).toBe(3);

    // Click print on first document (CPV)
    fireEvent.click(printButtons[0]);

    expect(printSpy).toHaveBeenCalledWith(mockDocuments[0].printPayload);
    printSpy.mockRestore();
  });

  it('5. Re-print button on DPR row triggers printDirectPaymentReceiptDocument', () => {
    const printSpy = vi.spyOn(receiptPrinter, 'printDirectPaymentReceiptDocument').mockImplementation(() => {});

    render(<DocumentArchivePage />);

    const printButtons = screen.getAllByRole('button', { name: /Print/i });

    // Click print on second document (DPR)
    fireEvent.click(printButtons[1]);

    expect(printSpy).toHaveBeenCalledWith(mockDocuments[1].printPayload);
    printSpy.mockRestore();
  });

  it('6. Re-print button on REC row triggers printInflowReceiptDocument', () => {
    const printSpy = vi.spyOn(receiptPrinter, 'printInflowReceiptDocument').mockImplementation(() => {});

    render(<DocumentArchivePage />);

    const printButtons = screen.getAllByRole('button', { name: /Print/i });

    // Click print on third document (REC)
    fireEvent.click(printButtons[2]);

    expect(printSpy).toHaveBeenCalledWith(mockDocuments[2].printPayload);
    printSpy.mockRestore();
  });

  it('7. Displays empty state message when no records are returned', () => {
    mockUseDocumentArchive.mockReturnValue({
      data: {
        documents: [],
        total: 0,
        page: 1,
        pageSize: 15,
        totalPages: 1,
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<DocumentArchivePage />);

    expect(screen.getByText(/No documents found matching the criteria/i)).toBeInTheDocument();
  });
});
