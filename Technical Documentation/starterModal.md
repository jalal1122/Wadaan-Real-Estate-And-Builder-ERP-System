Instead of jumping into an empty system and manually guessing how to create opening journal entries across three different screens, the ERP presents a structured, multi-step onboarding wizard the very first time you log in.
How the Starter Modal Works (The Onboarding Wizard)
When the app detects that the Account table has zero opening balances, it locks the navigation and triggers a full-screen guided modal with 4 quick steps.
[Step 1: Cash & Banks] ──► [Step 2: Active Sites] ──► [Step 3: Unpaid Bills] ──► [Step 4: Active Deals] ──► [Launch ERP] 

Step 1: Liquid Cash & Bank Balances (Screen 1 Opening State)
Inputs:
Cash in Office Safe (e.g., Rs. 250,000)
Meezan Bank / Primary Bank Balance (e.g., Rs. 4,200,000)
Secondary Bank (Optional)
What the system does behind the scenes: It automatically creates and posts the initial JournalEntry (Screen 2), debiting your cash accounts and crediting Owner's Opening Equity.
Step 2: Active Construction Projects (Screen 4 Opening State)
Inputs (Add Row per site):
Project Name (e.g., "Wadaan Heights")
Short Prefix (e.g., WH)
Total Planned BOQ (e.g., Rs. 60,000,000)
"Spent to Date" (Cut-off spent amount): (e.g., Rs. 14,500,000)
What the system does behind the scenes: It creates the Project record and automatically logs an initial cumulative WIP record, setting your progress bar and spent ledger accurately on day one.
Step 3: Pending Vendor Payables (Screen 7 Opening State)
Inputs (Add Row per vendor you owe):
Vendor Name (e.g., "Ali Hardware")
Outstanding Unpaid Balance (e.g., Rs. 650,000)
Tagged to Project or General Office
What the system does behind the scenes: Creates the Vendor and inserts an opening ExpenseBill marked UNPAID, so your Thursday Payment Run is immediately populated with what you actually owe.
Step 4: Active Deals & Remaining Customer Dues (Screen 8 Opening State)
Inputs (Add Row per active client):
Customer Name & Phone
Linked Project / Plot Name
Total Deal Value
Total Already Received (in past)
Remaining Balance to Collect
What the system does behind the scenes: Creates the Customer and Deal, logs past receipts as CLEARED, and leaves the remaining milestones active for recovery.
Technical Implementation: The SystemSetting Flag
To make this seamless in PostgreSQL and Prisma, add a simple metadata table to track initialization:
model SystemSetting {
  id              String   @id @default(uuid())
  isInitialized   Boolean  @default(false)
  goLiveDate      DateTime @default(now())
}

Frontend Check: When the Next.js app mounts inside Electron, it checks GET /api/system/status.
If isInitialized === false: It blocks dashboard routes and renders the StarterModal.
On Submit: The modal sends the entire onboarding payload to a single endpoint (POST /api/system/initialize).
The Atomicity Guarantee: The Express backend runs the entire setup inside a single Prisma Interactive Transaction (prisma.$transaction). If any number is mistyped, it rolls back cleanly. If successful, it sets isInitialized = true, and unlocks the full ERP.

