
CREATE TYPE public.app_role AS ENUM ('admin', 'customer');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  is_owner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND is_owner = true);
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "roles_insert_owner" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.is_owner(auth.uid()));
CREATE POLICY "roles_delete_owner" ON public.user_roles FOR DELETE TO authenticated
  USING (public.is_owner(auth.uid()) AND NOT public.is_owner(user_id));

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Lainnya',
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_read" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "products_admin_write" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL DEFAULT '',
  customer_whatsapp TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  distance_km NUMERIC(6,2) NOT NULL DEFAULT 0,
  items_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'baru',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select" ON public.orders FOR SELECT TO authenticated
  USING (customer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "orders_insert_own" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (customer_id = auth.uid());
CREATE POLICY "orders_update" ON public.orders FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR customer_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR customer_id = auth.uid());

CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  base_fee NUMERIC(12,2) NOT NULL DEFAULT 5000,
  per_km_fee NUMERIC(12,2) NOT NULL DEFAULT 2000,
  free_km NUMERIC(6,2) NOT NULL DEFAULT 1,
  admin_whatsapp TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settings_single_row CHECK (id = 1)
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "settings_admin_update" ON public.settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.settings (id) VALUES (1);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  first_user BOOLEAN;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO first_user;
  INSERT INTO public.profiles (id, full_name, whatsapp, address, is_owner)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    first_user
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN first_user THEN 'admin'::public.app_role ELSE 'customer'::public.app_role END);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER products_touch BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER orders_touch BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
