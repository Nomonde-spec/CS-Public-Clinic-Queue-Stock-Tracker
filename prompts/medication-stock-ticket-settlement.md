# Medication Stock Settlement at Ticket Service Time

## Objective

Update the existing anonymous patient queue flow so selecting a medication reserves it on the ticket without changing stock. Deduct exactly one unit only when the ticket is eligible to be served at or after its server-side scheduled time and staff successfully marks it served/dispensed. Preserve the current public clinic, medication, ticket, staff, and admin workflows.

## Existing implementation anchors

- Server queue model and helpers: `server/queue.js`
- HTTP routes, PostgreSQL schema, in-memory fallback, and ticket actions: `server/index.js`
- Existing tests: `server/validation.test.js`
- Public ticket UI and medication selection: `client/app/page.tsx`, `PatientQueue`
- Staff queue/collection UI: `MedicationCollectionTickets` and `StaffOperationsPanel` in `client/app/page.tsx`
- Existing action routes:
  - `POST /api/clinics/:name/queue-tickets`
  - `GET /api/queue-tickets/:id?token=...`
  - `POST /api/queue-tickets/:id/leave`
  - `POST /api/queue-tickets/:id/call`
  - `POST /api/queue-tickets/:id/complete`
  - `POST /api/queue-tickets/:id/miss`

## Required behavior

1. Ticket creation accepts a selected medication, validates that it exists and has positive stock, and stores the medication name on the ticket. It must never decrement stock.
2. Use a fixed server configuration `QUEUE_SLOT_MINUTES = 3` for each patient service slot. Keep service timestamps in PostgreSQL `TIMESTAMP WITH TIME ZONE` and use the server/database clock for eligibility checks.
3. Keep the current API-compatible status vocabulary where practical:
   - `waiting`: requested and waiting for its allocated service time;
   - `called`: ready/being served by staff;
   - `served`: completed and, when applicable, medication dispensed;
   - `left`: patient cancellation before service;
   - `missed`: no-show/expired ticket.
   Document the mapping to the requested lifecycle (`REQUESTED -> WAITING -> READY/SCHEDULED -> SERVED`, with cancelled/expired/no-show terminal outcomes).
4. A ticket can be completed only when:
   - its current status is `called` (or the existing ready transition has made it `called`);
   - its `scheduled_at` is less than or equal to the current server/database time;
   - it has not already been served or medication-collected.
   Reject early completion with HTTP `409` and leave stock and ticket state unchanged.
5. `leave`, `miss`, and automatic expiry/no-show before the scheduled time must not decrement stock. Terminal tickets cannot later be served.
6. A served ticket must be idempotent: repeated completion requests must not decrement medication again. The ticket’s persisted `medication_collected` flag and `collected_at` must reflect the one successful deduction.
7. If requested medication stock is zero at service time, do not mark the ticket served and do not decrement below zero. Return a clear recoverable `409` response so staff can resolve the stock issue.
8. Queue count and wait must remain derived from active ticket statuses. Staff must not manually enter patient counts or estimated wait values. Public clinic data and ticket responses must reflect joins, leaves, served tickets, missed tickets, and expiry automatically.
9. Do not add patient login or registration. Continue using the opaque ticket capability token for anonymous patient ticket reads and leave/cancel operations.

## Database design and migration

Extend the existing `queue_tickets` table migration-safely with fields needed for settlement/audit if they do not already exist:

- `requested_medication VARCHAR(255)` and a foreign-key relationship to the medication record only if it can be added without breaking existing seed/data behavior;
- `medication_collected BOOLEAN NOT NULL DEFAULT FALSE`;
- `collected_at TIMESTAMP WITH TIME ZONE`;
- `served_at TIMESTAMP WITH TIME ZONE`;
- `cancelled_at TIMESTAMP WITH TIME ZONE`;
- `missed_at TIMESTAMP WITH TIME ZONE`.

Use the existing medication record as the source of stock. Do not duplicate the stock quantity on a ticket. Add indexes useful for clinic/date/status and scheduled-time lookups. Preserve the in-memory fallback with equivalent state and behavior for local development/tests.

Note and handle any existing schema incompatibility encountered while implementing (the current `queue_tickets.clinic_id` declaration must remain compatible with the existing `clinics.id` type and deployed data). Do not wipe production/development data or introduce a separate ORM/framework.

## Atomic PostgreSQL settlement

Create a small server helper for serving/dispensing a ticket and use it from the completion route. The helper must run one transaction:

1. `BEGIN`.
2. Select the ticket row `FOR UPDATE`, including clinic, medication, status, scheduled time, and collection fields.
3. Use the database/server time, not a browser-provided timestamp, to verify `scheduled_at <= NOW()`.
4. Reject invalid terminal/status/early-service states with a `409` before changing either record.
5. Lock/select the medication row `FOR UPDATE` or perform a conditional update that is safe under concurrency.
6. For a medication ticket, atomically decrement only when `stock_count > 0`, derive availability from the resulting quantity (`0` Out of Stock, `1-249` Low Stock, `250+` In Stock), and require one returned row. If no row is returned, roll back and return insufficient stock.
7. Update the same ticket to `served`, set `served_at`, `medication_collected`, and `collected_at` in the same transaction. The update condition must include the expected current status and `medication_collected = FALSE` so duplicate requests cannot settle twice.
8. `COMMIT`; on every error `ROLLBACK`.

