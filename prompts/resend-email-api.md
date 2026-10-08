# Replace SMTP Email Delivery with Resend API

## Goal

Replace Nodemailer SMTP delivery with Resend's HTTPS email API so password-reset and staff-invitation email work from the Render Free web service, where outbound SMTP ports are blocked.

## Repository context

- The Node backend uses CommonJS and is implemented in `server/index.js`.
- `server/password-reset-email.js` owns delivery for both password resets and staff invitations.
- `server/password-reset-email.test.js` contains the focused delivery tests.
- The two callers in `server/index.js` already handle delivery errors and should remain unchanged unless a minimal integration adjustment is required.
- Render Free blocks outbound traffic on SMTP ports 25, 465, and 587. Logs show `ETIMEDOUT` and `ESOCKET` with Gmail SMTP.

## Required changes

1. Replace Nodemailer with the official `resend` Node.js SDK, compatible with the existing CommonJS backend. Add the dependency and update the server lockfile; remove Nodemailer if no longer used.
2. Configure delivery with `RESEND_API_KEY`, `EMAIL_FROM`, and the existing `PUBLIC_APP_URL` (falling back to `CLIENT_ORIGIN` as today). Never hardcode or log provider credentials.
3. Keep `buildPasswordResetUrl`, including its token-in-fragment behavior, and preserve the current email recipient, subject, and plain-text content for both password reset and staff invitation messages.
4. Await the Resend API call and handle its `{ data, error }` result. Surface a safe actionable error to existing callers without exposing the API key or other secrets. Handle network-level failures as well.
5. Update `server/.env.example` with placeholders for the new variables and remove obsolete SMTP-only settings. Do not edit `server/.env` or include any real credentials.
6. Rewrite `server/password-reset-email.test.js` to verify configuration validation, reset URL behavior, reset/invitation content, provider invocation, and provider/network error handling using injected test doubles. Do not make network calls in tests.

## Boundaries

- Do not change authentication, database schema, staff invitation rollback behavior, frontend behavior, or unrelated API routes.
- Do not silently fall back to SMTP; Render Free cannot use the required outbound SMTP ports.
- A production `EMAIL_FROM` must use a domain verified in Resend. Document that the operator must set `RESEND_API_KEY` and `EMAIL_FROM` in the Render backend environment, and that the API key must remain server-side.
- Keep changes small and consistent with the existing CommonJS code and Node test runner.

## Validation

- Run `node --test password-reset-email.test.js` from `server/`.
- Run the complete server test command, `npm test`, from `server/`.
- Confirm no remaining Nodemailer usage in the server source or server package manifest.
- Report the exact Render variables and sender-domain verification prerequisite, without requesting that secrets be pasted into chat.