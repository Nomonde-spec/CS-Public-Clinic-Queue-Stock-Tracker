# Show Clinics for Medication Search Results

## Objective

When a public user searches for a medication, show the clinic or clinics that currently report that medication in stock.

## Existing behavior and data constraint

- Medication search uses `MedicationTable` in `client/app/page.tsx` and currently displays medication name, category, and overall availability only.
- `GET /api/public-data` returns medication rows with one global `stockCount` and a free-text `clinics` field.
- Staff stock updates currently replace that global quantity and store a label such as `Clinic Name: N in stock` in the text field. This cannot accurately represent multiple clinics or prove which clinics currently hold stock.
- Do not infer clinic availability from a global medication total, province, clinic status, seed order, or fabricated sample labels.

## Functional requirements

1. Represent medication stock per clinic as structured persisted data, with clinic identity, medication identity, non-negative integer quantity, and update timestamp. Use a composite uniqueness rule so each clinic has at most one stock record per medication.
2. Add an idempotent PostgreSQL migration and matching in-memory fallback support, preserving existing medication and clinic records.
3. Preserve existing stock records where their free-text `clinics` field unambiguously names exactly one existing clinic and contains a parseable quantity. Do not guess attribution for generic values such as `50 units in stock`, `All clinics`, or ambiguous text; leave those records unassigned until a clinic reports them.
4. Update the staff stock save flow so it writes the logged-in staff member's assigned clinic's quantity to the structured clinic-medication record. The server must continue enforcing clinic assignment/authorization on writes. Do not let one clinic's write overwrite another clinic's stock.
5. Return structured clinic availability for each medication through the existing public-data API. Each entry should include clinic name, province, address, numeric quantity, derived availability, and update timestamp. Derive availability using the existing thresholds: zero Out of Stock, 1–249 Low Stock, 250+ In Stock.
6. In public Medication Search results, keep medication name, category, and overall availability, and add an “Available at” column listing every clinic whose quantity is greater than zero. Show an explicit “No clinics currently report stock” state when none are available; do not list zero-stock clinics as available.
7. Ensure filtering happens before the existing four-result summary limit. Clinic names shown must correspond to the selected medication's actual structured stock records.
8. Keep homepage and clinic-detail compact medication summaries working; do not imply clinic-specific availability there unless those views consume the structured clinic-level records.
9. Add loading, empty, and recoverable error UI if the public medication availability records cannot be loaded. Prevent duplicate stock submissions while a write is active, following current UI patterns.

## Data migration and compatibility

- Keep the existing `/api/public-data` endpoint and JSON REST conventions.
- Keep legacy medication fields needed by existing admin summaries and staff UI during migration, but do not use the legacy free-text `clinics` value to claim clinic availability after the migration.
- Ensure in-memory and PostgreSQL results have the same shape and behavior.
- Do not hardcode clinic-medication availability for sample clinics. Unattributed legacy medication quantities should remain unassigned until staff report clinic-specific quantities.

## Tests and acceptance criteria

- Test migration/data behavior for an unambiguous legacy clinic label and generic/ambiguous legacy labels.
- Test clinic-scoped stock upsert, authorization, and that updating one clinic leaves other clinic quantities unchanged.
- Test stock thresholds per clinic at `0`, `1`, `249`, and `250`.
- Test public search returns only clinics with quantity greater than zero, includes multiple stocked clinics, and reports none when no clinic has stock.
- Test Medication Search filtering and four-row display limit while retaining category and the “Available at” column.
- Run server tests, client lint, and client production build.

## Scope guardrails

- Do not guess which clinic holds unassigned legacy stock.
- Do not change queue behavior, clinic opening-hours behavior, login/session design, or unrelated medication thresholds.
- Keep changes limited to structured clinic-medication inventory, its public search display, and necessary tests/migration.