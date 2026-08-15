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
  Quote,
  MessageSquareHeart,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveImageUrls } from "@/lib/images";
import { rupiah, waLink } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NitipYuk — Jasa Titip Kecamatan Nanga Mahap" },
      {
        name: "description",
        content:
          "Titip belanjaan apa saja di Kecamatan Nanga Mahap. Pilih dari katalog, lihat barang best seller dan toko terpopuler, lalu chat admin via WhatsApp.",
      },
      { property: "og:title", content: "NitipYuk — Jasa Titip Kecamatan Nanga Mahap" },
      { property: "og:description", content: "Mau apa aja, tinggal titip!" },
    ],
  }),
  component: Katalog,
});

type Product = {
  id: string;
  name: string;
  store_name: string;
  description: string;
  category: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
};

type Review = {
  id: string;
  customer_name: string;
  store_name: string;
  stars: number;
  comment: string;
  created_at: string;
};

function Katalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [sales, setSales] = useState<Record<string, number>>({});
  const [stores, setStores] = useState<{ store_name: string; orders_count: number; items_count: number }[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [adminWa, setAdminWa] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [store, setStore] = useState("Semua toko");
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    const load = async () => {
      const [{ data: prods }, { data: setting }, { data: sale }, { data: stats }, { data: revs }] =
        await Promise.all([
          supabase.from("products").select("*").order("created_at", { ascending: false }),
          supabase.from("settings").select("admin_whatsapp").eq("id", 1).maybeSingle(),
          supabase.rpc("product_sales"),
          supabase.rpc("store_stats"),
          supabase
            .from("courier_ratings")
            .select("id, customer_name, store_name, stars, comment, created_at")
            .order("created_at", { ascending: false })
            .limit(8),
        ]);
      const list = (prods ?? []) as unknown as Product[];
      setProducts(list);
      setAdminWa(setting?.admin_whatsapp ?? "");
      setSales(Object.fromEntries((sale ?? []).map((s) => [s.product_id, Number(s.qty)])));
      setStores((stats ?? []) as { store_name: string; orders_count: number; items_count: number }[]);
      setReviews(((revs ?? []) as unknown as Review[]).filter((r) => r.comment));
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
        p.description.toLowerCase().includes(q.toLowerCase())),
  );

  const card = (p: Product) => (
    <article key={p.id} className="surface-pop card-hover flex flex-col overflow-hidden">
      <div className="relative aspect-square bg-muted">
        {p.image_url && images[p.image_url] ? (
          <img
            src={images[p.image_url]}
            alt={p.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
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
        {!p.is_available && (
          <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-bold text-muted-foreground">
            Kosong
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{p.category}</p>
        <h3 className="font-display line-clamp-2 text-base font-extrabold leading-snug">{p.name}</h3>
        {p.store_name && (
          <p className="flex items-center gap-1 truncate text-xs font-medium text-muted-foreground">
            <Store className="h-3.5 w-3.5 shrink-0" />
            {p.store_name}
          </p>
        )}
        {p.description && (
          <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {p.description}
          </p>
        )}
        <p className="font-display mt-auto pt-1 text-lg font-extrabold text-primary">
          {rupiah(p.price)}
        </p>
        <Button
          size="sm"
          className="mt-1 w-full font-bold"
          disabled={!p.is_available}
          onClick={() => {
            add({ id: p.id, name: p.name, price: Number(p.price), image: p.image_url });
            toast.success(`${p.name} masuk keranjang`);
          }}
        >
          <Plus className="h-4 w-4" />
          {p.is_available ? "Titip" : "Kosong"}
        </Button>
      </div>
    </article>
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pb-20">
      <section className="relative mt-4 overflow-hidden rounded-4xl bg-hero px-6 py-12 text-primary-foreground shadow-[var(--shadow-pop)]">
        <div className="absolute inset-0 bg-glow opacity-30" />
        <div className="relative">
          <Badge className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
            <Sparkles className="mr-1 h-3 w-3" /> Kecamatan Nanga Mahap
          </Badge>
          <h1 className="font-display mt-4 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Mau apa aja,
            <br />
            tinggal titip!
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-primary-foreground/90">
            Sembako, makanan, obat, sampai barang toko — kami belikan dan antar ke rumahmu. Ongkos
            titip menyesuaikan jarak.
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

      {stores.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title flex items-center gap-2">
            <Store className="h-6 w-6 text-primary" /> Toko paling laris
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {stores.slice(0, 6).map((s, i) => (
              <button
                key={s.store_name}
                onClick={() => {
                  setStore(s.store_name);
                  setCat("Semua");
                }}
                className="surface-card card-hover flex items-center gap-3 p-4 text-left"
              >
                <span
                  className={`font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-primary-foreground ${
                    i === 0 ? "bg-sunset" : i === 1 ? "bg-mint" : "bg-hero"
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-base font-bold">{s.store_name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.orders_count} pesanan · {s.items_count} barang terjual
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title flex items-center gap-2">
            <Quote className="h-6 w-6 text-primary" /> Kata konsumen
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {reviews.slice(0, 6).map((r) => (
              <article key={r.id} className="surface-card p-4">
                <StarRating value={r.stars} size="sm" />
                <p className="mt-2 text-sm leading-relaxed">"{r.comment}"</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {r.customer_name || "Konsumen"}
                  {r.store_name && ` · ${r.store_name}`}
                </p>
              </article>
            ))}
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
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                cat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {storeNames.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {storeNames.map((s) => (
              <button
                key={s}
                onClick={() => setStore(s)}
                className={`flex items-center gap-1 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${
                  store === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <Store className="h-3.5 w-3.5" />
                {s}
              </button>
            ))}
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
    </main>
  );
}
