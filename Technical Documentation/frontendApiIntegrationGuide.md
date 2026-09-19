# Wadaan Real Estate ERP: Frontend API Integration Guide

This guide provides the complete blueprint for connecting the Next.js frontend (Screen 0 through Screen 10) to the local Express backend API (`http://localhost:4000/api/v1`).

---

## Implementation Status Matrix

| Module | Screen / Route | Implementation Path | Status |
|---|---|---|---|
| **0 - Authentication** | Screen 0: Lock & Vault (`/login`) | `src/components/auth/AuthVault.tsx` | ✅ Implemented (v1.1.0) |
| **0.5 - Initializer** | Starter Modal (`StarterModal.tsx`) | `src/components/system/StarterModal.tsx` | ✅ Implemented (v1.2.0) |
| **Shell & Layout** | Global Navigation Shell (`(dashboard)`) | `src/components/layout/DashboardLayout.tsx` | ✅ Implemented (v1.3.1) |
| **Dashboard** | Executive Dashboard (`/dashboard`) | `src/app/(dashboard)/dashboard/page.tsx` | ✅ Implemented (v1.3.1) |
| **1 - Accounting** | Screen 1: Chart of Accounts (`/accounts`) | `src/app/(dashboard)/accounts/page.tsx` | ✅ Implemented (v1.4.0) |
| **1 - Accounting** | Screen 2: General Journal (`/journals`) | `src/app/(dashboard)/journals/page.tsx` | ✅ Implemented (v1.5.0) |
| **1 - Accounting** | Screen 3: Trial Balance (`/trial-balance`) | `src/app/(dashboard)/trial-balance/page.tsx` | ✅ Implemented (v1.5.0) |
| **2 - Outflow Engine** | Screen 4: Projects & WIP (`/projects`) | `src/app/(dashboard)/projects/page.tsx` | ✅ Implemented (v2.0.0) |
| **2 - Outflow Engine** | Screen 5: Expense Bills (`/payables` Tab 1) | `src/app/(dashboard)/payables/page.tsx` | ✅ Implemented (v2.0.0) |
| **2 - Outflow Engine** | Screen 7: Payment Run (`/payables` Tab 2) | `src/app/(dashboard)/payables/page.tsx` | ✅ Implemented (v2.0.0) |
| **3 - Inflow** | Screen 8: Deals & Customer Hub (`/deals`) | `src/app/(dashboard)/deals/page.tsx` | ✅ Implemented (v3.0.0) |
| **3 - Inflow** | Screen 9: Receipts & Cheque Room (`/receipts`) | `src/app/(dashboard)/receipts/page.tsx` | ✅ Implemented (v3.0.0) |
| **4 - Analytics** | Screen 10: Executive Intelligence (`/reports`) | `src/app/(dashboard)/reports/page.tsx` | 🔲 Scheduled (Module 4) |

---

## 1. Core API Client Setup (Axios)

Because authentication uses **HttpOnly, SameSite=Strict cookies**, all requests must be dispatched with `withCredentials: true`. Without this flag, browsers and Electron Chromium windows will strip the session cookie, resulting in false `401 UNAUTHORIZED` errors.

### `frontend/src/lib/api.ts` (Recommended Implementation)

```typescript
import axios, { AxiosError } from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // CRITICAL: Mandates transmission of HttpOnly JWT cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Standard backend error shape
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

// Global Axios response interceptor for unified error parsing & 401 session expiry redirect
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
    if (error.response?.status === 401) {
      // Silently kill the cache so stale data is not re-displayed on re-login
      queryClient.clear();
      // Hard redirect — works outside React component tree (Electron-safe)
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.replace('/login');
      }
      return Promise.reject(
        error.response.data?.error || {
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        }
      );
    }

    if (error.response?.data?.error) {
      // Backend returned our standard AppError payload
      return Promise.reject(error.response.data.error);
    }

    if (error.code === 'ERR_NETWORK' || !error.response) {
      // Physical network drop or Express server offline
      return Promise.reject({
        code: 'NETWORK_OFFLINE',
        message: 'Unable to reach backend server. Please verify your connection.',
      });
    }

    return Promise.reject({
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred.',
    });
  }
);
```

### 1.1 Layout Route Guard & Query Resilience (v1.3.1)

To prevent cascading `401 UNAUTHORIZED` requests from unauthenticated clients:
1. **Layout Route Guard (`src/app/(dashboard)/layout.tsx`)**:
   - Gated via `useAuth()`.
   - Displays a neutral full-page loading spinner (`"Verifying session..."`) while `isLoadingUser` is true.
   - Immediately executes `router.replace('/login')` if `currentUser` is null.
2. **Query Retry & Polling Policy**:
   - All dashboard query hooks (`useReports`, `useReceipts`, `useProjects`) MUST configure `retry: false` to fail fast upon 401.
   - Polling intervals (`refetchInterval`) MUST evaluate error status to pause intervals when errors occur:
     ```typescript
     refetchInterval: (query) => (query.state.status === 'error' ? false : 30000)
     ```

### 1.2 Global 401 Session Expiry Auto-Redirect (v1.5.1)

When a user's session cookie expires mid-operation while remaining on any dashboard screen:
- **Root Cause Avoided**: Previously, mid-session API failures surfaced as generic query error cards or toasts without evicting the expired session.
- **Architectural Solution**: The response interceptor in `frontend/src/lib/api.ts` directly intercepts any HTTP `401` response:
  1. **Cache Eviction**: Immediately calls `queryClient.clear()` to invalidate all cached financial ledgers, ensuring zero stale data leaks across users or re-logins.
  2. **Electron & Browser Hard Redirect**: Checks `typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')`, and invokes `window.location.replace('/login')`. This triggers an instant, un-cached navigation back to the authentication screen without depending on React component lifecycles.
  3. **Standardized Rejection Payload**: Emits `{ code: 'SESSION_EXPIRED', message: 'Your session has expired. Please log in again.' }` to satisfy TypeScript callers.


### 1.3 Mutation Error Parsing & Field-Level Conflict Mapping (v1.3.2)

