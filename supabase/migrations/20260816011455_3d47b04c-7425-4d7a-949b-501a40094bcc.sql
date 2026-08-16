-- 1. STORES
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  open_hours text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY stores_public_read ON public.stores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY stores_admin_write ON public.stores FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER stores_touch BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2. PRODUCTS: price options + detail
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS price_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS detail text NOT NULL DEFAULT '';

-- 3. ADMIN JOB TITLE
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '';
CREATE POLICY profiles_update_owner ON public.profiles FOR UPDATE TO authenticated
  USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));

-- 4. PROMOS / VOUCHERS
CREATE TABLE public.promos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'persen',
  value numeric NOT NULL DEFAULT 0,
  min_spend numeric NOT NULL DEFAULT 0,
  max_discount numeric NOT NULL DEFAULT 0,
  quota integer NOT NULL DEFAULT 0,
  used_count integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.promos TO anon;
GRANT SELECT ON public.promos TO authenticated;
GRANT ALL ON public.promos TO service_role;
ALTER TABLE public.promos ENABLE ROW LEVEL SECURITY;
CREATE POLICY promos_public_read ON public.promos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY promos_owner_write ON public.promos FOR ALL TO authenticated
  USING (is_owner(auth.uid())) WITH CHECK (is_owner(auth.uid()));
GRANT INSERT, UPDATE, DELETE ON public.promos TO authenticated;
CREATE TRIGGER promos_touch BEFORE UPDATE ON public.promos FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5. ORDERS: applied promo
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS promo_code text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

-- 6. SECURITY: stop exposing rater identity publicly
DROP POLICY IF EXISTS ratings_public_read ON public.courier_ratings;
CREATE POLICY ratings_select_own_or_admin ON public.courier_ratings FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
REVOKE SELECT ON public.courier_ratings FROM anon;

CREATE OR REPLACE FUNCTION public.public_reviews(_limit integer DEFAULT 8)
RETURNS TABLE(id uuid, display_name text, store_name text, stars smallint, comment text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT r.id,
         CASE
           WHEN coalesce(r.customer_name, '') = '' THEN 'Konsumen'
           ELSE split_part(r.customer_name, ' ', 1) || ' ' ||
                CASE WHEN position(' ' in r.customer_name) > 0
                     THEN left(split_part(r.customer_name, ' ', 2), 1) || '.'
                     ELSE '' END
         END,
         r.store_name,
         r.stars,
         r.comment,
         r.created_at
  FROM public.courier_ratings r
  WHERE coalesce(r.comment, '') <> ''
  ORDER BY r.created_at DESC
  LIMIT greatest(1, least(coalesce(_limit, 8), 24))
$$;
GRANT EXECUTE ON FUNCTION public.public_reviews(integer) TO anon, authenticated;