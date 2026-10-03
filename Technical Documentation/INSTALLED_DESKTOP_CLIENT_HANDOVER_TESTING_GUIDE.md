# 🏢 Wadaan Real Estate & Builders ERP
## Master Installed Desktop Application Acceptance & Client Handover Verification Guide
**Version:** 4.2.0-PROD  
**Target Environment:** Standalone Windows Executable (`Wadaan-ERP-Setup-1.0.0.exe`) installed on Client PC/Laptop  
**Runtime Architecture:** Statically Compiled Next.js 16 SPA + Embedded Express 5 API (`127.0.0.1:4000`) + Cloud Supabase PostgreSQL  
**Audit Purpose:** Exhaustive End-to-End Functional, Accounting, Edge Case, Hardware & Desktop OS Acceptance Testing Prior to Client Handover

---

## 📌 Executive Summary & Pre-Handover Objectives

This testing guide is **specifically designed for the installed Windows desktop application** on the client's PC. Unlike local web development testing on `localhost:3000`, this protocol verifies the actual packaged binary, local process supervision, native Windows print spooler routing, loopback HTTP session persistence, offline network interruption handling, and complete double-entry accounting integrity.

By executing this guide step-by-step, you guarantee that:
1. **Zero Runtime Crashing:** The desktop executable boots cleanly without white screen flashes, port 4000 collisions, or missing database drivers.
2. **Double-Entry Mathematical Perfection:** General Ledger equation ($\text{Assets} = \text{Liabilities} + \text{Equity} + (\text{Revenue} - \text{Expenses})$) holds with zero rounding discrepancies across all transactions.
3. **Ironclad Cash & Cheque Security:** Cheques are locked in the Waiting Room until physically cleared; bounced cheques reverse cleanly with zero ledger contamination.
4. **Real Estate Business Workflows:** Multi-client co-ownership, milestone installment tracking, direct inventory cost deductions, construction WIP margins, and 1-click legal file transfers operate without flaws.
5. **Native Desktop Hardware Experience:** Cash Payment Vouchers (CPV) and Cash Receipts print dual-copy A4 layouts with perforated tear dividers directly to the Windows printer spooler.
6. **Air-Tight Corporate Firewall:** Personal director loans in Screen 11 never leak into corporate books or financial reports.

---

## 📋 Master Verification Progress Tracker

| Phase | Module / System Layer | Total Test Cases | Edge Cases Covered | Verification Status |
|:---:|:---|:---:|:---:|:---:|
| **00** | **Installation & OS Environment Verification** | 6 Cases | Desktop shortcut, single-instance lock, taskkill cleanup | `[ ] PENDING` |
| **01** | **First-Time Boot & Go-Live Setup Wizard** | 7 Cases | 6-step setup, opening balances, recovery key generation | `[ ] PENDING` |
| **02** | **Authentication Vault, Numpad & Security** | 10 Cases | Numpad capture, progressive lockouts, sliding session | `[ ] PENDING` |
| **03** | **Chart of Accounts & Live Balances** | 8 Cases | 3-tier deletion guard, FY toggle, ledger drawer print | `[ ] PENDING` |
| **04** | **General Journal & Double-Entry Engine** | 9 Cases | Zero-sum lock, single-line reject, audit reversal JV | `[ ] PENDING` |
| **05** | **Live Trial Balance & Timezone Integrity** | 8 Cases | Cumulative vs period bounds, PKT timezone safety | `[ ] PENDING` |
| **06** | **Construction WIP & Project Site Ledger** | 8 Cases | Master BOQ variance, prefix uniqueness, site dossier | `[ ] PENDING` |
| **07** | **Supplier Payables, FIFO Run & CPV Printing** | 12 Cases | Accrual vs direct pay, no-overpay guard, dual-copy CPV | `[ ] PENDING` |
| **08** | **Deal Hub, 3 Routes & Co-Buyer Khaata** | 14 Cases | Route A inventory cost, co-buyers, file transfer lock | `[ ] PENDING` |
| **09** | **Fast Inflows, Cheque Waiting Room & Receipts** | 11 Cases | Instant cash, cheque lock, bank clearance, bounce revert | `[ ] PENDING` |
| **10** | **Owned Asset Inventory & Resale Buyback** | 8 Cases | Category badges, auto-sold trigger, buyback clone | `[ ] PENDING` |
| **11** | **Master Reports Hub & Executive Analytics** | 10 Cases | True Net Income waterfall, aging radar, partner draws | `[ ] PENDING` |
| **12** | **Central Document Archive & 1-Click Reprint** | 6 Cases | Unified search, voucher/receipt history, reprint IPC | `[ ] PENDING` |
| **13** | **Personal Finance Ledger & Firewall** | 7 Cases | Off-balance-sheet loans, partial repayments, zero GL | `[ ] PENDING` |
| **14** | **Hardware, Windows Spooler & Network Resilience**| 8 Cases | Offline banner, physical print/PDF, sudden restart | `[ ] PENDING` |
| **15** | **Cross-Module Forensic Balance Sheet Proof** | 5 Cases | Mathematical zero-sum audit, reconciliation proofs | `[ ] PENDING` |
| **16** | **Final Handover Sanitization & Client Sign-Off** | 4 Options | Client data preservation vs clean Go-Live cutover | `[ ] PENDING` |

---

## 🖥️ PHASE 0: Desktop Executable Installation & OS Environment

Before testing business workflows, verify the Windows installer integrity and process lifecycle.

### Test 0.1: Installation from `.exe`
- [ ] **Action:** Double-click `Wadaan-ERP-Setup-1.0.0.exe` on the PC.
- [ ] **Observe:**
  - Standard NSIS setup window opens with "Wadaan Real Estate & Builders ERP Setup".
  - Destination folder defaults to `C:\Users\<User>\AppData\Local\Programs\Wadaan Real Estate & Builders ERP` (or `Program Files` if run as administrator).
  - Completes with progress bar and offers "Launch Wadaan Real Estate & Builders ERP".
- [ ] **Expected:** Installs cleanly without Windows SmartScreen fatal blocks (if SmartScreen appears, click "More info" -> "Run anyway").

### Test 0.2: Shortcuts & Branding
- [ ] **Action:** Check Windows Desktop and Start Menu.
- [ ] **Verify:**
  - Desktop shortcut created with high-resolution Wadaan brand icon (`icon.ico`).
  - Shortcut name: `Wadaan Real Estate & Builders ERP`.
  - Start Menu entry exists under Wadaan folder with uninstall shortcut.

### Test 0.3: Cold Launch & Dark Splash Window
- [ ] **Action:** Launch the application from the desktop shortcut.
- [ ] **Observe:**
  - Window opens sized at `1440x900` centered on the monitor.
  - Background color is deep brand slate `#0F172A` (zero white screen flash during boot).
  - Title bar displays: `Wadaan Real Estate & Builders - ERP`.
  - Embedded Express API initializes silently in the background on `http://127.0.0.1:4000`.
  - Within 2-4 seconds, the application UI displays.

### Test 0.4: Single-Instance Lock (Port Collision Prevention)
- [ ] **Action:** While the ERP application is open, double-click the desktop shortcut a second time.
- [ ] **Observe:**
  - A second application window DOES NOT open.
  - No error dialog appears regarding "Port 4000 already in use" or "EADDRINUSE".
  - The existing open application window immediately restores to the foreground and receives focus.

### Test 0.5: Task Manager Process Verification
- [ ] **Action:** Press `Ctrl + Shift + Esc` to open Windows Task Manager.
- [ ] **Look for:** `Wadaan Real Estate & Builders ERP.exe`.
- [ ] **Verify:** Memory usage is typically between 150MB - 350MB. CPU usage settles near 0% when idle.

### Test 0.6: Graceful Process Termination (Zero Zombie Processes)
- [ ] **Action:** Click the top-right `X` close button of the application window.
- [ ] **Check Task Manager:**
  - `Wadaan Real Estate & Builders ERP.exe` completely disappears within 2 seconds.
  - Zero orphaned background `node.exe` or API child processes remain running.
  - Re-launching the application immediately boots normally without port conflicts.

---

## 🚀 PHASE 1: First-Time Boot & Go-Live Setup Wizard (`StarterModal`)

> [!NOTE]
> If the database already contains initialized data, this modal will be bypassed directly to `/login`. To test the full setup wizard, use a clean database branch or inspect `/setup`.

### Test 1.1: Initial Setup Screen Detection
- [ ] **Initial State:** Launching the app on an uninitialized database navigates to `/login` with an **"Initial Setup Required"** banner or `/setup`.
- [ ] **Verify:**
  - Two buttons available: `[ Go-Live Wizard ]` and `[ Setup Admin Only ]`.
  - Background navigation is strictly locked.

### Test 1.2: Go-Live Wizard — Step 0 (Database Link)
- [ ] **Action:** Click `[ Go-Live Wizard ]`.
- [ ] **Observe:** Step 0 displays database connection status. If Supabase URL is already embedded in `.env`, it shows green indicator "Database Connected".
- [ ] **Click:** `Next →`.

### Test 1.3: Go-Live Wizard — Step 1 (Admin Setup)
- [ ] **Fields to Enter:**
  - Full Name: `Muhammad Jalal`
  - Email: `admin@wadaan.com.pk`
  - Master PIN: `5555`
