If Screen 4 handles all the bricks, cement, and Wadaan's costs, Screen 8 is completely dedicated to Money Coming In.
Because Wadaan operates as a Full-Stack Real Estate Group (building for clients, building for yourselves, flipping plots, and taking brokerage commissions), standard software would crash trying to handle this. Screen 8 acts as a highly intelligent "Deal Hub" that adapts to exactly how you are making money on any given day.
1. What You See (The Deal Dashboard)
This is your command center for revenue. Instead of a messy list of disconnected plots, you see a master list of all active financial relationships Wadaan has right now.
The Master Grid: A clean list showing Client Name, Deal Type (Construction vs. Sale vs. Brokerage), Total Deal Value, Amount Received, and the Pending Balance (who owes you money).
The Drill-Down: Clicking on any row (e.g., "Mr. Ali - Plaza Construction") opens that specific client’s Khaata (Ledger) to see their exact payment schedule and history.
2. Creating a "New Deal" (The Smart Router)
When you sit down with a new client and click "+ New Deal", the system immediately asks you a critical question: "What kind of deal is this?"
Route A (Selling Wadaan Property): You built a villa or bought a plot with Wadaan's money, and now you are selling it. You can select an owned property from the Wadaan Asset Inventory (Plot, House, Commercial, Apartment). The system displays the original acquisition cost and live estimated gross profit (`Selling Price - Acquisition Cost`). Upon deal creation, the asset is atomically reserved and linked, ensuring true gross margin is tracked across deals and executive analytics instead of falsely reporting 100% profit.
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

### Milestone Partial Payments & Outstanding Balance Tracking
- Each installment invoice maintains `paidAmount` alongside `amount`.
- Partial advance consumption updates the invoice status to `PARTIAL` and dynamically displays:
  - **Remaining Balance**: Emphasized in bold (e.g. `Remaining: Rs 3,960,000`).
  - **Breakdown**: `Due: Date • Paid: Rs 40,000 • Remaining: Rs 3,960,000 • Total: Rs 4,000,000`.
- The Deal's **Outstanding Balance** accurately sums `(amount - paidAmount)` across all unpaid and partial invoices.

### Client Construction Site Cost & Net Margin Panel
- For `CONSTRUCTION` deals with a linked project site, the Customer Khaata drawer displays a dedicated **Construction Site** card:
  - **Site Reference**: Project Name and Prefix code (e.g. `Site: Faisal Town Commercial Plaza (FTCP)`).
  - **Client Paid**: Total funds collected from the client to date.
  - **Site Spent (WIP)**: Aggregated vendor expense bills charged to this project site.
  - **Net Cash Margin**: Real-time margin (`Client Paid - Site Spent`), highlighted in green when profitable or red when expenditures temporarily exceed collections.

### Multi-Client Deals & Co-Buyer Partner Management (v3.5.0)
- **Multi-Client Architecture**: A contract agreement can register one or more co-clients/co-buyers alongside the primary billing owner via the `DealClient` join table (`dealId`, `customerId`, `shareLabel`).
- **Co-Clients Panel**: Located within each deal card in `CustomerKhaataDrawer`, showing all registered partners, their share descriptions (e.g. `50% Co-Investor`, `Partner`), and a `+ Add Co-Client` button opening `AddCoClientModal`.
- **Multi-Payer Receipts**: Any registered co-client can pay milestone invoices directly via Fast Inflow (`POST /api/v1/receipts`) without triggering `INVOICE_CUSTOMER_MISMATCH`.
- **Strict Overpayment Attribution**: When a co-client overpays, excess funds route strictly into that co-client's own advance wallet (`Customer.walletBalance`), NOT the primary client's wallet, keeping partner liabilities clean.
- **Cross-Contract Wallet Consumption**: Co-clients can apply their advance wallet balance to unpaid milestones on any contract where they are a registered co-buyer.
- **Co-Client Khaata Access (v3.5.1)**: In `DealTable`, each co-client is rendered as an **individual amber-styled clickable button** below the primary client cell. Clicking a co-client button opens the `CustomerKhaataDrawer` scoped to **that co-client's ID**, giving full access to their wallet balance and advance release form. If a co-client has a pending advance balance, it is shown inline on the button (e.g. `• Adv: Rs 500,000`) for immediate visibility. The `DealClient.customer` select in both `getAllDeals` and `getDealById` includes `walletBalance` to enable this display.
- **Co-Client Advance Release Flow**:
  1. User sees co-client button under a deal row (amber color, showing name, share label, and any pending advance).
  2. User clicks the co-client's button → `CustomerKhaataDrawer` opens for that co-client.
  3. Drawer shows their wallet balance and all deals where they are a participant (primary or co-buyer).
  4. User selects the invoice and applies the advance via `POST /customers/:coClientId/apply-wallet`.

