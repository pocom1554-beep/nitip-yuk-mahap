ALTER TABLE public.promos ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'semua';

CREATE TABLE IF NOT EXISTS public.promo_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id uuid NOT NULL REFERENCES public.promos(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (promo_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.promo_targets TO authenticated;
GRANT ALL ON public.promo_targets TO service_role;

ALTER TABLE public.promo_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY promo_targets_select ON public.promo_targets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY promo_targets_insert_owner ON public.promo_targets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY promo_targets_delete_owner ON public.promo_targets
  FOR DELETE TO authenticated
  USING (public.is_owner(auth.uid()));

DROP POLICY IF EXISTS promos_public_read ON public.promos;

CREATE POLICY promos_public_read ON public.promos
  FOR SELECT TO anon, authenticated
  USING (audience = 'semua');

CREATE POLICY promos_targeted_read ON public.promos
  FOR SELECT TO authenticated
  USING (
    audience = 'khusus' AND EXISTS (
      SELECT 1 FROM public.promo_targets t
      WHERE t.promo_id = promos.id AND t.user_id = auth.uid()
    )
  );