- [ ] **Edge Case Verification:**
  - Try entering 3 digits (`555`): `Next` button remains disabled.
  - Try entering invalid email (`adminwadaan`): `Next` button remains disabled.
  - Enter full 4 digits `5555`: `Next` button turns active.
- [ ] **Click:** `Next →`.

### Test 1.4: Go-Live Wizard — Step 2 (Liquid Cash & Banks)
- [ ] **Enter Opening Balances:**
  - `Office Safe (Vault A)` (`1010-01`): `PKR 250,000`
  - `Habib Bank Ltd (HBL) Operations` (`1030-01`): `PKR 4,200,000`
  - `Meezan Bank Operations` (`1020-01`): `PKR 1,500,000`
- [ ] **Verify:** Total Liquidity dynamically displays: `PKR 5,950,000`.
- [ ] **Click:** `Next →`.

### Test 1.5: Go-Live Wizard — Step 3 (Active Construction Sites)
- [ ] **Add Site 1:**
  - Name: `Wadaan Heights` | Prefix: `WH` | Master BOQ: `PKR 60,000,000` | Spent to Date: `PKR 14,500,000`
- [ ] **Add Site 2:**
  - Click `+ Add Project`.
  - Name: `OPF Villa` | Prefix: `OPFV` | Master BOQ: `PKR 260,000,000` | Spent to Date: `PKR 0`
- [ ] **Edge Case Test:** Try giving Site 2 the same prefix `WH`.
  - Expected: Validation error warns of duplicate prefix code. Change back to `OPFV`.
- [ ] **Click:** `Next →`.

### Test 1.6: Go-Live Wizard — Step 4 (Pending Vendor Payables)
- [ ] **Add Vendor 1:**
  - Vendor Name: `Ali Hardware`
  - Phone: `0300-1234567`
  - Amount Due: `PKR 650,000`
  - Linked Site: `Wadaan Heights`
- [ ] **Click:** `Next →`.

### Test 1.7: Go-Live Wizard — Step 5 (Active Client Deals) & Launch
- [ ] **Add Client Deal:**
  - Client Name: `Tariq Mehmood`
  - Phone: `0312-9876543`
  - Project: `Wadaan Heights`
  - Deal Type: `WADAAN_SALE`
  - Total Deal Value: `PKR 12,000,000`
  - Amount Already Received: `PKR 4,000,000`
- [ ] **Click:** `Launch ERP 🚀`.
- [ ] **Observe Recovery Key Modal:**
  - A 16-character alphanumeric **Master Recovery Key** appears (e.g. `WADN-9K2M-7XP4-B8Q1`).
  - Click `Copy & Save Key`. System copies key to Windows clipboard.
  - Click `I Have Saved My Key — Enter ERP`.
- [ ] **Expected:** Redirected to `/dashboard`. System is permanently marked `isInitialized = true`.

---

## 🔐 PHASE 2: Authentication Vault, Numpad Capture & Security Locks (Screen 0)

### Test 2.1: Login Page UI & Default State
- [ ] **Action:** Log out via bottom sidebar button.
- [ ] **Verify:**
  - Centered Wadaan Real Estate & Builders emblem with deep slate `#0F172A` vault styling.
  - 4 PIN digit entry boxes with focus on the first box.
  - No public registration or sign-up link.
  - "Forgot PIN?" link visible below the boxes.

### Test 2.2: Laptop Numeric Keypad Direct Capture
- [ ] **Action:** Do NOT click on any input box. Directly type `5555` on the laptop keyboard or numpad.
- [ ] **Observe:**
  - Digits fill into the boxes automatically through the global key listener.
  - Upon typing the 4th digit (`5`), the form **auto-submits instantly** without needing to press Enter or click a button.
  - Fast-path HMAC verification completes in `<0.01ms`.
  - Redirects smoothly to `/dashboard`.

### Test 2.3: Wrong PIN Rejection
- [ ] **Action:** Log out. Type `1234`.
- [ ] **Expected:**
  - Red error banner: "Invalid PIN. Please try again."
  - Failed attempt counter increments: "Attempt 1 of 5".
  - PIN input fields automatically shake and reset.

### Test 2.4: Progressive Lockout — Tier 1 (5 Failed Attempts = 30s)
- [ ] **Action:** Rapidly enter wrong PINs 5 times: `1111`, `2222`, `3333`, `4444`, `6666`.
- [ ] **Expected:**
  - Lockout banner appears with a **30-second live countdown timer**.
  - All PIN entry inputs are disabled.
  - Try typing `5555` during lockout: inputs remain locked.
  - Wait 30 seconds: inputs automatically unlock and timer clears.

### Test 2.5: Progressive Lockout Escalation — Tier 2 (4 More Fails = 60s)
- [ ] **Action:** Enter wrong PINs 4 more times.
- [ ] **Expected:** Lockout escalates to a **60-second countdown**.

### Test 2.6: Lockout Persistence Across App Restart
- [ ] **Action:** During an active 60s lockout, close the application (`X`) and re-launch from Desktop.
- [ ] **Expected:** Lockout state is restored from the local database; timer resumes countdown from remaining seconds (cannot bypass lockout by restarting the app).

### Test 2.7: Tier Reset Upon Successful Authentication
- [ ] **Action:** After lockout expires, enter correct PIN `5555`.
- [ ] **Expected:** Login succeeds immediately.
- [ ] **Action:** Log out and enter 1 wrong PIN.
- [ ] **Verify:** Counter shows "Attempt 1 of 5" (tier correctly reset to baseline).

### Test 2.8: Desktop Loopback HttpOnly Cookie Verification
- [ ] **Action:** While logged in, open DevTools (`F12` or `Ctrl+Shift+I` if in dev mode, or verify via network requests).
- [ ] **Verify:** `token` cookie is stored with `SameSite=Strict`, `HttpOnly=true`, and is accepted over loopback `http://127.0.0.1:4000` without secure-cookie drop bugs.

### Test 2.9: 15-Minute Sliding Session Window
- [ ] **Action:** Log in. Inspect session cookie expiry (15 minutes from current time).
- [ ] **Action:** Click between `/projects` and `/accounts`.
- [ ] **Verify:** Each authenticated API response returns refreshed `Set-Cookie` header extending session by another 15 minutes. Session remains active as long as the user works.

### Test 2.10: Offline Master Recovery Key Reset Flow
- [ ] **Action:** On `/login`, click "Forgot PIN?".
- [ ] **Action:** Select "Use Emergency Master Recovery Key".
- [ ] **Enter:** 16-character recovery key saved in Phase 1 (e.g. `WADN-9K2M-7XP4-B8Q1`).
- [ ] **Enter New PIN:** `7777`, confirm `7777`.
- [ ] **Click:** `Reset PIN`.
- [ ] **Expected:** Success confirmation appears. Login with `7777` works. (Reset back to `5555` afterwards for convenience).

---

## 🏦 PHASE 3: Chart of Accounts & Dynamic Balance Engine (Screen 1 — `/accounts`)

### Test 3.1: Chart of Accounts Category Structure & KPIs
- [ ] **Action:** Navigate to `General Ledger` -> `Chart of Accounts` (`/accounts`).
- [ ] **Verify Top KPI Cards:**
  - **Total Assets** (Emerald card): Reflects sum of liquid safes, bank accounts, and capitalized WIP.
  - **Total Liabilities** (Red card): Reflects vendor AP, customer mobilization advances, and escrow holdings.
  - **Owner's Equity** (Slate card): Reflects opening capital minus distributions.
- [ ] **Verify 5 Accordion Categories:** `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`.

### Test 3.2: System-Locked Control Accounts Protection (Tier 1 Guard)
- [ ] **Inspect Locked Accounts:**
  - `1000` Cash and Liquid Assets
  - `1100` Accounts Receivable (AR)
  - `1200` Construction Work-in-Progress (WIP)
  - `2000` Accounts Payable (AP)
  - `2100` Customer Advances (Mobilization Wallet)
  - `2200` Escrow Holdings
  - `4000` Sales & Project Revenue
- [ ] **Verify:**
  - Each displays a locked padlock icon and a `System Locked` badge.
  - Click the `⋮` action menu: **"Delete Account" option is completely absent**.
  - Click "Edit Account": **Category dropdown is disabled** with warning: *"System accounts cannot change category to preserve ledger reconciliation."*

### Test 3.3: Create Custom Liquidity / Expense Account
- [ ] **Action:** Click `+ Add Account`.
- [ ] **Form Inputs:**
  - Code: `1020-03`
  - Name: `Meezan Bank - Project Escrow`
  - Category: `ASSET`
- [ ] **Click:** `Save Account`.
- [ ] **Expected:** Account appears in ASSET section with `PKR 0.00` balance and `Active` badge.

### Test 3.4: Duplicate Account Code Prevention (Client & Server)
- [ ] **Action:** Click `+ Add Account`.
- [ ] **Type Code:** `1020-03` (already used in Test 3.3).
- [ ] **Expected:** Immediate inline red alert: *"Account with code '1020-03' already exists."* Submit button is disabled before any API call is made.

### Test 3.5: Account Soft-Archive vs Permanent Purge (Tier 2 vs Tier 3 Guard)
- [ ] **Part A (Zero-History Hard Purge):**
  - On account `1020-03` (zero transactions), click `⋮` -> `Delete Account`.
  - Expected: Rose-colored dialog states *"No journal history. This account will be permanently deleted."*
  - Confirm: Account is permanently removed from the database.
