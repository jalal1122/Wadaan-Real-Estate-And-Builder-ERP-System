# Screen: Document Archive & Receipts

**Route**: `/documents`  
**Module**: Unified Cross-Module Document Engine (Modules 2 & 3)  
**Implementation**: `frontend/src/app/(dashboard)/documents/page.tsx`  
**Backend API**: `GET /api/v1/documents/archive` (`DocumentService.getDocumentArchive`)

---

## 1. Overview & Purpose

In construction ERP operations, accountants and site supervisors frequently need to re-verify, audit, or reprint payment vouchers and official customer receipts after the original transaction has been posted. Previously, documents had to be retrieved from disparate screens (Screen 5, Screen 7, or Screen 9).

The **Document Archive & Receipts** screen provides a single, high-speed institutional repository where every financial receipt and payment voucher can be:
1. **Searched Instantly**: Full-text matching across voucher/receipt numbers (`CPV-`, `DPR-`, `REC-`), vendor names, client names, invoice numbers, bank cheque leaves, and UTR transaction numbers.
2. **Filtered by Type**: Quick tab switching between All Documents, Payment Vouchers (CPV), Direct Expense Receipts (DPR), and Inflow Receipts (REC).
3. **Filtered by Date Range**: Precise date bounds to facilitate daily cash balancing, monthly tax filing, or institutional audits.
4. **Re-Printed & Downloaded**: One-click re-generation of official dual-copy perforated A4 vouchers with identical visual formatting across Development (browser) and Production (Electron desktop).

---

## 2. Supported Document Types

| Document Code | Document Title | Origin Screen | Underlying Model | Description |
|---|---|---|---|---|
| `CPV-XXXXXXXX` | Cash / Cheque Payment Voucher | Screen 7 (Vendor Payment Run) | `VendorPayment` | Issued when clearing outstanding supplier invoices from Accounts Payable (2000). |
| `DPR-XXXXXXXX` | Direct Payment Expense Receipt | Screen 5 (Record Expense Bill) | `ExpenseBill` (`DIRECT_CASH`) | Issued when paying an operational or project expense immediately out-of-pocket via safe cash or bank transfer. |
| `REC-XXXXXXXX` | Official Customer Inflow Receipt | Screen 9 (Cash & Cheque Gateway) | `Receipt` | Issued when receiving customer installments, milestone payments, or advance escrow mobilization funds. |

---

## 3. Backend Aggregation Architecture

The backend endpoint `GET /api/v1/documents/archive` runs an optimized query merging the three transaction types:

```typescript
// Query Parameters
interface DocumentArchiveFilter {
  search?: string;     // Text match on doc number, party name, project name, or reference
  type?: 'ALL' | 'CPV' | 'DPR' | 'REC';
  startDate?: string;  // ISO date string
  endDate?: string;    // ISO date string
  page?: number;       // Default: 1
  pageSize?: number;   // Default: 20
}
```

### Self-Contained Print Payloads
Each item returned by the archive API includes a fully populated `printPayload` object containing all required fields (party details, amounts, line items/invoices settled, references, and dates). This ensures that clicking **"Print"** on any document in the table triggers the print dialog and PDF download immediately with **zero secondary API roundtrips**.

---

## 4. Universal Print-Then-Download Order

In alignment with institutional audit procedures, printing behaves identically in both environments:
1. **Web Browser (Dev / Staging)**:
   - Renders the dual-copy A4 document inside an invisible, dedicated print iframe.
   - Triggers the browser's native print preview dialog first.
   - When the user finishes or cancels printing (`onafterprint`), an HTML file (`DOC-XXXXXXXX.html`) is automatically downloaded into their local Downloads folder as an archival backup.
2. **Electron Desktop (Production)**:
   - Emits IPC to `electronAPI.printPaymentReceipt`, `printDirectPaymentReceipt`, or `printReceipt`.
   - Opens the native Windows OS print dialogue configured for standard A4 portrait output with zero-margin header suppression.
