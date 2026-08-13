export function rupiah(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!isFinite(n)) return "Rp0";
  return "Rp" + Math.round(n).toLocaleString("id-ID");
}

export function normalizeWa(raw: string): string {
  const digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return "62" + digits.slice(1);
  if (digits.startsWith("8")) return "62" + digits;
  return digits;
}

export function waLink(number: string, text: string): string {
  const wa = normalizeWa(number);
  return `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
}

export function hitungOngkir(
  distanceKm: number,
  settings: { base_fee: number; per_km_fee: number; free_km: number },
): number {
  const extra = Math.max(0, (Number(distanceKm) || 0) - Number(settings.free_km || 0));
  return Math.round(Number(settings.base_fee || 0) + extra * Number(settings.per_km_fee || 0));
}

export const STATUS_LABEL: Record<string, string> = {
  baru: "Pesanan baru",
  diproses: "Sedang dibelanjakan",
  diantar: "Dalam perjalanan",
  selesai: "Selesai",
  batal: "Dibatalkan",
};