- [ ] **Part B (Has-History Soft Archive):**
  - Pick an account with journal history (e.g. `1010-01 Office Safe`).
  - Click `⋮` -> `Delete Account`.
  - Expected: Amber warning dialog states: *"This account has transaction activity (Total Debits/Credits). To preserve historical double-entry integrity, this account will be soft-archived."*
  - Confirm: Account is archived (`isActive: false`), preserving all historical vouchers and ledger trails.

### Test 3.6: Fiscal Year Toggle Boundary
- [ ] **Action:** Toggle `This Fiscal Year` in the top right.
- [ ] **Observe:**
  - Date label displays current Pakistani fiscal year (`01 Jul 2026 — 30 Jun 2027`).
  - `REVENUE` and `EXPENSE` balances recalculate strictly for transactions within this fiscal window.
  - `ASSET`, `LIABILITY`, and `EQUITY` accounts remain cumulative from company inception (permanent balance sheet accounts).
- [ ] **Toggle Off:** All accounts return to all-time cumulative balances.

### Test 3.7: Slide-Out Account Ledger Drawer & Dynamic Running Balance
- [ ] **Action:** Find `1030-01 Habib Bank Ltd (HBL) Operations`, click `View Ledger` (or click the row).
- [ ] **Observe:** `AccountLedgerPanel` slides out smoothly from the right edge.
- [ ] **Verify 4 Summary Cards:**
  - `Opening Balance`
  - `Period Debits`
  - `Period Credits`
  - `Closing Balance`
- [ ] **Verify Ledger Table:**
  - Shows date, JV voucher number, description, debit, credit.
  - Dynamically computes running balance on every line.

### Test 3.8: Account Ledger Native Print Export
- [ ] **Action:** In the ledger drawer header, click the Printer icon.
- [ ] **Observe:** Native Windows Print Dialog opens.
- [ ] **Verify:** Print preview formats clean A4 letterhead with Wadaan branding, date range, summary cards, and removes all sidebar and screen navigation elements (`@media print` isolation).

---

## ✍️ PHASE 4: General Journal & Double-Entry Engine (Screen 2 — `/journals`)

### Test 4.1: Initial State & Auto-Voucher Sequencing
- [ ] **Action:** Navigate to `General Ledger` -> `Journal Entries` (`/journals`).
- [ ] **Verify:**
  - Next sequential voucher number is pre-filled (e.g. `JV-0001` or `JV-0002`).
  - Entry Date defaults to current date.
  - Exactly 2 line item rows are pre-rendered.

### Test 4.2: Mutual Exclusivity of Debit and Credit Fields
- [ ] **Action:** On Line 1, enter `50,000` into the **Debit** field.
- [ ] **Observe:** The **Credit** input on Line 1 is immediately cleared and disabled.
- [ ] **Action:** Enter `50,000` into the Credit field of Line 2.
- [ ] **Observe:** Debit input on Line 2 is immediately cleared and disabled.

### Test 4.3: Real-Time Zero-Sum Invariant ($\Delta = 0.00$)
- [ ] **Action:** Set Line 1 Debit to `50,000`. Leave Line 2 empty.
- [ ] **Observe:**
  - Red indicator displays: `Out of Balance` & `Diff: PKR 50,000.00`.
  - **"Post Journal Entry" button is strictly DISABLED**.
- [ ] **Action:** Set Line 2 Credit to `50,000`.
- [ ] **Observe:**
  - Indicator turns emerald green: `✓ Balanced`.
  - **"Post Journal Entry" button becomes ACTIVE (solid dark slate)**.

### Test 4.4: System-Locked Control Accounts Excluded from Dropdown
- [ ] **Action:** Click the Account selector dropdown on Line 1.
- [ ] **Verify:** Control accounts (`1100 AR`, `2000 AP`, `2100 Advance Wallet`, `2200 Escrow`) are **completely hidden**.
- [ ] **Explanation:** Prevents users from manually distorting automated sub-ledger balances without corresponding deal/bill instruments.

### Test 4.5: Post Standard Overhead Journal Entry
- [ ] **Fill Details:**
  - Description: `Head Office Generator Diesel & Utility Bill`
  - Line 1: Account `5100-01 Head Office Rent & Facility Utilities` | Debit: `35,000` | Credit: `0`
  - Line 2: Account `1010-01 Office Safe (Vault A)` | Debit: `0` | Credit: `35,000`
- [ ] **Click:** `Post Journal Entry`.
- [ ] **Verify:**
  - Success toast appears: "Journal Entry JV-XXXX posted successfully".
  - Form clears and voucher number advances to next sequential integer.
  - Entry appears at the top of the "Recent Journal History" table below.

### Test 4.6: Multi-Line Compound Journal Entry with Project Tagging
- [ ] **Post a Compound Entry:**
  - Description: `Direct Site Materials & Head Office Repairs Paid via Bank`
  - Line 1: `1200 Construction WIP` | Debit: `100,000` | Project: `Wadaan Heights` | Memo: `Steel binding wire`
  - Line 2: `5100-01 Facility Utilities` | Debit: `15,000` | Memo: `Office plumbing`
  - Line 3: `1030-01 HBL Operations` | Credit: `115,000`
- [ ] **Verify:** Total Debit (`115,000`) equals Total Credit (`115,000`).
- [ ] **Click:** `Post Journal Entry`. Entry posts cleanly.

### Test 4.7: Single-Line Journal Rejection (Negative Test)
- [ ] **Action:** Try submitting a journal with only 1 line (Debit `10,000`).
- [ ] **Expected:** UI blocks submission; backend schema strictly validates minimum 2 lines.

### Test 4.8: Reversal Engine (`[REVERSAL]` Mirror Voucher)
- [ ] **Action:** Find the compound entry in the Recent History table. Click the `Reverse Entry` button (curved arrow).
- [ ] **Observe Confirmation Dialog:** *"Generate an exact mirror reversing entry to neutralize this voucher?"*
- [ ] **Confirm:**
  - A new voucher is generated prefixed with `[REVERSAL]`.
  - Line 1: `1030-01 HBL Operations` is DEBITED `115,000`.
  - Line 2: `1200 Construction WIP` is CREDITED `100,000`.
  - Line 3: `5100-01 Facility Utilities` is CREDITED `15,000`.
  - Original entry is preserved (accounting immutability maintained).

### Test 4.9: Journal Immutability Guard
- [ ] **Verify:** There is NO "Edit" or "Delete" button on any posted journal entry. Double-entry accounting requires corrective entries rather than silent record deletions.

---

## ⚖️ PHASE 5: Live Trial Balance & Timezone Integrity (Screen 3 — `/trial-balance`)

### Test 5.1: Mathematical Zero-Sum Proof
- [ ] **Action:** Navigate to `General Ledger` -> `Trial Balance` (`/trial-balance`).
- [ ] **Verify:**
  - Top proof banner displays in emerald: `✓ Balances Match — Books are perfectly balanced`.
  - **Grand Total Debit** exactly equals **Grand Total Credit**.
  - Difference displays: `PKR 0.00`.

### Test 5.2: Dual Boundary Aggregation Proof (Balance Sheet vs P&L)
- [ ] **Action:** Select preset `This Month`.
- [ ] **Observe:**
  - Permanent Balance Sheet Accounts (`1010-01 Safe`, `1030-01 HBL`, `3000 Equity`) aggregate **cumulatively from inception up to the end of the month** (not resetting to zero).
  - P&L Accounts (`5100-01 Utilities`, `4000 Revenue`) aggregate **strictly within the 1st of the month to the last day of the month**.

### Test 5.3: Contra-Equity Display (Partner Drawings)
- [ ] **Verify:** Partner drawing accounts (`3010-01 Owner Drawings`) have normal credit classification, but debit balances display appropriately in the Debit column without triggering a false "unbalanced" alert.

### Test 5.4: Pakistan Standard Time (PKT UTC+5) Rollover Safety
- [ ] **Verify:** Dates on vouchers posted late in the evening (e.g. 11:30 PM PKT) do NOT roll backward into the previous calendar day. Verified through `formatUTCDate` implementation.

### Test 5.5: Zero-Balance Account Suppression
- [ ] **Verify:** Accounts with net zero debit and credit balances are automatically omitted from the trial balance to keep reports concise and executive-ready.

### Test 5.6: Search Filtering
- [ ] **Action:** In the search input, type `HBL`.
- [ ] **Expected:** Only `1030-01 Habib Bank Ltd (HBL) Operations` appears.
- [ ] **Clear Search:** Full chart of accounts re-renders.

### Test 5.7: Ledger Drill-Down from Trial Balance Row
- [ ] **Action:** Click any account row (e.g. `5100-01 Utilities`).
- [ ] **Expected:** `AccountLedgerPanel` drawer slides open displaying every individual voucher line contributing to that exact trial balance number.

### Test 5.8: Institutional Trial Balance A4 Print Export
- [ ] **Action:** Click `Export / Print` at the top right of the trial balance page.
- [ ] **Verify:** Windows Print dialog triggers with Wadaan official letterhead, generation timestamp, and balanced audit sign-off section.

---

## 🏗️ PHASE 6: Construction WIP & Project Site Ledger (Screen 4 — `/projects`)

