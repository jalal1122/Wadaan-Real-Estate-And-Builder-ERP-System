# Wadaan ERP System Test Data, Master Credentials & Testing Guide

This guide covers end-to-end verification and testing workflows for Modules 0 through 4 (Screens 0 through 11).

---

## 🔑 1. Master System Credentials & Environment

| Parameter | Value | Notes |
| :--- | :--- | :--- |
| **Frontend URL** | `http://localhost:3000` | Currently live via `npm run dev` |
| **Backend API** | `http://localhost:4000/api/v1` | Health check: `http://localhost:4000/api/v1/system/status` |
| **Admin Email** | `admin@wadaan.com.pk` | System Administrator account |
| **Admin PIN** | **`5555`** | 4-digit PIN for Auth Vault (Screen 0) |
| **System Status** | **Initialized (Live)** | Go-Live Cut-off Date: `2026-09-07` |

---

## 🏦 2. Active Chart of Accounts (Ready to Use)

| Code | Account Name | Category | GL Usage |
| :--- | :--- | :--- | :--- |
| **`1000`** | Cash and Liquid Assets | **ASSET** | Parent liquid holding (System Locked) |
| **`1010-01`** | Office Safe (Vault A) | **ASSET** | Cash in Safe (Physical office drawer) |
| **`1030-01`** | Habib Bank Ltd (HBL) Operations | **ASSET** | Primary depository bank account |
| **`1100`** | Accounts Receivable (AR) | **ASSET** | Client contract installment receivables |
| **`1200`** | Construction Work-in-Progress (WIP) | **ASSET** | Project direct materials/labor capitalization |
| **`2000`** | Accounts Payable (AP) | **LIABILITY** | Unpaid vendor & subcontractor bills |
| **`2100`** | Customer Advances (Mobilization) | **LIABILITY** | Client wallet held in escrow |
| **`2200`** | Escrow Holdings | **LIABILITY** | Third-party seller funds in brokerage deals |
| **`3000`** | Owner's Opening Equity | **EQUITY** | Go-Live capital baseline |
| **`3010-01`** | Owner Drawings & Distributions | **EQUITY** | Executive equity cash withdrawals |
| **`4000`** | Sales & Project Revenue | **REVENUE** | Core real estate and construction revenue |
| **`4010-01`** | Brokerage & File Commission Income | **REVENUE** | Net commission fee cut |
| **`5000`** | Cost of Goods Sold (COGS) | **EXPENSE** | Direct construction costs recognized |
| **`5100-01`** | Head Office Rent & Facility Utilities | **EXPENSE** | General office overhead |

---

## 🏗️ 3. Seeded Projects, Vendors & Clients

### Active Projects (Screen 4)
1. **Wadaan Heights** (`WH`) — Master BOQ: **PKR 60,000,000** | Status: `ACTIVE`
2. **OPF Villa** (`OPFV`) — Master BOQ: **PKR 260,000,000** | Status: `ACTIVE`

### Registered Vendors (Screen 5 & 7)
1. **Ali Hardware** — Phone: `0300-1234567` (Building Materials & Cement)
2. **Petrol Pump** — Phone: `0311-5559988` (Site & Generator Fuel)

### Registered Clients (Screen 8 & 9)
1. **Tariq Mehmood** — Phone: `0312-9876543` | Current Wallet: **PKR 0**

---

## 🧪 4. Step-by-Step Test Scenarios & Payloads

---

### Test Scenario A: Authentication & Session (Screen 0)
1. Navigate to `http://localhost:3000/login`.
2. **Negative Test**: Type `1111`.
   - *Expected*: Error banner "Invalid PIN"; attempt indicator increments.
3. **Positive Test**: Type **`5555`**.
   - *Expected*: The 4th digit auto-submits, session JWT cookie is set, and you are redirected to `/dashboard`.

---

### Test Scenario B: Manual Journal Entry (Screen 2 — `/journals`)
Post an office expense directly to the General Ledger:
- **Date**: Today
- **Description**: `Monthly office electricity and generator fuel`
- **Line 1**:
  - Account: `5100-01 Head Office Rent & Facility Utilities` (EXPENSE)
  - Debit: `25,000` | Credit: `0`
