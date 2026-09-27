# Align Clinic and Pharmacy Update Timestamps

## Objective

Make each visible “Updated … ago” label correspond to the data it describes, without forcing separate clinic and medication updates to share one timestamp.

## Existing anchors

- `GET /api/public-data` in `server/index.js` returns both `updatedAt` for the clinic record and `queueUpdatedAt` for its queue/status summary.
- `ClinicDetails` in `client/app/page.tsx` currently displays `formatUpdatedAt(clinic.updatedAt)` next to the clinic status badge.
- Pharmacy inventory displays `formatUpdatedAt(latestMedicationUpdate())`.
- The shared `formatUpdatedAt` formatter already renders minutes, hours, days, weeks, months, or years.

## Requirements

1. Extend the client `Clinic` type to include optional `queueUpdatedAt`.
2. In clinic details, use `queueUpdatedAt` for the update label next to clinic status, since the visible status/wait/queue data comes from the queue summary.
3. If `queueUpdatedAt` is missing, fall back to `updatedAt` so existing API responses and initial seed data remain usable.
4. Keep pharmacy inventory freshness based on `latestMedicationUpdate()`; do not make its label match the clinic label artificially.
5. Preserve the shared relative-time formatting and all update polling behavior.

## Acceptance criteria

- The clinic label reflects the queue/status update timestamp returned by the API.
- The pharmacy label reflects the latest medication update timestamp.
- Missing `queueUpdatedAt` falls back cleanly to the clinic `updatedAt` value.
- Client lint and production build pass.