Because the Axios response interceptor unwraps errors and rejects with `error.response.data.error` (`ApiErrorPayload`), mutation `catch (err: unknown)` blocks in forms must safely parse `ApiErrorPayload` rather than assuming raw `AxiosError`:
```typescript
const apiErr = err as Partial<ApiErrorPayload> | undefined;
const errorCode = apiErr?.code || (axios.isAxiosError(err) ? err.response?.data?.code : undefined);
const errorMessage = apiErr?.message || (axios.isAxiosError(err) ? err.response?.data?.error || err.response?.data?.message : undefined);

if (errorCode === 'DUPLICATE_RECORD' || (axios.isAxiosError(err) && err.response?.status === 409)) {
  setCodeError(errorMessage || 'Account code already in use');
}
```
- **Field-Level Mapping**: `DUPLICATE_RECORD` (409) maps directly to the specific form field (e.g. Account Code) with inline red styling.
- **Client-Side Pre-Validation**: Forms should validate uniqueness against in-memory query data (`existingCodes`) before submitting to avoid unnecessary network round-trips.

---

## 2. Standardized API Response Contracts

Every endpoint in Wadaan ERP follows an immutable JSON envelope:

### Success Response (`2xx`)
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional human-readable confirmation"
}
```

### Error Response (`4xx`, `5xx`)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_ENUM_CODE",
    "message": "User-facing descriptive explanation"
  }
}
```

### Key Error Codes to Handle in the UI

| Error Code | HTTP Status | Frontend Action |
|---|---|---|
| `UNAUTHORIZED` | `401` | Redirect user immediately to `/login` (Screen 0). |
| `TOKEN_EXPIRED` | `401` | Clear client user state and show toast: "Session expired. Please log in again." |
| `ACCOUNT_LOCKED` | `429` | Disable the Login button and render countdown timer from `message`. |
| `INVALID_PIN` | `401` | Highlight 4-digit PIN input in red and display error message. |
| `INVALID_PIN_FORMAT` | `400` | Alert user that PIN must be exactly 4 digits. |
| `NETWORK_OFFLINE` | `503` | Lock destructive mutation buttons and show yellow "Offline Mode" top bar. |
| `DUPLICATE_RECORD` | `409` | Notify user that document (e.g., Invoice Number or Account Code) already exists. |
| `VALIDATION_ERROR` | `400` | Display field-specific validation warnings. |
| `ALREADY_INITIALIZED` | `409` | System already live; dismiss StarterModal and proceed to login. |
| `UNBALANCED_JOURNAL` | `400` | Double-entry error; alert user to review opening balances. |

---

## 3. TanStack Query (React Query) Offline-First Configuration

Wadaan ERP runs as an Electron desktop app with cloud persistence in Supabase. Intermittent internet outages must never freeze or crash the interface.

### `frontend/src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'offlineFirst', // Keep displaying cached balances during internet drops
      staleTime: 1000 * 60 * 2,    // 2 minutes before refetching fresh ledgers
      retry: (failureCount, error: any) => {
        // Do not retry 401s or 429 locks
        if (error?.code === 'UNAUTHORIZED' || error?.code === 'ACCOUNT_LOCKED') return false;
        return failureCount < 2;
      },
    },
    mutations: {
      networkMode: 'online',       // Block creating bills/payments while offline
    },
  },
});
```

---

## 4. Module 0: Authentication API Integration

### 4.1 Login Flow (`Screen 0`)

```typescript
import { apiClient } from '@/lib/api';

export interface LoginCredentials {
  pin: string; // Exactly 4 numeric digits (e.g. "1234")
}

export const loginUser = async (credentials: LoginCredentials) => {
  const response = await apiClient.post('/auth/login', credentials);
  return response.data; // { success: true, data: { id, email, fullName } }
};
```

**UI Usage Pattern:**
```typescript
try {
  await loginUser({ pin });
  router.push('/dashboard'); // 15-minute HttpOnly cookie set automatically by browser/Electron
} catch (err: any) {
  if (err.code === 'ACCOUNT_LOCKED') {
    setLockoutTimer(err.remainingSeconds ?? 30);
    setLockoutTier(err.lockoutTier ?? 0);
    setMaxAttempts(err.maxAttempts ?? 4); // Next tier limit
    setAttemptCount(0);
    // UI Banner: `Security Lock Active • Tier ${err.displayTier}`
  } else if (err.code === 'INVALID_PIN') {
    setAttemptCount(err.failedAttempts);
    setMaxAttempts(err.maxAttempts);
    setErrorMessage(err.message);
  } else {
    // Network or server error — do not increment attempts
    setErrorMessage(err.message);
  }
}
```

### 4.2 Logout Flow

```typescript
export const logoutUser = async () => {
  await apiClient.post('/auth/logout');
  queryClient.clear(); // Flush sensitive accounting cache
  router.push('/login');
};
```

### 4.3 Session Validation (`Auth Guard / App Startup`)

Call this inside your root layout or React AuthContext to verify persistent login status:

```typescript
export const checkCurrentUser = async () => {
  const response = await apiClient.get('/auth/me');
  return response.data.data; // { userId: "..." }
};
```

### 4.4 Password / PIN Recovery & Master Key Bypass

```typescript
// Step 1: Request reset link (Always succeeds with 200 to prevent email enumeration)
export const requestPasswordReset = async (email: string) => {
  return apiClient.post('/auth/forgot-password', { email });
};

// Step 2: Submit new 4-digit PIN (Accepts Email OTP Token OR Master Recovery Key)
export const submitPinReset = async (payload: {
  email: string;
  resetToken: string; // Either email OTP or offline Master Recovery Key
  newPin: string;     // Exactly 4 numeric digits
}) => {
  return apiClient.post('/auth/reset-password', payload);
};
```

### 4.5 Lockout Status Query (Mount-Time Sync)

When `AuthVault` mounts or is reloaded during an active lockout, it queries `GET /api/v1/auth/lockout-status` to restore the remaining countdown seconds and human tier display without losing context.

```typescript
// Route: GET /api/v1/auth/lockout-status
export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  maxAttempts: number;
  lockoutTier: number;
  displayTier: number;       // Human-readable: lockoutTier + 1
}

