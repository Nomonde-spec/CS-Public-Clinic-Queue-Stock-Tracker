# Production Staff Password Recovery With SMTP

## Objective

Make approved staff and administrator accounts recoverable on the deployed site through one-time emailed password-reset links/tokens. Existing approved accounts with the `managed-by-portal` placeholder must be able to set a real password without disabling password verification or exposing reset tokens in production API responses.

## Inspected implementation anchors

- `server/index.js` has `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`.
- Reset tokens are generated with `createResetToken`, stored as hashes in `password_reset_tokens`, and expire after 30 minutes.
- Development responses currently return the raw token; production returns a message saying email delivery is not configured.
- `server/password.js` hashes passwords with scrypt and verifies only that format.
- Database inspection found approved staff accounts with `password_hash = 'managed-by-portal'`; those accounts cannot authenticate until a real password is set. Other approved accounts have scrypt hashes.
- The server is a plain Node HTTP API. `server/package.json` currently depends on `pg`; no mail transport is configured.

## Requirements

1. Add SMTP email delivery using Nodemailer (or the repository's chosen approved mail library) for password-reset links/tokens.
2. Add documented environment variables to `server/.env.example`: SMTP host, port, TLS/secure mode, username, password, and sender address. Never print or commit credentials; production values must be entered through the API host's environment configuration.
3. Keep forgot-password responses non-enumerating: the same public response for existing, missing, pending, or ineligible accounts. Never include the raw token in a production response.
4. Generate a cryptographically random one-time token, store only its hash and expiry, email the reset URL/token only to eligible approved staff/admin accounts, and invalidate it after use or expiry.
5. If SMTP is not configured or delivery fails, do not claim that recovery email was sent. Invalidate any newly-created token and return a generic recoverable error without exposing account existence.
6. Reset must validate email/token/password, require a password of at least 6 characters (up to 256), update `password_hash` with scrypt, and consume the token atomically so it cannot be reused.
7. Existing placeholder accounts must not be granted access automatically. They become usable only after the owner follows the emailed reset flow and sets a real password.
8. Preserve login checks for account role/status and admin email/token configuration. Do not weaken password verification, add default/shared passwords, or auto-promote pending staff.
9. Update the existing auth UI to show a generic reset-request confirmation, recoverable delivery errors, and a token/password form reached from the emailed link. Do not display production tokens in the browser.
10. Keep local development usable without exposing secrets in chat or logs. Local token display may remain development-only if it is clearly separated from production behavior.

## Acceptance tests

- Existing approved scrypt accounts can request a reset and can authenticate with the new password after consuming a valid token.
- Approved placeholder accounts can set a password only with a valid emailed reset token; placeholder hashes never authenticate.
- Pending/rejected or nonexistent accounts receive the same public forgot-password response and are not enabled.
- Tokens are one-time and expire; expired/reused tokens cannot change credentials.
- Missing SMTP configuration or a simulated send failure returns a recoverable generic error and leaves no valid token.
- Production responses never include the token; logs do not include tokens, passwords, hashes, or SMTP secrets.
- Existing server test suite and client build pass.

## Deployment steps required after implementation

Set SMTP environment variables on the API deployment (not `NEXT_PUBLIC_*` client variables), verify sender/domain setup with the provider, and redeploy/restart the API. Existing approved users then request their own reset from the production login page; support staff must not ask them to send tokens or passwords over chat.