- **Line 2**:
  - Account: `1010-01 Office Safe (Vault A)` (ASSET)
  - Debit: `0` | Credit: `25,000`
- *Guardrail to verify*: While Debit (`25,000`) ≠ Credit (`0`), the "Post Journal Entry" button is strictly disabled and shows `Diff: PKR 25,000`. Once Line 2 credit is entered, button turns solid `#0F172A` and enables.

---

### Test Scenario C: Outflow Engine — WIP vs. Overhead Bills (Screen 5 — `/payables`)
Navigate to `/payables` (Tab 1: **Record Bill**).

#### Bill 1 (Capitalized Project WIP):
- **Vendor**: `Ali Hardware`
- **Project**: Select `Wadaan Heights (WH)` *(Turns banner Blue: Capitalizes to 1200 WIP)*
- **Invoice Ref**: `INV-STEEL-101`
- **Line Item**:
  - Description: `Deformed Steel Bars Grade 60`
  - Qty: `20`
  - Unit Price: `150,000`
  - *Line Total*: `PKR 3,000,000`
- Click **"Post Bill"**.
- *Verification*: Total AP (`2000`) increases by `3,000,000`, Project WIP (`1200`) increases by `3,000,000`.

#### Bill 2 (General Office Overhead):
- **Vendor**: `Petrol Pump`
- **Project**: *Leave Unselected / "General Office Expense"* *(Turns banner Slate: Charges to 5000 COGS / Overhead)*
- **Invoice Ref**: `PETROL-4421`
- **Line Item**:
  - Description: `Generator High-Speed Diesel`
  - Qty: `150`
  - Unit Price: `280`
  - *Line Total*: `PKR 42,000`
- Click **"Post Bill"**.

---

### Test Scenario D: FIFO Vendor Payment Run & CPV Print (Screen 7 — `/payables`)
Navigate to `/payables` (Tab 2: **Payment Run**).
1. **Select Vendor**: `Ali Hardware`.
   - *Expected*: Unpaid bills queue loads showing `INV-STEEL-101` with pending `PKR 3,000,000`.
2. **Guardrail 1 (No-Overpay Lock)**: Type `3,500,000` into Amount Paid.
   - *Expected*: Red warning "Payment exceeds outstanding debt"; Submit button disables.
3. **Payment Execution**:
   - Amount: `1,500,000` *(Partial FIFO payment)*
   - Source Account: `1030-01 Habib Bank Ltd (HBL) Operations`
   - Mode: Toggle to **Cheque**
   - Cheque Ref: `CHQ-HBL-991122` *(Mandatory)*
   - Click **"Post Payment Run"**.
4. *Expected Result*:
   - Vendor outstanding debt drops to `1,500,000`.
   - Cash Payment Voucher (CPV) print preview dialog triggers (or fallback print).

---

### Test Scenario E: Deal Hub — 3 Route Contracts (Screen 8 — `/deals`)
Navigate to `/deals` and click **"+ New Deal"**.

#### Contract 1: Wadaan Plot Sale (Direct Inventory)
- **Step 1 (Client)**: Select `Tariq Mehmood`
- **Step 2 (Route)**: Select `Wadaan Sale`
  - Total Contract Value: `PKR 6,000,000`
- **Step 3 (Schedule)**: Click helper **"Single Lump Sum"**
  - Or add two installments:
    - Down Payment: `PKR 3,000,000` (Due today)
    - Balance Installment: `PKR 3,000,000` (Due in 30 days)
  - Verify banner: `✓ PERFECT MATCH`.
- Click **"+ Initialize Deal Contract"**.

#### Contract 2: Construction Contract (Linked to WIP)
- **Step 1 (Client)**: Click **"+ Register New Client"**:
  - Full Name: `Chaudhry Aslam`
  - Phone: `0300-5554433`
  - Click "Save & Select Client".
- **Step 2 (Route)**: Select `Construction`
  - Linked Project: `Wadaan Heights` *(Links revenue to WIP margin)*
  - Total Value: `PKR 16,000,000`
- **Step 3 (Schedule)**: Click **"4 Quarters"**
  - Automatically generates 4 milestones of `PKR 4,000,000` each.
