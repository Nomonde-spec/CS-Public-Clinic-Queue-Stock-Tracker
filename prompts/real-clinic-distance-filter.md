# Real Clinic Distance Filter

## Objective

Replace the clinic directory's hard-coded sample distance values with distances calculated from the visitor's current browser location and each clinic's verified coordinates. Distance means straight-line (great-circle) distance, not driving distance.

## Existing anchors

- The public clinic directory and radius selector are in `client/app/page.tsx` (`Clinics`).
- Client clinic records currently use hard-coded `distance` values, and the homepage and directory display those values.
- `GET /api/public-data` in `server/index.js` returns clinic records without coordinates.
- The PostgreSQL and in-memory clinic records are seeded in `server/index.js`. Existing clinic addresses are sample data and must not be used to guess coordinates.
- The server is plain Node `http`; keep the current architecture and JSON API.

## Functional requirements

1. Add nullable numeric latitude and longitude fields to clinic records and return them through the public-data API. Keep both PostgreSQL and in-memory behavior consistent; add an idempotent schema migration for existing databases.
2. Use verified clinic coordinates supplied by the requester. Never geocode placeholder addresses, infer coordinates from province/district, or leave sample distances presented as real measurements.
3. When the visitor chooses a finite distance radius, request browser geolocation as part of that interaction. Do not request location on initial page load or when “All clinics” is selected.
4. Do not apply a finite radius or claim distances until the visitor's location is available. After permission is granted, calculate great-circle distance in miles between the visitor's coordinates and each clinic's valid coordinates. Use the same calculation for displayed distances and radius filtering, and sort results nearest-first.
5. Keep the existing radius options and make their semantics apply to calculated distances, not seed values. “All clinics” must remain usable without location permission and must include clinics whose coordinates are unavailable, clearly marked as distance unavailable.
6. When a radius is active, do not include clinics without valid coordinates as though they were within range. Explain that some clinic locations cannot be measured. Invalid or out-of-range coordinates must be treated as unavailable.
7. Handle geolocation states accessibly: not requested, locating, available, permission denied, unavailable, and unsupported. Provide a recoverable retry action if permission is denied or location is unavailable; other directory filters must remain usable.
8. Remove hard-coded distance values from user-facing distance labels, including the homepage clinic cards and directory cards. Do not label sample values as real distance.
9. Preserve clinic search, status, wait-time filters, loading behavior, responsive layout, and existing public queue/clinic-detail flows.

## Data and privacy

- Do not persist the visitor's location, send it to the API, or store it in browser storage. Keep it in page memory only.
- Validate clinic coordinates as finite latitude/longitude values within geographic bounds before using them.
- For existing clinics without verified coordinates, keep coordinates `null` and show “Distance unavailable”.
- Do not add a geocoding/maps provider or require a third-party API key.

## Tests and acceptance criteria

- Add focused tests for the great-circle distance calculation, including identical points, a known reference distance, and invalid coordinates.
- Verify radius filtering at its boundaries and ensure unknown-coordinate clinics are excluded for a finite radius but visible for “All clinics”.
- Verify denied/unsupported geolocation leaves the directory usable and displays no fabricated distances.
- Verify `GET /api/public-data` returns coordinate fields from both the PostgreSQL schema and in-memory fallback.
- Ensure all clinics intended to show real distances are assigned verified coordinates before calling the feature complete. Do not substitute guessed/demo values.
- Run the focused tests and client lint/build checks available in the repository.

## Scope guardrails

- Do not implement road-route distance, address geocoding, a map provider, or unrelated map redesign.
- Do not change queue, medication, authentication, or clinic ownership behavior.
- Keep changes limited to clinic coordinate data exposure, client-side location/distance calculation, the directory/homepage distance presentation, and relevant tests.