import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";
import {
  getIsAdmin,
  adminListOrders,
  adminListProducts,
  adminSaveProduct,
  adminDeleteProduct,
  adminUpdateOrder,
  adminCreateOrder,
  adminStats,
  adminCustomers,
  adminPayments,
  adminAuditLog,
  adminUsers,
  ORDER_STATUSES,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Abby × Emmy Style Studio" },
      {
        name: "description",
        content:
          "Manage orders, payments, products, customers and delivery tracking for Abby × Emmy Style Studio.",
      },
      { property: "og:title", content: "Admin Dashboard — Abby × Emmy Style Studio" },
      {
        property: "og:description",
        content: "Store management for orders, payments, products and delivery tracking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      <h1 className="text-3xl">
        {error.message.includes("ACCESS DENIED") ? "ACCESS DENIED" : "Something went wrong"}
      </h1>
      <p className="mt-3 text-muted-foreground">
        {error.message.includes("ACCESS DENIED")
          ? "This account is not authorised to view store management."
          : error.message}
      </p>
    </main>
  ),
});

const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");
const labelise = (s: string) => s.replace(/_/g, " ");

type Section =
  | "overview"
  | "orders"
  | "products"
  | "customers"
  | "payments"
  | "audit"
  | "admins";

const SECTIONS: { key: Section; label: string }[] = [
  { key: "overview", label: "Dashboard" },
  { key: "orders", label: "Orders" },
  { key: "products", label: "Products" },
  { key: "customers", label: "Customers" },
  { key: "payments", label: "Payments" },
  { key: "audit", label: "Audit log" },
  { key: "admins", label: "Admin users" },
];

type Status = (typeof ORDER_STATUSES)[number];

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
  const [section, setSection] = useState<Section>("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const isAdminFn = useServerFn(getIsAdmin);
  const { data: me, isLoading } = useQuery({ queryKey: ["is-admin"], queryFn: () => isAdminFn() });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/admin/login", replace: true });
  };

  if (isLoading) {
    return <p className="px-5 py-24 text-center text-muted-foreground">Loading dashboard…</p>;
  }

  if (!me?.isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="font-display text-4xl tracking-widest">ACCESS DENIED</h1>
        <p className="mt-3 text-muted-foreground">
          This account is not authorised to view store management.
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
    <div className="min-h-screen bg-secondary/40 md:flex">
      <aside className="bg-gradient-ink text-ink-foreground md:w-60 md:shrink-0">
        <div className="flex items-center justify-between px-5 py-5">
          <div>
            <Logo size={36} light />
            <p className="mt-2 text-[11px] uppercase tracking-[0.3em] text-ink-foreground/60">
              Admin
            </p>
          </div>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="rounded-md border border-ink-foreground/25 px-3 py-1 text-xs font-bold uppercase md:hidden"
          >
            Menu
          </button>
        </div>
        <nav className={`${menuOpen ? "block" : "hidden"} px-3 pb-5 md:block`}>
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setSection(s.key);
                setMenuOpen(false);
              }}
              className={`mb-1 block w-full rounded-md px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide ${
                section === s.key
                  ? "bg-gradient-gold text-accent-foreground"
                  : "text-ink-foreground/80 hover:bg-ink-foreground/10"
              }`}
            >
              {s.label}
            </button>
          ))}
          <Link
            to="/"
            className="mb-1 block rounded-md px-4 py-2 text-sm font-semibold uppercase tracking-wide text-ink-foreground/80 hover:bg-ink-foreground/10"
          >
            View store
          </Link>
          <button
            onClick={signOut}
            className="block w-full rounded-md px-4 py-2 text-left text-sm font-semibold uppercase tracking-wide text-ink-foreground/80 hover:bg-ink-foreground/10"
          >
            Logout
          </button>
        </nav>
      </aside>

      <main className="flex-1 px-5 py-8">
        <header className="mb-6">
          <h1 className="font-display text-3xl tracking-wide">
            {SECTIONS.find((s) => s.key === section)?.label}
          </h1>
          <p className="text-sm text-muted-foreground">
            Signed in as {me.email} · {new Date().toLocaleDateString("en-NG", { dateStyle: "full" })}
          </p>
        </header>

        {section === "overview" && <OverviewPanel onOpenOrders={() => setSection("orders")} />}
        {section === "orders" && <OrdersPanel />}
        {section === "products" && <ProductsPanel />}
        {section === "customers" && <CustomersPanel />}
        {section === "payments" && <PaymentsPanel />}
        {section === "audit" && <AuditPanel />}
        {section === "admins" && <AdminUsersPanel />}
      </main>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-gold/25 bg-card p-5 shadow-card">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl tracking-wide">{value}</p>
    </div>
  );
}

