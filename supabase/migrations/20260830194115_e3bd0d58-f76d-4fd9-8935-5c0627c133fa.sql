DELETE FROM public.products WHERE category = 'shop';

INSERT INTO public.products (name, description, price, image_url, category, sort_order, is_active) VALUES
('Made In Naija Tee', 'Heavyweight cotton, bold statement print', 12500, '/tees/tee-naija.jpg', 'shop', 1, true),
('Limited Edition Tee', 'Cream drop-shoulder with gold script', 11500, '/tees/tee-limited.jpg', 'shop', 2, true),
('God Is Good Tee', 'Obsidian black, premium gold screen print', 12500, '/tees/tee-god.jpg', 'shop', 3, true),
('Growing Daily Tee', 'Soft cream, minimal typography', 11500, '/tees/tee-growing.jpg', 'shop', 4, true),
('Focus & Discipline Tee', 'Forest green oversized fit', 12000, '/tees/tee-focus.jpg', 'shop', 5, true),
('Pretty & Prayerful Tee', 'Dusty rose with delicate serif print', 11500, '/tees/tee-pretty.jpg', 'shop', 6, true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'phone')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  IF lower(coalesce(NEW.email, '')) = 'abbydesignhub@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;