import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Nav } from "@/components/site/Nav";
import { verifyOnlinePayment } from "@/lib/payment.functions";

export const Route = createFileRoute("/payment-callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Payment confirmation | Abby × Emmy Style Studio" },
      {
        name: "description",
        content:
          "Confirming your card payment for your Abby × Emmy Style Studio order and showing your order number for tracking.",
      },
      { property: "og:title", content: "Payment confirmation | Abby × Emmy Style Studio" },
      {
        property: "og:description",
        content: "Confirming your card payment and issuing your order number.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  validateSearch: (search: Record<string, unknown>) => ({
    reference: typeof search["reference"] === "string" ? search["reference"] : "",
    trxref: typeof search["trxref"] === "string" ? search["trxref"] : "",
  }),
  component: PaymentCallback,
});

function PaymentCallback() {
  const { reference, trxref } = useSearch({ from: "/payment-callback" });
  const ref = reference || trxref;
  const verify = useServerFn(verifyOnlinePayment);

  const { data, isPending } = useQuery({
    queryKey: ["verify-payment", ref],
    queryFn: () => verify({ data: { reference: ref } }),
    enabled: Boolean(ref),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <Nav cartCount={0} />
      <main className="mx-auto max-w-2xl px-5 py-24 text-center">
        <h1 className="text-4xl">Payment confirmation</h1>
        {!ref ? (
          <p className="mt-4 text-muted-foreground">No payment reference was provided.</p>
        ) : isPending ? (
          <p className="mt-4 text-muted-foreground">Confirming your payment…</p>
        ) : data?.ok ? (
          <div className="panel-luxe mt-8 p-8">
            <p className="text-2xl text-gold">Payment received</p>
            <p className="mt-3">
              Your order number is <span className="font-bold text-gold">{data.orderNumber}</span>.
              Keep it to track your delivery.
            </p>
          </div>
        ) : (
          <div className="panel-luxe mt-8 p-8">
            <p className="text-2xl text-destructive">Payment not completed</p>
            <p className="mt-3 text-muted-foreground">
              {data && "error" in data ? data.error : "Please try again or pay by bank transfer."}
            </p>
          </div>
        )}
        <Link to="/" className="btn-gold mt-8 inline-block">
          Back to shop
        </Link>
      </main>
    </div>
  );
}
