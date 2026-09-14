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
          <div className="panel-luxe mt-8 p-8 text-left">
            <p className="text-center text-2xl text-gold">Payment successful</p>
            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Order number</dt>
                <dd className="font-bold text-gold">{data.orderNumber}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount paid</dt>
                <dd className="font-bold">
                  ₦{Number(data.total ?? 0).toLocaleString("en-NG")}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Paid with</dt>
                <dd className="font-bold capitalize">{data.channel ?? "online"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Date</dt>
                <dd className="font-bold">{new Date().toLocaleString("en-NG")}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Estimated delivery</dt>
                <dd className="font-bold">3–5 working days</dd>
              </div>
            </dl>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/#track" className="btn-gold">
                Track order
              </a>
              <Link to="/" className="btn-outline-gold">
                Continue shopping
              </Link>
            </div>
          </div>
        ) : (
          <div className="panel-luxe mt-8 p-8">
            <p className="text-2xl text-destructive">Payment could not be completed</p>
            <p className="mt-3 text-muted-foreground">
              {data && "error" in data ? data.error : "Please try again or pay by bank transfer."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href="/#cart" className="btn-gold">
                Try again
              </a>
              <a href="/#payment" className="btn-outline-gold">
                Choose another method
              </a>
              <Link to="/" className="btn-outline-gold">
                Return to cart
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
