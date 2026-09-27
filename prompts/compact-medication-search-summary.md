# Compact Medication Search Summary

## Objective

Make the Medication Search results a concise summary while retaining medication category information.

## Existing anchors

- `MedicationTable` in `client/app/page.tsx` renders medication name, category, and availability for the search view.
- `Medications` uses `MedicationTable` for search results, while the homepage and clinic detail page also reuse medication presentation components.
- The clinic detail medication summary is already limited to four entries and shows medication name and availability.

## Functional requirements

1. In the Medication Search results only, show a compact summary of four medication entries when four or more records are available. If fewer than four match the selected search, show all matching entries.
2. Keep the existing medication name, category, and availability information visible for every displayed entry. Do not remove or hide the category.
3. Preserve search filtering: the four-entry limit applies after filtering, so matching search results are shown rather than the first four global records.
4. Keep the existing search selector, result heading, availability badges, and empty-search message functional.
5. Do not change the clinic detail summary or homepage medication display.

## Acceptance criteria

- With no medication selected, the search results show four summary rows, each with name, category, and availability.
- With a search that matches fewer than four medications, all matches are shown.
- Category remains visible at desktop and mobile widths.
- Empty search results still show the existing no-match message.
- Client lint/build checks pass.

## Scope guardrails

- Do not change medication data, stock thresholds, API contracts, or availability derivation.
- Keep the change limited to Medication Search result presentation and focused verification.