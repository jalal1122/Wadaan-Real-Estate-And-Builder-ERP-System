1. What You See (The Interface)
The entry point is designed to be completely private, clean, and professional.
The Look: A minimalist page with the Wadaan Real Estate logo centered on the screen.
The Inputs: Only two text boxes: Email and Password.
The Actions: A "Login" button and a "Forgot Password?" link.
The "No Sign-Up" Rule: Because this is Wadaan’s private financial system, random visitors cannot create an account. There is no "Register" or "Sign Up" button. Your single master account is initialized via the Module 0.5 Go-Live wizard or the one-time `/api/v1/auth/setup` endpoint.

2. What the System Remembers (The User Record)
Behind the scenes, the system securely tracks key operational and cryptographic details:
- Full Name: The primary administrator's formal name (e.g., "Muhammad Jalal").
- Email Address: Your unique login ID.
- Scrambled Password: The system never stores plain-text passwords. It hashes them using bcrypt with 12 salt rounds so even system administrators cannot read them.
- Failed Attempts Counter: Tracks consecutive incorrect password submissions.
- Lockout Tier: An escalation counter that tracks how many times the lockout threshold has been triggered.
- Lockout Expiry Timestamp: Replaces static boolean flags. If non-null and in the future, login attempts are mathematically rejected with HTTP 429.
- Master Recovery Key (Hashed): A SHA-256 hash of your 16-character emergency offline recovery key.
- Password Reset Token & Expiry: A SHA-256 hash of the active 1-hour reset token and its expiration date.
- Last Login Time: Records the exact timestamp of your last successful authentication.

3. Business Rules & Security Guardrails
Since this software holds Wadaan's bank balances and client data, the login screen acts like a bank vault door with strict automatic rules.
The Progressive Anti-Brute-Force Engine: Rather than a static lockout, the ERP enforces mathematical exponential backoff:
  - Tier 0: 5 incorrect password attempts trigger a 30-second lock.
  - Tier 1: 4 more incorrect attempts trigger a 60-second lock.
  - Tier 2: 4 more incorrect attempts trigger a 120-second lock.
  - Tier 3+: Doubles continuously (240s, 480s...).
  - Success resets the counter and tier back to 0.
The Auto-Logout Rule (Session Expiry): The authentication token is stored inside an HttpOnly, SameSite=Strict cookie with a 12-hour lifespan. When you leave for the night, the session expires cleanly. The next morning, you must log in fresh.
The Invisible Bouncer (authGuard): Route protection middleware intercepts all private endpoints (`/api/v1/*`). If an unauthorized user navigates directly to Screen 4 (Projects) or Screen 7 (Payments), the API returns 401 and the frontend redirects to the login screen.

4. Forgot Password & Recovery Flow
When credentials are lost, the system supports a dual-channel recovery mechanism:
- Channel 1 (Online Email Reset): User enters their email on Screen 0. The system generates a 32-byte cryptographically secure token, stores its SHA-256 hash (valid for 1 hour), and dispatches a reset link.
- Channel 2 (Master Recovery Key): If the office internet is down or the email service experiences an outage, the user can provide their 16-character Master Recovery Key (generated during setup). The backend verifies the SHA-256 hash and immediately permits setting a new password.
- Email Enumeration Guardrail: The `/api/v1/auth/forgot-password` endpoint always returns HTTP 200 with a generic message regardless of whether the email exists in the database. Attackers cannot probe the system to determine admin email addresses.
