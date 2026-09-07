import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  originLat: z.number(),
  originLng: z.number(),
  destLat: z.number(),
  destLng: z.number(),
});

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

/** Jarak garis lurus (km) sebagai cadangan bila Google Maps belum terhubung. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/**
 * Menghitung rute tercepat dari titik toko/mitra menuju alamat pemesan
 * memakai Google Maps Routes API. Jatuh ke perkiraan garis lurus bila
 * konektor Google Maps belum tersedia.
 */
export const hitungRutePengiriman = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }) => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    const fallback = {
      distanceKm: haversineKm(data.originLat, data.originLng, data.destLat, data.destLng),
      durationMin: 0,
      source: "perkiraan" as const,
    };
    if (!lovableKey || !mapsKey) return fallback;

    try {
      const res = await fetch(`${GATEWAY_URL}/routes/directions/v2:computeRoutes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
        },
        body: JSON.stringify({
          origin: { location: { latLng: { latitude: data.originLat, longitude: data.originLng } } },
          destination: { location: { latLng: { latitude: data.destLat, longitude: data.destLng } } },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
        }),
      });
      if (!res.ok) {
        console.error(`Routes API gagal [${res.status}]: ${await res.text()}`);
        return fallback;
      }
      const body = (await res.json()) as {
        routes?: Array<{ distanceMeters?: number; duration?: string }>;
      };
      const route = body.routes?.[0];
      if (!route?.distanceMeters) return fallback;
      return {
        distanceKm: Math.round((route.distanceMeters / 1000) * 10) / 10,
        durationMin: Math.round(Number(String(route.duration ?? "0s").replace("s", "")) / 60),
        source: "google" as const,
      };
    } catch (err) {
      console.error(err);
      return fallback;
    }
  });
