# Preserve Login Across Refresh

Keep the current logged-in staff or administrator interface after a page refresh in the same browser tab.

## Scope

- Update client auth state handling in `client/app/page.tsx` only.
- After successful server login, persist the minimal identity needed to restore the existing client session: role, name, email when returned, and assigned clinic when returned.
- Use `sessionStorage` so the state survives reloads in the same tab and is cleared when the tab session ends.
- Restore only valid `staff` or `admin` role records, then navigate to the existing role-specific landing view.
- Clear the stored identity on logout.
- Never persist passwords, administrator tokens, reset tokens, or other credentials.
- Keep server login as the only way to create a stored authenticated identity. Do not introduce local-storage persistence, new tokens, cookies, API endpoints, or server middleware in this change.
- Preserve existing public/reset-password routing and avoid server/client hydration mismatches while restoring state.

## Limitation

This is client session-state persistence only. The current login API does not issue a session token, and this change does not provide server-side session validation or authorization. Document this limitation; secure session/token management and role-based server middleware remain outside the current phase.

## Acceptance checks

- Successful staff login survives refresh and restores the staff landing view and assigned clinic.
- Successful administrator login survives refresh and restores the administrator dashboard.
- Logout clears the session and refresh returns to the public portal.
- Missing, malformed, or invalid stored state is ignored safely.
- Passwords and administrator tokens are not written to browser storage.
- Client lint and production build pass.