# Deployment Readiness Implementation Prompt

## Goal

Make the existing CareQueue application deployable as separate Next.js client and Node.js HTTP API services backed by PostgreSQL, without assuming a specific hosting provider. The client must call the deployed API, the API must allow the deployed client origin, production must not silently lose persistence, and password-reset/invitation links must use the deployed public URL.

## Constraints

- Follow `AGENTS.md`, `PROJECT_CONTRACT.md`, and `client/AGENTS.md`.
- Preserve the existing Next.js client, plain Node `http` server, PostgreSQL, and JSON REST architecture. Do not add frameworks or provider-specific infrastructure because no provider was specified.
- Do not implement future enhancements outside the current contract, including a new authentication/session system.
- Never read, print, copy, commit, or place real credentials in source, tests, prompts, logs, or documentation. Do not edit local `.env` files or attempt to rotate credentials; tell the operator which exposed credentials must be rotated.
- Keep existing user changes and unrelated files intact.

## Findings To Address

1. The browser API base uses `NEXT_PUBLIC_API_URL` when configured and otherwise falls back to the current origin. The Next.js rewrite also depends on `NEXT_PUBLIC_API_URL`.
2. The server CORS allowlist comes from `CLIENT_ORIGINS` or `CLIENT_ORIGIN`, currently with a localhost development fallback.
3. When PostgreSQL is missing or fails to connect, the server currently switches to in-memory data. This is useful for local development but unsafe in production because writes are not durable.
4. Email reset/invitation links use `PUBLIC_APP_URL`, with `CLIENT_ORIGIN` as a fallback. Localhost values are not valid for deployed links.
5. Review the committed environment examples for credential-like values and replace them with unmistakable placeholders; retain safe localhost defaults only where clearly labeled for local development.
6. The server listens on `process.env.PORT` with a development default; preserve support for the hosting provider's injected port.

## Implementation

1. Make environment configuration explicit and consistent across client, server, and email delivery. Keep `NEXT_PUBLIC_API_URL` as a client build-time setting and document that it must be the API's public base URL when services use separate origins.
2. Ensure CORS accepts the configured deployed client origin(s), supports comma-separated origins if already intended, rejects unrelated origins, and does not expose secrets. Keep localhost behavior for local development.
3. Preserve in-memory fallback for local development, but make production startup fail with a clear, sanitized error if `DATABASE_URL` is absent or PostgreSQL cannot be reached. Do not include connection strings or credentials in logs.
4. Ensure `PUBLIC_APP_URL` is documented and used as the deployed client base URL for email links. Document the SMTP settings needed for email delivery, including that SMTP auth credentials are server-only and that the username/password must be configured together when used.
5. Update `.env.example` files and `README.md` with provider-neutral local and deployment instructions, the frontend/backend environment-variable split, build-time versus runtime variables, database requirements, CORS origin configuration, and email configuration. Use placeholders, never usable-looking secrets.
6. Add or update focused tests for production database configuration failure behavior and any changed environment parsing. Reuse existing test files/helpers where practical.

## Acceptance Criteria

- A production build with a configured `NEXT_PUBLIC_API_URL` targets the API service rather than silently sending requests to the frontend origin.
- The API accepts requests only from configured client origins, including a deployed HTTPS origin.
- In production, missing or unreachable PostgreSQL prevents startup instead of silently selecting memory storage; local development fallback remains available.
- Reset and invitation URLs use the configured deployed public app URL.
- Environment examples contain no real or credential-like values and make local-only values clear.
- Documentation gives the operator an actionable, provider-neutral deployment checklist and never suggests putting secrets in the frontend.
- Run server tests, client lint, and client production build. Report exact results and any external deployment settings that cannot be verified locally.

## Out Of Scope

- Choosing or configuring a hosting provider, creating provider-specific manifests, deploying services, or changing DNS.
- Rotating credentials or modifying any real `.env` file; provide the operator a concise rotation checklist instead.
- Reworking authentication, session persistence, or unrelated application features.