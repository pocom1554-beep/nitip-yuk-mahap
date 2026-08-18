import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Clock, ImageIcon, MapPin, MessageCircle, Plus, Quote, Star, Store } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBucketUrl, resolveImageUrls } from "@/lib/images";
import { rupiah, waLink } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
import { StarRating } from "@/components/StarRating";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


export const Route = createFileRoute("/toko/$name")({
  head: ({ params }) => ({
    meta: [
      { title: `${decodeURIComponent(params.name)} — Toko Mitra NitipYuk` },
      {
        name: "description",
        content: `Profil lengkap ${decodeURIComponent(params.name)}: deskripsi toko, jam buka, dan daftar barang yang bisa dititip lewat NitipYuk.`,
      },
      { property: "og:title", content: `${decodeURIComponent(params.name)} — Toko Mitra NitipYuk` },
      { property: "og:description", content: "Lihat detail toko mitra dan barang yang bisa dititip." },
    ],
  }),
  component: DetailToko,
});

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

type StoreRow = {
  name: string;
  description: string;
  address: string;
  open_hours: string;
  whatsapp: string;
  logo_url: string;
};

type Review = {
  id: string;
  display_name: string;
  store_name: string;
  stars: number;
  comment: string;
  created_at: string;
};

type Opsi = { label: string; price: number };


export function parseOpsi(raw: unknown): Opsi[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o) => o as { label?: unknown; price?: unknown })
    .filter((o) => typeof o?.label === "string" && o.label.trim() !== "")
    .map((o) => ({ label: String(o.label), price: Number(o.price) || 0 }));
}

function DetailToko() {
  const { name } = Route.useParams();
  const storeName = decodeURIComponent(name);
  const [info, setInfo] = useState<StoreRow | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [stats, setStats] = useState<{ orders_count: number; items_count: number } | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    const load = async () => {
      const [{ data: store }, { data: prods }, { data: allStats }, { data: revs }] = await Promise.all([
        supabase.from("stores").select("name, description, address, open_hours, whatsapp, logo_url").eq("name", storeName).maybeSingle(),
        supabase.from("products").select("*").eq("store_name", storeName).order("name"),
        supabase.rpc("store_stats"),
        supabase.rpc("public_reviews", { _limit: 24 }),
      ]);
      const st = (store as unknown as StoreRow) ?? null;
      setInfo(st);
      setLogo(st?.logo_url ? await resolveBucketUrl("branding", st.logo_url) : null);
      const list = (prods ?? []) as unknown as Product[];
      setProducts(list);
      setImages(await resolveImageUrls(list.map((p) => p.image_url)));
      const s = (allStats ?? []).find((x) => x.store_name === storeName);
      setStats(s ? { orders_count: Number(s.orders_count), items_count: Number(s.items_count) } : null);
      setReviews(
        ((revs ?? []) as unknown as Review[]).filter((r) => r.comment && r.store_name === storeName).slice(0, 6),
      );
      setLoading(false);
    };
    void load();
  }, [storeName]);


  return (
    <main className="mx-auto max-w-5xl px-4 pb-20">
      <section className="relative mt-4 overflow-hidden rounded-4xl bg-hero px-6 py-10 text-primary-foreground shadow-[var(--shadow-pop)]">
        <div className="absolute inset-0 bg-glow opacity-30" />
        <div className="relative">
          <div className="flex items-center gap-3">
            {logo && (
              <img
                src={logo}
                alt={`Logo ${storeName}`}
                className="h-16 w-16 rounded-2xl border border-primary-foreground/30 bg-background object-cover"
              />
            )}
            <Badge className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
              <Store className="mr-1 h-3 w-3" /> Toko mitra
            </Badge>
          </div>
          <h1 className="font-display mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
            {storeName}
          </h1>
          {info?.description ? (
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-primary-foreground/90">
              {info.description}
            </p>
          ) : (
            <p className="mt-3 text-sm text-primary-foreground/80">
              Deskripsi toko belum ditulis admin.
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-primary-foreground/90">
            {info?.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {info.address}
              </span>
            )}
            {info?.open_hours && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" /> {info.open_hours}
              </span>
            )}
            {stats && (
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4" /> {stats.orders_count} pesanan · {stats.items_count} barang terjual
              </span>
            )}
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="secondary" className="font-bold">
              <Link to="/">Lihat semua toko</Link>
            </Button>
            {info?.whatsapp && (
              <Button
                asChild
                variant="outline"
                className="border-primary-foreground/40 bg-transparent font-bold text-primary-foreground hover:bg-primary-foreground/10"
              >
                <a href={waLink(info.whatsapp, `Halo ${storeName}, saya mau tanya barang lewat NitipYuk.`)} target="_blank" rel="noreferrer">
                  <MessageCircle className="h-4 w-4" /> Chat toko
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="section-title">Barang dari toko ini</h2>
        {loading ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">Memuat...</p>
        ) : products.length === 0 ? (
          <p className="surface-card mt-4 p-8 text-center text-sm text-muted-foreground">
            Belum ada barang terdaftar untuk toko ini.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => {
              const opsi = parseOpsi(p.price_options);
              const harga = opsi.length ? Math.min(...opsi.map((o) => o.price)) : Number(p.price);
              return (
                <article key={p.id} className="surface-pop card-hover flex flex-col overflow-hidden">
                  <div className="aspect-square bg-muted">
                    {p.image_url && images[p.image_url] ? (
                      <img src={images[p.image_url]} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col gap-1.5 p-3.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary">{p.category}</p>
                    <h3 className="font-display line-clamp-2 text-base font-extrabold leading-snug">{p.name}</h3>
                    {p.description && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{p.description}</p>
                    )}
                    {p.detail && (
                      <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{p.detail}</p>
                    )}
                    <p className="font-display mt-auto pt-1 text-lg font-extrabold text-primary">
                      {opsi.length ? `Mulai ${rupiah(harga)}` : rupiah(harga)}
                    </p>
                    <Button
                      size="sm"
                      className="mt-1 w-full font-bold"
                      disabled={!p.is_available}
                      onClick={() => {
                        add({ id: p.id, name: p.name, price: harga, image: p.image_url });
                        toast.success(`${p.name} masuk keranjang`);
                      }}
                    >
                      <Plus className="h-4 w-4" /> {p.is_available ? "Titip" : "Kosong"}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
