# Fix Admin Active Clinic Queue List

Make the **Active Queue Wait Times by Clinic Node** panel show active clinics and their queue metrics.

## Scope

- Update only the active-clinic filtering and status badge in `AdminDashboard` in `client/app/page.tsx`.
- Queue statuses include values such as `Open - Low Wait`, `Open - Moderate Wait`, `Open - Long Wait`, and `Open - Longer Wait`; do not require status to equal exactly `Open`.
- Exclude clinics whose status is `Closed`, and include supported active/open status variants.
- Display the server-provided queue status in the badge, removing only the `Open - ` prefix when present. Preserve a sensible label for the legacy exact `Open` status.
- Keep showing each active clinic's name, estimated wait, and patient count. Do not change the queue model, API, or metrics calculation.

## Acceptance checks

- Clinics with `Open - Low Wait`, `Open - Moderate Wait`, `Open - Long Wait`, and `Open - Longer Wait` appear in the panel.
- Clinics with `Closed` status do not appear.
- The badge matches the published queue status rather than recomputing a different status from wait minutes.
- Client lint and production build pass.