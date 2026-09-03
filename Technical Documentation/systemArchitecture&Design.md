Wadaan Real Estate ERP: System Architecture & Design
This document defines the high-level topology and component interactions for the Wadaan ERP. The architecture is a Local-First Hybrid Desktop Application utilizing a decoupled MERN-style stack adapted for PostgreSQL and Electron.

1. High-Level Topology
The system operates entirely on your Windows 11 machine via a single compiled .exe file, requiring an internet connection solely for securely transmitting data to the cloud database.

Layer
Technology
Runtime Location
Primary Responsibility
Container
Electron.js
Local Desktop
Wraps UI/API, manages OS-level resources (PDF generation).
Frontend
React / Next.js
Local Desktop (Renderer)
Delivers the 10-screen UI, manages state and input.
Backend API
Node.js / Express
Local Desktop (Background)
Executes business logic, accounting rules, and authentication.
Database
PostgreSQL
Cloud (Supabase/Neon)
Houses the transactional ledgers, ensures ACID compliance.
ORM
Prisma
Local Desktop (Backend)
Translates Express logic into secure SQL queries.

2. The Electron Process Lifecycle
Electron acts as the orchestrator, managing two isolated processes to ensure security and performance.

The Main Process (Backend Orchestrator): Upon launching the app, Electron silently executes your Node.js/Express server in the background, binding it to a local port (e.g., localhost:4000). It establishes the secure connection pool to the cloud PostgreSQL database using Prisma.


The Renderer Process (UI Host): Electron simultaneously spawns a Chromium window that loads your pre-compiled Next.js frontend. The frontend makes HTTP requests directly to localhost:4000, resulting in zero network latency for API routing.


The Bridge (IPC): Direct Node.js access is disabled in the frontend for security. If Screen 7 needs to print a physical payment voucher, the Next.js frontend sends an Inter-Process Communication (IPC) message to the Main Process, which then triggers the native Windows print dialog.


3. Data Flow & State Management Architecture
Because the UI must reflect financial changes instantly across multiple screens, the system uses an aggressive local caching strategy.

API Communication: Next.js uses Axios or the native Fetch API to communicate with the local Express server.


Client-Side Caching (TanStack Query): Data is fetched and cached locally by React Query.


Cache Invalidation (The Sync Trigger): When a transaction is successfully posted (e.g., POST /api/receipts), the backend returns a success code. The frontend immediately invalidates the affected query keys (e.g., ['account-balances'], ['customer-khaata']). The UI instantly refetches the updated numbers in the background without a page reload, ensuring Screen 1 always displays the exact live balance.


4. Security & Authentication Boundary
Even though the application runs locally, it maintains strict security perimeters to protect the cloud database.

Authentication (Screen 0): The Express backend validates the user's 4-digit PIN using bcrypt.


Session Management: Upon successful login, Express generates a JSON Web Token (JWT) and sets it as an HttpOnly cookie on localhost.


Route Protection: Every request to localhost:4000/api/* passes through an Express middleware that verifies the JWT signature. If the token is missing or expired (after 15 minutes), the API returns a 401 Unauthorized, and the Next.js frontend redirects back to Screen 0.


Database Access & Connection Pooling: The frontend never possesses database credentials. The cloud PostgreSQL URL is securely injected only into the compiled Express backend via environment variables hidden inside the Electron package. All query executions are strictly channeled through the centralized Prisma Client singleton at backend/src/config/db.ts to guarantee connection pool discipline and consistent TypeScript type inference across services.
