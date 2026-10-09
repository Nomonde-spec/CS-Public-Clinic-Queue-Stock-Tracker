# Make Admin Restock Quantity Visible

Make the quantity control in the admin **Restock clinic inventory** section visible and usable for entering how many units to add.

## Scope

- Adjust the admin restock row in `client/app/page.tsx` and its styles in `client/app/globals.css` only as needed.
- Keep the existing controlled `restockQuantity` state and positive-whole-number restock API behavior.
- Ensure the admin can see and type a quantity directly; retain a native number input with `min=1`, `step=1`, and the existing default quantity.
- Give the quantity field enough stable width beside the clinic, medication, and restock controls on desktop.
- At narrower widths, allow the controls to wrap or stack without hiding, clipping, or overlapping the quantity input or submit button.
- Do not change staff restock behavior, server logic, or unrelated medication inventory UI.

## Acceptance checks

- The admin restock form visibly shows a labeled numeric quantity field beside the clinic and medication selectors.
- Typing a positive whole number and submitting adds that quantity through the existing restock handler.
- Invalid or zero quantities cannot be submitted.
- The form remains usable at desktop and narrow viewport widths.
- Client lint and production build pass.