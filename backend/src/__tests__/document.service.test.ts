import { DocumentService } from '../services/document.service';
import { prisma } from '../config/db';
import Decimal from 'decimal.js';

jest.mock('../config/db', () => {
  const mockClient: any = {
    vendorPayment: { findMany: jest.fn() },
    expenseBill: { findMany: jest.fn() },
    receipt: { findMany: jest.fn() },
  };
  return { prisma: mockClient };
});

const mockPrisma = prisma as any;

describe('DocumentService.getDocumentArchive', () => {
  const mockPayments = [
    {
      id: 'vp-00000001',
      vendorId: 'v-1',
      amountPaid: new Decimal(100000),
      chequeRef: null,
      transactionId: 'UTR-1111',
      paymentDate: new Date('2026-09-20T10:00:00Z'),
      vendor: { id: 'v-1', vendorName: 'Al-Madina Bricks' },
    },
  ];

  const mockDirectBills = [
    {
      id: 'eb-00000002',
      vendorId: 'v-2',
      invoiceNumber: 'INV-404',
      billDate: new Date('2026-09-19T10:00:00Z'),
      paymentType: 'DIRECT_CASH',
      grandTotal: new Decimal(25000),
      vendor: { id: 'v-2', vendorName: 'City Glass' },
      project: { id: 'p-1', projectName: 'Wadaan Heights' },
      lineItems: [
        { description: 'Glass Sheets', quantity: 5, unitPrice: new Decimal(5000), lineTotal: new Decimal(25000) },
      ],
    },
  ];

  const mockReceipts = [
    {
      id: 'rec-00000003',
      customerId: 'c-1',
      amount: new Decimal(500000),
      paymentMethod: 'ONLINE',
      bankRefNumber: 'REF-777',
      clearanceStatus: 'CLEARED',
      receiptDate: new Date('2026-09-18T10:00:00Z'),
      customer: { id: 'c-1', fullName: 'Bilal Tariq', phone: '03001234567' },
      invoices: [{ description: 'Milestone 1', amount: new Decimal(500000) }],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.vendorPayment.findMany.mockResolvedValue(mockPayments);
    mockPrisma.expenseBill.findMany.mockResolvedValue(mockDirectBills);
    mockPrisma.receipt.findMany.mockResolvedValue(mockReceipts);
  });

  test('1. Combines CPV, DPR, and REC documents sorted descending by date', async () => {
    const result = await DocumentService.getDocumentArchive({ type: 'ALL' });

    expect(result.total).toBe(3);
    expect(result.documents.length).toBe(3);

    // Sorted descending: Sep 20 (CPV), Sep 19 (DPR), Sep 18 (REC)
    expect(result.documents[0].documentType).toBe('CPV');
    expect(result.documents[0].documentNumber).toBe('CPV-00000001');
    expect(result.documents[0].partyName).toBe('Al-Madina Bricks');

    expect(result.documents[1].documentType).toBe('DPR');
    expect(result.documents[1].documentNumber).toBe('DPR-00000002');
    expect(result.documents[1].partyName).toBe('City Glass');

    expect(result.documents[2].documentType).toBe('REC');
    expect(result.documents[2].documentNumber).toBe('REC-00000003');
    expect(result.documents[2].partyName).toBe('Bilal Tariq');
  });

  test('2. Filters specifically by document type', async () => {
    // CPV only
    const cpvResult = await DocumentService.getDocumentArchive({ type: 'CPV' });
    expect(mockPrisma.vendorPayment.findMany).toHaveBeenCalled();
    expect(mockPrisma.expenseBill.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.receipt.findMany).not.toHaveBeenCalled();
    expect(cpvResult.documents.every((d) => d.documentType === 'CPV')).toBe(true);

    jest.clearAllMocks();
    mockPrisma.expenseBill.findMany.mockResolvedValue(mockDirectBills);

    // DPR only
    const dprResult = await DocumentService.getDocumentArchive({ type: 'DPR' });
    expect(mockPrisma.vendorPayment.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.expenseBill.findMany).toHaveBeenCalled();
    expect(mockPrisma.receipt.findMany).not.toHaveBeenCalled();
    expect(dprResult.documents.every((d) => d.documentType === 'DPR')).toBe(true);
  });

  test('3. Filters documents by search query across party name, doc number, and references', async () => {
    const result = await DocumentService.getDocumentArchive({ search: 'City Glass' });

    expect(result.total).toBe(1);
    expect(result.documents[0].partyName).toBe('City Glass');
    expect(result.documents[0].documentType).toBe('DPR');
  });

  test('4. Paginates document results correctly', async () => {
    const result = await DocumentService.getDocumentArchive({
      type: 'ALL',
      page: 1,
      pageSize: 2,
    });

    expect(result.total).toBe(3);
    expect(result.documents.length).toBe(2);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(2);
    expect(result.totalPages).toBe(2);
  });
});
