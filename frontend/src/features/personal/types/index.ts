export type PersonalTxDirection = 'GIVEN' | 'RECEIVED';
export type PersonalLoanStatus = 'OUTSTANDING' | 'PARTIAL' | 'SETTLED';

export interface PersonalContactSummary {
  id: string;
  name: string;
  phone?: string | null;
  relation?: string | null;
  notes?: string | null;
  createdAt: string;
  totalLoansCount: number;
  activeLoansCount: number;
  totalGiven: number | string;
  totalGivenSettled: number | string;
  outstandingGiven: number | string;
  totalReceived: number | string;
  totalReceivedSettled: number | string;
  outstandingReceived: number | string;
  netBalance: number | string;
}

export interface PersonalLedgerKPI {
  totalGivenOutstanding: number | string;
  totalReceivedOutstanding: number | string;
  netPosition: number | string;
  totalContacts: number;
  activeLoansTotal: number;
}

export interface PersonalContactsListResponse {
  kpi: PersonalLedgerKPI;
  contacts: PersonalContactSummary[];
}

export interface PersonalRepaymentItem {
  id: string;
  loanId: string;
  amount: number | string;
  repaidDate: string;
  notes?: string | null;
  createdAt: string;
}

export interface PersonalLoanItem {
  id: string;
  contactId: string;
  direction: PersonalTxDirection;
  principalAmount: number | string;
  amountSettled: number | string;
  outstandingAmount: number | string;
  status: PersonalLoanStatus;
  description: string;
  loanDate: string;
  createdAt: string;
  repayments: PersonalRepaymentItem[];
}

export interface PersonalContactDetailResponse {
  contact: {
    id: string;
    name: string;
    phone?: string | null;
    relation?: string | null;
    notes?: string | null;
    createdAt: string;
  };
  summary: {
    totalGiven: number | string;
    totalGivenSettled: number | string;
    outstandingGiven: number | string;
    totalReceived: number | string;
    totalReceivedSettled: number | string;
    outstandingReceived: number | string;
    netBalance: number | string;
  };
  loans: PersonalLoanItem[];
}

export interface CreateContactPayload {
  name: string;
  phone?: string;
  relation?: string;
  notes?: string;
}

export interface CreateLoanPayload {
  direction: PersonalTxDirection;
  principalAmount: number;
  description: string;
  loanDate: string;
}

export interface AddRepaymentPayload {
  amount: number;
  repaidDate: string;
  notes?: string;
}