export const getLockoutStatus = async (): Promise<LockoutStatus> => {
  const response = await apiClient.get('/auth/lockout-status');
  return response.data.data;
};
```

**Usage in `AuthVault.tsx` (mount):**
```typescript
useEffect(() => {
  getLockoutStatus().then((status) => {
    if (!status) return;
    setAttemptCount(status.failedAttempts);
    setMaxAttempts(status.maxAttempts);
    setLockoutTier(status.lockoutTier);
    if (status.isLocked && status.remainingSeconds > 0) {
      setLockoutTimer(status.remainingSeconds);
    }
  }).catch(() => {
    // Silently fail — if backend unreachable, default state remains intact
  });
}, []);
```

---

## 5. Module 0.5: System Initializer (Go-Live Wizard Integration)

The Starter Modal (Module 0.5) is the one-time wizard that translates real-world cut-off data (Cash & Banks, Active Projects, Unpaid Vendor Bills, and Customer Deals) into the ERP's master opening double-entry journal.

### 5.1 System Status Gate (`App Boot / Root Layout`)

When Next.js mounts inside Electron, it must immediately call `GET /api/v1/system/status` to determine whether the app is ready for login/dashboard or locked for initialization:

```typescript
// Route: GET /api/v1/system/status
export interface SystemStatus {
  isInitialized: boolean;
  goLiveDate: string | null;
}

export const checkSystemStatus = async (): Promise<SystemStatus> => {
  const response = await apiClient.get('/system/status');
  return response.data.data;
};
```

**Guard Implementation:**
```typescript
useEffect(() => {
  checkSystemStatus().then((status) => {
    if (!status.isInitialized) {
      // Force render StarterModal on top of all application views
      setShowStarterModal(true);
    }
  });
}, []);
```

---

### 5.2 Go-Live Data Contracts & Payload

```typescript
export interface AdminSetupInput {
  email: string;
  pin: string; // Exactly 4 numeric digits
  fullName: string;
}

export interface CashAndBankInput {
  name: string;   // e.g., "Office Safe", "Meezan Bank"
  code: string;   // e.g., "1010", "1020" (unique)
  balance: number; // Non-negative
}

export interface ActiveProjectInput {
  name: string;        // e.g., "Wadaan Heights"
  prefix: string;      // e.g., "WH" (uppercase, unique)
  masterBOQ?: number;  // Planned budget / BOQ
  boq?: number;        // Alias for masterBOQ
  spentToDate: number; // Cumulative expenses cut-off (hits WIP account 1200)
}

export interface UnpaidPayableInput {
  vendorName: string; // e.g., "Ali Hardware"
  phone?: string;
  amountDue: number;  // Unpaid bill balance (hits AP account 2000)
  projectId?: string; // Optional link to active project
}

export interface ActiveDealInput {
  customerName: string; // Customer full name
  phone: string;
  projectName?: string; // Links deal to active project
  dealType?: 'WADAAN_SALE' | 'CONSTRUCTION' | 'BROKERAGE';
  totalDealValue: number;
  amountReceivedPast: number; // Must be <= totalDealValue (records cleared receipt)
}

export interface GoLivePayload {
  admin?: AdminSetupInput;
  cashAndBanks: CashAndBankInput[];
  activeProjects: ActiveProjectInput[];
  unpaidPayables: UnpaidPayableInput[];
  activeDeals: ActiveDealInput[];
}

export interface GoLiveResponse {
  success: boolean;
  message: string;
  masterRecoveryKey: string | null;
  goLiveDate: string;
}
```

---

### 5.3 Go-Live Initialization Mutation

```typescript
// Route: POST /api/v1/system/initialize
export const initializeSystem = async (payload: GoLivePayload): Promise<GoLiveResponse> => {
  const response = await apiClient.post('/system/initialize', payload);
  return response.data;
};
```

---

### 5.4 Starter Modal Wizard Flow & Recovery Key Handling

```typescript
const handleLaunchERP = async (wizardData: GoLivePayload) => {
  setIsSubmitting(true);
  try {
    const result = await initializeSystem(wizardData);

    if (result.masterRecoveryKey) {
      // MANDATORY STEP: Present Master Recovery Key to user before unlocking app
      setMasterRecoveryKey(result.masterRecoveryKey);
      setShowRecoveryKeyModal(true);
    } else {
      // Admin was pre-created; proceed directly to login
      setShowStarterModal(false);
      router.push('/login');
    }
  } catch (err: any) {
    if (err.code === 'ALREADY_INITIALIZED') {
      alert('System is already live. Redirecting to login...');
      setShowStarterModal(false);
      router.push('/login');
    } else if (err.code === 'VALIDATION_ERROR') {
      setValidationError(err.message);
    } else if (err.code === 'UNBALANCED_JOURNAL') {
      setAccountingError('Financial balancing failed. Total Debits do not match Credits.');
    } else {
      setGeneralError(err.message || 'Failed to initialize system.');
    }
  } finally {
    setIsSubmitting(false);
  }
};
```

---

### 5.5 Module 0.5 Error Handling Blueprint

| Error Code | HTTP Status | Cause | UI Resolution |
|---|---|---|---|
| `ALREADY_INITIALIZED` | `409` | System was already initialized by another session or previous call. | Immediately dismiss modal, clear local wizard state, and navigate to `/login`. |
| `VALIDATION_ERROR` | `400` | Negative balances, empty required fields, duplicate bank codes, or duplicate project prefixes. | Highlight invalid step/field in the Starter Modal wizard and display backend error message. |
| `UNBALANCED_JOURNAL` | `400` | Double-entry debits do not equal credits. | Show financial warning banner: verify opening asset and payable numbers. |
| `ADMIN_ALREADY_EXISTS` | `403` | Admin account exists in DB, but `admin` object was provided in payload. | Omit `admin` block or proceed with existing admin credentials. |
| `ADMIN_REQUIRED` | `400` | No existing admin and no `admin` provided in payload. | Direct user to fill in Step 0 (Admin credentials). |
| `NETWORK_OFFLINE` | `503` | Cloud Supabase database unreachable during Go-Live transaction. | Disable "Launch ERP" button, show connection retry prompt; transaction rolls back cleanly. |

---

## 6. Module 1: Core Accounting & Ledgers Integration

Module 1 governs **Screen 1 (Chart of Accounts)**, **Screen 2 (General Journal)**, and **Screen 3 (Ledger Statement)**. All requests require active session authentication via `authGuard`.

### 6.1 Screen 1: Chart of Accounts (`/api/v1/accounts`)

#### Data Models & Interfaces
```typescript
export type AccountCategory = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface AccountWithBalance {
  id: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  isSystemLocked: boolean;
  totalDebit: string;
  totalCredit: string;
  balance: string;
}

