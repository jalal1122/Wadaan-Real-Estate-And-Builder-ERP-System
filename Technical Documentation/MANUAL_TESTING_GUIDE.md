# Wadaan ERP — Top-Class Manual Testing Guide
### Complete Coverage: All Screens, Edge Cases & Business Logic

> **Purpose**: Step-by-step manual verification guide for every screen, feature, guardrail, edge case, and accounting workflow in the Wadaan Real Estate ERP. Run this guide after a fresh database reset to verify 100% system integrity.
>
> **How to Use**: Follow each section in order. Each test case lists: what to do, the expected result, and any guardrails to verify. Never skip a negative test — they protect real money.

---

## 🛑 BEFORE YOU BEGIN: Environment Setup & DB Reset

### Step 0.1 — Reset the Database
```powershell
# Connect to your Supabase project and wipe all tables, then re-run migrations:
cd backend
npx prisma db push --force-reset

# After reset, regenerate the Prisma client:
npx prisma generate
```
> **Expected**: Tables recreated clean. `SystemSetting.isInitialized = false`.

### Step 0.2 — Boot the Application
```powershell
# Terminal 1: Start the Express backend
npm run dev --prefix backend

# Terminal 2: Start the Next.js frontend
npm run dev --prefix frontend
```
- Backend URL: `http://localhost:4000/api/v1`
- Health Check: Open `http://localhost:4000/api/v1/system/status`
  - **Expected Response**: `{ "success": true, "data": { "isInitialized": false } }`
- Frontend URL: `http://localhost:3000`

### Step 0.3 — Verify Unauthenticated Access Blocks
- Navigate to `http://localhost:3000/dashboard` directly in browser.
- **Expected**: Immediately redirected to `/login`. Dashboard content never shown.
- Navigate to `http://localhost:3000/accounts`.
- **Expected**: Redirected to `/login`.
- Try calling `http://localhost:4000/api/v1/accounts` in browser.
- **Expected**: HTTP `401 Unauthorized` — `{ "success": false, "error": { "code": "UNAUTHORIZED", "message": "No active session found." } }` (or `"User not found or session invalid."` if a stale cookie was sent).

---

## 🔐 MODULE 0: AUTHENTICATION & SESSION (Screen 0)

> [!NOTE]
> **Database Reset Initial State**: If the database was just wiped/reset, no user account exists yet. The login screen displays the **"Initial Setup Required"** banner. You can:
> - Click **[ Setup Admin Only ]** to quickly create the administrator (`admin@wadaan.com.pk`, PIN `5555`) to run Module 0 tests (A-1 through A-11).
> - Or jump straight to **Module 0.5** to run the complete Go-Live Wizard (`/setup`).

### Test A-1: Login Page Render & Initial State
1. Navigate to `http://localhost:3000/login`.
2. **Verify**: Wadaan Real Estate logo is centered. No username/email field visible — only a 4-digit PIN input (4 separate boxes, or single input).
3. **Verify**: No "Register" or "Sign Up" link exists anywhere on the page.
4. **Verify**: "Forgot PIN?" link is visible.
5. **Verify**: Login button is disabled until 4 digits are entered.

### Test A-2: Wrong PIN — Basic Rejection
1. Enter PIN: `1234` (incorrect).
2. **Expected**: Error banner/toast "Invalid PIN." appears. No redirect.
3. **Verify**: The failed attempt counter registers (attempt 1 of 5).

### Test A-3: Progressive Lockout — Tier 1 (5 Attempts)
1. Rapidly enter wrong PINs 5 times: `1111`, `2222`, `3333`, `4444`, `6666`.
2. **Expected After 5th failure**: Lockout banner appears with a **30-second countdown timer**.
3. **Verify**: The login button/PIN input is disabled and shows the countdown live.
4. Try entering the correct PIN `5555` during lockout.
   - **Expected**: System rejects it with "Account temporarily locked" — does NOT grant access.
5. Wait for the 30-second timer to expire.
6. **Verify**: Countdown disappears and the input is re-enabled.

### Test A-4: Progressive Lockout — Tier 2 (4 Attempts After First Lockout)
1. After the Tier 1 lockout expires, enter wrong PINs 4 times.
2. **Expected After 4th failure**: Lockout triggers with **60-second countdown**.
3. **Verify**: The tier escalated from 30s → 60s.

### Test A-5: Lockout Status Persists on Page Refresh
1. During an active lockout, refresh the browser (F5).
2. **Expected**: The lockout countdown is **restored from the server** via `GET /api/v1/auth/lockout-status`. The timer continues counting down from where it left off — it is NOT reset by refresh.

### Test A-6: Correct PIN Resets Lockout Tier
1. Enter 3 wrong PINs (do not trigger lockout).
2. Enter correct PIN `5555`.
3. **Expected**: Login succeeds. Session starts.
4. Log out, return to login.
5. Enter 1 wrong PIN.
6. **Verify**: Counter shows "1 of 5" — tier reset back to Tier 1 after the successful login.

### Test A-7: Successful Login & Session Cookie
1. Enter PIN `5555` on the 4th digit entry (or click Login).
2. **Expected**: Auto-submit triggers immediately on 4th digit. No need to click a button.
3. Redirected to `/dashboard`.
4. Open browser DevTools → Application → Cookies.
5. **Verify**: `token` cookie exists with:
   - `HttpOnly: true` (not accessible via JavaScript)
   - `SameSite: Strict`
   - Expiry approximately 15 minutes from now

### Test A-8: Sliding Session Window (15-Minute Rolling)
1. Log in with PIN `5555`.
2. Note the `token` cookie expiry timestamp.
3. Navigate to `/accounts` (triggers an authenticated API call).
4. **Verify**: Cookie expiry timestamp has been extended by another 15 minutes from the time of the request.
5. Perform any action (e.g., filter accounts).
6. **Verify**: Cookie expiry refreshes again. Session remains active indefinitely with activity.

### Test A-9: Session Expiry — Forced Idle Logout
1. Log in.
2. Leave the browser completely idle for 15+ minutes (no clicks, no navigation).
3. After 15+ minutes, attempt any action (navigate to `/accounts`).
4. **Expected**: Redirected to `/login`. Session has expired.

### Test A-10: Forgot PIN — Email Recovery Flow (if SMTP configured)
1. On the login page, click "Forgot PIN?".
2. Enter the admin email: `admin@wadaan.com.pk`.
3. **Expected**: Response always shows a generic "If this email is registered, a reset link was sent" — never confirms whether the email exists (email enumeration protection).
4. Enter a non-existent email: `hacker@evil.com`.
5. **Expected**: **Identical** success response — the system does not reveal whether `hacker@evil.com` is registered.
6. Open your email inbox (or check the backend server logs for the console output if using dummy SMTP). Look for the "Reset your Master PIN" email.
7. Click the "Reset Master PIN" link provided in the email.
8. **Expected**: The browser should open `http://localhost:3000/reset-password?token=...` with a secure Reset Password Vault UI.
9. Enter a new 4-digit PIN (e.g., `8888`) and confirm it. Submit the form.
10. **Expected**: A success screen appears with a 2-second timeout, then automatically redirects to the `/login` page.
11. Login with the new PIN `8888` and confirm it works.

### Test A-11: Forgot PIN — Master Recovery Key (Offline)
1. On the "Forgot PIN?" page, look for the "Use Recovery Key" option.
2. Enter the 16-character Master Recovery Key generated during system initialization.
3. **Expected**: System verifies the SHA-256 hash and permits setting a new 4-digit PIN.

---

## 🏁 MODULE 0.5: GO-LIVE STARTER MODAL (First-Time Setup)

### Test B-1: Access Starter Modal & First-Time Setup
1. After a DB reset, navigate to `http://localhost:3000/login` or directly to `http://localhost:3000/setup`.
2. **On `/login`**: Because the database is uninitialized, observe the **"Initial Setup Required"** banner with two direct action options:
   - **Option 1 (Full Go-Live Wizard)**: Click **[ Go-Live Wizard ]** or navigate to `http://localhost:3000/setup`. The **StarterModal** 6-step full-screen wizard opens immediately.
   - **Option 2 (Admin Only Setup)**: Click **[ Setup Admin Only ]**. Enter Name `Muhammad Jalal`, Email `admin@wadaan.com.pk`, PIN `5555`. On submission, the 16-character Master Recovery Key appears. You can then log in with PIN `5555`.
3. **If navigating to `http://localhost:3000/setup` directly**: The StarterModal 6-step wizard renders in full screen immediately.
4. **Verify**: When the wizard is open, background navigation is blocked.

### Test B-2: Go-Live Wizard — Step 1 (Liquid Cash & Banks)
- Enter Opening Balances:
  - **Office Safe (Vault A)**: `PKR 250,000`
  - **HBL Operations Account**: `PKR 4,200,000`
