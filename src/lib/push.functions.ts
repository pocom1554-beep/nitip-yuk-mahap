import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

/** Kunci publik VAPID untuk mendaftarkan perangkat dari browser. */
export const getVapidPublicKey = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: process.env["VAPID_PUBLIC_KEY"] ?? "",
}));

/** Menyimpan langganan notifikasi milik pengguna yang sedang masuk. */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => subSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .upsert(
        { user_id: context.userId, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth },
        { onConflict: "endpoint" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Menghapus langganan notifikasi perangkat ini. */
export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ endpoint: z.string().url() }).parse(data))
  .handler(async ({ data, context }) => {
    await context.supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

/** Memberi tahu semua admin bahwa ada pesanan baru masuk. */
export const notifyAdminsNewOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().uuid(), customerName: z.string(), total: z.number() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToSubscriptions } = await import("./push.server");

    const { data: order } = await context.supabase
      .from("orders")
      .select("id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { sent: 0 };

    const { data: admins } = await supabaseAdmin.from("user_roles").select("user_id").eq("role", "admin");
    const ids = (admins ?? []).map((a) => a.user_id);
    if (ids.length === 0) return { sent: 0 };

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("user_id", ids);

    const rupiah = "Rp" + Math.round(data.total).toLocaleString("id-ID");
    const result = await sendPushToSubscriptions(subs ?? [], {
      title: "Pesanan baru masuk!",
      body: `${data.customerName || "Pelanggan"} • ${rupiah}`,
      url: "/admin",
      tag: `order-${data.orderId}`,
    });
    if (result.stale.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", result.stale);
    return { sent: result.sent };
  });

/** Memberi tahu pelanggan bahwa status pesanannya berubah. */
export const notifyCustomerOrderUpdate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().uuid(), status: z.string().min(1) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPushToSubscriptions } = await import("./push.server");
    const { STATUS_LABEL } = await import("./format");

    // Hanya admin atau pemilik pesanan yang bisa membaca pesanan ini (RLS).
    const { data: order } = await context.supabase
      .from("orders")
      .select("id, customer_id")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!order) return { sent: 0 };

    const { data: subs } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", order.customer_id);

    const result = await sendPushToSubscriptions(subs ?? [], {
      title: "Status pesanan diperbarui",
      body: `Pesanan #${data.orderId.slice(0, 8)}: ${STATUS_LABEL[data.status] ?? data.status}`,
      url: "/pesanan",
      tag: `order-${data.orderId}`,
    });
    if (result.stale.length) await supabaseAdmin.from("push_subscriptions").delete().in("id", result.stale);
    return { sent: result.sent };
  });
