# Screen 3: Live Trial Balance (The Mathematical Proof) [IMPLEMENTED - v1.5.0]

> **Route**: `/trial-balance` (Desktop / Electron)  
> **Status**: ✅ Implemented (v1.5.0)  
> **Navigation**: General Ledger Tab -> Sub-tab "Trial Balance" (`<GLNavTabs />`)

Think of Screen 3 as the ultimate **"truth teller"** for Wadaan Real Estate. You do zero data entry on this screen. It reads everything recorded across all accounts and journals (bills paid, cash received, projects capitalized, manual adjustments) and translates them into an institutional, mathematically verified double-entry Trial Balance.

If you ever need to show a bank, an investor, an auditor, or a tax consultant proof that Wadaan’s books are sound, this is the screen you open.

---

## 1. What You See (The Interface)

### A. Sub-Tab Navigation (`<GLNavTabs />`)
Seamless sub-tab navigation between:
1. **Chart of Accounts** (`/accounts`)
2. **Journal Entries** (`/journals`)
3. **Trial Balance** (`/trial-balance`) — *Active*

### B. Period & Date Filter Bar
Interactive date range controller with instant recalculation:
- **Preset Buttons**:
  - **All Time**: Queries cumulative data from inception (`2000-01-01`) through today.
  - **This Month**: Bounded to the 1st through the final day of the current calendar month.
  - **This Year (FY)**: Aligned with the Pakistani statutory fiscal year (July 1st through June 30th).
  - **Custom Range**: Exposes dual date pickers (`startDate` to `endDate`) for arbitrary reporting windows.
- **Active Period Display**: Formatted human-readable date label in Pakistani locale (e.g., *"01 Jul 2026 — 30 Jun 2027"*).

### C. Client-Side Search Filter
- Search bar allowing instant filtering by Account Code (e.g., `1001`) or Account Name (e.g., `Meezan Bank`).
- Counter badge displaying the total number of non-zero active accounts matching the filter.

### D. The Double-Entry Trial Balance Table
Structured table with the following columns:
1. **Code**: Monospace account code identifier (e.g., `1001`, `2100`, `3001`, `4010`).
2. **Account Name**: Official title of the account bucket.
3. **Type Badge**: Color-coded category pill:
   - `ASSET`: Blue badge
   - `LIABILITY`: Rose badge
   - `EQUITY`: Indigo badge
   - `REVENUE`: Emerald badge
   - `EXPENSE`: Orange badge
4. **Debit (PKR)**: Net debit balance (normal balance side for Assets and Expenses). Rendered in bold monospace. Formatted as `—` if zero.
5. **Credit (PKR)**: Net credit balance (normal balance side for Liabilities, Equity, and Revenue). Rendered in bold monospace. Formatted as `—` if zero.

### E. Grand Total Footer, Balance Indicator & Isolated Print Layout
- **Grand Total Debit & Credit**: Sum of all debit and credit columns rendered in bold monospace.
- **Mathematical Proof Pill**:
  - 🟢 **Balances Match — Books are perfectly balanced**: Displayed when `grandTotalDebit === grandTotalCredit`.
  - 🔴 **Out of Balance — Difference: PKR X**: Displayed in the rare event of a system imbalance with the exact disparity.
- **Isolated Print / PDF Export (`window.print()`)**:
  - **Clean Report Isolation**: Clicking **"Print Report"** triggers `@media print` rules that suppress all application chrome — the sidebar navigation, top navigation bar, GL sub-tabs, date filter bar, and search input are completely hidden (`.no-print`).
  - **Institutional Print Letterhead**: A formal header is dynamically rendered at the top of the printed document containing:
    - Company Legal Name: **Wadaan Real Estate & Builders (Pvt) Ltd.**
    - Document Title: **Trial Balance Report**
    - Selected Fiscal/Reporting Period (e.g. `01 Jul 2026 — 30 Jun 2027` or `All Time`)
    - Generation Date & Timestamp
  - **Report Table & Verification**: The printable area `#trial-balance-printable` expands to full page width with crisp high-contrast border and typography, followed by the grand totals and the mathematical balance indicator.


---

## 2. Dual Accounting Date Logic (Permanent vs. Annual)

To guarantee accounting accuracy, the backend endpoint (`GET /api/v1/reports/trial-balance`) implements dual aggregation logic:

| Category Type | Accounts Included | Date Filtering Rule | Rationale |
|---|---|---|---|
| **Permanent Accounts** | `ASSET`, `LIABILITY`, `EQUITY` | `entryDate <= periodEnd` (NO start date restriction) | Balance sheet accounts are continuous and cumulative across all time. Bank balances and equity do not reset to zero at the start of a month or fiscal year. |
| **Annual Accounts** | `REVENUE`, `EXPENSE` | `startDate <= entryDate <= periodEnd` | Income statement accounts measure performance strictly within the defined operational period. |

---

## 3. Business Rules & Safety Guardrails

1. **Strict Read-Only Enforcement**: You cannot edit, create, or delete numbers on this screen. If a balance requires adjustment, it must be adjusted at the source (via a Journal Voucher on Screen 2, or an Expense Bill / Receipt).
2. **Zero-Balance Filtering**: Accounts with Rs. 0.00 net balance are automatically filtered out of the report to eliminate noise and keep reports concise for management review.
3. **Double-Entry Mathematical Guarantee**: Every transaction in Wadaan is posted as an atomic balanced journal entry; thus, the Grand Total Debit must always equal the Grand Total Credit.
