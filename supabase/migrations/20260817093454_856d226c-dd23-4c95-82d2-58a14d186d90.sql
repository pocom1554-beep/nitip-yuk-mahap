-- Jam operasional
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS open_time text NOT NULL DEFAULT '07:00',
  ADD COLUMN IF NOT EXISTS close_time text NOT NULL DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS is_open boolean NOT NULL DEFAULT true;

-- Logo toko/mitra
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS logo_url text NOT NULL DEFAULT '';

-- Kurir bisa melihat & menangani pesanan
DROP POLICY IF EXISTS orders_select ON public.orders;
CREATE POLICY orders_select ON public.orders
  FOR SELECT TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'kurir'::public.app_role)
  );

DROP POLICY IF EXISTS orders_update ON public.orders;
CREATE POLICY orders_update ON public.orders
  FOR UPDATE TO authenticated
  USING (
    customer_id = auth.uid()
    OR public.is_owner(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'kurir'::public.app_role))
      AND (claimed_by IS NULL OR claimed_by = auth.uid())
    )
  )
  WITH CHECK (
    customer_id = auth.uid()
    OR public.is_owner(auth.uid())
    OR (
      (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'kurir'::public.app_role))
      AND (claimed_by IS NULL OR claimed_by = auth.uid())
    )
  );

-- Kurir boleh melihat profil dasar rekan/pelanggan yang dibutuhkan dasbor
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = id
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'kurir'::public.app_role)
  );

-- Peringkat kurir kini mencakup peran kurir
DROP FUNCTION IF EXISTS public.courier_ranking();
CREATE OR REPLACE FUNCTION public.courier_ranking()
 RETURNS TABLE(courier_id uuid, full_name text, avatar_url text, delivered bigint, avg_minutes numeric, avg_stars numeric, rating_count bigint, job_title text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH deliveries AS (
    SELECT o.claimed_by AS cid,
           COUNT(*) AS delivered,
           AVG(EXTRACT(EPOCH FROM (o.updated_at - o.claimed_at)) / 60.0) AS avg_minutes
    FROM public.orders o
    WHERE o.claimed_by IS NOT NULL AND o.status = 'selesai' AND o.claimed_at IS NOT NULL
    GROUP BY o.claimed_by
  ),
  rates AS (
    SELECT r.courier_id AS cid, AVG(r.stars::numeric) AS avg_stars, COUNT(*) AS rating_count
    FROM public.courier_ratings r
    WHERE r.courier_id IS NOT NULL
    GROUP BY r.courier_id
  )
  SELECT pr.id,
         pr.full_name,
         pr.avatar_url,
         COALESCE(d.delivered, 0),
         ROUND(COALESCE(d.avg_minutes, 0)::numeric, 1),
         ROUND(COALESCE(rt.avg_stars, 0), 2),
         COALESCE(rt.rating_count, 0),
         pr.job_title
  FROM public.profiles pr
  LEFT JOIN deliveries d ON d.cid = pr.id
  LEFT JOIN rates rt ON rt.cid = pr.id
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = pr.id AND ur.role IN ('admin'::public.app_role, 'kurir'::public.app_role)
  )
  ORDER BY COALESCE(d.delivered, 0) DESC, COALESCE(d.avg_minutes, 999999) ASC
$function$;

REVOKE EXECUTE ON FUNCTION public.courier_ranking() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.courier_ranking() TO authenticated;