### Test 6.1: Projects Grid & KPI Strip
- [ ] **Action:** Navigate to `Projects & WIP` (`/projects`).
- [ ] **Verify:**
  - Top summary cards: `Total Active Sites`, `Cumulative WIP Capitalized`, `Total Contract BOQ Value`.
  - Project cards for `Wadaan Heights` (`WH`) and `OPF Villa` (`OPFV`) display.

### Test 6.2: Master BOQ Budget Variance & Burn Percentage
- [ ] **Inspect `Wadaan Heights` Card:**
  - Master BOQ: `PKR 60,000,000`
  - Total Spent (WIP): Displays cumulative sum of opening WIP + material bills.
  - Budget Burn Bar: Displays percentage utilized (e.g. `24.2%`).
  - Budget Variance: Displays remaining unspent funds (`PKR 45,500,000`).

### Test 6.3: Client Deal Contract Cross-Linking
- [ ] **Inspect Card Header on `Wadaan Heights`:**
  - Blue Badge: `Client Contract`.
  - Shows: `Client: Tariq Mehmood (0312-9876543)`.
  - Shows: `Contract Value: PKR 12,000,000`.
  - Shows: `Client Paid: PKR 4,000,000`.
  - Shows: `Net Cash Margin: Client Paid - Total WIP Spent` (Green if positive, Red if outpaced).

### Test 6.4: Zero-BOQ Safe Division Edge Case
- [ ] **Inspect `OPF Villa` Card:**
  - Master BOQ: `PKR 260,000,000`, Spent: `PKR 0`.
  - Progress bar shows `0.0%` cleanly without `NaN%` or `Infinity%` crashes.

### Test 6.5: Create New Construction Site
- [ ] **Action:** Click `+ New Project`.
- [ ] **Inputs:**
  - Name: `Faisal Town Commercial Plaza`
  - Prefix: `FTCP`
  - Master BOQ: `PKR 150,000,000`
- [ ] **Click:** `Create Project`.
- [ ] **Expected:** Project card appears with zero expenditure and active status.

### Test 6.6: Duplicate Project Prefix Rejection (Negative Test)
- [ ] **Action:** Click `+ New Project`. Enter Prefix `FTCP`.
- [ ] **Expected:** System blocks creation with `409 Conflict` — "Project prefix 'FTCP' is already registered".

### Test 6.7: Project Transaction Drawer Drill-Down
- [ ] **Action:** On `Wadaan Heights`, click `View GL Entries →` at the bottom of the card.
- [ ] **Observe:** `ProjectTransactionDrawer` slides open.
- [ ] **Verify:**
  - Summary banner: Total Debits (costs added), Total Credits, and Net Project WIP.
  - Chronological table showing every supplier bill, labor voucher, and journal entry linked to `WH`.

### Test 6.8: Executive Site Audit Report Modal & Print Dossier
- [ ] **Action:** On `Wadaan Heights`, click the Document/Report icon.
- [ ] **Observe:** `ProjectReportModal` opens in full screen.
- [ ] **Verify:**
  - Multi-tab dossier: Site Summary, Client Inflows, Supplier Bills Breakdown, and Running GL Ledger.
  - Click `Print Site Dossier`: Window triggers native print dialog with professional site cost dossier.

---

## 🧾 PHASE 7: Supplier Payables, FIFO Payment Waterfall & CPV Printing (Screens 5 & 7 — `/payables`)

Navigate to `Accounts Payable` (`/payables`).

### Test 7.1: Payables Engine Two-Tab Layout
- [ ] **Verify:** Two primary operational tabs:
  - Tab 1: **"Record Bill"** (Screen 5 — Vendor invoice entry & WIP allocation)
  - Tab 2: **"Payment Run"** (Screen 7 — FIFO settlement & CPV generation)

---

### Part A: Tab 1 — Record Bill

### Test 7.2: Accrual Bill Capitalized to Construction WIP (Blue Mode)
- [ ] **Action:** Select Tab 1: "Record Bill".
- [ ] **Select Vendor:** `Ali Hardware`
- [ ] **Select Project:** `Wadaan Heights (WH)` *(Notice banner turns Blue: "Capitalizing to Construction WIP 1200")*.
- [ ] **Invoice Reference:** `INV-CEMENT-501`
- [ ] **Line Items:**
  - Description: `Lucky Cement Grade 53 (500 Bags)` | Qty: `500` | Unit Price: `1,450` | Total: `PKR 725,000`
  - Click `+ Add Line Item`.
  - Description: `Deformed Steel Bars Grade 60 (10 Tons)` | Qty: `10` | Unit Price: `260,000` | Total: `PKR 2,600,000`
- [ ] **Verify Grand Total:** `PKR 3,325,000`.
- [ ] **Payment Status Mode:** Keep toggle on **"Unpaid (Accounts Payable)"**.
- [ ] **Click:** `Post Expense Bill`.
- [ ] **Verify:**
  - Posts to GL: `DR 1200 Construction WIP / CR 2000 Accounts Payable`.
  - Ali Hardware's total debt increases by `PKR 3,325,000`.

### Test 7.3: Overhead Bill Charged to Office Expense (Slate Mode)
- [ ] **Select Vendor:** Click `+ Quick Add Vendor` -> Name: `Attock Petroleum` | Phone: `0333-1122334`.
- [ ] **Select Project:** Leave **Unselected / "General Office Overhead"** *(Notice banner turns Slate: "Charging to 5000 COGS / Overhead")*.
- [ ] **Invoice Reference:** `PETROL-8812`
- [ ] **Line Item:** `Generator Fuel (400 Liters)` | Qty: `400` | Price: `285` | Total: `PKR 114,000`.
- [ ] **Click:** `Post Expense Bill`.
- [ ] **Verify:** Posts to GL: `DR 5000 Cost / Overhead / CR 2000 Accounts Payable`. Project WIP is NOT touched.

### Test 7.4: Direct Cash Settlement Mode & DPR Printing (Screen 5)
- [ ] **Select Vendor:** `Ali Hardware`.
- [ ] **Select Project:** `Wadaan Heights`.
- [ ] **Invoice Reference:** `CASH-HARDWARE-01`.
- [ ] **Line Item:** `Scaffolding Rental & Shuttering Nails` | Total: `PKR 45,000`.
- [ ] **Payment Status Mode:** Toggle to **"Paid Immediately (Direct Cash/Bank)"**.
- [ ] **Select Source Account:** `1010-01 Office Safe (Vault A)`.
- [ ] **Click:** `Post Expense Bill`.
- [ ] **Observe:**
  - Bill is recorded as immediately `PAID`.
  - GL posted: `DR 1200 WIP / CR 1010-01 Office Safe` (zero liability added to 2000 AP).
  - **Direct Payment Receipt (DPR)** dialog triggers automatically.
  - Native Windows Print Preview opens with dual-copy DPR voucher.

### Test 7.5: Duplicate Invoice Number Rejection (Negative Test)
- [ ] **Action:** Record another bill for `Ali Hardware` with invoice number `INV-CEMENT-501` (already used in 7.2).
- [ ] **Expected:** Server rejects submission with `409 Conflict` — "Invoice reference INV-CEMENT-501 already exists for this vendor".

---

### Part B: Tab 2 — Vendor Payment Run & CPV Generation (Screen 7)

### Test 7.6: Load Vendor Debt Queue
- [ ] **Action:** Click Tab 2: "Payment Run".
- [ ] **Select Vendor:** `Ali Hardware`.
- [ ] **Observe:**
  - Unpaid bills table loads showing `INV-CEMENT-501` (`PKR 3,325,000`) and opening payable (`PKR 650,000`).
  - Total Outstanding Debt displays: `PKR 3,975,000`.

### Test 7.7: No-Overpay Guardrail (Negative Test)
- [ ] **Action:** Type `4,500,000` into Amount to Pay field.
- [ ] **Observe:**
  - Red warning banner appears: *"Payment amount exceeds total outstanding vendor debt of PKR 3,975,000."*
  - **"Post Payment Run" button is strictly DISABLED**.

### Test 7.8: Partial FIFO Payment via Bank Cheque
- [ ] **Enter Amount:** `PKR 1,500,000`.
- [ ] **Source Account:** `1030-01 Habib Bank Ltd (HBL) Operations`.
- [ ] **Payment Method:** Toggle to **Cheque**.
- [ ] **Mandatory Cheque Details:**
  - Cheque Ref: `CHQ-HBL-009988`
  - Bank Name: `Habib Bank Ltd`
  - Clearance Date: Today's date + 2 days
- [ ] **Observe FIFO Allocation Preview:**
  - First `PKR 650,000` applies to oldest opening bill (settling it to `PAID`).
  - Remaining `PKR 850,000` applies partially to `INV-CEMENT-501` (reducing its pending balance from `3,325,000` to `2,475,000`).
- [ ] **Click:** `Post Payment Run`.

### Test 7.9: Native Windows Cash Payment Voucher (CPV) Print Spooler
- [ ] **Observe:**
  - Success modal displays "Payment Executed Successfully".
  - Electron IPC invokes `window.electronAPI.printPaymentReceipt()`.
  - Windows Print Dialog opens automatically.
