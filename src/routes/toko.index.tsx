import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, Clock, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBucketUrl } from "@/lib/images";

export const Route = createFileRoute("/toko/")({
  head: () => ({
    meta: [
      { title: "Toko Paling Laris — NitipYuk" },
      {
        name: "description",
        content:
          "Daftar toko dan mitra paling laris di Kecamatan Nanga Mahap beserta jumlah pesanan dan barang terjual lewat NitipYuk.",
      },
      { property: "og:title", content: "Toko Paling Laris — NitipYuk" },
      { property: "og:description", content: "Lihat toko mitra favorit warga Nanga Mahap." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TokoTerlaris,
});

type Stat = { store_name: string; orders_count: number; items_count: number };
type Info = { name: string; description: string; open_hours: string; logo_url: string };

function TokoTerlaris() {
  const [stats, setStats] = useState<Stat[]>([]);
  const [info, setInfo] = useState<Record<string, Info>>({});
  const [logos, setLogos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: s }, { data: rows }] = await Promise.all([
        supabase.rpc("store_stats"),
        supabase.from("stores").select("name, description, open_hours, logo_url"),
      ]);
      const list = (rows ?? []) as unknown as Info[];
      const statList = ((s ?? []) as unknown as Stat[]).slice();
      // Toko tanpa transaksi tetap ditampilkan di bawah.
      for (const st of list) {
        if (!statList.some((x) => x.store_name === st.name)) {
          statList.push({ store_name: st.name, orders_count: 0, items_count: 0 });
        }
      }
      statList.sort((a, b) => Number(b.orders_count) - Number(a.orders_count));
      setStats(statList);
      setInfo(Object.fromEntries(list.map((x) => [x.name, x])));
      const entries = await Promise.all(
        list.filter((x) => x.logo_url).map(async (x) => [x.name, await resolveBucketUrl("branding", x.logo_url)] as const),
      );
      setLogos(Object.fromEntries(entries.filter(([, v]) => v)) as Record<string, string>);
      setLoading(false);
    };
    void load();
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6 pb-20">
      <section className="overflow-hidden rounded-3xl bg-hero px-6 py-9 text-primary-foreground shadow-[var(--shadow-pop)]">
        <TrendingUp className="h-8 w-8" />
        <h1 className="font-display mt-3 text-3xl font-black leading-tight sm:text-4xl">Toko paling laris</h1>
        <p className="mt-2 max-w-md text-sm text-primary-foreground/85">
          Diurutkan dari jumlah pesanan terbanyak. Ketuk toko untuk melihat profil, ulasan, dan barangnya.
        </p>
      </section>

      {loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Memuat toko...</p>
      ) : stats.length === 0 ? (
        <p className="surface-card mt-6 p-8 text-center text-sm text-muted-foreground">Belum ada toko mitra terdaftar.</p>
      ) : (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {stats.map((s, i) => (
            <Link
              key={s.store_name}
              to="/toko/$name"
              params={{ name: encodeURIComponent(s.store_name) }}
              className="surface-card card-hover flex gap-3 p-4"
            >
              {logos[s.store_name] ? (
                <img
                  src={logos[s.store_name]}
                  alt={`Logo ${s.store_name}`}
                  className="h-12 w-12 shrink-0 rounded-2xl border border-border object-cover"
                />
              ) : (
                <span
                  className={`font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black text-primary-foreground ${
                    i === 0 ? "bg-sunset" : i === 1 ? "bg-mint" : "bg-hero"
                  }`}
                >
                  {i + 1}
                </span>
              )}
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-base font-bold">
                  <Store className="h-4 w-4 text-primary" />
                  <span className="truncate">{s.store_name}</span>
                </span>
                <span className="block text-xs text-muted-foreground">
                  {s.orders_count} pesanan · {s.items_count} barang terjual
                </span>
                {info[s.store_name]?.open_hours && (
                  <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {info[s.store_name]?.open_hours}
                  </span>
                )}
                {info[s.store_name]?.description && (
                  <span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
                    {info[s.store_name]?.description}
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