export interface GroupedAccounts {
  ASSET: AccountWithBalance[];
  LIABILITY: AccountWithBalance[];
  EQUITY: AccountWithBalance[];
  REVENUE: AccountWithBalance[];
  EXPENSE: AccountWithBalance[];
}

export interface AccountsSummary {
  totalAssets: string;
  totalLiabilities: string;
  totalEquity: string;
  totalRevenue: string;
  totalExpenses: string;
}

export interface AccountsResponse {
  accounts: AccountWithBalance[];
  grouped: GroupedAccounts;
  summary: AccountsSummary;
}
```

#### API Calls (`frontend/src/features/accounting/api/accountsApi.ts`)
```typescript
import { apiClient } from '@/lib/api';

/**
 * Fetch Chart of Accounts with live calculated balances.
 * @param fy If true, calculates Revenue & Expense strictly from July 1st of current fiscal year.
 */
export const fetchAccounts = async (fy: boolean = false): Promise<AccountsResponse> => {
  const response = await apiClient.get('/accounts', {
    params: { fy: fy ? 'true' : undefined }
  });
  return response.data.data;
};

/**
 * Create a new custom Account bucket.
 */
export const createAccount = async (payload: {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
}) => {
  const response = await apiClient.post('/accounts', payload);
  return response.data.data;
};

/**
 * Update an existing Account name or category (v1.4.0).
 */
export const updateAccount = async (id: string, payload: {
  accountName?: string;
  category?: AccountCategory;
}) => {
  const response = await apiClient.patch(`/accounts/${id}`, payload);
  return response.data.data;
};

/**
 * Delete or archive an Account record (v1.4.0).
 */
export const deleteAccount = async (id: string) => {
  const response = await apiClient.delete(`/accounts/${id}`);
  return {
    message: response.data.message,
    data: response.data.data
  };
};
```

#### React Query Hook Example (`Screen 1` - v1.4.0 Full CRUD)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from './accountsApi';

export const useChartOfAccounts = (fy: boolean = false) => {
  return useQuery({
    queryKey: ['accounts', { fy }],
    queryFn: () => fetchAccounts(fy),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateAccount(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });
};
```

---

### 6.2 Screen 2: General Journal Entries (`/api/v1/journals`) [v1.5.0]

#### Data Models & Interfaces (`src/features/accounting/types/journal.ts`)
```typescript
export interface JournalLinePayload {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  memo?: string;
  customerId?: string | null;
  vendorId?: string | null;
  projectId?: string | null;
}

export interface CreateJournalPayload {
  entryDate: string; // ISO 8601 string, e.g. "2026-09-02T00:00:00.000Z"
  description: string;
  lines: JournalLinePayload[];
}

export interface JournalEntry {
  id: string;
  entryNumber: string; // e.g. "JV-0002"
  entryDate: string;
  description: string;
  createdAt: string;
  lines: {
    id: string;
    accountId: string;
    debitAmount: string;
    creditAmount: string;
    memo?: string | null;
    customerId?: string | null;
    vendorId?: string | null;
    projectId?: string | null;
    account: {
      id: string;
      accountCode: string;
      accountName: string;
      category: AccountCategory;
    };
  }[];
}

export interface JournalEntriesResponse {
  entries: JournalEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

#### API Calls (`src/features/accounting/api/journalsApi.ts`)
```typescript
import { apiClient } from '@/lib/api';

export const createJournalEntry = async (payload: CreateJournalPayload): Promise<JournalEntry> => {
  const response = await apiClient.post('/journals', payload);
  return response.data.data;
};

export const fetchJournalEntries = async (page: number = 1, limit: number = 20): Promise<JournalEntriesResponse> => {
  const response = await apiClient.get('/journals', { params: { page, limit } });
  return response.data.data;
};
```

#### React Query Hooks (`src/features/accounting/hooks/useJournals.ts`)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createJournalEntry, fetchJournalEntries } from '../api/journalsApi';

export const useJournalEntries = (page: number = 1, limit: number = 20) => {
  return useQuery({
    queryKey: ['journals', page, limit],
    queryFn: () => fetchJournalEntries(page, limit),
    staleTime: 1000 * 60,
  });
};

export const useCreateJournal = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['journals'] });
      queryClient.invalidateQueries({ queryKey: ['reports', 'trial-balance'] });
    }
  });
};
```

---

### 6.4 Screen 3: Live Trial Balance Report (`/api/v1/reports/trial-balance`) [v1.5.0]

#### Data Models & Interfaces (`src/features/reports/types/index.ts`)
```typescript
export interface TrialBalanceLineItem {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  debit: string;
  credit: string;
}

export interface TrialBalanceReport {
  period: {
    startDate: string;
    endDate: string;
  };
  accounts: TrialBalanceLineItem[];
  grandTotalDebit: string;
  grandTotalCredit: string;
  isBalanced: boolean;
}
```

#### API Calls (`src/features/reports/api/reportApi.ts`)
```typescript
export const fetchTrialBalance = async (
  startDate?: string,
  endDate?: string
): Promise<TrialBalanceReport> => {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;

  const response = await apiClient.get('/reports/trial-balance', { params });
  return response.data.data;
};
```

#### React Query Hook (`src/features/reports/hooks/useReports.ts`)
```typescript
export const useTrialBalance = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['reports', 'trial-balance', startDate, endDate],
    queryFn: () => fetchTrialBalance(startDate, endDate),
    staleTime: 1000 * 60 * 2,
  });
};
```

---

### 6.3 Screen 3: Chronological Ledger Statement (`/api/v1/journals/ledger/:accountId`)

#### Data Models & Interfaces
```typescript
export interface LedgerTransactionRow {
  id: string;
  journalId: string;
  entryNumber: string;
  entryDate: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
  runningBalance: string;
}

export interface LedgerStatementResponse {
  account: {
    id: string;
    accountCode: string;
    accountName: string;
    category: AccountCategory;
    isSystemLocked: boolean;
  };
  filter: {
    startDate: string;
    endDate: string;
  };
  openingBalance: string;
  closingBalance: string;
  totalDebits: string;
  totalCredits: string;
  transactions: LedgerTransactionRow[];
}
```

