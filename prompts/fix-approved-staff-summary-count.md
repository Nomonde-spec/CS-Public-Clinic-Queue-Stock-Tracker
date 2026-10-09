# Keep Approved Staff Summary Count in Sync

Make the admin dashboard's **TOTAL REGISTERED STAFF** value stay synchronized with the approved staff records shown in Staff Directory.

## Scope

- Update only the client-side summary value wiring in `client/app/page.tsx`.
- Use the existing server-loaded `approvedStaff` records as the source for the displayed count, counting records with role `staff` and status `approved` only. Exclude administrators and pending/rejected staff to preserve the current card subtitle and backend summary semantics.
- Keep the list updated through existing staff loading, creation, and approval flows. Do not introduce duplicate increment logic or new API requests.
- Leave the server summary endpoint and staff persistence unchanged unless implementation evidence proves they are incorrect.

## Acceptance checks

- Creating an approved staff account increases the dashboard count when that account appears in the approved staff list.
- Pending or rejected staff and administrator accounts do not increase the clinical staff count.
- Reloading staff records produces the same count as the records displayed in Staff Directory.
- Client lint and production build pass.