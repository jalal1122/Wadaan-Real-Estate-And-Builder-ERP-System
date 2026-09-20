# Screen 11: Personal Finance Ledger (Private & Off-Balance-Sheet)

## 1. System Role & Architecture Overview

The **Personal Finance Ledger** is a dedicated, secure module built for company principals (such as Arshad Sir and Zeeshan Sir) to track private, personal money movements entirely separate from the company's official corporate books.

### Key Architectural Tenet: Complete GL Isolation
- **No Double-Entry Bookkeeping Impact**: Transactions recorded in this module **never** post to the Chart of Accounts, Journal Entries, Trial Balance, Balance Sheet, or Profit & Loss.
- **Off-Balance-Sheet**: It functions as an independent, private ledger for recording informal loans given to friends, partners, family members, or business associates, as well as loans borrowed from them.
- **Bi-Directional**: Tracks both **GIVEN** (we lent money to them — they owe us) and **RECEIVED** (they lent money to us — we owe them).
- **Repayment Tracking**: Supports partial and full repayments with date tracking, payment method notes, and running balance calculation.

---

## 2. Database Schema & Data Models

Added to PostgreSQL via Prisma:

```prisma
enum PersonalTxDirection {
  GIVEN     // We gave them money (Asset / Receivable)
  RECEIVED  // They gave us money (Liability / Payable)
}

enum PersonalLoanStatus {
  OUTSTANDING
  PARTIAL
  SETTLED
}

model PersonalContact {
  id        String         @id @default(uuid())
  name      String         // e.g., "Arshad Sir", "Zeeshan Sir", "Tariq Mehmood"
  phone     String?
  relation  String?        // "Partner", "Friend", "Family", "Associate"
  notes     String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  loans     PersonalLoan[]
}

model PersonalLoan {
  id              String              @id @default(uuid())
  contactId       String
  direction       PersonalTxDirection
  principalAmount Decimal             @db.Decimal(15, 2)
  amountSettled   Decimal             @default(0.00) @db.Decimal(15, 2)
  status          PersonalLoanStatus  @default(OUTSTANDING)
  description     String              // "Emergency personal bridge advance"
  loanDate        DateTime
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  repayments      PersonalRepayment[]
  contact         PersonalContact     @relation(fields: [contactId], references: [id], onDelete: Cascade)
}

model PersonalRepayment {
  id         String       @id @default(uuid())
  loanId     String
  amount     Decimal      @db.Decimal(15, 2)
  repaidDate DateTime
  notes      String?      // "Cash returned at office", "Online transfer"
  createdAt  DateTime     @default(now())
  loan       PersonalLoan @relation(fields: [loanId], references: [id], onDelete: Cascade)
}
```

---

## 3. Mathematical & Business Rules

1. **Loan Status Transitions**:
   - `amountSettled == 0` &rarr; `OUTSTANDING`
   - `0 < amountSettled < principalAmount` &rarr; `PARTIAL`
   - `amountSettled >= principalAmount` &rarr; `SETTLED`
2. **Repayment Guard**:
   - A repayment cannot exceed the remaining balance: `amount <= (principalAmount - amountSettled)`. Any attempt to over-repay throws `400 REPAYMENT_EXCEEDS_OUTSTANDING`.
   - Cannot add a repayment to an already `SETTLED` loan (throws `400 LOAN_ALREADY_SETTLED`).
3. **Contact Net Balance**:
   - $\text{Outstanding Given} = \sum \text{Principal (GIVEN)} - \sum \text{Settled (GIVEN)}$
   - $\text{Outstanding Received} = \sum \text{Principal (RECEIVED)} - \sum \text{Settled (RECEIVED)}$
   - $\text{Net Position} = \text{Outstanding Given} - \text{Outstanding Received}$
   - If $\text{Net Position} > 0$: The contact owes us money (Green badge).
   - If $\text{Net Position} < 0$: We owe the contact money (Red badge).
   - If $\text{Net Position} == 0$: Fully settled (Slate badge).

---

## 4. Backend API Endpoints

All endpoints require authentication via `authGuard` (sliding HttpOnly JWT cookie).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/personal/contacts` | Fetches all registered contacts with KPI strip and aggregated balances. |
| `POST` | `/api/v1/personal/contacts` | Registers a new personal contact. |
| `GET` | `/api/v1/personal/contacts/:id` | Fetches contact detail with all loans and repayments history. |
| `PATCH` | `/api/v1/personal/contacts/:id` | Updates contact information. |
| `DELETE` | `/api/v1/personal/contacts/:id` | Deletes a contact and cascades all related loans/repayments. |
| `POST` | `/api/v1/personal/contacts/:id/loans` | Records a new loan (GIVEN or RECEIVED). |
| `DELETE` | `/api/v1/personal/loans/:loanId` | Deletes a loan entry and its repayments. |
| `POST` | `/api/v1/personal/loans/:loanId/repayments` | Records a repayment and advances loan status. |

---

## 5. Frontend Architecture & Design

### Pages
- **`/personal`**: Master Dashboard
  - KPI Strip: Total Lent (Given), Total Borrowed (Received), Net Personal Position, Total Accounts.
  - Search input with real-time filtering across name, phone, and relationship.
  - Category Filter tabs: `All`, `Receivable (They Owe Us)`, `Payable (We Owe)`, `Settled`.
  - Contact Cards grid with quick balance previews and direct link to `/personal/[id]`.
- **`/personal/[id]`**: Contact Detail & Ledger
  - Contact profile banner with quick contact metadata.
  - Financial Summary Card showing total lent, borrowed, and net position.
  - Loan ledger entries with direction badge, status badge, principal, remaining balance.
  - Expandable repayment history timeline for each loan.
  - `+ Repayment` button trigger for outstanding and partial loans.

### Modals
- `CreateContactModal.tsx`: Name, Phone, Relationship (`Partner`, `Friend`, `Family`, `Business Associate`, `Staff`, `Other`), Notes.
- `CreateLoanModal.tsx`: Direction toggle (Amber GIVEN vs Blue RECEIVED), Principal Amount (PKR), Transaction Date, Description.
- `AddRepaymentModal.tsx`: Shows current loan remaining balance, "Pay Full Remaining" shortcut, Repayment Amount, Repayment Date, Notes / Payment Channel.

---

## 6. Visual Language & Badges

| Element | Style Token | Meaning |
| :--- | :--- | :--- |
| **GIVEN Badge** | Amber background (`bg-amber-100 text-amber-800 border-amber-200`) | We gave money / They owe us |
| **RECEIVED Badge** | Blue background (`bg-blue-100 text-blue-800 border-blue-200`) | They gave us money / We owe them |
| **OUTSTANDING Status** | Red background (`bg-red-50 text-red-700 border-red-200`) | Zero repayment made |
| **PARTIAL Status** | Amber background (`bg-amber-50 text-amber-700 border-amber-200`) | Partial repayment received |
| **SETTLED Status** | Emerald background (`bg-emerald-50 text-emerald-700 border-emerald-200`) | Loan 100% cleared |
| **Sidebar Nav Item** | `UserRound` icon, label `"Personal Ledger"` | Direct navigation link |
