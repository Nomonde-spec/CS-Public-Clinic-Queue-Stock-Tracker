const EARTH_RADIUS_MILES = 3958.7613;
// Provincial-capital reference coordinates approximate province location, not individual clinics.
const provinceReferencePoints = {
  "Eastern Cape": { latitude: -32.8499, longitude: 27.438 },
  "Free State": { latitude: -29.1182, longitude: 26.214 },
  Gauteng: { latitude: -26.2041, longitude: 28.0473 },
  "KwaZulu-Natal": { latitude: -29.6006, longitude: 30.3794 },
  Limpopo: { latitude: -23.9045, longitude: 29.4689 },
  Mpumalanga: { latitude: -25.4753, longitude: 30.9694 },
  "North West": { latitude: -25.8652, longitude: 25.6442 },
  "Northern Cape": { latitude: -28.7282, longitude: 24.7499 },
  "Western Cape": { latitude: -33.9249, longitude: 18.4241 },
};

/** @typedef {{ latitude: number | null, longitude: number | null }} CoordinateTarget */
/** @typedef {{ latitude: number, longitude: number }} Coordinates */

/** @param {CoordinateTarget | null | undefined} coordinates */
function isValidCoordinates(coordinates) {
  return coordinates !== null
    && typeof coordinates === "object"
    && Number.isFinite(coordinates.latitude)
    && coordinates.latitude >= -90
    && coordinates.latitude <= 90
    && Number.isFinite(coordinates.longitude)
    && coordinates.longitude >= -180
    && coordinates.longitude <= 180;
}

/** @param {Coordinates | null | undefined} origin @param {CoordinateTarget | null | undefined} destination */
function getDistanceMiles(origin, destination) {
  if (!isValidCoordinates(origin) || !isValidCoordinates(destination)) return null;

  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDifference = radians(destination.latitude - origin.latitude);
  const longitudeDifference = radians(destination.longitude - origin.longitude);
  const haversine = Math.sin(latitudeDifference / 2) ** 2
    + Math.cos(radians(origin.latitude))
    * Math.cos(radians(destination.latitude))
    * Math.sin(longitudeDifference / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(haversine));
}

/** @param {CoordinateTarget & { province?: string }} clinic @param {Coordinates | null | undefined} origin @param {Record<string, Coordinates>} [referencePoints] */
function getClinicDistance(clinic, origin, referencePoints = provinceReferencePoints) {
  if (isValidCoordinates(clinic) && isValidCoordinates(origin)) {
    return { distanceMiles: getDistanceMiles(origin, clinic), isApproximate: false };
  }
  const referencePoint = referencePoints[clinic.province];
  if (!referencePoint || !isValidCoordinates(origin)) return null;
  return { distanceMiles: getDistanceMiles(origin, referencePoint), isApproximate: true };
}

/** @template {CoordinateTarget & { province?: string }} T @param {T[]} clinics @param {Coordinates | null | undefined} origin @param {number} radiusMiles @param {Record<string, Coordinates>} [referencePoints] */
function filterClinicsByRadius(clinics, origin, radiusMiles, referencePoints = provinceReferencePoints) {
  if (!isValidCoordinates(origin) || !Number.isFinite(radiusMiles) || radiusMiles < 0) return [];

  return clinics
    .map((clinic) => ({ clinic, ...getClinicDistance(clinic, origin, referencePoints) }))
    .filter((result) => result.distanceMiles !== null && result.distanceMiles <= radiusMiles)
    .sort((first, second) => first.distanceMiles - second.distanceMiles);
}

module.exports = { filterClinicsByRadius, getClinicDistance, getDistanceMiles, isValidCoordinates, provinceReferencePoints };