- **Expected**: System creates journal entries: DR `1010-01 Office Safe` / CR `3000 Owner's Opening Equity` and DR `1030-01 HBL Operations` / CR `3000 Owner's Opening Equity`.
- Click **Next**.

### Test B-3: Go-Live Wizard — Step 2 (Active Construction Sites)
- Add a project row:
  - **Project Name**: `Wadaan Heights`
  - **Project Prefix**: `WH`
  - **Master BOQ**: `PKR 60,000,000`
  - **Spent to Date**: `PKR 14,500,000`
- **Expected**: Project created. Opening WIP capitalized (`DR 1200 WIP / CR 3000 Equity`).
- Add second project:
  - **Project Name**: `OPF Villa`
  - **Project Prefix**: `OPFV`
  - **Master BOQ**: `PKR 260,000,000`
  - **Spent to Date**: `PKR 0`
- Click **Next**.

### Test B-4: Go-Live Wizard — Step 3 (Pending Vendor Payables)
- Add a vendor row:
  - **Vendor Name**: `Ali Hardware`
  - **Phone**: `0300-1234567`
  - **Outstanding Balance**: `PKR 650,000`
  - **Project**: `Wadaan Heights`
- **Expected**: Vendor created, opening ExpenseBill created as `UNPAID` for `PKR 650,000`.
- Click **Next**.

### Test B-5: Go-Live Wizard — Step 4 (Active Client Deals)
- Add a client row:
  - **Client Name**: `Tariq Mehmood`
  - **Phone**: `0312-9876543`
  - **Deal Type**: Wadaan Sale
  - **Total Value**: `PKR 6,000,000`
  - **Already Received**: `PKR 0`
  - **Remaining**: `PKR 6,000,000`
- Click **Launch ERP**.

### Test B-6: Master Recovery Key Display
- **Expected**: Before unlocking, the modal displays a 16-character alphanumeric **Master Recovery Key**.
- **Verify**: A "Copy & Save" button exists. The key is only shown ONCE.
- Copy the key and store it.
- Click **"I Have Saved My Key — Enter ERP"**.

### Test B-7: Post-Initialization State
- **Expected**: Dashboard loads. `isInitialized === true` in the database.
- Call `GET /api/v1/system/status` again.
- **Expected**: `{ "data": { "isInitialized": true } }`.

### Test B-8: Double Initialization Prevention
- Attempt to call `POST /api/v1/system/initialize` again via DevTools/Postman.
- **Expected**: HTTP `409 Conflict` — `{ "code": "ALREADY_INITIALIZED" }`.

---

## 📊 MODULE 1: CHART OF ACCOUNTS (Screen 1 — `/accounts`)

### Test C-1: Dashboard View & Live Balances
1. Navigate to `/accounts`.
2. **Verify**: Three summary cards at the top show:
   - **Total Assets** (emerald) — reflects the Opening Equity cash amounts entered in setup
   - **Total Liabilities** (red)
   - **Owner's Equity** (slate)
3. **Verify**: The account table is grouped into 5 sections: ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE.
4. **Verify**: All accounts show their real-time live balances.
5. **Verify**: System-locked accounts (AP, AR, WIP, Advances) display a `Locked` badge. No Delete action button is visible for them.

### Test C-2: Fiscal Year Boundary Toggle
1. Find the **"This Fiscal Year"** toggle on the accounts screen.
2. Toggle it ON.
3. **Expected**: Revenue and Expense account balances recalculate from July 1st of the current Pakistani fiscal year. ASSET, LIABILITY, and EQUITY balances remain cumulative (unaffected by the fiscal boundary).
4. Toggle it OFF.
5. **Expected**: Returns to all-time cumulative balances.

### Test C-3: Create New Account — Happy Path
1. Click **"+ Add Account"**.
2. Fill in:
   - **Account Code**: `5100-01`
   - **Account Name**: `Head Office Rent & Facility Utilities`
   - **Category**: `EXPENSE`
3. **Verify**: Code range guidance shows `EXPENSE: 5000–5999` under the code field.
4. Click **"Save Account"**.
5. **Expected**: Account appears in the EXPENSE section of the table with zero balance and `Active` status.

### Test C-4: Duplicate Account Code — Client-Side Prevention
1. Click **"+ Add Account"**.
2. Enter Account Code: `5100-01` (already exists).
3. **Expected BEFORE clicking Save**: An inline red error appears immediately under the code field: `"Account with code '5100-01' already exists."` The form blocks submission without making an API call.

### Test C-5: Duplicate Account Code — Server-Side Prevention
1. (Simulate bypassing the frontend) Try `POST /api/v1/accounts` with `{"accountCode": "5100-01", "accountName": "Test", "category": "EXPENSE"}`.
2. **Expected**: HTTP `409 Conflict` — `{ "code": "DUPLICATE_RECORD" }`.

### Test C-6: Edit Account Name (Non-Locked)
1. On account `5100-01`, click the **⋮ menu → "Edit Account"**.
2. **Verify**: Account Code is **read-only** with a lock icon — cannot be changed.
3. Change Name to: `Office Rent, Utilities & Maintenance`.
4. Click **"Save Changes"**.
5. **Expected**: Account name updates immediately in the table.

### Test C-7: Edit System-Locked Account — Category Lock
1. Find a system-locked account (e.g., `2000 Accounts Payable`).
2. Click **⋮ menu → "Edit Account"**.
3. **Verify**: The **Category dropdown is disabled** with a `System Locked` badge and a warning banner: `"System accounts cannot change category to preserve ledger reconciliation"`.
4. Try changing the category via the API directly: `PATCH /api/v1/accounts/:id` with `{"category": "ASSET"}`.
5. **Expected**: HTTP `403 Forbidden` — `{ "code": "OPERATION_FORBIDDEN" }`.

### Test C-8: Delete Account — Three-Tier Policy

#### Tier 3: Zero-History Hard Delete
1. Create a brand new account: Code `9999`, Name `Test Delete Account`, Category `EXPENSE`.
2. Click **⋮ menu → "Delete Account"**.
3. **Expected**: Rose-colored dialog for **permanent deletion**. No transactions on this account.
4. Confirm deletion.
5. **Expected**: Account permanently removed. No longer visible in the table.

#### Tier 2: Has Transactions — Soft Archive
1. Find account `5100-01` (has journal entries from prior tests).
2. Click **⋮ menu → "Delete Account"** (or "Archive Account").
3. **Expected**: Amber dialog showing real-time **total debit and credit values** on this account. Warns that it has transaction history. Offers **Archive** (not permanent delete).
4. Confirm Archive.
5. **Expected**: Account disappears from the master grid. `isArchived = true` in DB. Historical journal entries are fully intact — the account is just hidden from the active list.

#### Tier 1: System-Locked — Block Delete
1. Find `2000 Accounts Payable` (system-locked).
2. Click **⋮ menu**.
3. **Expected**: Delete/Archive option is **completely absent** from the menu. Cannot delete or archive a system-locked account.

### Test C-9: GL Sub-Tab Navigation
1. On the accounts page, click the **"Journal Entries"** sub-tab.
2. **Expected**: Navigates to `/journals`.
3. Click **"Trial Balance"** sub-tab.
4. **Expected**: Navigates to `/trial-balance`.
5. Click **"Chart of Accounts"** sub-tab.
6. **Expected**: Returns to `/accounts`.

### Test C-10: View Ledger on Account
1. Find `1030-01 HBL Operations`.
2. Click **"View Ledger"** from the action menu.
3. **Expected**: The `AccountLedgerPanel` slide-over drawer opens from the right.
4. **Verify**: Shows 4 KPI cards: Opening Balance, Period Debits, Period Credits, Closing Balance.
5. **Verify**: Chronological transaction list shows the opening equity journal entry.
6. Press `Escape` key.
7. **Expected**: Drawer closes smoothly.

---

## 📝 MODULE 1b: GENERAL JOURNAL ENTRIES (Screen 2 — `/journals`)

### Test D-1: Journal Page Render
1. Navigate to `/journals`.
2. **Verify**: The GL sub-tab "Journal Entries" is highlighted.
3. **Verify**: Voucher number field shows next auto-number (e.g., `JV-0001`).
4. **Verify**: Entry Date defaults to today.
5. **Verify**: At least 2 line item rows are pre-rendered.

### Test D-2: Debit/Credit Mutual Exclusivity
1. In Line 1, enter `50,000` in the **Debit** column.
2. **Expected**: The **Credit** field on the same row is immediately cleared and disabled — you cannot have both debit and credit on a single line.
3. Now enter any value in the Credit field of Line 1.
4. **Expected**: Debit field clears and disables.

