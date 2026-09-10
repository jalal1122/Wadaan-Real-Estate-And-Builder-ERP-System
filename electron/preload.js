const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Triggers native Windows print dialog with CPV (Cash/Cheque Payment Voucher).
   * @param {Object} paymentData - PaymentRunResponse.payment from the backend
   */
  printVoucher: (paymentData) => ipcRenderer.invoke('print-voucher', paymentData),

  /**
   * Exports encrypted database backup to local file system.
   * Documented in execution.md Phase 5 - stub for future implementation.
   */
  exportBackup: () => ipcRenderer.invoke('export-backup'),
});
