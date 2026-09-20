# Medication-Specific Queue Requests

## Objective

Allow a patient to request a queue number for a specific medication when it is their turn to collect that medication. The feature must use the same queue ticket model already in place, but add a medication-focused request flow for collection rather than general clinic arrival.

## Existing anchors

- Queue model and public check-in logic already exist in `server/index.js`, `server/queue.js`, and the public ticket flow in `client/app/page.tsx`.
- The app already supports public clinic queues and medication stock visibility.
- Clinic and medication data are read from the server and refreshed frequently.
- The existing queue ticket pattern uses anonymous patient tickets with a hashed capability token and clinic-scoped queue numbering.

## Functional requirements

1. A patient can select a clinic and a medication that is available for collection.
2. When it is that patient's turn to collect the medication, the system issues a queue number specifically for medication collection for that clinic and medication.
3. The request is tied to the clinic's queue, not a separate global queue. The same clinic queue rules still apply: each patient keeps their place in order and wait estimates are derived from queue state.
4. If the medication is not available or is out of stock, the patient should not be issued a collection ticket and should see a clear message.
5. A patient can request a collection ticket only when the clinic is open and the selected medication is valid for that clinic's inventory.
6. The queue number and expected collection time must be derived server-side from the active ticket list, using the same service-slot logic already used for clinic queue tickets.
7. A patient can leave a medication collection queue only while waiting, and the system must reduce the queue in the same way as standard queue leave behavior.
8. If a patient has already received a medication collection ticket, the UI must clearly show they are in the queue and prevent duplicate submissions while the request is active.
9. The created ticket should carry enough context to identify both the clinic and the medication, while still using the existing anonymous queue capability flow.
10. The public UI should clearly communicate: medication selected, queue number, people ahead, expected wait, and next collection window.

## API contract

Keep the existing JSON REST style and plain Node `http` server without introducing a new framework.

- `POST /api/clinics/:name/medication-queue-tickets`
  - Public request body: `{ medication: "Name of medication", token?: "optional" }` or equivalent request metadata.
  - Validates clinic exists, clinic is open, and medication exists in that clinic's visible inventory.
  - Returns a ticket with the medication context and the usual public queue metadata.
- `GET /api/queue-tickets/:id?token=...`
  - Reuse the same ticket retrieval flow; if the ticket includes medicine context, return that additional field in the payload.
- `POST /api/queue-tickets/:id/leave`
  - Reuse the current capability-based leave flow.
- Staff/admin queue operations continue to work for the underlying ticket lifecycle.

## Data model guidance

- Reuse the existing `queue_tickets` model rather than creating a disconnected medication queue table.
- Add a medication identifier or medication name to the ticket payload so the server can identify the requested medication for collection.
- Preserve the existing queue-number and scheduling behavior.
- Keep medication status derivation server-side based on `stockCount` and keep threshold logic unchanged.

## Client work

- Update the public clinic/medication detail flow to let a patient choose a medication and request a collection queue number.
- Add loading, empty, and recoverable error states for the medication queue request.
- Prevent duplicate medication queue submissions while the request is active.
- Display the medication request state on the clinic detail page using the same queue-card style as the standard queue feature.
- Show the ticket status and queue progression for medication collection, including a clear message when the patient is called or it is their turn to collect.
- Ensure the flow still works when switching between clinics and medications without losing clinic context.

## Server work

- Validate that the selected medication exists and is available before creating the ticket.
- Reject invalid, empty, or unavailable medication selections with a clear `400` or `409` response.
- Keep the same clinic ownership checks and capability validation rules already used by the queue ticket flow.
- Ensure medication collection queue state remains tied to the clinic queue and is reflected in the derived queue metrics.
- Preserve compatibility with the current in-memory fallback and PostgreSQL-backed implementation.

## Acceptance criteria

- A patient can request a queue number specifically for a medication collection when the medication is available.
- The queue is clinic-specific and derived from live queue records.
- A patient cannot request a collection queue for an unavailable medication.
- The public UI shows the medication being requested and the resulting queue status.
- Existing public queue behavior still works without regressions.
- Relevant server tests and client build checks pass.

## Scope guardrails

- Do not add patient accounts, payment flows, or notifications.
- Do not overbuild a second queue system; extend the existing queue model.
- Do not change the existing medication threshold rules or clinic queue semantics beyond the new medication collection flow.
- Keep the change limited to queue ownership, API behavior, public customer flow, and necessary validation/tests.
