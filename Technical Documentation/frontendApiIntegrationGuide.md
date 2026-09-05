# Wadaan Real Estate ERP: Frontend API Integration Guide

This guide provides the complete blueprint for connecting the Next.js frontend (Screen 0 through Screen 10) to the local Express backend API (`http://localhost:4000/api/v1`).

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

// Global Axios response interceptor for unified error parsing
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorResponse>) => {
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
    // Message contains countdown: "Account locked. Try again in 30 seconds."
    setLockoutBanner(err.message);
  } else {
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

## 6. Endpoints Reference Summary

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
