# Prevent Invalid Medication Selection Before Serving

Prevent the staff queue workflow from selecting or submitting medication quantities that exceed clinic stock.

## Scope

- Update only the medication-selection and Serve controls in `StaffOperationsPanel` in `client/app/page.tsx`.
- Disable medication checkboxes when that medication has zero stock.
- Keep quantity controls as positive whole numbers, capped by the current clinic stock. Prevent the Serve action when any selected quantity is invalid, non-integer, or above available stock.
- If an already-selected medication becomes unavailable or its stock changes, prevent serving until the selection is corrected.
- Preserve the server as the source of truth: do not weaken stock validation or scheduled-service checks in `server/index.js` or `server/validation.js`.
- Preserve the existing server error feedback when a request is rejected for a race or other server-side condition.
- A ticket may still be served without medication selected when its scheduled service time has arrived.

## Acceptance checks

- Zero-stock medicines cannot be selected.
- Quantities of `1` through the available stock can be selected; zero, fractional, and over-stock quantities cannot be served.
- Invalid selections leave the ticket unchanged and show actionable feedback.
- A valid serve request removes the ticket only after the server confirms success.
- Client lint and production build pass; existing queue and stock tests pass.