#### API Calls (`frontend/src/features/accounting/api/ledgerApi.ts`)
```typescript
import { apiClient } from '@/lib/api';

/**
 * Fetch chronological ledger statement for an account.
 */
export const fetchLedgerStatement = async (
  accountId: string,
  startDate?: string,
  endDate?: string
): Promise<LedgerStatementResponse> => {
  const response = await apiClient.get(`/journals/ledger/${accountId}`, {
    params: {
      startDate: startDate || undefined,
      endDate: endDate || undefined
    }
  });
  return response.data.data;
};
```

#### React Query Hook Example (`Screen 3`)
```typescript
import { useQuery } from '@tanstack/react-query';
import { fetchLedgerStatement } from './ledgerApi';

export const useLedgerStatement = (accountId: string, startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: ['ledger', accountId, { startDate, endDate }],
    queryFn: () => fetchLedgerStatement(accountId, startDate, endDate),
    enabled: !!accountId
  });
};
```

---

### 6.4 Module 1 Error Handling Blueprint

| Error Code | HTTP Status | Cause | UI Resolution |
|---|---|---|---|
| `ERR_SYSTEM_ACCOUNT_LOCKED` | `403` | User tried to manually target AP, WIP, Escrow, etc. on Screen 2. | Render alert: "This account is system-locked. Use the dedicated Bills or Receipts workflow." |
| `UNBALANCED_JOURNAL` | `400` | Total debits do not equal total credits. | Highlight difference in red and keep "Post Journal" button disabled until diff is 0.00. |
| `INVALID_JOURNAL_LINES` | `400` | Entry contains fewer than 2 lines. | Prompt user to add at least one debit and one credit line. |
| `DUPLICATE_RECORD` | `409` | Account code already exists when creating an account on Screen 1. | Highlight Account Code input: "Account code already in use." |
| `ACCOUNT_NOT_FOUND` | `404` | Targeted account ID does not exist in the database. | Refresh Chart of Accounts list; verify account selection. |
| `NOT_FOUND` | `404` | Journal entry targeted for reversal does not exist. | Inform user that journal entry cannot be found. |
| `VALIDATION_ERROR` | `400` | Zod schema validation failure (e.g. line has both debit and credit > 0). | Display validation error message next to the corresponding line item. |

---

## 7. Endpoints Reference Summary

| Method | Full Route Path | Access Level | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/setup` | Public (One-Time) | Seed initial Master Admin with 4-digit PIN & receive Recovery Key. |
| `POST` | `/api/v1/auth/login` | Public (Rate-Limited) | Authenticate via 4-digit PIN & receive 15-minute HttpOnly JWT cookie. |
| `POST` | `/api/v1/auth/logout` | Protected (`authGuard`) | Clear session cookie & terminate session. |
| `GET` | `/api/v1/auth/me` | Protected (`authGuard`) | Validate active JWT session on app boot. |
| `POST` | `/api/v1/auth/forgot-password` | Public | Dispatch PIN reset email (always 200). |
| `POST` | `/api/v1/auth/reset-password` | Public | Reset 4-digit PIN via email token or Master Recovery Key. |
| `GET` | `/api/v1/system/status` | Public | Check if system is initialized (StarterModal gate). |
| `POST` | `/api/v1/system/initialize` | Public (Locked after 1) | Execute atomic opening balance go-live wizard. |
| `GET` | `/api/v1/accounts` | Protected (`authGuard`) | Fetch Chart of Accounts with live calculated balances (?fy=true). |
| `POST` | `/api/v1/accounts` | Protected (`authGuard`) | Create custom Chart of Accounts bucket. |
| `POST` | `/api/v1/journals` | Protected (`authGuard`) | Post manual double-entry journal voucher (Screen 2). |
| `POST` | `/api/v1/journals/:id/reverse` | Protected (`authGuard`) | Post compensating mirror reversal journal voucher. |
| `GET` | `/api/v1/journals/ledger/:accountId` | Protected (`authGuard`) | Fetch chronological ledger statement with running balance (Screen 3). |
| `POST` | `/api/v1/projects` | Protected (`authGuard`) | Initialize a new construction project with master BOQ (Screen 4). |
| `GET` | `/api/v1/projects` | Protected (`authGuard`) | List all projects with live calculated spent, variance, and burn % (Screen 4). |
| `GET` | `/api/v1/projects/:id` | Protected (`authGuard`) | Fetch project detail with associated bills and budget metrics (Screen 4). |
| `PATCH` | `/api/v1/projects/:id/status` | Protected (`authGuard`) | Update project status (ACTIVE, COMPLETED, ON_HOLD) (Screen 4). |
| `POST` | `/api/v1/vendors` | Protected (`authGuard`) | Create a new supplier/vendor record (Screens 5 & 7). |
| `GET` | `/api/v1/vendors` | Protected (`authGuard`) | List suppliers with live calculated total outstanding balances (Screen 5 & 7). |
| `GET` | `/api/v1/vendors/:id/unpaid-bills` | Protected (`authGuard`) | Fetch unpaid bills queue ordered strictly by oldest date (FIFO) (Screen 7). |
| `POST` | `/api/v1/bills` | Protected (`authGuard`) | Post expense bill with WIP/Overhead routing & budget warning (Screen 5). |
| `GET` | `/api/v1/bills` | Protected (`authGuard`) | Filter and list expense bills (?vendorId, ?projectId, ?paymentStatus) (Screen 5). |
| `GET` | `/api/v1/bills/:id` | Protected (`authGuard`) | Fetch expense bill detail by ID with line items (Screen 5). |
| `POST` | `/api/v1/payments/vendor` | Protected (`authGuard`) | Execute FIFO payment run waterfall across unpaid bills (Screen 7). |
| `GET` | `/api/v1/payments/vendor` | Protected (`authGuard`) | Fetch payment run history (?vendorId) (Screen 7). |
| `GET` | `/api/v1/payments/vendor/:id` | Protected (`authGuard`) | Fetch payment run detail by ID (Screen 7). |

---

## 8. Module 2: Payables & Projects Integration (Screens 4, 5, 7)

### 8.1 Screen 4: Projects & Budget Health Bars

#### TypeScript Contracts (`frontend/src/features/projects/types.ts`)
```typescript
export interface ProjectItem {
  id: string;
  projectName: string;
  projectPrefix: string;
  masterBOQ: string;
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD';
  createdAt: string;
  spentToDate: string;
  budgetVariance: string;
  isOverBudget: boolean;
  budgetBurnPercentage: number;
}

