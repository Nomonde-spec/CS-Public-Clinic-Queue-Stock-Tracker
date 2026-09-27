# Show Clinics as Closed Outside Business Hours

## Objective

Show a clinic's public status as “Closed” whenever the current local time is outside its published opening hours, and prevent public queue check-in during those closed periods.

## Existing anchors

- Clinic `hours` and `status` are returned by `GET /api/public-data` in `server/index.js`.
- Public status is currently replaced by queue-derived status in the public-data response.
- `createQueueTicket` currently checks the stored clinic status but does not verify current business hours.
- Clinic hours are represented as text, including formats such as `08:00 - 17:00`, `Mon - Fri: 8:00 AM - 6:00 PM`, and `Open 24 Hours`.
- All represented clinic provinces are in South Africa. Use `Africa/Johannesburg` as the authoritative schedule timezone, independent of server/browser timezone.

## Functional requirements

1. Add a small shared server-side schedule utility that parses the supported current hours formats and evaluates the clinic's local weekday/time in `Africa/Johannesburg`.
2. Treat schedules as open at the listed start time and closed at the listed end time. A `Mon - Fri` schedule is closed on weekends. `Open 24 Hours` is open every day.
3. For a clinic with valid recognized hours, derive the public effective status as `Closed` outside scheduled opening hours. During operating hours preserve the existing queue-derived status and explicit stored `Closed` state.
4. Do not persist time-derived open/closed state to the database; derive it from the current time for each public response. Keep stored staff-managed status intact.
5. Enforce the same schedule check in `createQueueTicket` using server time and return the existing consistent `409` closed response when outside operating hours, even if stored status is open.
6. If a clinic has missing or unsupported hours, do not invent a schedule. Preserve the current stored/queue-derived public status and check-in behavior for that clinic.
7. Keep public UI status badges and ticket controls consuming the server's effective status. Ensure existing periodic public-data refresh makes the displayed status change around opening/closing times without requiring a page reload.
8. Do not change clinic hours strings, queue estimates, medication behavior, or staff authorization rules.

## Tests and acceptance criteria

- Test weekday opening, just before opening, exactly at opening, just before closing, exactly at closing, weekends, and `Open 24 Hours`.
- Test that conversion uses `Africa/Johannesburg` regardless of host timezone.
- Test public effective status is `Closed` outside hours and retains queue/stored status during operating hours.
- Test a new queue ticket is rejected outside hours and allowed inside hours when other existing checks pass.
- Test unsupported hours retain existing behavior.
- Run server tests, client lint, and client production build.

## Scope guardrails

- Do not mutate stored clinic status on a timer or add background jobs.
- Do not infer hours from province, address, or clinic name.
- Keep the change limited to schedule interpretation, public effective status, check-in enforcement, and focused tests.