### Test D-3: Balance Indicator — Out of Balance
1. Line 1: Select account `5100-01`, Debit: `25,000`.
2. Leave Line 2 empty (no credit entered).
3. **Expected**: Balance indicator shows red `"Out of Balance"` with exact difference: `"Diff: Rs. 25,000.00"`.
4. **Verify**: **"Post Journal Entry" button is STRICTLY DISABLED**.

### Test D-4: Balance Indicator — Balanced State & Post
1. Continuing from D-3: Line 2: Select account `1010-01 Office Safe`, Credit: `25,000`.
2. **Expected**: Balance indicator turns emerald `"✓ Balanced"`.
3. **Verify**: **"Post Journal Entry" button becomes ACTIVE** (solid dark background).
4. Add Description: `Monthly office electricity and generator fuel`.
5. Click **"Post Journal Entry"**.
6. **Expected**: Journal posted. Voucher number auto-assigned (e.g., `JV-0001`). Recent Journal History table updates below with this entry.

### Test D-5: System-Locked Account Excluded from Dropdown
1. Open a new journal line.
2. Click the Account dropdown.
3. **Verify**: `2000 Accounts Payable` and `1100 Accounts Receivable` (system-locked) are **completely absent** from the dropdown. You cannot accidentally post directly to these control accounts.

### Test D-6: Party & Project Tagging on Lines
1. Start a new journal entry:
   - Description: `Owner equity withdrawal for personal use`
   - Line 1: Account `3010-01 Owner Drawings`, Debit: `100,000`, **Party**: Select `[Vendor: Ali Hardware]` *(just to test the selector)*
   - Line 2: Account `1010-01 Office Safe`, Credit: `100,000`, **Project**: `Wadaan Heights`
   - Add a **Memo** to Line 1: `Personal withdrawal by director`
2. Click **"Post Journal Entry"**.
3. **Expected**: Posted successfully. Memo, party, and project stored on the respective journal lines.

### Test D-7: Unbalanced Journal — Backend Guard
- Using Postman/DevTools, `POST /api/v1/journals` with unbalanced lines (e.g., Debit `100`, Credit `90`).
- **Expected**: HTTP `400 Bad Request` — `{ "code": "UNBALANCED_JOURNAL" }`.

### Test D-8: Single-Sided Journal — Backend Guard
- `POST /api/v1/journals` with only one line.
- **Expected**: HTTP `400 Bad Request` — `{ "code": "MINIMUM_LINES_REQUIRED" }` or similar.

### Test D-9: Journal Immutability — No Delete
- Try `DELETE /api/v1/journals/:id` on a posted journal.
- **Expected**: `404 Not Found` or `405 Method Not Allowed`. Journal entries cannot be deleted once posted.

---

## ⚖️ MODULE 1c: TRIAL BALANCE (Screen 3 — `/trial-balance`)

### Test E-1: Trial Balance Render & Balance Indicator
1. Navigate to `/trial-balance`.
2. **Verify**: "Trial Balance" sub-tab is highlighted.
3. **Verify**: Grand Total Debit equals Grand Total Credit (books are balanced from all prior entries).
4. **Verify**: Mathematical proof pill shows `"✓ Balances Match — Books are perfectly balanced"` in emerald green.

### Test E-2: Date Preset — All Time
1. Click **"All Time"** preset.
2. **Verify**: All accounts from inception show. Balance equation holds (Debits = Credits).

### Test E-3: Date Preset — This Fiscal Year
1. Click **"This Fiscal Year"** preset.
2. **Verify**: Date label updates to `"01 Jul 2026 — 30 Jun 2027"` (or current FY).
3. **Verify**: ASSET, LIABILITY, EQUITY accounts still show cumulative balances (permanent accounts — no start date cutoff).
4. **Verify**: REVENUE and EXPENSE accounts show only FY-period activity (annual accounts — start date restricted to July 1st).

### Test E-4: Date Preset — This Month
1. Click **"This Month"** preset.
2. **Verify**: Revenue/Expense balances reflect only current month's activity.

### Test E-5: Custom Date Range
1. Click **"Custom Range"**.
2. Set Start Date: `2026-09-01`, End Date: `2026-09-30`.
3. **Verify**: Data recalculates for the specified range.

### Test E-6: Zero-Balance Filtering
- **Verify**: Accounts with zero net balance (e.g., accounts with no transactions) do not appear in the trial balance table (zero-balance filtering active).

### Test E-7: Search Filter
1. Type `1030` in the search bar.
2. **Expected**: Only `1030-01 HBL Operations` account row is visible.
3. Type `Equity`.
4. **Expected**: Only Equity accounts visible.
5. Clear search.
6. **Expected**: Full table restored.

### Test E-8: Account Ledger Drill-Down from Trial Balance
1. Click any non-zero account row in the table (e.g., `1010-01 Office Safe`).
2. **Expected**: `AccountLedgerPanel` slide-over opens from the right.
3. **Verify**: Shows account code, name, category badge, and current date range.
4. **Verify**: 4 KPI cards: Opening Balance, Period Debits, Period Credits, Closing Balance — all accurate.
5. **Verify**: Chronological transaction table with Running Balance column calculated dynamically.
6. Click outside the drawer.
7. **Expected**: Drawer closes.

### Test E-10: Contra-Equity Account in Trial Balance
1. Navigate to **Module 1b: General Journal** and create a new entry:
   - Debit: `3010-10 Owner Drawings` (EQUITY account) = Rs 100,000
   - Credit: `1010-01 Office Safe (Vault A)` (ASSET account) = Rs 100,000
2. Navigate to **Trial Balance** > All Time.
3. **Verify**: `Owner Drawings` appears in the list.
4. **Expected**: The `100,000` amount appears in the **Debit** column (as it is a contra-equity balance), NOT the Credit column.
5. **Verify**: The Grand Total Debit still exactly matches the Grand Total Credit.

### Test E-9: Print / PDF Export (Read-Only Verification)
1. Click **"Print Report"**.
2. **Verify**: Browser print dialog opens.
3. **Verify**: Sidebar, GL navigation tabs, date filters, and search bar are all **hidden** from the print output.
4. **Verify**: Institutional letterhead visible: "Wadaan Real Estate & Builders (Pvt) Ltd.", "Trial Balance Report", period dates, and generation timestamp.

---

## 🏗️ MODULE 2a: PROJECTS & WIP (Screen 4 — `/projects`)

### Test F-1: Project Dashboard — Cards View
1. Navigate to `/projects`.
2. **Verify**: Project cards for `Wadaan Heights (WH)` and `OPF Villa (OPFV)` are visible.
3. **Verify** each card shows:
   - Project Name & Prefix
   - Master BOQ (budget)
   - Total Spent (from WIP bills)
   - Health Bar progress indicator
4. For `Wadaan Heights`, the health bar should show orange/amber (has spending from the opening balance setup).

### Test F-2: Health Bar Color Thresholds
1. Navigate to `/projects`.
2. **Green bar**: Project spending < 80% of BOQ. (OPF Villa should show green — 0% used).
3. **Amber bar**: Project spending 80%–99% of BOQ.
4. **Red bar**: Project spending ≥ 100% (over budget).

### Test F-3: GL Entries Drill-Down Drawer
1. On the **Wadaan Heights** card, click **"View GL Entries →"**.
2. **Expected**: `ProjectTransactionDrawer` slides in smoothly from the right.
3. **Verify**: Header shows Project Name, Prefix code, and Status (`ACTIVE`).
4. **Verify**: Financial Summary Strip shows:
   - Total Debits (costs added)
   - Total Credits (adjustments)
   - Net Project WIP Balance
5. **Verify**: Journal table columns: Date, JV Number, Account Code & Name, Description/Memo, Associated Party, Debit, Credit, Running Balance.
6. **Verify**: Running Balance calculates correctly row by row.
7. Click **"×"** or click outside the drawer.
8. **Expected**: Drawer closes smoothly.

### Test F-4: Create New Project
1. Click **"+ New Project"** (or similar CTA).
2. Fill in:
   - **Project Name**: `Green Valley Apartments`
   - **Prefix**: `GVA`
   - **Master BOQ**: `PKR 120,000,000`
3. Click **"Create Project"**.
4. **Expected**: New project card appears on the dashboard with 0% budget burn and green health bar.

### Test F-5: Project Prefix Uniqueness Guard
1. Try creating another project with prefix `WH`.
2. **Expected**: Error — prefix must be unique.

### Test F-6: Client Construction Contract Banner
1. After creating a construction deal in the Deals section (done later in Test I), return to `/projects`.
2. Find the linked project card.
3. **Verify**: A **Client Contract Banner** appears on the card showing:
   - Client name & phone
   - `Client Contract` badge
   - **Contract Value**: Total agreed price
   - **Client Paid**: Collected amount
   - **Net Cash Margin**: Green if positive, Red if client payments lag behind site costs.

---

