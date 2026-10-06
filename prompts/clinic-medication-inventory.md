# Expand Medication Inventory Per Clinic

## Objective

Make at least 60 distinct medication names available in the public inventory for every clinic currently returned by the API. Inventory and stock quantity must be clinic-specific so one clinic's update cannot overwrite another clinic's stock for the same medication.

## Existing behavior and constraint

- `server/index.js` seeds nine clinics and only six medication records.
- The current `medications` table stores one row and one `stock_count` per medication name, plus a free-form `clinics` string. It cannot represent distinct quantities for the same medicine at different clinics.
- Public medication search, queue ticket validation, and staff stock updates currently consume that global medication record.

## Functional requirements

1. Provide at least 60 distinct medication names in the catalog and make each of those medicines present in the inventory for every existing clinic.
2. Store stock quantity and derived availability per clinic and medication. Derive availability on the server with the existing thresholds: 0 is Out of Stock, 1-249 is Low Stock, and 250+ is In Stock.
3. Update the public API and UI so a user can select a clinic and see/search the medication inventory and availability for that clinic. Preserve useful aggregate behavior where the UI does not have a selected clinic.
4. Staff stock updates must apply only to the staff member's assigned clinic. Admin updates must identify the clinic whose inventory is being changed. Validate ownership server-side for every write.
5. Medication queue/check-in validation must verify availability at the selected clinic, not a global medication row.
6. Migrate existing medication and stock data without losing it. Seed the additional catalog entries and per-clinic inventory idempotently so restarts do not create duplicates or reset existing reported quantities.
7. Preserve current medication names and flows, API-backed error handling, and unrelated clinic/queue behavior.

## Implementation guidance

Use the smallest normalized schema change that can represent a medication catalog and clinic-specific inventory (for example, a clinic-medication association keyed by clinic and medication). Extend the existing plain Node HTTP API and PostgreSQL migration/seed path; do not introduce a framework. Keep compatibility with the in-memory fallback. Populate the catalog with 60 or more distinct generic medication names and sensible categories; do not invent clinical dosing guidance.

## Acceptance criteria

- Every clinic returned by `/api/public-data` has at least 60 distinct medication inventory entries.
- The same medication can have different quantities/statuses at different clinics.
- Public clinic-specific searches show only that clinic's inventory values; global views remain clearly defined.
- Staff cannot update another clinic's medication inventory, including through direct API requests.
- Out-of-stock medication at one clinic is rejected for that clinic's collection request even if stocked at another clinic.
- Existing six medication records, queue flows, and staff/admin functionality remain operational after migration and restart.
- Relevant server tests and client build checks pass; tests cover inventory count, clinic scoping, status thresholds, and idempotent seeding/migration behavior.
