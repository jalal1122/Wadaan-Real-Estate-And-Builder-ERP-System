Think of this screen as the financial filing cabinet for Wadaan. Every single rupee that enters or leaves the company must land in one of these "buckets." Because you are running this solo, this screen is almost entirely automated—you set it up once, and the rest of the software does the heavy lifting for you.
1. What You See (The Interface)
When you open Screen 1, you see a clean, organized list of all your business accounts, showing exactly how much money is in each one at this exact second.
The Look: A dashboard divided into five clear sections (Assets, Liabilities, Equity, Revenue, and Expenses).
The Live Balances: Next to every single bucket (e.g., "Meezan Bank" or "Office Safe"), there is a real-time cash total.
The Action: You can click an "Add New Account" button to create a new bucket (like adding a new bank account or a new expense category like "Marketing"). You can also click on any existing account to see a history of every transaction that ever hit it.
2. The Five Financial Pillars (How Wadaan is Organized)
Everything is sorted into five standard accounting categories, translated for real estate:
Assets (What Wadaan Owns): Your bank accounts, cash in the office safe, the value of plots Wadaan bought to flip, and the bricks/cement invested in ongoing projects (WIP).
Liabilities (What Wadaan Owes): Unpaid supplier bills (Accounts Payable), Customer Advances (money clients gave you to build their house), and Escrow money (funds belonging to a seller from a brokerage deal).
Equity (The Owner's Share): Your initial investment into the business, any money you pull out for personal use, and Wadaan’s total retained profits.
Revenue (Money Made): Property sales, construction billing, and brokerage commissions.
Expenses (Money Spent on the Office): Office rent, K-Electric, tea, stationary, and salaries. (Note: Cement and bricks are NOT here; those go to Assets/Projects).
3. The "Smart" Locked Accounts
Some of these buckets are so crucial to the ERP's automation that the system physically locks them. You can rename them, but you cannot delete them. These include:
Accounts Payable: The system needs this bucket to track all the unpaid bills you enter on Screen 5.
Customer Wallets (Advances): The system needs this to hold the mobilization advance money you receive on Screen 8.
Escrow/Third-Party Funds: The system needs this to safely hold the middleman money when Wadaan does a commission deal, ensuring it doesn't accidentally look like Wadaan's profit.
Work In Progress (WIP): The system needs this to track all the construction costs for active projects.
4. Business Rules & Guardrails
This screen protects you from making accounting mistakes.
The "No Manual Typing" Rule: You can never just click on "Meezan Bank" and type in a new balance. The system updates these balances automatically based on the bills you pay on Screen 7 and the cash you receive on Screen 9. This ensures nobody can secretly change the bank balance.
The Deletion Guardrail: If you create a bucket (e.g., "Advertising Expense") and record a Rs. 50,000 transaction in it, the system will permanently block you from deleting that bucket. You can "Archive" it so it hides from your view, but the financial history is protected forever so your books stay balanced.
Screen 1 is the quiet engine running in the background, keeping all Wadaan's money perfectly categorized without you having to do manual math.

---

## 5. Technical Frontend Implementation (v1.3.0)

### File Paths & Architecture
- **Route**: `app/(dashboard)/accounts/page.tsx`
- **Component**: `AccountsPage`
- **Modal Component**: `src/app/(dashboard)/accounts/_components/CreateAccountModal.tsx`
- **Feature Data Layer**:
  - Types: `src/features/accounting/types/index.ts` (`AccountWithBalance`, `GroupedAccounts`, `AccountsSummary`, `AccountsResponse`)
  - API Client: `src/features/accounting/api/accountsApi.ts` (`fetchAccounts(fy)`, `createAccount(payload)`)
  - React Query Hook: `src/features/accounting/hooks/useAccounting.ts` (`useChartOfAccounts(fy)`, `useCreateAccount()`)

### UI Components & Interactions
1. **Summary Cards (Row 1)**:
   - **Total Assets**: Emerald green currency card displaying `summary.totalAssets`.
   - **Total Liabilities**: Rose red currency card displaying `summary.totalLiabilities`.
   - **Owner's Equity**: Slate blue currency card displaying `summary.totalEquity`.
2. **Fiscal Year Boundary Toggle**:
   - Switches query between all-time mode (`/accounts`) and fiscal-year mode (`/accounts?fy=true`).
   - When enabled, revenue and expense ledger totals strictly reflect activity starting July 1st of the active fiscal year.
3. **Grouped Master Table**:
   - Five distinct categorical sections: `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`.
   - Each section displays real-time item count and category subtotal.
   - Column schema: Account Code (mono), Account Name, Category Badge, Live Balance (mono, bold, right-aligned PKR), Status (`Locked` vs `Active`), Actions (`View Ledger`).
4. **Account Creation Modal (`CreateAccountModal`) (v1.3.2 Enhanced)**:
   - Accessible via top header "+ Add Account" CTA (`bg-[#0F172A]`).
   - Inputs: Account Code, Account Name, Category (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
   - Category Range Guidance: Under the Account Code input, displays recommended range per category:
     - `ASSET`: 1000–1999 (Current & Fixed Assets)
     - `LIABILITY`: 2000–2999 (Payables & Obligations)
     - `EQUITY`: 3000–3999 (Owner Capital & Reserves)
     - `REVENUE`: 4000–4999 (Sales & Brokerage Income)
     - `EXPENSE`: 5000–5999 (Operating & Site Expenses)
   - Two-Layer Duplicate Code Protection:
     - **Layer 1 (Client-Side Pre-Validation)**: Receives `existingCodes` prop from `accounts/page.tsx` query cache. If the entered code exists, flags immediate inline error without firing an HTTP request.
     - **Layer 2 (Server-Side 409 Conflict Handling)**: Safely parses `ApiErrorPayload` (`code: 'DUPLICATE_RECORD'`) rejected by the Axios response interceptor, highlighting the code input with a red ring and inline message (`"Account with code '...' already exists."`).
   - Invalidation: Mutates via `useCreateAccount()` and invalidates query cache `['accounts']` upon success.

---

## 6. Account Lifecycle Management & GL Navigation (v1.4.0)

### 6.1 Account Edit Modal (`EditAccountModal`)
- **Location**: `src/app/(dashboard)/accounts/_components/EditAccountModal.tsx`
- **Fields**:
  - **Account Code**: Read-only display with lock badge. Immutable to preserve double-entry audit history.
  - **Account Name**: Editable text field with whitespace trim and required field validation.
  - **Category**: Dropdown selector (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
- **Guardrails**:
  - If `account.isSystemLocked === true`: Category dropdown is disabled with a `System Locked` badge and warning banner (`"System accounts cannot change category to preserve ledger reconciliation"`). The mutation omits `category` from the payload to avoid server 403 errors.
  - If `account.isSystemLocked === false`: Category dropdown is fully editable.
- **Backend API**: `PATCH /api/v1/accounts/:id`
  - Input Schema: `UpdateAccountSchema` (`accountName?: string`, `category?: AccountCategory`)
  - Enforces `403 OPERATION_FORBIDDEN` if category change is attempted on a system-locked account.

### 6.2 Three-Tier Delete / Archive Policy (`DeleteAccountDialog`)
- **Location**: `src/app/(dashboard)/accounts/_components/DeleteAccountDialog.tsx`
- **Three-Tier Policy**:
  1. **Tier 1 (System Locked)**:
     - Identified by `account.isSystemLocked === true`.
     - Action button is completely hidden from the dropdown menu. If opened directly, shows a protected security banner with only a "Close" button. Deletion or archiving is strictly forbidden.
  2. **Tier 2 (Has Transaction History — Soft Delete / Archive)**:
     - Identified by `totalDebit > 0 || totalCredit > 0` or database journal lines count > 0.
     - Modal displays amber warning with real-time debit and credit totals.
     - Action: Updates `isArchived: true` in the database.
     - Active query filter `prisma.account.findMany({ where: { isArchived: false } })` hides archived accounts from the master grid while preserving all double-entry ledger history and historical reporting.
  3. **Tier 3 (Zero Transaction History — Hard Delete)**:
     - Identified by `totalDebit == 0 && totalCredit == 0` and zero journal lines.
     - Modal displays rose warning for permanent removal.
     - Action: `prisma.account.delete({ where: { id } })` permanently deletes the unused account record.
- **Backend API**: `DELETE /api/v1/accounts/:id`
  - Returns `{ success: true, message: string, data: { action: 'DELETED' | 'ARCHIVED' } }`

### 6.3 General Ledger Sub-Tab Navigation
- Located directly underneath the Chart of Accounts header.
- Sub-tabs:
  1. **Chart of Accounts** (Active): Highlights with emerald bottom-border (`#059669`) and bold title.
  2. **Journal Entries**: Core ledger entry screen (inactive with "Coming Soon" badge).
  3. **Trial Balance**: Periodic audit balancing view (inactive with "Coming Soon" badge).

### 6.4 Clean Production Presentation
- Removed developmental "Module 1" badge from the Chart of Accounts header.
- Streamlined action menu inside the master grid with dedicated "Edit Account", "Archive Account" (amber), and "Delete Account" (rose) actions alongside "View Ledger".
