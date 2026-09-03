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
          data?: { reference?: string; status?: string };
        };
        const reference = payload.data?.reference;
        if (!reference) return new Response("ok");

        const paid = payload.event === "charge.success" && payload.data?.status === "success";
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin
          .from("orders")
          .update(
            paid
              ? { payment_status: "paid", status: "paid", paid_at: new Date().toISOString() }
              : { payment_status: "failed" },
          )
          .eq("payment_reference", reference);

        return new Response("ok");
      },
    },
  },
});
