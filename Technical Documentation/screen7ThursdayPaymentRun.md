If Screen 5 is where you record the fact that you owe people money, Screen 7 is where you actually hand over the cash.
In real estate, you rarely pay every supplier in full immediately. You manage cash flow, holding back money until material quality is verified, or paying in rolling installments. This screen is designed to give you total control over who gets paid, how much, and exactly when.
1. What You See (The Vendor-Level Interface)
If you enter 50 different cement and steel bills this month, looking at a raw list of 50 bills is overwhelming. Screen 7 cleans this up instantly.
The Master List (Who you owe): Instead of showing individual bills, the dashboard groups everything by the Vendor. You see a clean, prioritized list:
Ali Hardware: Rs. 500,000 Total Owed
Khan Builders: Rs. 1,200,000 Total Owed
The Drill-Down: When you decide you want to pay Ali Hardware, you click on their name. The row smoothly expands to show you the exact 4 individual invoices that make up that Rs. 500,000 total.
2. The "Khaata" Engine (Selective Invoices & Partial Payments) [v3.1.0]
Because you manage cash flow strictly, you might owe Khan Builders Rs. 1,200,000 across 4 invoices, but you only want to pay specific invoices or release a partial amount.

How it Works:
- **Granular Invoice Selection**: In the Unpaid Bill Queue, each invoice has a dedicated selection checkbox. You can check individual invoices to settle specific bills, click "Select All Invoices" to clear the entire queue, or leave them unchecked for standard FIFO cascade.
- **Custom Partial Payment per Invoice**: For each selected invoice, an editable "Pay This Run (PKR)" input appears, defaulting to the full pending debt on that invoice with a 1-click "Full" button. You can type any partial amount up to the bill's pending balance.
- **Row-Level Overpay Guard**: The system prevents typing an amount higher than the bill's pending balance (highlighted in red with inline warning).
- **Auto-Calculated Total Payment**: The payment amount dynamically sums all checked invoices in real-time.
- **Automatic FIFO Waterfall Option**: If no specific invoices are checked, you can still type a global amount and the system will automatically clear the oldest invoices first.

3. The Payment Mode & Reference Lock (Where is the money coming from?)
Before you can finalize the payment, the system must know exactly which Wadaan pocket the money is leaving from, so your bank balances stay accurate.
The Dropdown: You must select the source account (e.g., "Office Safe" or "Meezan Bank").
The Mandatory Audit Trail:
- If you select "Meezan Bank" (or any bank account), a method selector appears:
  1. **Cheque Payment**: Asks for `Cheque Number` (Mandatory). This cheque reference is stored with the payment and routed to the Waiting Room audit workflow for physical clearance or bouncing verification.
  2. **Online Transfer**: Asks for `Transaction ID / Wire Reference` (Mandatory). This transfer reference (e.g., FT or RRN) is stored directly on the payment record for immediate settlement without requiring clearance room audit.
- The system physically locks the "Execute Payment & Print Receipt" button until the required reference is provided.
- If you select Cash / Safe, direct settlement occurs with no reference required.

4. The 1-Click Payment Voucher & Receipt (Dev & Electron Parity) [v3.1.0]
When handing a contractor a payment or logging an internal disbursement, you must have a legal, signed receipt for your office files and the vendor's records.
The Feature: The precise second you click "Execute Payment & Print Receipt", the system clears the debt, synchronizes the General Ledger, and triggers printing.
The Unified Architecture:
- **Production (Electron)**: Communicates via IPC bridge `printPaymentReceipt` (or `printVoucher`) to open the native Windows print dialog with an A4 dual-copy layout.
- **Development (Web Browser)**: Generates the exact same pixel-perfect A4 dual-copy HTML document in a dedicated hidden printable frame, guaranteeing 100% visual and layout parity between dev and production without printing browser chrome or navigation bars.
The Output: An A4 page perforated down the middle:
- **The Top Half (Vendor / Payee Receipt - Original)**: Contains the voucher number, date, vendor's name, payment reference (Cheque # or Online Transaction ID), settled invoices table (applied amounts and remaining balances), and a distinct "RECEIVED WITH THANKS" receiver acknowledgment and stamp box. The payee takes this copy.
- **The Bottom Half (Wadaan Institutional Copy - Office Record)**: Contains an exact institutional copy with settled bills audit breakdown and 4 official signature lines: Prepared By (Accounts), Audited / Verified By, Approved By (CFO/Director), and Payee Signature. Wadaan files this in accounting.

5. Business Rules & Guardrails
When you click "Execute Payment & Print Receipt", the system automatically:
1. Reduces the debt in the Vendor's Khaata (updating specific invoices or applying FIFO waterfall).
2. Debits Accounts Payable (2000) and credits the selected disbursement account (Safe or Bank).
3. Posts zero-sum double-entry journal entry to General Ledger.
4. Generates the legal dual-copy perforated A4 receipt for both dev and production.
5. Blocks overpayments exceeding outstanding vendor debt or exceeding individual bill pending balances.

This concludes Module 2: Outflow Engine (Enhanced v3.1.0).
