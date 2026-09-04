import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBucketUrl } from "@/lib/images";

export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  image_path: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
};

/** Daftar banner + URL gambar, tersinkron realtime. */
export function useBanners(onlyActive = false) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    let query = supabase.from("banners").select("*").order("sort_order").order("created_at");
    if (onlyActive) query = query.eq("is_active", true);
    const { data } = await query;
    const list = (data ?? []) as unknown as Banner[];
    setBanners(list);
    const entries = await Promise.all(
      list.map(async (b) => [b.image_path, await resolveBucketUrl("banners", b.image_path)] as const),
    );
    setUrls(Object.fromEntries(entries.filter(([, v]) => v)) as Record<string, string>);
    setLoading(false);
  }, [onlyActive]);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`banners-${onlyActive ? "public" : "admin"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "banners" }, () => {
        void load();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, onlyActive]);

  return { banners, urls, loading, reload: load };
}
