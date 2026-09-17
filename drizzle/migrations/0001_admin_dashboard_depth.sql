-- Product depth: stock, variants, featured, compare price
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS low_stock_threshold integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS sizes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS colors text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(12,2);

-- Custom t-shirt / bespoke orders
CREATE TABLE IF NOT EXISTS public.custom_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  customer_email text,
  details text NOT NULL,
  size text,
  colour text,
  quantity integer NOT NULL DEFAULT 1,
  reference_image_url text,
  quoted_price numeric(12,2),
  status text NOT NULL DEFAULT 'new',
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_orders TO authenticated;
GRANT INSERT ON public.custom_orders TO anon;
GRANT ALL ON public.custom_orders TO service_role;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone can request a custom order" ON public.custom_orders;
CREATE POLICY "anyone can request a custom order" ON public.custom_orders
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admins manage custom orders" ON public.custom_orders;
CREATE POLICY "admins manage custom orders" ON public.custom_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Discount coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage','fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  min_order_total numeric(12,2) NOT NULL DEFAULT 0,
  usage_limit integer,
  times_used integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admins manage coupons" ON public.coupons;
CREATE POLICY "admins manage coupons" ON public.coupons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Product reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT SELECT, INSERT ON public.reviews TO anon;
GRANT ALL ON public.reviews TO service_role;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approved reviews are public" ON public.reviews;
CREATE POLICY "approved reviews are public" ON public.reviews
  FOR SELECT TO anon, authenticated USING (is_approved);
DROP POLICY IF EXISTS "anyone can submit a review" ON public.reviews;
CREATE POLICY "anyone can submit a review" ON public.reviews
  FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "admins manage reviews" ON public.reviews;
CREATE POLICY "admins manage reviews" ON public.reviews
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Store settings
CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_settings TO authenticated;
GRANT SELECT ON public.site_settings TO anon;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings are public" ON public.site_settings;
CREATE POLICY "settings are public" ON public.site_settings
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "admins manage settings" ON public.site_settings;
CREATE POLICY "admins manage settings" ON public.site_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.site_settings (key, value) VALUES
  ('store_name', 'EMMY & ABBY'),
  ('whatsapp_number', '2348055256283'),
  ('support_email', 'abbydesignhub@gmail.com'),
  ('delivery_info', 'Nationwide delivery in 3-5 working days.'),
  ('announcement', 'Weekend Fashion Sale — 20% off selected styles.'),
  ('instagram_url', ''),
  ('facebook_url', ''),
  ('tiktok_url', '')
ON CONFLICT (key) DO NOTHING;