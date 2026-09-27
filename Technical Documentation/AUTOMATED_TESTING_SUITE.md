# Automated Testing Suite & Quality Assurance Specification — Wadaan ERP

> **Version**: 3.6.0  
> **Status**: Verified & Passing (294 Tests across 42 Test Suites)  
> **Coverage Scope**: Express/Prisma Backend (Jest) + Next.js/React Frontend (Vitest)

---

## 1. Executive Summary

Wadaan Real Estate and Builders ERP employs a two-tier automated testing architecture ensuring strict double-entry accounting integrity, ACID transaction resilience, responsive UI state synchronization, and zero regression across multi-client workflows.

| Environment | Framework | Test Suites | Total Tests | Execution Time | Status |
|---|---|---|---|---|---|
| **Backend Core** | Jest + ts-jest (Node.js/Prisma Mocks) | **13** | **93** | ~33s | ✅ 100% Passed |
| **Frontend UI** | Vitest + React Testing Library (JSDOM) | **29** | **201** | ~51s | ✅ 100% Passed |
| **Total Suite** | Full Stack Coverage | **42** | **294** | ~84s | ✅ **ALL PASSING** |

---

## 2. Backend Automated Test Matrix (13 Suites, 93 Tests)

Located in `backend/src/__tests__/`:

| Suite File | Scope / Service Under Test | Tests | Key Edge Cases & Business Rules Verified |
|---|---|---|---|
| `deal.service.test.ts` | `DealService` (Contracts & File Transfer) | **9** | • DS-1: Happy-path transfer to new owner<br>• DS-2: Fee assessment with automated GL journal (DR AR 1100 / CR Revenue 4000)<br>• DS-3: Rejection of `SAME_CUSTOMER_TRANSFER`<br>• DS-4: Rejection of `ERR_PENDING_FUNDS_LOCKED` when cheque is un-cleared<br>• DS-5/6: `DEAL_NOT_FOUND` and `NEW_CUSTOMER_NOT_FOUND` guards<br>• DS-7: Brokerage contract requiring `commissionAmount`<br>• DS-8: `INVOICES_SUM_MISMATCH` mathematical rejection<br>• DS-9: Project attachment restricted to `ACTIVE` projects |
| `receipt.service.test.ts` | `ReceiptService` (Cash, Cheque & Waiting Room) | **8** | • RS-1: Immediate cash settlement (invoices marked `PAID`, GL posted)<br>• RS-2: Cheque logged to Waiting Room (`PENDING_CLEARANCE`, no premature GL)<br>• RS-3: Overpayment excess credited to Customer `walletBalance` and advances (2100)<br>• RS-4: Registered co-clients permitted to pay primary client invoices<br>• RS-5: Third-party payer rejection (`INVOICE_CUSTOMER_MISMATCH`)<br>• RS-6: `INVOICE_ALREADY_PAID` rejection<br>• RS-7: Bank clearance settlement (`CLEARED`, GL posted)<br>• RS-8: Cheque bounce reversal (invoices reset to `UNPAID`, zero ledger contamination) |
| `deal.coclient.test.ts` | `DealService` (Multi-Client & Co-Owners) | **11** | • Co-client addition, update, and removal<br>• Prevention of primary owner as co-client<br>• Duplicate co-client prevention<br>• Multi-client receipt allocation |
| `project.service.test.ts` | `ProjectService` (WIP & Health Metrics) | **8** | • Duplicate prefix prevention (`DUPLICATE_PROJECT_PREFIX`)<br>• Budget burn percentage, variance, and `isOverBudget` calculations<br>• Zero-BOQ safe division handling<br>• General Ledger transaction running balances |
| `project.report.test.ts` | `ProjectService.getProjectReport` | **6** | • Project summary and master BOQ extraction<br>• Expense bills and line items aggregation<br>• General Ledger journal transaction mapping<br>• Client receipts extraction with customer ownership resolution |
| `journal.service.test.ts` | `JournalService` (Double-Entry Engine) | **8** | • Zero-sum mathematical balancing: SUM(DR) === SUM(CR)<br>• System lock protection on reserved accounts (1100, 2000, 1200, 2200, 2100)<br>• Reversal journal entry generation (`[REVERSAL]` prefix)<br>• Sequential voucher numbering (`JV-XXXX`) |
| `bill.service.test.ts` | `BillService` (Vendor Outflow Engine) | **7** | • Duplicate invoice protection (`vendorId + invoiceNumber`)<br>• Automatic WIP (1200) vs Overhead Expense (5000) routing<br>• Over-budget warning computation<br>• Direct cash payment vs Accounts Payable (2000) credit routing |
| `vendor.service.test.ts` | `VendorService` (Khaata & Payments) | **5** | • Vendor creation, lookup, and payment logging<br>• Running balance calculation across bill entries and vendor payments |
| `personal.service.test.ts` | `PersonalService` (Screen 11 Personal Ledger) | **6** | • Personal loan given vs received lifecycle<br>• Partial and settled repayments<br>• Net position calculation across personal contacts |
| `report.service.test.ts` | `ReportService` (Financial Statements) | **7** | • Trial balance balanced verification (Total Debit === Total Credit)<br>• Profit & Loss statement calculation<br>• Project cost ledger & overhead analysis |
| `fifo.service.test.ts` | `FifoService` (AP Automatic Bill Allocation) | **5** | • FIFO invoice settling order for multi-bill payments |
| `document.service.test.ts` | `DocumentService` (File Archive) | **4** | • Document metadata storage, category tagging, and file retrieval |
| `authGuard.test.ts` | `authGuard` Middleware | **9** | • PIN authentication, session expiration, and lockout tier escalation |