- Click **"+ Initialize Deal Contract"**.

#### Contract 3: Brokerage Transaction (Escrow Split)
- **Step 1 (Client)**: Select `Tariq Mehmood`
- **Step 2 (Route)**: Select `Brokerage`
  - Total Deal Value: `PKR 10,000,000`
  - Wadaan Commission: `PKR 200,000` (2%)
  - *Observe Live Split Preview*:
    - `Earned Revenue (4000) = PKR 200,000`
    - `Seller Escrow Liability (2200) = PKR 9,800,000`
- **Step 3 (Schedule)**: Lump sum `PKR 10,000,000`.
- Click **"+ Initialize Deal Contract"**.

#### Contract 4: File Ownership Transfer
- In the Deal Hub table, find Contract 1 (`Tariq Mehmood`).
- Click the **"Transfer"** action button.
- Select New Assignee: `Chaudhry Aslam`.
- Transfer Fee Assessed: `PKR 50,000`.
- Click **"Execute File Transfer"**.
- *Verification*: Contract shifts to Chaudhry Aslam; `PKR 50,000` fee is recognized in Revenue (`4000`).

---

### Test Scenario F: Cash & Cheque Gateway (Screen 9 — `/receipts`)
Navigate to `/receipts`.

#### Case 1: Direct Cash Inflow against Milestone
- **Customer**: `Chaudhry Aslam`
- **Target Invoices**: Check the first milestone (`PKR 4,000,000`)
- **Amount**: `PKR 4,000,000`
- **Method**: `CASH`
- Click **"Record Inflow Receipt"**.
- *Expected*: Receipt posts, clears immediately into General Ledger; **"Print A4 Receipt"** button appears. Click it to view the dual-copy layout (Customer Original + Wadaan Accounts Copy).

#### Case 2: Cheque routed to Escrow Waiting Room
- **Customer**: `Chaudhry Aslam`
- **Target Invoices**: Check 2nd milestone (`PKR 4,000,000`)
- **Method**: `CHEQUE`
- **Cheque / Leaf Number**: `CHQ-MEEZAN-880011`
- **Amount**: `PKR 4,000,000`
- Click **"Record Inflow Receipt"**.
- *Expected*: Observe the cheque is placed in the **Cheque Waiting Room** table on the right side with an Amber **`PENDING`** badge. The milestone invoice is marked `In Escrow`.

#### Case 3: Advance Mobilization Wallet Inflow
- **Customer**: `Tariq Mehmood`
- **Target Invoices**: *Do not check any invoices (leave empty)*
- **Method**: `ONLINE`
- **UTR / Bank Ref**: `UTR-HBL-5544`
- **Amount**: `PKR 1,500,000`
- Click **"Record Inflow Receipt"**.
- *Expected*: Notice appears: *"Deposited PKR 1,500,000 into Mobilization Advance Wallet"*.
- Open Screen 8 (`/deals`), find `Tariq Mehmood`, click **"Khaata"**:
  - The drawer displays **Mobilization Advance Wallet: PKR 1,500,000**.
  - In the "Apply Advance to Unpaid Installment" box, pick an invoice, enter `500,000`, and click **"Apply"**.
  - Wallet balance decrements to `PKR 1,000,000` and the installment updates.

#### Case 4: Clearing an Escrow Cheque into Bank GL
- In the Screen 9 Waiting Room, find `CHQ-MEEZAN-880011` (`PKR 4,000,000`).
- Click **"Clear"**.
- The **Clearance Modal** opens:
  - Depository Bank: Select `1030-01 - Habib Bank Ltd (HBL) Operations`.
  - Click **"Confirm & Clear Cheque"**.
- *Expected*: Cheque disappears from Waiting Room; funds are officially realized: `DR 1030-01 HBL / CR 1020 Escrow Waiting Room`.

#### Case 5: Bouncing a Cheque
- Record another receipt: Client `Tariq Mehmood`, Method `CHEQUE`, Ref `CHQ-BOUNCE-99`, Amount `500,000`.
- In the Waiting Room table, click **"Bounce"**.
- A red safeguard dialog asks: *"Mark Cheque as Bounced? Revert invoices to unpaid status"*.
- Click **"Confirm Bounce"**.
- *Expected*: Instrument is removed from Waiting Room, and any attached installment reverts back to `UNPAID`.

