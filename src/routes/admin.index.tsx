import { useAuth } from "@/hooks/useAuth";
import { PushToggle } from "@/components/PushToggle";
import { notifyCustomerOrderUpdate } from "@/lib/push.functions";
import { Lock, LockOpen } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, MapPin, Navigation } from "lucide-react";
import { mapsDirections, mapsEmbed, mapsLink } from "@/lib/maps";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { rupiah, waLink, STATUS_LABEL } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Dasbor Admin — NitipYuk" },
      { name: "description", content: "Kelola pesanan masuk jasa titip NitipYuk Nanga Mahap." },
      { property: "og:title", content: "Dasbor Admin — NitipYuk" },
      { property: "og:description", content: "Kelola pesanan masuk dan status pengantaran." },
    ],
  }),
  component: () => (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  ),
});

type OrderItem = { name: string; price: number; qty: number };
type Order = {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  address: string;
  note: string;
  items: OrderItem[];
  distance_km: number;
  items_total: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  lat: number | null;
  lng: number | null;
  map_link: string | null;
  claimed_by: string | null;
  claimed_at: string | null;
};

const STATUSES = ["baru", "diproses", "diantar", "selesai", "batal"];

function AdminDashboard() {
  const { user, isOwner } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("semua");
  const [names, setNames] = useState<Record<string, string>>({});
  const [claiming, setClaiming] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    const list = (data ?? []) as unknown as Order[];
    setOrders(list);
    const ids = Array.from(new Set(list.map((o) => o.claimed_by).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      setNames(Object.fromEntries((profs ?? []).map((p) => [p.id, p.full_name || "Admin"])));
    }
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  /** Klaim pesanan secara atomik: hanya berhasil kalau belum diambil admin lain. */
  const ambilPesanan = async (id: string) => {
    if (!user) return;
    setClaiming(id);
    const { data, error } = await supabase
      .from("orders")
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
      .eq("id", id)
      .is("claimed_by", null)
      .select("id");
    setClaiming(null);
    if (error) {
      toast.error("Gagal mengambil pesanan", { description: error.message });
      return;
    }
    if (!data || data.length === 0) {
      toast.error("Pesanan sudah diambil admin lain");
      void load();
      return;
    }
    toast.success("Pesanan berhasil dikunci untukmu");
    void load();
  };

  const lepasPesanan = async (id: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ claimed_by: null, claimed_at: null })
      .eq("id", id);
    if (error) {
      toast.error("Gagal melepas pesanan", { description: error.message });
      return;
    }
    toast.success("Pesanan dilepas, admin lain bisa mengambilnya");
    void load();
  };

  const ubahStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error("Gagal ubah status", { description: error.message });
      return;
    }
    toast.success("Status diperbarui");
    void notifyCustomerOrderUpdate({ data: { orderId: id, status } }).catch(() => undefined);
    void load();
  };

  const shown = filter === "semua" ? orders : orders.filter((o) => o.status === filter);
  const baru = orders.filter((o) => o.status === "baru").length;


  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dasbor admin</h1>
          <p className="text-sm text-muted-foreground">{baru} pesanan baru menunggu diproses</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">Semua status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {shown.length === 0 ? (
        <p className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">Belum ada pesanan.</p>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((o) => (
            <article key={o.id} className="surface-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    #{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <Badge variant={o.status === "baru" ? "default" : "secondary"}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{o.address}</p>

              {(o.map_link || o.lat != null || o.address) && (
                <div className="mt-2 space-y-2">
                  <iframe
                    title={`Peta pengantaran pesanan ${o.id.slice(0, 8)}`}
                    src={mapsEmbed({ lat: o.lat, lng: o.lng, address: o.address })}
                    className="h-44 w-full rounded-xl border border-border"
                    loading="lazy"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <a href={mapsDirections({ lat: o.lat, lng: o.lng, address: o.address })} target="_blank" rel="noreferrer">
                        <Navigation className="h-4 w-4" /> Buka rute
                      </a>
                    </Button>
                    <Button asChild size="sm" variant="ghost">
                      <a href={mapsLink({ lat: o.lat, lng: o.lng, address: o.address, map_link: o.map_link })} target="_blank" rel="noreferrer">
                        <MapPin className="h-4 w-4" /> Lihat lokasi
                      </a>
                    </Button>
                  </div>
                </div>
              )}

              <ul className="mt-3 space-y-1 text-sm">
                {o.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {i.name} x{i.qty}
                    </span>
                    <span>{rupiah(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              {o.note && <p className="mt-2 rounded-lg bg-muted p-2 text-xs">Catatan: {o.note}</p>}

              <div className="mt-3 flex justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Ongkos titip {o.distance_km} km</span>
                <span>{rupiah(o.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold">
                <span>Total</span>
                <span className="text-primary">{rupiah(o.total)}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Select value={o.status} onValueChange={(v) => void ubahStatus(o.id, v)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABEL[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button asChild variant="outline">
                  <a
                    href={waLink(
                      o.customer_whatsapp,
                      `Halo ${o.customer_name}, ini admin NitipYuk soal pesanan #${o.id.slice(0, 8)}.`,
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" /> Hubungi pemesan
                  </a>
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
