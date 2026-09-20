If Screen 4 handles all the bricks, cement, and Wadaan's costs, Screen 8 is completely dedicated to Money Coming In.
Because Wadaan operates as a Full-Stack Real Estate Group (building for clients, building for yourselves, flipping plots, and taking brokerage commissions), standard software would crash trying to handle this. Screen 8 acts as a highly intelligent "Deal Hub" that adapts to exactly how you are making money on any given day.
1. What You See (The Deal Dashboard)
This is your command center for revenue. Instead of a messy list of disconnected plots, you see a master list of all active financial relationships Wadaan has right now.
The Master Grid: A clean list showing Client Name, Deal Type (Construction vs. Sale vs. Brokerage), Total Deal Value, Amount Received, and the Pending Balance (who owes you money).
The Drill-Down: Clicking on any row (e.g., "Mr. Ali - Plaza Construction") opens that specific client’s Khaata (Ledger) to see their exact payment schedule and history.
2. Creating a "New Deal" (The Smart Router)
When you sit down with a new client and click "+ New Deal", the system immediately asks you a critical question: "What kind of deal is this?"
Route A (Selling Wadaan Property): You built a villa or bought a plot with Wadaan's money, and now you are selling it. You enter the Sale Price, and the system instantly recognizes this as Wadaan Revenue.
Route B (Construction Contract): A client hired you to build on their land. The system asks you to link this deal to a specific Project on Screen 4 (e.g., "Ali's Plaza"). This is the magic link that later allows the system to subtract your Screen 4 construction costs from your Screen 8 revenue to calculate your exact profit.
Route C (Brokerage / Commission): You are just a middleman connecting a buyer and seller. You enter the total deal size and Wadaan’s 1% or 2% commission cut.
3. The Hybrid Payment Engine (Installments vs. Milestones)
How you get paid depends on what you are selling. The system adapts to both.
Strict Installments (For Plots/Files): If you are selling a 2-year payment plan, you just type "24 Months" and the total price. The system instantly auto-generates 24 exact invoices with strict due dates.
Custom Milestones (For Construction): If you are building a house, you don't use strict monthly dates. You set up custom payment blocks (e.g., "20% on Foundation", "30% on Grey Structure"). When the roof is poured, you just click a button to officially bill the client for that milestone.
4. The Client Wallet & Escrow Engine (Handling Third-Party Money)
In real estate, you frequently hold massive amounts of cash that does not belong to you. If you accidentally count this as profit, your accounting is ruined. Screen 8 solves this perfectly.
The Customer Wallet (Mobilization Advances): If Mr. Ali hands you Rs. 5,000,000 to start building his plaza, you click "Receive Advance." The system places this money in a digital "Wallet." It knows this isn't profit yet—it's Mr. Ali's money you are holding to buy cement. Later, when you bill him for the Foundation milestone, you just click "Pay from Wallet," and the system safely converts it into official Wadaan revenue.
The Escrow Shield (Brokerage Deals): If Wadaan facilitates a Rs. 20,000,000 plot sale between two external people, you might receive the 20 Million into your bank account. The system automatically categorizes Rs. 19,800,000 as a "Liability" (money you must pass to the seller) and only records your Rs. 200,000 commission as Wadaan's actual profit.
5. The 1-Click "File Transfer" (Resales)
In Pakistan, a buyer often sells their plot file to someone else before they have finished paying Wadaan.
The Feature: Inside the client's Khaata, there is a prominent "Transfer File" button.
How it Works: You select the new buyer (e.g., Zain), and input Wadaan’s standard Transfer Fee (e.g., Rs. 50,000).
The Automation: In one click, the system closes the old buyer's ledger, shifts the entire remaining debt to Zain, generates a new invoice for the Rs. 50,000 Transfer Fee, and marks it as 100% Wadaan profit.
6. Business Rules & Guardrails
The Red Alert (Overdue Tracker): Any installment or milestone that passes its due date instantly turns bright red on the dashboard, making it impossible to forget who you need to call for recovery.
Screen 8 perfectly organizes all your revenue streams, client debt, and middleman cash without requiring you to do complex accounting math.

---

## Technical Architecture & Implementation Spec (v3.0.0)

### Frontend Layer Architecture
- **Route**: `/deals` (`src/app/(dashboard)/deals/page.tsx`)
- **Components**:
  - `DealKPIStrip.tsx`: Aggregates active receivables, client mobilization advances in escrow, construction project volume, and brokerage escrow vs. earned commissions.
  - `DealTable.tsx`: Full-featured data table with route filtering (Sales, Construction, Brokerage), status filtering (Active vs Settled), real-time search, and milestone progress bars.
  - `CreateDealModal.tsx`: 3-step wizard with fast client onboarding, multi-route selection, project linking for WIP attribution, and dynamic milestone builder with zero-sum mathematical validation (`sum(invoices) === totalValue`).
  - `CustomerKhaataDrawer.tsx`: Slide-over drawer presenting complete client ledger portfolio (always-visible mobilization advance wallet card with zero-balance guidance notice, conditional advance allocation form when balance > 0, active contracts, milestone schedules, chronological receipts history, client switch state resets, and animated pulsing skeleton loader).
  - `TransferFileModal.tsx`: Assigns contract ownership to a new client with automated transfer fee assessment credited to Revenue (4000).

### Backend REST API Contracts
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/deals` | Fetches master deal portfolio with dynamic `pendingBalance` |
| `POST` | `/api/v1/deals` | Initializes contract with multi-route journal entries |
| `GET` | `/api/v1/deals/:id` | Fetches single deal with linked project and invoices |
| `POST` | `/api/v1/deals/:dealId/transfer` | Transfers deal file ownership to new customer |
| `GET` | `/api/v1/customers` | Lists all customers with wallet balances and deal counts |
| `GET` | `/api/v1/customers/:id` | Returns customer detail with full Khaata history |
| `POST` | `/api/v1/customers` | Creates customer with initial 0.00 wallet |
| `POST` | `/api/v1/customers/:id/apply-wallet` | Consumes wallet advance against a specific invoice |

### Double-Entry Accounting Ledger Postings
- **Direct Sale (`WADAAN_SALE`)**:
  - `DR 1100 Accounts Receivable` / `CR 4000 Property Sales Revenue`
- **Construction Contract (`CONSTRUCTION`)**:
  - `DR 1100 Accounts Receivable` / `CR 4000 Construction Contract Revenue` (tagged with `projectId` for gross margin analysis)
- **Brokerage Transaction (`BROKERAGE`)**:
  - `DR 1100 Accounts Receivable` (Total Deal Value)
  - `CR 4000 Brokerage Commission Revenue` (Wadaan Cut)
  - `CR 2200 Third-Party Escrow Liability` (Remaining seller funds)
- **Customer Advance Allocation**:
  - `DR 2100 Customer Advance Liability` / `CR 1100 Accounts Receivable`
- **File Transfer**:
  - Shifts remaining unpaid installment balance to new customer Khaata
  - `DR 1100 Accounts Receivable (New Customer)` / `CR 4000 Transfer Fee Revenue` (if fee > 0)