- [ ] **Verify CPV Document Layout:**
  - Formatted for standard A4 paper.
  - Top Half: **Vendor / Payee Official Receipt** with Wadaan letterhead, voucher # (`CPV-XXXX`), cheque reference, and table of settled bills.
  - Midpoint: **Dashed Perforated Cut Line** with scissor icon (`✂ Cut Here`).
  - Bottom Half: **Wadaan Institutional Accounts Copy** with auditor, cashier, and payee sign-off boxes.
  - Zero orphan page spillover (fits exactly on 1 sheet of paper).

### Test 7.10: Selective Bill Allocation (Manual Mode)
- [ ] **Select Vendor:** `Ali Hardware` (remaining debt `PKR 2,475,000`).
- [ ] **Switch Mode:** Click "Manual / Selective Allocation".
- [ ] **Action:** Check only `INV-CEMENT-501` and enter `1,000,000`.
- [ ] **Pay via:** `1010-01 Office Safe (Vault A)` (Cash).
- [ ] **Click:** `Post Payment Run`.
- [ ] **Verify:** Exact `PKR 1,000,000` is deducted from `INV-CEMENT-501`, leaving `PKR 1,475,000`.

---

## 🤝 PHASE 8: Deal Hub, 3 Contract Routes, Co-Buyers & File Transfer (Screen 8 — `/deals`)

Navigate to `Deal Hub` (`/deals`).

### Test 8.1: Deal Hub Portfolio Overview
- [ ] **Verify:**
  - KPI Cards: `Total Active Contracts`, `Total Portfolio Value`, `Cumulative Inflows Collected`, `Pending Installment Receivables`.
  - Search bar and Route filters (`All`, `WADAAN_SALE`, `CONSTRUCTION`, `BROKERAGE`).

---

### Route A: Wadaan Owned Inventory Sale (Asset Profit Tracking)

### Test 8.2: Initialize Route A Deal Linked to Property Inventory
- [ ] **Action:** Click `+ New Deal`.
- [ ] **Step 1 (Client):** Select `Tariq Mehmood` (or register a new buyer `Farooq Khan`, `0301-7788990`).
- [ ] **Step 2 (Deal Route):** Select **Wadaan Sale (Owned Property)**.
- [ ] **Asset Selector:** Select an inventory property (e.g. `Plot 42, Block B, Wadaan Heights` — Acquisition Cost: `PKR 4,000,000`).
- [ ] **Total Contract Value:** Enter `PKR 7,500,000`.
- [ ] **Verify Real-Time Profit Calculation:**
  - Contract Value: `PKR 7,500,000`
  - Property Acquisition Cost: `- PKR 4,000,000`
  - **Estimated Gross Profit:** `PKR 3,500,000 (46.7% Margin)` displays in emerald.
- [ ] **Step 3 (Milestone Schedule):**
  - Milestone 1: `Down Payment` | Due: Today | Amount: `PKR 2,500,000`
  - Milestone 2: `Installment 1` | Due: +30 Days | Amount: `PKR 2,500,000`
  - Milestone 3: `Possession Milestone` | Due: +60 Days | Amount: `PKR 2,500,000`
  - Verify indicator: `✓ PERFECT MATCH (Sum: PKR 7,500,000)`.
- [ ] **Click:** `+ Initialize Deal Contract`.
- [ ] **Verify:**
  - Deal appears in table.
  - Linked property asset in `/assets` automatically transitions to **`RESERVED`**.

### Test 8.3: Milestone Sum Mismatch Guard (Negative Test)
- [ ] **Action:** Create a deal with Total Value `PKR 5,000,000` but enter installments totaling `PKR 4,800,000`.
- [ ] **Observe:** Red pill displays `Mismatch: Diff PKR 200,000`. Button remains disabled.

---

### Route B: Construction Project Deal (Linked to Site WIP)

### Test 8.4: Initialize Construction Deal
- [ ] **Action:** Click `+ New Deal`.
- [ ] **Client:** Register `Chaudhry Aslam` (`0300-5554433`).
- [ ] **Route:** Select **Construction**.
- [ ] **Linked Site:** Select `Wadaan Heights (WH)`.
- [ ] **Contract Value:** `PKR 16,000,000`.
- [ ] **Schedule Helper:** Click `4 Quarters` preset button.
- [ ] **Observe:** System auto-generates 4 milestones of `PKR 4,000,000` each spaced 90 days apart.
- [ ] **Click:** `+ Initialize Deal Contract`.

---

### Route C: Brokerage Transaction (Escrow & Commission Split)

### Test 8.5: Initialize Brokerage Deal with Split Validation
- [ ] **Action:** Click `+ New Deal`.
- [ ] **Client:** `Tariq Mehmood`.
- [ ] **Route:** Select **Brokerage**.
- [ ] **Total Deal Value:** `PKR 10,000,000`.
- [ ] **Wadaan Commission:** Enter `PKR 200,000` (2%).
- [ ] **Observe Split Calculation Preview:**
  - `Earned Revenue (4000) = PKR 200,000`
  - `Seller Escrow Liability (2200) = PKR 9,800,000`
- [ ] **Milestone:** Single lump sum `PKR 10,000,000`.
- [ ] **Click:** `+ Initialize Deal Contract`.

---

### Co-Buyers & Multi-Client Ownership

### Test 8.6: Assign Co-Client / Partner to Deal
- [ ] **Action:** On `Chaudhry Aslam`'s deal, click the Co-Buyers icon (`+ Partner`).
- [ ] **Observe Modal:** `AddCoClientModal` opens.
- [ ] **Inputs:**
  - Select Partner: `Tariq Mehmood` (or quick-register `Haji Munir`, `0321-4455667`).
  - Ownership Share: `50%`
  - Relationship Note: `50-50 Joint Venture Co-Buyer`.
- [ ] **Click:** `Assign Co-Buyer`.
- [ ] **Verify:** Deal row now displays badge `2 Owners: Chaudhry Aslam (50%) & Haji Munir (50%)`.

---

### Customer Khaata Drawer & Mobilization Advances

### Test 8.7: Inspect Customer Khaata Drawer
- [ ] **Action:** Click `Khaata` on `Chaudhry Aslam`.
- [ ] **Observe:** `CustomerKhaataDrawer` opens from right.
- [ ] **Verify Sections:**
  - Customer Profile (Name, Phone, CNIC).
  - **Mobilization Advance Wallet Card:** Displays institutional slate card with `PKR 0.00` and clear explanation notice.
  - **Active Contracts Section:** Shows milestone progress bar, paid vs remaining breakdown.
  - **Construction Site Cross-Link:** Shows `Site: Wadaan Heights`, total client payments, total site WIP spent, and current realized cash margin.

### Test 8.8: Apply Advance Wallet to Installment Milestone
- [ ] **Prerequisite:** Customer has an advance balance (from Phase 9).
- [ ] **Action:** Open Khaata drawer.
- [ ] **Observe:** "Apply Advance to Unpaid Installment" box is active.
- [ ] **Select Milestone:** Pick Milestone 1.
- [ ] **Enter Amount:** `PKR 500,000`.
- [ ] **Click:** `Apply Advance Funds`.
- [ ] **Verify:** Wallet balance decrements by `500,000`, milestone remaining decreases by `500,000`, and GL reflects advance settlement: `DR 2100 Customer Advance / CR 1100 AR`.

---

### 1-Click File Ownership Transfer

### Test 8.9: Transfer Property File to New Buyer
- [ ] **Action:** On `Tariq Mehmood`'s deal, click `Transfer File` (arrow icon).
- [ ] **Observe:** `TransferFileModal` opens.
- [ ] **Verify Exclusion:** Current owner (`Tariq Mehmood`) is excluded from new assignee list.
- [ ] **Select New Assignee:** `Chaudhry Aslam`.
- [ ] **Transfer Fee:** Enter `PKR 50,000`.
- [ ] **Click:** `Execute File Transfer`.
- [ ] **Verify:**
  - Deal primary owner instantly updates to `Chaudhry Aslam`.
  - Transfer Fee posts to General Ledger: `DR 1100 AR / CR 4000 Fee Revenue`.
  - Audit trail in Khaata reflects ownership transfer history.

### Test 8.10: Transfer Blocked on Un-cleared Pending Cheque (Negative Test)
- [ ] **Action:** Try transferring a deal whose milestone has a cheque currently sitting in the Waiting Room.
- [ ] **Expected:** System blocks transfer with alert: *"Cannot transfer file while funds are pending clearance in Cheque Waiting Room (ERR_PENDING_FUNDS_LOCKED)."*

---

## 💵 PHASE 9: Cash Receipts, Cheque Waiting Room, Clearance & Bounce (Screen 9 — `/receipts`)

Navigate to `Cash & Cheque Gateway` (`/receipts`).

### Test 9.1: Gateway Screen Layout
- [ ] **Verify:**
  - Left Panel: **"Fast Inflow Gateway"** (record cash, cheque, or advance receipts).
  - Right Panel: **"Cheque Waiting Room"** (real-time escrow instruments awaiting bank clearance).

---

### Inflow Scenarios

### Test 9.2: Direct Cash Settlement Against Milestone
- [ ] **Customer:** `Chaudhry Aslam`.
- [ ] **Select Invoices:** Check `Milestone 1` (`PKR 4,000,000`).
- [ ] **Amount:** Enter `PKR 4,000,000`.
- [ ] **Method:** Select **Cash**.
- [ ] **Receiving Account:** `1010-01 Office Safe (Vault A)`.
- [ ] **Click:** `Record Inflow Receipt`.
- [ ] **Verify:**
  - Milestone status updates immediately to `PAID`.
  - GL posted: `DR 1010-01 Office Safe / CR 1100 Accounts Receivable`.
  - Dual-copy A4 receipt dialog triggers with customer copy + office copy.

