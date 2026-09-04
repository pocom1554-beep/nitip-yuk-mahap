import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MessageCircle,
  Search,
  Plus,
  ImageIcon,
  Store,
  Flame,
  Trophy,
  
  MessageSquareHeart,
  Sparkles,
  BadgePercent,
  Copy,
  Info,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBucketUrl, resolveImageUrls } from "@/lib/images";
import { categoryIcon } from "@/lib/category-icons";
import { rupiah, waLink } from "@/lib/format";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { BannerCarousel } from "@/components/BannerCarousel";
import { BannerAdminPanel } from "@/components/BannerAdminPanel";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NitipYuk — Jasa Titip Kecamatan Nanga Mahap" },
      {
        name: "description",
        content:
          "Titip belanjaan apa saja di Kecamatan Nanga Mahap. Lihat detail barang dan toko mitra, pakai voucher promo, lalu chat admin via WhatsApp.",
      },
      { property: "og:title", content: "NitipYuk — Jasa Titip Kecamatan Nanga Mahap" },
      { property: "og:description", content: "Mau apa aja, tinggal titip!" },
    ],
  }),
  component: Katalog,
});

type Opsi = { label: string; price: number };

type Product = {
  id: string;
  name: string;
  store_name: string;
  description: string;
  detail: string;
  category: string;
  price: number;
  price_options: unknown;
  image_url: string | null;
  is_available: boolean;
};


type Promo = {
  id: string;
  code: string;
  title: string;
  description: string;
  kind: string;
  value: number;
  min_spend: number;
  expires_at: string | null;
};

type StoreInfo = { name: string; description: string; open_hours: string; logo_url: string };

function parseOpsi(raw: unknown): Opsi[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => o as { label?: unknown; price?: unknown })
    .filter((o) => typeof o?.label === "string" && String(o.label).trim() !== "")
    .map((o) => ({ label: String(o.label), price: Number(o.price) || 0 }));
}

function Katalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [sales, setSales] = useState<Record<string, number>>({});
  
  const [storeInfo, setStoreInfo] = useState<Record<string, StoreInfo>>({});
  const [storeLogos, setStoreLogos] = useState<Record<string, string>>({});
  
  const [promos, setPromos] = useState<Promo[]>([]);
  const [adminWa, setAdminWa] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [store, setStore] = useState("Semua toko");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Product | null>(null);
  const [pilihOpsi, setPilihOpsi] = useState(0);
  const { add } = useCart();
  const { bukaSekarang, open_time, close_time } = useSiteSettings();
  const { isAdmin } = useAuth();

  useEffect(() => {
    const load = async () => {
      const [
        { data: prods },
        { data: setting },
        { data: sale },
        { data: promoRows },
        { data: storeRows },
      ] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("settings").select("admin_whatsapp").eq("id", 1).maybeSingle(),
        supabase.rpc("product_sales"),
        supabase
          .from("promos")
          .select("id, code, title, description, kind, value, min_spend, expires_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false }),
        supabase.from("stores").select("name, description, open_hours, logo_url"),
      ]);
      const list = (prods ?? []) as unknown as Product[];
      setProducts(list);
      setAdminWa(setting?.admin_whatsapp ?? "");
      setSales(Object.fromEntries((sale ?? []).map((s) => [s.product_id, Number(s.qty)])));
      
      setPromos(((promoRows ?? []) as unknown as Promo[]).filter(
        (p) => !p.expires_at || new Date(p.expires_at).getTime() > Date.now(),
      ));
      const infoList = (storeRows ?? []) as unknown as StoreInfo[];
      setStoreInfo(Object.fromEntries(infoList.map((s) => [s.name, s])));
      const logoEntries = await Promise.all(
        infoList
          .filter((s) => s.logo_url)
          .map(async (s) => [s.name, await resolveBucketUrl("branding", s.logo_url)] as const),
      );
      setStoreLogos(Object.fromEntries(logoEntries.filter(([, v]) => v)) as Record<string, string>);
      setImages(await resolveImageUrls(list.map((p) => p.image_url)));
      setLoading(false);
    };
    void load();
  }, []);

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const storeNames = useMemo(
    () => ["Semua toko", ...Array.from(new Set(products.map((p) => p.store_name).filter(Boolean)))],
    [products],
  );

  const bestSellerIds = useMemo(() => {
    const top = Object.entries(sales)
      .filter(([, qty]) => qty > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([id]) => id);
    return new Set(top);
  }, [sales]);

  const bestSellers = products.filter((p) => bestSellerIds.has(p.id));

  const filtered = products.filter(
    (p) =>
      (cat === "Semua" || p.category === cat) &&
      (store === "Semua toko" || p.store_name === store) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) ||
        (p.description ?? "").toLowerCase().includes(q.toLowerCase())),
  );

  const bukaDetail = (p: Product) => {
    setDetail(p);
    setPilihOpsi(0);
  };

  const tambah = (p: Product, opsi?: Opsi) => {
    add({
      id: opsi ? `${p.id}::${opsi.label}` : p.id,
      name: opsi ? `${p.name} (${opsi.label})` : p.name,
      price: opsi ? opsi.price : Number(p.price),
      image: p.image_url,
    });
    toast.success(`${p.name} masuk keranjang`);
  };

  const card = (p: Product) => {
    const opsi = parseOpsi(p.price_options);
    const mulai = opsi.length ? Math.min(...opsi.map((o) => o.price)) : Number(p.price);
    return (
      <article key={p.id} className="surface-pop card-hover flex flex-col overflow-hidden">
        <button type="button" onClick={() => bukaDetail(p)} className="relative aspect-square bg-muted text-left">
          {p.image_url && images[p.image_url] ? (
            <img src={images[p.image_url]} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
          {bestSellerIds.has(p.id) && (
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-sunset px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-primary-foreground shadow-[var(--shadow-soft)]">
              <Flame className="h-3 w-3" /> Best seller
            </span>
          )}
          {opsi.length > 0 && (
            <span className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold text-primary">
              {opsi.length} pilihan harga
            </span>
          )}
          {!p.is_available && (
            <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold text-muted-foreground">
              Kosong
            </span>
          )}
        </button>
        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{p.category}</p>
          <h3 className="font-display line-clamp-2 text-base font-extrabold leading-snug">{p.name}</h3>
          {p.store_name && (
            <Link
              to="/toko/$name"
              params={{ name: encodeURIComponent(p.store_name) }}
              className="flex items-center gap-1.5 truncate text-xs font-semibold text-muted-foreground hover:text-primary"
            >
              {storeLogos[p.store_name] ? (
                <img
                  src={storeLogos[p.store_name]}
                  alt={`Logo ${p.store_name}`}
                  className="h-5 w-5 shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <Store className="h-3.5 w-3.5 shrink-0" />
              )}
              {p.store_name}
            </Link>
          )}

          {p.description && (
            <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{p.description}</p>
          )}
          <p className="font-display mt-auto pt-1 text-lg font-extrabold text-primary">
            {opsi.length ? `Mulai ${rupiah(mulai)}` : rupiah(p.price)}
          </p>
          <div className="mt-1 flex gap-1.5">
            <Button size="sm" variant="outline" className="px-2.5" onClick={() => bukaDetail(p)}>
              <Info className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              className="flex-1 font-bold"
              disabled={!p.is_available}
              onClick={() => (opsi.length ? bukaDetail(p) : tambah(p))}
            >
              <Plus className="h-4 w-4" />
              {p.is_available ? (opsi.length ? "Pilih" : "Titip") : "Kosong"}
            </Button>
          </div>
        </div>
      </article>
    );
  };

  const detailOpsi = detail ? parseOpsi(detail.price_options) : [];

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20">
      <section className="relative mt-4 overflow-hidden rounded-4xl bg-hero px-6 py-12 text-primary-foreground shadow-[var(--shadow-pop)]">
        <div className="absolute inset-0 bg-glow opacity-30" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
              <Sparkles className="mr-1 h-3 w-3" /> Kecamatan Nanga Mahap
            </Badge>
            <Badge className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
              <Clock className="mr-1 h-3 w-3" />
              {bukaSekarang ? `Buka sampai ${close_time}` : `Tutup — buka ${open_time}`}
            </Badge>
          </div>
          <h1 className="font-display mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Mau apa aja,
            <br />
            tinggal titip!
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-primary-foreground/90">
            Jasa titip makanan, minuman, hingga camilan impianmu. Tinggal duduk manis, hantaran favorit siap meluncur ke tempatmu! Ongkir sesuai jarak.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="lg" className="font-bold">
              <Link to="/checkout">Mulai titip</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent font-bold text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link to="/kurir">
                <Trophy className="h-4 w-4" /> Peringkat kurir
              </Link>
            </Button>
            {adminWa && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent font-bold text-primary-foreground hover:bg-primary-foreground/10"
              >
                <a
                  href={waLink(adminWa, "Halo admin NitipYuk, saya mau tanya-tanya dulu.")}
                  target="_blank"
                  rel="noreferrer"
                >
                  <MessageCircle className="h-4 w-4" /> Hubungi admin
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {!bukaSekarang && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Layanan NitipYuk sedang tutup. Jam operasional {open_time} - {close_time} WIB. Silakan siapkan keranjangmu dulu,
            pesanan bisa dikirim saat kami buka.
          </span>
        </div>
      )}

      {promos.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title flex items-center gap-2">
            <BadgePercent className="h-6 w-6 text-primary" /> Promo & voucher
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Salin kodenya, lalu tempel di halaman keranjang saat checkout.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {promos.map((p) => (
              <article
                key={p.id}
                className="surface-pop card-hover relative overflow-hidden bg-sunset p-4 text-primary-foreground"
              >
                <p className="text-xs font-bold uppercase tracking-widest opacity-80">
                  {p.kind === "persen" ? `Diskon ${p.value}%` : `Potongan ${rupiah(p.value)}`}
                </p>
                <p className="font-display mt-1 text-xl font-black leading-tight">{p.title || p.code}</p>
                {p.description && <p className="mt-1 text-xs opacity-90">{p.description}</p>}
                <p className="mt-2 text-[11px] opacity-90">
                  Min. belanja {rupiah(p.min_spend)}
                  {p.expires_at && ` · s/d ${new Date(p.expires_at).toLocaleDateString("id-ID")}`}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(p.code);
                    toast.success(`Kode ${p.code} disalin`);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary-foreground/60 bg-primary-foreground/10 px-3 py-2 text-sm font-black tracking-wider"
                >
                  <Copy className="h-3.5 w-3.5" /> {p.code}
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {bestSellers.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title flex items-center gap-2">
            <Flame className="h-6 w-6 text-warning" /> Paling sering dititip
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Barang favorit warga Nanga Mahap minggu ini.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {bestSellers.map(card)}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="section-title">Katalog lengkap</h2>
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cari barang..."
            className="h-12 rounded-2xl pl-9 text-base"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => {
            const Icon = categoryIcon(c);
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {c}
              </button>
            );
          })}
        </div>

        {storeNames.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {storeNames.map((s) => (
              <button
                key={s}
                onClick={() => setStore(s)}
                className={`flex items-center gap-1.5 rounded-full border py-1.5 pl-1.5 pr-3.5 text-xs font-bold transition-colors ${
                  store === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                {storeLogos[s] ? (
                  <img
                    src={storeLogos[s]}
                    alt={`Logo ${s}`}
                    className="h-6 w-6 rounded-full border border-border object-cover"
                  />
                ) : (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
                    <Store className="h-3.5 w-3.5" />
                  </span>
                )}
                {s}
              </button>
            ))}
          </div>
        )}


        {store !== "Semua toko" && storeInfo[store] && (
          <div className="surface-card mt-4 p-4">
            <p className="flex items-center gap-2 text-base font-bold">
              {storeLogos[store] ? (
                <img
                  src={storeLogos[store]}
                  alt={`Logo ${store}`}
                  className="h-9 w-9 rounded-xl border border-border object-cover"
                />
              ) : (
                <Store className="h-4 w-4 text-primary" />
              )}
              {store}
            </p>
            {storeInfo[store]?.description && (
              <p className="mt-1 text-sm text-muted-foreground">{storeInfo[store]?.description}</p>
            )}
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link to="/toko/$name" params={{ name: encodeURIComponent(store) }}>
                Lihat profil toko
              </Link>
            </Button>
          </div>
        )}

        {loading ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Memuat katalog...</p>
        ) : filtered.length === 0 ? (
          <div className="surface-pop mt-6 p-8 text-center">
            <p className="text-lg font-bold">Barang tidak ditemukan</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Kamu tetap bisa menitip barang bebas lewat halaman keranjang, atau request barang baru.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link to="/checkout">Titip barang bebas</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/masukan">
                  <MessageSquareHeart className="h-4 w-4" /> Request barang
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map(card)}
          </div>
        )}
      </section>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-black">{detail.name}</DialogTitle>
                <DialogDescription>
                  {detail.category}
                  {detail.store_name && ` · ${detail.store_name}`}
                </DialogDescription>
              </DialogHeader>
              {detail.image_url && images[detail.image_url] && (
                <img
                  src={images[detail.image_url]}
                  alt={detail.name}
                  className="aspect-video w-full rounded-2xl object-cover"
                />
              )}
              {detail.description && <p className="text-sm leading-relaxed">{detail.description}</p>}
              {detail.detail && (
                <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {detail.detail}
                </p>
              )}

              {detailOpsi.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold">Pilih opsi harga</p>
                  {detailOpsi.map((o, i) => (
                    <button
                      key={o.label}
                      type="button"
                      onClick={() => setPilihOpsi(i)}
                      className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors ${
                        pilihOpsi === i ? "border-primary bg-primary/10" : "border-border bg-card"
                      }`}
                    >
                      <span className="text-sm font-semibold">{o.label}</span>
                      <span className="font-display font-extrabold text-primary">{rupiah(o.price)}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="font-display text-2xl font-black text-primary">{rupiah(detail.price)}</p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button
                  className="flex-1 font-bold"
                  disabled={!detail.is_available}
                  onClick={() => {
                    tambah(detail, detailOpsi[pilihOpsi]);
                    setDetail(null);
                  }}
                >
                  <Plus className="h-4 w-4" /> {detail.is_available ? "Masukkan keranjang" : "Kosong"}
                </Button>
                {detail.store_name && (
                  <Button asChild variant="outline">
                    <Link to="/toko/$name" params={{ name: encodeURIComponent(detail.store_name) }}>
                      <Store className="h-4 w-4" /> Profil toko
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
