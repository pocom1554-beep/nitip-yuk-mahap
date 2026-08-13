import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { MessageCircle, Search, Plus, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveImageUrls } from "@/lib/images";
import { rupiah, waLink } from "@/lib/format";
import { useCart } from "@/hooks/useCart";
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
          "Titip belanjaan apa saja di Kecamatan Nanga Mahap. Pilih dari katalog, hitung ongkos titip sesuai jarak, lalu chat admin via WhatsApp.",
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
  description: string;
  category: string;
  price: number;
  image_url: string | null;
  is_available: boolean;
};

function Katalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<Record<string, string>>({});
  const [adminWa, setAdminWa] = useState("");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("Semua");
  const [loading, setLoading] = useState(true);
  const { add } = useCart();

  useEffect(() => {
    const load = async () => {
      const [{ data: prods }, { data: setting }] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("settings").select("admin_whatsapp").eq("id", 1).maybeSingle(),
      ]);
      const list = (prods ?? []) as unknown as Product[];
      setProducts(list);
      setAdminWa(setting?.admin_whatsapp ?? "");
      setImages(await resolveImageUrls(list.map((p) => p.image_url)));
      setLoading(false);
    };
    void load();
  }, []);

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((p) => p.category)))],
    [products],
  );

  const filtered = products.filter(
    (p) =>
      (cat === "Semua" || p.category === cat) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) ||
        p.description.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16">
      <section className="mt-4 overflow-hidden rounded-3xl bg-hero px-6 py-10 text-primary-foreground shadow-[var(--shadow-lift)]">
        <Badge className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/20">
          Kecamatan Nanga Mahap
        </Badge>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">
          Mau apa aja, tinggal titip!
        </h1>
        <p className="mt-2 max-w-md text-sm text-primary-foreground/85">
          Belanja sembako, makanan, obat, sampai barang toko — kami belikan dan antar ke rumahmu.
          Ongkos titip menyesuaikan jarak.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="lg">
            <Link to="/checkout">Mulai titip</Link>
          </Button>
          {adminWa && (
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
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
      </section>

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari barang..."
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                cat === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-accent"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Memuat katalog...</p>
        ) : filtered.length === 0 ? (
          <div className="surface-card mt-6 p-8 text-center">
            <p className="font-semibold">Katalog masih kosong</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Kamu tetap bisa menitip barang bebas lewat halaman keranjang.
            </p>
            <Button asChild className="mt-4">
              <Link to="/checkout">Titip barang bebas</Link>
            </Button>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => (
              <article key={p.id} className="surface-card overflow-hidden">
                <div className="aspect-square bg-muted">
                  {p.image_url && images[p.image_url] ? (
                    <img
                      src={images[p.image_url]}
                      alt={p.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-7 w-7" />
                    </div>
                  )}
                </div>
                <div className="space-y-1 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {p.category}
                  </p>
                  <h2 className="line-clamp-2 text-sm font-semibold leading-snug">{p.name}</h2>
                  <p className="text-sm font-extrabold text-primary">{rupiah(p.price)}</p>
                  <Button
                    size="sm"
                    className="mt-1 w-full"
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
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
