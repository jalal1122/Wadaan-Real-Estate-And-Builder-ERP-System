# Wadaan Real Estate & Builders ERP — Frontend

The institutional user interface for Wadaan Real Estate & Builders (Pvt) Ltd. Built with **Next.js 16 (App Router)**, **React 19**, **Tailwind CSS v4**, and **TanStack Query v5**, designed for local desktop deployment inside an **Electron** wrapper with cloud persistence in PostgreSQL.

---

## 1. Architecture & Design Principles

- **Local-First Zero Latency**: The Next.js frontend runs directly inside an Electron Chromium renderer, communicating with the local background Node.js/Express API at `http://localhost:4000/api/v1`.
- **Offline Resilience**: State is managed via TanStack Query configured with `networkMode: 'offlineFirst'`. Cached financial ledgers remain interactive during cloud connection drops, while write operations enter a safe disabled state.
- **Session Security**: Authentication is managed through a 15-minute `HttpOnly, SameSite=Strict` cookie session verified by local Express middleware.
- **Strict Offline Iconography**: All icons are native SVG components imported from `lucide-react`. Web font ligatures (Material Symbols, FontAwesome) are prohibited to prevent raw text names from appearing when running offline.

---

## 2. Design System & Tokens

Derived directly from the institutional Stitch ERP specifications:

| Token | Hex | Tailwind Utility | Role |
|---|---|---|---|
| Primary Dark | `#0F172A` | `bg-[#0F172A]`, `text-[#0F172A]` | Primary buttons, headers, emblems, sidebars |
| Accent Emerald | `#059669` | `bg-[#059669]`, `text-[#059669]` | Active badges, focus rings, balanced states, CTAs |
| Pulsing Emerald | `#10B981` | `bg-[#10B981]`, `text-[#10B981]` | Live status indicators |
| Alert Cream | `#FEF3C7` | `bg-[#FEF3C7]` | Critical Master Key alerts and disaster recovery |
| Neutral Canvas | `#F9FAFB` | `bg-[#F9FAFB]` | Workspace background, table headers |

### Typography
- **Sans-Serif**: `Inter` — Used for all standard labels, buttons, navigation, and headings.
- **Monospace**: `JetBrains Mono` — Used for PKR currency values, GL codes, recovery keys, and 4-digit PINs.

---

## 3. Directory Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx      # Screen 0: Authentication Vault
│   │   ├── globals.css             # Stitch tokens, font imports, PIN box utilities
│   │   ├── layout.tsx              # RootLayout with fonts, QueryProvider & RootBootGuard
│   │   └── page.tsx                # App Shell Workspace & Dashboard preview
│   ├── components/
│   │   ├── auth/
│   │   │   ├── AuthVault.tsx       # PIN authentication card with inline recovery modals
│   │   │   └── AuthVault.test.tsx  # Vitest unit test suite (5 assertions)
│   │   └── system/
│   │       ├── StarterModal.tsx    # Module 0.5 Go-Live Wizard (6-step atomic setup)
│   │       ├── StarterModal.test.tsx
│   │       ├── RecoveryKeyModal.tsx# Blocking Master Key display & backup export
│   │       ├── RecoveryKeyModal.test.tsx
│   │       └── RootBootGuard.tsx   # System status boot interceptor
│   ├── hooks/
│   │   ├── useAuth.ts              # Login, logout, forgot & reset PIN mutations
│   │   └── useSystemInit.ts        # Status query & executeGoLive mutation
│   ├── lib/
│   │   ├── api.ts                  # Axios client with withCredentials: true
│   │   └── queryClient.ts          # Offline-first TanStack Query configuration
│   ├── providers/
│   │   └── QueryProvider.tsx       # Client-side QueryClientProvider wrapper
│   └── types/
│       └── api.ts                  # TypeScript interfaces for API contracts and payloads
├── vitest.config.ts                # Vitest configuration with JSDOM and '@' path alias
└── next.config.ts                  # Next.js static export configuration
```

---

## 4. Development & Testing Commands

All commands are executed from the `frontend/` directory:

```bash
# Start Next.js development server on port 3000
npm run dev

# Run Vitest unit test suite (11 assertions across 3 suites)
npm test

# Run ESLint validation
npm run lint

# Build production static export (outputs to out/)
npm run build
```

---

## 5. Iconography Reference Guide

Always import icons from `lucide-react`:

```tsx
// Good: Native SVG component, 100% offline, zero network requests
import { ShieldCheck, Lock, Landmark, ArrowRight } from 'lucide-react';

<ShieldCheck className="w-4 h-4 text-[#059669]" />

// Banned: Web font ligature (glitches to text in offline mode)
<span className="material-symbols-outlined">verified_user</span>
```

See [`Technical Documentation/frontendDesignSystem&Iconography.md`](../Technical%20Documentation/frontendDesignSystem&Iconography.md) for full mapping specifications.
