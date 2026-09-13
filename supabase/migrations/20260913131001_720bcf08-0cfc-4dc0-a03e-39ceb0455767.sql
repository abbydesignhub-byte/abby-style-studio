-- Admin allowlist
CREATE TABLE IF NOT EXISTS public.admin_allowlist (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_allowlist TO authenticated;
GRANT ALL ON public.admin_allowlist TO service_role;
ALTER TABLE public.admin_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view allowlist" ON public.admin_allowlist;
CREATE POLICY "Admins can view allowlist" ON public.admin_allowlist
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.admin_allowlist (email) VALUES
  ('abbydesignhub@gmail.com'),
  ('misanvic8@gmail.com'),
  ('victayo12@gmail.com'),
  ('emmanuelabodunrin808@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Signup trigger: grant admin only to allowlisted emails
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  IF EXISTS (SELECT 1 FROM public.admin_allowlist a WHERE a.email = lower(NEW.email)) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- Backfill: existing allowlisted users become admins, non-allowlisted lose admin
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role FROM auth.users u
JOIN public.admin_allowlist a ON a.email = lower(u.email)
ON CONFLICT (user_id, role) DO NOTHING;

DELETE FROM public.user_roles r
WHERE r.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.admin_allowlist a ON a.email = lower(u.email)
    WHERE u.id = r.user_id
  );

-- Payment channel on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_channel text;

-- Audit log
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_email text,
  action text NOT NULL,
  detail text,
  record_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log" ON public.audit_log
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Admin users listing (email + last login) for admins only
CREATE OR REPLACE FUNCTION public.list_admin_users()
RETURNS TABLE (email text, full_name text, is_registered boolean, last_login timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.email,
         p.full_name,
         (u.id IS NOT NULL) AS is_registered,
         u.last_sign_in_at AS last_login
  FROM public.admin_allowlist a
  LEFT JOIN auth.users u ON lower(u.email) = a.email
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY a.email;
$$;
REVOKE ALL ON FUNCTION public.list_admin_users() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.list_admin_users() TO authenticated, service_role;