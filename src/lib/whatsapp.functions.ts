import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const rupiah = (n: number) => "Rp" + Math.round(n || 0).toLocaleString("id-ID");

type Item = {
  name?: string;
  qty?: number;
  price?: number;
  store_name?: string;
  variant_label?: string;
};

/** Mengirim notifikasi pesanan baru ke grup WhatsApp kurir lewat Fonnte. */
export const notifyKurirGroupNewOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const token = process.env["WHATSAPP_TOKEN"];
    const target = process.env["WHATSAPP_GROUP_ID"];
    if (!token || !target) return { sent: false, reason: "config" as const };

    const { data: order, error } = await context.supabase
      .from("orders")
      .select(
        "id, customer_name, customer_whatsapp, address, note, items, items_total, delivery_fee, discount, total, distance_km, origin_store, map_link, created_at",
      )
      .eq("id", data.orderId)
      .maybeSingle();
    if (error || !order) return { sent: false, reason: "not_found" as const };

    const items = (Array.isArray(order.items) ? order.items : []) as Item[];
    const daftar = items.length
      ? items
          .map((i, idx) => {
            const varian = i.variant_label ? ` (${i.variant_label})` : "";
            const toko = i.store_name ? `\n   🏪 ${i.store_name}` : "";
            const sub = rupiah((i.price ?? 0) * (i.qty ?? 0));
            return `${idx + 1}. ${i.name ?? "Item"}${varian} x${i.qty ?? 1} — ${sub}${toko}`;
          })
          .join("\n")
      : "- (lihat catatan)";

    const waktu = new Date(order.created_at ?? Date.now()).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const message = [
      "🔔 *PESANAN JASTIP BARU!*",
      "",
      `🆔 Order: #${String(order.id).slice(0, 8)}`,
      `🕒 ${waktu} WIB`,
      `👤 ${order.customer_name || "Pelanggan"}`,
      `📱 ${order.customer_whatsapp || "-"}`,
      `📍 ${order.address || "-"}`,
      order.origin_store ? `🏬 Titik jemput: ${order.origin_store}` : "",
      "",
      "🛒 *Daftar titipan:*",
      daftar,
      "",
      `💵 Subtotal: ${rupiah(Number(order.items_total) || 0)}`,
      `🛵 Ongkir (${Number(order.distance_km) || 0} km): ${rupiah(Number(order.delivery_fee) || 0)}`,
      Number(order.discount) ? `🎟️ Diskon: -${rupiah(Number(order.discount))}` : "",
      `💰 *TOTAL: ${rupiah(Number(order.total) || 0)}*`,
      order.note ? `\n📝 Catatan: ${order.note}` : "",
      order.map_link ? `\n🗺️ Lokasi: ${order.map_link}` : "",
    ]
      .filter((line) => line !== "")
      .join("\n");

    try {
      const res = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: { Authorization: token, "Content-Type": "application/json" },
        body: JSON.stringify({ target, message, countryCode: "62" }),
      });
      const body = await res.text();
      if (!res.ok) {
        console.error("Fonnte gagal", res.status, body);
        return { sent: false, reason: "http" as const };
      }
      return { sent: true };
    } catch (err) {
      console.error("Fonnte error", err);
      return { sent: false, reason: "error" as const };
    }
  });
