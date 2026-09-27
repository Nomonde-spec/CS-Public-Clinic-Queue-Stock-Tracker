# Province-Based Clinic Filter

## Objective

Replace the currently unavailable distance-radius filter with a province filter, since clinic coordinates have not been supplied.

## Existing anchors

- The public clinic directory and its distance selector are in `client/app/page.tsx` (`Clinics`).
- Clinic records already contain a `province` string.
- The current distance implementation requests browser geolocation, but the seeded and database clinic records have null coordinates.
- Public clinic cards currently show “Distance unavailable” where sample miles used to appear.

## Functional requirements

1. Replace the distance-radius selector in the public clinic directory with a province selector, defaulting to “All provinces”.
2. Populate province choices from the clinic records, de-duplicated and sorted alphabetically.
3. Filter the clinic list by the selected province while preserving clinic-name/district search, wait-time filtering, status filtering, clear filters, and clinic details navigation.
4. Remove the browser geolocation request and its permission/error/retry UI from this directory flow. Province selection must not ask for device location.
5. Replace distance-unavailable labels in public clinic cards and the homepage with the clinic's province, without implying that province is a mileage measurement. Avoid duplicating province if it is already clearly shown in the same label.
6. Update directory copy to describe filtering by province, wait time, and status rather than distance.
7. Keep the existing map placeholder and its queue wait information unchanged.
8. Leave the nullable clinic coordinate API/schema support in place for a later distance implementation when verified coordinates are available.

## Acceptance criteria

- Selecting a province shows only clinics in that province; “All provinces” restores all province matches.
- Province options are derived from clinic data and include newly added clinic provinces.
- Clear filters resets province to “All provinces” and resets the other existing filters.
- The public directory does not request browser location.
- Public cards show the actual recorded province, not a fabricated distance.
- Client lint/build and existing distance/server tests pass.

## Scope guardrails

- Do not estimate miles from province names or province centers.
- Do not modify clinic records, queue data, medication behavior, or the backend coordinate migration.
- Keep the change limited to the public location filtering and presentation.