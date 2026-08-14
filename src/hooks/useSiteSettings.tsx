import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveBucketUrl } from "@/lib/images";

export type SiteBranding = {
  site_name: string;
  tagline: string;
  site_description: string;
  logo_url: string;
};

type State = SiteBranding & { logoSrc: string | null; refresh: () => Promise<void> };

const DEFAULTS: SiteBranding = {
  site_name: "NitipYuk",
  tagline: "Mau apa aja, tinggal titip!",
  site_description: "Jasa titip online di Kecamatan Nanga Mahap.",
  logo_url: "",
};

const Ctx = createContext<State | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<SiteBranding>(DEFAULTS);
  const [logoSrc, setLogoSrc] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("settings")
      .select("site_name, tagline, site_description, logo_url")
      .eq("id", 1)
      .maybeSingle();
    if (!data) return;
    const next: SiteBranding = {
      site_name: data.site_name || DEFAULTS.site_name,
      tagline: data.tagline || DEFAULTS.tagline,
      site_description: data.site_description || DEFAULTS.site_description,
      logo_url: data.logo_url || "",
    };
    setBranding(next);
    setLogoSrc(await resolveBucketUrl("branding", next.logo_url));
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return <Ctx.Provider value={{ ...branding, logoSrc, refresh }}>{children}</Ctx.Provider>;
}

export function useSiteSettings(): State {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSiteSettings harus dipakai di dalam SiteSettingsProvider");
  return ctx;
}
