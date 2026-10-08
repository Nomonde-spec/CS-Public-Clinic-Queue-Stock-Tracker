# Restore SMTP Email Delivery

## Goal

Replace Resend API delivery with SMTP for staff invitations and password-reset emails. Keep the client on Vercel and send all mail from the Node API service. SMTP can work only when the API host and plan permit outbound connections to the selected mail server and port; code changes cannot bypass Render network restrictions.

## Constraints

- Follow `AGENTS.md`, `PROJECT_CONTRACT.md`, and `client/AGENTS.md`.
- Keep the existing CommonJS Node HTTP server and email endpoints.
- Do not modify the real `server/.env`, print/copy credentials, or request secrets in chat.
- Preserve the current one-time reset-link fragment format, subjects and message content, invitation rollback behavior, and password-reset handling.
- Do not silently fall back to Resend or another email API.

## Required Changes

1. Replace the Resend SDK with Nodemailer and update `server/package.json` and `server/package-lock.json` accordingly.
2. Configure SMTP from server-only `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` values. Keep `PUBLIC_APP_URL` with the existing `CLIENT_ORIGIN` fallback for links.
3. Correctly support the common TLS modes: port 465 uses implicit TLS (`SMTP_SECURE=true`); port 587 uses STARTTLS (`SMTP_SECURE=false`). Allow other provider ports only when explicitly configured and supported by the deployment host. Require authentication username/password together when either is supplied.
4. Preserve safe error codes for logs and generic client-facing failure messages. Never log SMTP credentials, message bodies, or full provider responses.
5. Update `server/.env.example` and `README.md` for SMTP variable names, TLS/port pairing, Vercel frontend versus API mail ownership, and host egress requirements. Remove Resend-only variables and dependency references. Do not add usable credential examples.
6. Replace Resend-only unit tests with injected Nodemailer transport tests covering configuration, TLS options, message payloads, and network/auth failures. Tests must not send real email.

## Deployment Limitation

The previous deployment produced SMTP `ETIMEDOUT`/`ESOCKET` errors from Render. Confirm the target Render service plan permits outbound SMTP to the configured port before claiming hosted delivery works. If the plan blocks SMTP, document that the operator must use a plan/host that permits SMTP; do not claim an application change can remove that network restriction. Vercel serves the frontend and does not need SMTP variables.

The current local Gmail settings use port 587 with `SMTP_SECURE=true`, which is the wrong TLS pairing. Correct the example to port 587 with `SMTP_SECURE=false`; leave the real local `.env` untouched and tell the operator to update it themselves after rotating exposed credentials.

## Validation

- Run `node --test password-reset-email.test.js` and the complete server `npm test` suite.
- Verify no Resend package or API-specific environment names remain in server source/docs/examples.
- Report the exact Render environment variables and explain that SMTP delivery on Render depends on outbound-port access for the service plan.