---

### Test Scenario G: Sliding Session Window & Active Work Verification
- **Feature**: Automatic 15-minute JWT sliding session window.
- **Workflow**:
  1. Log in with PIN `5555`.
  2. Inspect browser Application cookies: `token` cookie has a 15-minute expiration timestamp (`maxAge = 900,000ms`).
  3. Perform regular tasks (e.g. browsing accounts, filtering deals, posting a journal entry).
  4. With each authenticated API request, observe the `Set-Cookie` header in the response refreshing the cookie with a fresh 15-minute window.
  5. The session remains active indefinitely as long as requests are dispatched within 15 minutes of each other.
  6. Leaving the browser untouched and idle for 15+ minutes expires the token, and the next API action redirects to `/login`.

---

### Test Scenario H: Customer Khaata Advance Wallet Zero-Balance State & Skeleton Loading
Navigate to Screen 8 (`/deals`).
1. Find any customer with a zero advance balance (e.g., a newly registered customer or client without unallocated receipts).
2. Click **"Khaata"** to open `CustomerKhaataDrawer`.
3. **Verify Loading State**: Observe the animated pulsing skeleton loader displayed while fetching the portfolio (instead of plain text).
4. **Verify Wallet Summary Card**:
   - The **Mobilization Advance Wallet** card is prominently rendered in institutional dark gradient.
   - Balance displays `PKR 0`.
   - Explanatory notice displays: *"No advance balance. Mobilization receipts and overpayments will appear here."*
   - The "Apply Advance" form remains hidden cleanly.
5. If the customer has an advance balance (`walletBalance > 0`), the apply advance milestone selector is visible and allows allocating funds.

---

### Test Scenario I: Construction Project GL Transaction Drill-Down
Navigate to Screen 4 (`/projects`).
1. Observe the project cards for **Wadaan Heights** (`WH`) and other sites.
2. At the bottom of each project card, observe the action: **"View GL Entries →"**.
3. Click **"View GL Entries →"** on **Wadaan Heights**:
   - The slide-over drawer **`ProjectTransactionDrawer`** slides in smoothly from the right.
   - **Cost Summary Strip**: Displays Total Debits (costs added to project), Total Credits (offsets/adjustments), and Net Project WIP Balance.
   - **GL Journal Entries Table**: Shows all journal lines linked to `WH` with:
     - Date
     - JV Number (e.g. `JV-0001`)
     - Account Code & Name (e.g. `1200 Work In Progress`)
     - Description / Memo
     - Associated Party (e.g. Vendor Name or Subcontractor)
     - Debit Amount & Credit Amount
     - Running Balance calculated dynamically row-by-row.
4. Click the close button (`X`) or click outside to dismiss the drawer.

---

### Test Scenario J: Personal Finance Ledger Module (Screen 11 — `/personal`)
Navigate to `/personal` via the sidebar navigation link **"Personal Ledger"**.

#### Case 1: Overview & KPI Strip
- Observe the 4 KPI cards:
  - **Total Lent (Given)**: Total outstanding money friends/partners owe us.
  - **Total Borrowed (Received)**: Total outstanding money we owe to lenders.
  - **Net Balance Position**: Color-coded net position (+ emerald if net receivable, red if net payable).
  - **Ledger Accounts**: Total count of registered contacts and active loans.

#### Case 2: Register a Personal Contact
1. Click **"+ Register Contact"**.
2. Fill in:
   - Full Name: `Arshad Sir`
   - Phone: `0300-1122334`
   - Relationship: `Partner / Director`
   - Private Notes: `Company Co-Founder Personal Ledger`
3. Click **"Register Contact"**.
4. *Verification*: Contact card appears in the grid with `0 active` loans and `Settled` net balance.

