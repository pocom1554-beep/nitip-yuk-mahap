ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS map_link text NOT NULL DEFAULT '';

ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS site_name text NOT NULL DEFAULT 'NitipYuk',
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT 'Mau apa aja, tinggal titip!',
  ADD COLUMN IF NOT EXISTS site_description text NOT NULL DEFAULT 'Jasa titip online di Kecamatan Nanga Mahap.',
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';

DROP POLICY IF EXISTS "Avatar dibaca pengguna masuk" ON storage.objects;
CREATE POLICY "Avatar dibaca pengguna masuk" ON storage.objects
FOR SELECT TO authenticated USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Pengguna unggah avatar sendiri" ON storage.objects;
CREATE POLICY "Pengguna unggah avatar sendiri" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Pengguna ubah avatar sendiri" ON storage.objects;
CREATE POLICY "Pengguna ubah avatar sendiri" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Pengguna hapus avatar sendiri" ON storage.objects;
CREATE POLICY "Pengguna hapus avatar sendiri" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Logo dibaca siapa saja" ON storage.objects;
CREATE POLICY "Logo dibaca siapa saja" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'branding');

DROP POLICY IF EXISTS "Admin utama kelola logo" ON storage.objects;
CREATE POLICY "Admin utama kelola logo" ON storage.objects
FOR ALL TO authenticated
USING (bucket_id = 'branding' AND public.is_owner(auth.uid()))
WITH CHECK (bucket_id = 'branding' AND public.is_owner(auth.uid()));