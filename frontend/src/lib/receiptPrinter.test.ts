import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePaymentReceiptHtml,
  generateDirectPaymentReceiptHtml,
  generateInflowReceiptHtml,
  printPaymentReceiptDocument,
  printDirectPaymentReceiptDocument,
  printInflowReceiptDocument,
} from './receiptPrinter';

describe('Unified Receipt Printer Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as any).electronAPI;
  });

  describe('generateDirectPaymentReceiptHtml', () => {
    it('generates professional dual-copy HTML for direct cash/bank payment', () => {
      const html = generateDirectPaymentReceiptHtml({
        billId: 'bill-12345678',
        invoiceNumber: 'INV-999',
        billDate: '2026-09-20T10:00:00.000Z',
        vendorName: 'Ali Hardware & Cement',
        projectName: 'Wadaan Heights Tower',
        sourceAccountName: 'Meezan Bank Operations',
        transactionRef: 'UTR-987654321',
        grandTotal: 150000,
        lineItems: [
          { description: 'Cement Bags Grade 53', quantity: 100, unitPrice: 1500, lineTotal: 150000 },
        ],
      });

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('DPR-12345678');
      expect(html).toContain('Ali Hardware & Cement');
      expect(html).toContain('INV-999');
      expect(html).toContain('Wadaan Heights Tower');
      expect(html).toContain('UTR-987654321');
      expect(html).toContain('150,000');
      expect(html).toContain('Cement Bags Grade 53');
      expect(html).toContain('Cut or Tear Along Perforation');
      expect(html).toContain('Payee / Vendor Copy (Original)');
      expect(html).toContain('Wadaan Accounts Copy');
    });

    it('handles general overhead with cash payment and empty line items gracefully', () => {
      const html = generateDirectPaymentReceiptHtml({
        invoiceNumber: 'OFF-01',
        grandTotal: 5000,
        sourceAccountName: 'Office Cash in Hand',
      });

      expect(html).toContain('DPR-');
      expect(html).toContain('General Office Overhead');
      expect(html).toContain('Direct Payment');
      expect(html).toContain('Office Cash in Hand');
      expect(html).toContain('5,000');
    });
  });

  describe('generateInflowReceiptHtml', () => {
    it('generates dual-copy HTML for customer inflow with milestone allocations', () => {
      const html = generateInflowReceiptHtml({
        id: 'rec-abcdef12',
        customerName: 'Muhammad Rizwan',
        customerPhone: '+92 300 1234567',
        amount: 500000,
        paymentMethod: 'ONLINE',
        bankRefNumber: 'IBFT-554433',
        receiptDate: '2026-09-20',
        invoices: [
          { description: 'Milestone 2 - Foundation Slab', amount: 500000 },
        ],
      });

      expect(html).toContain('REC-ABCDEF12');
      expect(html).toContain('Muhammad Rizwan');
      expect(html).toContain('+92 300 1234567');
      expect(html).toContain('500,000');
      expect(html).toContain('IBFT-554433');
      expect(html).toContain('Milestone 2 - Foundation Slab');
      expect(html).toContain('Customer Copy (Original)');
      expect(html).toContain('Wadaan Office Copy');
    });
  });

  describe('Electron IPC Delegation', () => {
    it('delegates printDirectPaymentReceiptDocument to electronAPI when present', () => {
      const mockPrintDirect = vi.fn();
      (window as any).electronAPI = {
        printDirectPaymentReceipt: mockPrintDirect,
      };

      const payload = {
        billId: 'b-123',
        invoiceNumber: 'INV-1',
        grandTotal: 25000,
      };

      printDirectPaymentReceiptDocument(payload);

      expect(mockPrintDirect).toHaveBeenCalledWith(payload);
    });

    it('delegates printInflowReceiptDocument to electronAPI.printReceipt when present', () => {
      const mockPrintReceipt = vi.fn();
      (window as any).electronAPI = {
        printReceipt: mockPrintReceipt,
      };

      const payload = {
        id: 'r-123',
        customerName: 'Tariq Khan',
        amount: 75000,
      };

      printInflowReceiptDocument(payload);

      expect(mockPrintReceipt).toHaveBeenCalledWith(payload);
    });

    it('delegates printPaymentReceiptDocument to electronAPI.printPaymentReceipt when present', () => {
      const mockPrintCPV = vi.fn();
      (window as any).electronAPI = {
        printPaymentReceipt: mockPrintCPV,
      };

      const payload = {
        id: 'cpv-123',
        amountPaid: 80000,
      };

      printPaymentReceiptDocument(payload);

      expect(mockPrintCPV).toHaveBeenCalledWith(payload);
    });
  });
});
