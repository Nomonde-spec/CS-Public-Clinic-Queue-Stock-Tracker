export type Coordinates = { latitude: number; longitude: number };
export type CoordinateTarget = { latitude: number | null; longitude: number | null; province?: string };

export function isValidCoordinates(coordinates: CoordinateTarget): boolean;
export function getDistanceMiles(origin: Coordinates, destination: CoordinateTarget): number | null;
export function getClinicDistance(clinic: CoordinateTarget, origin: Coordinates, referencePoints?: Record<string, Coordinates>): { distanceMiles: number; isApproximate: boolean } | null;
export function filterClinicsByRadius<T extends CoordinateTarget>(
  clinics: T[],
  origin: Coordinates,
  radiusMiles: number,
  referencePoints?: Record<string, Coordinates>,
): { clinic: T; distanceMiles: number; isApproximate: boolean }[];
export const provinceReferencePoints: Record<string, Coordinates>;