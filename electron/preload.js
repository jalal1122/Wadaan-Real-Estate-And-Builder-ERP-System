const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Triggers native Windows print dialog with CPV (Cash/Cheque Payment Voucher).
   * @param {Object} paymentData - PaymentRunResponse.payment from the backend
   */
  printVoucher: (paymentData) => ipcRenderer.invoke('print-voucher', paymentData),

  /**
   * Triggers native Windows print dialog with dual-copy Official Payment Voucher/Receipt (Screen 7).
   * @param {Object} paymentData - PaymentRunResponse with settled bills and vendor breakdown
   */
  printPaymentReceipt: (paymentData) => ipcRenderer.invoke('print-payment-receipt', paymentData),

  /**
   * Triggers native Windows print dialog with dual-copy Official Inflow Receipt (Screen 9).
   * @param {Object} receiptData - Receipt payload with customer and invoice breakdown
   */
  printReceipt: (receiptData) => ipcRenderer.invoke('print-receipt', receiptData),

  /**
   * Triggers native Windows print dialog with dual-copy Direct Payment Receipt (Screen 5).
   * @param {Object} receiptData - Direct Payment Receipt payload
   */
  printDirectPaymentReceipt: (receiptData) => ipcRenderer.invoke('print-direct-payment-receipt', receiptData),

  /**
   * Exports encrypted database backup to local file system.
   * Documented in execution.md Phase 5 - stub for future implementation.
   */
  exportBackup: () => ipcRenderer.invoke('export-backup'),
});
