import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { rupiah } from "@/lib/format";

/** Memunculkan notifikasi realtime ke akun admin setiap ada pesanan baru masuk. */
export function OrderNotifier() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel("orders-admin-notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const order = payload.new as { customer_name: string; total: number };
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.frequency.value = 880;
            gain.gain.value = 0.08;
            osc.connect(gain).connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.25);
          } catch {
            /* audio opsional */
          }
          toast.success("Pesanan baru masuk!", {
            description: `${order.customer_name || "Pelanggan"} • ${rupiah(order.total)}`,
            action: {
              label: "Lihat",
              onClick: () => void navigate({ to: "/admin" }),
            },
            duration: 10000,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, navigate]);

  return null;
}