function OverviewPanel({ onOpenOrders }: { onOpenOrders: () => void }) {
  const statsFn = useServerFn(adminStats);
  const ordersFn = useServerFn(adminListOrders);
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => statsFn(),
  });
  const { data: orders = [] } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => ordersFn(),
  });

  if (isLoading || !stats) return <p className="text-muted-foreground">Loading figures…</p>;
  const peak = Math.max(1, ...stats.chart.map((c) => c.revenue));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's sales" value={naira(stats.todaysSales)} />
        <StatCard label="Total sales" value={naira(stats.totalSales)} />
        <StatCard label="Total orders" value={stats.totalOrders} />
        <StatCard label="Pending orders" value={stats.pendingOrders} />
        <StatCard label="Processing" value={stats.processingOrders} />
        <StatCard label="Completed" value={stats.completedOrders} />
        <StatCard label="Customers" value={stats.customers} />
        <StatCard label="Pending payments" value={stats.pendingPayments} />
      </div>

      <section className="rounded-md border border-gold/25 bg-card p-5 shadow-card">
        <h2 className="mb-4 text-lg font-bold uppercase tracking-wide">Revenue, last 7 days</h2>
        <div className="flex h-40 items-end gap-3">
          {stats.chart.map((d) => (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
              <div
                className="w-full rounded-t bg-gradient-gold"
                style={{ height: `${(d.revenue / peak) * 100}%`, minHeight: 2 }}
                title={naira(d.revenue)}
              />
              <span className="text-[11px] uppercase text-muted-foreground">{d.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-gold/25 bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold uppercase tracking-wide">Recent orders</h2>
          <button
            onClick={onOpenOrders}
            className="rounded-md border px-4 py-2 text-xs font-bold uppercase"
          >
            View all orders
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="pb-2">Order</th>
                <th className="pb-2">Customer</th>
                <th className="pb-2">Amount</th>
                <th className="pb-2">Payment</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((o) => (
                <tr key={o.id} className="border-t">
                  <td className="py-2 font-mono text-xs">{o.order_number}</td>
                  <td className="py-2">{o.customer_name}</td>
                  <td className="py-2">{naira(Number(o.total))}</td>
                  <td className="py-2 uppercase">{labelise(o.payment_status)}</td>
                  <td className="py-2 uppercase">{labelise(o.status)}</td>
                  <td className="py-2 text-muted-foreground">
                    {new Date(o.created_at).toLocaleDateString("en-NG")}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-muted-foreground">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function CustomersPanel() {
  const fn = useServerFn(adminCustomers);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => fn(),
  });
  if (isLoading) return <p className="text-muted-foreground">Loading customers…</p>;
  if (data.length === 0) return <p className="text-muted-foreground">No customers yet.</p>;
  return (
    <div className="overflow-x-auto rounded-md border border-gold/25 bg-card p-5 shadow-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2">Name</th>
            <th className="pb-2">Phone</th>
            <th className="pb-2">Email</th>
            <th className="pb-2">Orders</th>
            <th className="pb-2">Total spent</th>
            <th className="pb-2">Last order</th>
          </tr>
        </thead>
        <tbody>
          {data.map((c) => (
            <tr key={c.phone} className="border-t">
              <td className="py-2 font-semibold">{c.name}</td>
              <td className="py-2">{c.phone}</td>
              <td className="py-2 text-muted-foreground">{c.email ?? "—"}</td>
              <td className="py-2">{c.orders}</td>
              <td className="py-2">{naira(c.spent)}</td>
              <td className="py-2 text-muted-foreground">
                {new Date(c.lastOrder).toLocaleDateString("en-NG")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaymentsPanel() {
  const fn = useServerFn(adminPayments);
  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-payments"],
    queryFn: () => fn(),
  });
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "failed">("all");
  if (isLoading) return <p className="text-muted-foreground">Loading payments…</p>;
  const rows = data.filter((p) => filter === "all" || p.payment_status === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "paid", "unpaid", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-4 py-2 text-xs font-bold uppercase ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-card border"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <div className="overflow-x-auto rounded-md border border-gold/25 bg-card p-5 shadow-card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="pb-2">Reference</th>
              <th className="pb-2">Order</th>
              <th className="pb-2">Customer</th>
              <th className="pb-2">Amount</th>
              <th className="pb-2">Channel</th>
              <th className="pb-2">Status</th>
              <th className="pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2 font-mono text-[11px]">{p.payment_reference}</td>
                <td className="py-2 font-mono text-xs">{p.order_number}</td>
                <td className="py-2">{p.customer_name}</td>
                <td className="py-2">{naira(Number(p.total))}</td>
                <td className="py-2 uppercase">{p.payment_channel ?? p.payment_method}</td>
                <td className="py-2 uppercase">{labelise(p.payment_status)}</td>
                <td className="py-2 text-muted-foreground">
                  {new Date(p.paid_at ?? p.created_at).toLocaleString("en-NG")}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="py-4 text-muted-foreground">
                  No payments in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditPanel() {
  const fn = useServerFn(adminAuditLog);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-audit"], queryFn: () => fn() });
  if (isLoading) return <p className="text-muted-foreground">Loading audit log…</p>;
  if (data.length === 0) return <p className="text-muted-foreground">No admin actions recorded yet.</p>;
  return (
    <ul className="space-y-2">
      {data.map((a) => (
        <li key={a.id} className="rounded-md border border-gold/25 bg-card p-4 text-sm shadow-card">
          <p className="font-semibold">
            {a.action} <span className="text-muted-foreground">· {a.admin_email}</span>
          </p>
          <p className="text-muted-foreground">{a.detail}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(a.created_at).toLocaleString("en-NG")}
          </p>
        </li>
      ))}
    </ul>
  );
}

function AdminUsersPanel() {
  const fn = useServerFn(adminUsers);
  const { data = [], isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => fn() });
  if (isLoading) return <p className="text-muted-foreground">Loading admin users…</p>;
  return (
    <div className="overflow-x-auto rounded-md border border-gold/25 bg-card p-5 shadow-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="pb-2">Email</th>
            <th className="pb-2">Name</th>
            <th className="pb-2">Registered</th>
            <th className="pb-2">Last login</th>
          </tr>
        </thead>
        <tbody>
          {data.map((u) => (
            <tr key={u.email} className="border-t">
              <td className="py-2">{u.email}</td>
              <td className="py-2">{u.full_name ?? "—"}</td>
              <td className="py-2">{u.is_registered ? "Yes" : "Not yet"}</td>
              <td className="py-2 text-muted-foreground">
                {u.last_login ? new Date(u.last_login).toLocaleString("en-NG") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ManualItem = { name: string; size: string; colour: string; price: string; qty: string };

const emptyItem: ManualItem = { name: "", size: "", colour: "", price: "", qty: "1" };

function NewOrderForm({ onDone }: { onDone: () => void }) {
  const createFn = useServerFn(adminCreateOrder);
  const productsFn = useServerFn(adminListProducts);
  const { data: products = [] } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => productsFn(),
  });
  const [form, setForm] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    shippingAddress: "",
    city: "",
    state: "",
    paymentMethod: "unpaid" as "unpaid" | "cash" | "transfer" | "ussd" | "card",
    paymentStatus: "unpaid" as "unpaid" | "paid" | "failed",
    status: "pending" as Status,
  });
  const [items, setItems] = useState<ManualItem[]>([{ ...emptyItem }]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const setItem = (idx: number, patch: Partial<ManualItem>) =>
    setItems((list) => list.map((it, i) => (i === idx ? { ...it, ...patch } : it)));

  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0), 0);

  const mutation = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          ...form,
          items: items
            .filter((i) => i.name.trim())
            .map((i) => ({
              name: i.name.trim(),
              size: i.size,
              colour: i.colour,
              price: Number(i.price) || 0,
              qty: Number(i.qty) || 1,
            })),
        },
      }),
    onSuccess: (res: { orderNumber: string }) => {
      setSaved(res.orderNumber);
      setError("");
      onDone();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!items.some((i) => i.name.trim())) {
          setError("Add at least one product.");
          return;
        }
        mutation.mutate();
      }}
      className="space-y-5 rounded-md border border-gold/25 bg-card p-5 shadow-card"
    >
      <h3 className="text-lg font-bold uppercase tracking-wide">Create new order</h3>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          required
          value={form.customerName}
          onChange={(e) => setForm({ ...form, customerName: e.target.value })}
          placeholder="Customer name *"
          aria-label="Customer name"
          className="rounded-md border bg-background p-3 text-sm"
        />
        <input
          required
          value={form.customerPhone}
          onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
          placeholder="Phone *"
          aria-label="Phone"
          className="rounded-md border bg-background p-3 text-sm"
        />
        <input
          type="email"
          value={form.customerEmail}
          onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
          placeholder="Email (optional)"
          aria-label="Email"
          className="rounded-md border bg-background p-3 text-sm"
        />
        <input
          required
          value={form.shippingAddress}
          onChange={(e) => setForm({ ...form, shippingAddress: e.target.value })}
          placeholder="Delivery address *"
          aria-label="Delivery address"
          className="rounded-md border bg-background p-3 text-sm"
        />
        <input
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          placeholder="City"
          aria-label="City"
          className="rounded-md border bg-background p-3 text-sm"
        />
        <input
          value={form.state}
          onChange={(e) => setForm({ ...form, state: e.target.value })}
          placeholder="State"
          aria-label="State"
          className="rounded-md border bg-background p-3 text-sm"
        />
      </div>

      <div className="space-y-3 border-t pt-4">
        {items.map((it, idx) => (
          <div key={idx} className="grid gap-2 sm:grid-cols-6">
            <select
              value={it.name}
              aria-label="Product"
              onChange={(e) => {
                const picked = products.find((p) => p.name === e.target.value);
                setItem(idx, {
                  name: e.target.value,
                  price: picked ? String(picked.price) : it.price,
                });
              }}
              className="rounded-md border bg-background p-3 text-sm sm:col-span-2"
            >
              <option value="">Select product *</option>
              {products.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              value={it.size}
              onChange={(e) => setItem(idx, { size: e.target.value })}
              placeholder="Size"
              aria-label="Size"
              className="rounded-md border bg-background p-3 text-sm"
            />
            <input
              value={it.colour}
              onChange={(e) => setItem(idx, { colour: e.target.value })}
              placeholder="Colour"
              aria-label="Colour"
              className="rounded-md border bg-background p-3 text-sm"
            />
            <input
              type="number"
              min="1"
              value={it.qty}
              onChange={(e) => setItem(idx, { qty: e.target.value })}
              placeholder="Qty"
              aria-label="Quantity"
              className="rounded-md border bg-background p-3 text-sm"
            />
            <input
              type="number"
              min="0"
              value={it.price}
              onChange={(e) => setItem(idx, { price: e.target.value })}
              placeholder="Price ₦"
              aria-label="Price"
              className="rounded-md border bg-background p-3 text-sm"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setItems([...items, { ...emptyItem }])}
          className="rounded-md border border-gold/40 px-4 py-2 text-xs font-bold uppercase"
        >
          Add another product
        </button>
      </div>

      <div className="grid gap-3 border-t pt-4 sm:grid-cols-3">
        <select
          value={form.paymentMethod}
          aria-label="Payment method"
          onChange={(e) =>
            setForm({ ...form, paymentMethod: e.target.value as typeof form.paymentMethod })
          }
          className="rounded-md border bg-background p-3 text-sm"
        >
          <option value="unpaid">Unpaid</option>
          <option value="cash">Cash</option>
          <option value="transfer">Bank transfer</option>
          <option value="ussd">USSD</option>
          <option value="card">Card</option>
        </select>
        <select
          value={form.paymentStatus}
          aria-label="Payment status"
          onChange={(e) =>
            setForm({ ...form, paymentStatus: e.target.value as typeof form.paymentStatus })
          }
          className="rounded-md border bg-background p-3 text-sm"
        >
          <option value="unpaid">Payment pending</option>
          <option value="paid">Paid</option>
          <option value="failed">Failed</option>
        </select>
        <select
          value={form.status}
          aria-label="Order status"
          onChange={(e) => setForm({ ...form, status: e.target.value as Status })}
          className="rounded-md border bg-background p-3 text-sm"
        >
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {labelise(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-t pt-4">
        <p className="text-lg font-bold">Total {naira(total)}</p>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="rounded-md bg-primary px-5 py-2 text-sm font-bold uppercase text-primary-foreground disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : "Save order"}
        </button>
        {saved && <p className="text-sm font-bold">Order {saved} created.</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </form>
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
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
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
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  if (isLoading) return <p className="text-muted-foreground">Loading orders…</p>;
  const term = search.trim().toLowerCase();
  const visible = term
    ? orders.filter((o) =>
        [o.order_number, o.customer_name, o.customer_phone, o.payment_reference ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term),
      )
    : orders;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order number, customer, phone or reference"
          aria-label="Search orders"
          className="min-w-[240px] flex-1 rounded-md border bg-background p-3 text-sm"
        />
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="rounded-md bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground"
        >
          {creating ? "Close" : "Create new order"}
        </button>
      </div>
      {creating && (
        <NewOrderForm
          onDone={() => {
            queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
            queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
          }}
        />
      )}
      {visible.length === 0 && (
        <p className="rounded-md bg-card p-6 text-muted-foreground shadow-card">No orders found.</p>
      )}
      {visible.map((o) => {
        const items = Array.isArray(o.items)
          ? (o.items as Array<{ name: string; qty: number; price: number }>)
          : [];
        const editing = open === o.id;
        return (
          <article key={o.id} className="rounded-md border border-gold/25 bg-card p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="font-mono text-sm font-bold">{o.order_number}</p>
                <p className="text-lg font-semibold">
                  {o.customer_name}{" "}
                  <span className="ml-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {o.user_id ? "Registered" : "Guest"}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {o.customer_phone}
                  {o.customer_email ? ` · ${o.customer_email}` : ""}
                </p>
                {o.shipping_address && (
                  <p className="text-sm text-muted-foreground">
                    {[o.shipping_address, o.city, o.state].filter(Boolean).join(", ")}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("en-NG")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{naira(Number(o.total))}</p>
                <span className="mt-1 inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
                  {labelise(o.status)}
                </span>
                <span
                  className={`mt-1 ml-2 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                    o.payment_status === "paid"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : o.payment_status === "failed"
                        ? "bg-destructive/15 text-destructive"
                        : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {o.payment_status === "paid" ? "Payment confirmed" : o.payment_status}
                </span>
                <p className="mt-2 text-xs text-muted-foreground">
                  {o.payment_method}
                  {o.payment_channel ? ` · ${o.payment_channel}` : ""}
                </p>
                {o.payment_reference && (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {o.payment_reference}
                  </p>
                )}
                {o.paid_at && (
                  <p className="text-[11px] text-muted-foreground">
                    Paid {new Date(o.paid_at).toLocaleString("en-NG")}
                  </p>
                )}
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
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {labelise(s)}
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
                    status: (ORDER_STATUSES as readonly string[]).includes(o.status)
                      ? (o.status as Status)
                      : "pending",
                    trackingNumber: o.tracking_number ?? "",
                    trackingNote: o.tracking_note ?? "",
                  });
                }}
                className="mt-4 rounded-md border px-5 py-2 text-sm font-bold uppercase"
              >
                Update status &amp; tracking
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
          className="grid gap-3 rounded-md border border-gold/25 bg-card p-5 shadow-card sm:grid-cols-2"
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
          <article key={p.id} className="rounded-md border border-gold/25 bg-card p-5 shadow-card">
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
