# Show Selected Clinic Immediately

## Objective

When a user selects a clinic in the homepage clinic selector, immediately show that clinic in the homepage clinic results without requiring a click on "Search now".

## Existing behavior

`PublicHome` in `client/app/page.tsx` stores the selected clinic name in local state, but the visible clinic cards always render `clinics.slice(0, 3)`. The search button navigates separately, so selecting a clinic does not update the displayed clinics.

## Requirements

- Update the homepage clinic results as soon as a clinic is selected.
- If a district is selected, display clinics in that district.
- If the selector is cleared, restore the default nearest-clinics list.
- Preserve the medication selector and existing search button behavior.
- Keep the change scoped to the homepage and use existing clinic data; do not change API behavior.

## Verification

Run the client lint/type checks or build. Verify selecting a clinic immediately displays that clinic, selecting a district displays its clinics, and clearing the selection restores the default list.