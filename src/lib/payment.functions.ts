import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const startSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.string().trim().min(7).max(25),
  customerEmail: z.string().trim().email().max(120),
  callbackUrl: z.string().trim().url().max(300),
  channel: z.enum(["card", "ussd", "bank_transfer"]).default("card"),
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

/**
 * Creates the order, then opens a Paystack checkout for it.
 * Returns the hosted payment page URL for the browser to redirect to.
 */
export const startOnlinePayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => startSchema.parse(input))
  .handler(async ({ data }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) {
      return { ok: false as const, error: "Online payment is not configured yet. Please use bank transfer." };
    }

    const { createPublicClient } = await import("./supabase-public.server");
    const total = data.items.reduce((s, i) => s + i.price * i.qty, 0);
    const reference = `ADH-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`.toUpperCase();

    const { data: row, error } = await createPublicClient()
      .from("orders")
      .insert({
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        customer_email: data.customerEmail,
        payment_method: "paystack",
        payment_reference: reference,
        payment_status: "unpaid",
        payment_channel: data.channel,
        items: data.items,
        total,
      })
      .select("order_number")
      .single();

    if (error || !row) {
      return { ok: false as const, error: "Could not start your payment. Please try again." };
    }

    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: data.customerEmail,
        amount: Math.round(total * 100),
        currency: "NGN",
        reference,
        callback_url: data.callbackUrl,
        channels: [data.channel],
        metadata: { order_number: row.order_number, customer_phone: data.customerPhone },
      }),
    });

    const json = (await res.json().catch(() => null)) as
      | { status?: boolean; data?: { authorization_url?: string } }
      | null;

    if (!res.ok || !json?.status || !json.data?.authorization_url) {
      return { ok: false as const, error: "Payment provider is unavailable. Please pay by bank transfer." };
    }

    return {
      ok: true as const,
      orderNumber: row.order_number,
      reference,
      authorizationUrl: json.data.authorization_url,
    };
  });

/** Verifies a Paystack reference after the customer returns from checkout. */
export const verifyOnlinePayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ reference: z.string().trim().min(6).max(120) }).parse(input),
  )
  .handler(async ({ data }) => {
    const secret = process.env["PAYSTACK_SECRET_KEY"];
    if (!secret) return { ok: false as const, error: "Online payment is not configured." };

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(data.reference)}`,
      { headers: { Authorization: `Bearer ${secret}` } },
    );
    const json = (await res.json().catch(() => null)) as
      | {
          status?: boolean;
          data?: { status?: string; amount?: number; currency?: string; channel?: string };
        }
      | null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("order_number, total, payment_status, payment_channel")
      .eq("payment_reference", data.reference)
      .maybeSingle();

    if (!existing) return { ok: false as const, error: "We could not find that payment." };

    // Already confirmed — stay idempotent.
    if (existing.payment_status === "paid") {
      return {
        ok: true as const,
        orderNumber: existing.order_number,
        total: Number(existing.total),
        channel: existing.payment_channel,
      };
    }

    const tx = json?.data;
    const amountMatches = Math.round(Number(existing.total) * 100) === Number(tx?.amount ?? -1);
    const paid =
      Boolean(json?.status) && tx?.status === "success" && tx?.currency === "NGN" && amountMatches;

    const { data: order } = await supabaseAdmin
      .from("orders")
      .update(
        paid
          ? {
              payment_status: "paid",
              status: "paid",
              paid_at: new Date().toISOString(),
              payment_channel: tx?.channel ?? existing.payment_channel,
            }
          : { payment_status: "failed" },
      )
      .eq("payment_reference", data.reference)
      .select("order_number, total, payment_channel")
      .maybeSingle();

    if (!paid) return { ok: false as const, error: "Payment was not completed." };
    return {
      ok: true as const,
      orderNumber: order?.order_number ?? null,
      total: order ? Number(order.total) : null,
      channel: order?.payment_channel ?? null,
    };
  });