## 🧾 MODULE 2b: EXPENSE BILLS & WIP CAPITALIZATION (Screen 5 — `/payables` → Tab 1: "Record Bill")

### Test G-1: Navigate to Record Bill Panel
1. Navigate to `/payables`.
2. Click **"Record Bill"** tab (Tab 1).
3. **Verify**: Left panel shows Vendor dropdown, Project selector, Invoice Number, Bill Date, Settlement Type toggle.
4. **Verify**: Right panel shows dynamic line items table with Description, Qty, Unit Price, Line Total.

### Test G-2: Inline Vendor Creation
1. Click **"+ New Vendor"** inline button in the Vendor dropdown.
2. Fill:
   - **Vendor Name**: `Petrol Pump`
   - **Phone**: `0311-5559988`
3. Click **"Save & Select"**.
4. **Expected**: Vendor created and immediately selected in the dropdown — no page navigation required.

### Test G-3: WIP Routing Indicator — Project Bill
1. **Vendor**: `Ali Hardware`
2. **Project**: Select `Wadaan Heights (WH)`.
3. **Verify**: An active emerald/blue badge appears: `→ WIP Asset (1200)`. This confirms the bill will be capitalized as an asset.
4. **Invoice Number**: `INV-STEEL-101`
5. **Bill Date**: Today
6. **Settlement Type**: `ACCOUNTS_PAYABLE` (default)
7. Line Item:
   - Description: `Deformed Steel Bars Grade 60`
   - Qty: `20`
   - Unit Price: `150,000`
   - **Verify**: Line Total auto-calculates to `PKR 3,000,000` immediately on each keystroke.
8. Click **"Post Bill"**.
9. **Verification**:
   - Account `2000 AP` increased by `PKR 3,000,000`
   - Account `1200 WIP` increased by `PKR 3,000,000`
   - `Wadaan Heights` Total Spent on Screen 4 updated instantly.
   - Bill queued in the Screen 7 payment run.

### Test G-4: Overhead Routing Indicator — General Expense
1. **Vendor**: `Petrol Pump`
2. **Project**: Select `"None — General Office Overhead"` (leave unselected).
3. **Verify**: Slate badge appears: `→ Office Overhead (5000)`.
4. **Invoice Number**: `PETROL-4421`
5. Line Item:
   - Description: `Generator High-Speed Diesel`
   - Qty: `150`
   - Unit Price: `280`
   - **Verify**: Line Total = `PKR 42,000`
6. Click **"Post Bill"**.
7. **Verification**:
   - Account `2000 AP` increased by `PKR 42,000`
   - Account `5000 COGS/Overhead` increased by `PKR 42,000`
   - This expense reduces Net Income on Screen 10 immediately.

### Test G-5: Anti-Duplicate Invoice Guard
1. Try creating another bill for `Ali Hardware` with Invoice Number `INV-STEEL-101`.
2. **Expected**: Red inline error under Invoice Number field: `"Invoice 'INV-STEEL-101' already exists for this vendor"`. HTTP `409 DUPLICATE_INVOICE`.

### Test G-6: Direct Cash Bill (DIRECT_CASH Settlement)
1. **Vendor**: `Ali Hardware`
2. **Project**: `Wadaan Heights`
3. **Invoice Number**: `INV-SAND-202`
4. Toggle Settlement Type to **`DIRECT_CASH`**.
5. **Verify**: A **"Source Asset Account"** dropdown appears (cash/bank accounts only).
6. Select: `1010-01 Office Safe (Vault A)`.
7. **Verify**: If the Source Account name contains "bank", a **Bank Transaction/Online Ref** field appears.
8. Line Item: Description `River Sand Bulk`, Qty `50`, Unit Price `5,000`.
9. Click **"Post Bill"**.
10. **Expected**:
    - Bill status immediately `PAID` with `pendingAmount = 0`.
    - GL: DR `1200 WIP` / CR `1010-01 Office Safe`.
    - **DPR (Direct Payment Receipt)** print dialog triggers automatically.
    - After printing/dismissing, `DPR-XXXXXXXX.html` file downloads to user's computer.
    - This bill does NOT appear in the Screen 7 payment queue (already paid).

### Test G-7: Budget Soft-Lock Warning (Over-Budget)
1. For `OPF Villa` (BOQ: `PKR 260,000,000`), post a bill with total exceeding the BOQ.
2. **Expected**:
   - Bill IS posted to the GL (no blocking).
   - An amber warning banner appears: `"Bill saved! Project exceeds approved BOQ by Rs. X"`.
   - The `OPF Villa` project card on Screen 4 turns red with `Over Budget` badge.

### Test G-8: Multi-Line Item Bill
1. Create a new bill with 3 line items:
   - Cement Bags: Qty 100, Price 1,200 = `120,000`
   - Sand Bags: Qty 50, Price 800 = `40,000`
   - Labor - Foundation: Qty 1, Price 250,000 = `250,000`
2. **Verify**: Grand Total Banner shows `PKR 410,000` in real-time.
3. Post the bill.
4. **Expected**: Single bill for `PKR 410,000` in the AP queue. WIP increased by `PKR 410,000`.

### Test G-9: Minimum Line Item Enforcement
1. Try posting a bill with 0 line items (or clear all line items).
2. **Expected**: Form blocks submission — "At least 1 valid line item required."

---

## 💰 MODULE 2c: VENDOR PAYMENT RUN & CPV (Screen 7 — `/payables` → Tab 2: "Payment Run")

### Test H-1: Payment Run Tab & Outstanding Queue
1. Navigate to `/payables` → click **"Payment Run"** tab.
2. **Verify**: Vendor list shows `Ali Hardware` with total outstanding debt visible.
3. Click/expand `Ali Hardware`.
4. **Verify**: Individual unpaid bills are shown: `INV-STEEL-101` (`PKR 3,000,000`), and any others from Bill tests.

### Test H-2: Granular Invoice Selection
1. In the Ali Hardware queue, check the checkbox next to `INV-STEEL-101` only.
2. **Verify**: An editable "Pay This Run (PKR)" input appears on that row, defaulting to the bill's full pending balance.
3. Click **"Full"** shortcut button.
4. **Verify**: Input fills with the exact full amount.
5. Check a second invoice (if available). Auto-total updates.

### Test H-3: Row-Level Overpay Guard
1. For `INV-STEEL-101` (pending `PKR 3,000,000`), type `3,500,000` in the "Pay This Run" input.
2. **Expected**: Row highlights in red, inline warning: `"Amount exceeds outstanding balance"`. Cannot exceed the bill's pending amount.

### Test H-4: Full Vendor Overpay Lock (FIFO Mode)
1. Without selecting specific invoices, type `5,000,000` in a global amount field (exceeding total outstanding).
2. **Expected**: Red warning: `"Payment exceeds outstanding debt"`. Submit button disables.

### Test H-5: Partial FIFO Payment via Cash
1. In the Ali Hardware expanded queue, leave invoices unchecked (FIFO mode).
2. **Amount**: `1,500,000`
3. **Source Account**: `1010-01 Office Safe (Vault A)`
4. **Mode**: `Cash` (no reference required)
5. Click **"Execute Payment & Print Receipt"**.
6. **Expected**:
   - `INV-STEEL-101` status changes from `UNPAID` to `PARTIAL`.
   - `INV-STEEL-101` pending amount drops from `3,000,000` to `1,500,000`.
   - GL: DR `2000 AP` `1,500,000` / CR `1010-01 Office Safe` `1,500,000`.
   - **CPV (Cash Payment Voucher)** print dialog launches.
   - A4 dual-copy layout with vendor's original and Wadaan's institutional copy.

### Test H-6: Cheque Payment — Mandatory Reference Lock
1. For remaining `Ali Hardware` balance, select it for payment.
2. **Source Account**: `1030-01 HBL Operations`.
3. **Payment Mode**: Toggle to **Cheque**.
4. **Verify**: `Cheque Number` field appears and is **mandatory**.
5. Try clicking "Execute Payment" WITHOUT entering a cheque number.
6. **Expected**: Button remains disabled. Cannot pay via bank without a cheque reference.
7. Enter Cheque Ref: `CHQ-HBL-991122`.
8. Click **"Execute Payment & Print Receipt"**.
9. **Expected**: Payment posted. CPV generated with cheque number prominently displayed.

### Test H-7: Online Transfer — Mandatory UTR Reference
1. Source Account: `1030-01 HBL`.
2. **Payment Mode**: Toggle to **Online Transfer**.
3. **Verify**: `Transaction ID / Wire Reference` field appears.
4. Try submitting without it — button disabled.
5. Enter UTR: `FT-HBL-20260924`.
6. Submit.
7. **Expected**: Payment posted immediately (no waiting room audit — online transfers settle directly).

