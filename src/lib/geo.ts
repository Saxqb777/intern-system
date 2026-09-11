/**
 * Distance between two points on the earth, in metres.
 * Haversine. Good to a metre or so at the scale of an office car park,
 * which is all we need.
 */
export function metresBetween(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371008.8; // mean earth radius, metres
  const toRad = (d: number) => (d * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

export type FixInput = {
  lat: unknown;
  lng: unknown;
  accuracy: unknown;
};

export type Fix = { lat: number; lng: number; accuracy: number };

/**
 * The browser sends these numbers, so none of them can be trusted on faith.
 * Reject anything that is not a real coordinate before it reaches the database.
 */
export function parseFix(input: FixInput): Fix | null {
  const lat = Number(input.lat);
  const lng = Number(input.lng);
  const accuracy = Number(input.accuracy);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90) return null;
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) return null;
  if (!Number.isFinite(accuracy) || accuracy < 0) return null;

  return { lat, lng, accuracy };
}

/**
 * A fix the phone is not confident about is worse than no fix, because it
 * can put someone inside the fence who is standing on the road outside it.
 */
export const MAX_ACCURACY_M = 150;
