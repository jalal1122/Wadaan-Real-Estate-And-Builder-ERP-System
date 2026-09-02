1. Database Connection Security (Anti-Decompilation)
Electron applications package their source code into an .asar archive. This is not encrypted; anyone with basic tooling can unpack it and read hardcoded strings. If your Neon/Supabase PostgreSQL URL is hardcoded, an attacker gains full access to your financial ledgers.

The Implementation: Electron safeStorage API
Instead of packaging a .env file into the .exe, the ERP leverages Electron's native OS-level encryption.

First Boot (Setup): During the Module 0.5 Go-Live Wizard, the user pastes the cloud DATABASE_URL into a hidden setup field.


Encryption: The Electron Main Process (main.js) intercepts this string and passes it to safeStorage.encryptString(). This uses the Windows Data Protection API (DPAPI) to encrypt the string using credentials tied specifically to your Windows user account on your Lenovo laptop.


Storage: The encrypted buffer is saved locally to %APPDATA%/WadaanERP/db.enc.


Runtime Decryption: Every time you launch the ERP, Electron reads the file, decrypts it via safeStorage.decryptString(), and injects it securely into the Express background process as process.env.DATABASE_URL entirely in memory. If someone steals the laptop's hard drive or copies the .enc file to another computer, it cannot be decrypted.


2. The Multi-Tier Backup Strategy
A real estate ERP cannot rely solely on cloud provider guarantees. Wadaan ERP employs a dual-layer backup system.

Tier 1: Cloud-Native PITR (Neon / Supabase)

Point-in-Time Recovery: Configured directly in the Neon dashboard. It retains a continuous write-ahead log (WAL) for 7 to 30 days.


Branching: If a catastrophic manual error occurs (e.g., deleting a vendor instead of updating them), you can instantly branch the database from exactly 5 minutes before the mistake, verify the data, and promote the branch to production.


Tier 2: Local Cold Storage (Electron File System)

The "Cold Export" IPC: A dedicated button on Screen 10 triggers an Inter-Process Communication (IPC) event.


Prisma JSON/CSV Dump: The Express backend runs a serialized findMany across Accounts, JournalLines, Deals, and ExpenseBills.


Local Write: Electron's fs module writes heavily compressed .json and .csv files directly to C:\WadaanBackups\YYYY-MM-DD. This guarantees that even if Neon goes completely offline or your cloud account is compromised, you possess a physical, offline copy of every double-entry ledger.


3. Offline Graceful Degradation (Handling Internet Drops)
Because Prisma requires a live connection to the cloud database, a local internet outage in Peshawar must not cause the desktop application to crash or display unhandled exception screens.

The Prisma Interceptor (Backend)
When the internet drops, Prisma fails to reach Neon and throws error code P1001 (Can't reach database server) or P1011 (Connection timed out).

The Express global errorHandler middleware catches these specific codes.


It suppresses the stack trace and returns a standardized 503 Service Unavailable response: { success: false, error: { code: 'NETWORK_OFFLINE', message: 'Database unreachable.' } }.


TanStack Query Fallback (Frontend)
The Next.js frontend uses React Query's built-in offline capabilities to provide a seamless "Read-Only" mode.

Cache Preservation: React Query is configured with networkMode: 'offlineFirst'. If an action fails with a 503, the cached data (Screen 1 balances, Screen 10 charts) remains visible on the screen.


UI Lockdown: A global window.navigator.onLine event listener detects the drop. A yellow banner appears: "Offline Mode: Viewing Cached Data". All POST, PATCH, and DELETE mutation buttons (e.g., "Pay Vendor", "Save Bill") are instantly disabled to prevent data from queuing and executing out-of-order when the connection restores.


Auto-Recovery: When the connection returns, React Query automatically triggers an invalidateQueries sweep, silently refreshing all on-screen numbers to match the cloud state.
