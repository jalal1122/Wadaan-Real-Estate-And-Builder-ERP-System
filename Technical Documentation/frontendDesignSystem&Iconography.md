# Wadaan Real Estate ERP: Frontend Design System & Iconography Specification

This document defines the visual design system, token contracts, and iconography rules for the Wadaan Real Estate & Builders ERP frontend (Screens 0 through 10). All frontend components must strictly adhere to these specifications.

---

## 1. Design Philosophy & Core Aesthetics

The Wadaan ERP interface is designed for high-density, high-stakes institutional finance and construction operations:
- **Ultra-Clean Light Institutional SaaS**: Clean slate backgrounds, sharp card definitions, and high contrast.
- **Offline-First Resilience**: All UI assets (fonts, icons, stylesheets) must render reliably without internet access inside the local Electron desktop wrapper.
- **Zero Ambiguity**: Financial numbers, currency values, GL codes, and PIN inputs use tabular monospace typefaces to prevent visual misreads.

---

## 2. Color Palette & Token Matrix

| Semantic Role | Token Name | Hex Value | Tailwind Class | CSS Custom Property | Primary Usage |
|---|---|---|---|---|---|
| **Primary Brand** | `brand-dark` | `#0F172A` | `bg-[#0F172A]`, `text-[#0F172A]` | `--color-brand-dark` | Primary buttons, active cards, emblems, headings |
| **Accent & Active** | `brand-emerald` | `#059669` | `bg-[#059669]`, `text-[#059669]` | `--color-brand-emerald` | Primary CTAs, active badges, focus rings, balanced states |
| **Pulsing Accent** | `brand-emerald-light` | `#10B981` | `bg-[#10B981]`, `text-[#10B981]` | `--color-brand-emerald-light` | Live status pulse, active dot indicators |
| **Critical Warning** | `brand-cream` | `#FEF3C7` | `bg-[#FEF3C7]` | `--color-brand-cream` | Disaster recovery banners, Master Key alert cards |
| **Neutral Background**| `neutral-bg` | `#F9FAFB` | `bg-[#F9FAFB]` | `--color-neutral-bg` | Page workspace canvas, table headers, card inputs |
| **Borders & Dividers**| `border-slate` | `#E2E8F0` / `slate-200` | `border-slate-200` | — | Card perimeters, data table cell dividers |

---

## 3. Typography Standards

Two distinct typefaces are configured in `layout.tsx` and `globals.css`:

### 1. `Inter` (Sans-Serif)
- **Role**: All standard UI elements, navigation labels, button text, form labels, and body copy.
- **Font Stack**: `'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
- **Font Weights**:
  - `font-normal` (400) — Subtitles and explanatory helper text
  - `font-medium` (500) — Form input values, links, navigation items
  - `font-semibold` (600) — Section headers, card labels
  - `font-bold` (700) — Page titles, button actions, modal headers

### 2. `JetBrains Mono` (Monospace)
- **Role**: Financial amounts (PKR), General Ledger (GL) codes, account numbers, 16-character master keys, 4-digit PINs, and system telemetry timestamps.
- **Font Stack**: `'JetBrains Mono', monospace`
- **Rule**: All currency values must be right-aligned with `font-mono font-bold text-xs` or `text-sm`.

---

## 4. Strict Iconography Policy: `lucide-react`

> [!CAUTION]
> **Font ligatures (e.g. Material Symbols, FontAwesome web fonts) are strictly prohibited in this codebase.**
> Font ligatures place raw text strings like `verified_user` into the HTML and require an external HTTP download from Google Fonts to convert into glyphs. In offline environments or during network drops, this causes raw text to leak into the UI.

### Mandatory Rules:
1. **Always import from `lucide-react`**: All icons must be rendered as native React SVG components.
2. **Standard Dimensions**:
   - `w-3.5 h-3.5` — Status indicators, inline button icons, input field icons
   - `w-4 h-4` — Standard button icons, table action buttons, sidebar navigation
   - `w-5 h-5` — Modal headers, card headers, section badges
   - `w-6 h-6` to `w-7 h-7` — Hero emblems, alert card banners
3. **Color Inheritance**: Use Tailwind classes directly (e.g. `text-[#059669]`, `text-slate-400`, `text-amber-700`).

### ERP Functional Domain Icon Mapping

| Functional Concept | Lucide React Component | Usage Context |
|---|---|---|
| **Vault / Auth Access** | `<Lock />`, `<Unlock />` | Login card, PIN screen, Lock action |
| **Security & Compliance** | `<ShieldCheck />`, `<ShieldAlert />` | Enterprise status, double-entry guarantee card |
| **Banking & General Ledger** | `<Landmark />` | Chart of Accounts, Bank opening accounts, Meezan Bank |
| **Construction & WIP Sites** | `<Building2 />` | Screen 4 active sites, BOQ tracking |
| **General Journal & Books** | `<BookOpen />` | Screen 2 Journal entries, ledger statement |
| **Payables & Vendor Bills** | `<Receipt />` | Screen 5 bills, Screen 7 Thursday payment run |
| **Customer Deals & Receivables** | `<Coins />`, `<CreditCard />` | Screen 8 deals, Screen 9 cash receipt |
| **Executive Intelligence** | `<BarChart3 />`, `<LayoutDashboard />` | Screen 10 analytics, App shell dashboard |
| **Disaster Recovery** | `<KeyRound />` | Emergency offline key modal, PIN reset |
| **Alerts & Warnings** | `<AlertTriangle />`, `<AlertCircle />` | Master Key alert banner, error banners |
| **Success Confirmation** | `<Check />`, `<CheckCircle2 />` | Step completed, clipboard copied, transaction posted |
| **Navigation & Flow** | `<ArrowRight />`, `<X />` | Stepper forward, dismiss/close modal |
| **Add Transaction / Row** | `<PlusCircle />` | Dynamic table rows in journals, banks, and bills |
| **Go-Live Launch** | `<Rocket />` | System initializer completion CTA |

---

## 5. Component Patterns & Anatomy

### 1. The 4-Digit Discrete PIN Input (`AuthVault`)
- 4 discrete boxes (`w-14 h-16 sm:w-16 sm:h-18`, `bg-[#F3F4F6]`, `rounded-xl`, `border-2 border-slate-200`).
- Active box shows blinking caret (`w-1.5 h-6 bg-[#059669] rounded-full animate-pulse`).
- Focused box applies emerald glow (`border-color: #059669; box-shadow: 0 0 0 4px rgba(5, 150, 105, 0.15)`).
- Error state flashes red border (`border-color: #EF4444; box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15)`).

### 2. High-Density Financial Data Grids
- Container: `border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white`.
- Table Header: `bg-[#F9FAFB] border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider`.
- Table Body Rows: `hover:bg-slate-50/70 transition-colors divide-y divide-slate-100`.
- In-Cell Inputs: `bg-[#F9FAFB] border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-[#059669]/20 focus:border-[#059669]`.
- Monetary Values: Preceded by `text-[10px] font-bold text-slate-400` PKR currency badge, right-aligned, monospace.

### 3. Modal Overlays
- Backdrop: `bg-[#0F172A]/70 backdrop-blur-md fixed inset-0 z-40`.
- Dialog Container: `bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden`.
- Animations: Smooth enter transitions with `animate-fadeIn`.
