/**
 * Unified Receipt & Voucher Printing Utility
 * Guarantees identical, professional A4 dual-copy PDF printing
 * across both Development (Web Browser) and Production (Electron) environments.
 */

export interface SettledBillReceiptItem {
  invoiceNumber?: string;
  amountApplied?: number | string;
  previousPending?: number | string;
  newPending?: number | string;
  status?: string;
}

export interface PaymentReceiptData {
  id?: string;
  vendorId?: string;
  vendorName?: string;
  vendor?: {
    vendorName?: string;
  };
  amountPaid?: number | string;
  chequeRef?: string | null;
  transactionId?: string | null;
  paymentDate?: string;
  settledBills?: SettledBillReceiptItem[];
}

export interface DirectPaymentReceiptLineItem {
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  lineTotal?: number | string;
}

export interface DirectPaymentReceiptData {
  billId?: string;
  id?: string;
  invoiceNumber: string;
  billDate?: string;
  vendorName?: string;
  vendor?: {
    vendorName?: string;
  };
  projectName?: string | null;
  project?: {
    projectName?: string;
  } | null;
  sourceAccountName?: string;
  sourceAccount?: {
    accountName?: string;
  } | null;
  transactionRef?: string | null;
  grandTotal?: number | string;
  lineItems?: DirectPaymentReceiptLineItem[];
}

export interface InflowReceiptData {
  id?: string;
  customerName?: string;
  customerPhone?: string;
  customer?: {
    fullName?: string;
    phone?: string;
  };
  amount?: number | string;
  totalAmount?: number | string;
  paymentMethod?: 'CASH' | 'CHEQUE' | 'ONLINE' | string;
  bankRefNumber?: string | null;
  referenceNo?: string | null;
  receiptDate?: string;
  invoices?: Array<{
    description?: string;
    amount?: number | string;
  }>;
}

/**
 * Generates the professional A4 dual-copy HTML for Payment Vouchers / Receipts (Screen 7).
 */
