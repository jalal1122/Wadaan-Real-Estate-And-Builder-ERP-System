1. What You See (The Interface)
The entry point is designed to be completely private, clean, ultra-fast, and secure.
The Look: A minimalist page with the Wadaan Real Estate logo centered on the screen.
The Inputs: Only a single 4-digit numeric PIN input (or 4 discrete pin boxes). No username or email typing is required.
The Actions: A "Login" button (or auto-submit upon entering the 4th digit) and a "Forgot PIN?" link.
The "No Sign-Up" Rule: Because this is Wadaan’s private financial system, random visitors cannot create an account. There is no "Register" or "Sign Up" button. Your single master account is initialized via the Module 0.5 Go-Live wizard or the one-time `/api/v1/auth/setup` endpoint.

2. What the System Remembers (The User Record)
Behind the scenes, the system securely tracks key operational and cryptographic details:
- Full Name: The primary administrator's formal name (e.g., "Muhammad Jalal").
- Email Address: Stored as the designated recovery email for OTPs and system alerts (not required on the login screen).
- Scrambled PIN (pinHash): The system never stores the plain-text PIN. It hashes it using bcrypt with 12 salt rounds so even database administrators cannot view the PIN.
- Failed Attempts Counter: Tracks consecutive incorrect PIN submissions.
- Lockout Tier: An escalation counter that tracks how many times the lockout threshold has been triggered.
- Lockout Expiry Timestamp: Replaces static boolean flags. If non-null and in the future, login attempts are mathematically rejected with HTTP 429.
- Master Recovery Key (Hashed): A SHA-256 hash of your 16-character emergency offline recovery key.
- Password/PIN Reset Token & Expiry: A SHA-256 hash of the active 1-hour reset token and its expiration date.
- Last Login Time: Records the exact timestamp of your last successful authentication.

3. Business Rules & Security Guardrails
Since this software holds Wadaan's bank balances and client data, the login screen acts like a bank vault door with strict automatic rules.
The Progressive Anti-Brute-Force Engine: Because a 4-digit PIN has 10,000 combinations, progressive mathematical backoff is strictly enforced:
  - Tier 0: 5 incorrect PIN attempts trigger a 30-second lock.
  - Tier 1: 4 more incorrect attempts trigger a 60-second lock.
  - Tier 2: 4 more incorrect attempts trigger a 120-second lock.
  - Tier 3+: Doubles continuously (240s, 480s...).
  - Correct PIN entry resets the failed counter and tier back to 0.
The 15-Minute Auto-Logout Rule (Session Expiry): Following high-security banking standards, the authentication token is stored inside an HttpOnly, SameSite=Strict cookie with a **15-minute** lifespan. If left idle at the desk, the session expires cleanly and locks the ERP.
The Invisible Bouncer (authGuard): Route protection middleware intercepts all private endpoints (`/api/v1/*`). If an unauthorized user or expired session tries to access Screen 4 (Projects) or Screen 7 (Payments), the API returns 401 and the frontend redirects to the PIN screen.

4. Forgot PIN & Recovery Flow
When the 4-digit PIN is forgotten, the system supports a dual-channel recovery mechanism:
- Channel 1 (Online Email Reset): User clicks "Forgot PIN?" and enters their registered recovery email. The system generates a 32-byte cryptographically secure token, stores its SHA-256 hash (valid for 1 hour), and dispatches a reset link.
- Channel 2 (Master Recovery Key): If the office internet is down or the email service experiences an outage, the user can provide their 16-character Master Recovery Key (generated during setup). The backend verifies the SHA-256 hash and immediately permits setting a new 4-digit PIN.
- Email Enumeration Guardrail: The `/api/v1/auth/forgot-password` endpoint always returns HTTP 200 with a generic message regardless of whether the email exists in the database. Attackers cannot probe the system to determine admin email addresses.
