# Previous Button on Every Page

## Objective

Add a consistent Previous control to each app page so users can return to the last in-app view they visited.

## Existing anchors

- Navigation is managed by the `view` state and `navigate` function in `client/app/page.tsx`; it does not use one URL per view.
- Public, staff, and admin views have separate shared headers.
- The login view has its own `Auth` component.
- Clinic details currently have a hard-coded “Back to clinic directory” button.

## Requirements

1. Maintain an in-app view history and expose a Previous action across public, staff, admin, login, and clinic-detail pages.
2. Previous must return to the prior visited in-app view, not a fixed destination. Preserve relevant context when returning, including the selected clinic and existing search/filter query where applicable.
3. On the first view in a session, render the control disabled or otherwise clearly unavailable; do not navigate to an invented page.
4. Prevent loops or duplicate history entries when navigating to the already-active view. Handle logout and role transitions without exposing protected views to public users.
5. Replace the clinic detail page's fixed “Back to clinic directory” behavior with the same Previous action, while preserving an accessible label.
6. Keep existing navigation links, auth behavior, staff/admin access, and page content intact.
7. Use a clear “Previous” text button with disabled styling and keyboard-accessible native button semantics.

## Acceptance criteria

- Navigating Dashboard -> Find a Clinic -> clinic details, then Previous returns to Find a Clinic.
- Navigating from another view into clinic details returns to that actual prior view.
- Previous works across public, login, staff, and admin in-app views while respecting logout/role transitions.
- The control is disabled when no prior view exists.
- Client lint and production build pass.

## Scope guardrails

- Do not add a routing library or modify URL structure.
- Do not alter authentication/session contracts or authorization behavior.
- Keep the change limited to in-app navigation history, Previous controls, and focused verification.