export function generatePaymentReceiptHtml(paymentData: PaymentReceiptData): string {
  const vendorName = paymentData?.vendor?.vendorName || paymentData?.vendorName || 'Valued Supplier';
  const amount = paymentData?.amountPaid != null
    ? Number(paymentData.amountPaid).toLocaleString('en-PK', { maximumFractionDigits: 0 })
    : '0';

  let paymentRefHtml = '';
  if (paymentData?.transactionId) {
    paymentRefHtml = `<span style="color: #1d4ed8; font-weight: 600;">Online Transfer</span> &bull; <span style="font-family: monospace;">Ref: ${paymentData.transactionId}</span> <span style="font-size: 10px; color: #16a34a; background: #dcfce7; padding: 1px 5px; border-radius: 4px;">Realized</span>`;
  } else if (paymentData?.chequeRef) {
    paymentRefHtml = `<span style="color: #b45309; font-weight: 600;">Bank Cheque</span> &bull; <span style="font-family: monospace;">No: ${paymentData.chequeRef}</span> <span style="font-size: 10px; color: #b45309; background: #fef3c7; padding: 1px 5px; border-radius: 4px;">Pending Clearance</span>`;
  } else {
    paymentRefHtml = `<span style="color: #059669; font-weight: 600;">Cash Payment</span> &bull; <span>Direct Over-the-Counter</span>`;
  }

  const voucherId = paymentData?.id
    ? `CPV-${String(paymentData.id).slice(-8).toUpperCase()}`
    : `CPV-${Date.now().toString().slice(-8)}`;

  const dateStr = paymentData?.paymentDate
    ? new Date(paymentData.paymentDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const settledBills = Array.isArray(paymentData?.settledBills) ? paymentData.settledBills : [];

  const renderBillsTable = () => {
    if (settledBills.length === 0) {
      return `
        <div style="font-size: 11px; color: #64748b; padding: 6px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
          Settlement applied to selected supplier invoices. Zero-sum balancing entries posted to General Ledger.
        </div>
      `;
    }

    const rows = settledBills.slice(0, 6).map((b) => {
      const invNum = b.invoiceNumber || 'INV-Selected';
      const applied = Number(b.amountApplied || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
      const pending = Number(b.newPending || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
      const statusBadge = b.status === 'PAID'
        ? '<span style="color: #16a34a; font-weight: bold;">PAID</span>'
        : '<span style="color: #d97706; font-weight: bold;">PARTIAL</span>';
      return `
        <tr>
          <td style="padding: 3px 6px; font-family: monospace;">${invNum}</td>
          <td style="padding: 3px 6px; text-align: right; font-family: monospace;">PKR ${applied}</td>
          <td style="padding: 3px 6px; text-align: right; font-family: monospace;">PKR ${pending}</td>
          <td style="padding: 3px 6px; text-align: center; font-size: 10px;">${statusBadge}</td>
        </tr>
      `;
    }).join('');

    const extraBillsCount = settledBills.length - 6;
    const extraRow = extraBillsCount > 0
      ? `<tr><td colspan="4" style="padding: 2px 6px; font-size: 10px; color: #64748b; text-align: center;">+ ${extraBillsCount} additional bill(s) settled</td></tr>`
      : '';

    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 6px 0;">
        <thead>
          <tr style="background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; color: #475569; font-size: 10px; text-transform: uppercase;">
            <th style="padding: 3px 6px; text-align: left;">Invoice #</th>
            <th style="padding: 3px 6px; text-align: right;">Applied</th>
            <th style="padding: 3px 6px; text-align: right;">Remaining Due</th>
            <th style="padding: 3px 6px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody style="border-bottom: 1px solid #e2e8f0;">
          ${rows}
          ${extraRow}
        </tbody>
      </table>
    `;
  };

  const renderVendorCopy = () => `
    <div class="voucher-copy">
      <div class="header">
        <div>
          <h2>Wadaan Real Estate &amp; Builders</h2>
          <p class="subtitle">Commercial Division &bull; <strong style="color: #059669;">Vendor / Payee Receipt (Original)</strong></p>
        </div>
        <div class="header-right">
          <h1>Payment Voucher</h1>
          <p class="voucher-id">${voucherId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Payee / Vendor:</span> <strong>${vendorName}</strong></div>
        <div class="meta-item"><span class="meta-label">Payment Date:</span> ${dateStr}</div>
        <div class="meta-item" style="grid-column: span 2;"><span class="meta-label">Payment Ref:</span> ${paymentRefHtml}</div>
        <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
          <span class="meta-label">Net Amount Paid:</span>
          <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">PKR ${amount}</strong>
        </div>
      </div>

      ${renderBillsTable()}

      <div class="stamp-box">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
          Received With Thanks
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
          Received from Wadaan Real Estate &amp; Builders the sum of <strong>PKR ${amount}</strong> in full/partial settlement of above invoices.
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 10.5px; color: #334155;">
          <span>Receiver Name: ____________________________</span>
          <span>Signature &amp; Stamp: ____________________________</span>
        </div>
      </div>
    </div>
  `;

  const renderWadaanCopy = () => `
    <div class="voucher-copy">
      <div class="header">
        <div>
          <h2>Wadaan Real Estate &amp; Builders</h2>
          <p class="subtitle">Institutional Financial Management &bull; <strong style="color: #0f172a;">Wadaan Office Copy</strong></p>
        </div>
        <div class="header-right">
          <h1>Payment Voucher</h1>
          <p class="voucher-id">${voucherId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Payee / Vendor:</span> <strong>${vendorName}</strong></div>
        <div class="meta-item"><span class="meta-label">Payment Date:</span> ${dateStr}</div>
        <div class="meta-item" style="grid-column: span 2;"><span class="meta-label">Payment Ref:</span> ${paymentRefHtml}</div>
        <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
          <span class="meta-label">Total Debited:</span>
          <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">PKR ${amount}</strong>
        </div>
      </div>

      ${renderBillsTable()}

      <div class="signatures">
        <div class="sig-line">Prepared By (Accounts)</div>
        <div class="sig-line">Audited / Verified</div>
        <div class="sig-line">Approved By (CFO/Dir)</div>
        <div class="sig-line">Payee Signature</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Payment Voucher - ${voucherId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      display: flex;
      flex-direction: column;
      height: 275mm;
      justify-content: space-between;
    }
    .voucher-copy {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 18px;
      box-sizing: border-box;
      height: 130mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
    }
    .header h2 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
      letter-spacing: -0.2px;
    }
    .subtitle {
      margin: 2px 0 0 0;
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-right {
      text-align: right;
    }
    .header-right h1 {
      margin: 0;
      font-size: 14px;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .voucher-id {
      margin: 1px 0 0 0;
      font-family: monospace;
      font-size: 11px;
      font-weight: bold;
      color: #059669;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      margin: 8px 0;
      font-size: 11.5px;
    }
    .meta-label {
      color: #64748b;
      display: inline-block;
      width: 105px;
    }
    .stamp-box {
      border: 1.5px dashed #94a3b8;
      border-radius: 6px;
      padding: 8px 12px;
      background: #fafafa;
      margin-top: auto;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: auto;
      padding-top: 10px;
    }
    .sig-line {
      flex: 1;
      border-top: 1px solid #0f172a;
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      padding-top: 3px;
      color: #334155;
    }
    .perforation {
      border-top: 1px dashed #94a3b8;
      position: relative;
      text-align: center;
      margin: 3mm 0;
    }
    .perforation-text {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 10px;
      font-size: 8.5px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    ${renderVendorCopy()}
    <div class="perforation">
      <span class="perforation-text">&mdash;&mdash; Cut or Tear Along Perforation &mdash;&mdash;</span>
    </div>
    ${renderWadaanCopy()}
  </div>
</body>
</html>`;
}

/**
 * Generates the professional A4 dual-copy HTML for Direct Payment Expense Receipts (Screen 5).
 */
export function generateDirectPaymentReceiptHtml(data: DirectPaymentReceiptData): string {
  const vendorName = data.vendor?.vendorName || data.vendorName || 'Valued Supplier / Payee';
  const grandTotalNum = Number(data.grandTotal || 0);
  const amountStr = grandTotalNum.toLocaleString('en-PK', { maximumFractionDigits: 0 });

  const rawId = data.billId || data.id || '';
  const docId = rawId ? `DPR-${rawId.slice(-8).toUpperCase()}` : `DPR-${Date.now().toString().slice(-8)}`;

  const dateStr = data.billDate
    ? new Date(data.billDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });

  const projectName = data.project?.projectName || data.projectName || 'General Office Overhead';
  const accountName = data.sourceAccount?.accountName || data.sourceAccountName || 'Cash / Bank Account';

  let paymentRefHtml = '';
  if (data.transactionRef) {
    paymentRefHtml = `<span style="color: #1d4ed8; font-weight: 600;">Bank / Online Transfer</span> &bull; <span style="font-family: monospace;">Ref: ${data.transactionRef}</span> <span style="font-size: 10px; color: #16a34a; background: #dcfce7; padding: 1px 5px; border-radius: 4px;">Realized</span>`;
  } else {
    paymentRefHtml = `<span style="color: #059669; font-weight: 600;">Direct Payment</span> &bull; <span>${accountName}</span>`;
  }

  const lineItems = Array.isArray(data.lineItems) ? data.lineItems : [];

  const renderLineItemsTable = () => {
    if (lineItems.length === 0) {
      return `
        <div style="font-size: 11px; color: #64748b; padding: 6px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0;">
          Direct cash expense settlement for invoice <strong>${data.invoiceNumber}</strong>. Zero-sum balancing entries posted to General Ledger.
        </div>
      `;
    }

    const rows = lineItems.slice(0, 5).map((item) => {
      const desc = item.description || 'Expense Item';
      const qty = Number(item.quantity || 1);
      const unitPrice = Number(item.unitPrice || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
      const total = Number(item.lineTotal || (qty * Number(item.unitPrice || 0))).toLocaleString('en-PK', { maximumFractionDigits: 0 });
      return `
        <tr>
          <td style="padding: 3px 6px;">${desc}</td>
          <td style="padding: 3px 6px; text-align: center; font-family: monospace;">${qty}</td>
          <td style="padding: 3px 6px; text-align: right; font-family: monospace;">PKR ${unitPrice}</td>
          <td style="padding: 3px 6px; text-align: right; font-family: monospace;">PKR ${total}</td>
        </tr>
      `;
    }).join('');

    const extraCount = lineItems.length - 5;
    const extraRow = extraCount > 0
      ? `<tr><td colspan="4" style="padding: 2px 6px; font-size: 10px; color: #64748b; text-align: center;">+ ${extraCount} additional line item(s)</td></tr>`
      : '';

    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 10.5px; margin: 6px 0;">
        <thead>
          <tr style="background: #f8fafc; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; color: #475569; font-size: 10px; text-transform: uppercase;">
            <th style="padding: 3px 6px; text-align: left;">Item Description</th>
            <th style="padding: 3px 6px; text-align: center;">Qty</th>
            <th style="padding: 3px 6px; text-align: right;">Unit Price</th>
            <th style="padding: 3px 6px; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody style="border-bottom: 1px solid #e2e8f0;">
          ${rows}
          ${extraRow}
        </tbody>
      </table>
    `;
  };

  const renderVendorCopy = () => `
    <div class="voucher-copy">
      <div class="header">
        <div>
          <h2>Wadaan Real Estate &amp; Builders</h2>
          <p class="subtitle">Direct Expense Payment &bull; <strong style="color: #059669;">Payee / Vendor Copy (Original)</strong></p>
        </div>
        <div class="header-right">
          <h1>Expense Receipt</h1>
          <p class="voucher-id">${docId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Payee / Vendor:</span> <strong>${vendorName}</strong></div>
        <div class="meta-item"><span class="meta-label">Date:</span> ${dateStr}</div>
        <div class="meta-item"><span class="meta-label">Invoice / Bill #:</span> <strong style="font-family: monospace;">${data.invoiceNumber}</strong></div>
        <div class="meta-item"><span class="meta-label">Cost Centre:</span> <span>${projectName}</span></div>
        <div class="meta-item" style="grid-column: span 2;"><span class="meta-label">Payment Channel:</span> ${paymentRefHtml}</div>
        <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
          <span class="meta-label">Grand Total Paid:</span>
          <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">PKR ${amountStr}</strong>
        </div>
      </div>

      ${renderLineItemsTable()}

      <div class="stamp-box">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
          Received With Thanks
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
          Received full cash / transfer payment of <strong>PKR ${amountStr}</strong> for Invoice #${data.invoiceNumber}.
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 10.5px; color: #334155;">
          <span>Receiver Name: ____________________________</span>
          <span>Signature &amp; Stamp: ____________________________</span>
        </div>
      </div>
    </div>
  `;

  const renderWadaanCopy = () => `
    <div class="voucher-copy">
      <div class="header">
        <div>
          <h2>Wadaan Real Estate &amp; Builders</h2>
          <p class="subtitle">Institutional Financial Management &bull; <strong style="color: #0f172a;">Wadaan Accounts Copy</strong></p>
        </div>
        <div class="header-right">
          <h1>Expense Receipt</h1>
          <p class="voucher-id">${docId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Payee / Vendor:</span> <strong>${vendorName}</strong></div>
        <div class="meta-item"><span class="meta-label">Date:</span> ${dateStr}</div>
        <div class="meta-item"><span class="meta-label">Invoice / Bill #:</span> <strong style="font-family: monospace;">${data.invoiceNumber}</strong></div>
        <div class="meta-item"><span class="meta-label">Cost Centre:</span> <span>${projectName}</span></div>
        <div class="meta-item" style="grid-column: span 2;"><span class="meta-label">Disbursement:</span> ${paymentRefHtml}</div>
        <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
          <span class="meta-label">Amount Debited:</span>
          <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">PKR ${amountStr}</strong>
        </div>
      </div>

      ${renderLineItemsTable()}

      <div class="signatures">
        <div class="sig-line">Prepared By (Accounts)</div>
        <div class="sig-line">Audited / Verified</div>
        <div class="sig-line">Approved By (CFO/Dir)</div>
        <div class="sig-line">Payee Signature</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Direct Payment Receipt - ${docId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      display: flex;
      flex-direction: column;
      height: 275mm;
      justify-content: space-between;
    }
    .voucher-copy {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 18px;
      box-sizing: border-box;
      height: 130mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
    }
    .header h2 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
      letter-spacing: -0.2px;
    }
    .subtitle {
      margin: 2px 0 0 0;
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-right {
      text-align: right;
    }
    .header-right h1 {
      margin: 0;
      font-size: 14px;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .voucher-id {
      margin: 1px 0 0 0;
      font-family: monospace;
      font-size: 11px;
      font-weight: bold;
      color: #059669;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      margin: 8px 0;
      font-size: 11.5px;
    }
    .meta-label {
      color: #64748b;
      display: inline-block;
      width: 105px;
    }
    .stamp-box {
      border: 1.5px dashed #94a3b8;
      border-radius: 6px;
      padding: 8px 12px;
      background: #fafafa;
      margin-top: auto;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: auto;
      padding-top: 10px;
    }
    .sig-line {
      flex: 1;
      border-top: 1px solid #0f172a;
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      padding-top: 3px;
      color: #334155;
    }
    .perforation {
      border-top: 1px dashed #94a3b8;
      position: relative;
      text-align: center;
      margin: 3mm 0;
    }
    .perforation-text {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 10px;
      font-size: 8.5px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    ${renderVendorCopy()}
    <div class="perforation">
      <span class="perforation-text">&mdash;&mdash; Cut or Tear Along Perforation &mdash;&mdash;</span>
    </div>
    ${renderWadaanCopy()}
  </div>
</body>
</html>`;
}

/**
 * Generates the professional A4 dual-copy HTML for Inflow Receipts (Screen 9).
 */
export function generateInflowReceiptHtml(receiptData: InflowReceiptData): string {
  const rawId = receiptData.id || '';
  const receiptId = rawId ? `REC-${rawId.slice(-8).toUpperCase()}` : `REC-${Date.now().toString().slice(-8)}`;
  const customerName = receiptData.customer?.fullName || receiptData.customerName || 'Walk-in Client';
  const customerPhone = receiptData.customer?.phone || receiptData.customerPhone || '—';
  const dateStr = receiptData.receiptDate
    ? new Date(receiptData.receiptDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
  const amountNum = Number(receiptData.amount || receiptData.totalAmount || 0);
  const amount = isNaN(amountNum) ? '0' : amountNum.toLocaleString('en-PK', { maximumFractionDigits: 0 });
  const paymentMethod = receiptData.paymentMethod || 'CASH';
  const refNumber = receiptData.bankRefNumber || receiptData.referenceNo || '—';
  const invoices = receiptData.invoices || [];

  const paymentRefHtml =
    paymentMethod === 'CHEQUE'
      ? `<strong style="color: #d97706;">Cheque (Escrow)</strong> &bull; Leaf / Ref: <strong>${refNumber}</strong>`
      : paymentMethod === 'ONLINE'
      ? `<strong style="color: #2563eb;">Online Transfer</strong> &bull; UTR / Trx: <strong>${refNumber}</strong>`
      : `<strong style="color: #059669;">Cash In Hand</strong> &bull; Direct Safe Inflow`;

  const renderInvoicesList = () => {
    if (!invoices || invoices.length === 0) {
      return `
        <div style="padding: 8px; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; font-size: 10px; color: #475569; margin: 8px 0;">
          <strong>Allocation:</strong> Credited to Customer Advance Mobilization Escrow Wallet (Liability 2100).
        </div>
      `;
    }

    const rows = invoices
      .map((inv) => {
        const invAmt = Number(inv.amount || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 });
        return `
        <tr>
          <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-size: 10px;">${inv.description || 'Milestone Installment'}</td>
          <td style="padding: 3px 6px; border: 1px solid #e2e8f0; font-size: 10px; text-align: right; font-family: monospace;">PKR ${invAmt}</td>
        </tr>
      `;
      })
      .join('');

    return `
      <table style="width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 10px;">
        <thead>
          <tr style="background: #f1f5f9; color: #475569;">
            <th style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: left;">Allocated Milestone / Invoice</th>
            <th style="padding: 3px 6px; border: 1px solid #cbd5e1; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  };

  const renderCustomerCopy = () => `
    <div class="voucher-copy">
      <div class="header">
        <div>
          <h2>Wadaan Real Estate &amp; Builders</h2>
          <p class="subtitle">Official Financial Receipt &bull; <strong style="color: #059669;">Customer Copy (Original)</strong></p>
        </div>
        <div class="header-right">
          <h1>Inflow Receipt</h1>
          <p class="voucher-id">${receiptId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Customer / Client:</span> <strong>${customerName}</strong></div>
        <div class="meta-item"><span class="meta-label">Receipt Date:</span> ${dateStr}</div>
        <div class="meta-item"><span class="meta-label">Phone Contact:</span> <span>${customerPhone}</span></div>
        <div class="meta-item"><span class="meta-label">Payment Channel:</span> <span>${paymentRefHtml}</span></div>
        <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
          <span class="meta-label">Amount Received:</span>
          <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">PKR ${amount}</strong>
        </div>
      </div>

      ${renderInvoicesList()}

      <div class="stamp-box">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
          Official Acknowledgement
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
          Received with thanks from <strong>${customerName}</strong> the sum of <strong>PKR ${amount}</strong>.
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 10.5px; color: #334155;">
          <span>Officer: ____________________________</span>
          <span>Cashier / Authorized Signature: ____________________________</span>
        </div>
      </div>
    </div>
  `;

  const renderWadaanCopy = () => `
    <div class="voucher-copy">
      <div class="header">
        <div>
          <h2>Wadaan Real Estate &amp; Builders</h2>
          <p class="subtitle">Institutional Financial Management &bull; <strong style="color: #0f172a;">Wadaan Office Copy</strong></p>
        </div>
        <div class="header-right">
          <h1>Inflow Receipt</h1>
          <p class="voucher-id">${receiptId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Customer / Client:</span> <strong>${customerName}</strong></div>
        <div class="meta-item"><span class="meta-label">Receipt Date:</span> ${dateStr}</div>
        <div class="meta-item"><span class="meta-label">Phone Contact:</span> <span>${customerPhone}</span></div>
        <div class="meta-item"><span class="meta-label">Payment Channel:</span> <span>${paymentRefHtml}</span></div>
        <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
          <span class="meta-label">Credited Total:</span>
          <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">PKR ${amount}</strong>
        </div>
      </div>

      ${renderInvoicesList()}

      <div class="signatures">
        <div class="sig-line">Cashier / Receiving Officer</div>
        <div class="sig-line">Accountant Verification</div>
        <div class="sig-line">Director Approval</div>
        <div class="sig-line">Client Stamp / Initials</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Inflow Receipt - ${receiptId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page-container {
      display: flex;
      flex-direction: column;
      height: 275mm;
      justify-content: space-between;
    }
    .voucher-copy {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 12px 18px;
      box-sizing: border-box;
      height: 130mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 6px;
    }
    .header h2 {
      margin: 0;
      font-size: 16px;
      color: #0f172a;
      letter-spacing: -0.2px;
    }
    .subtitle {
      margin: 2px 0 0 0;
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-right {
      text-align: right;
    }
    .header-right h1 {
      margin: 0;
      font-size: 14px;
      text-transform: uppercase;
      color: #0f172a;
      letter-spacing: 0.5px;
    }
    .voucher-id {
      margin: 1px 0 0 0;
      font-family: monospace;
      font-size: 11px;
      font-weight: bold;
      color: #059669;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 14px;
      margin: 8px 0;
      font-size: 11.5px;
    }
    .meta-label {
      color: #64748b;
      display: inline-block;
      width: 105px;
    }
    .stamp-box {
      border: 1.5px dashed #94a3b8;
      border-radius: 6px;
      padding: 8px 12px;
      background: #fafafa;
      margin-top: auto;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      margin-top: auto;
      padding-top: 10px;
    }
    .sig-line {
      flex: 1;
      border-top: 1px solid #0f172a;
      text-align: center;
      font-size: 10px;
      font-weight: 600;
      padding-top: 3px;
      color: #334155;
    }
    .perforation {
      border-top: 1px dashed #94a3b8;
      position: relative;
      text-align: center;
      margin: 3mm 0;
    }
    .perforation-text {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 10px;
      font-size: 8.5px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    ${renderCustomerCopy()}
    <div class="perforation">
      <span class="perforation-text">&mdash;&mdash; Cut or Tear Along Perforation &mdash;&mdash;</span>
    </div>
    ${renderWadaanCopy()}
  </div>
</body>
</html>`;
}

/**
 * Helper to download HTML content as a saved file.
 */
export function downloadHtmlFile(html: string, filename: string): void {
  if (typeof window === 'undefined') return;
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('Failed to download document:', err);
  }
}

/**
 * Universal print-then-download runner for browser environments.
 * Opens the print dialog first via a dedicated hidden iframe.
 * When print is finished or cancelled (via `onafterprint`), or fallback timeout,
 * it triggers the download of the HTML file.
 */
export function printThenDownloadHtml(html: string, filename: string): void {
  if (typeof window === 'undefined') return;

  try {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      let downloaded = false;
      const triggerDownload = () => {
        if (!downloaded) {
          downloaded = true;
          downloadHtmlFile(html, filename);
        }
      };

      setTimeout(() => {
        try {
          if (iframe.contentWindow) {
            iframe.contentWindow.addEventListener('afterprint', () => {
              triggerDownload();
            });
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          }
        } catch (e) {
          console.error('Error invoking iframe print:', e);
          triggerDownload();
        } finally {
          // Safety fallback timeout to trigger download if afterprint was not caught
          setTimeout(() => {
            triggerDownload();
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1500);
        }
      }, 300);
    }
  } catch (err) {
    console.error('Fallback print execution failed:', err);
    downloadHtmlFile(html, filename);
    window.print();
  }
}

/**
 * Universal print handler that triggers identical A4 print dialog
 * in both Electron (production) and Web Browser (development).
 * Browser path triggers print first, then downloads the file.
 */
export function printPaymentReceiptDocument(paymentData: PaymentReceiptData): void {
  if (typeof window === 'undefined') return;

  // 1. Electron Desktop IPC check
  const electron = (window as any).electronAPI;
  if (electron && typeof electron.printPaymentReceipt === 'function') {
    electron.printPaymentReceipt(paymentData);
    return;
  }
  if (electron && typeof electron.printVoucher === 'function') {
    electron.printVoucher(paymentData);
    return;
  }

  // 2. Web Browser Development environment:
  const html = generatePaymentReceiptHtml(paymentData);
  const voucherId = paymentData?.id
    ? `CPV-${String(paymentData.id).slice(-8).toUpperCase()}`
    : `CPV-${Date.now().toString().slice(-8)}`;
  printThenDownloadHtml(html, `${voucherId}.html`);
}

/**
 * Universal print handler for Screen 5 Direct Payment Receipts.
 */
export function printDirectPaymentReceiptDocument(data: DirectPaymentReceiptData): void {
  if (typeof window === 'undefined') return;

  // 1. Electron Desktop IPC check
  const electron = (window as any).electronAPI;
  if (electron && typeof electron.printDirectPaymentReceipt === 'function') {
    electron.printDirectPaymentReceipt(data);
    return;
  }

  // 2. Web Browser Development environment:
  const html = generateDirectPaymentReceiptHtml(data);
  const rawId = data.billId || data.id || '';
  const docId = rawId ? `DPR-${rawId.slice(-8).toUpperCase()}` : `DPR-${Date.now().toString().slice(-8)}`;
  printThenDownloadHtml(html, `${docId}.html`);
}

/**
 * Universal print handler for Screen 9 Inflow Receipts.
 */
export function printInflowReceiptDocument(receiptData: InflowReceiptData): void {
  if (typeof window === 'undefined') return;

  // 1. Electron Desktop IPC check
  const electron = (window as any).electronAPI;
  if (electron && typeof electron.printReceipt === 'function') {
    electron.printReceipt(receiptData);
    return;
  }

  // 2. Web Browser Development environment:
  const html = generateInflowReceiptHtml(receiptData);
  const rawId = receiptData.id || '';
  const receiptId = rawId ? `REC-${rawId.slice(-8).toUpperCase()}` : `REC-${Date.now().toString().slice(-8)}`;
  printThenDownloadHtml(html, `${receiptId}.html`);
}

