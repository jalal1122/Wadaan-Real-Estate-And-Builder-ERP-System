import { prisma } from '../config/db';

import { getCache, setCache } from '../utils/cache.util';

export interface DocumentArchiveFilter {
  search?: string;
  type?: 'ALL' | 'CPV' | 'DPR' | 'REC';
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ArchiveDocumentItem {
  id: string;
  documentType: 'CPV' | 'DPR' | 'REC';
  documentNumber: string;
  date: string;
  partyName: string;
  partyType: 'VENDOR' | 'CUSTOMER';
  reference: string | null;
  amount: number;
  paymentMethod: string;
  status: string;
  projectName: string | null;
  printPayload: any;
}

export interface DocumentArchiveResponse {
  documents: ArchiveDocumentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class DocumentService {
  /**
   * Aggregates and paginates documents across Payment Runs (CPV),
   * Direct Payment Expense Bills (DPR), and Inflow Receipts (REC).
   */
  static async getDocumentArchive(filter: DocumentArchiveFilter = {}): Promise<DocumentArchiveResponse> {
    const CACHE_KEY = `documents:archive:${JSON.stringify(filter)}`;
    const cached = getCache<DocumentArchiveResponse>(CACHE_KEY);
    if (cached) return cached;

    const {
      search,
      type = 'ALL',
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = filter;

    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const allItems: ArchiveDocumentItem[] = [];

    const dateFilter = (start || end) ? {
      ...(start ? { gte: start } : {}),
      ...(end ? { lte: end } : {}),
    } : undefined;

    const [payments, directBills, receipts] = await Promise.all([
      // 1. Payment Runs (CPV)
      (type === 'ALL' || type === 'CPV') ? prisma.vendorPayment.findMany({
        where: { ...(dateFilter ? { paymentDate: dateFilter } : {}) },
        include: { vendor: true },
        orderBy: { paymentDate: 'desc' },
      }) : Promise.resolve([]),

      // 2. Direct Payment Expense Bills (DPR)
      (type === 'ALL' || type === 'DPR') ? prisma.expenseBill.findMany({
        where: {
          paymentType: 'DIRECT_CASH',
          ...(dateFilter ? { billDate: dateFilter } : {}),
        },
        include: { vendor: true, project: true, lineItems: true },
        orderBy: { billDate: 'desc' },
      }) : Promise.resolve([]),

      // 3. Customer Inflow Receipts (REC)
      (type === 'ALL' || type === 'REC') ? prisma.receipt.findMany({
        where: { ...(dateFilter ? { receiptDate: dateFilter } : {}) },
        include: { customer: true, invoices: true },
        orderBy: { receiptDate: 'desc' },
      }) : Promise.resolve([])
    ]);

    for (const p of payments) {
      allItems.push({
        id: p.id,
        documentType: 'CPV',
        documentNumber: `CPV-${p.id.slice(-8).toUpperCase()}`,
        date: p.paymentDate.toISOString(),
        partyName: p.vendor?.vendorName || 'Valued Supplier',
        partyType: 'VENDOR',
        reference: p.transactionId ? `Trx: ${p.transactionId}` : p.chequeRef ? `Cheque: ${p.chequeRef}` : 'Direct Cash',
        amount: Number(p.amountPaid),
        paymentMethod: p.transactionId ? 'ONLINE' : p.chequeRef ? 'CHEQUE' : 'CASH',
        status: p.transactionId ? 'REALIZED' : p.chequeRef ? 'PENDING_CLEARANCE' : 'POSTED',
        projectName: null,
        printPayload: {
          id: p.id,
          vendorId: p.vendorId,
          vendorName: p.vendor?.vendorName,
          vendor: p.vendor,
          amountPaid: Number(p.amountPaid),
          chequeRef: p.chequeRef,
          transactionId: p.transactionId,
          paymentDate: p.paymentDate.toISOString(),
        },
      });
    }

    for (const b of directBills) {
      allItems.push({
        id: b.id,
        documentType: 'DPR',
        documentNumber: `DPR-${b.id.slice(-8).toUpperCase()}`,
        date: b.billDate.toISOString(),
        partyName: b.vendor?.vendorName || 'Valued Supplier',
        partyType: 'VENDOR',
        reference: `Invoice: ${b.invoiceNumber}`,
        amount: Number(b.grandTotal),
        paymentMethod: 'DIRECT_CASH',
        status: 'POSTED',
        projectName: b.project?.projectName || null,
        printPayload: {
          billId: b.id,
          id: b.id,
          invoiceNumber: b.invoiceNumber,
          billDate: b.billDate.toISOString(),
          vendorName: b.vendor?.vendorName,
          vendor: b.vendor,
          projectName: b.project?.projectName || null,
          project: b.project,
          grandTotal: Number(b.grandTotal),
          lineItems: b.lineItems.map((l) => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: Number(l.unitPrice),
            lineTotal: Number(l.lineTotal),
          })),
        },
      });
    }

    for (const r of receipts) {
      allItems.push({
        id: r.id,
        documentType: 'REC',
        documentNumber: `REC-${r.id.slice(-8).toUpperCase()}`,
        date: r.receiptDate.toISOString(),
        partyName: r.customer?.fullName || 'Walk-in Client',
        partyType: 'CUSTOMER',
        reference: r.bankRefNumber ? `Ref: ${r.bankRefNumber}` : 'Cash Safe Inflow',
        amount: Number(r.amount),
        paymentMethod: r.paymentMethod,
        status: r.clearanceStatus,
        projectName: null,
        printPayload: {
          id: r.id,
          customerName: r.customer?.fullName,
          customerPhone: r.customer?.phone,
          customer: r.customer,
          amount: Number(r.amount),
          totalAmount: Number(r.amount),
          paymentMethod: r.paymentMethod,
          bankRefNumber: r.bankRefNumber,
          receiptDate: r.receiptDate.toISOString(),
          invoices: r.invoices.map((inv) => ({
            description: inv.description,
            amount: Number(inv.amount),
          })),
        },
      });
    }

    let filtered = allItems;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = allItems.filter((item) => {
        return (
          item.documentNumber.toLowerCase().includes(q) ||
          item.partyName.toLowerCase().includes(q) ||
          (item.reference && item.reference.toLowerCase().includes(q)) ||
          (item.projectName && item.projectName.toLowerCase().includes(q)) ||
          item.id.toLowerCase().includes(q)
        );
      });
    }

    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const total = filtered.length;
    const pageNum = Math.max(1, Number(page));
    const size = Math.max(1, Number(pageSize));
    const totalPages = Math.ceil(total / size) || 1;
    const startIndex = (pageNum - 1) * size;
    const pagedDocuments = filtered.slice(startIndex, startIndex + size);

    const result = {
      documents: pagedDocuments,
      total,
      page: pageNum,
      pageSize: size,
      totalPages,
    };

    setCache(CACHE_KEY, result, 60_000);
    return result;
  }
}
