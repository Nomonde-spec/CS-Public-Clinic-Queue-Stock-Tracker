# Place Previous in Page Content

## Objective

Move Previous from the white navigation/header area into the pale blue content area at the top-left of each page.

## Existing anchors

- Public, staff, and admin headers currently render Previous in a vertical stack beneath the logo.
- The login page renders Previous beneath the logo in its left content column.
- Previous behavior, navigation history, disabled state, and context restoration are already implemented.
- Public, staff, admin, and login views use pale blue/gray content backgrounds below their headers.

## Requirements

1. Remove Previous from all public, staff, and admin navigation headers.
2. Render Previous in a small content-area row immediately below the navigation bar, aligned to the left edge of that page's main content container.
3. On login, render Previous at the top-left of the pale login content area rather than beneath the logo.
4. Preserve the existing Previous callback, disabled state, keyboard semantics, and history behavior exactly.
5. Ensure the button is visually on the page background, not inside the white navigation bar or a separate white card.
6. Keep the placement responsive: on narrow screens it remains above page content, visible, and does not overlap titles, forms, or navigation.
7. Do not change navigation history, page routes, authentication, or other page content.

## Acceptance criteria

- Public, staff, and admin pages show Previous in the pale content area below the header.
- Login shows Previous at the top-left of its pale content area.
- No Previous control appears inside the navigation header.
- Existing disabled and back-navigation behavior is unchanged.
- Client lint and production build pass; verify desktop and mobile layout.