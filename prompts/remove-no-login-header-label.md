# Remove Header Login Label

## Objective

Remove the “No login required” text from the top of public pages.

## Existing anchor

- `PublicHeader` in `client/app/page.tsx` renders the shared public navigation header, including the `LIVE STATUS` indicator and the “No login required” subtitle.

## Requirements

1. Remove only the “No login required” text from the shared public header so it no longer appears on public pages.
2. Keep the live-status indicator and the Staff/Admin Login / Register button unchanged.
3. Do not change page content, login behavior, or staff/admin headers.
4. Run client lint and build checks.