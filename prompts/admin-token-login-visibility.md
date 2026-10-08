# Show Admin Token Only for Admin Sign-In

## Goal

Show the administrator security-token field only when the user selects Administrator sign-in. Staff sign-in must not display, submit, or require an admin token.

## Findings

- The `Auth` form initializes its role to `staff` (except when opening an admin password-reset link), but currently renders the admin-token field for every sign-in.
- Client login passes the selected role to `/api/auth/login`.
- The server already validates the admin token for administrative login and rejects an admin token requirement for regular staff flow.

## Changes

1. Make the login role selectable between Staff and Administrator in sign-in mode only, defaulting to Staff.
2. Render the six-digit admin token field only when the selected role is Administrator.
3. Make the token input required only in Administrator mode; keep the existing six-digit submit validation for admins.
4. Do not send a token field for Staff mode. Preserve reset-link role initialization and all other login, registration, and recovery behavior.
5. Do not change the backend authentication contract or expose administrator configuration to the browser.

## Validation

- Run the client production build.
- Confirm the token is absent from the staff sign-in form and present/required in administrator sign-in.
- Confirm the selected role is the role submitted to the existing login API.
- Report unrelated existing lint issues separately if encountered.