### Test 9.3: Overpayment Routed to Customer Advance Wallet (2100)
- [ ] **Customer:** `Chaudhry Aslam`.
- [ ] **Select Invoice:** `Milestone 2` (Remaining: `PKR 4,000,000`).
- [ ] **Amount:** Enter `PKR 4,500,000` (PKR 500,000 overpayment).
- [ ] **Method:** Select **Cash**.
- [ ] **Click:** `Record Inflow Receipt`.
- [ ] **Verify:**
  - Milestone 2 is marked `PAID` for `4,000,000`.
  - Excess `PKR 500,000` is credited to Chaudhry Aslam's **Advance Wallet** (`walletBalance = 500,000` and GL `CR 2100 Customer Advance`).

### Test 9.4: Pure Advance Mobilization Deposit (No Milestone Checked)
- [ ] **Customer:** `Tariq Mehmood`.
- [ ] **Invoices:** **Do not check any invoices (leave unchecked)**.
- [ ] **Amount:** `PKR 1,000,000`.
- [ ] **Method:** `ONLINE`.
- [ ] **Bank Reference:** `UTR-MEEZAN-9921`.
- [ ] **Click:** `Record Inflow Receipt`.
- [ ] **Verify:** Notification confirms: *"Deposited PKR 1,000,000 into Mobilization Advance Wallet."* Tariq's wallet now shows `PKR 1,000,000`.

### Test 9.5: Co-Client Inflow Permission
- [ ] **Customer:** Select co-client `Haji Munir`.
- [ ] **Invoices:** Observe that joint venture deal milestones with Chaudhry Aslam appear in the invoice list.
- [ ] **Action:** Pay `PKR 500,000` against the joint deal.
- [ ] **Verify:** System permits payment without `INVOICE_CUSTOMER_MISMATCH` error.

---

### Cheque Waiting Room & Fiscal Locks

### Test 9.6: Cheque Deposit Held in Waiting Room
- [ ] **Customer:** `Chaudhry Aslam`.
- [ ] **Invoice:** Check `Milestone 3` (`PKR 4,000,000`).
- [ ] **Method:** Select **Cheque**.
- [ ] **Cheque Number:** `CHQ-MEEZAN-770011`.
- [ ] **Bank Name:** `Meezan Bank Ltd`.
- [ ] **Amount:** `PKR 4,000,000`.
- [ ] **Click:** `Record Inflow Receipt`.
- [ ] **Verify:**
  - Cheque appears in **Cheque Waiting Room** table on the right with an Amber **`PENDING`** badge.
  - Milestone 3 is marked with a Yellow badge: **`In Escrow / Pending Clearance`**.
  - **CRITICAL GL AUDIT:** Check Trial Balance or Bank Account — **ZERO GL entries have been posted!** Physical bank liquidity has NOT been artificially inflated before bank clearance.

### Test 9.7: Bank Clearance & GL Realization
- [ ] **Action:** In the Waiting Room, locate `CHQ-MEEZAN-770011`.
- [ ] **Click:** `Clear Cheque` (green checkmark).
- [ ] **Modal Opens:** `ClearanceModal`.
- [ ] **Select Depository Bank:** `1030-01 Habib Bank Ltd (HBL) Operations`.
- [ ] **Clearance Date:** Today.
- [ ] **Click:** `Confirm & Clear Cheque`.
- [ ] **Verify:**
  - Cheque disappears from Waiting Room.
  - Milestone 3 transitions to green **`PAID`**.
  - GL Entry posts: `DR 1030-01 HBL Operations / CR 1100 Accounts Receivable`. Funds are now officially realized.

### Test 9.8: Cheque Dishonor / Bounce Reversal Engine
- [ ] **Step 1:** Record a new cheque inflow: Client `Tariq Mehmood`, Amount `PKR 1,000,000`, Cheque `CHQ-BOUNCE-991`, linked to an unpaid milestone.
- [ ] **Step 2:** Locate it in the Waiting Room.
- [ ] **Step 3:** Click `Bounce Cheque` (red X icon).
- [ ] **Step 4:** Red safeguard dialog prompts: *"Mark Cheque as Bounced? This will reverse any linked invoices back to UNPAID."*
- [ ] **Step 5:** Click `Confirm Bounce`.
- [ ] **Verify:**
  - Cheque is removed from the Waiting Room.
  - Status updates to `BOUNCED` in the database.
  - Linked milestone invoice reverts cleanly back to **`UNPAID`**.
  - **Zero GL corruption:** No fictitious accounting entries were created.

### Test 9.9: Native Inflow Receipt Print Verification
- [ ] **Action:** On any cleared receipt, click `Print Receipt`.
- [ ] **Verify:**
  - Triggers Windows Print dialog.
  - Displays A4 dual-copy layout: Customer Original + Company Office Copy with perforated tear divider.

---

## 🏛️ PHASE 10: Owned Asset Inventory & Resale Buyback (Screen 13 — `/assets`)

Navigate to `Asset Inventory` (`/assets`).

### Test 10.1: Asset Inventory Grid & KPIs
- [ ] **Verify:**
  - KPI Cards: `Total Property Assets`, `Total Book Value`, `Available for Sale`, `Sold / Settled`.
  - Categories: `PLOT`, `HOUSE`, `COMMERCIAL`, `APARTMENT`.

### Test 10.2: Register New Wadaan Owned Property
- [ ] **Action:** Click `+ Register Property`.
- [ ] **Form Inputs:**
  - Title: `Plot 55, Sector C, Wadaan Heights`
  - Category: `PLOT`
  - Dimensions: `1 Kanal (50x90)`
  - Location: `Sector C, Main Boulevard`
  - Purchase Date: `2026-08-15`
  - Acquisition Cost: `PKR 6,500,000`
- [ ] **Click:** `Save Property`.
- [ ] **Verify:** Asset appears in table with green badge **`AVAILABLE`** and Book Value `PKR 6,500,000`.

### Test 10.3: Negative / Zero Cost Rejection (Negative Test)
- [ ] **Action:** Try registering an asset with Acquisition Cost `0` or `-500,000`.
- [ ] **Expected:** Inline validation blocks submission: "Acquisition cost must be greater than zero".

### Test 10.4: Asset Reservation Sync with Deal Hub
- [ ] **Action:** Link `Plot 55` to a Route A deal in `/deals`.
- [ ] **Return to `/assets`:**
  - Status badge on `Plot 55` has automatically transitioned from `AVAILABLE` to Amber **`RESERVED`**.
  - Displays linked buyer's name.

### Test 10.5: Deletion Blocked on Linked Property (Negative Test)
- [ ] **Action:** Click `Delete` on `Plot 55` while in `RESERVED` status.
- [ ] **Expected:** Server blocks deletion with alert: *"Cannot delete asset linked to an active deal (ERR_ASSET_LINKED_TO_DEAL)."*

### Test 10.6: Auto-Settlement to `SOLD`
- [ ] **Action:** Settle all milestone installments on `Plot 55`'s deal in `/receipts`.
- [ ] **Return to `/assets`:**
  - Status on `Plot 55` automatically transitions to Slate **`SOLD`**.

### Test 10.7: Property Re-acquisition (Buyback) Engine
- [ ] **Action:** On the `SOLD` property row, click the green **`Re-acquire`** button.
- [ ] **Observe:** `ReacquireAssetModal` opens.
- [ ] **Inputs:**
  - Buyback Acquisition Cost: `PKR 7,200,000`
  - Re-acquisition Date: Today's date
  - Notes: `Repurchased from client for secondary plot market development`.
- [ ] **Click:** `Confirm Re-acquisition`.
- [ ] **Verify:**
  - Original `SOLD` record is **preserved completely intact** (protecting the historical profit margin on the first sale).
  - A **fresh second asset record** is generated with status **`AVAILABLE`**, cost `PKR 7,200,000`, ready for new sale.

---

## 📊 PHASE 11: Master Reports Hub & Executive Financial Intelligence (Screen 10 — `/reports`)

Navigate to `Executive Reports` (`/reports`).

### Test 11.1: Global Report Controls & Date Presets
- [ ] **Verify:**
  - Preset Selector: `This Month`, `Last Month`, `This Fiscal Year`, `All Time`, `Custom Range`.
  - `Refresh Data` button updates all sub-tabs synchronously.
  - `Export PDF / Print` button triggers executive printable dossier.

### Test 11.2: Sub-Tab 1 — Executive Snapshot (Survival Strip)
- [ ] **Verify 4 Core Metrics:**
  - `Total Liquid Cash`: Real-time sum of safe (`1010`) + banks (`1030`, `1020`).
  - `Client Funds Held`: Sum of advance mobilization wallets (`2100`) + brokerage escrow (`2200`).
  - `Accounts Receivable (AR)`: Pending client deal installments.
  - `Accounts Payable (AP)`: Pending vendor bills.

### Test 11.3: Corporate True Net Income Waterfall Card
- [ ] **Inspect True Net Income Waterfall:**
  $$\begin{aligned}
  &\text{Gross Deal Profit (Collections} - \text{WIP} - \text{Asset Acquisition)} \\
  + &\text{Brokerage Commissions Earned} \\
  - &\text{General Office Overhead Expenses} \\
  = &\mathbf{Corporate\ True\ Net\ Income}
  \end{aligned}$$
