Searched for "seed"
Listed directory scripts
Viewed seed-module1.ts:1-100
Viewed system.service.ts:1-110
Viewed system.service.ts:110-145
Ran command: `npx ts-node -e "import { prisma } from './src/config/db'; async function test() { const user = await prisma.user.findFirst(); const accounts = await prisma.account.count(); const projects = await prisma.project.count(); const vendors = await prisma.vendor.count(); const customers = await prisma.customer.count(); const deals = await prisma.deal.count(); const receipts = await prisma.receipt.count(); const bills = await prisma.expenseBill.count(); const payments = await prisma.vendorPayment.count(); const journals = await prisma.journalEntry.count(); console.log({ user: user ? { email: user.email, fullName: user.fullName } : null, accounts, projects, vendors, customers, deals, receipts, bills, payments, journals }); } test().finally(() => prisma.\$disconnect());"`
Ran command: `npx ts-node -e 'import { prisma } from "./src/config/db"; prisma.user.findFirst().then(async u => { const [a, p, v, c, d, r, b, vp, j, s] = await Promise.all([prisma.account.count(), prisma.project.count(), prisma.vendor.count(), prisma.customer.count(), prisma.deal.count(), prisma.receipt.count(), prisma.expenseBill.count(), prisma.vendorPayment.count(), prisma.journalEntry.count(), prisma.systemSetting.findFirst()]); console.log("DB_SUMMARY:", JSON.stringify({ user: u ? { email: u.email, fullName: u.fullName } : null, accounts: a, projects: p, vendors: v, customers: c, deals: d, receipts: r, bills: b, payments: vp, journals: j, system: s })); process.exit(0); });'`
Used tool: manage_task
Created check_db.ts
Ran command: `npx ts-node scratch/check_db.ts`
Used tool: manage_task
Viewed .env:1-16
Searched for "1234"
Ran command: `npx ts-node -e 'import { prisma } from "./src/config/db"; import { CryptoUtility } from "./src/utils/crypto.util"; prisma.user.findFirst().then(async u => { if (!u) return console.log("No user"); const matches = await CryptoUtility.verifyPin("1234", u.pinHash); console.log("PIN 1234 MATCHES:", matches); process.exit(0); });'`
Edited check_db.ts
Edited check_db.ts
Ran command: `npx ts-node scratch/check_db.ts`
Viewed crypto.util.ts:1-32
Edited check_db.ts
Ran command: `npx ts-node scratch/check_db.ts`
Used tool: manage_task
Used tool: manage_task
Searched for "admin@wadaan.com.pk"
Edited check_db.ts
Edited check_db.ts
Ran command: `npx ts-node scratch/check_db.ts`
Used tool: manage_task
Used tool: manage_task
Used tool: manage_task
Ran command: `git status -s`
Ran command: `Remove-Item -Recurse -Force scratch`

Here is the complete **Test Data, Master Credentials, and Workflow Testing Guide** covering everything built in the system to date (Modules 0 through 3 — Screens 0 to 9).

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

## ⚡ 5. Terminal Automated Test Commands

To re-verify all 139 tests across the entire application:

```powershell
# Run backend test suite (31 tests in 6 suites)
npm test --prefix backend

# Run frontend test suite (108 tests in 16 suites)
npm test --prefix frontend
```