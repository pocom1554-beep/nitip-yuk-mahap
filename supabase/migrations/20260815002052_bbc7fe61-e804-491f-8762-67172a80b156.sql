-- =========================
-- COURIER RATINGS
-- =========================
CREATE TABLE public.courier_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  courier_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  store_name text NOT NULL DEFAULT '',
  stars smallint NOT NULL DEFAULT 5,
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT courier_ratings_stars_range CHECK (stars BETWEEN 1 AND 5)
);

GRANT SELECT ON public.courier_ratings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courier_ratings TO authenticated;
GRANT ALL ON public.courier_ratings TO service_role;

ALTER TABLE public.courier_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ratings_public_read" ON public.courier_ratings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "ratings_insert_own" ON public.courier_ratings
  FOR INSERT TO authenticated
  WITH CHECK (
    customer_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid())
  );

CREATE POLICY "ratings_update_own" ON public.courier_ratings
  FOR UPDATE TO authenticated
  USING (customer_id = auth.uid())
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "ratings_delete_own" ON public.courier_ratings
  FOR DELETE TO authenticated
  USING (customer_id = auth.uid() OR public.is_owner(auth.uid()));

CREATE TRIGGER courier_ratings_touch BEFORE UPDATE ON public.courier_ratings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX courier_ratings_courier_idx ON public.courier_ratings(courier_id);

-- =========================
-- FEEDBACK (kritik / saran / request barang)
-- =========================
CREATE TABLE public.feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'saran',
  item_name text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'baru',
  reply text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feedback_type_check CHECK (type IN ('kritik','saran','request')),
  CONSTRAINT feedback_status_check CHECK (status IN ('baru','ditinjau','selesai','ditolak'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_select_own_or_owner" ON public.feedback
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));

CREATE POLICY "feedback_insert_own" ON public.feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "feedback_update_owner" ON public.feedback
  FOR UPDATE TO authenticated
  USING (public.is_owner(auth.uid()))
  WITH CHECK (public.is_owner(auth.uid()));

CREATE POLICY "feedback_delete_own_or_owner" ON public.feedback
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_owner(auth.uid()));

CREATE TRIGGER feedback_touch BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- STATISTIK PUBLIK
-- =========================
CREATE OR REPLACE FUNCTION public.product_sales()
RETURNS TABLE (product_id uuid, qty numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.id, SUM(COALESCE((it->>'qty')::numeric, 0)) AS qty
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS it
  JOIN public.products p ON lower(p.name) = lower(it->>'name')
  WHERE o.status <> 'batal'
  GROUP BY p.id
$$;

CREATE OR REPLACE FUNCTION public.store_stats()
RETURNS TABLE (store_name text, orders_count bigint, items_count numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.store_name,
         COUNT(DISTINCT o.id) AS orders_count,
         SUM(COALESCE((it->>'qty')::numeric, 0)) AS items_count
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) AS it
  JOIN public.products p ON lower(p.name) = lower(it->>'name')
  WHERE o.status <> 'batal' AND p.store_name <> ''
  GROUP BY p.store_name
$$;

CREATE OR REPLACE FUNCTION public.courier_ranking()
RETURNS TABLE (
  courier_id uuid,
  full_name text,
  avatar_url text,
  delivered bigint,
  avg_minutes numeric,
  avg_stars numeric,
  rating_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
         COALESCE(rt.rating_count, 0)
  FROM public.profiles pr
  JOIN public.user_roles ur ON ur.user_id = pr.id AND ur.role = 'admin'
  LEFT JOIN deliveries d ON d.cid = pr.id
  LEFT JOIN rates rt ON rt.cid = pr.id
  ORDER BY COALESCE(d.delivered, 0) DESC, COALESCE(d.avg_minutes, 999999) ASC
$$;

REVOKE ALL ON FUNCTION public.product_sales() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.store_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.courier_ranking() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.product_sales() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.courier_ranking() TO anon, authenticated;