- [ ] **Verify:** Net Income matches the difference between total recognized income and operating overheads.

### Test 11.4: Aging Radar (AR Money In vs AP Money Out)
- [ ] **Inspect Aging Radar Tables:**
  - Accounts Receivable sorted into buckets: `0-30 Days`, `31-60 Days`, `61-90 Days`, `90+ Days Overdue`.
  - Accounts Payable sorted into identical risk buckets with color coding (Green -> Amber -> Red).

### Test 11.5: Sub-Tab 2 — Deal Margins Matrix & Owned Property Deduction
- [ ] **Action:** Click sub-tab **"Deal Margins"**.
- [ ] **Verify Columns:** Deal #, Deal Type, Client, Site/Property, Total Value, Inflow Collected, Cost Deductions, Gross Profit, Margin %.
- [ ] **Verify Route A Property Sale Margin:**
  - For Wadaan Sale deals, verify that the Amber **`Owned Property`** badge appears.
  - Verify that Gross Profit deducts the property's acquisition cost:
    $$\text{Gross Profit} = \text{Client Collections} - \text{Asset Acquisition Cost}$$
  - (Confirm absence of the historical bug where gross profit was falsely reported as 100%).

### Test 11.6: Deal Margin Detail Drill-Down Drawer
- [ ] **Action:** Click any deal row in the matrix.
- [ ] **Observe:** `DealMarginDetailDrawer` slides out showing complete milestone breakdown, payment transactions, and exact cost attribution.
- [ ] **Press:** `Escape` or click `Close` to dismiss.

### Test 11.7: Sub-Tab 3 — Line-by-Line Construction Project Costs Ledger
- [ ] **Action:** Click sub-tab **"Project Cost Ledger"**.
- [ ] **Select Site:** Pick `Wadaan Heights`.
- [ ] **Verify:**
  - Every individual vendor bill line item is listed: Date, Payee/Vendor, Invoice #, Item Description, Quantity, Unit Price, Line Total.
  - JetBrains Mono summary footer displays bold **Total Site Expenditure**.

### Test 11.8: Sub-Tab 4 — Office Overhead Ledger
- [ ] **Action:** Click sub-tab **"Office Overhead"**.
- [ ] **Verify:** Displays general administrative bills without project tagging (`projectId IS NULL`).
- [ ] **Verify:** Bottom summary card calculates bold **Total Overhead Expenses**.

### Test 11.9: Sub-Tab 5 — Partner Drawings & Equity Distributions Ledger
- [ ] **Action:** Click sub-tab **"Partner Drawings"**.
- [ ] **Verify 3 Distinct Partner Sections:**
  - Section 1: `Arshad Khalil` (Account `3010-02` / `3010`).
  - Section 2: `Zeeshan Yousafzai` (Account `3020-01` / `3020`).
  - Section 3: `General Director Drawings` (Account `3010-01`).
- [ ] **Verify Forensic Columns:** Date, Voucher JV #, Memo, Linked Party, Linked Project, Account Code, Subtotal.
- [ ] **Verify Bottom Card:** `Combined Partner Drawings Grand Total` rendered in deep slate card with emerald amount.

### Test 11.10: Executive PDF Export Verification
- [ ] **Action:** Click `Export PDF / Print`.
- [ ] **Verify:** Print dialog isolates the currently active sub-tab with executive confidentiality headers, generation timestamps, and clean layout without sidebar elements.

---

## 🗄️ PHASE 12: Central Document Archive & 1-Click Reprint (Screen 12 — `/documents`)

Navigate to `Document Archive` (`/documents`).

### Test 12.1: Master Document Register Display
- [ ] **Verify:** Unified register containing:
  - Cash Payment Vouchers (`CPV-XXXX`)
  - Direct Payment Receipts (`DPR-XXXX`)
  - Customer Inflow Receipts (`REC-XXXX`)
- [ ] **Check Columns:** Date, Document ID, Category Badge, Payee / Customer, Amount, Payment Method, Reference #, Action.

### Test 12.2: Category & Date Filters
- [ ] **Action:** Filter by category `Payment Vouchers (CPV)`. Only CPV records display.
- [ ] **Action:** Filter by `Customer Inflow Receipts`. Only client receipts display.
- [ ] **Action:** Filter by `Direct Payment Receipts`. Only DPR records display.
- [ ] **Action:** Reset to `All Documents`.

### Test 12.3: Live Keyword Search
- [ ] **Action:** Type `Ali Hardware` in the search box.
- [ ] **Expected:** Only vouchers issued to Ali Hardware remain in the list.
- [ ] **Action:** Type a cheque number (e.g. `CHQ-HBL-009988`).
- [ ] **Expected:** Corresponding voucher is filtered instantly.

### Test 12.4: 1-Click Historical CPV Reprint
- [ ] **Action:** Click `Reprint Voucher` on any CPV row.
- [ ] **Observe:**
  - Electron IPC `window.electronAPI.printPaymentReceipt` is invoked.
  - Windows print dialog opens with the exact historical payment voucher, settled bills list, and dual-copy layout.

### Test 12.5: 1-Click Historical Customer Receipt Reprint
- [ ] **Action:** Click `Reprint Receipt` on any customer inflow row.
- [ ] **Observe:** Windows print dialog opens with the exact dual-copy customer receipt.

### Test 12.6: 1-Click Historical DPR Reprint
- [ ] **Action:** Click `Reprint` on a Direct Payment Receipt row.
- [ ] **Observe:** Windows print dialog opens with the itemized DPR voucher.

---

## 👤 PHASE 13: Personal Finance Ledger & Corporate Firewall (Screen 11 — `/personal`)

Navigate to `Personal Ledger` (`/personal`).

### Test 13.1: Strict Corporate Firewall Proof (Zero GL Commingling)
- [ ] **Concept:** The Personal Finance Ledger tracks informal director loans given to or received from personal contacts/partners completely off-the-books.
- [ ] **CRITICAL VERIFICATION:**
  - No personal loan transactions create journal lines in the corporate General Ledger.
  - Trial Balance balances are 100% UNTOUCHED by any personal loans.
  - Executive Reports (P&L and Balance Sheet) are 100% UNTOUCHED.

### Test 13.2: Personal Overview KPI Strip
- [ ] **Verify:**
  - `Total Lent (Given)`: Outstanding money friends/partners owe the directors.
  - `Total Borrowed (Received)`: Outstanding money the directors owe lenders.
  - `Net Balance Position`: Color-coded net asset/liability position (+ emerald if owed to us, red if we owe).
  - `Active Loan Accounts`: Total count of active loan contacts.

### Test 13.3: Register Personal Contact
- [ ] **Action:** Click `+ Register Contact`.
- [ ] **Inputs:**
  - Full Name: `Arshad Sir Personal`
  - Phone: `0300-1122334`
  - Relationship: `Co-Founder / Director`
  - Private Notes: `Private bridge loans outside company accounts`
- [ ] **Click:** `Register Contact`.
- [ ] **Expected:** Contact card appears with `0 active loans` and `Settled` net balance.

### Test 13.4: Record Loan Given (We Lent Money)
- [ ] **Action:** Click `Open Ledger` on the contact card.
- [ ] **Click:** `+ Record New Loan`.
- [ ] **Inputs:**
  - Direction: Select **GIVEN (We Lent Money)**
  - Principal Amount: `PKR 1,000,000`
  - Date: Today
  - Purpose / Description: `Emergency personal bridge advance`
- [ ] **Click:** `Record Loan`.
- [ ] **Verify:**
  - Loan entry appears with Amber **`GIVEN`** badge, Red **`OUTSTANDING`** badge, Principal `PKR 1,000,000`, Remaining `PKR 1,000,000`.
  - Contact Net Position updates to `+ PKR 1,000,000 (Owes Us)`.

### Test 13.5: Record Partial Repayment
- [ ] **Action:** On the loan row, click `+ Repayment`.
- [ ] **Inputs:**
  - Repayment Amount: `PKR 400,000`
  - Date: Today
  - Notes: `Cash repayment handed over at office`
- [ ] **Click:** `Apply Repayment`.
- [ ] **Verify:**
  - Loan status updates to Amber **`PARTIAL`**.
  - Remaining balance decrements to `PKR 600,000`.
  - Expanding the loan row shows the itemized repayment history (`PKR 400,000` on date with note).
  - Contact Net Position updates to `+ PKR 600,000`.

### Test 13.6: Record Full Settlement ("Pay Full Remaining")
- [ ] **Action:** Click `+ Repayment` on the same loan.
- [ ] **Action:** Click the helper button **`Pay Full Remaining`** (auto-fills `PKR 600,000`).
- [ ] **Click:** `Apply Repayment`.
- [ ] **Verify:**
  - Loan status turns emerald **`SETTLED`**.
  - Remaining balance displays `PKR 0.00`.
  - `+ Repayment` button disappears for the settled loan.
  - Contact Net Position returns to `Settled`.

### Test 13.7: Record Loan Borrowed (We Received Money)
- [ ] **Action:** Click `+ Record New Loan`.
- [ ] **Inputs:**
  - Direction: Select **BORROWED (We Received)**
  - Principal: `PKR 500,000`
  - Purpose: `Short-term personal equipment loan`
