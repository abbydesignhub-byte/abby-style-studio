import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getIsAdmin,
  adminListOrders,
  adminListProducts,
  adminSaveProduct,
  adminDeleteProduct,
  adminUpdateOrder,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Abby Design Hub" },
      {
        name: "description",
        content:
          "Manage products, review customer orders and update order status and tracking details for Abby Design Hub.",
      },
      { property: "og:title", content: "Admin Dashboard — Abby Design Hub" },
      {
        property: "og:description",
        content: "Store management for products, orders and delivery tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="mt-3 text-muted-foreground">{error.message}</p>
    </main>
  ),
});

const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");

const STATUSES = ["pending", "paid", "printing", "shipped", "delivered", "cancelled"] as const;
type Status = (typeof STATUSES)[number];

type ProductForm = {
  id?: string;
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  category: "shop" | "premium" | "deal";
  sortOrder: string;
  isActive: boolean;
};

const emptyProduct: ProductForm = {
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  category: "shop",
  sortOrder: "0",
  isActive: true,
};

function AdminPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"orders" | "products">("orders");

  const isAdminFn = useServerFn(getIsAdmin);
  const { data: me, isLoading } = useQuery({ queryKey: ["is-admin"], queryFn: () => isAdminFn() });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (isLoading) {
    return <p className="px-5 py-24 text-center text-muted-foreground">Loading dashboard…</p>;
  }

  if (!me?.isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="text-3xl">Admin access only</h1>
        <p className="mt-3 text-muted-foreground">
          Your account doesn't have admin rights yet. Ask the store owner to grant admin access to
          this account.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/" className="rounded-md border px-5 py-3 text-sm font-bold uppercase">
            Back to store
          </Link>
          <button
            onClick={signOut}
            className="rounded-md bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground"
          >
            Sign out
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="bg-gradient-ink text-ink-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div>
            <p className="font-display text-2xl tracking-widest text-gold">ABBY DESIGN HUB</p>
            <h1 className="text-sm uppercase tracking-[0.3em] text-ink-foreground/70">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex gap-3">
            <Link
              to="/"
              className="rounded-md border border-ink-foreground/25 px-4 py-2 text-sm font-semibold uppercase"
            >
              View store
            </Link>
            <button
              onClick={signOut}
              className="rounded-md bg-gradient-gold px-4 py-2 text-sm font-bold uppercase text-accent-foreground"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8">
        <div className="mb-6 flex gap-2">
          {(["orders", "products"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-5 py-2 text-sm font-bold uppercase tracking-wide ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-card"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {tab === "orders" ? <OrdersPanel /> : <ProductsPanel />}
      </div>
    </div>
  );
}

function OrdersPanel() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(adminListOrders);
  const updateFn = useServerFn(adminUpdateOrder);
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => listFn(),
  });
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ status: Status; trackingNumber: string; trackingNote: string }>(
    { status: "pending", trackingNumber: "", trackingNote: "" },
  );

  const mutation = useMutation({
    mutationFn: (vars: {
      id: string;
      status: Status;
      trackingNumber: string;
      trackingNote: string;
    }) => updateFn({ data: vars }),
    onSuccess: () => {
      setOpen(null);
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading orders…</p>;
  if (orders.length === 0)
    return <p className="rounded-xl bg-card p-6 text-muted-foreground shadow-card">No orders yet.</p>;

  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const items = Array.isArray(o.items)
          ? (o.items as Array<{ name: string; qty: number; price: number }>)
          : [];
        const editing = open === o.id;
        return (
          <article key={o.id} className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-bold">{o.order_number}</p>
                <p className="text-lg font-semibold">{o.customer_name}</p>
                <p className="text-sm text-muted-foreground">
                  {o.customer_phone}
                  {o.customer_email ? ` · ${o.customer_email}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("en-NG")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{naira(Number(o.total))}</p>
                <span className="mt-1 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
                  {o.status}
                </span>
              </div>
            </div>

            <ul className="mt-4 space-y-1 border-t pt-3 text-sm">
              {items.map((i, idx) => (
                <li key={idx} className="flex justify-between">
                  <span>
                    {i.qty} × {i.name}
                  </span>
                  <span>{naira(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>

            {(o.tracking_number || o.tracking_note) && !editing && (
              <p className="mt-3 rounded-md bg-secondary p-3 text-sm">
                {o.tracking_number ? <strong>{o.tracking_number}</strong> : null}
                {o.tracking_note ? ` — ${o.tracking_note}` : ""}
              </p>
            )}

            {editing ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate({ id: o.id, ...draft });
                }}
                className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-3"
              >
                <select
                  value={draft.status}
                  aria-label="Order status"
                  onChange={(e) => setDraft({ ...draft, status: e.target.value as Status })}
                  className="rounded-md border bg-background p-3"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <input
                  value={draft.trackingNumber}
                  onChange={(e) => setDraft({ ...draft, trackingNumber: e.target.value })}
                  placeholder="Tracking number"
                  aria-label="Tracking number"
                  className="rounded-md border bg-background p-3"
                />
                <input
                  value={draft.trackingNote}
                  onChange={(e) => setDraft({ ...draft, trackingNote: e.target.value })}
                  placeholder="Tracking note (e.g. courier, ETA)"
                  aria-label="Tracking note"
                  className="rounded-md border bg-background p-3"
                />
                <div className="flex gap-3 sm:col-span-3">
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="rounded-md bg-primary px-5 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(null)}
                    className="rounded-md border px-5 py-2 text-sm font-bold uppercase"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => {
                  setOpen(o.id);
                  setDraft({
                    status: (o.status as Status) ?? "pending",
                    trackingNumber: o.tracking_number ?? "",
                    trackingNote: o.tracking_note ?? "",
                  });
                }}
                className="mt-4 rounded-md border px-5 py-2 text-sm font-bold uppercase"
              >
                Update status & tracking
              </button>
            )}
          </article>
        );
      })}
    </div>
  );
}

function ProductsPanel() {
  const queryClient = useQueryClient();
  const listFn = useServerFn(adminListProducts);
  const saveFn = useServerFn(adminSaveProduct);
  const deleteFn = useServerFn(adminDeleteProduct);
  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => listFn(),
  });
  const [form, setForm] = useState<ProductForm | null>(null);

  const save = useMutation({
    mutationFn: (p: ProductForm) =>
      saveFn({
        data: {
          ...(p.id ? { id: p.id } : {}),
          name: p.name,
          description: p.description,
          price: Number(p.price || 0),
          imageUrl: p.imageUrl,
          category: p.category,
          sortOrder: Number(p.sortOrder || 0),
          isActive: p.isActive,
        },
      }),
    onSuccess: () => {
      setForm(null);
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  if (isLoading) return <p className="text-muted-foreground">Loading products…</p>;

  return (
    <div className="space-y-5">
      <button
        onClick={() => setForm({ ...emptyProduct })}
        className="rounded-md bg-gradient-gold px-5 py-3 text-sm font-bold uppercase tracking-wide text-accent-foreground shadow-gold"
      >
        + New product
      </button>

      {form && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
          className="grid gap-3 rounded-xl bg-card p-5 shadow-card sm:grid-cols-2"
        >
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Product name"
            aria-label="Product name"
            className="rounded-md border bg-background p-3"
          />
          <input
            required
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            placeholder="Price (₦)"
            aria-label="Price"
            className="rounded-md border bg-background p-3"
          />
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Short description"
            aria-label="Description"
            className="rounded-md border bg-background p-3 sm:col-span-2"
          />
          <input
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            placeholder="Image URL (https://…)"
            aria-label="Image URL"
            className="rounded-md border bg-background p-3 sm:col-span-2"
          />
          <select
            value={form.category}
            aria-label="Category"
            onChange={(e) =>
              setForm({ ...form, category: e.target.value as ProductForm["category"] })
            }
            className="rounded-md border bg-background p-3"
          >
            <option value="shop">Shop</option>
            <option value="premium">Premium offer</option>
            <option value="deal">Weekly deal</option>
          </select>
          <input
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
            placeholder="Sort order"
            aria-label="Sort order"
            className="rounded-md border bg-background p-3"
          />
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Visible on the store
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={save.isPending}
              className="rounded-md bg-primary px-5 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
            >
              Save product
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="rounded-md border px-5 py-2 text-sm font-bold uppercase"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((p) => (
          <article key={p.id} className="rounded-xl bg-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.description}</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase">
                {p.category}
              </span>
            </div>
            <p className="mt-3 text-lg font-bold">{naira(Number(p.price))}</p>
            <p className="text-xs text-muted-foreground">
              {p.is_active ? "Visible on store" : "Hidden"} · order {p.sort_order}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() =>
                  setForm({
                    id: p.id,
                    name: p.name,
                    description: p.description ?? "",
                    price: String(p.price),
                    imageUrl: p.image_url ?? "",
                    category: (p.category as ProductForm["category"]) ?? "shop",
                    sortOrder: String(p.sort_order),
                    isActive: p.is_active,
                  })
                }
                className="rounded-md border px-4 py-2 text-sm font-bold uppercase"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete ${p.name}?`)) remove.mutate(p.id);
                }}
                className="rounded-md border border-destructive/40 px-4 py-2 text-sm font-bold uppercase text-destructive"
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