export interface CreateProjectPayload {
  projectName: string;
  projectPrefix: string;
  masterBOQ: number | string;
}
```

#### API Calls (`frontend/src/features/projects/api/projectApi.ts`)
```typescript
import { apiClient } from '@/lib/api';
import { ProjectItem, CreateProjectPayload } from '../types';

export const fetchProjects = async (): Promise<ProjectItem[]> => {
  const res = await apiClient.get('/projects');
  return res.data.data;
};

export const fetchProjectById = async (id: string): Promise<ProjectItem> => {
  const res = await apiClient.get(`/projects/${id}`);
  return res.data.data;
};

export const createProject = async (payload: CreateProjectPayload): Promise<ProjectItem> => {
  const res = await apiClient.post('/projects', payload);
  return res.data.data;
};

export const updateProjectStatus = async (
  id: string,
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD'
): Promise<ProjectItem> => {
  const res = await apiClient.patch(`/projects/${id}/status`, { status });
  return res.data.data;
};
```

---

### 8.2 Screen 5: Expense Bills & WIP Capitalization

#### TypeScript Contracts (`frontend/src/features/bills/types.ts`)
```typescript
export interface BillLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number | string;
}

export interface CreateBillPayload {
  vendorId: string;
  projectId?: string | null;
  invoiceNumber: string;
  billDate?: string;
  paymentType: 'ACCOUNTS_PAYABLE' | 'DIRECT_CASH';
  sourceAccountId?: string;
  lineItems: BillLineItemInput[];
}

export interface CreateBillResponse {
  bill: {
    id: string;
    vendorId: string;
    projectId: string | null;
    invoiceNumber: string;
    billDate: string;
    paymentType: 'ACCOUNTS_PAYABLE' | 'DIRECT_CASH';
    paymentStatus: 'UNPAID' | 'PARTIAL' | 'PAID';
    grandTotal: string;
    pendingAmount: string;
  };
  isOverBudget: boolean;
  overBudgetAmount: string;
  journalEntry: {
    id: string;
    entryNumber: string;
  };
}
```

#### API Calls (`frontend/src/features/bills/api/billApi.ts`)
```typescript
import { apiClient } from '@/lib/api';
import { CreateBillPayload, CreateBillResponse } from '../types';

export const createBill = async (payload: CreateBillPayload): Promise<CreateBillResponse> => {
  const res = await apiClient.post('/bills', payload);
  return res.data.data;
};

export const fetchBills = async (filters?: {
  vendorId?: string;
  projectId?: string;
  paymentStatus?: string;
}) => {
  const res = await apiClient.get('/bills', { params: filters });
  return res.data.data;
};
```

> [!NOTE]
> **Soft Budget Overrun Notice**: If `isOverBudget: true`, prompt the user with a amber warning toast indicating the overage amount (`overBudgetAmount`), but allow the bill creation to succeed normally.

---

### 8.3 Screen 7: Vendor Payment Run (FIFO Waterfall)

#### TypeScript Contracts (`frontend/src/features/payments/types.ts`)
```typescript
export interface UnpaidBillItem {
  id: string;
  invoiceNumber: string;
  billDate: string;
  grandTotal: string;
  pendingAmount: string;
  paymentStatus: 'UNPAID' | 'PARTIAL';
  project?: {
    projectName: string;
    projectPrefix: string;
  } | null;
}

export interface VendorUnpaidQueueResponse {
  vendorId: string;
  vendorName: string;
  totalOutstanding: string;
  bills: UnpaidBillItem[];
}

export interface ProcessPaymentPayload {
  vendorId: string;
  sourceAccountId: string;
  amountPaid: number | string;
  chequeRef?: string | null;
  paymentDate?: string;
}

export interface SettledBillItem {
  billId: string;
  invoiceNumber: string;
  amountApplied: string;
  previousPending: string;
  newPending: string;
  status: 'PARTIAL' | 'PAID';
}

export interface PaymentRunResponse {
  payment: {
    id: string;
    vendorId: string;
    sourceAccountId: string;
    amountPaid: string;
    chequeRef: string | null;
    paymentDate: string;
  };
  settledBills: SettledBillItem[];
  journalEntry: {
    id: string;
    entryNumber: string;
  };
  totalSettled: string;
  remainingVendorOutstanding: string;
}
```

#### API Calls (`frontend/src/features/payments/api/paymentApi.ts`)
```typescript
import { apiClient } from '@/lib/api';
import {
  VendorUnpaidQueueResponse,
  ProcessPaymentPayload,
  PaymentRunResponse
} from '../types';

export const fetchVendorUnpaidBills = async (
  vendorId: string
): Promise<VendorUnpaidQueueResponse> => {
  const res = await apiClient.get(`/vendors/${vendorId}/unpaid-bills`);
  return res.data.data;
};

export const executePaymentRun = async (
  payload: ProcessPaymentPayload
): Promise<PaymentRunResponse> => {
  const res = await apiClient.post('/payments/vendor', payload);
  return res.data.data;
};
```

---

### 8.4 Module 2 Error Handling Blueprint

| Error Code | HTTP Status | Cause | UI Action |
|---|---|---|---|
| `DUPLICATE_PROJECT_PREFIX` | `409` | Project prefix already registered. | Prompt user: "Prefix already taken. Choose another code (e.g. WH2)." |
| `DUPLICATE_INVOICE` | `409` | Vendor invoice number already recorded. | Highlight invoice number field: "Invoice already exists for this vendor." |
| `PAYMENT_EXCEEDS_OUTSTANDING` | `400` | Payment exceeds total unpaid bills. | Cap payment input to `totalOutstanding` and display warning alert. |
| `INVALID_BILL_AMOUNT` | `400` | Bill grand total is 0 or negative. | Prevent submission until line item quantities/prices yield total > 0. |
| `PROJECT_NOT_FOUND` | `404` | Selected project ID does not exist. | Refresh projects dropdown and notify user. |
| `VENDOR_NOT_FOUND` | `404` | Selected vendor ID does not exist. | Refresh vendors dropdown and notify user. |
| `ACCOUNT_NOT_FOUND` | `404` | Selected source cash/bank account missing. | Refresh Bank & Cash accounts list on Screen 1. |

---

## 9. Module 3: Receivables & Revenue (Screens 8 & 9)

### 9.1 Overview & Screen Mapping

| Screen | Feature | Core APIs | Primary Responsibilities |
|---|---|---|---|
| **Screen 8** | **The Deal Hub** | `GET /customers`, `POST /customers`, `POST /deals`, `GET /deals`, `POST /deals/:id/transfer`, `POST /customers/:id/apply-wallet` | Manage client portfolio, issue Milestone Contracts (Sale, Construction, Brokerage), calculate pending balances, transfer files, consume advance wallets. |
| **Screen 9** | **Cash & Cheque Gateway** | `POST /receipts`, `GET /receipts/waiting-room`, `POST /receipts/:id/clear`, `POST /receipts/:id/bounce` | Log desk receipts, manage the Cheque Waiting Room, confirm bank settlements into the General Ledger, bounce dishonored cheques. |

---

### 9.2 TypeScript Data Contracts

```typescript
export type DealType = 'WADAAN_SALE' | 'CONSTRUCTION' | 'BROKERAGE';
export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'PENDING_CLEARANCE';
export type ClearanceStatus = 'PENDING' | 'CLEARED' | 'BOUNCED';

