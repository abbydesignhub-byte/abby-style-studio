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

export const ORDER_STATUSES = [
  "pending",
  "payment_confirmed",
  "processing",
  "ready_for_delivery",
  "shipped",
  "delivered",
  "cancelled",
] as const;

const orderUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(ORDER_STATUSES),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal("")),
  trackingNote: z.string().trim().max(300).optional().or(z.literal("")),
});

/** Records an admin action in the audit log. Never throws. */
async function audit(
  adminEmail: string,
  action: string,
  detail: string,
  recordId?: string | null,
) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("audit_log")
      .insert({ admin_email: adminEmail, action, detail, record_id: recordId ?? null });
  } catch {
    /* auditing must never block the action */
  }
}

type AuthContext = {
  supabase: {
    rpc: (fn: "has_role", args: { _user_id: string; _role: "admin" }) => Promise<{ data: unknown }>;
  };
  userId: string;
  claims: Record<string, unknown>;
};

/** Throws unless the caller holds the admin role in the database. */
async function assertAdmin(context: AuthContext) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("ACCESS DENIED");
  return (context.claims["email"] as string | undefined)?.toLowerCase() ?? "unknown";
}

export const getIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    return {
      isAdmin: data === true,
      userId: context.userId,
      email: (context.claims["email"] as string | undefined) ?? "",
    };
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
    const email = await assertAdmin(context as unknown as AuthContext);
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
    await audit(email, data.id ? "product.update" : "product.create", data.name, data.id ?? null);
    return { ok: true };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const email = await assertAdmin(context as unknown as AuthContext);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(email, "product.delete", "Product removed", data.id);
    return { ok: true };
  });

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpdateOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => orderUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const email = await assertAdmin(context as unknown as AuthContext);
    const { error } = await context.supabase
      .from("orders")
      .update({
        status: data.status,
        tracking_number: data.trackingNumber || null,
        tracking_note: data.trackingNote || null,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    await audit(email, "order.update", `Status set to ${data.status}`, data.id);
    return { ok: true };
  });

/** Overview figures for the dashboard home — all computed from real orders. */
export const adminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { data: orders } = await context.supabase
      .from("orders")
      .select("total, status, payment_status, customer_phone, created_at, paid_at");
    const { data: products } = await context.supabase.from("products").select("id, is_active");

    const rows = orders ?? [];
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const paid = rows.filter((o) => o.payment_status === "paid");
    const todaysSales = paid
      .filter((o) => new Date(o.paid_at ?? o.created_at) >= startOfToday)
      .reduce((s, o) => s + Number(o.total), 0);

    // Revenue for the last 7 days, oldest first.
    const chart = Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfToday);
      day.setDate(day.getDate() - (6 - i));
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const revenue = paid
        .filter((o) => {
          const d = new Date(o.paid_at ?? o.created_at);
          return d >= day && d < next;
        })
        .reduce((s, o) => s + Number(o.total), 0);
      return { label: day.toLocaleDateString("en-NG", { weekday: "short" }), revenue };
    });

    return {
      todaysSales,
      totalSales: paid.reduce((s, o) => s + Number(o.total), 0),
      totalOrders: rows.length,
      pendingOrders: rows.filter((o) => o.status === "pending").length,
      processingOrders: rows.filter((o) => o.status === "processing").length,
      completedOrders: rows.filter((o) => o.status === "delivered").length,
      pendingPayments: rows.filter((o) => o.payment_status !== "paid").length,
      customers: new Set(rows.map((o) => o.customer_phone)).size,
      products: (products ?? []).filter((p) => p.is_active).length,
      chart,
    };
  });

/** Customers derived from real orders, keyed by phone number. */
export const adminCustomers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { data } = await context.supabase
      .from("orders")
      .select("customer_name, customer_phone, customer_email, total, payment_status, created_at")
      .order("created_at", { ascending: false });

    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        email: string | null;
        orders: number;
        spent: number;
        lastOrder: string;
      }
    >();
    for (const o of data ?? []) {
      const key = o.customer_phone;
      const found = map.get(key);
      if (found) {
        found.orders += 1;
        if (o.payment_status === "paid") found.spent += Number(o.total);
      } else {
        map.set(key, {
          name: o.customer_name,
          phone: o.customer_phone,
          email: o.customer_email,
          orders: 1,
          spent: o.payment_status === "paid" ? Number(o.total) : 0,
          lastOrder: o.created_at,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.spent - a.spent);
  });

/** Payment records taken from the orders that went through Paystack. */
export const adminPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { data } = await context.supabase
      .from("orders")
      .select(
        "id, order_number, customer_name, total, payment_reference, payment_status, payment_channel, payment_method, paid_at, created_at",
      )
      .not("payment_reference", "is", null)
      .order("created_at", { ascending: false })
      .limit(300);
    return data ?? [];
  });

export const adminAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { data } = await context.supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const adminUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as AuthContext);
    const { data } = await context.supabase.rpc("list_admin_users");
    return data ?? [];
  });