### Test H-8: CPV Dual-Copy Layout Verification
- When the CPV print dialog opens, verify the A4 page structure:
  - **Top Half (Vendor Receipt — Original)**: Voucher number, date, vendor name, payment reference, settled invoices table, "RECEIVED WITH THANKS" box, stamp area.
  - **Bottom Half (Wadaan Institutional Copy)**: Identical with 4 signature lines: Prepared By, Audited By, Approved By (CFO), Payee Signature.

---

## 🤝 MODULE 3a: DEAL HUB & CUSTOMER MANAGEMENT (Screen 8 — `/deals`)

### Test I-1: Deal Dashboard KPI Strip
1. Navigate to `/deals`.
2. **Verify**: KPI Strip shows:
   - **Active Receivables** (total unpaid milestones)
   - **Client Mobilization Advances** (wallet escrow)
   - **Construction Volume** (total construction contract values)
   - **Brokerage Escrow vs. Earned Commissions** split

### Test I-2: Deal Table Filtering
1. **Verify**: Filter tabs for: All Deals, Wadaan Sale, Construction, Brokerage, Active, Settled.
2. **Verify**: Real-time search bar.
3. **Verify**: Milestone progress bars on each deal row.

### Test I-3: Create Deal — Route A (Wadaan Plot Sale / Direct Inventory)
1. Click **"+ New Deal"**.
2. **Step 1 (Client)**: Select `Tariq Mehmood`.
3. **Step 2 (Route)**: Select **"Wadaan Sale"**.
   - Total Contract Value: `PKR 6,000,000`
4. **Step 3 (Payment Schedule)**:
   - Click helper **"Single Lump Sum"** — auto-generates 1 invoice for `PKR 6,000,000`.
   - **Verify**: Banner shows `"✓ PERFECT MATCH"` — schedule total equals contract value.
5. Click **"+ Initialize Deal Contract"**.
6. **Expected**:
   - Deal appears in the table with `WADAAN_SALE` type badge.
   - GL: DR `1100 AR` / CR `4000 Sales Revenue` for `PKR 6,000,000`.

### Test I-4: Create Deal — Route A — Two-Installment Schedule
1. **"+ New Deal"** for a new client (register inline):
   - Full Name: `Chaudhry Aslam`, Phone: `0300-5554433`.
   - Click **"Save & Select Client"**.
2. Route: **"Wadaan Sale"**, Total: `PKR 8,000,000`.
3. **Step 3**: Manually add 2 installments:
   - Installment 1: `PKR 4,000,000`, Due: Today
   - Installment 2: `PKR 4,000,000`, Due: 30 days from now
4. **Verify**: Banner shows `"✓ PERFECT MATCH"`.
5. **Negative Test**: Change Installment 2 to `PKR 3,000,000`.
6. **Verify**: Banner turns red: `"Schedule mismatch — sum does not match contract value"`. Cannot submit.
7. Correct to `PKR 4,000,000` and submit.

### Test I-5: Create Deal — Route B (Construction Contract)
1. **"+ New Deal"** for `Chaudhry Aslam`.
2. Route: **"Construction"**.
   - **Linked Project**: `Wadaan Heights` — this magic link enables gross margin tracking.
   - Total Value: `PKR 16,000,000`.
3. **Step 3**: Click **"4 Quarters"** helper.
   - **Verify**: Auto-generates 4 milestones of `PKR 4,000,000` each.
   - **Verify**: `"✓ PERFECT MATCH"`.
4. Submit.
5. **Expected**:
   - GL: DR `1100 AR` / CR `4000 Construction Revenue` (`tagged with projectId` for margin analysis).
   - Deal type badge: `CONSTRUCTION` (purple).
   - `Wadaan Heights` on Screen 4 now shows the Client Construction Banner.

### Test I-6: Create Deal — Route C (Brokerage)
1. **"+ New Deal"** for `Tariq Mehmood`.
2. Route: **"Brokerage"**.
   - Total Deal Value: `PKR 10,000,000`
   - Wadaan Commission: `PKR 200,000` (2%)
3. **Verify**: Live Split Preview shows:
   - `Earned Revenue (4000) = PKR 200,000`
   - `Seller Escrow Liability (2200) = PKR 9,800,000`
4. **Step 3**: Lump sum `PKR 10,000,000`.
5. Submit.
6. **Expected**:
   - GL: DR `1100 AR` `10,000,000` / CR `4000 Brokerage Commission` `200,000` / CR `2200 Escrow Liability` `9,800,000`.
   - Deal type badge: `BROKERAGE` (emerald).

### Test I-7: File Transfer (Resale)
1. In the Deal Hub table, find the `Tariq Mehmood` Wadaan Sale deal.
2. Click **"Transfer"** action.
3. **Transfer File Modal**:
   - **New Assignee**: Select `Chaudhry Aslam`.
   - **Transfer Fee**: `PKR 50,000`.
4. Click **"Execute File Transfer"**.
5. **Expected**:
   - Deal ownership shifts to `Chaudhry Aslam`.
   - `PKR 50,000` Transfer Fee recognized as Revenue in `4000`.
   - GL: DR `1100 AR (Chaudhry)` / CR `4000 Transfer Fee Revenue` `50,000`.

### Test I-8: Customer Khaata Drawer — Full Portfolio View
1. Click **"Khaata"** on `Chaudhry Aslam`.
2. **Verify**: `CustomerKhaataDrawer` slides in from right.
3. **Verify**: Animated pulsing skeleton loader appears during data fetch.
4. **Verify**: **Mobilization Advance Wallet** card is prominently displayed.
5. **Verify**: For Chaudhry (no advances yet): Wallet shows `PKR 0` with guidance notice: `"No advance balance. Mobilization receipts and overpayments will appear here."` The "Apply Advance" form is hidden.
6. **Verify**: Active contracts listed with total value and milestone payment schedules.
7. **Verify**: Milestone status badges: `UNPAID` (slate), `PARTIAL` (amber), `PAID` (emerald), `PENDING_CLEARANCE` (blue).
8. **Verify**: Chronological receipt history at the bottom.

### Test I-9: Client Switch State Reset
1. While viewing `Chaudhry Aslam`'s Khaata, click to view `Tariq Mehmood`'s Khaata.
2. **Expected**: Drawer content **resets cleanly** to Tariq Mehmood's data — no previous client's data bleeds through.

### Test I-10: Overdue Milestone Red Alert
1. Create a deal with a milestone due date in the **past** (manually set a past date).
2. In the Deal Table, verify that the overdue milestone highlights **bright red** to signal a recovery call is needed.

### Test I-11: Construction Site Cost & Margin Panel
1. Open `Chaudhry Aslam`'s Khaata (has a Construction deal linked to Wadaan Heights).
2. **Verify**: A **"Construction Site"** card appears inside the Khaata drawer:
   - Site Reference: `Site: Wadaan Heights (WH)`.
   - **Client Paid**: Collected funds.
   - **Site Spent (WIP)**: Total bills charged to Wadaan Heights.
   - **Net Cash Margin**: Green (positive) or Red (negative).
3. Post additional bills to Wadaan Heights to push WIP costs above client payments.
4. **Expected**: Net Cash Margin turns **red** — signaling the site is cash-flow negative.

---

## 💵 MODULE 3b: CASH & CHEQUE GATEWAY (Screen 9 — `/receipts`)

### Test J-1: Screen Layout
1. Navigate to `/receipts`.
2. **Verify**: Left/top area has **FastInflowForm** (customer picker, invoice selection, method, amount).
3. **Verify**: Right/bottom area shows the **Cheque Waiting Room** table (empty initially).

### Test J-2: Direct Cash Inflow — Against a Milestone
1. **Customer**: `Chaudhry Aslam`.
2. **Select Invoice(s)**: Check Milestone 1 of the Wadaan Sale deal (`PKR 4,000,000`).
3. **Amount**: `PKR 4,000,000`.
4. **Method**: `CASH`.
5. Click **"Record Inflow Receipt"**.
6. **Expected**:
   - Receipt posts immediately (CASH clears instantly — no waiting room).
   - Invoice status updates to `PAID`.
   - GL: DR `1010-01 Office Safe` `4,000,000` / CR `1100 AR` `4,000,000`.
   - **"Print A4 Receipt"** button appears.
7. Click **"Print A4 Receipt"**.
8. **Verify**: Dual-copy A4 receipt with Customer Original (top) and Wadaan Accounts Copy (bottom).

### Test J-3: Cheque Inflow — Routed to Waiting Room
1. **Customer**: `Chaudhry Aslam`.
2. **Invoice**: Milestone 2 (`PKR 4,000,000`).
3. **Method**: `CHEQUE`.
4. **Cheque/Leaf Number**: `CHQ-MEEZAN-880011` (mandatory).
5. **Amount**: `PKR 4,000,000`.
6. Click **"Record Inflow Receipt"**.
7. **Expected**:
   - Receipt does NOT immediately hit the bank GL.
   - **Waiting Room Table** shows `CHQ-MEEZAN-880011` with amber `PENDING` badge.
   - Milestone 2 status shows `PENDING_CLEARANCE` (not `PAID` yet).
   - Chaudhry's Khaata shows the milestone as `In Escrow`.

