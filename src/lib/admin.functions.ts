import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const productSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  price: z.number().nonnegative().max(10_000_000),
  imageUrl: z.string().trim().max(500).optional().or(z.literal("")),
  category: z.enum(["shop", "premium", "deal"]),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

const orderUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "paid", "printing", "shipped", "delivered", "cancelled"]),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal("")),
  trackingNote: z.string().trim().max(300).optional().or(z.literal("")),
});

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return { isAdmin: data === true, userId: context.userId };
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => productSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row = {
      name: data.name,
      description: data.description || null,
      price: data.price,
      image_url: data.imageUrl || null,
      category: data.category,
      sort_order: data.sortOrder,
      is_active: data.isActive,
    };
    const query = data.id
      ? context.supabase.from("products").update(row).eq("id", data.id)
      : context.supabase.from("products").insert(row);
    const { error } = await query;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("orders")
      .update({
        status: data.status,
        tracking_number: data.trackingNumber || null,
        tracking_note: data.trackingNote || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
