In real estate, treating construction costs like regular office expenses is a massive mistake. If you spend Rs. 10,000,000 on steel and cement, you didn't "lose" 10 million rupees—you just converted cash into a physical asset (a plaza or a villa).
Screen 4 is where you track the bricks, mortar, and labor. It is your Work-In-Progress (WIP) command center, keeping project costs completely separate from your office overhead.
1. What You See (The Interface)
When you open this screen, you don’t see accounting spreadsheets; you see your active construction sites.
The Dashboard View: A grid of large, visual "Cards." Every active site Wadaan is building has its own card (e.g., "Wadaan Villa 5", "Mr. Ali's Commercial Plaza").
The Vital Stats: Right on the face of the card, you see three big numbers:
Master BOQ (Budget): How much you planned to spend.
Total Spent: Exactly how much has been billed to this site to date.
The Health Bar: A visual progress bar. As you spend money, it fills up. (Green means you are safely under budget, Yellow means you are getting close, Red means you have overspent).
The Drill-Down: Clicking a project card opens its specific timeline—a clean, chronological list of every single bag of cement, steel delivery, and labor payout that belongs to this project.
2. Setting Up a New Project (The 1-Minute Setup)
Because you are a solo operator, creating a new project takes seconds. There are no complex "micro-phases" (like foundation, grey structure, finishing) to get bogged down in. You just input three things:
Project Name: (e.g., "Wadaan Heights").
Master Budget (BOQ): The total estimated cost (e.g., Rs. 50,000,000).
The Project Prefix: You give the project a 2-3 letter shortcode (e.g., WH). The system uses this later to automatically generate clean, organized invoice numbers (like WH-001, WH-002) for blank vendor bills.
3. How the Costs Accumulate (The "Magnet" Logic)
You actually do zero data entry on Screen 4. You never type "Bought 50 bags of cement" here.
Instead, Screen 4 acts like a magnet. When you are on Screen 5 (The Master Bill Entry) and you log a bill from Ali Hardware, you simply tag it to "Wadaan Heights." The system automatically pulls that cost into this dashboard and instantly updates the Total Spent and the Health Bar.
4. Business Rules & Guardrails
This screen is designed to give you total visibility without slowing down your real-world operations.
The "Soft-Lock" Budget Rule: If your budget is Rs. 10,000,000, and a new steel bill pushes your total spent to Rs. 11,000,000, what does the system do?
It does not block the bill. In the real world, if the steel is delivered, you have to record the debt.
Instead, it throws a massive Red Warning Flag on the project card. It allows the business to keep moving but screams at you that your profit margin on this deal is shrinking.
The WIP Accounting Magic (Invisible Guardrail): Every rupee tracked on this screen is categorized by the system as "Work In Progress Inventory" (An Asset). This guarantees that spending heavy cash on a site never accidentally makes Wadaan look bankrupt on the Income Statement (Screen 3). The costs sit safely here until the property is officially sold or billed to the client on Screen 8.
Screen 4 tells you exactly how much your physical sites are costing you in real-time, warning you before a budget blows up.

---

### 5. General Ledger Transaction Drill-Down (`ProjectTransactionDrawer`)

In addition to project cards and budget burn indicators, Screen 4 provides a granular **General Ledger Transaction Audit Drawer**:

- **Trigger**: Every project card includes a **"View GL Entries →"** link at the bottom.
- **Drawer Interface**: A right slide-over drawer displays the complete chronological list of double-entry ledger lines linked to that project (`JournalLine.projectId`):
  - **Project Header & Cost Center**: Name, prefix code, operational status.
  - **Financial Summary Strip**: Total Debits (costs capitalized), Total Credits (returns/adjustments), and Net Project WIP Balance.
  - **Audit Table**:
    - **Date**: Chronological journal date.
    - **JV Number**: General Ledger Journal Voucher number (e.g. `JV-0001`).
    - **Account**: Code and name (e.g. `1200 - Work In Progress`).
    - **Description / Memo**: Bill invoice reference or journal explanation.
    - **Party**: Vendor or subcontractor associated with the line item.
    - **Debit & Credit Amounts**: PKR currency values.
    - **Running Balance**: Dynamically calculated line-by-line running cost balance.
- **Backend API Contract**:
  - `GET /api/v1/projects/:id/transactions`
  - Queries `JournalLine` records where `projectId = id`, including `journal`, `account`, and `vendor`/`customer` relations, sorted by `journal.entryDate ASC`.

---

### 6. Client Construction Contracts & Realized Cash Margin

When Wadaan builds a house or commercial plaza on behalf of a private client (Route B: Construction Contract initialized on Screen 8), Screen 4 automatically cross-links the project site with the customer's contract:

- **Client Banner**: Displays client full name, contact phone number, and a `Client Contract` badge.
- **Contract Value**: The total agreed contract price with the client.
- **Client Paid**: Total funds actually received from the client across settled milestones and applied mobilization advances.
- **Net Cash Margin**: Calculated in real-time as `Total Collected - Total Spent (WIP)`:
  - **Positive Margin (Green)**: Wadaan is cash-flow positive on this construction job (client payments exceed site expenses to date).
  - **Negative Margin (Red)**: Site expenses have temporarily outpaced client collections, signaling management to bill the upcoming milestone installment immediately.

---

### 7. Project Financial & Audit Report (`ProjectReportModal`)

Every project card and the GL Transaction Drawer expose a **"Print Report"** action. Clicking it opens the `ProjectReportModal` which compiles a complete printable project dossier:

- **Institutional Header**: Wadaan Real Estate & Builders letterhead, project name, prefix, operational status, start date, and report timestamp.
- **Executive Financial Summary**:
  - Approved Master BOQ.
  - Total Spent (WIP) and budget burn percentage (with budget overrun warnings).
  - Total Received from Clients across all client deals.
  - Net Cash Margin (`Total Received - Total Spent`), indicating whether the project is cash-flow positive or running a deficit.
  - Budget Variance / remaining envelope.
- **Client Receipts Breakdown**:
  - Breakdown per client contract (supporting multiple clients and co-client payments).
  - Contract Value, Total Paid, and Total Pending per client.
  - Detailed payment ledger: Milestone / Description, Due Date, Receipt Date, Paid Amount, Payment Status, Payment Method, Bank Ref #, and actual payer name (`Receipt.customer.fullName`).
  - Grand total received from all clients combined.
- **Vendor Expenses & Subcontractors**:
  - Breakdown per vendor.
  - Total Billed, Total Paid, and Total Pending per vendor.
  - Itemized bills table: Invoice #, Bill Date, Line Items description & quantities, Grand Total, and Payment Status.
  - Grand total billed/spent across all vendors combined.
- **General Ledger Audit Trail**:
  - Chronological double-entry journal postings tagged to this project cost center.
  - Dr / Cr summary and running balance.
- **Institutional Signatures Block**:
  - Formal signature lines for Site Manager / Project Engineer, Finance Controller, and Managing Director Approval.
- **Print & PDF Optimization**:
  - A dedicated "Print / Export PDF" button triggers `window.print()`.
  - Scoped `@media print` rules hide modal chrome and application shell while maintaining clean typography and table page-break rules.

**Backend API Contract**:
- `GET /api/v1/projects/:id/report`



