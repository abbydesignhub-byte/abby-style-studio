import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

export const Route = createFileRoute("/api/public/paystack-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["PAYSTACK_SECRET_KEY"];
        if (!secret) return new Response("Not configured", { status: 503 });

        const body = await request.text();
        const signature = request.headers.get("x-paystack-signature") ?? "";
        const expected = createHmac("sha512", secret).update(body).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const payload = JSON.parse(body) as {
          event?: string;
          data?: {
            reference?: string;
            status?: string;
            amount?: number;
            currency?: string;
            channel?: string;
          };
        };
        const reference = payload.data?.reference;
        if (!reference) return new Response("ok");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("id, total, payment_status")
          .eq("payment_reference", reference)
          .maybeSingle();

        // Unknown reference, or already confirmed — nothing to do (idempotent).
        if (!order || order.payment_status === "paid") return new Response("ok");

        const tx = payload.data;
        const amountMatches = Math.round(Number(order.total) * 100) === Number(tx?.amount ?? -1);
        const paid =
          payload.event === "charge.success" &&
          tx?.status === "success" &&
          tx?.currency === "NGN" &&
          amountMatches;

        await supabaseAdmin
          .from("orders")
          .update(
            paid
              ? {
                  payment_status: "paid",
                  status: "paid",
                  paid_at: new Date().toISOString(),
                  ...(tx?.channel ? { payment_channel: tx.channel } : {}),
                }
              : { payment_status: "failed" },
          )
          .eq("id", order.id);

        return new Response("ok");
      },
    },
  },
});
