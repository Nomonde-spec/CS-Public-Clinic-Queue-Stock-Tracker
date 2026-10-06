# Separate Patient Queue From Medication Dispensing

## Objective

Patients request an anonymous queue ticket without selecting or associating a medication. Staff manage queue state independently, dispense the medication actually provided using a clinic-scoped quantity transaction, and staff/admin can add received stock.

## Inspected implementation anchors

- `client/app/page.tsx`: `PatientQueue` renders medication checkboxes and includes selected names in queue creation; `MedicationCollectionTickets` filters for medication-linked tickets and combines call/serve actions; `StaffStockpileController` updates an absolute quantity; `AdminMedications` manages the global inventory view.
- `server/index.js`: `createQueueTicket` validates medication stock; `settleDatabaseTicket` and `collectMemoryTicketMedication` deduct one requested unit when serving; queue routes include the patient-supplied medication payload; `clinic_medications` is the clinic-scoped stock source; `PATCH /api/medications/:name` sets absolute quantity.
- `server/queue.js`: queue ticket creation/public serialization contain medication fields, and serving eligibility depends on medication collection state.
- `server/validation.js`: `parseStockCount` validates non-negative integer quantities and `getAvailability` derives the existing thresholds.
- `server/validation.test.js`: covers ticket lifecycle and medication-on-ticket behavior; replace obsolete assertions and add separation/stock transaction cases.
- There is no stock audit/history table or event log today.

## Required behavior

### Patient queue

1. Remove medication selection, checkboxes, medication status, and collection language from `PatientQueue`.
2. Patient sees current waiting count, estimated wait, and a `Get Queue Number` action; no sign-in, patient account, identity, or personal details are requested.
3. Queue creation accepts no medication and ignores/rejects legacy medication fields. It issues a unique queue number and returns only queue-management data.
4. Waiting count and estimate derive from active queue tickets and update after ticket creation, call, serve, leave, or miss.
5. Queue tickets and public ticket responses carry no medication names, dispense quantities, or patient personal data.

### Staff queue and dispensing

1. The staff queue lists all active clinic tickets, not only medication-linked tickets.
2. Keep the lifecycle `waiting -> called -> served`; calling and serving a ticket must not read or modify medication stock.
3. Provide a separate staff dispensing section with the assigned clinic's medication list, a positive whole-number quantity input, and `Dispense Medication` confirmation.
4. Dispensing decrements only the chosen clinic-medication row by the requested quantity, atomically; reject insufficient stock without changing the ticket or inventory. A dispense request must not include or persist a patient ticket identifier.
5. Immediately reflect the updated quantity and derived availability in the staff and public views.

### Restocking

1. Add a clinic-scoped additive restock operation and staff UI; admins can select a clinic in the admin inventory UI.
2. A restock quantity is a positive whole number and is added to existing stock (for example, 20 + 50 = 70), not treated as a replacement quantity.
3. Keep the existing clinic-specific absolute quantity correction only if still needed, but do not use it for the `Restock` action.
4. Derive status on the server with existing thresholds: 0 Out of Stock, 1-249 Low Stock, 250+ In Stock.
5. No audit/history system currently exists; do not add one unless required for a correct transaction. Do not link inventory changes to queue ticket IDs.

## API and persistence

- Queue ticket `POST /api/clinics/:name/queue-tickets` must work with an empty/no-medication body and return an anonymous ticket.
- Staff serving action changes ticket status only. Remove medication deduction from `settleDatabaseTicket`, the memory fallback, and the `complete` ticket action.
- Add clinic-scoped stock endpoints, e.g. `POST /api/clinics/:name/medication-dispenses` with `{ medication, quantity }` and `POST /api/clinics/:name/medication-restocks` with `{ medication, quantity }`.
- Use a database transaction and a conditional stock update for dispense so concurrent requests cannot make quantity negative; return updated quantity and derived status. Mirror behavior in the in-memory backend.
- Add a migration removing medication association/collection-state columns from `queue_tickets` (`requested_medication`, `medication_collected`, `collected_at`) so new and existing tickets no longer retain medication details. Keep ordinary lifecycle timestamps such as `served_at`.
- Preserve per-clinic inventory with at least 60 distinct medicine names per clinic, and preserve the existing clinic search, public stock search, staff/admin login views, and dashboards.
- No new patient authentication or personal data fields.

## Authorization boundary

The existing project has no trusted server-side staff session/role middleware; clinic names supplied by the current client cannot prove staff identity. Keep this feature within the existing auth scope unless an explicit scope change is approved, and do not claim that clinic ownership is enforced against forged direct API requests. The UI should still scope staff operations to the assigned clinic.

## Acceptance tests

1. Creating a ticket with no medicine produces a unique ticket, increases waiting count, and computes a wait; creating a ticket does not change any inventory row.
2. Waiting tickets appear in staff queue; call and serve update queue state/count without stock changes.
3. Dispensing quantity N decrements only the selected clinic's stock by N and derives the correct status; insufficient stock, zero, negative, fractional, or malformed quantities leave inventory unchanged.
4. Restocking quantity N adds N to the current clinic-specific count and derives the correct status.
5. Dispensing/restocking at one clinic does not change the same medicine at another clinic.
6. Ticket payloads/schema contain no medication or patient personal data; legacy medication request fields are not accepted or returned.
7. Existing clinic search, queue status, staff/admin login, and all 60-per-clinic inventory views continue to work.
8. Run server tests and client build; exercise the complete patient-ticket -> staff-call -> staff-dispense -> staff-serve flow in the in-memory backend. If PostgreSQL is available, also exercise transactional stock updates there.
