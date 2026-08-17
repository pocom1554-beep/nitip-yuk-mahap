import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBucketUrl } from "@/lib/images";
import { sedangBuka } from "@/lib/format";

export type SiteBranding = {
  site_name: string;
  tagline: string;
  site_description: string;
  logo_url: string;
  open_time: string;
  close_time: string;
  is_open: boolean;
};

type State = SiteBranding & { logoSrc: string | null; bukaSekarang: boolean; refresh: () => Promise<void> };

const DEFAULTS: SiteBranding = {
  site_name: "NitipYuk",
  tagline: "Mau apa aja, tinggal titip!",
  site_description: "Jasa titip online di Kecamatan Nanga Mahap.",
  logo_url: "",
  open_time: "07:00",
  close_time: "21:00",
  is_open: true,
};

const Ctx = createContext<State | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<SiteBranding>(DEFAULTS);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("settings")
      .select("site_name, tagline, site_description, logo_url, open_time, close_time, is_open")
      .eq("id", 1)
      .maybeSingle();
    if (!data) return;
    const next: SiteBranding = {
      site_name: data.site_name || DEFAULTS.site_name,
      tagline: data.tagline || DEFAULTS.tagline,
      site_description: data.site_description || DEFAULTS.site_description,
      logo_url: data.logo_url || "",
      open_time: data.open_time || DEFAULTS.open_time,
      close_time: data.close_time || DEFAULTS.close_time,
      is_open: data.is_open ?? true,
    };
    setBranding(next);
    setLogoSrc(await resolveBucketUrl("branding", next.logo_url));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Perbarui status buka/tutup tiap menit.
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, []);

  const bukaSekarang = sedangBuka(branding, new Date(tick ? Date.now() : Date.now()));

  return <Ctx.Provider value={{ ...branding, logoSrc, bukaSekarang, refresh }}>{children}</Ctx.Provider>;
}

export function useSiteSettings(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSiteSettings harus dipakai di dalam SiteSettingsProvider");
  return ctx;
}
