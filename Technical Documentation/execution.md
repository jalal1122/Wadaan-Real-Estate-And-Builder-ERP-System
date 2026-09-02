Phase 1: Workspace Initialization & Architecture Setup
This phase establishes the skeleton. We will use a standard folder structure to separate the three distinct environments: Next.js (UI), Express (API), and Electron (Desktop Wrapper).

Initialize the Root Directory:



Create wadaan-erp/ and run npm init -y.


Set up a package.json with workspace configurations (or simple concurrent scripts) to run all three environments simultaneously during development.


Initialize the Backend (Express):



Navigate to /backend. Run npm init -y.


Install dependencies: express, cors, cookie-parser, zod, jsonwebtoken, bcryptjs, decimal.js.


Install TypeScript and types: typescript, @types/express, ts-node, nodemon.


Create the src/ folder structure (controllers, services, routes, middleware, utils).


Initialize the Frontend (Next.js 16):



Navigate to root. Run npx create-next-app@latest frontend.


Select TypeScript, Tailwind CSS, App Router.


Modify next.config.js to strictly enforce output: 'export' and set distDir to route the compiled static HTML to the Electron folder.


Install TanStack Query: npm install @tanstack/react-query @tanstack/react-query-devtools.


Initialize the Desktop Wrapper (Electron):



Navigate to root. Create /electron. run npm init -y.


Install Electron and Builder: npm install electron electron-builder concurrently --save-dev.


Create main.js and preload.js.


Phase 2: Database & Prisma Engine (The Foundation)
Before writing any business logic, the PostgreSQL cloud database must be structured and typed.

Prisma Setup:



Inside /backend, run npx prisma init.


Paste the exact ERD schema (from Document 1) into schema.prisma.


Connect to Neon/Supabase:



Add your cloud DATABASE_URL to the backend .env file.


Run npx prisma db push to generate the physical tables in the cloud.


Run npx prisma generate to create the strongly-typed Prisma Client for your Express services.


Test the Connection:



Write a quick test.ts script to insert a dummy Account and query it to ensure cloud latency is acceptable from Peshawar.


Phase 3: Express API & Accounting Rule Engine
This phase builds the standalone brain of the ERP. You will test everything via Postman before touching Next.js.

Global Middleware & Utilities:



Create math.util.ts (wrapping decimal.js).


Create errorHandler.ts (intercepting Prisma P1001 network drops and P2002 duplicates).


Create authGuard.ts (JWT cookie verification).


Module 0 (Auth & Initialization):



Code system.service.ts (The Go-Live atomic transaction).


Code auth.service.ts (Progressive Lockout math, Master Recovery Key generation).


Module 1 (Core Accounting):



Code DoubleEntryValidator.ts.


Code journal.service.ts and account.service.ts (Dynamic July 1st fiscal boundaries).


Module 2 (Projects & FIFO):



Code fifo.service.ts (The payment waterfall loop).


Code bill.service.ts (WIP capitalization routing).


Modules 3 & 4 (Receivables & Executive Analytics):



Code receipt.service.ts (Cheque Waiting Room and Wallet logic).


Code report.service.ts (Prisma $queryRaw aggregations for Screen 10).


Postman Verification:



Execute the Go-Live initialization via Postman. Run a full cycle (Add Vendor -> Bill Vendor -> Pay Vendor). Verify double-entry balance is exactly 0.00.


Phase 4: Next.js Frontend & TanStack Query
With a tested API, build the instantaneous UI.

API Client & Caching Setup:



Create axiosClient.ts pre-configured to hit http://localhost:4000/api/v1 and strictly pass withCredentials: true (for the JWT cookies).


Configure queryClient.ts with networkMode: 'offlineFirst' and a stale time of 5 minutes.


Auth Flow (Screen 0 & 0.5):



Build the Login Screen with the progressive brute-force countdown timer.


Build the Starter Modal (multi-step form) that conditionally renders if GET /api/system/status is false.


Master Grids (Screens 1, 4, 8):



Build reusable data tables for Chart of Accounts, Projects, and Deals. Implement useQuery hooks.


Transactional Forms (Screens 2, 5, 9):



Build the dynamic forms (e.g., multi-line Journal Entry form). Implement useMutation hooks that trigger queryClient.invalidateQueries on success.


FIFO Engine & Dashboard (Screens 7 & 10):



Build the Screen 7 Payment Run interface.


Build Screen 10 using a charting library (e.g., Recharts) feeding off the real-time aggregation endpoints.


Implement the global offline listener: window.addEventListener('offline', ...) to disable action buttons.


Phase 5: Electron Desktop Integration (The Wrapper)
Stitch the frontend and backend together into a desktop environment.

Security & SafeStorage:



Implement Electron's safeStorage.encryptString() in main.js to encrypt the Neon DATABASE_URL during the Go-Live phase. Save it to %APPDATA%.


Background Process Spawning:



Use child_process.fork() inside main.js to silently boot the compiled Express server on an available local port when the .exe opens.


Read the .enc file, decrypt it, and pass it as an environment variable to the fork.


IPC Bridges (Preload.js):



Create secure bridges for local hardware actions (e.g., window.electronAPI.exportBackup(), window.electronAPI.printVoucher()).


The Window Loader:



Point the Electron BrowserWindow to load the index.html file generated by Next.js's static export.


Phase 6: Compiling & Deployment
Convert the source code into a professional Windows installer.

Compile Express:



Run tsc in the backend folder to convert TypeScript files into plain Node.js JavaScript (/dist).


Export Next.js:



Run next build in the frontend folder. Next.js outputs a pure HTML/CSS/JS bundle to the /electron/build/ui directory.


Electron-Builder Configuration:



Configure package.json in the /electron folder to include the backend /dist and the UI /build files.


Set the target to nsis (Windows installer) or portable.


Generate the .exe:



Run npm run build:windows.


The output is WadaanERP-Setup-1.0.0.exe. You can install it, input your Master Recovery Key, connect to Neon, and run the real estate business.