export interface Customer {
  id: string;
  fullName: string;
  phone: string;
  walletBalance: string;
  _count?: {
    deals: number;
    receipts: number;
  };
}

export interface DealInvoice {
  id: string;
  dealId: string;
  description: string;
  amount: string;
  dueDate: string;
  paymentStatus: PaymentStatus;
  receiptId?: string | null;
}

export interface Deal {
  id: string;
  customerId: string;
  projectId?: string | null;
  dealType: DealType;
  totalValue: string;
  commissionAmount?: string | null;
  pendingBalance: string;
  createdAt: string;
  customer: Customer;
  project?: {
    projectName: string;
    projectPrefix: string;
  } | null;
  invoices: DealInvoice[];
}

export interface Receipt {
  id: string;
  customerId: string;
  amount: string;
  paymentMethod: 'CASH' | 'CHEQUE' | 'ONLINE';
  bankRefNumber?: string | null;
  clearanceStatus: ClearanceStatus;
  receiptDate: string;
  customer: Customer;
  invoices?: DealInvoice[];
}

export interface CreateDealPayload {
  customerId: string;
  dealType: DealType;
  projectId?: string | null;
  totalValue: number | string;
  commissionAmount?: number | string | null;
  invoices: {
    description: string;
    amount: number | string;
    dueDate: string;
  }[];
}

export interface CreateReceiptPayload {
  customerId: string;
  invoiceIds?: string[];
  amount: number | string;
  paymentMethod: 'CASH' | 'CHEQUE' | 'ONLINE';
  bankRefNumber?: string | null;
  targetAccountId?: string | null;
}
```

---

### 9.3 Screen 8 (Deal Hub) Integration

#### API Client (`frontend/src/features/deals/api/dealApi.ts`)
```typescript
import { apiClient } from '@/lib/api';
import { Customer, Deal, CreateDealPayload } from '../types';

export const fetchCustomers = async (): Promise<Customer[]> => {
  const res = await apiClient.get('/customers');
  return res.data.data;
};

export const createCustomer = async (data: { fullName: string; phone: string }): Promise<Customer> => {
  const res = await apiClient.post('/customers', data);
  return res.data.data;
};

export const fetchDeals = async (): Promise<Deal[]> => {
  const res = await apiClient.get('/deals');
  return res.data.data;
};

export const createDeal = async (payload: CreateDealPayload): Promise<Deal> => {
  const res = await apiClient.post('/deals', payload);
  return res.data.data;
};

export const executeFileTransfer = async (
  dealId: string,
  payload: { newCustomerId: string; transferFeeAmount: number }
) => {
  const res = await apiClient.post(`/deals/${dealId}/transfer`, payload);
  return res.data.data;
};

export const applyCustomerWallet = async (
  customerId: string,
  payload: { invoiceId: string; amount: number }
) => {
  const res = await apiClient.post(`/customers/${customerId}/apply-wallet`, payload);
  return res.data.data;
};
```

---

### 9.4 Screen 9 (Cash & Cheque Gateway) Integration

#### API Client (`frontend/src/features/receipts/api/receiptApi.ts`)
```typescript
import { apiClient } from '@/lib/api';
import { Receipt, CreateReceiptPayload } from '../types';

export const logInflow = async (payload: CreateReceiptPayload) => {
  const res = await apiClient.post('/receipts', payload);
  return res.data.data;
};

export const fetchWaitingRoom = async (): Promise<Receipt[]> => {
  const res = await apiClient.get('/receipts/waiting-room');
  return res.data.data;
};

export const clearPendingCheque = async (receiptId: string, targetBankAccountId: string) => {
  const res = await apiClient.post(`/receipts/${receiptId}/clear`, { targetBankAccountId });
  return res.data.data;
};

export const bouncePendingCheque = async (receiptId: string) => {
  const res = await apiClient.post(`/receipts/${receiptId}/bounce`);
  return res.data.data;
};
```

---

### 9.5 Module 3 Error Handling Blueprint

| Error Code | HTTP Status | Cause | UI Action |
|---|---|---|---|
| `ERR_PENDING_FUNDS_LOCKED` | `400` | Attempted file transfer while cheque is floating. | Show Modal: "Cannot transfer file while cheque clearance is pending. Clear or bounce receipt first." |
| `INSUFFICIENT_WALLET_BALANCE` | `400` | Requested wallet advance exceeds available balance. | Alert: "Insufficient wallet funds. Customer balance is Rs. X." |
| `UNDERPAYMENT_NOT_ALLOWED` | `400` | Receipt amount less than total of selected invoices. | Warn: "Payment amount must at least equal the sum of selected invoices." |
| `INVOICES_SUM_MISMATCH` | `400` | Milestone invoice sum != total contract value. | Auto-calculate remaining balance and alert in red on deal creator modal. |
| `COMMISSION_REQUIRED` | `400` | Missing commissionAmount on Brokerage contract. | Prompt: "Wadaan commission amount is required for Brokerage deals." |
| `RECEIPT_NOT_PENDING` | `400` | Attempted to clear or bounce an already settled receipt. | Refresh Waiting Room list via React Query invalidation. |

---

## 10. Module 4: Executive Intelligence (Screen 10 Dashboard)

Screen 10 serves as the single pane of glass for Wadaan executive leadership. It aggregates live metrics from general ledger accounts, bills, deals, invoices, and customer wallets into real-time visual cards, tables, and radar widgets.

### 10.1 TypeScript Interfaces (`frontend/src/features/reports/types/index.ts`)

```typescript
export interface ExecutiveSnapshot {
  liquidCash: string;        // Cash in Office Safe + Bank accounts (GL 10xx)
  clientFundsHeld: string;   // Customer mobilization wallets + Escrow Liability (GL 2100)
  totalAR: string;           // Unpaid/partial milestone receivables
  totalAP: string;           // Unpaid/partial vendor payables
}