### Test J-4: Cheque Inflow — Mandatory Reference Lock
1. Try recording a CHEQUE receipt WITHOUT entering a cheque number.
2. **Expected**: Form blocks submission. "Cheque/leaf number is required for cheque payments."

### Test J-5: Online Transfer Inflow
1. **Customer**: `Tariq Mehmood`.
2. **Invoice**: Any outstanding milestone.
3. **Method**: `ONLINE`.
4. **UTR / Bank Ref**: `UTR-HBL-5544` (mandatory).
5. **Amount**: `PKR 1,000,000`.
6. Click **"Record Inflow Receipt"**.
7. **Expected**: Online transfer clears directly (no waiting room). GL: DR `1030-01 HBL` / CR `1100 AR`.

### Test J-6: Advance Mobilization Wallet Inflow (No Invoice Selected)
1. **Customer**: `Tariq Mehmood`.
2. **Invoice Selection**: **Leave ALL invoices unchecked** (no milestone selected).
3. **Method**: `ONLINE`.
4. **UTR**: `UTR-HBL-7799`.
5. **Amount**: `PKR 1,500,000`.
6. Click **"Record Inflow Receipt"**.
7. **Expected**: Notice: `"Deposited PKR 1,500,000 into Mobilization Advance Wallet"`.
8. Navigate to `/deals`, find Tariq Mehmood, click **"Khaata"**.
9. **Verify**: Mobilization Advance Wallet shows `PKR 1,500,000` (not zero).
10. **Verify**: The **"Apply Advance to Unpaid Installment"** form is now visible.
11. Select an unpaid milestone, enter `PKR 500,000`, click **"Apply"**.
12. **Expected**:
    - Wallet balance drops to `PKR 1,000,000`.
    - GL: DR `2100 Customer Advance Liability` `500,000` / CR `1100 AR` `500,000`.
    - Milestone updates to `PARTIAL` status.

### Test J-7: Advance Application — Overpay Guard
1. Tariq's wallet has `PKR 1,000,000`.
2. Try applying `PKR 2,000,000` to a milestone.
3. **Expected**: Error — cannot apply more than the wallet balance AND cannot apply more than the milestone's remaining balance.

### Test J-8: Clear Cheque from Waiting Room
1. In the Waiting Room, find `CHQ-MEEZAN-880011`.
2. Click **"Clear"** action.
3. **Clearance Modal** opens:
   - Select **Depository Bank**: `1030-01 HBL Operations`.
   - Click **"Confirm & Clear Cheque"**.
4. **Expected**:
   - Cheque disappears from Waiting Room.
   - GL: DR `1030-01 HBL` `4,000,000` / CR `1020 Undeposited Funds/Escrow` `4,000,000`.
   - Milestone 2 status updates to `PAID`.
   - Chaudhry's Outstanding Balance decreases.

### Test J-9: Bounce a Cheque
1. Record a new CHEQUE receipt:
   - Customer: `Tariq Mehmood`, Method: CHEQUE, Ref: `CHQ-BOUNCE-99`, Amount: `PKR 500,000`.
2. In the Waiting Room, find `CHQ-BOUNCE-99`.
3. Click **"Bounce"** action.
4. **Red safeguard dialog**: `"Mark Cheque as Bounced? Revert invoices to unpaid status"`.
5. Click **"Confirm Bounce"**.
6. **Expected**:
   - Cheque removed from Waiting Room. Receipt flagged `BOUNCED`.
   - Any attached invoice/milestone reverts from `PENDING_CLEARANCE` back to `UNPAID`.
   - Tariq's outstanding balance restores.

### Test J-10: Cash Reversal Lock — Cannot Bounce Cash
1. For the cash receipt posted in Test J-2, verify there is NO "Bounce" action in the Waiting Room.
2. **Expected**: Cash receipts never appear in the Waiting Room. They are irreversible at this level.

---

## 📈 MODULE 4: MASTER REPORTS HUB (Screen 10 — `/reports`)

### Test K-1: Global Header & Date Range Controls
1. Navigate to `/reports`.
2. **Verify**: 5 sub-tabs visible: Executive Snapshot, Deal Margins, Project Cost Ledger, Office Overhead, Partner Drawings.
3. **Verify Global Controls**:
   - **Date Preset Buttons**: `This Month`, `Last Month`, `This Fiscal Year`, `All Time`, `Custom Range`.
   - **Start Date** and **End Date** HTML5 date inputs.
   - **Refresh All** button.
   - **"Export to PDF / Print"** button.

### Test K-2: Date Filter Propagation
1. Click **"All Time"** preset.
2. Switch to any sub-tab.
3. **Verify**: All data across all sub-tabs uses the same `All Time` date range.
4. Change to **"This Month"**.
5. Switch sub-tabs again.
6. **Verify**: All tabs respect the new `This Month` filter.

### Test K-3: Custom Date Range
1. Click **"Custom Range"**.
2. Set Start: `2026-09-01`, End: `2026-09-24`.
3. **Verify**: Data refreshes for the custom range across all tabs.

### Test K-4: Sub-Tab 1 — Executive Snapshot
1. Click sub-tab **"Executive Snapshot"**.
2. **Verify KPI Cards**:
   - **Total Liquid Cash**: Sum of all `10xx` GL accounts (bank + safe). Verify against the actual balances in Chart of Accounts.
   - **Client Funds Held**: Mobilization advances + escrow liabilities. Shows `"DO NOT SPEND"` alert.
   - **Total Receivables (AR)**: Sum of all unpaid milestone balances.
   - **Total Payables (AP)**: Sum of all pending vendor bill amounts.
3. **Verify Corporate True Net Income Waterfall**:
   - `Gross Deal Profit + Brokerage Commissions - General Office Overhead = Net Income`.
   - If no deals settled yet, Net Income may show negative (overhead without matching revenue).
4. **Verify Aging Radar**:
   - **Receivables**: Top 3 overdue customer invoices with `Days Overdue` count. Red badge if overdue.
   - **Payables**: Top 3 pending vendor bills with overdue duration. Amber badge.

### Test K-5: Sub-Tab 1 — Read-Only Absolute Verification
1. On the Executive Snapshot, try to click on any number to edit it.
2. **Expected**: No edit mode. No input fields. No save buttons. **Completely read-only**.

### Test K-6: Sub-Tab 2 — Deal Margins Matrix
1. Click sub-tab **"Deal Margins"**.
2. **Verify Table Columns**: Deal #, Deal Type, Customer Name, Project, Total Value, Collected Revenue, Project Cost, Gross Profit, Margin %.
3. **Verify Deal Type Badges**:
   - `WADAAN_SALE`: Blue badge
   - `CONSTRUCTION`: Purple badge
   - `BROKERAGE`: Emerald badge
4. For the `Chaudhry Aslam` Construction deal (linked to Wadaan Heights):
   - **Project Cost**: Shows total WIP bills charged to Wadaan Heights.
   - **Gross Profit**: Collected Revenue minus Project Cost.
   - **Margin %**: Percentage computed dynamically.
5. For an active Construction deal with no payments received:
   - **Revenue Billed**: Shows `—` (not zero, but dash — WIP asset protection).
   - **Gross Profit**: Shows `—`.
   - **Margin %**: Shows italic slate `"In Progress"` (no premature profit recognition).

### Test K-7: Sub-Tab 2 — Deal Margin Drill-Down Drawer
1. Click any deal row (e.g., `Chaudhry Aslam` Construction).
2. **Expected**: `DealMarginDetailDrawer` slides in from the right with itemized financial breakdown.
3. **Verify**: Shows itemized bills, payment milestone receipts, and cost allocations.
4. Press `Escape`.
5. **Expected**: Drawer closes.

### Test K-8: Sub-Tab 3 — Project Cost Ledger (Construction Ledger)
1. Click sub-tab **"Project Cost Ledger"**.
2. **Verify**: A **"Select Project"** dropdown is visible.
3. Select `Wadaan Heights`.
4. **Verify Table Columns**: Date, Vendor/Payee, Invoice #, Material Description, Quantity, Unit Price, Line Total Amount.
5. **Verify**: All bills tagged to `Wadaan Heights` appear in chronological order.
6. **Verify**: **Summary Footer** at the bottom shows `Total Project Cost: PKR X` in bold JetBrains Mono typography.
7. Switch to `OPF Villa`.
8. **Expected**: Data refreshes to show only OPF Villa bills. If no bills, empty state is shown gracefully.

