Module 0: Authentication & Security Guardrails (Updated)
1. API Routes (The Endpoints Blueprint)
POST /api/v1/auth/setup



Purpose: Initializes the system and creates the single Admin Account.


Access: Open (Permanently locks after 1 successful creation).


Payload: { email, pin, fullName }


POST /api/v1/auth/login



Purpose: Authenticates the user and initiates the secure HttpOnly cookie session.


Access: Open (Guarded by progressive backoff).


Payload: { pin }


POST /api/v1/auth/logout



Purpose: Destroys the active session.


Access: Protected (Requires valid JWT).


GET /api/v1/auth/me



Purpose: Called by Next.js on startup to validate the persistent session.


Access: Protected.


POST /api/v1/auth/forgot-password



Purpose: Triggers the SMTP service to send a secure 6-digit OTP or secure link to the admin email.


Access: Open (Rate-limited to 1 request per 15 minutes).


Payload: { email }


POST /api/v1/auth/reset-password



Purpose: Verifies the OTP/Token or Master Recovery Key to set a new password.


Access: Open.


Payload: { email, resetToken, newPin } (resetToken can be the Email OTP or the offline Master Recovery Key).


GET /api/v1/auth/lockout-status



Purpose: Returns the current lockout state for the master admin account.
         Used by the AuthVault component on mount to restore countdown and
         tier display after a page refresh.


Access: Open (Public - safe metadata only).


Response 200 OK:
{
  "success": true,
  "data": {
    "isLocked": true,
    "remainingSeconds": 28,
    "failedAttempts": 0,
    "maxAttempts": 4,
    "lockoutTier": 1,
    "displayTier": 2
  }
}


2. Controllers (auth.controller.ts)
setupAdmin(req, res)



Validates payload, checks if system is empty, registers admin.


Generates and returns the Master Recovery Key as a fallback.


login(req, res)



Extracts 4-digit PIN. Calls AuthService.verifyCredentials(pin).



If successful, sets the Express response cookie: res.cookie('token', jwt, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 }).


logout(req, res)



Clears cookie: res.clearCookie('token').


forgotPassword(req, res)



Calls AuthService.generatePasswordResetToken().


Calls MailUtility.sendPasswordResetEmail(email, rawToken).


