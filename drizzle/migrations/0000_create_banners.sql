CREATE TABLE public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  subtitle text NOT NULL DEFAULT '',
  image_path text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banners TO authenticated;
GRANT ALL ON public.banners TO service_role;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banners_public_read" ON public.banners FOR SELECT USING (true);
CREATE POLICY "banners_admin_insert" ON public.banners FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "banners_admin_update" ON public.banners FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "banners_admin_delete" ON public.banners FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.banners;

CREATE POLICY "banners_bucket_read" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "banners_bucket_admin_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "banners_bucket_admin_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "banners_bucket_admin_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));