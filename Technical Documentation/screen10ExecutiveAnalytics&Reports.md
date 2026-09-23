# Screen 10: Master Reports Hub (Executive Financial Intelligence)

The final, capstone piece of the Wadaan ERP translates every bill, receipt, project, and journal into institutional executive intelligence. Standard accounting software fails real estate developers and construction firms because it lumps all expenses together, making it impossible to see if a specific plaza or plot flip was actually profitable. 

Screen 10 operates as a comprehensive **Master Reports Hub** with five forensic sub-tabs, a global date range selector, and print/PDF export capabilities.

---

## 1. Global Header & Controls
- **Global Date Range Selector**: Includes quick presets (`This Month`, `Last Month`, `This Fiscal Year`, `All Time`, `Custom Range`) alongside dual HTML5 date inputs (`startDate`, `endDate`). Date filters propagate across all analytical ledgers.
- **Export to PDF / Print Engine**: Prominent button invoking browser print preview (`window.print()`). Uses `@media print` styling to isolate the currently active sub-tab, hide navigation bars/buttons, and render high-resolution executive print headers with dates and timestamps.
- **Refresh All**: Synchronously re-triggers all active queries across all report domains.

---

## 2. Sub-Tab Architecture

### Sub-Tab 1: Executive Snapshot
Provides the immediate financial pulse of the company:
1. **Total Liquid Cash**: Real-time sum of liquid bank accounts (Meezan Bank, HBL) and physical cash safes (debits minus credits on GL accounts `10xx`).
2. **Client Funds Held (Escrow / Advances)**: Liability balance representing mobilization advances and client escrow holdings (Account `2100` & customer wallets) that must not be spent on general overhead.
3. **Total Receivables (AR)**: Cumulative unpaid balance owed by clients across active contracts and deals.
4. **Total Payables (AP)**: Pending vendor obligations awaiting payment runs.
5. **Corporate Profitability & True Net Income**: Gross deal profit + brokerage commission fees minus general office overhead.
6. **The Aging Radar**: Priority lists of overdue receivables (Money In) and pending vendor payables (Money Out) sorted by days overdue.

### Sub-Tab 2: Deal-by-Deal Margin Matrix
Automatic per-deal mini-P&L statements:
- **Matrix Columns**: Deal #, Deal Type (Wadaan Sale, Construction, Brokerage), Customer Name, Project, Total Contract Value, Revenue Collected, Total Project Cost, Gross Profit, and Margin Percentage.
- **WIP Asset Protection**: Unsettled construction deals flag costs as Work-in-Progress asset transfers.
- **Drill-Down Side Drawer**: Clicking any deal row opens a slide-over panel detailing itemized bills, payment milestone receipts, and cost allocations.

### Sub-Tab 3: Line-by-Line Project Costs (Construction Ledger)
Forensic audit ledger for any construction project:
- **Project Selector**: Global dropdown dynamically populated with active projects.
- **Itemized Columns**: Date, Vendor / Payee, Invoice #, Description, Quantity, Unit Price, and Line Total Amount (PKR).
- **Summary Footer**: Total Project Cost displayed in bold JetBrains Mono typography.

### Sub-Tab 4: Office & Administrative Overhead Ledger
Tracks non-project operational expenses:
- **Query Filter**: Strictly queries `ExpenseBill WHERE projectId IS NULL`.
- **Itemized Columns**: Date, Vendor / Payee, Invoice #, Payment Status (Paid, Partial, Unpaid), and Grand Total (PKR).
- **Summary Footer**: Total Overhead Expenses displayed in bold JetBrains Mono typography.

### Sub-Tab 5: Partner Drawings & Distributions (Equity Ledger)
Forensic tracking of personal withdrawals and equity draws debited against principal capital accounts:
- **Partner 1 (Arshad Khalil)**: Itemizes withdrawals debited against Account `3010` (or `3010-01 Owner Drawings & Distributions`), showing JV Reference, Description/Memo, Account Code, and Amount.
- **Partner 2 (Zeeshan Yousafzai)**: Itemizes withdrawals debited against Account `3020`, showing JV Reference, Description/Memo, Account Code, and Amount.
- **Subtotals & Grand Total**: Displays individual partner subtotal drawings alongside a unified Grand Total partner drawing summary card.
- **Null Safety**: Gracefully handles newly provisioned or empty partner accounts with clean zero-balance empty states.

---

## 3. Business Rules & Guardrails
- **The Read-Only Absolute**: Like Screen 3 (Trial Balance), it is physically impossible to edit, post, or manipulate numbers directly on this dashboard. All figures are derived directly from immutable General Ledger journals and verified expense bills.
- **No Escrow Mixing**: Client escrow is kept distinct and clearly highlighted as a restricted liability, preventing unauthorized executive capital draws.