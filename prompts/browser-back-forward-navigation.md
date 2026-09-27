# Browser Back and Forward Navigation

## Objective

Make browser/device Back and Forward controls traverse the same in-app pages as CareQueue's Previous navigation.

## Existing anchors

- The app uses a single Next.js URL and internal `view` state in `client/app/page.tsx`.
- Internal Previous history is maintained in React state only; navigation does not currently call `history.pushState` or listen for `popstate`.
- Navigation entries need to preserve view, role, selected clinic, and clinic-directory search context.
- Successful login and logout clear the current in-app history to avoid returning into a different role's portal.

## Functional requirements

1. Synchronize in-app navigation transitions with the browser History API so browser/device Back and Forward arrows work without adding a router or changing the URL path.
2. Store only serializable app navigation state in history entries: active view, role, selected clinic identity/data required to restore the page, and public search query. Do not store credentials or authentication secrets.
3. Handle `popstate` to restore the matching view and context for both Back and Forward.
4. Keep the visible Previous button and browser Back aligned to the same history cursor; Previous must invoke browser history navigation rather than maintaining a conflicting second stack.
5. Keep Previous disabled when the app is at its first in-app entry. Forward must naturally work only when the browser has a forward entry.
6. Avoid duplicate history entries when a navigation action selects the already-active view with unchanged context. Truncate forward navigation state when the user navigates to a new view after going Back.
7. On successful login and logout, prevent stale protected history entries from restoring an admin/staff view under the wrong role. No credentials or secrets may be added to history state.
8. Preserve the existing login behavior, clinic details origin, search/filter context, and public/staff/admin navigation links.

## Tests and acceptance criteria

- Dashboard -> clinic directory -> clinic detail; browser Back returns to directory and browser Forward returns to the same clinic detail.
- The in-app Previous button and browser Back remain synchronized.
- Directory search/query and selected clinic context restore correctly.
- Back after a new navigation from a previously visited entry discards the obsolete forward branch, as standard browser history does.
- After login/logout, browser Back/Forward never exposes a protected view to the public role.
- Client lint/build pass, and browser verification covers Back, Forward, Previous, and role transitions.

## Scope guardrails

- Do not add a routing library or change the URL path structure.
- Do not put credentials, tokens, or other secrets in browser history state.
- Keep the change limited to navigation/history synchronization and focused tests.