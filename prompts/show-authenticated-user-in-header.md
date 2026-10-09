# Show Authenticated User Details in Header

Replace the hard-coded admin header identity with details for the account that actually logged in, and show consistent identity details for staff.

## Scope

- Update the login response in `server/index.js` to return the authenticated admin's display name and email, along with the existing role; preserve the staff identity fields already returned.
- Update client auth state and the header props in `client/app/page.tsx` so the signed-in user's name and email are shown in the header. Show the assigned clinic for staff and the Administrator role for admin accounts.
- Restore and persist the same non-secret identity details through the existing same-tab `sessionStorage` flow.
- Replace the hard-coded `sys.admin@carequeue.gov` value. Never display another account's identity when the current login returns a different email.
- Do not store passwords or administrator tokens. Do not add new session/authentication mechanisms or unrelated UI changes.

## Acceptance checks

- An administrator header shows the name and email returned for the logged-in administrator and the role label.
- A staff header shows the logged-in staff name, email, and assigned clinic.
- A refresh retains the same displayed identity; logout clears it.
- Existing admin token and staff approval checks continue to work.
- Server tests, client lint, and client production build pass.