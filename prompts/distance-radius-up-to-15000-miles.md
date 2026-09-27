# Distance Radius Options up to 15,000 Miles

## Objective

Extend the public clinic directory distance dropdown with larger radius presets up to 15,000 miles.

## Existing anchor

- The distance selector and clinic filtering are in `Clinics` in `client/app/page.tsx`.
- Current options are 5, 10, 25, and 50 miles, plus “All clinics”.
- The selected numeric value is already passed into the shared radius filter, which calculates distance to exact clinic coordinates when available or to a provincial reference point otherwise.

## Requirements

1. Preserve the existing 5, 10, 25, and 50-mile options and “All clinics”.
2. Add stepped options of 100, 250, 500, 1,000, 2,500, 5,000, 10,000, and 15,000 miles.
3. Keep the displayed labels and underlying option values in miles.
4. Keep the current geolocation request, estimate labels, exact-coordinate preference, radius filtering, sorting, and permission/error states unchanged.
5. Do not change province reference points, distance calculations, clinic data, or map behavior.

## Acceptance criteria

- The public directory dropdown includes every listed radius through “Within 15,000 miles”.
- Selecting larger numeric options applies that exact radius to existing distance filtering.
- “All clinics” continues to work without requesting geolocation.
- Client lint and production build pass.