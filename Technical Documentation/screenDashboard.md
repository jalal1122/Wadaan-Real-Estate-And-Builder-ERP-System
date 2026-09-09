# Executive Dashboard (Screen Dashboard)

The Executive Dashboard acts as the real-time financial flight deck for Wadaan Real Estate & Builders. It combines liquidity tracking, critical payables, receivables aging, deal profitability, and site budget burn rates into a single responsive view.

---

## 1. Visual Layout & Structure

The executive layout is divided into four distinct horizontal rows:

```
┌────────────────────────────────────────────────────────────────────────────┐
│ TOP NAV BAR: Search | Period Locked | Notifications | User Chip            │
├────────────────────────────────────────────────────────────────────────────┤
│ ROW 1: Page Header & Global Feeds Sync ("Executive Dashboard")             │
├────────────────────────────────────────────────────────────────────────────┤
│ ROW 2: SURVIVAL SNAPSHOT (4 KPI Cards)                                     │
│ [ Liquid Cash ]   [ Client Funds Held ]   [ Receivables ]   [ Payables ]   │
├────────────────────────────────────────────────────────────────────────────┤
│ ROW 3: TWO-COLUMN ANALYTICS GRID                                           │
│  ├── Left (60%): Deal Margin Ledger                                        │
│  └── Right (40%): Aging Radar (Overdue Receivables & Payables)             │
│                   True Net Income Card (FYTD P&L Breakdown)                │
├────────────────────────────────────────────────────────────────────────────┤
│ ROW 4: BOTTOM STRIP (3 Auxiliary Monitoring Cards)                         │
│ [ Cheque Waiting Room ]     [ Active Projects ]     [ System Governance ]  │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Breakdown & Data Feeds

### Row 1: Header & Control Bar
- **Title**: Executive Dashboard
- **Feed Refresh**: Triggers invalidate/refetch queries across all 6 live data endpoints.
- **Generate Report CTA**: Direct shortcut to `/reports` for detailed ledger exports.

---

### Row 2: Survival Snapshot (4 KPI Cards)
- **API Endpoint**: `GET /api/v1/reports/snapshot`
- **Hook**: `useExecutiveSnapshot()` (`src/features/reports/hooks/useReports.ts`)
- **Polling**: 30-second refetch interval.

| Card | Field | Color / Styling | Guardrail / Sub-badge |
|---|---|---|---|
| **Liquid Cash** | `snapshot.liquidCash` | `#059669` Emerald Green | "Bank + Safe Combined ↑" |
| **Client Funds Held** | `snapshot.clientFundsHeld` | `text-red-600` Bold Red | **"DO NOT SPEND"** (Escrow & client advances) |
| **Total Receivables** | `snapshot.totalAR` | `text-blue-600` Slate Blue | Pending invoices count |
| **Total Payables** | `snapshot.totalAP` | `text-amber-600` Amber | Thursday payment run queue |

---

### Row 3 Left: Deal Margin Ledger (60% Width)
- **API Endpoint**: `GET /api/v1/reports/deal-margins`
- **Hook**: `useDealMargins()` (`src/features/reports/hooks/useReports.ts`)
- **Columns**: Deal / Customer | Type | Revenue Billed | Gross Profit | Margin %
- **Deal Type Badges**:
  - `CONSTRUCTION`: Purple badge
  - `WADAAN_SALE`: Blue badge
  - `BROKERAGE`: Emerald badge
- **WIP Asset Safeguard**:
  - If `isWipAsset === true`, construction inventory is still capitalizing.
  - Revenue Billed shows `—`.
  - Gross Profit shows `—`.
  - Margin % displays italic slate `"In Progress"` (prevents division by zero or premature profit recognition).

---

### Row 3 Right: Aging Radar & True Net Income (40% Width)

#### Card 1: Aging Radar
- **API Endpoint**: `GET /api/v1/reports/aging-radar`
- **Hook**: `useAgingRadar()` (`src/features/reports/hooks/useReports.ts`)
- **Polling**: 60-second refetch interval.
- **Overdue Receivables**: Top 3 critical customer invoices sorted by `daysOverdue DESC`. Red badge when `daysOverdue > 0`, or slate `"Due Today"`.
- **Pending Payables**: Top 3 critical supplier bills sorted by `daysOverdue DESC`. Amber badge indicating overdue duration.

#### Card 2: True Net Income Card
- **API Endpoint**: `GET /api/v1/reports/net-income`
- **Hook**: `useNetIncome()` (`src/features/reports/hooks/useReports.ts`)
- **Formula**:
  $$\text{Net Income} = \text{Gross Deal Profit} + \text{Brokerage Commissions} - \text{General Overhead}$$
- Displays fiscal period boundaries starting July 1st.

---

### Row 4: Bottom Strip (3 Cards)

#### Card A: Cheque Waiting Room
- **API Endpoint**: `GET /api/v1/receipts/waiting-room`
- **Hook**: `useWaitingRoom()` (`src/features/receipts/hooks/useReceipts.ts`)
- **Polling**: 30-second refetch interval.
- Displays un-cleared post-dated cheques in escrow with clearing dates, bank names, and customer details.
- Empty State: `<CheckCircle2 />` icon with `"All cheques cleared"`.

#### Card B: Active Projects
- **API Endpoint**: `GET /api/v1/projects`
- **Hook**: `useProjects()` (`src/features/projects/hooks/useProjects.ts`)
- Progress bars calculate budget burn rate:
  - `< 80%`: Green progress bar
  - `80% - 99%`: Amber progress bar
  - `≥ 100%` or `isOverBudget`: Red progress bar with warning indicator.

#### Card C: System Governance
- **Data Source**: `useSystemInit()` (`src/hooks/useSystemInit.ts`)
- Real-time indicator of ACID ledger health, TLS 1.3 enclave security, Supabase cloud database connectivity, and go-live date.

---

## 3. Formatting & Security Standards
1. **Currency**: All amounts formatted through `formatPKR(value)` (`src/lib/formatters.ts`) rendering Pakistani Rupee standard formatting.
2. **Offline / Error Handling**: Each individual widget renders an alert card or fallback skeleton upon failure, preventing full-screen crashes.
3. **Icons**: Strictly SVG components from `lucide-react`.