For medication-free tickets, still use the locked ticket transition and mark it served without a medication update. Never decrement inventory in ticket creation, polling, cancellation, expiry, or a failed completion.

Implement equivalent serialized behavior for the in-memory fallback, preferably by guarding the ticket mutation and medication mutation in one synchronous operation. Add a testable `now`/clock seam in helpers where needed, but production route decisions must use server time.

## API behavior

Keep existing routes so the current client continues to work. Ensure responses include the ticket status, scheduled time, requested medication, medication collection state, and derived queue metrics.

- `POST /api/clinics/:name/queue-tickets`: validate medication and create ticket only; stock unchanged.
- `GET /api/queue-tickets/:id?token=...`: refresh ticket from server; trigger only safe automatic expiry/state derivation, never stock deduction.
- `POST /api/queue-tickets/:id/leave`: allow only active waiting tickets; set `left` and cancellation timestamp; no stock change.
- `POST /api/queue-tickets/:id/call`: allow staff/admin queue operation according to existing authorization; do not deduct stock; do not bypass scheduled-time rules for completion.
- `POST /api/queue-tickets/:id/complete`: use the atomic settlement helper; require current server time to be at/after scheduled time; return `409` for early, terminal, duplicate, or insufficient-stock cases.
- `POST /api/queue-tickets/:id/miss`: set `missed` only from an active waiting/called ticket; no stock change.

Use the project’s current plain Node `http` server and existing authorization conventions. Do not expose capability tokens in public clinic data.

## Queue lifecycle and derivation

Update `server/queue.js` and server queries so active queue metrics count only `waiting` and `called` tickets. Once a ticket is `served`, `left`, or `missed`, it no longer contributes to patients waiting or people ahead. Automatic expiry must mark an unattended called ticket `missed` and must not settle medication. A ticket scheduled in the future remains waiting until it is called/ready; the completion route is still guarded by the persisted scheduled timestamp.

Use one fixed three-minute slot when allocating tickets and calculating displayed position/wait. Do not calculate eligibility from the client’s displayed time. Preserve clinic isolation and queue-number uniqueness under concurrent PostgreSQL check-ins by retaining the existing clinic transaction/row lock and strengthening it where necessary.

## Frontend changes

In `client/app/page.tsx`:

- Keep medication selection before the public ticket request.
- Make the ticket response authoritative for scheduled time, position, wait, status, and medication state.
- Continue polling active tickets, but do not deduct or simulate stock in the browser.
- Show clear waiting, ready/called, served/dispensed, cancelled/left, missed/no-show, early-service, and insufficient-stock messages.
- Disable duplicate ticket, leave, and staff action submissions while requests are active.
- Keep the leave action available only for an active waiting ticket and provide a new-ticket action for terminal tickets.
- In the staff collection view, expose completion/serve only through the existing server action and show recoverable errors when the service time has not arrived or stock is insufficient.
- Remove any UI behavior that treats a failed API write as successful or locally decrements medication.
- Keep clinic directory, public medication search, staff authorization, and admin workflows working.

## Tests

Extend `server/validation.test.js` and add focused server tests/helpers as appropriate for:

- ticket creation with medication leaves stock unchanged;
- fixed three-minute scheduling for multiple patients;
- selected medication is preserved on the ticket;
- cancellation/leave before schedule leaves stock unchanged;
- missed/no-show/expired before schedule leaves stock unchanged;
- completion before `scheduledAt` is rejected using the supplied server-time test clock;
- completion at or after `scheduledAt` decrements exactly one unit and derives availability at `0`, `50`, `249`, and `250` boundaries;
- repeated completion of the same ticket does not decrement twice;
- two concurrent/simulated completion attempts cannot decrement the same ticket twice;
- insufficient stock prevents serving and never creates negative stock;
- served, left, and missed tickets are excluded from queue counts and wait;
- queue numbers and stock are isolated by clinic;
- existing queue progression, token protection, and stock validation tests continue to pass.

Run:

- `cd server; node --test validation.test.js`
- `cd client; npm run lint`
- `cd client; npm run build`

Also manually verify: select Paracetamol, create a ticket, confirm stock is unchanged, cancel before its service time, create a second ticket, attempt early completion, then complete at/after its scheduled time and confirm exactly one stock unit is removed after refreshing public data.

## Scope guardrails

Do not add patient accounts, registration, payments, notifications, maps, Express, an ORM, or a new authentication/session system. Do not refactor unrelated staff/admin behavior. Preserve existing queue/ticket API compatibility and the in-memory fallback while making the server transaction the source of truth.
