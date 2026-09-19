# Queue Check-In and Automatic Progression

## Objective

Add anonymous patient queue check-in after a patient selects a preferred clinic. Every clinic must have an independent queue. Patients request a queue number, receive a specific service time estimate, and can monitor the ticket until it is served, missed, expired, or otherwise completed. Queue count and estimated waiting time must be derived by the server from queue records; staff must no longer manually edit those two values.

## Existing anchors

- Client public clinic selection and detail flow: `client/app/page.tsx`, `ClinicDetails`, `selectedClinic`.
- Public data refresh: `GET /api/public-data` every 10 seconds.
- Current manual queue writes: `PATCH /api/clinics/:name` and `StaffOperationsPanel`.
- Server entry point and PostgreSQL schema setup: `server/index.js`.
- Server currently keeps `clinics.patients` and `clinics.wait`; retain compatibility fields in public responses while making their values derived from queue state.
- Development database is PostgreSQL through `server/.env`; preserve the in-memory fallback for local operation and tests.

## Functional requirements

1. After selecting a preferred clinic and opening its details, a public patient can request a queue number when the clinic is open.
2. The server creates a queue ticket for that clinic and returns:
   - an opaque ticket id;
   - the clinic name;
   - a display queue number unique within the clinic for the active operating-day queue;
   - ticket status (`waiting`, `called`, `served`, `missed`, or `expired`);
   - an allocated `scheduledAt`/service time;
   - current queue position where applicable;
   - derived clinic `patients` and `wait` values.
3. Each clinic has its own independent queue and numbering sequence. A ticket at one clinic must never affect another clinic's count, position, number, or wait.
4. Allocate one fixed service slot per queue number using a clearly named server constant/configuration, for example `QUEUE_SLOT_MINUTES`, with a sensible development default. The next ticket's scheduled time is based on the last active ticket for that clinic, not on client clocks.
5. Queue metrics are server-derived:
   - current waiting count is the number of active `waiting` tickets for that clinic;
   - estimated wait is the number of waiting tickets ahead of a new/current ticket multiplied by the slot duration, rounded to whole minutes;
   - public clinic data must expose these derived values and must not use staff-submitted `patients`/`wait` values as truth.
6. Add a public ticket/status endpoint so a patient can refresh their ticket and see progression. Do not require a patient account. Use the opaque ticket id plus a non-guessable access token or equivalent capability for ticket-specific mutations.
7. A patient can cancel/leave their waiting queue. Leaving must mark the ticket completed/cancelled and immediately reduce the clinic count and derived wait for the remaining tickets.
8. When a ticket is called, it becomes `called` for a bounded call window. If the patient does not complete service within that window, the server marks it `missed`/`expired`; it must no longer count as waiting. A missed/expired ticket cannot be resumed or reused.
9. A patient with a missed/expired ticket must request a new queue number and start again. The UI must clearly provide that action.
10. Queue progression must be automatic. The server must advance due tickets based on server time and the configured slot/call window whenever queue state is read or changed. Do not depend on a browser tab, client timer, or staff manually changing patient counts.
11. Provide a staff-facing operational view for the assigned clinic that shows the derived queue, current ticket/next ticket, and actions needed to call/complete/miss a ticket. Staff may operate the queue but cannot directly enter patient count or estimated wait.
12. Preserve staff clinic ownership checks on every queue mutation. A staff member must only operate tickets for their assigned clinic; administrators may operate all clinics. Public reads may show aggregate clinic queue status but must not expose another patient's access token.
13. Apply this to every clinic returned by the platform, including clinics created later. Do not hard-code only the seeded Metro clinic.

## Suggested API contract

Keep the JSON REST style and plain Node `http` implementation. Exact naming may follow existing conventions, but document the final contract in code comments or project documentation.

- `GET /api/public-data`: return clinics with server-derived `patients`, `wait`, and queue metadata such as `nextQueueNumber` or `queueUpdatedAt`.
- `POST /api/clinics/:name/queue-tickets`: public check-in; validate clinic exists and is open; return ticket and capability data.
- `GET /api/queue-tickets/:id?token=...`: return the caller's ticket state and derived position/time.
- `POST /api/queue-tickets/:id/leave`: capability-authorized patient leave/cancel.
- `POST /api/queue-tickets/:id/call`: assigned staff/admin call the next eligible ticket.
- `POST /api/queue-tickets/:id/complete`: assigned staff/admin mark a called ticket served.
- `POST /api/queue-tickets/:id/miss`: assigned staff/admin mark a called ticket missed; automatic expiry must also be supported.

Use consistent `400`, `403`, `404`, `409`, and `503` responses for invalid requests, ownership violations, missing tickets, duplicate/invalid transitions, and unavailable/closed clinics.

## Data model direction

Add a migration-safe `queue_tickets` table or equivalent with at least:

- UUID/id;
- clinic foreign key;
- operating-day or queue-session identifier;
- per-clinic queue number;
- status;
- scheduled service timestamp;
- called timestamp and call expiry timestamp where needed;
- served/left/missed timestamps;
- hashed capability token, never the raw token;
- created timestamp and useful indexes.

Use a transaction and row locking/advisory locking when allocating the next number and service slot so concurrent check-ins cannot receive duplicate numbers or the same slot. The in-memory fallback should implement the same behavior sufficiently for local development and focused tests.

## Client work

- Update `ClinicDetails` to present a check-in control only for open clinics.
- Add loading, disabled duplicate-submission, empty/error, and recoverable retry states for every queue request.
- Show the returned queue number prominently, allocated service time, current position, current clinic waiting count, and estimated wait.
- Poll the ticket status while active, but treat server responses as authoritative.
- Show leave/cancel while waiting, a clear called/served state, and a missed/expired state with a new check-in action.
- Keep selected clinic context when transitioning into the ticket view.
- Remove or disable staff inputs that manually edit patient count and estimated wait; replace them with queue operation controls and derived metrics.
- Keep the existing public clinic directory and medication workflows working.

## Server and compatibility work

- Add server-side queue derivation helpers and unit tests for slot allocation, position, status transitions, missed expiry, and clinic isolation.
- Update `GET /api/public-data` and all staff/admin summaries to use derived queue metrics.
- Keep legacy clinic `patients`/`wait` columns only as compatibility output or migrate them carefully; never accept client values as authoritative queue metrics.
- Avoid storing patient secrets in browser-visible public data.
- Do not introduce Express or a new authentication system.
- Do not use JWT for anonymous patient tickets unless the existing project explicitly needs it; a random capability token stored hashed server-side is sufficient.

## Required tests and verification

- Two simultaneous check-ins at one clinic receive different sequential numbers and slot times.
- Check-ins at different clinics have independent numbering and counts.
- A waiting ticket's derived position and wait decrease when the ticket ahead leaves or is served.
- Called tickets transition to served or missed; expired/missed tickets cannot be served or reused.
- A missed ticket requires a new check-in.
- Unauthorized staff cannot call, complete, miss, or otherwise mutate another clinic's ticket.
- Closed clinics reject new check-ins.
- Public clinic data reports derived queue count/wait after joins and leaves.
- Existing stock threshold tests and staff/admin workflows still pass.
- Run server tests, client lint/build, and a manual browser flow: choose each of at least two clinics, request a number, leave or complete it, and verify the other clinic is unchanged.

## Scope guardrails

Do not add patient accounts, payments, notifications, maps, or future enhancements. Do not change medication behavior. Keep edits limited to queue ownership, API, persistence, client check-in/status UI, staff queue operations, tests, and necessary documentation.
