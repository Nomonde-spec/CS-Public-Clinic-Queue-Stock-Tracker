# Human-Readable Updated Time

## Objective

Replace long “Updated N minutes ago” labels with readable elapsed-time units.

## Existing anchor

- `formatUpdatedAt` in `client/app/page.tsx` currently always formats nonzero elapsed time in minutes.
- It is used for clinic details and medication update labels.

## Requirements

1. Keep “Updated just now” for timestamps less than one minute old.
2. Format elapsed time using the largest appropriate whole unit: minutes, hours, days, weeks, months, or years.
3. Use predictable duration boundaries: minutes under one hour, hours under one day, days under one week, weeks under 30 days, months under 365 days, and years thereafter. Use 30 days per month and 365 days per year.
4. Use singular/plural forms correctly, such as “1 hour ago” and “2 days ago”.
5. Preserve the existing prefix and avoid negative elapsed values for future timestamps.
6. Apply consistently to every existing `formatUpdatedAt` call site without changing timestamp sources or refresh behavior.

## Acceptance criteria

- A timestamp 9,220 minutes ago displays in days rather than minutes.
- Boundary values switch units at 60 minutes, 24 hours, 7 days, 30 days, and 365 days.
- Singular and plural labels are correct for each unit.
- Client lint and production build pass.