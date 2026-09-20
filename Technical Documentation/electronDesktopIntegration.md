The Next.js Frontend Architecture & Caching Strategy

To keep the UI instantly responsive without browser reloads, the frontend is structured as a statically exported Next.js 16 application. It relies entirely on TanStack Query (React Query) to communicate with your local Express server.

1. Folder Structure

wadaan-erp/ ├── electron/ # Electron wrapper (Detailed below) │ ├── main.js # Electron entry point │ └── preload.js # Secure IPC bridge ├── backend/ # Node.js/Express API (Modules 0-4) │ ├── src/controllers/ │ ├── src/services/ │ └── prisma/schema.prisma └── frontend/ # Next.js 16 UI ├── src/app/ │ ├── (auth)/login/page.tsx # Screen 0 │ └── (dashboard)/ │ ├── accounts/page.tsx # Screen 1 │ ├── projects/page.tsx # Screen 4 │ ├── payables/page.tsx # Screen 7 │ └── reports/page.tsx # Screen 10 ├── src/components/ │ ├── layout/Sidebar.tsx │ └── ui/DataTable.tsx # Reusable grids ├── src/hooks/ │ ├── useAccounts.ts # React Query hooks │ └── useFifoPayment.ts # Mutation hooks └── src/lib/ ├── axiosClient.ts # Pre-configured with localhost:4000 └── queryClient.ts # TanStack cache config 

2. The TanStack Query Caching Strategy
React Query is what makes the ERP feel instantaneous. When you execute an action, it automatically triggers background refetches across the app.

Query Key Hierarchy:

['accounts'] - Fetches Screen 1 balances.


['vendors'] - Fetches supplier master list.


['vendor-unpaid', vendorId] - Fetches specific queue for Screen 7.


The Invalidation Trigger (Example: Clearing a Vendor Payment):
When you click "Pay Rs. 50,000" on Screen 7, this hook executes:

