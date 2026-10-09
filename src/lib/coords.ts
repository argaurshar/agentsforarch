// Coordinates typed by a person, in whatever form they copied them.
//
// Four tools take a location as text (Site Photo, Site History, 3D Site
// Analysis, Urban Layer Maps). People paste coordinates from Google Maps, from a
// survey, from Wikipedia — so the parser accepts the forms those produce and
// says plainly when it cannot read one, rather than sending a model a string it
// will "interpret".
//
//   27.1751, 78.0421                 decimal, latitude first
//   -33.8568 151.2153                signed, space-separated
//   27.1751° N, 78.0421° E           with hemisphere letters
//   38.8977 N 77.0365 W              letters, no degree sign
//   27°10'30"N 78°2'31"E             degrees, minutes, seconds (′ ″ too)
//   …/@27.1751,78.0421,17z           a Google Maps link
//
// Letters win over order: "78.0421 E, 27.1751 N" is read correctly.

export interface LatLng {
  lat: number;
  lng: number;
}

const PART =
  /([+-]?\d+(?:\.\d+)?)\s*(?:°|deg)?\s*(?:(\d+(?:\.\d+)?)\s*')?\s*(?:(\d+(?:\.\d+)?)\s*")?\s*([NSEW])?/gi;

export function parseCoordinates(text: string): LatLng | null {
  const raw = text.trim();
  if (!raw) return null;
  const url = raw.match(/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/);
  if (url) return valid({ lat: Number(url[1]), lng: Number(url[2]) });

  const t = raw.replace(/[′’‘]/g, "'").replace(/[″”“]/g, '"').replace(/''/g, '"');
  const parts: { value: number; hemi: string | null }[] = [];
  for (const m of t.matchAll(PART)) {
    if (!m[0].trim()) continue;
    const deg = Number(m[1]);
    const min = m[2] ? Number(m[2]) : 0;
    const sec = m[3] ? Number(m[3]) : 0;
    if (min >= 60 || sec >= 60) return null;
    const mag = Math.abs(deg) + min / 60 + sec / 3600;
    const hemi = m[4] ? m[4].toUpperCase() : null;
    const negative = deg < 0 || m[1].startsWith('-') || hemi === 'S' || hemi === 'W';
    parts.push({ value: negative ? -mag : mag, hemi });
  }
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  // A letter says which axis a number is on; without letters, latitude first.
  const aIsLng = a.hemi === 'E' || a.hemi === 'W';
  const bIsLat = b.hemi === 'N' || b.hemi === 'S';
  if (aIsLng && (bIsLat || b.hemi === null)) return valid({ lat: b.value, lng: a.value });
  if ((a.hemi === 'N' || a.hemi === 'S') && (b.hemi === 'N' || b.hemi === 'S')) return null;
  if ((a.hemi === 'E' || a.hemi === 'W') && (b.hemi === 'E' || b.hemi === 'W')) return null;
  return valid({ lat: a.value, lng: b.value });
}

function valid(c: LatLng): LatLng | null {
  return Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180
    ? c
    : null;
}

/** "27.1751° N, 78.0421° E" — the form every prompt states a place in. */
export function formatCoordinates(c: LatLng): string {
  const lat = `${Math.abs(c.lat).toFixed(4)}° ${c.lat >= 0 ? 'N' : 'S'}`;
  const lng = `${Math.abs(c.lng).toFixed(4)}° ${c.lng >= 0 ? 'E' : 'W'}`;
  return `${lat}, ${lng}`;
}

/** The latitude to one decimal with its letter — "27.2° N" — for sun-path wording. */
export function formatLatitude(lat: number): string {
  return `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}`;
}
