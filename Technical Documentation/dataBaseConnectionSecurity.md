1. Database Connection Security (Anti-Decompilation)
Electron applications package their source code into an .asar archive. This is not encrypted; anyone with basic tooling can unpack it and read hardcoded strings. If your Supabase PostgreSQL URL is hardcoded, an attacker gains full access to your financial ledgers.

The Implementation: Electron safeStorage API
Instead of packaging a .env file into the .exe, the ERP leverages Electron's native OS-level encryption.

First Boot (Setup): During the Module 0.5 Go-Live Wizard, the user pastes the cloud connection strings into a hidden setup field.

Encryption: The Electron Main Process (main.js) intercepts these strings and passes them to safeStorage.encryptString(). This uses the Windows Data Protection API (DPAPI) to encrypt the string using credentials tied specifically to your Windows user account on your Lenovo laptop.

Storage: The encrypted buffer is saved locally to %APPDATA%/WadaanERP/db.enc.

Runtime Decryption: Every time you launch the ERP, Electron reads the file, decrypts it via safeStorage.decryptString(), and injects it securely into the Express background process as process.env.DATABASE_URL and process.env.DIRECT_URL entirely in memory. If someone steals the laptop's hard drive or copies the .enc file to another computer, it cannot be decrypted.

1.1 Dual-URL Prisma Configuration (Supabase)
Supabase provides two distinct PostgreSQL endpoints to optimize between query throughput and schema management:
- DATABASE_URL (Transaction Pooler - Port 6543):
  Uses Supavisor / PgBouncer in transaction mode. All Express API endpoints use this connection to handle concurrent database queries without exhausting PostgreSQL connection limits.
- DIRECT_URL (Session Direct Connection - Port 5432):
  Direct connection to the underlying PostgreSQL instance. Prisma requires this direct endpoint for DDL migrations, `npx prisma db push`, and schema synchronization because transaction poolers do not support prepared statements or advisory locks.

In `schema.prisma`, this is configured via:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

2. The Multi-Tier Backup Strategy
A real estate ERP cannot rely solely on cloud provider guarantees. Wadaan ERP employs a dual-layer backup system.

Tier 1: Cloud-Native PITR (Supabase)
Point-in-Time Recovery: Configured directly in the Supabase dashboard. It retains continuous write-ahead logs (WAL) for up to 30 days.
Rollback & Recovery: If a catastrophic manual error occurs, you can restore or branch the database state to any exact minute prior to the mistake, verify the data, and promote it to production.

Tier 2: Local Cold Storage (Electron File System)
The "Cold Export" IPC: A dedicated button on Screen 10 triggers an Inter-Process Communication (IPC) event.
Prisma JSON/CSV Dump: The Express backend runs a serialized findMany across Accounts, JournalLines, Deals, and ExpenseBills.
Local Write: Electron's fs module writes heavily compressed .json and .csv files directly to C:\WadaanBackups\YYYY-MM-DD. This guarantees that even if Supabase goes completely offline or your cloud account is compromised, you possess a physical, offline copy of every double-entry ledger.

3. Offline Graceful Degradation (Handling Internet Drops)
Because Prisma requires a live connection to the cloud database, a local internet outage in Peshawar must not cause the desktop application to crash or display unhandled exception screens.

The Prisma Interceptor (Backend)
When the internet drops, Prisma fails to reach Supabase and throws error code P1001 (Can't reach database server) or P1011 (Connection timed out).
The Express global errorHandler middleware catches these specific codes.
It suppresses the stack trace and returns a standardized 503 Service Unavailable response:
```json
{ "success": false, "error": { "code": "NETWORK_OFFLINE", "message": "Cloud database unreachable. Please check your internet connection." } }
```

TanStack Query Fallback (Frontend)
The Next.js frontend uses React Query's built-in offline capabilities to provide a seamless "Read-Only" mode.
Cache Preservation: React Query is configured with networkMode: 'offlineFirst'. If an action fails with a 503, the cached data (Screen 1 balances, Screen 10 charts) remains visible on the screen.
UI Lockdown: A global window.navigator.onLine event listener detects the drop. A yellow banner appears: "Offline Mode: Viewing Cached Data". All POST, PATCH, and DELETE mutation buttons (e.g., "Pay Vendor", "Save Bill") are instantly disabled to prevent data from queuing and executing out-of-order when the connection restores.
Auto-Recovery: When the connection returns, React Query automatically triggers an invalidateQueries sweep, silently refreshing all on-screen numbers to match the cloud state.