export interface DealMarginItem {
  dealId: string;
  dealType: 'WADAAN_SALE' | 'CONSTRUCTION' | 'BROKERAGE';
  customerName: string;
  projectName: string | null;
  totalValue: string;
  revenueCollected: string;
  totalProjectCost: string;
  grossProfit: string;
  marginPercentage: string;  // e.g. "25.00" or "0.00" (protected against div-by-zero)
  isWipAsset: boolean;       // true if revenueCollected == 0 (capitalized construction phase)
}

export interface AgingReceivableItem {
  invoiceId: string;
  customerName: string;
  description: string;
  amount: string;
  dueDate: string;           // ISO 8601 string
  daysOverdue: number;       // Calendar days past due date (0 if not yet due)
}

export interface AgingPayableItem {
  billId: string;
  vendorName: string;
  invoiceNumber: string;
  pendingAmount: string;
  billDate: string;          // ISO 8601 string
  daysOverdue: number;       // Calendar days past bill date (0 if current)
}

export interface AgingRadarResponse {
  receivables: AgingReceivableItem[];
  payables: AgingPayableItem[];
}

export interface NetIncomeReport {
  period: {
    startDate: string;       // ISO 8601 string
    endDate: string;         // ISO 8601 string
  };
  grossDealProfit: string;
  brokerageCommissions: string;
  generalOverhead: string;
  netIncome: string;         // (grossDealProfit + brokerageCommissions) - generalOverhead
}
```

---

### 10.2 API Client (`frontend/src/features/reports/api/reportApi.ts`)

```typescript
import { apiClient } from '@/lib/api';
import {
  ExecutiveSnapshot,
  DealMarginItem,
  AgingRadarResponse,
  NetIncomeReport
} from '../types';

/**
 * Fetches top-line survival metrics (Liquid Cash, Client Funds Held, AR, AP)
 */
export const fetchExecutiveSnapshot = async (): Promise<ExecutiveSnapshot> => {
  const res = await apiClient.get('/reports/snapshot');
  return res.data.data;
};

/**
 * Fetches deal-by-deal gross margin breakdown
 */
export const fetchDealMargins = async (status?: 'ACTIVE' | 'COMPLETED'): Promise<DealMarginItem[]> => {
  const res = await apiClient.get('/reports/deal-margins', {
    params: status ? { status } : undefined
  });
  return res.data.data;
};

/**
 * Fetches aging receivables and payables sorted by days overdue
 */
export const fetchAgingRadar = async (): Promise<AgingRadarResponse> => {
  const res = await apiClient.get('/reports/aging-radar');
  return res.data.data;
};

/**
 * Fetches true net income for fiscal year or custom date range
 */
export const fetchNetIncome = async (params?: {
  startDate?: string;
  endDate?: string;
}): Promise<NetIncomeReport> => {
  const res = await apiClient.get('/reports/net-income', { params });
  return res.data.data;
};
```

---

### 10.3 TanStack Query Hooks (`frontend/src/features/reports/hooks/useReports.ts`)

```typescript
import { useQuery } from '@tanstack/react-query';
import {
  fetchExecutiveSnapshot,
  fetchDealMargins,
  fetchAgingRadar,
  fetchNetIncome
} from '../api/reportApi';

export const reportKeys = {
  all: ['reports'] as const,
  snapshot: () => [...reportKeys.all, 'snapshot'] as const,
  margins: (status?: string) => [...reportKeys.all, 'margins', status] as const,
  aging: () => [...reportKeys.all, 'aging'] as const,
  netIncome: (start?: string, end?: string) => [...reportKeys.all, 'net-income', start, end] as const
};

export const useExecutiveSnapshot = () => {
  return useQuery({
    queryKey: reportKeys.snapshot(),
    queryFn: fetchExecutiveSnapshot,
    refetchInterval: 30_000 // Polling every 30s for live executive dashboard
  });
};

export const useDealMargins = (status?: 'ACTIVE' | 'COMPLETED') => {
  return useQuery({
    queryKey: reportKeys.margins(status),
    queryFn: () => fetchDealMargins(status)
  });
};

export const useAgingRadar = () => {
  return useQuery({
    queryKey: reportKeys.aging(),
    queryFn: fetchAgingRadar
  });
};

export const useNetIncome = (startDate?: string, endDate?: string) => {
  return useQuery({
    queryKey: reportKeys.netIncome(startDate, endDate),
    queryFn: () => fetchNetIncome({ startDate, endDate })
  });
};
```

---

### 10.4 Screen 10 Widget Design & Architectural Guardrails

| Widget | Backend Source | Financial Guardrail Enforced |
|---|---|---|
| **Liquid Cash** | `GET /api/v1/reports/snapshot` | Uncleared wealth filter: pending cheques in Waiting Room generate NO journal lines, so they cannot artificially inflate cash. |
| **Client Funds Held** | `GET /api/v1/reports/snapshot` | Escrow segregation: Client wallets and Escrow Liability (2100) are flagged in red so leadership never spends third-party funds. |
| **Deal Margins** | `GET /api/v1/reports/deal-margins` | Safe percentage: Unsold construction projects (`revenueCollected == 0`) are flagged as `isWipAsset = true` with `0.00%` margin, preventing `NaN` crashes. |
| **Aging Radar** | `GET /api/v1/reports/aging-radar` | Priority ordering: Overdue receivables and payables are dynamically sorted by `daysOverdue DESC` using real-time date math. |
| **True Net Income** | `GET /api/v1/reports/net-income` | Accrual matching: WIP projects with zero revenue are excluded from P&L deduction, ensuring unearned expenses stay on the balance sheet. |