### Test K-9: Sub-Tab 4 — Office Overhead Ledger
1. Click sub-tab **"Office Overhead"**.
2. **Verify Table Columns**: Date, Vendor/Payee, Invoice #, Payment Status (Paid/Partial/Unpaid), Grand Total.
3. **Verify**: Only bills where `projectId IS NULL` appear (the `PETROL-4421` Generator Diesel bill should be here; `INV-STEEL-101` WIP bill should NOT be here).
4. **Verify**: Summary Footer shows `Total Overhead Expenses`.

### Test K-10: Sub-Tab 5 — Partner Drawings (Equity Ledger)
1. Click sub-tab **"Partner Drawings"**.
2. **Verify**: Two sections:
   - **Arshad Khalil** (Account `3010` / `3010-01`): Lists draws.
   - **Zeeshan Yousafzai** (Account `3020`): Lists draws.
3. For any equity draws posted in the Journal (Test D-6 `3010-01` withdrawal), they should appear here.
4. **Verify**: Clean zero-balance empty state for a partner with no draws yet.
5. **Verify**: Bottom combined card shows **Grand Total Partner Drawings** in deep slate card with emerald amount.

### Test K-11: Sub-Tab 5 — Null Safety for Unprovisioned Accounts
1. If `3020` (Zeeshan) account does not exist in the COA, navigate to Partner Drawings.
2. **Expected**: No crash. Clean empty state renders gracefully.

### Test K-12: PDF / Print Export
1. From any active sub-tab, click **"Export to PDF / Print"**.
2. **Expected**: Browser print preview dialog opens.
3. **Verify**: Application chrome (sidebar navigation, top nav, tab buttons, date filters) is completely **hidden** in print output.
4. **Verify**: Only the active tab's data is isolated and printed.
5. **Verify**: Executive print header shows: `Wadaan Real Estate & Builders (Pvt) Ltd.`, report title, date range, and generation timestamp.

---

## 📋 MODULE: DOCUMENT ARCHIVE (Screen — `/documents`)

### Test L-1: Document Archive Overview
1. Navigate to `/documents`.
2. **Verify**: Three document type tabs: All Documents, Payment Vouchers (CPV), Direct Expense Receipts (DPR), Inflow Receipts (REC).
3. **Verify**: All previously generated CPVs, DPRs, and RECs appear in the archive list.

### Test L-2: Search by Voucher Number
1. Type `CPV-` in the search bar.
2. **Expected**: Only Cash Payment Vouchers visible.
3. Type the cheque number used in Test H-6 (`CHQ-HBL-991122`).
4. **Expected**: The specific CPV for that payment appears.

### Test L-3: Filter by Document Type
1. Click **"Payment Vouchers (CPV)"** tab.
2. **Expected**: Only CPV documents visible.
3. Click **"Direct Expense Receipts (DPR)"** tab.
4. **Expected**: Only DPR documents (DIRECT_CASH bills) visible.
5. Click **"Inflow Receipts (REC)"** tab.
6. **Expected**: Only customer receipt documents visible.

### Test L-4: Date Range Filter
1. Set Start: `2026-09-01`, End: `2026-09-30`.
2. **Expected**: Only documents from September 2026 visible.

### Test L-5: Re-Print Document (Zero Roundtrip)
1. Find any document in the archive.
2. Click **"Print"**.
3. **Expected**: Print dialog opens **immediately** with the full document — no loading spinner or secondary API call needed (print payload is self-contained in the archive response).

---

## 💼 MODULE: PERSONAL FINANCE LEDGER (Screen 11 — `/personal`)

### Test M-1: Dashboard KPI Strip
1. Navigate to `/personal`.
2. **Verify**: 4 KPI cards:
   - **Total Lent (Given)**: Total outstanding money owed to us.
   - **Total Borrowed (Received)**: Total outstanding money we owe to others.
   - **Net Balance Position**: Color-coded (emerald = net receivable, red = net payable).
   - **Ledger Accounts**: Count of registered contacts.
3. With a fresh database, all cards should show `PKR 0`.

### Test M-2: Register a Personal Contact
1. Click **"+ Register Contact"**.
2. Fill in:
   - Full Name: `Arshad Sir`
   - Phone: `0300-1122334`
   - Relationship: Select `Partner / Director`
   - Private Notes: `Company Co-Founder Personal Ledger`
3. Click **"Register Contact"**.
4. **Expected**: Contact card appears in the grid showing `0 active loans` and `Settled` net balance.

### Test M-3: Register a Second Contact (Borrowed Direction)
1. Register: Full Name: `Zeeshan Sir`, Phone: `0311-9988776`, Relationship: `Partner`.

### Test M-4: Real-Time Search & Category Filters
1. Type `Arshad` in the search bar.
2. **Expected**: Only `Arshad Sir` card visible.
3. Clear search.
4. Click the **"Receivable (They Owe Us)"** filter tab.
5. **Expected**: No contacts shown (no loans yet).
6. Click **"All"** to restore.

### Test M-5: Record a Loan GIVEN (We Lent Money)
1. Click **"Open Ledger"** on `Arshad Sir` → navigates to `/personal/[id]`.
2. Click **"+ Record New Loan"**.
3. Fill:
   - **Direction**: Select **GIVEN (We Lent)** — Amber badge.
   - **Principal Amount**: `PKR 500,000`
   - **Transaction Date**: Today
   - **Description**: `Emergency personal bridge advance`
4. Click **"Record Loan"**.
5. **Verify**:
   - Loan entry appears with Amber **`GIVEN`** badge, Red **`OUTSTANDING`** status.
   - Principal: `PKR 500,000`, Remaining: `PKR 500,000`.
   - Contact Net Position updates to `+PKR 500,000 (Owes Us)`.
   - **Zero GL impact**: Check Screen 2 or Trial Balance — no journal entries were created.

### Test M-6: Record a Loan RECEIVED (They Lent Us Money)
1. Go to `Zeeshan Sir`'s ledger.
2. **"+ Record New Loan"**, Direction: **RECEIVED (We Borrowed)** — Blue badge.
3. Amount: `PKR 300,000`, Description: `Project bridge loan from partner`.
4. Submit.
5. **Verify**:
   - Blue `RECEIVED` badge, Red `OUTSTANDING` status.
   - Net Position: `−PKR 300,000 (We Owe)` (red badge).

### Test M-7: Partial Repayment
1. On `Arshad Sir`'s `PKR 500,000` loan, click **"+ Repayment"**.
2. **Repayment Modal**:
   - Remaining balance displays: `PKR 500,000`.
   - Enter Amount: `PKR 200,000`
   - Repayment Date: Today
   - Notes: `Cash repayment returned at office`
3. Click **"Apply Repayment"**.
4. **Verify**:
   - Loan status changes to Amber **`PARTIAL`**.
   - Remaining balance decrements to `PKR 300,000`.
   - Expand loan row → Repayment history shows `PKR 200,000` entry with date and note.
   - Contact Net Position updates to `+PKR 300,000`.

### Test M-8: Repayment Exceeds Outstanding — Guard
1. Loan remaining balance is `PKR 300,000`.
2. Try entering Repayment Amount: `PKR 400,000`.
3. **Expected**: API returns `400 REPAYMENT_EXCEEDS_OUTSTANDING`. Frontend shows inline error.

### Test M-9: "Pay Full Remaining" Shortcut
1. Click **"+ Repayment"** on the `PKR 300,000` remaining loan.
2. Click **"Pay Full Remaining"** button.
3. **Verify**: Amount input auto-fills `PKR 300,000` exactly.
4. Notes: `Bank transfer to personal account`.
5. Click **"Apply Repayment"**.
6. **Verify**:
   - Loan status changes to Emerald **`SETTLED`**.
   - Remaining balance: `PKR 0`.
   - **"+ Repayment" button disappears** for this settled loan.
   - Contact Net Position: `Settled` (slate badge).

### Test M-10: Repayment on Settled Loan — Block
1. Try to add another repayment to the now-settled loan via the API: `POST /api/v1/personal/loans/:loanId/repayments`.
2. **Expected**: HTTP `400 LOAN_ALREADY_SETTLED`.

### Test M-11: Update Contact Information
1. On `Arshad Sir`'s detail page, find the Edit button.
2. Update phone to: `0300-9988000`.
3. Save.
4. **Expected**: Phone updates immediately.

### Test M-12: Delete Contact — Cascade
1. Register a test contact: `Test Contact`, no loans.
2. Delete the contact.
3. **Expected**: Contact removed. No error (cascade works on empty).
4. Register another test contact with one loan.
5. Delete the contact.
6. **Expected**: Contact AND the loan (and any repayments) are cascade-deleted.

---

## 🔗 CROSS-MODULE INTEGRATION TESTS

