// Standard backend error shape
export interface ApiErrorPayload {
  code: string;
  message: string;
  remainingSeconds?: number;
  lockoutTier?: number;
  displayTier?: number;
  failedAttempts?: number;
  maxAttempts?: number;
}

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failedAttempts: number;
  maxAttempts: number;
  lockoutTier: number;
  displayTier: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiErrorPayload;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorPayload;
}

// Module 0: Authentication Types
export interface UserContext {
  id: string;
  email: string;
  fullName: string;
}

export interface LoginCredentials {
  pin: string; // 4 numeric digits
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  resetToken: string; // Either email OTP or offline Master Recovery Key
  newPin: string; // 4 numeric digits
}

// Module 0.5: Go-Live Initialization Types
export interface SystemStatus {
  isInitialized: boolean;
  goLiveDate: string | null;
  hasAdmin?: boolean;
}

export interface AdminSetupInput {
  email: string;
  pin: string; // 4 numeric digits
  fullName: string;
}

export interface CashAndBankInput {
  name: string; // e.g., "Office Safe", "Meezan Bank"
  code: string; // e.g., "1010-01", "1020-01"
  balance: number; // Non-negative
}

export interface ActiveProjectInput {
  name: string; // e.g., "Wadaan Heights"
  prefix: string; // e.g., "WH" (uppercase, unique)
  masterBOQ?: number; // Planned budget / BOQ
  boq?: number;
  spentToDate: number; // Cumulative cut-off spent
}

export interface UnpaidPayableInput {
  vendorName: string; // e.g., "Ali Hardware"
  phone?: string;
  amountDue: number; // Unpaid balance
  projectId?: string;
}

export interface ActiveDealInput {
  customerName: string;
  phone: string;
  projectName?: string;
  dealType?: 'WADAAN_SALE' | 'CONSTRUCTION' | 'BROKERAGE';
  totalDealValue: number;
  amountReceivedPast: number;
}

export interface DatabaseConfigInput {
  databaseUrl: string;
  directUrl?: string;
}

export interface GoLivePayload {
  admin?: AdminSetupInput;
  cashAndBanks: CashAndBankInput[];
  activeProjects: ActiveProjectInput[];
  unpaidPayables: UnpaidPayableInput[];
  activeDeals: ActiveDealInput[];
  dbConfig?: DatabaseConfigInput;
}

export interface GoLiveResponse {
  success: boolean;
  message: string;
  masterRecoveryKey: string | null;
  goLiveDate: string;
}
