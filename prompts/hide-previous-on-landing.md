# Hide Previous on Landing Page

## Objective

Do not show the Previous button on the public landing page.

## Existing anchor

- The shared public shell in `client/app/page.tsx` renders `PagePrevious` before the active public view.
- Public `view` is already available in this render path; other public views include clinic directory, medication search, and clinic details.

## Requirements

1. Omit the public Previous row when `view === "home"`.
2. Keep Previous visible on other public pages, including clinic directory, medication search, and clinic details.
3. Do not change Previous history behavior or staff/admin/login placement.
4. Run client lint and production build.

## Acceptance criteria

- The landing page has no Previous button, even if it was reached by navigating back from another page.
- Other public pages retain Previous and continue to navigate to the prior in-app view.
- Client lint and build pass.