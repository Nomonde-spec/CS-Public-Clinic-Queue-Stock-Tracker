# Fix Medication Form Reset

Fix the medication creation form error shown after a successful submit: `Cannot read properties of null (reading 'reset')`.

## Scope

- Update only the medication creation submit handler in `client/app/page.tsx`.
- Capture the form element before awaiting `onCreateMedication`, then reset that captured element only after the API-backed operation succeeds.
- Preserve the current recoverable error behavior: failed API writes must leave form values intact and show the server error.
- Do not change the medication data model, server API, catalog behavior, or unrelated form UI.

## Acceptance checks

- Successful medication creation clears the form and closes the create form without a client-side reset error.
- Failed medication creation preserves the entered values and displays the failure message.
- Client lint and production build pass.