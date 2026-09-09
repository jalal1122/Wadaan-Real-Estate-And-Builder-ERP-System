# Screen 2: General Journal (Manual Adjustments) [IMPLEMENTED - v1.5.0]

> **Route**: `/journals` (Desktop / Electron)  
> **Status**: ✅ Implemented (v1.5.0)  
> **Navigation**: General Ledger Tab -> Sub-tab "Journal Entries" (`<GLNavTabs />`)

Because Screens 4 through 9 automatically handle 99% of Wadaan’s daily business (buying cement, paying contractors, receiving installments), you will rarely use Screen 2.

Think of the General Journal as your specialized **"Accountant’s Tool."** It is used strictly for manual, non-standard double-entry adjustments that don't originate from a standard bill or customer receipt.

---

## 1. What You See (The Interface)

The screen is built with an institutional, high-contrast desktop layout designed for error-free financial adjustments:

### A. Sub-Tab Navigation (`<GLNavTabs />`)
Integrated into the top of the page, allowing instant switching between:
1. **Chart of Accounts** (`/accounts`)
2. **Journal Entries** (`/journals`) — *Active*
3. **Trial Balance** (`/trial-balance`)

### B. The Voucher Header
- **Entry Date**: Defaults to today's date (`YYYY-MM-DD`).
- **Voucher Number**: Auto-generated sequence display (`JV-####`), assigned atomically by the database upon posting.
- **Description**: Required explanation of the entry (e.g., *"Owner capital injection for Tower A construction"*).

### C. Dynamic Entry Grid (Line Items)
Dynamic line-item grid with a strict minimum of 2 lines. Each row contains:
- **Account Dropdown**: Filtered to active accounts only. System-locked accounts (`isSystemLocked: true`, e.g. control AP/AR) and archived accounts are **completely hidden** from this dropdown to prevent illegal manual journal postings. Grouped neatly by category (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
- **Party Dropdown (v1.5.0)**: Grouped selector displaying *"Customers"* and *"Vendors"* fetched in real-time. Selecting an option populates `customerId` or `vendorId` on the journal line, enabling party sub-ledger tracking.
- **Project Dropdown (v1.5.0)**: Links the line to a specific project (e.g., *"Wadaan Residency Tower A"*), attributing costs directly to project cost centers.
- **Debit Input (PKR)**: Amount debited. **Mutually exclusive** with Credit — entering a value here instantly clears and disables the Credit input on this row.
- **Credit Input (PKR)**: Amount credited. **Mutually exclusive** with Debit — entering a value here instantly clears and disables the Debit input on this row.
- **Memo (v1.5.0)**: Optional line-level annotation (up to 200 characters) for granular narration.
- **Row Remove Button**: Disabled when line count is at the minimum of 2.

### D. Real-Time Balance Footer
- **Live Debit & Credit Sums**: Dynamically recalculated on every keystroke using `Decimal.js` precision.
- **Balance Indicator Pill**:
  - 🟢 **Balanced**: Displayed in emerald when Total Debits === Total Credits > 0.
  - 🔴 **Out of Balance**: Displayed in rose showing the exact difference (e.g., *"Diff: Rs. 1,000.00"*).
- **Add Line Item Button**: Adds another row to the transaction.
- **Clear Form Button**: Resets all inputs and lines to a clean state.
- **Post Journal Entry Button**: Hard-locked (`disabled={!canPost || isPending}`) until all three conditions are satisfied:
  1. Balanced: `totalDebits === totalCredits` and `totalDebits > 0`.
  2. Description provided: non-empty trimmed string.
  3. All rows have an Account selected.

### E. Recent Journal History Table
Below the entry form, Screen 2 displays a real-time table of recent journal entries:
- Voucher number, entry date, description, line-item preview with account badges and debit/credit amounts, and timestamp.
- Paginated with a refresh button to sync with server state.

---

## 2. When to Use This Screen (Real-World Scenarios)

1. **Owner Drawings / Capital Injections**:
   - Owner withdraws Rs. 100,000 from Meezan Bank for personal use:
     - Debit: `3010 - Owner Drawings` (Equity reduction) Rs. 100,000
     - Credit: `1001 - Meezan Bank` (Asset reduction) Rs. 100,000
2. **Reclassification / Error Corrections**:
   - Office supplies miscategorized as project expense:
     - Debit: `5010 - Office Supplies` (Expense) Rs. 15,000
     - Credit: `1400 - WIP Construction Costs` (Asset) Rs. 15,000 with Project tagged
3. **Opening Balance Adjustments**:
   - Injecting opening balances or bank reconciliation adjustments.

---

## 3. Business Rules & Safety Guardrails

1. **The Zero-Balance Lock**: Debits must equal credits down to Rs. 0.00. The backend rejects unbalanced journals with `UNBALANCED_JOURNAL` (HTTP 400), and the UI enforces this prior to submission.
2. **Two-Line Minimum**: At least two accounts must participate in every transaction. Single-sided postings are impossible.
3. **System-Lock Protection**: Control accounts (`isSystemLocked: true`) like Accounts Payable and Accounts Receivable cannot be adjusted directly via manual journals. They must flow through proper bills and receipts to maintain sub-ledger consistency.
4. **No Deletions (Immutability)**: Once posted, a journal entry cannot be deleted. Corrections must be performed via reverse entries (`POST /api/v1/journals/:id/reverse`).
