# Resolve Page Merge Markers

## Goal

Repair the committed merge-conflict markers at the top of `client/app/page.tsx` that make the Vercel production build fail.

## Scope and constraints

- Keep both imports required by the merged page: `FormEvent`, `useCallback`, `useEffect`, `useState`, and `dedupeStaffList` from `../lib/staff`.
- Remove only the nested conflict-marker block in the import section; preserve all other page behavior and user/remote changes.
- Do not change authentication, email delivery, or other merge contents.
- Do not commit or push changes.

## Validation

- Confirm no merge-conflict markers remain in `client/app/page.tsx`.
- Run the Vercel-equivalent client production build with `npm run build --prefix client`.
- Report the result and any unrelated pre-existing lint diagnostics separately.