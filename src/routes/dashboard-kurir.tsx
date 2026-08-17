import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bike,
  Lock,
  LockOpen,
  MapPin,
  MessageCircle,
  Navigation,
  Package,
  Star,
  Timer,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapsDirections, mapsEmbed, mapsLink } from "@/lib/maps";
import { rupiah, waLink, STATUS_LABEL } from "@/lib/format";
import { notifyCustomerOrderUpdate } from "@/lib/push.functions";
import { PushToggle } from "@/components/PushToggle";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/dashboard-kurir")({
  head: () => ({
    meta: [
      { title: "Dashboard Kurir — NitipYuk" },
      {
        name: "description",
        content: "Dashboard khusus kurir NitipYuk: ambil pesanan, buka rute antar, dan perbarui status pengantaran.",
      },
      { property: "og:title", content: "Dashboard Kurir — NitipYuk" },
      { property: "og:description", content: "Kelola antaran titipan konsumen Nanga Mahap." },
    ],
  }),
  component: DashboardKurirPage,
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
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  lat: number | null;
  lng: number | null;
  map_link: string | null;
  claimed_by: string | null;
};

type Stat = { delivered: number; avg_minutes: number; avg_stars: number; rating_count: number };

const STATUSES = ["baru", "diproses", "diantar", "selesai"];

function DashboardKurirPage() {
  const { user, isKurir, isOwner, loading } = useAuth();

  if (loading) {
    return <main className="p-10 text-center text-sm text-muted-foreground">Memuat...</main>;
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-black">Khusus kurir</h1>
        <p className="mt-2 text-sm text-muted-foreground">Masuk dengan akun kurir untuk membuka dashboard ini.</p>
        <Button asChild className="mt-4">
          <Link to="/auth">Masuk</Link>
        </Button>
      </main>
    );
  }

  if (!isKurir && !isOwner) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="font-display text-2xl font-black">Akses ditolak</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Dashboard ini hanya untuk kurir yang ditunjuk admin utama.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link to="/">Kembali ke katalog</Link>
        </Button>
      </main>
    );
  }

  return <DashboardKurir />;
}

