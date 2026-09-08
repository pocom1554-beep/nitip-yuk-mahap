import { useAuth } from "@/hooks/useAuth";
import { PushToggle } from "@/components/PushToggle";
import { notifyCustomerOrderUpdate } from "@/lib/push.functions";
import { ImageIcon, Lock, LockOpen, Store, Tags } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, MapPin, Navigation } from "lucide-react";
import { mapsDirections, mapsEmbed, mapsLink } from "@/lib/maps";
import { resolveImageUrls } from "@/lib/images";
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
    <AdminGate allowKurir>
      <AdminDashboard />
    </AdminGate>
  ),
});

type OrderItem = {
  product_id?: string;
  name: string;
  price: number;
  qty: number;
  image_url?: string | null;
  store_name?: string;
  variant_label?: string;
};
type ProductInfo = { id: string; name: string; store_name: string; image_url: string | null; price_options: unknown };
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
  const [products, setProducts] = useState<ProductInfo[]>([]);
  const [productImages, setProductImages] = useState<Record<string, string>>({});

  const load = async () => {
    const [{ data }, { data: productRows }] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, store_name, image_url, price_options"),
    ]);
    const list = (data ?? []) as unknown as Order[];
    const productList = (productRows ?? []) as unknown as ProductInfo[];
    setOrders(list);
    setProducts(productList);
    setProductImages(await resolveImageUrls(productList.map((product) => product.image_url)));
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
      // Pop-up realtime khusus pesanan baru masuk.
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        const o = payload.new as unknown as Order;
        const daftar = (Array.isArray(o.items) ? o.items : [])
          .map((i) => `${i.name} x${i.qty}`)
          .join(", ");
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
        toast.success(`Pesanan baru dari ${o.customer_name || "Pelanggan"}`, {
          description: `${daftar || "Titipan sesuai catatan"} • ${rupiah(Number(o.total))}`,
          duration: 12000,
        });
      })
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

  const detailItem = (item: OrderItem) => {
    const baseName = item.name.replace(/\s*\([^)]*\)\s*$/, "").trim();
    const product = products.find((p) => p.id === item.product_id) ?? products.find((p) => p.name === baseName);
    const inferredVariant = item.name.match(/\(([^()]*)\)\s*$/)?.[1] ?? "";
    return {
      storeName: item.store_name || product?.store_name || "Toko belum tercatat",
      imagePath: item.image_url || product?.image_url || null,
      variantLabel: item.variant_label || inferredVariant,
    };
  };


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

      <PushToggle role="admin" />



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

              {o.claimed_by ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  {o.claimed_by === user?.id
                    ? "Dikunci untukmu"
                    : `Sedang ditangani ${names[o.claimed_by] ?? "admin lain"}`}
                </p>
              ) : (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                  <LockOpen className="h-3.5 w-3.5" /> Belum diambil admin
                </p>
              )}

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

              <ul className="mt-3 space-y-2">
                {o.items.map((i, idx) => {
                  const detail = detailItem(i);
                  const imageUrl = detail.imagePath ? productImages[detail.imagePath] : undefined;
                  return (
                    <li key={`${i.product_id ?? i.name}-${idx}`} className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-2.5">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        {imageUrl ? (
                          <img src={imageUrl} alt={i.name} className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-5 w-5" /></div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{i.name.replace(/\s*\([^)]*\)\s*$/, "")}</p>
                        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                          <Store className="h-3 w-3 shrink-0" /> {detail.storeName}
                        </p>
                        {detail.variantLabel && (
                          <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-primary">
                            <Tags className="h-3 w-3" /> Varian: {detail.variantLabel}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">{i.qty} × {rupiah(i.price)}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold">{rupiah(i.price * i.qty)}</span>
                    </li>
                  );
                })}
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
                {!o.claimed_by ? (
                  <Button disabled={claiming === o.id} onClick={() => void ambilPesanan(o.id)}>
                    <Lock className="h-4 w-4" /> Ambil pesanan
                  </Button>
                ) : (o.claimed_by === user?.id || isOwner) ? (
                  <Button variant="outline" onClick={() => void lepasPesanan(o.id)}>
                    <LockOpen className="h-4 w-4" /> Lepas pesanan
                  </Button>
                ) : null}
                <Select
                  value={o.status}
                  disabled={!!o.claimed_by && o.claimed_by !== user?.id && !isOwner}
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