#### Case 3: Record a Loan Given (We Lent Money)
1. On the `Arshad Sir` card, click **"Open Ledger"** to navigate to `/personal/[id]`.
2. Click **"+ Record New Loan"**.
3. Fill in:
   - Direction: Select **GIVEN (We Lent)**
   - Principal Amount: `PKR 500,000`
   - Transaction Date: Today's date
   - Purpose / Description: `Emergency personal bridge advance`
4. Click **"Record Loan"**.
5. *Verification*:
   - Loan is added with an Amber **`GIVEN`** badge, Red **`OUTSTANDING`** status, Principal `PKR 500,000`, and Remaining `PKR 500,000`.
   - Contact Net Position updates to `+PKR 500,000 (Owes Us)`.
   - Note: Absolutely zero General Ledger journal entries are posted (completely off-balance-sheet).

#### Case 4: Record a Partial Repayment
1. On the loan entry, click **"+ Repayment"**.
2. The Repayment Modal opens:
   - Remaining balance is displayed (`PKR 500,000`).
   - Enter Repayment Amount: `PKR 200,000`
   - Repayment Date: Today
   - Notes: `Cash repayment returned at office`
3. Click **"Apply Repayment"**.
4. *Verification*:
   - Loan status updates to Amber **`PARTIAL`**.
   - Remaining balance decrements to `PKR 300,000`.
   - Expand the loan row: Repayment history displays `PKR 200,000` with the date and note.
   - Contact Net Position updates to `+PKR 300,000 (Owes Us)`.

#### Case 5: Record Full Settlement
1. Click **"+ Repayment"** on the same loan.
2. Click **"Pay Full Remaining"** (auto-fills `PKR 300,000`).
3. Enter Notes: `Bank transfer to personal account`.
4. Click **"Apply Repayment"**.
5. *Verification*:
   - Loan status updates to Emerald **`SETTLED`**.
   - Remaining balance is `PKR 0`.
   - "+ Repayment" button disappears for the settled loan.
   - Contact Net Position displays `Settled`.

---

### Test Scenario K: Milestone Partial Payment & Accurate Outstanding Balance
Navigate to Screen 8 (`/deals`).
1. Find customer **`Chaudhry Aslam`** and click **"Khaata"**.
2. Observe the active contract (e.g. `Total Contract Value: Rs 8,000,000`).
3. In the Installment Milestones list, look at **`Installment Milestone 3`**:
   - Total milestone amount is `Rs 4,000,000`.
   - Notice the status badge is **`PARTIAL`**.
   - The prominent amount displays **`Rs 3,960,000`** (remaining balance).
   - Underneath, the breakdown displays: `Due: 20 Nov 2026 • Paid: Rs 40,000 • Remaining: Rs 3,960,000 • Total: Rs 4,000,000`.
4. Observe the Deal Financial Summary at the top of the card:
   - **Outstanding Balance** accurately displays **`Rs 7,960,000`** (reflecting the remaining unpaid balance of `Rs 3,960,000` + unpaid Milestone 4 of `Rs 4,000,000`).
5. Open the "Apply Advance to Unpaid Installment" dropdown:
   - Installment Milestone 3 option displays remaining balance (`Rs 3,960,000 remaining`) so advance funds cannot be over-allocated.

---

### Test Scenario L: Client Construction Project Cost & Realized Cash Margin Cross-Linking
Verify the bidirectional tracking between private client construction contracts and WIP site costs:

#### Part 1: Screen 4 (`/projects`)
1. Navigate to `/projects`.
2. Find the project site linked to a construction client deal (e.g. **Wadaan Heights** or any client construction project).
3. **Verify Client Contract Banner**:
   - Client badge: `Client Contract`.
   - Client name and phone number (e.g. `Client: Tariq Mehmood (0300-1234567)`).
   - Three key financial metrics:
     - **Contract Value**: Total agreed construction contract price.
     - **Client Paid**: Total funds collected from the client to date.
     - **Net Cash Margin**: Calculated in real-time as `Client Paid - Total Spent (WIP)`. Displayed in bold emerald green when positive, or red if expenditures temporarily outpace client collections.

