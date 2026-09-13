import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/** Orders that belong to the signed-in customer (by account id or account email). */
export const myOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = (context.claims["email"] as string | undefined)?.toLowerCase() ?? "";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const filter = email
      ? `user_id.eq.${context.userId},customer_email.ilike.${email}`
      : `user_id.eq.${context.userId}`;
    const { data, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, payment_status, payment_channel, total, items, tracking_number, tracking_note, created_at",
      )
      .or(filter)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return [];
    return data ?? [];
  });

export const myProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      email: (context.claims["email"] as string | undefined) ?? "",
      fullName: data?.full_name ?? "",
      phone: data?.phone ?? "",
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        fullName: z.string().trim().max(80),
        phone: z.string().trim().max(25),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ full_name: data.fullName || null, phone: data.phone || null })
      .eq("id", context.userId);
    if (error) return { ok: false as const, error: "Could not save your details." };
    return { ok: true as const };
  });
