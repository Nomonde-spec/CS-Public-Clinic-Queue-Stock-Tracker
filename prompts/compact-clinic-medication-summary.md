# Compact Clinic Medication Summary

## Objective

Make the medication section on every clinic detail page a compact summary instead of showing the full medication table.

## Existing anchors

- `ClinicDetails` in `client/app/page.tsx` renders the “Pharmacy inventory” section.
- The section currently renders the shared `MedicationTable`, which includes medication name, category, and overall availability.
- All clinic detail pages use the same `ClinicDetails` component, so this presentation should apply consistently to every clinic.
- The full medication search view should remain available and unchanged.

## Functional requirements

1. Replace the full medication table in the clinic detail “Pharmacy inventory” section with a concise summary list.
2. Show at least four medication entries when four or more are available. Limit the clinic-detail summary to four entries when the source contains more than four, so it reads as a summary rather than a second full inventory table. If fewer than four entries exist, show all available entries.
3. Each entry should show only the medication name and its availability status. Do not show category, stock count, aggregate clinic text, or detailed inventory metadata in this summary.
4. Use the existing availability status presentation and preserve accessible text labels.
5. Apply the same summary on every clinic detail page without changing the public Medication Search view or its complete results.
6. Preserve existing loading, empty, and recoverable error behavior for the underlying medication data.

## Acceptance criteria

- Opening any clinic detail page shows a compact medication summary with four entries when at least four medication records exist.
- The summary entries contain only a medication name and availability status.
- The full medication search still shows its existing complete medication information.
- The layout remains usable on mobile and desktop.
- Client lint/build checks pass.

## Scope guardrails

- Do not change medication data, stock thresholds, API contracts, or clinic-specific stock semantics.
- Do not imply the current shared medication records are clinic-specific if the data source does not provide per-clinic inventory.
- Keep the change limited to the clinic detail medication presentation and focused verification.