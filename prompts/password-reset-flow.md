# Password Reset Flow

## Objective

Implement a real, secure password reset flow so staff and admin users can recover access without using a placeholder alert. The change must include server-side hashing, a reset-token flow, and client UI updates that let a user request and complete a reset.

## Existing anchors

- The app already has a staff/admin authentication flow in `server/index.js` and the login form in `client/app/page.tsx`.
- Staff records are stored in the `staff` table with `email`, `password_hash`, `role`, `clinic_id`, and `status`.
- There is no password reset capability yet, and current placeholder strings like `managed-by-portal` are still used in the seed data.
- The server uses plain Node HTTP, JSON APIs, and PostgreSQL. No backend framework should be added.

## Functional requirements

1. Passwords must be stored as secure hashes rather than plaintext or placeholder strings.
2. Staff/admin login must verify the provided password against the stored hash server-side.
3. A user can request a password reset by entering their email address.
4. The server generates a one-time reset token and stores it in a secure, time-limited way.
5. The user can use that token to set a new password through a reset form.
6. Reset tokens must expire after a short window and become unusable once used.
7. The system must reject invalid emails, missing passwords, weak or empty reset inputs, and reused or expired tokens.
8. The UI must show clear loading and recovery states, as well as prevent duplicate submissions while a request is in progress.

## API contract

Use the existing JSON REST style and plain Node HTTP server.

- `POST /api/auth/forgot-password`
  - Request body: `{ email: "user@example.com" }`
  - Validates the account exists and is active.
  - Returns a success message even for unregistered emails, unless a stricter product requirement is explicitly approved.
  - Produces a one-time reset token or an equivalent proof-of-reset value and includes it in the response payload for local demo use.

- `POST /api/auth/reset-password`
  - Request body: `{ email: "user@example.com", token: "<token>", password: "NewSecurePass!2026" }`
  - Validates token and expiry.
  - Replaces the stored hash and clears the reset token.
  - Returns a success result only when the password was genuinely changed.

- `POST /api/auth/login`
  - Continues to authenticate staff/admin with the secure hash check instead of the old placeholder behavior.

## Data model guidance

- Add a dedicated reset-token table or equivalent server-side record for password recovery if needed.
- Keep reset-token values ephemeral and hashed before storing.
- Preserve the existing `staff` table and status model; do not add unrelated user-account concepts.
- Remove placeholder password seeds in the database bootstrap so approved staff/admin accounts are created with hashed values.

## Client work

- Update the login/auth card in `client/app/page.tsx` to replace the placeholder forgot-password action with a working flow.
- Add a request form for the email and a reset form for token/password entry.
- Show loading, empty, and error states for the forgot-password and reset actions.
- Prevent duplicate submissions while either call is active.
- Keep the existing show/hide password toggle and ensure the password reset flow matches the current styling system.

## Server work

- Implement secure password hashing and verification helpers in a new `server/password.js` module.
- Use those helpers for all login and password reset operations.
- Validate and normalize email addresses before hashing and reset-token lookups.
- Ensure admin and staff credentials are verified from the server, with the status check still enforced for staff approval.
- Keep the existing clinic ownership and authorization rules unchanged.
- Preserve compatibility with the current in-memory fallback and PostgreSQL-backed implementation.

## Acceptance criteria

- A staff or admin user can request a password reset from the login form.
- A reset token is generated and accepted only within the approved expiry window.
- A password reset successfully changes the stored hash and allows the user to sign in with the new password.
- A wrong password or invalid token is rejected with a clear error.
- The existing logs and auth role flow still work without regressions.
- The password reset regression test passes and the client build succeeds.

## Scope guardrails

- Do not add a new auth framework or session system.
- Do not add unrelated user-profile features.
- Do not change the queue or medication logic beyond what is needed for the auth fix.
- Keep the reset flow small, testable, and aligned with the current product contract.
