Since we are using PostgreSQL (hosted on Supabase) with a Node.js/Express backend, the best way to define this is using the Prisma Schema Language. It maps perfectly to SQL tables, enforces strict relationships (Foreign Keys), and acts as the literal blueprint for your database generation.
Prisma uses a dual-connection setup: a pooled URL (`DATABASE_URL` on port 6543 via Supavisor) for application queries, and a direct URL (`DIRECT_URL` on port 5432) for DDL migrations and schema synchronization.

Here is the exact schema, broken down by module, using UUID for secure IDs and Decimal for all financial math to prevent rounding errors.
1. Global Enums (The Strict Vocabulary)
These restrict what can be saved in the database, preventing spelling errors from breaking your accounting.
enum AccountCategory {
  ASSET
  LIABILITY
  EQUITY
  REVENUE
  EXPENSE
}

enum PaymentType {
  ACCOUNTS_PAYABLE
  DIRECT_CASH
}

enum PaymentStatus {
  UNPAID
  PARTIAL
  PAID
}

enum ClearanceStatus {
  PENDING
  CLEARED
  BOUNCED
}

enum DealType {
  WADAAN_SALE
  CONSTRUCTION
  BROKERAGE
}

2. Security & Core Accounting (Screens 0, 1, 2)
This forms the vault. The Account table holds the buckets, and the Journal tables record the atomic double-entry math.
model User {
  id                   String    @id @default(uuid())
  email                String    @unique
  fullName             String
  pinHash              String    // Bcrypt hash of 4-digit numeric PIN
  masterRecoveryKey    String?   // SHA-256 hash of the 16-char hex recovery key
  failedAttempts       Int       @default(0)
  lockoutTier          Int       @default(0)   // Escalates: 30s, 60s, 120s, 240s...
  lockoutExpiresAt     DateTime? // Replaces isLocked boolean for timestamp-based lockout
  resetPasswordToken   String?   // SHA-256 hash of temporary 1-hour reset token
  resetPasswordExpires DateTime?
  lastLogin            DateTime?
}

model Account {
  id             String          @id @default(uuid())
  accountCode    String          @unique // e.g., "1001"
  accountName    String          // e.g., "Meezan Bank", "Office Safe"
  category       AccountCategory 
  isSystemLocked Boolean         @default(false) // Protects AP/AR buckets
  
  // Relationships
  journalLines   JournalLine[]
}

model JournalEntry {
  id          String        @id @default(uuid())
  entryNumber String        @unique // e.g., "JV-001"
  entryDate   DateTime      @default(now())
  description String        // "Owner withdrawal"
  
  // Relationships
  lines       JournalLine[] // A journal entry must have at least 2 lines
}

model JournalLine {
  id            String       @id @default(uuid())
  journalId     String
  accountId     String
  debitAmount   Decimal      @default(0.00) @db.Decimal(15, 2)
  creditAmount  Decimal      @default(0.00) @db.Decimal(15, 2)
  
  // Relationships (Foreign Keys)
  journal       JournalEntry @relation(fields: [journalId], references: [id], onDelete: Cascade)
  account       Account      @relation(fields: [accountId], references: [id], onDelete: Restrict)
}

3. Payables & Projects (Screens 4, 5, 7)
This tracks exactly what you are building, who you are buying from, and what you owe them.
model Project {
  id            String   @id @default(uuid())
  projectName   String
  projectPrefix String   @unique // e.g., "WH" for Wadaan Heights
  masterBOQ     Decimal  @db.Decimal(15, 2)
  status        String   @default("ACTIVE")
  createdAt     DateTime @default(now())

  // Relationships
  expenseBills  ExpenseBill[]
  deals         Deal[] // Links construction cost to final revenue
}

model Vendor {
  id           String        @id @default(uuid())
  vendorName   String        // e.g., "Ali Hardware"
  phone        String?
  
  // Relationships
  expenseBills ExpenseBill[]
  payments     VendorPayment[]
}

model ExpenseBill {
  id            String        @id @default(uuid())
  vendorId      String
  projectId     String?       // Nullable. If null, it's Office Overhead
  invoiceNumber String        // e.g., "WH-045"
  billDate      DateTime
  paymentType   PaymentType   // AP vs Direct Cash
  paymentStatus PaymentStatus @default(UNPAID)
  grandTotal    Decimal       @db.Decimal(15, 2)
  
  // Relationships
  vendor        Vendor        @relation(fields: [vendorId], references: [id], onDelete: Restrict)
  project       Project?      @relation(fields: [projectId], references: [id], onDelete: Restrict)
  lineItems     BillLineItem[]
}

model BillLineItem {
  id          String      @id @default(uuid())
  billId      String
  description String      // e.g., "Cement Bags"
  quantity    Int
  unitPrice   Decimal     @db.Decimal(15, 2)
  lineTotal   Decimal     @db.Decimal(15, 2)
  
  // Relationships
  bill        ExpenseBill @relation(fields: [billId], references: [id], onDelete: Cascade)
}