- [ ] **Click:** `Record Loan`.
- [ ] **Verify:**
  - Loan shows Blue badge **`BORROWED`**.
  - Contact Net Position displays `- PKR 500,000 (We Owe)`.

---

## 🔌 PHASE 14: Hardware, Windows Spooler & Network Resilience

### Test 14.1: Offline Network Interruption Detection
- [ ] **Action:** Disconnect the PC's Wi-Fi or unplug the Ethernet cable.
- [ ] **Observe:**
  - A sticky amber banner immediately slides into the top of the window:
    > `⚠️ Offline Notice: Internet connection lost. Remote database sync is paused.`
  - Navigating between already-cached pages continues smoothly via TanStack Query cache.
- [ ] **Action:** Re-connect Wi-Fi / Ethernet.
- [ ] **Observe:**
  - Offline banner automatically disappears.
  - Queries automatically refetch and synchronize with Supabase.

### Test 14.2: Native Windows Printing to Physical Printer or PDF
- [ ] **Action:** In `/payables` or `/documents`, click `Reprint Voucher` on a CPV.
- [ ] **In Windows Print Dialog:**
  - Select an active physical printer, or select **Microsoft Print to PDF**.
  - Click `Print`.
  - Save as `Test-Voucher.pdf` if using PDF.
- [ ] **Inspect Output Document:**
  - Check that text is sharp and unblurred.
  - Check that the perforated tear divider is centered.
  - Check that the document spans exactly **1 page** without an accidental blank 2nd page.

### Test 14.3: High-DPI Display & Window Resizing
- [ ] **Action:** Test on 100%, 125%, and 150% Windows display scaling settings (`Windows Settings -> System -> Display -> Scale`).
- [ ] **Verify:** UI elements, fonts, tables, and dialogs scale proportionally without overlapping or cutting off buttons.
- [ ] **Action:** Minimize the window, restore it, maximize to full screen, and resize to minimum supported dimensions (`1024x768`).
- [ ] **Verify:** Responsive tables provide horizontal scrolling; side drawer overlays remain accessible.

### Test 14.4: App Sudden Kill & Data Recovery
- [ ] **Action:** Post a journal entry or bill.
- [ ] **Action:** Open Windows Task Manager (`Ctrl + Shift + Esc`), right-click `Wadaan Real Estate & Builders ERP.exe`, and click **End task**.
- [ ] **Action:** Re-launch the ERP from the desktop shortcut.
- [ ] **Verify:**
  - Application boots up cleanly within 3 seconds.
  - The previously posted transaction is completely intact in the database (ACID transaction durability verified).
  - No database corruption or lock errors occur.

---

## 🔍 PHASE 15: Cross-Module Forensic Balance Sheet Proof & Mathematical Audits

Execute these mathematical cross-checks to prove total system integrity before handover:

### Audit 15.1: Double-Entry Equilibrium Proof
- [ ] Open `/trial-balance` with preset `All Time`.
- [ ] Record **Grand Total Debits**: `PKR __________________`
- [ ] Record **Grand Total Credits**: `PKR __________________`
- [ ] Calculate: $\text{Difference} = \text{Debits} - \text{Credits}$.
- [ ] **PASS CRITERIA:** $\mathbf{\text{Difference} \equiv 0.00}$.

### Audit 15.2: Liquid Cash Reconciliation Proof
- [ ] Open `/reports` (Executive Snapshot).
- [ ] Note reported `Total Liquid Cash`: `PKR _______________`.
- [ ] Open `/accounts` (Chart of Accounts).
- [ ] Sum all `10xx` liquid accounts:
  - Office Safe `1010-01`: `PKR _______________`
  - HBL Operations `1030-01`: `PKR _______________`
  - Meezan Bank `1020-01`: `PKR _______________`
- [ ] **PASS CRITERIA:** Sum of 10xx accounts **EXACTLY EQUALS** reported Liquid Cash.

### Audit 15.3: Accounts Payable Reconciliation Proof
- [ ] Open `/payables` (Tab 2: Payment Run).
- [ ] Sum all vendor outstanding balances: `PKR _______________`.
- [ ] Open `/accounts` -> Check balance of account `2000 Accounts Payable`: `PKR _______________`.
- [ ] **PASS CRITERIA:** Sum of vendor debts **EXACTLY EQUALS** balance of Account 2000.

### Audit 15.4: Accounts Receivable Reconciliation Proof
- [ ] Open `/deals` -> Note `Total Pending Receivables`: `PKR _______________`.
- [ ] Open `/accounts` -> Check balance of account `1100 Accounts Receivable`: `PKR _______________`.
- [ ] **PASS CRITERIA:** Pending deal installment dues **EXACTLY EQUALS** balance of Account 1100.

### Audit 15.5: Customer Advance Escrow Proof
- [ ] In `/deals`, sum all customer mobilization wallet balances: `PKR _______________`.
- [ ] Open `/accounts` -> Check balance of account `2100 Customer Advances`: `PKR _______________`.
- [ ] **PASS CRITERIA:** Total customer wallet balances **EXACTLY EQUALS** balance of Account 2100.

---

## 🧹 PHASE 16: Pre-Handover Database Sanitization & Go-Live Cutover Options

Now that all modules, edge cases, printing, and recovery paths have been verified on the installed desktop app, choose one of the following cutover strategies before handing the PC to the client:

```
                          HANDOVER DECISION MATRIX
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌─────────────────────────────────────┐   ┌─────────────────────────────────────┐
│             OPTION A                │   │             OPTION B                │
│    PRESERVE VERIFIED DATASET        │   │    CLEAN RESET FOR FRESH GO-LIVE    │
│                                     │   │                                     │
│ • Client wants to explore the system│   │ • Client wants a clean slate to     │
│   with realistic pre-populated data.│   │   enter real financial balances.    │
│ • Keep Admin PIN (5555) or change it│   │ • Wipe all test journals, deals,    │
│   to client's chosen PIN.           │   │   bills, and test receipts.         │
│ • Ready for immediate demonstration.│   │ • Re-initialize Go-Live Wizard with │
│                                     │   │   client's actual cut-off balances. │
└─────────────────────────────────────┘   └─────────────────────────────────────┘
```

### Option A: Preserve Verified Dataset for Demonstration
1. Leave the installed application as-is.
2. In `/accounts`, ensure account names reflect Wadaan corporate preferences.
3. Hand over Master Credentials:
   - URL: Standalone Desktop Shortcut
   - Admin Email: `admin@wadaan.com.pk`
   - Master PIN: `5555` (or assist client in changing to their custom PIN via Recovery Key or Profile).
   - Emergency Master Recovery Key: Hand over written copy in sealed envelope.

### Option B: Clean Reset for Official Go-Live Cutover
1. Connect to the Supabase PostgreSQL database.
2. Execute clean reset of transactional tables while preserving Chart of Accounts and User profiles:
   ```sql
   -- Truncate transactional tables
   TRUNCATE TABLE "JournalLine", "JournalEntry", "ExpenseBillLineItem", "ExpenseBill", 
                  "PaymentTransaction", "ChequePayment", "DealInvoice", "DealClient", 
                  "Deal", "PersonalTransaction", "PersonalContact" CASCADE;
                  
   -- Reset property status to AVAILABLE
   UPDATE "WadaanAsset" SET "status" = 'AVAILABLE', "dealId" = NULL;
   
   -- Reset system initialization flag if client wishes to run Setup Wizard
   UPDATE "SystemSetting" SET "isInitialized" = false, "goLiveDate" = NULL;
   ```
3. Launch desktop app: The full-screen **Go-Live Starter Wizard (`StarterModal`)** will open.
4. Sit with the client and enter their authentic Go-Live opening bank balances, active sites, and vendor balances.
5. Generate a new Master Recovery Key in front of the client, print it, and store it securely.

---

## 📝 Client Acceptance & Handover Formal Sign-Off Form

| Verification Checkpoint | Lead Engineer Sign-Off | Client Auditor Sign-Off | Date Verified |
|:---|:---:|:---:|:---:|
| **1. Desktop Executable Installation & Icon** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **2. Single-Instance Lock & Process Cleanup** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **3. PIN Authentication & Lockout Security** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **4. Chart of Accounts & 3-Tier Protection** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **5. General Journal Zero-Sum Invariant** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **6. Live Trial Balance ($\Delta = 0.00$)** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **7. Construction WIP & Master BOQ Variance** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **8. Supplier Bills, FIFO & Dual-Copy CPV Print** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **9. Deal Hub (3 Routes, Co-Buyers & Transfer)** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **10. Cash Inflow Receipts & Cheque Waiting Room** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **11. Cheque Clearance & Bounce Reversal Engine** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **12. Owned Asset Inventory & Resale Buyback** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **13. Executive Reports & True Net Income** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **14. Document Archive & 1-Click Reprints** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **15. Personal Ledger Corporate Firewall** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |
| **16. Native Windows Printing & Offline Alert** | `[  ] PASS` | `[  ] PASS` | `____/__/2026` |

<br>

**Lead Software Engineer Signature:** ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; **Date:** _______________  
**Client Executive Representative:** ___________________________ &nbsp;&nbsp;&nbsp;&nbsp; **Date:** _______________  
**Company Stamp:** `[ WADAAN REAL ESTATE & BUILDERS ]`
