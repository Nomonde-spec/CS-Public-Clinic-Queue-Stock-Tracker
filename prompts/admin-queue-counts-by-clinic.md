# Show Queue Counts by Clinic

Replace the single aggregate **LIVE PATIENTS IN QUEUE** metric in the admin dashboard with patient counts broken down by clinic.

## Scope

- Change the existing queue metric in `AdminDashboard` in `client/app/page.tsx` and add narrowly scoped styles in `client/app/globals.css` if needed.
- Use the existing `clinicData` prop as the source of truth. Show each clinic name with its current `patients` count, including clinics with zero patients.
- Remove the aggregate patient total and average-wait text from this metric card; the existing per-clinic wait-time panel remains unchanged.
- Keep the card readable when there are many clinics by constraining the list height and allowing it to scroll, with responsive sizing that avoids clipping names or counts.
- Do not add API requests or change queue calculations, persistence, or server behavior.

## Acceptance checks

- The dashboard summary clearly labels the card as queue counts by clinic.
- Every clinic in `clinicData` appears once with its patient count, including zero.
- No all-clinics total is presented as if it were a per-clinic count.
- The list remains usable on desktop and narrow screens.
- Client lint and production build pass.