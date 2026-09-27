# Place Previous Under the Logo

## Objective

Move the Previous button from its current separate header position to directly underneath the logo at the top-left of every app page.

## Existing anchors

- Public, staff, and admin headers in `client/app/page.tsx` render Previous and Logo as separate siblings.
- The login view renders Previous at the top-left of `.auth-page-shell`, while its CareQueue logo is inside `.auth-copy`.
- Previous navigation behavior and disabled state are already implemented and must remain unchanged.

## Requirements

1. In public, staff, and admin headers, group the logo and Previous button in a vertical top-left brand stack, with the button immediately below the logo.
2. On login, place Previous immediately below the CareQueue logo in the existing top-left login content column; remove its absolute page-corner positioning.
3. Keep the button disabled state, navigation history behavior, accessible text, and keyboard interaction unchanged.
4. Keep navigation links, account controls, and sign-out controls in their current functional positions.
5. Adjust desktop and mobile header layout as needed so the stacked logo/button does not overlap navigation or account controls and the header height grows cleanly on narrow screens.

## Acceptance criteria

- Previous appears directly under the logo on public, staff, admin, and login pages.
- The top-left grouping is aligned and readable on desktop and mobile widths.
- Previous still navigates to the last in-app page, preserves context, and remains disabled when no history exists.
- Client lint and production build pass.