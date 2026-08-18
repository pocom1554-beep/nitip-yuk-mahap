import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Timer, Package, Medal, Quote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBucketUrl } from "@/lib/images";
import { StarRating } from "@/components/StarRating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/kurir")({
  head: () => ({
    meta: [
      { title: "Peringkat Kurir — NitipYuk" },
      {
        name: "description",
        content:
          "Peringkat kurir NitipYuk Nanga Mahap berdasarkan jumlah pengantaran, kecepatan, dan rating konsumen.",
      },
      { property: "og:title", content: "Peringkat Kurir — NitipYuk" },
      {
        property: "og:description",
        content: "Lihat kurir tercepat dan paling rajin mengantar titipanmu.",
      },
    ],
  }),
  component: PeringkatKurir,
});

type Row = {
  courier_id: string;
  full_name: string;
  avatar_url: string | null;
  delivered: number;
  avg_minutes: number;
  avg_stars: number;
  rating_count: number;
  job_title: string | null;
};

const MEDAL = ["bg-sunset", "bg-mint", "bg-hero"];

type Review = {
  id: string;
  display_name: string;
  store_name: string;
  stars: number;
  comment: string;
  created_at: string;
};

function PeringkatKurir() {
  const [rows, setRows] = useState<Row[]>([]);
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data }, { data: revs }] = await Promise.all([
        supabase.rpc("courier_ranking"),
        supabase.rpc("public_reviews", { _limit: 8 }),
      ]);
      const list = (data ?? []) as unknown as Row[];
      setRows(list);
      setReviews(((revs ?? []) as unknown as Review[]).filter((r) => r.comment));
      const entries = await Promise.all(
        list
          .filter((r) => r.avatar_url)
          .map(async (r) => [r.avatar_url!, await resolveBucketUrl("avatars", r.avatar_url!)] as const),
      );
      setAvatars(Object.fromEntries(entries.filter(([, v]) => v)) as Record<string, string>);
      setLoading(false);
    };
    void load();
  }, []);


  return (
    <main className="mx-auto max-w-3xl px-4 py-6 pb-20">
      <section className="overflow-hidden rounded-3xl bg-hero px-6 py-9 text-primary-foreground shadow-[var(--shadow-pop)]">
        <Trophy className="h-8 w-8" />
        <h1 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">Papan peringkat kurir</h1>
        <p className="mt-2 max-w-md text-sm text-primary-foreground/85">
          Diurutkan dari jumlah pengantaran selesai terbanyak, lalu kecepatan rata-rata antar.
        </p>
      </section>

      {loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Memuat peringkat...</p>
      ) : rows.length === 0 ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Belum ada data pengantaran.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((r, i) => (
            <article key={r.courier_id} className="surface-card card-hover flex items-center gap-4 p-4">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold text-primary-foreground ${
                  i < 3 ? MEDAL[i] : "bg-muted !text-muted-foreground"
                }`}
              >
                {i < 3 ? <Medal className="h-5 w-5" /> : i + 1}
              </div>
              <Avatar className="h-12 w-12">
                {r.avatar_url && avatars[r.avatar_url] && <AvatarImage src={avatars[r.avatar_url]} />}
                <AvatarFallback>{(r.full_name || "K").slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-bold">{r.full_name || "Kurir NitipYuk"}</p>
                {r.job_title && (
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{r.job_title}</p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" /> {r.delivered} antaran
                  </span>
                  {r.avg_minutes > 0 && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" /> rata-rata {Math.round(r.avg_minutes)} menit
                    </span>
                  )}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StarRating value={Number(r.avg_stars)} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {Number(r.avg_stars).toFixed(1)} ({r.rating_count} ulasan)
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {reviews.length > 0 && (
        <section className="mt-10">
          <h2 className="section-title flex items-center gap-2">
            <Quote className="h-6 w-6 text-primary" /> Kata konsumen
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Ulasan terbaru untuk kurir dan toko mitra NitipYuk.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {reviews.slice(0, 6).map((r) => (
              <article key={r.id} className="surface-card p-4">
                <StarRating value={r.stars} size="sm" />
                <p className="mt-2 text-sm leading-relaxed">"{r.comment}"</p>
                <p className="mt-2 text-xs font-semibold text-muted-foreground">
                  {r.display_name || "Konsumen"}
                  {r.store_name && ` · ${r.store_name}`}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

    </main>
  );
}
