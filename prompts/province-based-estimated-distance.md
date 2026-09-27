# Province-Based Estimated Distance Filter

## Objective

Restore a distance-radius filter using the visitor's browser location and the province recorded on each clinic card. Since exact clinic coordinates are not available, calculate an explicitly approximate straight-line distance to a documented representative reference point for that province.

## Existing anchors

- The public clinic directory is `Clinics` in `client/app/page.tsx`; it currently filters by province.
- Each clinic record includes a `province` field and nullable exact `latitude` / `longitude` fields.
- `client/app/distance.js` already provides validated great-circle distance and radius-filter helpers.
- Current clinic points are null, so they cannot be used for exact clinic distances.

## Functional requirements

1. Replace the province selector with the previous finite distance-radius options and an “All clinics” option. Default to “All clinics”.
2. Selecting a finite radius requests browser geolocation at that time. Do not request location on page load or for “All clinics”.
3. Use the clinic's recorded `province` to look up a representative reference point. Use a documented mapping of South African provinces to their provincial capital/reference coordinates; do not infer a point from the clinic name/address.
4. Calculate great-circle distance in miles from the visitor's coordinates to the mapped province reference point. These are province-level estimates, not distances to the clinic itself.
5. Display estimated distances consistently in the public homepage clinic cards and directory cards. Label the value “Approx. X mi to [province] reference point” (or equivalent clear concise language); never present it as exact clinic distance.
6. Apply the same estimated distance used in the displayed label to radius filtering and nearest-first sorting. Include clinics at the selected radius boundary.
7. If a clinic's province is missing or unsupported by the reference-point map, show “Distance estimate unavailable” and exclude it from finite-radius results. “All clinics” must still include it.
8. Handle geolocation success, permission denial, unavailable location, and unsupported browsers accessibly. Keep directory search, wait-time/status filters, Clear filters, clinic details, and the queue map working. Provide retry and “Show all clinics” recovery where applicable.
9. Do not transmit or persist visitor coordinates. Keep them in client memory only.
10. Keep the exact clinic coordinate API/schema fields intact for future exact-distance support; when valid exact clinic coordinates are present, prefer them over province reference coordinates and label them as clinic-coordinate distance rather than province estimate.

## Acceptance criteria

- Selecting a finite radius requests geolocation and filters/sorts by the computed province-reference estimate.
- The displayed approximate distance matches the value used for filtering.
- Selecting “All clinics” works without location permission and includes unsupported/missing province reference points.
- Unknown provinces never receive invented distances.
- Distance helper tests cover same-point zero distance, known great-circle mileage, radius boundary inclusion, unsupported province behavior, and missing/invalid coordinates.
- Client lint/build and server regression tests pass.

## Scope guardrails

- Do not describe province-reference estimates as actual clinic distances or road travel distances.
- Do not introduce geocoding or a maps provider/API key.
- Do not change queue, clinic status, medication, or staff workflows.