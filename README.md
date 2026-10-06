token:123123
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
node --test validation.test.js

cd ..\client
npm run lint
npm run build
```

Test stock boundaries `0`, `50`, `249`, and `250`. Medication quantity and availability are persisted server-side and remain unchanged until another authorized update or a served ticket deducts stock.

## Release Notes

- Patient accounts are not required; ticket access uses an anonymous capability token.
- Queue metrics are derived from active ticket status.
- Multiple medications can be selected on one ticket.
- Stock is deducted only once when a ready ticket is served at or after its scheduled server time.
- Real credentials must never be committed. Use environment variables and rotate any credentials that have been exposed.
- Password hashing, durable sessions, role middleware, and full audit-log browsing remain documented future enhancements and must be completed before production deployment.