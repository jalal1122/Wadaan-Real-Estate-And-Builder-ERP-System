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
 * Generates an A4 printable HTML voucher with midpoint perforation (top: Wadaan copy, bottom: Vendor copy)
 * Matches Stitch design 4d29bb1b44f84bb7ba531ddc6b2da313
 */
function generateCPVHtml(paymentData = {}) {
  const vendorName = paymentData?.vendor?.vendorName || paymentData?.vendorName || 'Valued Supplier';
  const amount = paymentData?.amountPaid != null ? Number(paymentData.amountPaid).toLocaleString('en-PK', { maximumFractionDigits: 0 }) : '0';
  const chequeRef = paymentData?.chequeRef || 'N/A (Cash / Transfer)';
  const voucherId = paymentData?.id ? `CPV-${String(paymentData.id).slice(-8).toUpperCase()}` : `CPV-${Date.now().toString().slice(-8)}`;
  const dateStr = paymentData?.paymentDate ? new Date(paymentData.paymentDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const renderHalf = (copyType) => `
    <div class="voucher-copy">
      <div class="header">
        <div>
          <h2>Wadaan Real Estate &amp; Builders</h2>
          <p class="subtitle">Institutional Financial Management &bull; <strong style="color: #059669;">${copyType}</strong></p>
        </div>
        <div class="header-right">
          <h1>Payment Voucher</h1>
          <p class="voucher-id">${voucherId}</p>
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><span class="meta-label">Payee / Vendor:</span> <strong>${vendorName}</strong></div>
        <div class="meta-item"><span class="meta-label">Date:</span> ${dateStr}</div>
        <div class="meta-item"><span class="meta-label">Cheque / Ref:</span> ${chequeRef}</div>
        <div class="meta-item"><span class="meta-label">Total Paid:</span> <strong style="font-size: 16px;">PKR ${amount}</strong></div>
      </div>

      <div class="signatures">
        <div class="sig-line">Prepared By</div>
        <div class="sig-line">Approved By</div>
        <div class="sig-line">Received By (Sign &amp; Stamp)</div>
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
      margin: 10mm;
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
      height: 270mm;
      justify-content: space-between;
    }
    .voucher-copy {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px 20px;
      box-sizing: border-box;
      height: 125mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
    }
    .header h2 {
      margin: 0;
      font-size: 18px;
      color: #0f172a;
    }
    .subtitle {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .header-right {
      text-align: right;
    }
    .header-right h1 {
      margin: 0;
      font-size: 16px;
      text-transform: uppercase;
      color: #0f172a;
    }
    .voucher-id {
      margin: 2px 0 0 0;
      font-family: monospace;
      font-size: 12px;
      color: #475569;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 14px 0;
      font-size: 12px;
    }
    .meta-label {
      color: #64748b;
      display: inline-block;
      width: 110px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      gap: 20px;
      margin-top: auto;
      padding-top: 15px;
    }
    .sig-line {
      flex: 1;
      border-top: 1px solid #0f172a;
      text-align: center;
      font-size: 11px;
      font-weight: 500;
      padding-top: 4px;
    }
    .perforation {
      border-top: 1px dashed #94a3b8;
      position: relative;
      text-align: center;
      margin: 6mm 0;
    }
    .perforation-text {
      position: absolute;
      top: -9px;
      left: 50%;
      transform: translateX(-50%);
      background: #fff;
      padding: 0 8px;
      font-size: 9px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  </style>
</head>
<body>
  <div class="page-container">
    ${renderHalf('Wadaan Institutional Copy')}
    <div class="perforation">
      <span class="perforation-text">&mdash;&mdash; Cut or Tear Along Perforation &mdash;&mdash;</span>
    </div>
    ${renderHalf('Vendor / Payee Receipt')}
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
