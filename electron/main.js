const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Wadaan Real Estate & Builders - ERP',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devUrl = 'http://localhost:3000';
  mainWindow.loadURL(devUrl).catch(() => {
    // If dev server not yet up, load fallback or wait
    console.log('Waiting for Next.js dev server...');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Generates an A4 printable HTML voucher with midpoint perforation.
 * Top copy: Vendor / Payee Receipt (Original)
 * Bottom copy: Wadaan Institutional Copy (Accounts & Audit Record)
 * Includes settled bills breakdown, reference types, and official stamp box.
 */
function generateCPVHtml(paymentData = {}) {
  const vendorName = paymentData?.vendor?.vendorName || paymentData?.vendorName || 'Valued Supplier';
  const amount = paymentData?.amountPaid != null
    ? Number(paymentData.amountPaid).toLocaleString('en-PK', { maximumFractionDigits: 0 })
    : '0';

  // Format payment reference description
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
          Settlement applied to outstanding vendor invoices via strict First-In-First-Out (FIFO) waterfall.
        </div>
      `;
    }

    const rows = settledBills.slice(0, 4).map((b) => {
      const invNum = b.invoiceNumber || 'INV-Auto';
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

    const extraBillsCount = settledBills.length - 4;
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
      font-family: 'Segoe UI', Arial, sans-serif;
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
 * Generates an A4 dual-copy HTML document for Inflow Receipts (Screen 9).
 * Contains Customer Copy (Original) and Wadaan Accounts Copy with perforated divider.
 */
function generateReceiptHtml(receiptData) {
  const receiptId = receiptData.id ? `REC-${receiptData.id.slice(0, 8).toUpperCase()}` : `REC-${Date.now()}`;
  const customerName = receiptData.customer?.fullName || receiptData.customerName || 'Walk-in Client';
  const customerPhone = receiptData.customer?.phone || receiptData.customerPhone || '—';
  const dateStr = new Date(receiptData.receiptDate || Date.now()).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const amountNum = Number(receiptData.amount || receiptData.totalAmount || 0);
  const amount = isNaN(amountNum) ? '0' : amountNum.toLocaleString('en-PK');
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
        const invAmt = Number(inv.amount || 0).toLocaleString('en-PK');
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
          <h1>Official Receipt</h1>
          <p class="voucher-id">${receiptId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Received From:</span> <strong>${customerName}</strong></div>
        <div class="meta-item"><span class="meta-label">Receipt Date:</span> ${dateStr}</div>
        <div class="meta-item"><span class="meta-label">Contact / Phone:</span> ${customerPhone}</div>
        <div class="meta-item"><span class="meta-label">Payment Mode:</span> ${paymentRefHtml}</div>
        <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
          <span class="meta-label">Total Amount Received:</span>
          <strong style="font-size: 16px; color: #059669; font-family: monospace;">PKR ${amount}</strong>
        </div>
      </div>

      ${renderInvoicesList()}

      <div class="stamp-box">
        <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a;">
          Official Acknowledgement &bull; Wadaan ERP
        </div>
        <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">
          Received with thanks the sum of <strong>PKR ${amount}</strong> via ${paymentMethod}. Instruments subject to realization.
        </div>
        <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 10.5px; color: #334155;">
          <span>Cashier / Officer: ____________________________</span>
          <span>Authorized Signatory &amp; Stamp: ____________________________</span>
        </div>
      </div>
    </div>
  `;

  const renderWadaanCopy = () => `
    <div class="voucher-copy">
      <div class="header">
        <div>
          <h2>Wadaan Real Estate &amp; Builders</h2>
          <p class="subtitle">Institutional Revenue Ledger &bull; <strong style="color: #0f172a;">Accounts &amp; Audit Copy</strong></p>
        </div>
        <div class="header-right">
          <h1>Official Receipt</h1>
          <p class="voucher-id">${receiptId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Received From:</span> <strong>${customerName}</strong></div>
        <div class="meta-item"><span class="meta-label">Receipt Date:</span> ${dateStr}</div>
        <div class="meta-item"><span class="meta-label">Contact / Phone:</span> ${customerPhone}</div>
        <div class="meta-item"><span class="meta-label">Payment Mode:</span> ${paymentRefHtml}</div>
        <div class="meta-item" style="grid-column: span 2; border-top: 1px dashed #cbd5e1; padding-top: 5px;">
          <span class="meta-label">Total Credited into Ledger:</span>
          <strong style="font-size: 16px; color: #0f172a; font-family: monospace;">PKR ${amount}</strong>
        </div>
      </div>

      ${renderInvoicesList()}

      <div class="signatures">
        <div class="sig-line">Cashier (Received)</div>
        <div class="sig-line">Posting Officer (GL)</div>
        <div class="sig-line">Internal Audit</div>
        <div class="sig-line">Manager Finance</div>
      </div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt - ${receiptId}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 8mm;
    }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
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
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .voucher-id {
      margin: 2px 0 0 0;
      font-size: 11px;
      font-family: monospace;
      font-weight: bold;
      color: #0f172a;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 16px;
      margin: 8px 0;
      font-size: 11px;
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid #e2e8f0;
    }
    .meta-label {
      color: #64748b;
      font-size: 10px;
      text-transform: uppercase;
      margin-right: 4px;
    }
    .stamp-box {
      border: 1px solid #e2e8f0;
      background: #f8fafc;
      border-radius: 6px;
      padding: 8px 12px;
      margin-top: 4px;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      margin-top: 6px;
      padding-top: 4px;
    }
    .sig-line {
      border-top: 1px solid #94a3b8;
      padding-top: 4px;
      font-size: 9.5px;
      color: #64748b;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .perforation {
      border-top: 1px dashed #94a3b8;
      position: relative;
      margin: 4mm 0;
      text-align: center;
    }
    .perforation-label {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 8px;
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
      <span class="perforation-label">&bull; Cut / Detach Along Line &bull; Official Wadaan Copy Below &bull;</span>
    </div>
    ${renderWadaanCopy()}
  </div>
</body>
</html>`;
}

// Register IPC handlers
ipcMain.handle('print-voucher', async (event, paymentData) => {
  try {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const html = generateCPVHtml(paymentData);
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    return new Promise((resolve) => {
      printWin.webContents.print(
        {
          silent: false,
          printBackground: true,
        },
        (success, failureReason) => {
          printWin.close();
          if (!success) {
            console.warn('Printing was cancelled or failed:', failureReason);
          }
          resolve({ success, failureReason });
        }
      );
    });
  } catch (error) {
    console.error('Error handling print-voucher IPC:', error);
    throw error;
  }
});

ipcMain.handle('print-payment-receipt', async (event, paymentData) => {
  try {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const html = generateCPVHtml(paymentData);
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    return new Promise((resolve) => {
      printWin.webContents.print(
        {
          silent: false,
          printBackground: true,
        },
        (success, failureReason) => {
          printWin.close();
          if (!success) {
            console.warn('Printing payment receipt was cancelled or failed:', failureReason);
          }
          resolve({ success, failureReason });
        }
      );
    });
  } catch (error) {
    console.error('Error handling print-payment-receipt IPC:', error);
    throw error;
  }
});

ipcMain.handle('print-receipt', async (event, receiptData) => {
  try {
    const printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    const html = generateReceiptHtml(receiptData);
    await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    return new Promise((resolve) => {
      printWin.webContents.print(
        {
          silent: false,
          printBackground: true,
        },
        (success, failureReason) => {
          printWin.close();
          if (!success) {
            console.warn('Printing receipt was cancelled or failed:', failureReason);
          }
          resolve({ success, failureReason });
        }
      );
    });
  } catch (error) {
    console.error('Error handling print-receipt IPC:', error);
    throw error;
  }
});

ipcMain.handle('export-backup', async () => {
  // Stub for future database backup bridge
  console.log('export-backup called (stub)');
  return { success: true, message: 'Backup export stub invoked.' };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

module.exports = { generateCPVHtml };

