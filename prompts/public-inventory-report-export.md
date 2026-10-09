# Public Inventory Report Export

Implement the existing **Generate public inventory report** action in the admin dashboard as a downloadable PDF.

## Scope

- Modify only the existing admin dashboard behavior in `client/app/page.tsx` unless a small helper is needed by established project conventions.
- Export the `medicationData` already passed to `AdminDashboard`; do not add an API endpoint or alter persistence.
- Generate a downloadable PDF using jsPDF and its table plugin. Include a report title, generated date, and a readable table with medication name, category, stock count, server-provided availability, clinic reporting context, and update time when available.
- Use only fields present in the supplied data. Preserve the current server-derived availability value; do not derive or mutate stock status in the browser.
- Provide a meaningful `.pdf` filename and ensure long reports paginate with table headers repeated and page numbers included.
- Keep the action usable on repeated clicks. If there is no inventory data, provide a clear recoverable message rather than downloading an empty report.
- Keep the existing dashboard layout and styling conventions; avoid unrelated changes.

## Acceptance checks

- Clicking the button downloads a valid PDF with one row per supplied medication record.
- Long medication names and optional clinic/update fields render without clipping or malformed rows.
- Long reports paginate, repeat the table header, and show page numbers.
- An empty inventory produces a visible message and no empty download.
- Existing server tests, client lint, and client production build continue to pass.

## Validation

Install only the required PDF dependencies, run the focused client lint and production build, and manually verify the downloaded PDF layout, pagination, and empty inventory state.