### File Transfer — Cache Invalidation Contract (v3.6.0)

**Issue (Fixed)**: After `POST /deals/:dealId/transfer`, the Projects page (Screen 4) was still displaying the old client name, and the WH Project Print Report showed both the old and new client.

**Root Cause**: `useTransferFile.onSuccess()` in `useDeals.ts` was not invalidating the React Query `['projects']` cache key. The backend `executeFileTransfer()` correctly updates `deal.customerId` in the database, and `getProjectReport()` joins `deal.customer` live — but the frontend was serving stale project data from cache.

**Fix Applied (2026-09-27)**: Added `queryClient.invalidateQueries({ queryKey: ['projects'] })` to `useTransferFile.onSuccess()`.

**Cache Invalidation Contract after File Transfer**:
| Cache Key | Reason |
|---|---|
| `['deals']` | Deal's customerId changed |
| `['customers']` | Old/new customer deal counts change |
| `['projects']` | ✅ NEW — ProjectCard `clientInfo.customerName` and PDF `clientReceipts` derive from project→deals→customer |
| `['financial-snapshot']` | AR balances may shift |
| `['journals']` | Transfer fee GL entry created |
| `['accounts']` | Account balance changes from fee journal |

**Manual Verification Steps**:
1. Create a deal for Client Tariq, link to Project X
2. Transfer the deal to Client Chaudri Aslam (`POST /deals/:id/transfer`)
3. Navigate to Projects → Project X card must show "Chaudri Aslam"
4. Open Print Report for Project X → only "Chaudri Aslam" appears in Client Receipts

**Automated Test**: `page.test.tsx` Test 15 — `useTransferFile onSuccess invalidates ["projects"] cache so ProjectCard and PDF report show new client`.

---

### Wadaan Owned Asset Inventory & True Profit Tracking (v3.7.0)

**Business Problem Solved**:
Previously, when selling company-owned properties under `WADAAN_SALE`, deals lacked an acquisition cost deduction, resulting in artificial 100% gross profit margins across Deal Margins and Executive Net Income.

**Solution Architecture**:
1. **Asset Management (`/assets`)**:
   - Company-owned inventory (Plots, Houses, Commercial properties, Apartments) is cataloged with `acquisitionCost`, location details, dimensions, and purchase dates.
   - Assets have a clear lifecycle: `AVAILABLE` → `RESERVED` (linked to an active contract) → `SOLD` (contract fully settled).
2. **Deal Initialization Integration (`CreateDealModal.tsx`)**:
   - When selecting Route A (`WADAAN_SALE`), Step 2 renders an **Asset Selection dropdown** querying all `AVAILABLE` assets from `/api/v1/assets`.
   - Selecting an asset immediately reveals an informational card showing its category, location, and Acquisition Cost.
   - Live calculation displays:
     $$\text{Estimated Gross Profit} = \text{Contract Value} - \text{Acquisition Cost}$$
   - Displays a green margin badge if profitable or an amber warning if sale price is below cost.
   - Upon form submission, `assetId` is submitted with `POST /api/v1/deals`. The backend atomically marks the asset `RESERVED` and sets `dealId`.
3. **Customer Khaata Drawer Visibility (`CustomerKhaataDrawer.tsx`)**:
   - For `WADAAN_SALE` deals with a linked asset, an **Owned Asset Card** is rendered in warm amber styling.
   - Displays:
     - **Asset Title & Category**: (e.g. `Plot 42, Sector C • PLOT`).
     - **Contract Value**: Total sale price billed to the client.
     - **Acquisition Cost**: Original purchase/development cost incurred by Wadaan.
     - **True Gross Profit**: Net margin achieved on the property (`Contract Value - Acquisition Cost`).
4. **Profit & Margin Accounting**:
   - `DealService.getAllDeals()` & `getDealById()`: `netMargin = contractValue - (projectCost || 0) - (asset?.acquisitionCost || 0)`.
   - `ReportService.calculateDealMargins`: LEFT JOINs `WadaanAsset wa ON wa."dealId" = d.id` and computes `grossProfit = revenue - cost - COALESCE(wa."acquisitionCost", 0)`.
   - `ReportService.calculateTrueNetIncome`: Raw SQL deduction includes `wa."acquisitionCost"` so Executive Analytics Net Income aligns with Deal Margins.
5. **Cache Invalidation Contract**:
   - Creating a deal invalidates `['assets']` so reserved assets disappear from available inventory selectors.
   - Creating/updating/deleting an asset invalidates `['assets']` and `['reports']`.







