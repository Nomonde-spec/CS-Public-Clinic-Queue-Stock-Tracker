# Credential-Driven Admin Token Prompt

## Goal

Remove the manual Staff/Administrator selector. The server determines the account role from the submitted credentials. Staff sign in with email and password; admins see the security-token field only after the server verifies their password and requests the token.

## Current behavior

- The login form has a Staff/Administrator selector and displays the token when Administrator is selected.
- The login API already identifies administrator accounts from server-side configuration/database and validates the admin token.
- The API currently combines password and token validation, so the client cannot know when to reveal the token field.

## Required behavior

1. Remove the role selector. The initial sign-in form submits email and password with no role selector and no token field.
2. Staff credentials continue through the current staff authentication path and log in without a token.
3. For an admin account, the server must verify that the email identifies an admin and the password is correct before returning a distinct response such as HTTP `428` with code `ADMIN_TOKEN_REQUIRED` when no token was provided.
4. A wrong password must return a generic authentication failure and must not reveal that the email belongs to an administrator.
5. When the client receives `ADMIN_TOKEN_REQUIRED`, preserve the entered email/password, reveal the required six-digit token field, and retry using the admin role and entered token.
6. A missing or invalid token must not authenticate. Do not trust a client-supplied role to bypass server-side account lookup, password checks, or token validation.
7. Preserve pending/rejected staff behavior, registration, password recovery, reset-link role handling, and the existing successful login responses. Remove UI error text that asks users to select a role.
8. Keep all admin email/token configuration server-only; do not add `NEXT_PUBLIC_` variables or expose admin records.

## Tests and verification

- Add focused tests for the server-side admin login stages: wrong password does not request a token; correct admin password without token requests it; correct token succeeds; invalid token fails.
- Verify staff login remains one-step and does not request a token.
- Run the full server test suite and client production build.
- Do not edit local `.env`, commit, or push.# Credential-Driven Admin Token Prompt

## Goal

Remove the staff/admin role selector from login. The user enters email and password first; the server determines account role. Show the admin security-token field only after the server confirms that valid administrator credentials require the token.

## Current behavior

- The login UI currently offers a role selector and shows the token field when Administrator is selected.
- The API already identifies admin accounts from server-side configuration/database and validates `ADMIN_TOKEN`.
- The API currently combines password and token failure into a generic invalid-credentials response, so the UI cannot know when to reveal the token field.

## Required behavior

1. Remove the role selector from the login UI; the initial login is a staff-style request with email and password and no token field.
2. On the server, identify an admin from existing server-side configuration/database, verify the password first, and only then return a distinct `ADMIN_TOKEN_REQUIRED` response when the token is missing. Do not reveal that an email is an admin before its password is valid.
3. When the client receives that response, preserve email/password, switch the UI to the admin-token step, and display a required six-digit token field. Retrying submits the admin role and entered token through the existing login endpoint.
4. Staff login remains one step, sends no token, and never displays the token field. Pending/rejected staff behavior remains unchanged.
5. A wrong admin password must not reveal that the account is an admin. A wrong/missing token after the challenge must not authenticate.
6. Preserve admin reset-link role handling, registration, forgot-password, and reset-password flows. Do not expose administrator email, token, or other server configuration to the browser.

## Implementation scope

- Update `client/app/page.tsx` for the two-step challenge flow and conditional token control.
- Update `server/index.js` for the credential-first admin-token challenge without changing the established endpoint or weakening server-side checks.
- Add focused tests for the server challenge behavior where the existing test structure allows, and update any existing auth tests.
- Do not edit local `.env`, commit, or push.

## Validation

- Run focused server tests and the complete server test suite.
- Run the client production build.
- Verify staff credentials authenticate in one step with no token; admin valid email/password prompts for a token; wrong admin password does not reveal the challenge; valid admin token completes login; incorrect token fails.