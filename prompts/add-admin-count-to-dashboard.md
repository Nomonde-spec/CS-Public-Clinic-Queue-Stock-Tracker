# Show Administrator Count

Show the number of active administrator accounts alongside the approved staff count on the admin dashboard.

## Scope

- Update the dashboard summary in `client/app/page.tsx` only.
- Derive the administrator count from the existing `approvedStaff` list, counting entries with role `admin`; do not add an API request or server count.
- Keep the existing approved clinical staff count and add a clearly labeled administrator count in the same summary card.
- Include active/approved accounts only, matching the existing `approvedStaff` source; do not count pending or rejected accounts.
- Preserve the rest of the dashboard summary and staff directory behavior.

## Acceptance checks

- The card visibly shows separate counts for approved clinical staff and active administrators.
- Adding or removing an approved administrator updates the count through the existing directory state.
- Pending or rejected accounts are excluded.
- Client lint and production build pass.