const usePayVendor = () => { const queryClient = useQueryClient(); return useMutation({ mutationFn: (payload) => axios.post('/api/v1/payments/vendor', payload), onSuccess: (data, variables) => { // 1. Instantly refresh the Vendor's remaining debt queryClient.invalidateQueries({ queryKey: ['vendors'] }); queryClient.invalidateQueries({ queryKey: ['vendor-unpaid', variables.vendorId] }); // 2. Instantly refresh Screen 1 so the Bank Balance drops by 50k queryClient.invalidateQueries({ queryKey: ['accounts'] }); } }); }; 

Document 5: Electron Desktop Integration & Build Spec

This is the final technical document. It dictates exactly how your Next.js frontend and Express backend are stitched together into a single Windows .exe file.

1. How the Electron Wrapper Works
Electron acts as a native Windows browser window that has hidden access to your computer's operating system.

When you double-click WadaanERP.exe, Electron runs a master script (main.js). This script does two things simultaneously:

Spawns the Backend: It uses Node's child_process.fork() to silently start your Express server on a local port (e.g., http://localhost:4000). This server connects securely to your Supabase/Neon PostgreSQL database in the cloud.


Loads the Frontend: It opens a Chromium window and loads your Next.js UI files directly from your Lenovo laptop's SSD.

2. The Implementation Steps
Step 1: Prepare Next.js for Desktop (Static Export)
Electron cannot run a live Next.js server (next start) easily in production. Instead, you configure Next.js as a pure frontend app.
In next.config.js:

const nextConfig = { output: 'export', // Compiles the entire UI into plain HTML/JS distDir: '../electron/build/ui', // Sends the build directly to Electron }; module.exports = nextConfig; xports = nextConfig;

Step 2: The Electron main.js Script
This is the heart of the wrapper. It boots the Express API in the background and then loads the UI.

const { app, BrowserWindow } = require('electron'); const path = require('path'); const { fork } = require('child_process'); let mainWindow; let apiProcess; app.on('ready', () => { // 1. Start the Express Backend as a hidden background process apiProcess = fork(path.join(__dirname, '../backend/dist/server.js'), [], { env: { NODE_ENV: 'production', PORT: 4000, DATABASE_URL: 'postgresql://user:pass@neon.tech/wadaan' // Injected securely } }); // 2. Create the Desktop Window mainWindow = new BrowserWindow({ width: 1280, height: 800, title: "Wadaan Real Estate ERP", webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false // Strict security: UI cannot access OS files directly } }); // 3. Load the compiled Next.js frontend mainWindow.loadFile(path.join(__dirname, 'build/ui/index.html')); }); // 4. Cleanup: Kill the background API when the user closes the app app.on('window-all-closed', () => { if (apiProcess) apiProcess.kill(); app.quit(); }); pp.quit();
});

Step 3: Secure IPC (Inter-Process Communication)
If Screen 9 needs to generate and print a physical payment receipt, the Next.js frontend cannot access the Windows printer directly. It sends a message through the preload.js bridge:

// Next.js triggers this: 
window.electronAPI.printVoucher(paymentData); 

Electron receives this in main.js, generates the perforated A4 CPV layout locally, and sends it to the default Windows printer.

### IPC Bridge Contract (v3.2.0)

Documented in `electron/preload.js` and `electron/main.js`:
```typescript
interface ElectronAPI {
  printVoucher: (paymentData: any) => Promise<{ success: boolean; failureReason?: string }>;
  printPaymentReceipt: (paymentData: any) => Promise<{ success: boolean; failureReason?: string }>;
  printDirectPaymentReceipt: (receiptData: any) => Promise<{ success: boolean; failureReason?: string }>;
  printReceipt: (receiptData: any) => Promise<{ success: boolean; failureReason?: string }>;
  exportBackup: () => Promise<{ success: boolean; message: string }>;
}
declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
```
- `printPaymentReceipt(paymentData)` / `printVoucher(paymentData)`:
  Generates an A4 printable HTML Cash/Cheque Payment Voucher (CPV) with midpoint perforation (top: Vendor/Payee Receipt Original, bottom: Wadaan Accounts & Audit Record), matching Stitch design `4d29bb1b44f84bb7ba531ddc6b2da313`, and invokes native Windows print dialog.
- `printDirectPaymentReceipt(receiptData)` [Added v3.2.0]:
  Generates an A4 printable HTML Direct Payment Receipt (DPR) / Direct Expense Voucher with dual-copy perforation layout (top: Payee / Vendor Receipt Copy, bottom: Wadaan Internal Accounts & Audit Voucher). Includes itemized line items table, optional Bank/Online Transaction Ref (`transactionRef`), expense account coding, and dual signature blocks.
- `printReceipt(receiptData)`:
  Generates an A4 printable HTML Official Inflow Receipt (Screen 9) with dual-copy layout (top: Customer Copy Original, bottom: Wadaan Accounts & Audit Copy) and perforated divider, showing customer details, instrument reference, milestone allocations or advance escrow, and cashier signatures.
- `exportBackup()`:
  Exports encrypted database backup to local file system (Phase 5 execution stub).

### Print-First Then Download Architecture (Universal Web & Desktop)
- **Electron (Desktop)**: Invokes native Windows OS print directly via hidden `BrowserWindow`.
- **Web Browser (Dev / Web Client)**: Renders the identical high-fidelity HTML into a hidden `<iframe>`. Invokes `iframe.contentWindow.print()` first. Upon printing or dialog dismissal (`onafterprint`, reinforced by a 1500ms safety timeout), automatically triggers an HTML file download (`Wadaan-Receipt-*.html`). This guarantees the user has a saved offline record regardless of whether printing succeeded or was cancelled.


Step 4: Compiling the .exe
You use a tool called electron-builder. You run a single terminal command:

npm run build:windows 

It takes the Next.js out folder, the Express dist folder, bundles them with the Electron runtime, and spits out a clean WadaanERP-Setup.exe that you can install like any standard Windows program.

