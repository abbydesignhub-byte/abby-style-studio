CREATE TABLE public.support_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_name text,
  customer_email text,
  customer_phone text,
  subject text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','escalated','resolved')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to text,
  tags text[] NOT NULL DEFAULT '{}',
  ai_assisted boolean NOT NULL DEFAULT false,
  is_demo boolean NOT NULL DEFAULT false,
  first_response_at timestamptz,
  resolved_at timestamptz,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_conversations TO authenticated;
GRANT ALL ON public.support_conversations TO service_role;
ALTER TABLE public.support_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage conversations" ON public.support_conversations FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('customer','ai','agent')),
  author text,
  content text NOT NULL,
  ai_drafted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.support_messages(conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage messages" ON public.support_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.support_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.support_conversations(id) ON DELETE CASCADE,
  author text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_notes TO authenticated;
GRANT ALL ON public.support_notes TO service_role;
ALTER TABLE public.support_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage notes" ON public.support_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.support_kb_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  content text NOT NULL,
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_kb_articles TO authenticated;
GRANT ALL ON public.support_kb_articles TO service_role;
ALTER TABLE public.support_kb_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage kb" ON public.support_kb_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.site_settings (key, value) VALUES
 ('support_ai_tone','Warm, polished and concise — like a premium boutique stylist.'),
 ('support_business_info','EMMY & ABBY (Abby''s Custom Tees) — premium Nigerian t-shirts and custom printing. Prices in Naira. Pay by card, USSD or bank transfer via Paystack, or bank transfer to 8055256283 (Abby Design Hub). WhatsApp: 08055256283, 08052680428, 09044746884. Email: abbydesignhub@gmail.com.'),
 ('support_escalation_keywords','refund, complaint, damaged, wrong item, angry, lawyer, scam, not delivered'),
 ('support_hours','Mon–Sat, 9:00–18:00 (WAT)')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.support_kb_articles (title, category, content) VALUES
 ('How do custom t-shirt orders work?','customization','Send your design idea, logo or reference image via the Custom Design section or WhatsApp. We confirm size, colour, quantity and a price quote before printing. Production starts once payment is confirmed.'),
 ('What sizes do you offer?','products','Tees are available in S, M, L, XL and XXL where listed on the product. If unsure, message us your usual size and we will advise.'),
 ('How do I pay?','payment','Pay online by card, USSD or bank transfer through Paystack at checkout, or by direct bank transfer to 8055256283 (Abby Design Hub). Orders are only marked paid once payment is verified.'),
 ('Delivery times','delivery','We deliver nationwide across Nigeria. Typical delivery is 3–5 working days after payment is confirmed. Delivery dates are not guaranteed.'),
 ('How do I track my order?','orders','Use the Track Order section on the homepage and enter your order number. Status updates appear as we process, ship and deliver.'),
 ('Returns and exchanges','returns','If an item arrives damaged or incorrect, contact us on WhatsApp within 48 hours with your order number and photos. Each case is reviewed by our team; custom-printed items are not returnable unless faulty.');

WITH c1 AS (
  INSERT INTO public.support_conversations (customer_name, customer_email, customer_phone, subject, status, priority, tags, is_demo, ai_assisted, first_response_at, last_message_at, created_at)
  VALUES ('Demo — Tolu A.','demo.tolu@example.com','08000000001','Custom tees for birthday','open','normal','{customization}',true,true, now() - interval '2 hours' + interval '1 minute', now() - interval '2 hours', now() - interval '2 hours')
  RETURNING id
), c2 AS (
  INSERT INTO public.support_conversations (customer_name, customer_email, customer_phone, subject, status, priority, tags, is_demo, first_response_at, resolved_at, last_message_at, created_at)
  VALUES ('Demo — Chidi O.','demo.chidi@example.com','08000000002','Item arrived damaged','escalated','high','{returns,complaint}',true, null, null, now() - interval '1 day', now() - interval '1 day')
  RETURNING id
), c3 AS (
  INSERT INTO public.support_conversations (customer_name, customer_email, subject, status, priority, tags, is_demo, ai_assisted, first_response_at, resolved_at, last_message_at, created_at)
  VALUES ('Demo — Amaka E.','demo.amaka@example.com','Delivery time to Abuja','resolved','low','{delivery}',true,true, now() - interval '3 days' + interval '30 seconds', now() - interval '3 days' + interval '10 minutes', now() - interval '3 days', now() - interval '3 days')
  RETURNING id
)
INSERT INTO public.support_messages (conversation_id, sender, author, content, created_at)
SELECT id,'customer','Demo — Tolu A.','Hi, can you print 10 tees with my logo for a birthday?', now() - interval '2 hours' FROM c1
UNION ALL SELECT id,'ai','AI assistant','Yes! Send your logo via the Custom Design section or WhatsApp and we will confirm sizes, colours and a quote before printing.', now() - interval '2 hours' + interval '1 minute' FROM c1
UNION ALL SELECT id,'customer','Demo — Chidi O.','My tee arrived with a torn seam. What can I do?', now() - interval '1 day' FROM c2
UNION ALL SELECT id,'customer','Demo — Amaka E.','How long does delivery to Abuja take?', now() - interval '3 days' FROM c3
UNION ALL SELECT id,'ai','AI assistant','Delivery across Nigeria typically takes 3–5 working days after payment is confirmed.', now() - interval '3 days' + interval '30 seconds' FROM c3;