/** Helper Google Maps tanpa API key (pakai URL publik Google Maps). */

export type MapTarget = {
  lat?: number | null;
  lng?: number | null;
  address?: string | null;
  map_link?: string | null;
};

export const PUSAT_NANGA_MAHAP = { lat: -0.5225, lng: 110.9075 };

export function hasCoords(t: MapTarget): boolean {
  return typeof t.lat === "number" && typeof t.lng === "number";
}

function query(t: MapTarget): string {
  if (hasCoords(t)) return `${t.lat},${t.lng}`;
  return (t.address || "Nanga Mahap").trim();
}

/** Tautan buka lokasi di Google Maps. */
export function mapsLink(t: MapTarget): string {
  if (t.map_link) return t.map_link;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query(t))}`;
}

/** Tautan navigasi/rute ke lokasi pemesan. */
export function mapsDirections(t: MapTarget): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query(t))}`;
}

/** URL untuk <iframe> peta (tanpa API key). */
export function mapsEmbed(t: MapTarget): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query(t))}&z=15&output=embed`;
}

/** Perkiraan jarak garis lurus (km) dari pusat Nanga Mahap. */
export function jarakDariPusat(lat: number, lng: number): number {
  const R = 6371;
  const dLat = ((lat - PUSAT_NANGA_MAHAP.lat) * Math.PI) / 180;
  const dLng = ((lng - PUSAT_NANGA_MAHAP.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((PUSAT_NANGA_MAHAP.lat * Math.PI) / 180) *
      Math.cos((lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)) * 10) / 10;
}