Always returns 200 OK (to prevent email-enumeration attacks, it returns success even if the email doesn't exist).


resetPassword(req, res)



Calls AuthService.validateResetTokenAndSetPin().



Hashes the new 4-digit PIN, updates DB (pinHash), resets failedAttempts and lockoutTier to 0.


getLockoutStatus(req, res)



Calls AuthService.getLockoutStatus(). Returns current lockout status: { isLocked, remainingSeconds, failedAttempts, maxAttempts, lockoutTier, displayTier }.


3. Services & Core Logic (auth.service.ts)
verifyCredentials(rawPin): The Progressive Lockout Engine



Fetches master admin. If not found, throws 404.


Validates that rawPin is exactly 4 digits.


Checks lockoutExpiresAt. If current time is before expiration, immediately throws ACCOUNT_LOCKED (HTTP 429) along with remainingSeconds, lockoutTier, displayTier, failedAttempts, and maxAttempts.


Calls CryptoUtility.compare(rawPin, user.pinHash).


If True: Resets failedAttempts = 0, lockoutTier = 0, lockoutExpiresAt = null. Returns user.


If False:



failedAttempts += 1


The Math:



If lockoutTier == 0 and failedAttempts >= 5: Trigger Lock.


If lockoutTier > 0 and failedAttempts >= 4: Trigger Lock.


The Lock Trigger:



baseTime = 30 (seconds).


lockDuration = baseTime * (2 ^ lockoutTier). (Tier 1 = 30s, Tier 2 = 60s, Tier 3 = 120s, Tier 4 = 240s).


Set lockoutExpiresAt = NOW() + lockDuration.


Set lockoutTier += 1.


Set failedAttempts = 0 (resets the counter for the next batch of 4 tries).


Throws ACCOUNT_LOCKED (HTTP 429) with metadata:
  - remainingSeconds: number   — seconds until lock expires
  - lockoutTier: number        — internal 0-indexed tier
  - displayTier: number        — human-readable tier (lockoutTier + 1)
  - failedAttempts: number     — 0 (reset for next tier)
  - maxAttempts: number        — 4 (limit for next tier)


getLockoutStatus()



Inspects the single master admin record. Safe to query publicly. Returns:
{
  isLocked: boolean,
  remainingSeconds: number,
  failedAttempts: number,
  maxAttempts: number,        // 5 for Tier 1, 4 for Tier 2+
  lockoutTier: number,        // internal 0-indexed tier
  displayTier: number         // human tier = lockoutTier + 1
}


generatePasswordResetToken(email)



Uses crypto.randomBytes(32) to generate a secure hex token.


Hashes the token using crypto.createHash('sha256').


Saves the hash to the DB under resetPasswordToken and sets resetPasswordExpires = NOW() + 1 hour.


Returns the raw token to the controller.


validateResetToken(email, incomingToken)



Checks if incomingToken matches either the hashed resetPasswordToken OR the hashed masterRecoveryKey.


If matching resetPasswordToken, ensures resetPasswordExpires is still valid. If expired, throws ERR_TOKEN_EXPIRED.


4. Utilities & Middleware (mail.util.ts, crypto.util.ts, authGuard.ts)
MailUtility.sendPasswordResetEmail(email, token): Uses nodemailer configured with a service (like Resend, SendGrid, or standard SMTP). Crafts an HTML email containing a direct link: http://localhost:3000/reset-password?token=XYZ&email=ABC.


CryptoUtility: Handles bcrypt hashing for passwords and sha256 hashing for temporary reset tokens.


authGuard.ts: Express middleware that checks the HttpOnly token cookie on all /api/v1/* routes (except auth), returning 401 if invalid.


5. Explicit Edge Cases Handled
Edge Case 1: Persistent Brute Force Attack



Scenario: A script is trying to guess the admin password 100 times a second.


Guardrail: After 5 failed attempts, they are locked for 30 seconds. If they try again 4 times and fail, they are locked for 60 seconds. Then 120s, 240s, 480s. The progressive multiplier mathematically destroys automated brute force attacks without permanently locking you out of your own system if you simply forgot your password for a minute.


Edge Case 2: Stolen Database Backup



Scenario: Someone gains access to your cloud PostgreSQL database and reads the User table.


Guardrail: Passwords are bcrypt-hashed, making them impossible to decipher. The Reset Tokens and Master Recovery Key are also stored as one-way sha256 hashes. Even with full database access, the attacker cannot log in or use the recovery keys without knowing the raw input.


Edge Case 3: The SMTP Server Goes Down



Scenario: You forget your password, but the Resend/SendGrid API is down, so the "Forgot Password" email never arrives.


Guardrail: The resetPassword endpoint accepts either the emailed reset token OR the Master Recovery Key you generated on Day 1. You type your Master Recovery Key into the UI, bypass the broken email system entirely, and regain access.


Edge Case 4: Email Enumeration Attack



Scenario: An attacker keeps typing different emails into the "Forgot Password" input to see if Wadaan ERP returns "Email not found", letting them know who the admin is.


Guardrail: The forgotPassword controller always returns 200 OK: "If that email exists, a reset link has been sent." The system never confirms or denies the existence of an email address to unauthenticated users.


Module 0.5: System Initializer & Go-Live Cut-Off
1. API Routes (The Endpoints Blueprint)
GET /api/v1/system/status



Purpose: The Next.js frontend calls this the millisecond the Electron app opens to decide whether to show the Dashboard (Screen 10) or lock the screen and render the Starter Modal.


Access: Open (No JWT required, as auth might not exist yet).


POST /api/v1/system/initialize



Purpose: Receives the complete setup payload (banks, projects, vendors, customers) and seeds the entire database.


Access: Open, but strictly guarded by the SystemSetting.isInitialized flag.


Payload:



JSON
{
  "admin": { "email": "operator@wadaan.local", "pin": "1234", "fullName": "Muhammad Jalal" },
  "cashAndBanks": [
    { "name": "Office Safe", "code": "1010", "balance": 250000 },
    { "name": "Meezan Bank", "code": "1020", "balance": 4200000 }
  ],
  "activeProjects": [
    { "name": "Wadaan Heights", "prefix": "WH", "masterBOQ": 60000000, "spentToDate": 14500000 }
  ],
  "unpaidPayables": [
    { "vendorName": "Ali Hardware", "amountDue": 650000 }
  ],
  "activeDeals": [
    { "customerName": "Zain Malik", "phone": "03001234567", "projectName": "Wadaan Heights", "totalDealValue": 5000000, "amountReceivedPast": 2000000 }
  ]
}




2. Controllers (system.controller.ts)
getStatus(req, res)



Queries the SystemSetting table (creates row if it doesn't exist).


Returns { success: true, data: { isInitialized: true/false, goLiveDate: ... } }.


initializeSystem(req, res)



Passes req.body to the massive Zod schema validator (GoLivePayloadSchema).


Calls SystemService.executeGoLive(req.body).


Returns 201 Created with:
{
  "success": true,
  "message": "System Go-Live initialization completed successfully.",
  "masterRecoveryKey": "ABC123XYZ...",
  "goLiveDate": "2026-09-05T..."
}


3. Services & Core Logic (system.service.ts)
This service orchestrates the atomic prisma.$transaction.

executeGoLive(payload)



Pre-flight Check: Queries SystemSetting. If isInitialized === true, throws AppError('System is already initialized.', 409, 'ALREADY_INITIALIZED'). (Prevents someone from POSTing to this route to overwrite your data).


Step 1: Admin Creation: Atomically creates Master Administrator within `tx` (hashes 4-digit PIN, generates and hashes Master Recovery Key). If admin was pre-created via /auth/setup, verifies admin existence.


Step 2: Base Chart of Accounts Generation:



Automatically inserts the immutable system accounts: Accounts Receivable (AR), Accounts Payable (AP), Customer Advance Wallet (Liability), Escrow Liability, Sales Revenue, Cost of Goods Sold (COGS).


Step 3: Asset Accounts Generation:



Loops through payload.cashAndBanks. Creates an Account row for each.


Step 4: The Balancing Math (Crucial Step):



In double-entry accounting, Assets = Liabilities + Equity.


The backend calculates: Total Assets (Banks + Cash + WIP Spent + Deal Pending Balances) minus Total Liabilities (Vendor Unpaid Bills).


The difference is automatically assigned to a newly created account: "Owner's Opening Equity". This guarantees the opening journal perfectly balances to 0.00.


Step 5: The Master Opening Journal Entry:



Creates a JournalEntry titled "System Go-Live Opening Balances".


Inserts JournalLines debiting banks, cash, AR, and WIP accounts.


Inserts JournalLines crediting AP and Owner's Equity.


Step 6: Data Hydration (Projects, Vendors, Customers):



Creates all Project records. (Ties spentToDate to the WIP account).


Creates all Vendor records and inserts an ExpenseBill for each with status UNPAID.


Creates all Customer records and Deal records. Automatically generates a single DealInvoice for the remaining balance with status UNPAID.


Step 7: Lock the System:



Updates SystemSetting: sets isInitialized = true, goLiveDate = NOW().


4. Utilities & Middleware (validation.util.ts)
GoLivePayloadSchema (Zod):



This is an extremely strict validator. It ensures no negative numbers are passed (e.g., z.number().min(0) for bank balances).


Ensures project prefixes are unique and uppercase.


Validates phone numbers.


DoubleEntryValidator.validate(lines):



Even though the Go-Live logic calculates the Owner's Equity to balance the equation, the transaction still passes the final array of journal lines through the standard DoubleEntryValidator utility. If a floating-point rounding error occurs, the validator catches it and rolls back the entire setup.


5. Explicit Edge Cases Handled
Edge Case 1: The Power Outage (Atomicity Failure)



Scenario: You hit "Launch ERP" on the Starter Modal. The backend creates the Admin, creates the Banks, but your laptop loses internet connection to the cloud database before it finishes creating the Customers.


Guardrail: Because the entire executeGoLive function is wrapped in prisma.$transaction, PostgreSQL sees the connection drop and instantly executes a ROLLBACK. Your database remains completely empty (isInitialized = false), allowing you to simply restart the app and try again without dealing with corrupted, half-migrated data.


Edge Case 2: The Double Submission (Race Condition)



Scenario: You get impatient while the modal is loading and click "Launch ERP" four times in rapid succession.


Guardrail: The controller checks SystemSetting.isInitialized inside a locked row. The first click locks the table, processes the setup, and sets the flag to true. Clicks 2, 3, and 4 will hit the ERR_ALREADY_INITIALIZED barrier and safely reject, preventing duplicate bank accounts or cloned admin users.


Edge Case 3: Zero-Value Data



Scenario: You are starting Wadaan Real Estate completely fresh. You have 0 active projects, 0 vendors, and 0 customers. You only have Rs. 100,000 in your pocket (Office Safe).


Guardrail: The Zod schema allows empty arrays [] for Projects, Vendors, and Deals. The accounting math dynamically adjusts: Assets (100k) - Liabilities (0) = Owner's Equity (100k). The system initializes perfectly clean without forcing you to input fake dummy data.


Edge Case 4: Decimals and Paisas



Scenario: A vendor bill isn't exactly Rs. 650,000; it's Rs. 650,000.50.


Guardrail: If handled with raw JavaScript, this could cause a .9999999 error in the Journal. The executeGoLive service uses decimal.js for all equity calculations, ensuring the Opening Journal balances to the exact decimal point required by PostgreSQL Decimal(15,2).


Module 1: Core Accounting & Ledgers (The Vault) [IMPLEMENTED]
1. API Routes (The Endpoints Blueprint)

GET /api/v1/accounts
Purpose: Fetches all accounts (Screen 1) with their live calculated balances.
Access: Protected (`authGuard`).
Query Params: `?fy=true` (If true, calculates Revenue/Expense balances strictly from July 1st of the current active fiscal year).
Response (200 OK):
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "accountCode": "1001",
        "accountName": "Meezan Bank",
        "category": "ASSET",
        "isSystemLocked": false,
        "totalDebit": "2500000.00",
        "totalCredit": "0.00",
        "balance": "2500000.00"
      }
    ],
    "grouped": {
      "ASSET": [ ... ],
      "LIABILITY": [ ... ],
      "EQUITY": [ ... ],
      "REVENUE": [ ... ],
      "EXPENSE": [ ... ]
    },
    "summary": {
      "totalAssets": "6500000.00",
      "totalLiabilities": "500000.00",
      "totalEquity": "6000000.00",
      "totalRevenue": "0.00",
      "totalExpenses": "0.00"
    }
  }
}
```

POST /api/v1/accounts
Purpose: Create a new custom account (e.g., adding "Faysal Bank" or "Marketing Expense").
Access: Protected (`authGuard`).
Payload:
```json
{
  "accountCode": "1030",
  "accountName": "Faysal Bank",
  "category": "ASSET"
}
```
Response (201 Created):
```json
{
  "success": true,
  "message": "Account 'Faysal Bank' (1030) created successfully.",
  "data": {
    "id": "uuid",
    "accountCode": "1030",
    "accountName": "Faysal Bank",
    "category": "ASSET",
    "isSystemLocked": false
  }
}
```

PATCH /api/v1/accounts/:id
Purpose: Updates an account's name or category (Screen 1 - v1.4.0).
Access: Protected (`authGuard`).
Payload:
```json
{
  "accountName": "Meezan Corporate Bank",
  "category": "ASSET"
}
```
Validation & Guardrails:
- `accountName`: Optional string, min length 1.
- `category`: Optional enum (`ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE`).
- System Lock Guardrail: If `account.isSystemLocked === true` and category change is requested, returns `403 Forbidden` (`OPERATION_FORBIDDEN`).
Response (200 OK):
```json
{
  "success": true,
  "message": "Account 'Meezan Corporate Bank' updated successfully.",
  "data": {
    "id": "uuid",
    "accountCode": "1001",
    "accountName": "Meezan Corporate Bank",
    "category": "ASSET",
    "isSystemLocked": false
  }
}
```

DELETE /api/v1/accounts/:id
Purpose: Deletes or archives an account using the three-tier policy (Screen 1 - v1.4.0).
Access: Protected (`authGuard`).
Three-Tier Policy:
- Tier 1 (System-Locked): Rejects with `403 Forbidden` (`OPERATION_FORBIDDEN`). System accounts cannot be deleted or archived.
- Tier 2 (Has Journal Lines): Soft-deletes record (`isArchived: true`). Preserves double-entry audit history.
- Tier 3 (Zero Journal Lines): Hard-deletes record permanently from database.
Response (200 OK):
```json
{
  "success": true,
  "message": "Account 'Old Cash Box' (1050) has transaction history and was archived.",
  "data": {
    "action": "ARCHIVED"
  }
}
```

POST /api/v1/journals
Purpose: Post a manual double-entry (Screen 2 - v1.5.0).
Access: Protected (`authGuard`).
Payload:
```json
{
  "entryDate": "2026-09-02T00:00:00.000Z",
  "description": "Office Tea & Snacks",
  "lines": [
    {
      "accountId": "uuid-expense-account",
      "debitAmount": 5000,
      "creditAmount": 0,
      "memo": "Chai & Biscuits for client meeting",
      "customerId": null,
      "vendorId": "uuid-vendor-party",
      "projectId": "uuid-project-cost-center"
    },
    {
      "accountId": "uuid-cash-account",
      "debitAmount": 0,
      "creditAmount": 5000,
      "memo": null,
      "customerId": null,
      "vendorId": null,
      "projectId": null
    }
  ]
}
```
Validation & Guardrails:
- `entryDate`: ISO 8601 string.
- `description`: String, 3–255 characters.
- `lines`: Minimum 2 lines required. Total debits must equal total credits exactly (tested via `Decimal.js`).
- `memo`: Optional string, max 200 chars.
- `customerId` / `vendorId`: Optional UUIDs pointing to Customer or Vendor party records.
- `projectId`: Optional UUID pointing to Project cost center.
- `isSystemLocked` guard: Throws `403 Forbidden` (`ERR_SYSTEM_ACCOUNT_LOCKED`) if any line targets an account flagged `isSystemLocked: true`.
Response (201 Created):
```json
{
  "success": true,
  "message": "Journal entry 'JV-0002' posted successfully.",
  "data": {
    "id": "uuid",
    "entryNumber": "JV-0002",
    "entryDate": "2026-09-02T00:00:00.000Z",
    "description": "Office Tea & Snacks",
    "lines": [ ... ]
  }
}
```

GET /api/v1/journals
Purpose: Fetches a paginated list of recorded journal entries and their line items for Screen 2 history table (v1.5.0).
Access: Protected (`authGuard`).
Query Params: `?page=1&limit=20` (defaults: page 1, limit 20).
Response (200 OK):
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": "uuid",
        "entryNumber": "JV-0002",
        "entryDate": "2026-09-02T00:00:00.000Z",
        "description": "Office Tea & Snacks",
        "createdAt": "2026-09-02T10:15:00.000Z",
        "lines": [
          {
            "id": "uuid-line",
            "accountId": "uuid-acc",
            "debitAmount": "5000.00",
            "creditAmount": "0.00",
            "memo": "Chai & Biscuits for client meeting",
            "customerId": null,
            "vendorId": "uuid-vendor",
            "projectId": "uuid-proj",
            "account": {
              "id": "uuid-acc",
              "accountCode": "5010",
              "accountName": "Tea & Entertainment",
              "category": "EXPENSE"
            }
          }
        ]
      }
    ],
    "total": 42,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

POST /api/v1/journals/:id/reverse
Purpose: You cannot DELETE a financial record. This route zeroes out a mistake by posting a mirrored reverse entry.
Access: Protected (`authGuard`).
Response (201 Created):
```json
{
  "success": true,
  "message": "Journal entry reversed successfully. Reversal voucher 'JV-0003' posted.",
  "data": {
    "id": "uuid",
    "entryNumber": "JV-0003",
    "entryDate": "2026-09-05T19:00:00.000Z",
    "description": "[REVERSAL] Office Tea & Snacks",
    "lines": [ ... ]
  }
}
```

GET /api/v1/journals/ledger/:accountId
Purpose: Generates the chronological statement (Screen 3) for any bucket.
Access: Protected (`authGuard`).
Query Params: `?startDate=2026-07-01&endDate=2026-09-02`
Response (200 OK):
```json
{
  "success": true,
  "data": {
    "account": {
      "id": "uuid",
      "accountCode": "1001",
      "accountName": "Meezan Bank",
      "category": "ASSET",
      "isSystemLocked": false
    },
    "filter": {
      "startDate": "2026-07-01T00:00:00.000Z",
      "endDate": "2026-09-02T23:59:59.999Z"
    },
    "openingBalance": "0.00",
    "closingBalance": "2500000.00",
    "totalDebits": "2500000.00",
    "totalCredits": "0.00",
    "transactions": [
      {
        "id": "line-uuid",
        "journalId": "journal-uuid",
        "entryNumber": "JV-OPENING-001",
        "entryDate": "2026-09-05T18:00:00.000Z",
        "description": "System Go-Live Opening Balances",
        "debitAmount": "2500000.00",
        "creditAmount": "0.00",
        "runningBalance": "2500000.00"
      }
    ]
  }
}
```

2. Controllers (account.controller.ts & journal.controller.ts)
accountController.getAccounts(req, res)



Extracts the fy query parameter.


Calls FiscalYearUtility.getCurrentBoundary() to find the most recent July 1st.


Calls AccountService.getLiveBalances(fiscalStartDate).


Returns the grouped Chart of Accounts.


journalController.createEntry(req, res)



Validates payload array length (must be $\ge 2$ lines).


Calls DoubleEntryValidator.validateZeroSum(lines).


Calls JournalService.postEntry(payload). Returns 201 Created with the new JV-XXXX number.


journalController.reverseEntry(req, res)



Fetches the original JournalEntry.


Maps over the lines, swapping debitAmount and creditAmount.


Appends "[REVERSAL]" to the description and posts a new JournalEntry.


journalController.getLedger(req, res)



Extracts startDate and endDate. If missing, defaults to the current Fiscal Year (July 1st to Today).


Calls LedgerService.generateChronologicalLedger().


3. Services & Core Logic (account.service.ts & ledger.service.ts)
AccountService.getLiveBalances(fiscalStartDate)



Executes a heavy PostgreSQL GROUP BY aggregation across all JournalLines.


The Accounting Math Rule:



For ASSET and EXPENSE: Balance = SUM(Debits) - SUM(Credits)


For LIABILITY, EQUITY, and REVENUE: Balance = SUM(Credits) - SUM(Debits)


The Fiscal Year Rule: For Asset/Liability/Equity, it sums all time. For Revenue/Expense, it only sums transactions WHERE entryDate >= fiscalStartDate. (This dynamically calculates Retained Earnings without needing hard database closes).


JournalService.postEntry(payload, tx)



Can run standalone or accept an existing Prisma transaction (tx) from Module 2 (Bills) or Module 3 (Receipts).


Checks isSystemLocked on the accounts being manually targeted.


Generates the next sequential Entry Number (e.g., JV-0142).


Inserts the JournalEntry and JournalLines in a single database operation.


LedgerService.generateChronologicalLedger(accountId, startDate, endDate)



Step 1: The Opening Balance. Sums all transactions for this account prior to startDate.


Step 2: The Loop. Fetches all transactions between startDate and endDate ordered by entryDate ASC.


Step 3: The Running Total. Iterates through the array. runningBalance = previousBalance + (Debit - Credit) (inverting for liabilities). Adds this runningBalance to every row so the frontend table displays perfectly.


4. Utilities & Math Engines (math.util.ts & fiscal.util.ts)
FiscalYearUtility.getBoundaries(inputDate)



Checks the month of inputDate (e.g., today is September 2, 2026).


If month is $\ge 7$ (July - Dec), startDate is July 1st of the current year (July 1, 2026), and endDate is June 30th of the next year (June 30, 2027).


If month is $< 7$ (Jan - June), startDate is July 1st of the previous year, endDate is June 30th of the current year.


MathUtility.decimal(value)



Imports decimal.js. All money enters as new Decimal(value).


DoubleEntryValidator.validateZeroSum(lines)



Initializes let totalDifference = new Decimal(0).


Loops through lines: totalDifference = totalDifference.plus(line.debit).minus(line.credit).


If !totalDifference.isZero(), throws ERR_DOUBLE_ENTRY_IMBALANCE.


5. Explicit Edge Cases Handled
Edge Case 1: The "Fractional Paisa" Rounding Trap



Scenario: You split a Rs. 100 expense across three projects (Rs. 33.33 each). 33.33 * 3 = 99.99. If you credit the bank for Rs. 100.00, your journal is off by 0.01. JavaScript will sometimes force this through if using raw floats (e.g., 99.99000000001).


Guardrail: DoubleEntryValidator strictly uses decimal.js. The backend will mathematically block the Rs. 99.99 vs Rs. 100.00 entry, returning a 400 Bad Request telling the user exactly which line is missing the 1 paisa to balance the book.


Edge Case 2: Manually Altering Escrow or AP (The Lock Check)



Scenario: You owe a vendor Rs. 50,000. Instead of processing a payment on Screen 7, you try to manually debit "Accounts Payable" on Screen 2.


Guardrail: During JournalService.postEntry(), the backend checks the targeted accounts. If account.isSystemLocked === true, it throws ERR_SYSTEM_ACCOUNT_LOCKED. You physically cannot bypass the Screen 5/7 workflow, guaranteeing your vendor Khaatas perfectly match your general ledger.


Edge Case 3: The July 1st Profit Illusion



Scenario: On June 30th, Screen 10 shows Rs. 5,000,000 Net Income. You wake up on July 1st, and Screen 10 shows Rs. 0 Net Income. Did you lose 5 Million?


Guardrail: No. AccountService.getLiveBalances dynamically shifts the boundary. The Rs. 5,000,000 is still safely inside your Meezan Bank (Asset) account which does not reset. The system automatically rolls the past year's net income into your Owner's Equity total on the backend, allowing you to track this year's performance starting fresh from zero.


Edge Case 4: The Deletion Audit Trail



Scenario: You accidentally log Rs. 50,000 for "Tea" instead of Rs. 5,000. You want to hit a delete button.


Guardrail: True accounting systems have no delete button. You hit "Reverse" on Screen 3. The reverseEntry controller automatically creates a completely new journal entry crediting Tea for 50k and debiting Cash for 50k. Both the mistake and the fix remain visible in the ledger forever, making your books 100% audit-proof for the FBR or any partner.



Module 2: Payables & Projects (The Outflow Engine)
1. API Routes (The Endpoints Blueprint)
Projects (Screen 4)

POST /api/v1/projects



Purpose: Initializes a new construction site.


Payload: { projectName: "Wadaan Heights", projectPrefix: "WH", masterBOQ: 60000000 }


GET /api/v1/projects

Purpose: Fetches the master grid of projects with their live "Health Bars" (BOQ vs. Spent).

GET /api/v1/projects/:id

Purpose: Fetches detailed project metrics including associated bills, spentToDate, budgetVariance, isOverBudget, and budgetBurnPercentage.

PATCH /api/v1/projects/:id/status

Purpose: Updates project status (e.g. changes status to ACTIVE, COMPLETED, or ON_HOLD).
Payload: { status: "COMPLETED" }

Vendors (Screens 5 & 7)

POST /api/v1/vendors

Purpose: Adds a new supplier.
Payload: { vendorName: "Ali Hardware", phone: "03001234567" }

GET /api/v1/vendors

Purpose: Lists all suppliers with live calculated Total Outstanding balances and totalPaid.

GET /api/v1/vendors/:id/unpaid-bills

Purpose: Fetches the exact queue of unpaid invoices for Screen 7, ordered strictly by oldest date first (FIFO).

Expense Bills & Payments (Screens 5 & 7)

POST /api/v1/bills

Purpose: Logs a new expense (Screen 5) with automatic WIP vs Overhead routing, budget overrun warning, and GL journal posting.
Payload: { vendorId, projectId (optional), invoiceNumber, billDate, paymentType: "ACCOUNTS_PAYABLE" | "DIRECT_CASH", sourceAccountId (required if DIRECT_CASH), lineItems: [{ description, quantity, unitPrice }] }

GET /api/v1/bills

Purpose: Lists all expense bills with optional filtering (?vendorId, ?projectId, ?paymentStatus).

GET /api/v1/bills/:id

Purpose: Fetches expense bill details by ID with line items, vendor, and project relations.

POST /api/v1/payments/vendor

Purpose: Executes the Thursday Payment Run (Screen 7) using strict FIFO waterfall across unpaid bills.
Payload: { vendorId, sourceAccountId, amountPaid, chequeRef (optional), paymentDate (optional) }

GET /api/v1/payments/vendor

Purpose: Fetches vendor payment history with optional ?vendorId filter.

GET /api/v1/payments/vendor/:id

Purpose: Fetches payment run details by ID.


2. Controllers (bill.controller.ts & payment.controller.ts)
billController.createBill(req, res)



Runs Zod validation (ensuring quantities $> 0$, prices $\ge 0$).


Calls BillService.validateUniqueInvoice(vendorId, invoiceNumber).


Calls BillService.processExpense(payload).


Returns 201 Created with the calculated grandTotal.


paymentController.executeVendorPayment(req, res)



Validates the bank account has enough liquid cash.


Calls FifoService.allocatePayment(payload).


Returns 200 OK with an array of which specific bills were settled.


3. Services & Core Logic (bill.service.ts & fifo.service.ts)
BillService.processExpense(payload)
This function runs entirely inside a prisma.$transaction(async (tx) => { ... }).

Step 1: Iterates through lineItems, using decimal.js to calculate qty * unitPrice. Sums them to get grandTotal.


Step 2: Inserts the ExpenseBill and its nested BillLineItems into PostgreSQL.


Step 3: The Project Routing Logic



If projectId is present: The target Debit account is "WIP Inventory" (Asset).


If projectId is null: The target Debit account is "General Office Overhead" (Expense).


Step 4: The Payment Routing Logic



If paymentType === 'ACCOUNTS_PAYABLE': The target Credit account is "Accounts Payable" (Liability). Sets Bill status to UNPAID.


If paymentType === 'DIRECT_CASH': The target Credit account is "Office Safe / Bank" (Asset). Sets Bill status to PAID.


Step 5: Calls JournalService.postEntry(journalPayload, tx) to physically inject the double-entry math into Module 1.


FifoService.allocatePayment(payload)
The absolute heart of Screen 7. Also runs inside a prisma.$transaction.

Step 1: Queries ExpenseBills WHERE vendorId = X AND paymentStatus != 'PAID' ORDER BY billDate ASC.


Step 2: Initializes let remainingPayment = new Decimal(payload.amountPaid).


Step 3: The Waterfall Loop:



For each bill, calculates pendingAmount = bill.grandTotal - (amount already paid towards this bill).


If remainingPayment >= pendingAmount:



Deducts pendingAmount from remainingPayment.


Updates Bill status to PAID.


If remainingPayment < pendingAmount:



Updates Bill status to PARTIAL.


Sets remainingPayment = 0.


Breaks the loop.


Step 4: Records the physical VendorPayment voucher (Cheque #, Bank ID).


Step 5: Calls JournalService.postEntry(..., tx) to Debit Accounts Payable and Credit the Bank Account.


4. Utilities & Math Engines
BillUtility.checkAntiDuplicate(vendorId, invoiceNumber)



Queries the DB. If it finds a match, it instantly aborts. Vendors often send the same invoice twice (once on WhatsApp, once on paper). This prevents Wadaan from paying for the same cement twice.


FifoUtility.preventOverpayment(vendorId, amountPaid)



Before the FIFO loop even starts, this sums the total pending debt for the vendor.


If amountPaid > totalDebt, it throws ERR_OVERPAYMENT_NOT_ALLOWED. Wadaan ERP strictly forbids "floating credits" (giving a vendor 100k when you only owe 80k), as it complicates cash-flow reports.


5. Explicit Edge Cases Handled
Edge Case 1: The "Double-Click" Race Condition



Scenario: You are on Screen 7. You click "Pay Rs. 50,000" but your laptop lags, so you double-click the button. Two separate API requests hit the backend at the exact same millisecond. Will it deduct Rs. 100,000 from your bank and pay the bills twice?


Guardrail: No. Because FifoService runs in a Prisma Transaction, PostgreSQL utilizes internal concurrency locks. The first request grabs the unpaid bills and locks the rows. The second request is forced to wait. By the time the first request finishes, the bills are marked PAID. The second request then evaluates the queue, sees Rs. 0 debt, and throws ERR_NO_OUTSTANDING_DEBT, completely protecting your bank ledger.


Edge Case 2: Tagging a Closed Project



Scenario: "Wadaan Heights" is finished, sold, and marked COMPLETED. Two months later, a straggler invoice for paint arrives, and you try to tag it to Wadaan Heights on Screen 5.


Guardrail: BillService fetches the Project status. If COMPLETED, it throws ERR_PROJECT_CLOSED. You cannot secretly add costs to a closed project, because that would silently alter historical Profit & Loss reports you already gave to your partners. You must either intentionally reopen the project (leaving an audit trail) or tag it to General Overhead.


Edge Case 3: The Partial-Partial FIFO Hit



Scenario: You owe Rs. 100,000 on Bill A. You pay Rs. 40,000 this week (Status becomes PARTIAL). Next week, you pay Rs. 30,000.


Guardrail: The FIFO engine dynamically calculates pendingAmount directly from the database ledger, not just the static grandTotal. It sees Bill A is a PARTIAL 100k with 60k remaining, applies the 30k, and leaves it as PARTIAL with 30k remaining.


Edge Case 4: The Zero-Dollar Line Item



Scenario: A vendor sends 10 bags of cement, but includes 1 bag for "Free/Sample" on the invoice with a price of Rs. 0.


Guardrail: The Zod schema explicitly allows unitPrice: z.number().min(0) (inclusive of zero) so you can still log the item for inventory/audit tracking purposes without it breaking the double-entry math (which gracefully ignores Rs. 0.00 journal lines).



Module 3: Receivables & Revenue (The Inflow Engine) [IMPLEMENTED]
1. API Routes (The Endpoints Blueprint)
Customers & Deals (Screen 8)

POST /api/v1/customers
Purpose: Creates a new customer with initial zero wallet balance.
Payload: { fullName: "Zain Ahmed", phone: "03001234567" }
Response (201): { success: true, data: { id, fullName, phone, walletBalance: "0.00" }, message: "Customer created successfully" }

GET /api/v1/customers
Purpose: Lists all clients, their active walletBalance (Mobilization advances held), and deal/receipt counts.
Response (200): { success: true, data: [{ id, fullName, phone, walletBalance, _count: { deals, receipts } }] }

GET /api/v1/customers/:id
Purpose: Fetches complete customer profile with all deals, invoices, and payment receipts.
Response (200): { success: true, data: { id, fullName, phone, walletBalance, deals: [...], receipts: [...] } }

POST /api/v1/customers/:customerId/apply-wallet
Purpose: Consumes client mobilization advance held in walletBalance toward an unpaid DealInvoice without moving cash.
Payload: { invoiceId: "uuid", amount: 500000 }
Response (200): { success: true, data: { walletBalanceRemaining: "0.00", invoicePaid: true }, message: "Customer wallet advance applied toward invoice successfully" }

POST /api/v1/deals
Purpose: Initializes a new financial contract (Sale, Construction, or Brokerage) and posts accrual journal entries.
Payload: {
  customerId: "uuid",
  dealType: "WADAAN_SALE" | "CONSTRUCTION" | "BROKERAGE",
  projectId: "uuid (optional)",
  totalValue: 20000000,
  commissionAmount: 200000, // Mandatory if dealType === "BROKERAGE"
  invoices: [
    { description: "Token / Down Payment", amount: 5000000, dueDate: "2026-09-15T00:00:00.000Z" },
    { description: "Installment 1", amount: 15000000, dueDate: "2026-10-15T00:00:00.000Z" }
  ]
}
Response (201): { success: true, data: { id, customerId, dealType, totalValue, commissionAmount, invoices: [...] }, message: "Deal contract initialized successfully" }

GET /api/v1/deals
Purpose: Fetches the master deal grid, calculating pendingBalance dynamically.
Response (200): { success: true, data: [{ id, customerId, dealType, totalValue, pendingBalance, customer: {...}, project: {...}, invoices: [...] }] }

GET /api/v1/deals/:id
Purpose: Fetches single deal with dynamic pending balance and invoices.
Response (200): { success: true, data: { id, totalValue, pendingBalance, customer: {...}, project: {...}, invoices: [...] } }

POST /api/v1/deals/:dealId/transfer
Purpose: Executes the "File Transfer" (Resale) logic to reassign deal ownership.
Guardrail: Rejects with ERR_PENDING_FUNDS_LOCKED (400) if any invoices are PENDING_CLEARANCE.
Payload: { newCustomerId: "uuid", transferFeeAmount: 50000 }
Response (200): { success: true, data: { deal: {...}, previousCustomerId, newCustomer: {...}, feeInvoice: {...} }, message: "File transfer executed successfully" }

Receipts & Cheque Clearing (Screen 9)

POST /api/v1/receipts
Purpose: Logs physical money crossing the desk (CASH, CHEQUE, ONLINE).
- CASH: Immediately CLEARED, marks invoices PAID, updates Customer.walletBalance on overpayment, posts GL journal.
- CHEQUE/ONLINE: Status PENDING, enters Cheque Waiting Room, marks invoices PENDING_CLEARANCE. NO GL journal until clearance.
Payload: {
  customerId: "uuid",
  invoiceIds: ["uuid"], // Optional; if omitted, treated as unallocated advance directly into wallet
  amount: 5000000,
  paymentMethod: "CASH" | "CHEQUE" | "ONLINE",
  bankRefNumber: "CHQ-882910", // Mandatory for CHEQUE/ONLINE
  targetAccountId: "uuid (optional)"
}
Response (201): {
  success: true,
  data: { receipt: {...}, status: "CLEARED" | "PENDING", ... },
  message: "..."
}

GET /api/v1/receipts/waiting-room
Purpose: Fetches all receipts where clearanceStatus === 'PENDING' for the Cheque Waiting Room.
Response (200): { success: true, data: [{ id, amount, paymentMethod, bankRefNumber, customer: {...}, invoices: [...] }] }

POST /api/v1/receipts/:id/clear
Purpose: Confirms bank settlement, moving money from "Waiting" into the live General Ledger.
Payload: { targetBankAccountId: "uuid" }
Response (200): { success: true, data: { receipt: {...}, clearedInvoicesCount: 1, settledAmount: "...", excessInjectedToWallet: "...", journalEntry: {...} }, message: "Cheque cleared and posted to ledger successfully" }

POST /api/v1/receipts/:id/bounce
Purpose: Rejects a dishonored cheque without destroying accounting ledgers. Invoices revert to UNPAID.
Response (200): { success: true, data: { receipt: {...} }, message: "Cheque marked as bounced; invoices reverted to unpaid" }


2. Controllers (deal.controller.ts & receipt.controller.ts)
dealController.createDeal(req, res)



Validates payload via Zod. Ensures sum of invoices matches totalValue exactly.


Calls DealService.initializeContract(payload). Returns 201 Created.


dealController.transferFile(req, res)



Validates the old deal is active. Calls DealService.executeFileTransfer().


receiptController.receivePayment(req, res)



Validates method. If CHEQUE, requires bankRefNumber.


Calls ReceiptService.logInflow(). Returns 201 with PENDING or CLEARED status.


receiptController.clearCheque(req, res)



Calls ReceiptService.settlePendingCheque(). Returns 200 OK.


3. Services & Core Logic (deal.service.ts & receipt.service.ts)
DealService.initializeContract(payload)
Runs entirely inside a prisma.$transaction.

Step 1: Validates DealType.


Step 2: Inserts the Deal record.


Step 3: Inserts all nested DealInvoice rows (the milestone or installment schedule). Statuses are strictly UNPAID.


Step 4 (Brokerage Splitting Logic): If dealType === BROKERAGE, the system instantly logs a background Journal Entry locking the non-Wadaan portion into an Escrow Liability.



Example: Rs. 20M deal, 200k commission.


The invoices generated total Rs. 20M.


The UI displays 200k as Wadaan Revenue, 19.8M as Escrow (Liability to the seller).


ReceiptService.logInflow(payload)

Step 1: Inserts the Receipt record.


Step 2: Method Branching



If CASH: Sets status to CLEARED. Immediately calls JournalService.postEntry() to debit the Office Safe and credit Accounts Receivable / Revenue.


If CHEQUE or ONLINE: Sets status to PENDING. CRITICAL: No Journal Entry is created yet. The live bank balance remains untouched.


Step 3: Updates the targeted DealInvoice status to PENDING_CLEARANCE so the UI stops flashing red overdue warnings.


ReceiptService.settlePendingCheque(receiptId, targetBankAccountId)
Runs inside a prisma.$transaction.

Step 1: Validates receipt is currently PENDING.


Step 2: Updates Receipt clearanceStatus = CLEARED.


Step 3: The FIFO Invoice Matcher



Finds all DealInvoices marked PENDING_CLEARANCE tied to this receipt.


Updates them to PAID.


Step 4: The Escrow & Wallet Injector



If the customer overpaid (e.g., owed Rs. 400k, cheque was for Rs. 500k), the excess Rs. 100k is automatically injected into Customer.walletBalance (Mobilization Advance Liability).


Step 5: The Ledger Injection



Calls JournalService.postEntry(tx) to physically debit Meezan Bank and credit Accounts Receivable / Customer Wallet Liability.


4. Utilities & Math Engines
RevenueSplitUtility.calculateBrokerage()



Automatically calculates the Wadaan Commission vs. Seller Escrow split to ensure money held for third parties is never accidentally calculated as Wadaan Net Income on Screen 10.


WalletManager.consumeAdvance()



A utility used when a new DealInvoice is generated for a client who already has a positive walletBalance. Instead of asking them for cash, the system asks the operator: "Apply Rs. X from Wallet?" If yes, it creates a Journal Entry debiting the Customer Wallet Liability and crediting Revenue, marking the invoice PAID without any physical cash moving.


FileTransferEngine.reassignDebt()



Moves an active Deal from Client A to Client B.


Takes the total pendingBalance and assigns it to Client B's Khaata.


Auto-generates a new DealInvoice for the "Transfer Fee" (e.g., Rs. 50,000) assigned to Client A or B (based on user selection), routed directly to Wadaan Revenue.


5. Explicit Edge Cases Handled
Edge Case 1: The Bounced Cheque Reversal



Scenario: Zain hands you a cheque for Rs. 1M. Screen 8 shows him as "Paid (Pending)". Three days later, Meezan Bank calls—the cheque bounced.


Guardrail: You click "Bounce" on Screen 9. The controller sets the Receipt to BOUNCED. The associated DealInvoice reverts from PENDING_CLEARANCE back to UNPAID. Because no journal entry was ever made for a pending cheque, your bank ledgers are perfectly intact, but Zain's red overdue alarms instantly reactivate on your dashboard.


Edge Case 2: Paying Multiple Invoices with One Cheque



Scenario: A client missed Installment 1 (Rs. 100k) and Installment 2 (Rs. 100k). They bring a single cheque for Rs. 200k.


Guardrail: The POST /api/v1/receipts endpoint accepts an array of invoiceIds. It sums the requested invoices and validates that the cheque amount perfectly covers them. Upon clearing, it loops through and marks both invoices as PAID simultaneously.


Edge Case 3: The Unallocated Overpayment (Customer Wallet)



Scenario: You request Rs. 5,000,000 to start building a plaza. You only bill them Rs. 1,000,000 for the Foundation. The client gives you the full Rs. 5,000,000 upfront.


Guardrail: If an amount received exceeds the currently due invoices, the ReceiptService catches the remainder. It strictly routes the Rs. 4,000,000 into the Customer Wallet (a Liability account). Screen 10 will show this as "Client Funds Held", preventing you from accidentally spending their finishing money on an unrelated plot purchase.


Edge Case 4: File Transfer During a Pending Cheque



Scenario: Client A gives you a cheque on Monday, and on Tuesday (before it clears), asks to transfer the file to Client B.


Guardrail: The dealController.transferFile endpoint actively queries the Receipt table. If it finds any PENDING receipts linked to the deal, it throws ERR_PENDING_FUNDS_LOCKED. You cannot legally transfer a file while a cheque is floating; the system mathematically forces you to wait for bank clearance (or bounce it) before the ownership can safely change hands.


Module 4: Executive Intelligence (The Aggregation Engine)
1. API Routes (The Endpoints Blueprint)
GET /api/v1/reports/snapshot

Purpose: Fetches the top-row "Survival Snapshot" metrics (Liquid Cash, Client Funds Held, Total AR, Total AP).
Access: Protected (Bearer JWT / Cookie).
Response (200 OK):
```json
{
  "success": true,
  "data": {
    "liquidCash": "4450000.00",
    "clientFundsHeld": "500000.00",
    "totalAR": "15000000.00",
    "totalAP": "650000.00"
  }
}
```

GET /api/v1/reports/deal-margins

Purpose: Generates the Deal-by-Deal P&L table, subtracting project WIP costs from collected sale revenues.
Access: Protected (Bearer JWT / Cookie).
Query Params: `?status=ACTIVE|COMPLETED` (Optional filter by linked project status).
Response (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "dealId": "c3f1b402-86bb-49e2-9d33-40e8a715f523",
      "dealType": "WADAAN_SALE",
      "customerName": "Zain Ahmed",
      "projectName": "Wadaan Heights",
      "totalValue": "20000000.00",
      "revenueCollected": "5000000.00",
      "totalProjectCost": "14500000.00",
      "grossProfit": "-9500000.00",
      "marginPercentage": "-190.00",
      "isWipAsset": false
    },
    {
      "dealId": "d8e2a110-91cc-41e3-8e44-51e9b826f634",
      "dealType": "CONSTRUCTION",
      "customerName": "Tariq Mahmood",
      "projectName": "G-13 Villa",
      "totalValue": "35000000.00",
      "revenueCollected": "0.00",
      "totalProjectCost": "3200000.00",
      "grossProfit": "-3200000.00",
      "marginPercentage": "0.00",
      "isWipAsset": true
    }
  ]
}
```

GET /api/v1/reports/aging-radar

Purpose: Fetches the prioritized list of who owes Wadaan money (Deal Invoices) and who Wadaan owes (Expense Bills), strictly ordered by days overdue descending.
Access: Protected (Bearer JWT / Cookie).
Response (200 OK):
```json
{
  "success": true,
  "data": {
    "receivables": [
      {
        "invoiceId": "e1f2a3b4-1111-2222-3333-444455556666",
        "customerName": "Zain Ahmed",
        "description": "Milestone 2 - Structure",
        "amount": "5000000.00",
        "dueDate": "2026-08-15T00:00:00.000Z",
        "daysOverdue": 22
      }
    ],
    "payables": [
      {
        "billId": "a9b8c7d6-5555-6666-7777-888899990000",
        "vendorName": "Ali Hardware",
        "invoiceNumber": "WH-045",
        "pendingAmount": "650000.00",
        "billDate": "2026-08-20T00:00:00.000Z",
        "daysOverdue": 17
      }
    ]
  }
}
```

GET /api/v1/reports/net-income

Purpose: Calculates True Office Net Income by aggregating recognized gross deal profits, adding brokerage commissions, and deducting general office overhead.
Access: Protected (Bearer JWT / Cookie).
Query Params: `?startDate=2026-07-01&endDate=2026-09-06` (Defaults to current fiscal year July 1 - June 30).
Response (200 OK):
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-07-01T00:00:00.000Z",
      "endDate": "2027-06-30T23:59:59.999Z"
    },
    "grossDealProfit": "5500000.00",
    "brokerageCommissions": "200000.00",
    "generalOverhead": "350000.00",
    "netIncome": "5350000.00"
  }
}
```

GET /api/v1/reports/trial-balance

Purpose: Generates the formal mathematical double-entry Trial Balance report (Screen 3 - v1.5.0) proving debit/credit equality.
Access: Protected (`authGuard`).
Query Params: `?startDate=2026-07-01&endDate=2027-06-30` (optional; defaults to current Pakistani fiscal year boundary July 1 -> June 30).
Aggregation Rules:
- Permanent Accounts (ASSET, LIABILITY, EQUITY): Aggregates all cumulative journal lines up to `endDate` (balance sheet balances continuous across all time).
- Annual / P&L Accounts (REVENUE, EXPENSE): Aggregates journal lines strictly between `startDate` and `endDate`.
- Normal Balance Mapping: Net debit placed in `debit` column for ASSET/EXPENSE; net credit placed in `credit` column for LIABILITY/EQUITY/REVENUE.
- Zero-balance accounts automatically excluded from response list.
Response (200 OK):
```json
{
  "success": true,
  "data": {
    "period": {
      "startDate": "2026-07-01T00:00:00.000Z",
      "endDate": "2027-06-30T00:00:00.000Z"
    },
    "accounts": [
      {
        "accountCode": "1001",
        "accountName": "Meezan Bank",
        "category": "ASSET",
        "debit": "4200000.00",
        "credit": "0.00"
      },
      {
        "accountCode": "3001",
        "accountName": "Owner's Opening Equity",
        "category": "EQUITY",
        "debit": "0.00",
        "credit": "4200000.00"
      }
    ],
    "grandTotalDebit": "4200000.00",
    "grandTotalCredit": "4200000.00",
    "isBalanced": true
  }
}
```



2. Controllers (report.controller.ts)
getExecutiveSnapshot(req, res)



Calls ReportService.calculateSnapshot(). Returns 200 OK with 4 master integers.


getDealMargins(req, res)



Parses optional filters. Calls ReportService.calculateDealMargins(). Returns array of deal objects with computed grossProfit and marginPercentage.


getAgingRadar(req, res)



Calls ReportService.getOverdueLedgers(). Returns two arrays: receivables and payables, strictly ordered by daysOverdue DESC.


getNetIncome(req, res)



Validates date ranges. Calls ReportService.calculateTrueNetIncome(). Returns detailed breakdown of Gross Profits minus Overhead.


3. Services & Core Logic (report.service.ts)
ReportService.calculateSnapshot()
Executes four parallel, highly optimized database queries using Promise.all() to ensure the dashboard loads in milliseconds:

Liquid Cash: Runs a SUM(debits - credits) via JournalLine restricted strictly to accounts tagged isLiquid: true (e.g., Office Safe, Meezan Bank).


Client Funds Held: Sums Customer.walletBalance + the live balance of the Escrow Liability account.


Total AR: Queries DealInvoice where paymentStatus != 'PAID' and sums the remaining balances.


Total AP: Queries ExpenseBill where paymentStatus != 'PAID' and sums the remaining balances.


ReportService.calculateDealMargins()
This is the most complex database join in the system, utilizing Prisma's $queryRaw for SQL efficiency.

Step 1 (Revenue): Groups all DealInvoices by dealId where status is PAID to find total locked revenue.


Step 2 (Cost): Groups all ExpenseBills by projectId linked to that Deal.


Step 3 (Math): Subtracts Cost from Revenue to find Gross Profit. Calculates (Gross Profit / Revenue) * 100 to find Margin Percentage.


ReportService.calculateTrueNetIncome(startDate, endDate)

Step 1: Fetches the total Gross Profit from all Deals completed or active within the date range.


Step 2: Fetches total Brokerage Commissions generated in that range.


Step 3: Fetches General Office Overhead: Queries ExpenseBills where projectId IS NULL and billDate falls within the range.


Step 4: Computes: (Gross Profit + Brokerage) - General Overhead = True Net Income.


4. Utilities & Math Engines (aggregation.util.ts)
DateUtility.daysBetween(dateA, dateB)



Used in the Aging Radar. Calculates the exact number of calendar days between CURRENT_DATE and the dueDate.


MathUtility.safePercentage(part, whole)



Uses decimal.js. If whole (Revenue) is 0, standard JavaScript throws NaN or Infinity, crashing the UI. This utility catches zero-divisors and strictly returns 0.00%.


SQLBuilder.generateMarginQuery()



Since ORMs like Prisma can struggle with complex tri-level aggregations (Deals -> Invoices AND Deals -> Projects -> Bills), this utility constructs a secure, parameterized raw PostgreSQL string that the database executes natively, resulting in 10x faster load times for Screen 10.


5. Explicit Edge Cases Handled
Edge Case 1: The "Uncleared Wealth" Illusion



Scenario: A client gives you a cheque for Rs. 10,000,000. It is sitting in the Screen 9 Waiting Room. Does your Screen 10 Dashboard show your Liquid Cash has increased by 10 Million?


Guardrail: Absolutely not. The calculateSnapshot service pulls liquid cash strictly from the General Ledger (Screen 2). Because pending cheques do not generate journal entries until marked CLEARED, the dashboard mathematically ignores them, protecting you from making spending decisions on bounced cheques.


Edge Case 2: Escrow Disguised as Revenue



Scenario: You broker a Rs. 50,000,000 land deal. The buyer deposits the full 50M into Wadaan's Meezan account. Wadaan’s commission is 1% (Rs. 500k).


Guardrail: Screen 10's Net Income report ignores bank deposits. It reads strictly from Revenue accounts. The Deal Splitting Engine (Module 3) already locked 49.5M as an Escrow Liability. Screen 10 correctly reports only the Rs. 500,000 as profit, while aggressively flashing the Rs. 49,500,000 in the red "Client Funds Held" dashboard widget.


Edge Case 3: The "Unsold Construction" Margin Trap



Scenario: You spend Rs. 20,000,000 building "Wadaan Heights" using your own capital. You haven't sold any units yet. Does the Deal Margin report show a -100% margin and a 20M loss?


Guardrail: No. The system recognizes this as an active asset creation phase. calculateDealMargins checks the DealType. If no sale deal exists yet, it flags the project as WIP Asset and excludes it from Net Income deduction. The 20M is safely parked on the Balance Sheet (Screen 3) as Inventory, preventing a false panic on your P&L.


Edge Case 4: The Over-enthusiastic Advance



Scenario: A client owes Rs. 1M for the current milestone but transfers Rs. 1.5M.


Guardrail: Because Module 3 forces the extra Rs. 500k into the Customer Wallet liability, Screen 10's Aging Radar correctly marks the client's current invoice as completely paid (removing them from the overdue list) while the snapshot adds the 500k to "Client Funds Held", keeping revenue reporting perfectly accurate to the billed milestones, not just raw cash received.




