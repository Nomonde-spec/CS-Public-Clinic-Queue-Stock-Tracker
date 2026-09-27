# Show Closed Status in Clinic Directory

## Objective

Ensure directory cards show “Closed” when a clinic's status is Closed, even when its queue wait is zero.

## Existing anchor

- Clinic directory cards are rendered in `Clinics` in `client/app/page.tsx`.
- The current badge is derived from `clinic.wait !== null`, so a closed clinic with `wait: 0` renders “0m wait” instead of “Closed”.
- `getQueueLabel(clinic)` already normalizes server-provided clinic status and returns “Closed” for closed clinics.

## Requirements

1. Make the directory-card status badge prioritize `clinic.status === "Closed"` (or the shared `getQueueLabel(clinic)` result) over queue wait values.
2. When closed, show “Closed” instead of a “0m wait” badge and present the wait summary as closed/not accepting patients rather than a zero-minute estimate.
3. When open, preserve the current numeric wait badge and queue details.
4. Do not alter the server schedule calculation, opening-hours parsing, queue counts, or other clinic card content.

## Acceptance criteria

- A clinic with status `Closed` and wait `0` displays “Closed” in the directory card and does not display “0m wait”.
- Open clinics continue to display their queue wait as before.
- Client lint and production build pass; verify both statuses in the browser or a focused test.