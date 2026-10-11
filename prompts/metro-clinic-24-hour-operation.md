# Metro Clinic 24-Hour Operation

## Objective

Set Metro Family Care Centre to operate continuously, 24 hours a day, every day of the week.

## Existing behavior

- `server/index.js` seeds Metro Family Care Centre with hours `08:00 - 17:00`.
- PostgreSQL seed inserts use `ON CONFLICT (name) DO NOTHING`, so existing clinic rows retain their saved hours when defaults change.
- `client/app/page.tsx` also has clinic fallback data with Metro's daytime hours.
- `server/validation.js` already treats `Open 24 Hours` as continuously open when calculating clinic availability.

## Requirements

- Display Metro Family Care Centre's hours as `Open 24 Hours` in public and staff/admin clinic views.
- Update the server's default and client fallback data consistently.
- Ensure an existing PostgreSQL installation receives the Metro hours change; do not rely only on the insert for new databases. Keep the update targeted to Metro and avoid resetting unrelated clinic fields or records.
- Preserve existing status calculation behavior for other clinics. Add focused test coverage showing Metro's 24-hour hours are open at times across different hours and days, including weekends.
- Keep the change scoped to clinic hours and their directly related validation/tests.

## Verification

- Run `npm test --prefix server`.
- Run `npm run lint --prefix client` and `npm run build --prefix client`.
- Verify `/api/public-data` and clinic details report Metro's hours as `Open 24 Hours`; confirm its scheduled availability does not become closed overnight or on weekends.
- If a PostgreSQL-backed environment is unavailable, report that database persistence was not exercised.