### Test N-1: Full Accounting Cycle — Verify GL Balance After Each Step
After running all tests above, navigate to `/trial-balance` → **"All Time"**.

**Critical Verification**:
- **Grand Total Debit MUST EQUAL Grand Total Credit** (the mathematical proof of double-entry integrity).
- If `"Out of Balance"` appears with any amount difference, there is a bug in a controller — stop and investigate.

### Test N-2: WIP → Revenue Realization Cross-Link
1. Verify `Wadaan Heights` WIP balance on Screen 4 vs Screen 10 Project Cost Ledger.
2. Both should show the **identical** total for bills tagged to Wadaan Heights.
3. On Deal Margins tab (Screen 10), the `Chaudhry Aslam` construction deal's `Project Cost` column should match Wadaan Heights' total WIP spend.

### Test N-3: Dashboard Snapshot vs. Account Balances Cross-Verification
1. Note **Total Liquid Cash** on the Executive Dashboard (`/dashboard`).
2. Navigate to `/accounts`, sum all `ASSET` accounts with codes beginning `10xx` (liquid cash accounts).
3. **Expected**: Both figures match exactly.

### Test N-4: Receivables Cross-Check (Deals ↔ Dashboard ↔ Reports)
1. Note `Total Receivables (AR)` on the Dashboard.
2. Note `Total Receivables (AR)` on Screen 10 Executive Snapshot.
3. **Expected**: Both match exactly (they share the same API endpoint `GET /api/v1/reports/snapshot`).
4. Manually sum all unpaid + partial milestone `amount - paidAmount` values across all active deals.
5. **Expected**: Matches the AR figure.

### Test N-5: Escrow Isolation Verification
1. Note **Client Funds Held** on the dashboard.
2. Navigate to `/accounts`, find `2100 Customer Advances` and `2200 Escrow Holdings`.
3. Sum these liability balances.
4. **Expected**: Matches "Client Funds Held" on the dashboard (not included in Liquid Cash).
5. **Verify**: These funds are clearly labeled "DO NOT SPEND" — never mixed with operational cash.

### Test N-6: Cheque Waiting Room Dashboard Widget
1. Navigate to `/dashboard`.
2. Find the **Cheque Waiting Room** bottom strip card.
3. **Verify**: Any pending uncleared cheques from Screen 9 appear here.
4. Verify Empty State: After clearing all cheques, shows `✓ All cheques cleared` icon.
5. **Verify**: The widget polls every 30 seconds (open two tabs and clear a cheque in one — observe the dashboard widget update within 30 seconds).

### Test N-7: Project Budget Burn in Dashboard vs. Screen 4
1. On Dashboard's **Active Projects** bottom card, note each project's budget burn percentage.
2. Navigate to Screen 4 (`/projects`).
3. **Verify**: The same percentages and health bar colors (green/amber/red) match between Dashboard and Screen 4.

### Test N-8: Document Archive Completeness
After all tests, navigate to `/documents`:
- **Verify**: A CPV exists for every vendor payment made in Tests H-5, H-6, H-7.
- **Verify**: A DPR exists for the Direct Cash bill made in Test G-6.
- **Verify**: A REC exists for every customer receipt made in Tests J-2 through J-6.
- **Verify**: Re-printing any of these from the archive produces the correct document.

### Test N-9: Session Expiry During Active Operations
1. Log in. Start filling out a new bill on Screen 5 (don't submit).
2. In a different tab, call `POST /api/v1/auth/logout`.
3. Return to Screen 5, try to click "Post Bill".
4. **Expected**: The API call returns `401 UNAUTHORIZED`. Frontend intercepts and redirects to `/login`.
5. No partial/orphaned bill should have been saved.

---

## 🔒 SECURITY & EDGE CASE TESTS

### Test O-1: CSRF Protection (SameSite Cookie)
- The JWT `token` cookie is `SameSite: Strict`.
- Attempting cross-origin API calls from a different origin (e.g., `http://evil.com`) will not include the cookie.
- **Expected**: All cross-origin requests return `401 UNAUTHORIZED`.

### Test O-2: Direct API Access Without Authentication
1. In a fresh incognito window (no cookies), call any API directly:
   - `GET http://localhost:4000/api/v1/accounts`
   - `GET http://localhost:4000/api/v1/deals`
   - `GET http://localhost:4000/api/v1/reports/snapshot`
2. **Expected**: All return `HTTP 401 Unauthorized`.

### Test O-3: Floating-Point Precision
1. Create a brokerage deal: Total `PKR 100.10`, Commission `PKR 200.20`.
2. Verify the escrow split: `100.10 + 200.20` should compute to exactly `300.30` — not `300.29999999995`.
3. **Expected**: All financial computations use `decimal.js`. No floating-point errors in any report.

### Test O-4: Accounting Guardrail — Both Debit & Credit on One Line
- `POST /api/v1/journals` with a line having both `debitAmount: 1000` and `creditAmount: 500`.
- **Expected**: HTTP `400 Bad Request` — "Line cannot contain both debit and credit."

### Test O-5: Large Number Precision
1. Create a deal with Total Contract Value: `PKR 999,999,999,999.99` (near the 15-digit DB column limit).
2. **Expected**: Value is stored and displayed correctly without truncation or rounding.

### Test O-6: Empty State Graceful Rendering
1. With a fresh database after reset, navigate to each screen before any data exists:
   - `/accounts` → Shows COA from initialization but no activity.
   - `/projects` → Shows project cards from initialization.
   - `/deals` → Empty state message, no crash.
   - `/receipts` → Empty form and empty Waiting Room, no crash.
   - `/reports` → All KPIs show `PKR 0`, no crash.
   - `/personal` → "No contacts registered" empty state, no crash.
   - `/documents` → "No documents found" empty state, no crash.

### Test O-7: Database Constraint — Referential Integrity
1. Try to delete a vendor (`Ali Hardware`) that has existing bills via the API.
2. **Expected**: `HTTP 409` or `500` — PostgreSQL `onDelete: Restrict` blocks deletion. The vendor cannot be deleted while it has linked bills.
3. Try to delete a customer with linked deals.
4. **Expected**: Same restriction enforced.

### Test O-8: Concurrent Double Initialization
- Simultaneously send two `POST /api/v1/system/initialize` requests (race condition test).
- **Expected**: Only one succeeds with `200 OK`. The other returns `409 ALREADY_INITIALIZED`. No duplicate accounts/users/settings created. The Prisma `$transaction` atomicity prevents partial state.

---

## ⚡ AUTOMATED TEST SUITE VERIFICATION

After completing all manual tests, run the full automated suite to confirm no regressions:

```powershell
# Run all backend tests (56 tests across 9 suites)
npm test --prefix backend

# Run specific report service tests
npm test --prefix backend -- src/__tests__/report.service.test.ts

# Run frontend report page tests
npx vitest run --root frontend "src/app/(dashboard)/reports/page.test.tsx" "src/features/reports/hooks/useReports.test.tsx"
```

**Expected**: All tests pass. Any failure after the manual testing session indicates a regression from the new data state.

---

## ✅ FINAL SIGN-OFF CHECKLIST

Before marking the system as fully verified, confirm each of the following:

| # | Verification Item | Status |
|---|---|---|
| 1 | `GET /api/v1/system/status` returns `isInitialized: true` | ☐ |
| 2 | Login with PIN `5555` redirects to dashboard | ☐ |
| 3 | Trial Balance shows **balanced books** (Debits = Credits) | ☐ |
| 4 | Chart of Accounts shows all seeded accounts with correct live balances | ☐ |
| 5 | Wadaan Heights project card shows correct WIP total | ☐ |
| 6 | Journal Entry Screen 2 blocks unbalanced entries | ☐ |
| 7 | Vendor Payment Run CPV prints successfully | ☐ |
| 8 | Cheque Waiting Room correctly routes CHEQUE vs CASH receipts | ☐ |
| 9 | Customer Khaata Wallet correctly tracks advance allocation | ☐ |
| 10 | Deal Margins tab shows correct Gross Profit & WIP protection | ☐ |
| 11 | Project Cost Ledger shows all project-tagged bills | ☐ |
| 12 | Overhead Ledger shows only `projectId IS NULL` bills | ☐ |
| 13 | Partner Drawings tab renders with null safety | ☐ |
| 14 | Personal Ledger has zero GL impact on corporate books | ☐ |
| 15 | Document Archive re-prints all 3 document types correctly | ☐ |
| 16 | Idle 15-minute session timeout redirects to `/login` | ☐ |
| 17 | All automated backend tests pass (56/56) | ☐ |
| 18 | All automated frontend report tests pass (13/13) | ☐ |

---

*Generated: 2026-09-24 | Wadaan Real Estate ERP v3.2.0 | Full system coverage: Screens 0–11, Modules 0–4*
