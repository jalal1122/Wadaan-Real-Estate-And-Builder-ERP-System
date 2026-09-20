# Screen 5: Expense Bills & WIP Capitalization

**Route**: `/payables` (Tab: "Record Bill")  
**Module**: Module 2 (The Outflow Engine)  
**Implementation**: `src/components/payables/RecordBillPanel.tsx`

---

## 1. Overview & Purpose

In construction and real estate development, expenses fall into two fundamentally different categories:
1. **Capitalized Construction Costs (WIP)**: Cement, steel, labor, and subcontractor bills dedicated to a physical construction site. These represent asset conversion (Cash/AP &rarr; 1200 Work In Progress Asset).
2. **Office Overhead & Operating Expenses**: Utilities, office rent, stationery, and administrative bills that do not belong to a construction site. These represent immediate period expenses (Cash/AP &rarr; 5000 Operating Expenses).

Screen 5 is Wadaan's master entry portal for all outbound obligations. It provides automated ledger routing, budget overrun detection, and line-item auditing in a fast, keyboard-friendly interface.

---

## 2. Layout Structure & Key Workflows

The screen uses a split-panel architecture matching the institutional design system:

### Left Panel: Bill Metadata
- **Vendor / Supplier Dropdown**: Live list from `/api/v1/vendors`. Includes an inline **"+ New Vendor"** button to quickly register a supplier without leaving the bill workflow.
- **Project Allocation Dropdown & WIP Routing Indicator**:
  - Selecting a project tags the bill to that cost center and displays an active emerald badge: `→ WIP Asset (1200)`.
  - Selecting *"None — General Office Overhead"* tags the bill to operations and displays a slate badge: `→ Office Overhead (5000)`.
- **Invoice Number**: Required text input. Validated against duplicates for the selected vendor.
- **Bill Date**: Date picker defaulting to the current date.
- **Settlement Type Toggle**:
  - `ACCOUNTS_PAYABLE` (Default): Records bill as `UNPAID` with full pending balance. Credits GL Account 2000 (Accounts Payable). The invoice enters the FIFO queue on Screen 7.
  - `DIRECT_CASH`: Used when paying immediately from an office safe or bank account. Exposes the conditional **Source Asset Account** dropdown. Bill status is immediately marked `PAID` with `pendingAmount = 0`. Credits the selected cash/bank asset account.

### Right Panel: Dynamic Line Items
- Dynamic table supporting multiple line items:
  - **Description**: Text description of item or milestone.
  - **Quantity**: Integer count (&gt; 0).
  - **Unit Price**: PKR unit cost (&ge; 0).
  - **Line Total**: Auto-calculated on every keystroke (`quantity × unitPrice`).
- **Grand Total Banner**: High-visibility PKR total formatted with JetBrains Mono font.
- Minimum 1 valid line item enforced before submission.

---

## 3. Double-Entry Accounting Matrix

| Scenario | Debit Account | Credit Account | Bill Status | Pending Amount |
|---|---|---|---|---|
| Project Bill via AP | `1200` (Work In Progress Asset) | `2000` (Accounts Payable) | `UNPAID` | `grandTotal` |
| Overhead Bill via AP | `5000` (General Operating Expenses) | `2000` (Accounts Payable) | `UNPAID` | `grandTotal` |
| Project Bill via Cash | `1200` (Work In Progress Asset) | Selected Safe/Bank Account (`100X`) | `PAID` | `0` |
| Overhead Bill via Cash | `5000` (General Operating Expenses) | Selected Safe/Bank Account (`100X`) | `PAID` | `0` |

---

## 4. Business Rules & Guardrails

1. **Anti-Duplicate Invoice Guard**: If an invoice number already exists for the selected vendor, the API returns `409 DUPLICATE_INVOICE`. The UI catches this and displays an inline red error under the invoice number field.
2. **Budget Soft-Lock Rule**: If logging a project bill pushes the project's cumulative spent past its approved Master BOQ:
   - The bill is saved and double-entry posted normally to ensure accounting integrity.
   - An amber warning banner appears alerting the operator: *"Bill saved! Project exceeds approved BOQ by Rs. X."*
   - The project card on Screen 4 turns red with an `Over Budget` alert badge.
3. **Atomic Cache Sync**: On successful bill creation, TanStack Query invalidates `['projects']`, `['vendors']`, `['accounts']`, and `['bills']` so that Screen 4 health bars, Screen 7 outstanding debt balances, and Screen 1 GL balances refresh instantly.
4. **Direct Payment Receipt (DPR) Generation (v3.2.0)**:
   - When a bill is recorded with `DIRECT_CASH`, the system automatically generates an official dual-copy Direct Payment Receipt (`DPR-XXXXXXXX`).
   - If the selected Asset Account is a bank account (`accountName` contains "bank"), a **Bank Transaction / Online Ref** field is dynamically exposed. When provided, this reference (`UTR`, `IBFT`, or Cheque #) is recorded in the General Ledger journal entry description (`[Trx Ref: ...]`) and prominently rendered on the printed expense receipt.
   - **Print-Then-Download Guarantee**: Triggers the print dialog first via a dedicated hidden iframe. When printing concludes or is dismissed (`onafterprint`), an HTML copy (`DPR-XXXXXXXX.html`) is automatically downloaded to the user's computer. In Electron, the native Windows print dialog is invoked directly via `electronAPI.printDirectPaymentReceipt`.