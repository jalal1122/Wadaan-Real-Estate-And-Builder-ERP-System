1. The Global Precision Mandate (Floating-Point Guardrail)
Standard JavaScript uses IEEE 754 floating-point numbers. Calculating 100.10 + 200.20 in raw JS yields 300.29999999999995. In a double-entry system, a mismatch of 0.00000000000005 will crash the database transaction.

The Rule: Every financial value entering the backend must instantly be wrapped in the decimal.js library.

Addition: new Decimal(a).plus(b)


Subtraction: new Decimal(a).minus(b)


Multiplication: new Decimal(a).times(b)


Division: new Decimal(a).dividedBy(b)


Zero Check: decimalValue.isZero()


2. Algorithm: Double-Entry Zero-Sum Proof
This algorithm runs right before any JournalEntry is inserted into PostgreSQL, regardless of whether it was generated manually (Screen 2) or automatically (Screen 5, 7, 9).

Goal: Ensure $\sum \text{Debits} - \sum \text{Credits} = 0.00$.

function validateZeroSum(lines: JournalLine[]): boolean {
  // Rule 1: A journal entry must have at least 2 lines (one debit, one credit)
  if (lines.length < 2) throw new AppError('Minimum 2 lines required');

  let runningDifference = new Decimal(0);

  for (const line of lines) {
    const debit = new Decimal(line.debitAmount);
    const credit = new Decimal(line.creditAmount);
    
    // Rule 2: A single line cannot have both a debit and a credit
    if (!debit.isZero() && !credit.isZero()) {
      throw new AppError('Line cannot contain both debit and credit');
    }
    
    // Math: Debits increase the difference, Credits decrease it
    runningDifference = runningDifference.plus(debit).minus(credit);
  }

  // Rule 3: The net difference must be exactly 0.00
  if (!runningDifference.isZero()) {
    throw new AppError(`Imbalance detected: ${runningDifference.toFixed(2)}`);
  }

  return true;
}


3. Algorithm: FIFO Vendor Payment Waterfall (Screen 7)
When you pay a vendor Rs. 100,000, the system must cascade that money across chronological debts. Wadaan ERP does not allow floating credits; you cannot pay more than you owe.

Goal: Distribute amountPaid across UnpaidBills chronologically.

function executeFIFOWaterfall(amountPaid: number, unpaidBills: ExpenseBill[]) {
  // Step 1: Prevent Overpayment
  const totalDebt = unpaidBills.reduce((sum, bill) => sum.plus(bill.pendingAmount), new Decimal(0));
  let remainingFunds = new Decimal(amountPaid);

  if (remainingFunds.greaterThan(totalDebt)) {
    throw new AppError('Overpayment forbidden. Exact clearing required.');
  }

  const settledBills = [];

  // Step 2: The Waterfall Loop
  for (const bill of unpaidBills) {
    if (remainingFunds.isZero()) break; // Exit loop if funds exhausted

    const pending = new Decimal(bill.pendingAmount);

    if (remainingFunds.greaterThanOrEqualTo(pending)) {
      // Scenario A: Full Settlement
      remainingFunds = remainingFunds.minus(pending);
      settledBills.push({ billId: bill.id, settledAmount: pending, newStatus: 'PAID' });
    } else {
      // Scenario B: Partial Settlement
      settledBills.push({ billId: bill.id, settledAmount: remainingFunds, newStatus: 'PARTIAL' });
      remainingFunds = new Decimal(0);
    }
  }

  return settledBills; // Passed to Prisma to execute DB updates
}


4. Algorithm: Brokerage Escrow & Revenue Splitting (Screen 8)
When brokering a file, Wadaan handles third-party money. This engine prevents you from recording a client's Rs. 20,000,000 plot purchase as Wadaan's net income.

Goal: Split total deal value into Wadaan Commission (Revenue) and Seller Liability (Escrow).

function splitBrokerageDeal(totalValue: number, commissionPercentage: number) {
  const value = new Decimal(totalValue);
  const commRate = new Decimal(commissionPercentage).dividedBy(100);
  
  // Wadaan's actual revenue
  const wadaanRevenue = value.times(commRate);
  
  // Money belonging to the original seller (Liability)
  const escrowLiability = value.minus(wadaanRevenue);
  
  return {
    wadaanRevenue: wadaanRevenue.toFixed(2),
    escrowLiability: escrowLiability.toFixed(2)
  };
}


Journal Consequence: When the buyer's cheque clears (Screen 9), the backend debits Meezan Bank for the full totalValue, credits Wadaan Commission Revenue for wadaanRevenue, and credits Client Escrow Payable for escrowLiability.


5. Algorithm: Dynamic Fiscal Year Boundaries
Because the Pakistani financial year resets on July 1st, the P&L (Screen 10) must dynamically zero out Revenue and Expense calculations on that exact date, without destroying historical data.

Goal: Find the exact startDate for the current active financial year based on today's date.

function getCurrentFiscalBoundary(): { startDate: string, endDate: string } {
  const today = new Date();
  const currentMonth = today.getMonth() + 1; // JS months are 0-11
  const currentYear = today.getFullYear();

  let fiscalStartYear, fiscalEndYear;

  if (currentMonth >= 7) {
    // We are between July and December (e.g., Sept 2026)
    fiscalStartYear = currentYear;
    fiscalEndYear = currentYear + 1;
  } else {
    // We are between January and June (e.g., Feb 2026)
    fiscalStartYear = currentYear - 1;
    fiscalEndYear = currentYear;
  }

  return {
    startDate: `${fiscalStartYear}-07-01T00:00:00.000Z`,
    endDate: `${fiscalEndYear}-06-30T23:59:59.999Z`
  };
}


6. Algorithm: Progressive Brute-Force Math
This mathematical formula ensures aggressive brute-force attacks are mathematically impossible to complete, while allowing a forgetful human operator back in quickly.

Goal: Calculate the lockout expiration timestamp based on the current tier.

function calculateLockout(currentTier: number, failedAttempts: number): number | null { // Threshold limits based on tier const limit = currentTier === 0 ? 5 : 4; if (failedAttempts >= limit) { const baseTimeSeconds = 30; // Lock Duration = 30 * (2 ^ Tier). // Tier 0: 30s | Tier 1: 60s | Tier 2: 120s | Tier 3: 240s const lockDuration = baseTimeSeconds * Math.pow(2, currentTier); return Date.now() + (lockDuration * 1000); } return null; // Do not lock yet } 

7. Algorithm: WIP Capitalization Routing
Determines if an expense destroys current net income or parks value on the balance sheet.

Rule Set:

IF projectId != NULL: Route to WIP Asset (Inventory). (Increases Total Assets. Does not reduce Net Income).


IF projectId == NULL: Route to General Office Overhead. (Reduces Net Income on Screen 10 immediately).


IF Project Status changes to COMPLETED: System prevents further tags to this ID. You can no longer add WIP value; the asset is sealed.
