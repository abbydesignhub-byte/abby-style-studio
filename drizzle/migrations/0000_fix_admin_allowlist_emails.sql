-- Authoritative list of the four admin emails
DELETE FROM public.admin_allowlist
WHERE email NOT IN (
  'abbydesignhub@gmail.com',
  'victayo12@yahoo.com',
  'misanvic8@gmail.com',
  'emmanuelabodunrin808@gmail.com'
);

INSERT INTO public.admin_allowlist (email) VALUES
  ('abbydesignhub@gmail.com'),
  ('victayo12@yahoo.com'),
  ('misanvic8@gmail.com'),
  ('emmanuelabodunrin808@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Revoke the admin role from anyone no longer on the list
DELETE FROM public.user_roles ur
WHERE ur.role = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM auth.users u
    JOIN public.admin_allowlist a ON lower(u.email) = a.email
    WHERE u.id = ur.user_id
  );

-- Grant the admin role to any allowlisted account that already exists
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::app_role
FROM auth.users u
JOIN public.admin_allowlist a ON lower(u.email) = a.email
ON CONFLICT (user_id, role) DO NOTHING;