---

## 3. Frontend Automated Test Matrix (29 Suites, 201 Tests)

Located in `frontend/src/`:

| Component / Page Tested | Test File Path | Tests | Core Behaviors & Contracts Verified |
|---|---|---|---|
| **Deal File Transfer Modal** | `src/app/(dashboard)/deals/_components/TransferFileModal.test.tsx` | **7** | Excludes current owner from recipient list; enforces positive fee inputs; dispatches mutation; handles server errors; inline quick-add client flow. |
| **Project Card & Live Sync** | `src/components/projects/ProjectCard.test.tsx` | **7** | Master BOQ vs Spent to date; visual progress bar; `clientInfo` contract badge and metrics; dynamic client name refresh post-deal transfer; status updates. |
| **Deal Hub & Portfolio Page** | `src/app/(dashboard)/deals/page.test.tsx` | **15** | Master grid rendering; create deal zero-sum invoice validation; file transfer modal launch; co-client Khaata drawer launch; React Query `['projects']` invalidation contract. |
| **Customer Khaata Drawer** | `src/app/(dashboard)/deals/_components/CustomerKhaataDrawer.test.tsx` | **8** | Full customer transaction history, deal invoices, wallet balance display, and direct receipt printing. |
| **Co-Client Assignment Modal** | `src/features/deals/_components/AddCoClientModal.test.tsx` | **4** | Filter out existing owners; share label annotation; dispatch co-client mutation. |
| **Project Report Export Modal** | `src/components/projects/ProjectReportModal.test.tsx` | **11** | Printable report view, zero blank page assurance on first page, line items table, and client receipts display. |
| **Project Transaction Drawer** | `src/components/projects/ProjectTransactionDrawer.test.tsx` | **5** | General Ledger journal entry drill-down, running balance trail, and vendor attribution. |
| **Projects Overview Page** | `src/app/(dashboard)/projects/page.test.tsx` | **6** | Projects grid, project creation modal, budget utilization cards, and status filter tabs. |
| **Payables Engine (Screen 5 & 7)** | `src/app/(dashboard)/payables/page.test.tsx` | **15** | Record Bill vs Payment Run tab switching, invoice line items calculation, vendor balance checks. |
| **Receipts Gateway (Screen 9)** | `src/app/(dashboard)/receipts/page.test.tsx` | **10** | Cash inflow vs Cheque Waiting Room; cheque bank settlement; cheque bounce action; thermal receipt print. |
| **Trial Balance Statement** | `src/app/(dashboard)/trial-balance/TrialBalance.test.tsx` | **8** | Debit/credit matching; contra-equity presentation; date range presets ("This Month", "Year to Date"). |
| **Journal Entry Form** | `src/app/(dashboard)/journals/JournalEntryForm.test.tsx` | **7** | Zero-sum disabled state; dynamically adding debit/credit rows; system account lock warnings. |
| **Master Reports Hub (Screen 10)** | `src/app/(dashboard)/reports/page.test.tsx` | **7** | Tab navigation across 5 financial reports; metrics refresh; export button triggers. |
| **Personal Finance Ledger** | `src/app/(dashboard)/personal/page.test.tsx` | **6** | Personal loans given/received; repayment logging; outstanding balance tracking. |
| **Accounts Management** | `src/app/(dashboard)/accounts/_components/` (3 suites) | **24** | Account creation, editing, deletion with 3-tier archive protection for accounts with transaction history. |
| **System Security & Vault** | `src/components/auth/AuthVault.test.tsx` | **11** | PIN keypad, tier-escalating lockout timer (30s, 60s, 120s...), master recovery key reset. |
| **System Initializer Modal** | `src/components/system/StarterModal.test.tsx` | **5** | 6-step initialization wizard; master recovery key generation; confirmation safeguard. |
| **Additional Hooks & Utilities** | Various test files (`useAccounting`, `useReports`, `useAuth`, `format`, `api`) | **46** | Interceptors, number formatting (PKR currency), printer formatting, and auth context hooks. |

---

## 4. Running the Automated Test Suites

### Backend Test Execution
To run all 93 backend tests:
```bash
npm test --prefix backend
```

To run a specific test suite:
```bash
npm test --prefix backend -- deal.service.test.ts
npm test --prefix backend -- receipt.service.test.ts
```

### Frontend Test Execution
To run all 201 frontend tests in single-run mode:
```bash
npm test --prefix frontend -- --run
```

To run a specific component test suite:
```bash
npx vitest run TransferFileModal.test.tsx --root frontend
npx vitest run ProjectCard.test.tsx --root frontend
```

### Full CI / Pre-Commit Validation
```bash
# Backend validation
npm test --prefix backend
# Frontend validation
npm test --prefix frontend -- --run
```
Both commands return exit code `0` on success with 100% passing tests.