function DashboardKurir() {
  const { user, isOwner, profile } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stat, setStat] = useState<Stat>({ delivered: 0, avg_minutes: 0, avg_stars: 0, rating_count: 0 });
  const [tab, setTab] = useState<"tersedia" | "saya">("tersedia");
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(80);
    setOrders((data ?? []) as unknown as Order[]);
    const { data: rank } = await supabase.rpc("courier_ranking");
    const mine = ((rank ?? []) as unknown as (Stat & { courier_id: string })[]).find(
      (r) => r.courier_id === user?.id,
    );
    if (mine) {
      setStat({
        delivered: Number(mine.delivered),
        avg_minutes: Number(mine.avg_minutes),
        avg_stars: Number(mine.avg_stars),
        rating_count: Number(mine.rating_count),
      });
    }
  };

  useEffect(() => {
    void load();
    const channel = supabase
      .channel("kurir-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const ambil = async (id: string) => {
    if (!user) return;
    setBusy(id);
    const { data, error } = await supabase
      .from("orders")
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString() })
      .eq("id", id)
      .is("claimed_by", null)
      .select("id");
    setBusy(null);
    if (error) {
      toast.error("Gagal mengambil pesanan", { description: error.message });
      return;
    }
    if (!data || data.length === 0) {
      toast.error("Pesanan sudah diambil kurir lain");
      void load();
      return;
    }
    toast.success("Pesanan dikunci untukmu");
    setTab("saya");
    void load();
  };

  const lepas = async (id: string) => {
    const { error } = await supabase.from("orders").update({ claimed_by: null, claimed_at: null }).eq("id", id);
    if (error) {
      toast.error("Gagal melepas pesanan", { description: error.message });
      return;
    }
    toast.success("Pesanan dilepas");
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

  const tersedia = orders.filter((o) => !o.claimed_by && !["selesai", "batal"].includes(o.status));
  const saya = orders.filter((o) => o.claimed_by === user?.id);
  const shown = tab === "tersedia" ? tersedia : saya;

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-20">
      <section className="overflow-hidden rounded-[2rem] bg-hero px-6 py-8 text-primary-foreground shadow-[var(--shadow-pop)]">
        <p className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-bold">
          <Bike className="h-4 w-4" /> Dashboard kurir
        </p>
        <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
          Halo, {profile?.full_name || "Kurir"}!
        </h1>
        <p className="mt-1 text-sm text-primary-foreground/85">
          {isOwner ? "Mode intip admin utama — kamu melihat semua antaran." : "Ambil pesanan, antar, dan naikkan peringkatmu."}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl bg-primary-foreground/12 px-2 py-3">
            <Package className="mx-auto h-4 w-4" />
            <p className="mt-1 text-xl font-black">{stat.delivered}</p>
            <p className="text-[11px] opacity-80">antaran selesai</p>
          </div>
          <div className="rounded-2xl bg-primary-foreground/12 px-2 py-3">
            <Timer className="mx-auto h-4 w-4" />
            <p className="mt-1 text-xl font-black">{Math.round(stat.avg_minutes)}</p>
            <p className="text-[11px] opacity-80">menit rata-rata</p>
          </div>
          <div className="rounded-2xl bg-primary-foreground/12 px-2 py-3">
            <Star className="mx-auto h-4 w-4" />
            <p className="mt-1 text-xl font-black">{stat.avg_stars.toFixed(1)}</p>
            <p className="text-[11px] opacity-80">{stat.rating_count} ulasan</p>
          </div>
        </div>
      </section>

      <PushToggle role="admin" />

      <div className="mt-4 flex gap-2">
        <Button variant={tab === "tersedia" ? "default" : "outline"} onClick={() => setTab("tersedia")}>
          Pesanan tersedia ({tersedia.length})
        </Button>
        <Button variant={tab === "saya" ? "default" : "outline"} onClick={() => setTab("saya")}>
          Antaran saya ({saya.length})
        </Button>
      </div>

      {shown.length === 0 ? (
        <p className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
          {tab === "tersedia" ? "Belum ada pesanan yang menunggu diambil." : "Kamu belum mengambil pesanan."}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {shown.map((o) => (
            <article key={o.id} className="surface-pop card-hover p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-base font-bold">{o.customer_name}</p>
                  <p className="text-xs text-muted-foreground">
                    #{o.id.slice(0, 8)} • {new Date(o.created_at).toLocaleString("id-ID")}
                  </p>
                </div>
                <Badge variant={o.status === "baru" ? "default" : "secondary"}>
                  {STATUS_LABEL[o.status] ?? o.status}
                </Badge>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{o.address}</p>

              <div className="mt-2 space-y-2">
                <iframe
                  title={`Peta pesanan ${o.id.slice(0, 8)}`}
                  src={mapsEmbed({ lat: o.lat, lng: o.lng, address: o.address })}
                  className="h-44 w-full rounded-2xl border border-border"
                  loading="lazy"
                />
                <div className="flex flex-wrap gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a
                      href={mapsDirections({ lat: o.lat, lng: o.lng, address: o.address })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Navigation className="h-4 w-4" /> Buka rute
                    </a>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a
                      href={mapsLink({ lat: o.lat, lng: o.lng, address: o.address, map_link: o.map_link })}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <MapPin className="h-4 w-4" /> Lihat lokasi
                    </a>
                  </Button>
                </div>
              </div>

              <ul className="mt-3 space-y-1 text-sm">
                {(o.items ?? []).map((i, idx) => (
                  <li key={idx} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {i.name} x{i.qty}
                    </span>
                    <span>{rupiah(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              {o.note && <p className="mt-2 rounded-xl bg-muted p-2 text-xs">Catatan: {o.note}</p>}

              <div className="mt-3 flex justify-between border-t border-border pt-2 text-sm">
                <span className="text-muted-foreground">Ongkos titip {o.distance_km} km</span>
                <span>{rupiah(o.delivery_fee)}</span>
              </div>
              <div className="flex justify-between text-base font-extrabold">
                <span>Total</span>
                <span className="text-primary">{rupiah(o.total)}</span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {!o.claimed_by ? (
                  <Button disabled={busy === o.id} onClick={() => void ambil(o.id)}>
                    <Lock className="h-4 w-4" /> Ambil pesanan
                  </Button>
                ) : o.claimed_by === user?.id || isOwner ? (
                  <Button variant="outline" onClick={() => void lepas(o.id)}>
                    <LockOpen className="h-4 w-4" /> Lepas pesanan
                  </Button>
                ) : null}
                <Select
                  value={o.status}
                  disabled={!o.claimed_by || (o.claimed_by !== user?.id && !isOwner)}
                  onValueChange={(v) => void ubahStatus(o.id, v)}
                >
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
                      `Halo ${o.customer_name}, saya kurir NitipYuk untuk pesanan #${o.id.slice(0, 8)}.`,
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
