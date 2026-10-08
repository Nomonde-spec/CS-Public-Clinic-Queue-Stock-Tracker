# Resolve Server Merge Markers

## Goal

Repair the committed merge-conflict markers that make Render's `npm install` fail with `EJSONPARSE` and prevent the server mailer/tests from parsing.

## Scope

1. Resolve conflict markers in `server/package.json`, `server/package-lock.json`, `server/password-reset-email.js`, and `server/password-reset-email.test.js`.
2. Preserve the selected SMTP implementation using Nodemailer; remove the Resend dependency and all Resend-only branches/configuration.
3. Preserve SMTP validation for paired credentials and correct TLS modes (`465` secure; `587` or `2525` non-secure), plus existing safe delivery diagnostics and message content.
4. Preserve the invitation setup-link text when a temporary password is absent, adapting its test to the injected SMTP transport.
5. Regenerate `server/package-lock.json` from the resolved server manifest by running `npm install` in `server/`.
6. Replace any credential-like values in tracked `server/.env.example` with safe placeholders. Do not read, print, copy, or edit the real `server/.env`; remind the operator to rotate exposed credentials.

## Constraints

- Preserve unrelated committed client/authentication changes and all unrelated user work.
- Do not commit or push changes.
- Keep the existing Node HTTP server and test runner; do not introduce another mail provider.

## Validation

- Confirm there are no merge-conflict markers in tracked source/configuration files.
- Confirm `server/package.json` parses and Nodemailer is the only mail-provider dependency.
- Run `npm test` from `server/`.
- Run the client production build only if resolution touches client files; this repair should not.
- Report that Render must deploy the resulting clean commit before retrying.