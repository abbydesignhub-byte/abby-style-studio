import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const orderSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(7).max(25),
  customerEmail: z.string().trim().email().max(120).optional().or(z.literal("")),
  paymentMethod: z.enum(["transfer", "whatsapp"]).default("transfer"),
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(120),
        price: z.number().nonnegative().max(10_000_000),
        qty: z.number().int().min(1).max(500),
      }),
    )
    .min(1)
    .max(50),
});

export const listProducts = createServerFn({ method: "GET" }).handler(async () => {
  const { createPublicClient } = await import("./supabase-public.server");
  const { data, error } = await createPublicClient()
    .from("products")
    .select("id, name, description, price, image_url, category, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) return [];
  return data ?? [];
});

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const { createPublicClient } = await import("./supabase-public.server");
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const { data: row, error } = await createPublicClient()
      .from("orders")
      .insert({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail || null,
        payment_method: data.paymentMethod,
        items: data.items,
        total,
      })
      .select("order_number")
      .single();
    if (error || !row) return { ok: false as const, error: "Could not save your order. Please try again." };
    return { ok: true as const, orderNumber: row.order_number, total };
  });

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ orderNumber: z.string().trim().min(3).max(40) }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("orders")
      .select("order_number, status, tracking_number, tracking_note, created_at, total")
      .ilike("order_number", data.orderNumber)
      .maybeSingle();
    if (!row) return { found: false as const };
    return {
      found: true as const,
      orderNumber: row.order_number,
      status: row.status,
      trackingNumber: row.tracking_number,
      trackingNote: row.tracking_note,
      placedAt: row.created_at,
      total: Number(row.total),
    };
  });
