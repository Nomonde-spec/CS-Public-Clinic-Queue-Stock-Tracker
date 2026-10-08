# CareQueue Public Clinic Queue and Stock Tracker

CareQueue lets public users check clinic queues and medication availability, request an anonymous queue ticket, and select multiple medications for one visit. Approved clinic staff manage ticket approval, service, and stock updates.

## Local Setup

1. Copy `server/.env.example` to `server/.env`.
2. Set a private PostgreSQL `DATABASE_URL` and private administrator values in `server/.env`.
3. Install dependencies and start both services:

```powershell
cd server
npm install
npm run dev
```

In another terminal:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:3000`. The API runs on `http://localhost:3001` by default.

## Verification

```powershell
cd server
npm test

cd ..\client
npm run lint
npm run build
```

Test stock boundaries `0`, `50`, `249`, and `250`. Medication quantity and availability are persisted server-side and remain unchanged until another authorized update or a served ticket deducts stock.

## Deployment Configuration

Deploy the client and API as separate services unless your host provides an equivalent reverse-proxy setup. Add environment variables in the hosting provider's service settings; do not upload `.env` files or expose server secrets to the client.

| Service | Variable | Production value |
| --- | --- | --- |
| Client | `NEXT_PUBLIC_API_URL` | Public base URL of the deployed API, for example `https://api.example.com` |
| API | `DATABASE_URL` | Private PostgreSQL connection URL |
| API | `CLIENT_ORIGIN` | Exact public client origin, for example `https://carequeue.example.com` |
| API | `PORT` | Use the port injected by the hosting provider; do not hardcode a local port |
| API | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_TOKEN` | Unique administrator credentials/token stored as server-only secrets |
| API | `PUBLIC_APP_URL` | Public client URL used to build reset and invitation links |
| API | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | Mail host and port; use `465` with secure `true`, or `587`/`2525` with secure `false` |
| API | `SMTP_USER`, `SMTP_PASSWORD` | SMTP credentials stored only as backend secrets |
| API | `SMTP_FROM` | Sender address accepted by your mail provider |

Set `NEXT_PUBLIC_API_URL` before building the client because Next.js embeds this public URL in the client build. Configure `CLIENT_ORIGIN` to exactly match the browser-visible client origin, including `https://` and any non-default port. For multiple client origins, use comma-separated `CLIENT_ORIGINS`. In local development, the API defaults to `http://localhost:3000` as its allowed origin and may use in-memory data if PostgreSQL is unavailable; production requires a valid database URL and configured client origin and will stop instead of falling back to volatile storage.

Password-reset and staff-invitation email is sent by the API service over SMTP; Vercel only hosts the frontend and does not need SMTP variables. Keep SMTP credentials on the backend and never add them to the client or a `NEXT_PUBLIC_` variable. Configure the port/TLS pair supported by your provider (`465` with `SMTP_SECURE=true`, or `587`/`2525` with `SMTP_SECURE=false`). Brevo uses `smtp-relay.brevo.com` and an SMTP login/key, not an API key. Gmail requires an App Password when two-step verification is enabled. The API host must permit outbound connections to the selected SMTP port. Render Free blocks ports `25`, `465`, and `587`; check your service's network policy before relying on hosted SMTP.

After changing environment variables, rebuild/redeploy the client and restart the API. Verify the public clinic data loads, a queue or stock update persists after a restart, requests from the deployed client origin succeed, and reset/invitation links use the deployed client URL. Never test or publish with credentials that have been exposed.

## Release Notes

- Patient accounts are not required; ticket access uses an anonymous capability token.
- Queue metrics are derived from active ticket status.
- Multiple medications can be selected on one ticket.
- Stock is deducted only once when a ready ticket is served at or after its scheduled server time.
- Real credentials must never be committed. Use environment variables and rotate any credentials that have been exposed.
- Password hashing, durable sessions, role middleware, and full audit-log browsing remain documented future enhancements. This deployment configuration work does not complete those security requirements; do not treat the application as production-secure until the required authentication/session controls are implemented.