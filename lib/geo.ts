// Distance branching for the order form: pickup within 20 miles of any
// reference point, shipping (or waitlist) beyond all four.

export type LatLng = { lat: number; lng: number };

export const REFERENCE_POINTS: Record<string, LatLng> = {
  'Washington, MO': { lat: 38.5597, lng: -91.0121 },
  'Rolla, MO': { lat: 37.9514, lng: -91.7713 },
  'Sullivan, MO': { lat: 38.2114, lng: -91.1596 },
  'St. Louis, MO': { lat: 38.627, lng: -90.1994 },
};

export const PICKUP_RADIUS_MILES = 20;

const EARTH_RADIUS_MILES = 3958.8;

export function haversineMiles(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

export type NearestPoint = { name: string; miles: number };

export function nearestReferencePoint(point: LatLng): NearestPoint {
  let best: NearestPoint | null = null;
  for (const [name, ref] of Object.entries(REFERENCE_POINTS)) {
    const miles = haversineMiles(point, ref);
    if (!best || miles < best.miles) best = { name, miles };
  }
  return best!;
}

export type GeocodeResult = { lat: number; lng: number; matchedAddress: string };

// US Census Bureau geocoder: free, keyless, US-only, reliable for street
// addresses. Tried first.
async function geocodeCensus(address: string): Promise<GeocodeResult | null> {
  const url = new URL('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress');
  url.searchParams.set('address', address);
  url.searchParams.set('benchmark', 'Public_AR_Current');
  url.searchParams.set('format', 'json');

  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  const data = await res.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return {
    lat: Number(match.coordinates.y),
    lng: Number(match.coordinates.x),
    matchedAddress: match.matchedAddress as string,
  };
}

// Nominatim (OpenStreetMap): free, keyless, global fallback. Rate-limited
// and requires a descriptive User-Agent per usage policy.
async function geocodeNominatim(address: string): Promise<GeocodeResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', address);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'us');

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Wintergarten-order-form/1.0 (contact via site)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const match = data?.[0];
  if (!match) return null;
  return {
    lat: Number(match.lat),
    lng: Number(match.lon),
    matchedAddress: match.display_name as string,
  };
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || address.trim().length < 5) return null;
  try {
    const censusResult = await geocodeCensus(address);
    if (censusResult) return censusResult;
  } catch {
    // fall through to Nominatim
  }
  try {
    return await geocodeNominatim(address);
  } catch {
    return null;
  }
}

export type BranchResult =
  | { branch: 'pickup'; nearest: NearestPoint }
  | { branch: 'shipping'; nearest: NearestPoint }
  | { branch: 'unresolved' };

export function branchForPoint(point: LatLng | null): BranchResult {
  if (!point) return { branch: 'unresolved' };
  const nearest = nearestReferencePoint(point);
  return nearest.miles <= PICKUP_RADIUS_MILES
    ? { branch: 'pickup', nearest }
    : { branch: 'shipping', nearest };
}