#### Part 2: Screen 8 (`/deals`)
1. Navigate to `/deals`.
2. Find the client (e.g. `Tariq Mehmood` or `Chaudhry Aslam`) and click **"Khaata"**.
3. Under the construction contract card, verify the **Construction Site** panel:
   - Site title: `Site: Wadaan Heights (WH)`.
   - Metrics:
     - **Client Paid**: Received client collections to date.
     - **Site Spent (WIP)**: Total contractor and material bills charged to the site.
     - **Net Cash Margin**: Realized cash margin on the project job to date.

---

### Test Scenario M: Master Reports Hub (Screen 10 — `/reports`)
Navigate to `/reports` via the sidebar navigation link **"Executive Reports"**.

#### Step 1: Verify Global Header, Date Range Filter & PDF Export
- Observe the top action controls:
  - **Date Preset Selector**: Switch between `This Month`, `Last Month`, `This Fiscal Year`, `All Time`, and `Custom Range`.
  - **Date Inputs**: Changing start or end date propagates queries across all 5 sub-tabs.
  - **Refresh Button**: Refreshes all active report queries synchronously.
  - **Export to PDF / Print**: Click **"Export to PDF / Print"** to trigger print preview with isolated active tab view and confidential executive headers.

#### Step 2: Sub-Tab 1 — Executive Snapshot
- **KPI Strip**:
  - `Total Liquid Cash`: Real-time sum of Meezan Bank, HBL, and Office Safe.
  - `Client Funds Held`: Client mobilization advances and escrow balances.
  - `Total Receivables`: Client installment dues.
  - `Total Payables`: Pending vendor obligations.
- **Corporate True Net Income**:
  - Waterfall: Gross Deal Profit + Brokerage Commissions - General Office Overhead = Net Income.
- **Aging Radar**:
  - Receivables Aging (Money In) and Payables Aging (Money Out) sorted by overdue days.

#### Step 3: Sub-Tab 2 — Deal Margins Matrix
- Click sub-tab **"Deal Margins"**.
- Observe deal matrix columns: Deal #, Type, Customer, Project, Total Value, Collected Revenue, Project Cost, Gross Profit, and Margin %.
- Click on any deal row (e.g. `Chaudhry Aslam`):
  - Slide-over drawer **`DealMarginDetailDrawer`** opens showing the full itemized financial breakdown.
  - Click **"Close Drill-Down"** or `Escape` to close.

#### Step 4: Sub-Tab 3 — Line-by-Line Project Costs (Construction Ledger)
- Click sub-tab **"Project Cost Ledger"**.
- Use the **Select Project** dropdown to pick a site (e.g. `Wadaan Heights`).
- Observe line items: Date, Vendor / Payee, Invoice #, Material Description, Quantity, Unit Price, and Line Total Amount.
- Verify the bottom summary footer: **Total Project Cost** calculated in bold JetBrains Mono typography.

#### Step 5: Sub-Tab 4 — Office Overhead Ledger
- Click sub-tab **"Office Overhead"**.
- Observe list of general administrative expenses without project attribution (`projectId IS NULL`).
- Columns: Date, Vendor / Payee, Invoice #, Payment Status, and Grand Total.
- Verify the bottom summary footer: **Total Overhead Expenses**.

#### Step 6: Sub-Tab 5 — Partner Drawings (Equity Ledger)
- Click sub-tab **"Partner Drawings"**.
- Observe two distinct partner sections:
  1. **Arshad Khalil** (Account `3010` / `3010-01`): Personal draws showing Date, JV Reference, Description/Memo, Account Code, and Subtotal.
  2. **Zeeshan Yousafzai** (Account `3020`): Equity draws with clean zero-balance state if no withdrawals posted yet.
- Verify bottom card: **Combined Partner Drawings Grand Total** in deep slate card with emerald amount.

---

## ⚡ 5. Terminal Automated Test Commands

To re-verify all tests across backend and frontend:

```powershell
# Run backend report service tests (8 tests in report.service.test.ts)
npm test --prefix backend -- src/__tests__/report.service.test.ts

# Run all backend test suites (56 tests across 9 suites)
npm test --prefix backend

# Run frontend reports tests (13 tests in page.test.tsx and useReports.test.tsx)
npx vitest run --root frontend "src/app/(dashboard)/reports/page.test.tsx" "src/features/reports/hooks/useReports.test.tsx"
```