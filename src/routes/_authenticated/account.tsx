import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo, PHONES, WHATSAPP_NUMBERS } from "@/components/site/Logo";
import { myOrders, myProfile, updateMyProfile } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "My Account — EMMY & ABBY" },
      {
        name: "description",
        content:
          "View your EMMY & ABBY order history, payment status, delivery tracking and account details.",
      },
      { property: "og:title", content: "My Account — EMMY & ABBY" },
      {
        property: "og:description",
        content: "Your orders, payments and delivery tracking in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AccountPage,
});

const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const ordersFn = useServerFn(myOrders);
  const profileFn = useServerFn(myProfile);
  const saveFn = useServerFn(updateMyProfile);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-orders"],
    queryFn: () => ordersFn(),
  });
  const { data: profile } = useQuery({ queryKey: ["my-profile"], queryFn: () => profileFn() });

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone);
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: () => saveFn({ data: { fullName, phone } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-profile"] }),
  });

  const signOut = async () => {
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <Logo size={42} light withTagline />
          <div className="flex gap-3 text-xs font-bold uppercase tracking-wider">
            <Link to="/" className="btn-outline-gold">
              Back to store
            </Link>
            <button onClick={signOut} className="btn-gold">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        <h1 className="text-4xl">My account</h1>

        <section className="panel-luxe mt-6 p-6">
          <h2 className="text-2xl text-gold">Account details</h2>
          <p className="mt-1 text-sm text-muted-foreground">{profile?.email}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="mt-4 grid gap-3 sm:grid-cols-3"
          >
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              aria-label="Full name"
              className="border bg-background p-3"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone number"
              aria-label="Phone number"
              className="border bg-background p-3"
            />
            <button type="submit" disabled={save.isPending} className="btn-gold">
              {save.isPending ? "Saving…" : "Save details"}
            </button>
          </form>
          {save.data?.ok && <p className="mt-3 text-sm text-gold">Details saved.</p>}
        </section>

        <section className="mt-10">
          <h2 className="text-2xl text-gold">Order history</h2>
          {isLoading ? (
            <p className="mt-3 text-muted-foreground">Loading your orders…</p>
          ) : orders.length === 0 ? (
            <p className="panel-luxe mt-3 p-6 text-muted-foreground">
              No orders yet. When you order, it will appear here with payment and delivery status.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {orders.map((o) => {
                const items = Array.isArray(o.items)
                  ? (o.items as Array<{ name: string; qty: number; price: number }>)
                  : [];
                return (
                  <article key={o.id} className="panel-luxe p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-bold">{o.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(o.created_at).toLocaleString("en-NG")}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{naira(Number(o.total))}</p>
                        <p className="text-xs uppercase tracking-wider text-muted-foreground">
                          {o.status} · payment {o.payment_status}
                          {o.payment_channel ? ` (${o.payment_channel})` : ""}
                        </p>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 border-t pt-3 text-sm">
                      {items.map((i, idx) => (
                        <li key={idx} className="flex justify-between">
                          <span>
                            {i.qty} × {i.name}
                          </span>
                          <span>{naira(i.price * i.qty)}</span>
                        </li>
                      ))}
                    </ul>
                    {(o.tracking_number || o.tracking_note) && (
                      <p className="mt-3 bg-secondary p-3 text-sm">
                        {o.tracking_number ? <strong>{o.tracking_number}</strong> : null}
                        {o.tracking_note ? ` — ${o.tracking_note}` : ""}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 panel-luxe p-6">
          <h2 className="text-2xl text-gold">Need help with an order?</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Chat with our support team on WhatsApp or call any of our official lines.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            {PHONES.map((p, i) => (
              <a
                key={p}
                href={`https://wa.me/${WHATSAPP_NUMBERS[i]}`}
                target="_blank"
                rel="noreferrer"
                className="btn-outline-gold"
              >
                {p}
              </a>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