model VendorPayment {
  id              String   @id @default(uuid())
  vendorId        String
  sourceAccountId String   // Where the money came from (Screen 1)
  amountPaid      Decimal  @db.Decimal(15, 2)
  chequeRef       String?  // Mandatory if paid via Bank
  paymentDate     DateTime @default(now())
  
  vendor          Vendor   @relation(fields: [vendorId], references: [id], onDelete: Restrict)
}

4. Receivables & Revenue (Screens 8, 9)
This tracks your clients, their deals (brokerage vs. sales), and the cheque waiting room.
model Customer {
  id           String        @id @default(uuid())
  fullName     String
  phone        String
  walletBalance Decimal      @default(0.00) @db.Decimal(15, 2) // Mobilization Advances
  
  // Relationships
  deals        Deal[]
  receipts     Receipt[]
}

model Deal {
  id            String    @id @default(uuid())
  customerId    String
  projectId     String?   // Links to Screen 4 (to calculate Gross Profit)
  dealType      DealType  // SALE, CONSTRUCTION, BROKERAGE
  totalValue    Decimal   @db.Decimal(15, 2)
  createdAt     DateTime  @default(now())

  // Relationships
  customer      Customer  @relation(fields: [customerId], references: [id], onDelete: Restrict)
  project       Project?  @relation(fields: [projectId], references: [id], onDelete: Restrict)
  invoices      DealInvoice[]
}

model DealInvoice {
  id            String        @id @default(uuid())
  dealId        String
  description   String        // e.g., "Installment 1" or "Foundation Milestone"
  amount        Decimal       @db.Decimal(15, 2)
  dueDate       DateTime
  paymentStatus PaymentStatus @default(UNPAID)

  deal          Deal          @relation(fields: [dealId], references: [id], onDelete: Cascade)
}

model Receipt {
  id              String          @id @default(uuid())
  customerId      String
  amount          Decimal         @db.Decimal(15, 2)
  paymentMethod   String          // CASH, CHEQUE, ONLINE
  bankRefNumber   String?         // Mandatory for Cheques
  clearanceStatus ClearanceStatus @default(PENDING) // The "Waiting Room" flag
  receiptDate     DateTime        @default(now())

  customer        Customer        @relation(fields: [customerId], references: [id], onDelete: Restrict)
}

5. System Metadata (Module 0.5: Go-Live Initializer)
This singleton table gates the one-time onboarding wizard and ensures opening balances cannot be overwritten.
model SystemSetting {
  id            Int       @id @default(1) // Fixed primary key: guarantees singleton record
  isInitialized Boolean   @default(false)
  goLiveDate    DateTime?
}

Singleton Enforcement & Atomicity:
- The `id: 1` constraint and interactive transaction boundary (`prisma.$transaction`) ensure that concurrent or repeated calls to `/api/v1/system/initialize` are rejected with `409 ALREADY_INITIALIZED`.
- Master Administrator account creation, Chart of Accounts generation, liquid asset seeding, active project/WIP logging, vendor bills, and customer deal receivables are all performed within this single transaction. If double-entry balancing fails or network drops, everything is cleanly rolled back without leaving orphaned or partial records.

Key Relational Guardrails (How Postgres Protects You):
onDelete: Restrict: Notice how Vendors, Customers, and Accounts have this flag? This means if a Vendor has even one ExpenseBill attached to them, PostgreSQL will physically block you from deleting that Vendor. This prevents orphan data and guarantees your financial reports can never break.
onDelete: Cascade: If you delete an ExpenseBill (which requires administrative reversal), Postgres automatically deletes the BillLineItems inside it so you don't have floating ghost items taking up space.
@db.Decimal(15, 2): Standard web apps use Floats for numbers, which causes rounding errors (e.g., 10.000000001). Using Postgres Decimal ensures accounting precision down to the exact paisa up to 15 digits (Trillions of rupees).

6. Developer Guide: Schema Migration & TypeScript Cache Refresh Workflow
Whenever modifying or extending models in backend/prisma/schema.prisma:
1. Push to Cloud Database:
   npx prisma db push (synchronizes tables, columns, and constraints directly with Supabase PostgreSQL).
2. Generate TypeScript Client:
   npx prisma generate (compiles and outputs the TypeScript definitions into backend/node_modules/@prisma/client).
3. Refresh IDE Language Server Cache:
   Because IDE language servers (VS Code / Antigravity TSServer) load generated node_modules types into an in-memory Abstract Syntax Tree (AST), modifying schema columns (e.g. from passwordHash to pinHash) can cause lingering squiggly red lines in open editors until the in-memory cache is flushed.
   To flush immediately:
   - Press Ctrl + Shift + P
   - Select TypeScript: Restart TS Server
   - The editor will reload fresh .d.ts types from disk immediately.
4. Centralized Client Singleton:
   Always import the Prisma database client and types from backend/src/config/db.ts (import { prisma, User } from '../config/db'). Never instantiate new PrismaClient() directly in controllers or services to avoid exhausting connection pools.
