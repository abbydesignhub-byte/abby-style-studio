import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Nav } from "@/components/site/Nav";
import heroImg from "@/assets/hero.jpg";
import teeBlack from "@/assets/tee-black.jpg";
import teeBusiness from "@/assets/tee-business.jpg";
import teeCustom from "@/assets/tee-custom.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abby Design Hub — Premium Branded T-Shirts in Nigeria" },
      {
        name: "description",
        content:
          "Shop premium branded and custom-printed t-shirts. Upload your logo, order online, pay by transfer, and track your order with Abby Design Hub.",
      },
      { property: "og:title", content: "Abby Design Hub — Premium Branded T-Shirts" },
      {
        property: "og:description",
        content:
          "Wear your identity. Custom logo tees, business branding shirts and classic black tees, designed for you.",
      },
    ],
  }),
  component: Index,
});

const WHATSAPP = "2348055256283";

const products = [
  { id: 1, name: "Classic Black Tee", price: 7000, img: teeBlack, tag: "Everyday" },
  { id: 2, name: "Business Branding Shirt", price: 10000, img: teeBusiness, tag: "Corporate" },
  { id: 3, name: "Custom Logo Shirt", price: 12000, img: teeCustom, tag: "Bestseller" },
];

const offers = [
  {
    id: 101,
    name: "Business Branding Package",
    desc: "10 custom t-shirts + logo printing",
    price: 100000,
    cta: "Order Premium Package",
  },
  {
    id: 102,
    name: "VIP Customer Package",
    desc: "Exclusive designs + priority delivery",
    price: 50000,
    cta: "Join VIP",
  },
];

const deal = {
  id: 201,
  name: "Weekly Deal Shirt",
  desc: "20% OFF selected branded t-shirts",
  price: 6000,
};

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");


type CartLine = { id: number; name: string; price: number; qty: number };

function Index() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [shirt, setShirt] = useState("Black Shirt");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [trackResult, setTrackResult] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);

  const login = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === "" || password.trim() === "") {
      setLoginMessage({ text: "Please fill all details.", ok: false });
      return;
    }
    setLoginMessage({ text: `Welcome ${username.trim()}! Login successful.`, ok: true });
    setPassword("");
  };

  const addToCart = (p: { id: number; name: string; price: number }) =>

    setCart((c) =>
      c.some((l) => l.id === p.id)
        ? c.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { id: p.id, name: p.name, price: p.price, qty: 1 }],
    );

  const changeQty = (id: number, delta: number) =>
    setCart((c) =>
      c
        .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );

  const orderOnWhatsApp = () => {
    const lines = cart.map((l) => `${l.qty} x ${l.name} — ${naira(l.price * l.qty)}`).join("\n");
    const msg = `Hello Abby Design Hub, I'd like to order:\n${lines}\n\nTotal: ${naira(total)}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const submitDesign = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Custom design request:\nShirt: ${shirt}\nNotes: ${notes || "—"}\nLogo file: ${fileName || "will send in chat"}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const trackOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackResult(
      orderNumber.trim() === ""
        ? "Please enter your order number."
        : `Order ${orderNumber.trim()} is being processed and will be ready shortly.`,
    );
  };

  return (
    <div id="home" className="min-h-screen scroll-smooth">
      <Nav />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img
          src={heroImg}
          alt="Model wearing a premium black branded t-shirt"
          width={1600}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        <div className="relative mx-auto max-w-6xl px-5 py-28 sm:py-36">
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-gold">
            Wear your identity
          </p>
          <h1 className="max-w-2xl text-5xl leading-[0.95] sm:text-7xl">
            Premium branded <span className="text-gold">t-shirts</span>, designed for you
          </h1>
          <p className="mt-5 max-w-lg text-lg text-ink-foreground/80">
            Create your style. Promote your brand. Quality prints delivered nationwide.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#shop"
              className="rounded-md bg-gradient-gold px-7 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-gold transition-transform hover:-translate-y-0.5"
            >
              Shop Now
            </a>
            <a
              href="#custom"
              className="rounded-md border border-gold/60 px-7 py-3 text-sm font-bold uppercase tracking-wider text-gold transition-colors hover:bg-gold/10"
            >
              Custom Design
            </a>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="shop" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-4xl">Our Products</h2>
        <p className="mt-2 text-muted-foreground">Premium cotton. Sharp prints. Fast turnaround.</p>
        <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <article
              key={p.id}
              className="overflow-hidden rounded-xl bg-card shadow-card transition-transform hover:-translate-y-1"
            >
              <img
                src={p.img}
                alt={p.name}
                width={900}
                height={900}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <div className="space-y-3 p-5">
                <span className="inline-block rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  {p.tag}
                </span>
                <h3 className="text-2xl">{p.name}</h3>
                <p className="text-xl font-bold text-foreground">{naira(p.price)}</p>
                <button
                  onClick={() => addToCart(p)}
                  className="w-full rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Add to Cart
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Premium offers */}
      <section id="premium" className="bg-ink py-20 text-ink-foreground">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-4xl">
            <span className="text-gold">★</span> Premium Offers
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {offers.map((o) => (
              <div key={o.id} className="rounded-xl border border-gold/25 p-6">
                <h3 className="text-2xl text-gold">{o.name}</h3>
                <p className="mt-2 text-sm text-ink-foreground/70">{o.desc}</p>
                <p className="mt-4 text-3xl font-bold">{naira(o.price)}</p>
                <button
                  onClick={() => addToCart(o)}
                  className="mt-5 w-full rounded-md bg-gradient-gold px-5 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-gold"
                >
                  {o.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Weekly deals */}
      <section id="deals" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-4xl">🔥 Weekly Deals</h2>
        <div className="mt-6 rounded-xl bg-card p-6 shadow-card">
          <h3 className="text-2xl">Weekend Fashion Sale</h3>
          <p className="mt-2 text-muted-foreground">{deal.desc}</p>
          <button
            onClick={() => addToCart(deal)}
            className="mt-5 rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground"
          >
            Buy Now {naira(deal.price)}
          </button>
        </div>
      </section>

      {/* Cart */}

      <section id="cart" className="bg-secondary py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-4xl">Your Cart</h2>
          <div className="mt-6 rounded-xl bg-card p-6 shadow-card">
            {cart.length === 0 ? (
              <p className="text-muted-foreground">Your cart is empty — add a shirt to get started.</p>
            ) : (
              <ul className="divide-y">
                {cart.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-semibold">{l.name}</p>
                      <p className="text-sm text-muted-foreground">{naira(l.price)} each</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => changeQty(l.id, -1)}
                        aria-label={`Remove one ${l.name}`}
                        className="h-8 w-8 rounded-md border font-bold"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">{l.qty}</span>
                      <button
                        onClick={() => changeQty(l.id, 1)}
                        aria-label={`Add one ${l.name}`}
                        className="h-8 w-8 rounded-md border font-bold"
                      >
                        +
                      </button>
                      <span className="w-24 text-right font-bold">{naira(l.price * l.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t pt-5">
              <p className="text-2xl font-bold">Total: {naira(total)}</p>
              <button
                disabled={cart.length === 0}
                onClick={orderOnWhatsApp}
                className="rounded-md bg-gradient-gold px-6 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-gold disabled:opacity-40"
              >
                Checkout on WhatsApp
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Custom design */}
      <section id="custom" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-4xl">Create Your Own Shirt</h2>
        <p className="mt-2 text-muted-foreground">
          Upload your logo and we'll turn it into a personalised design.
        </p>
        <form onSubmit={submitDesign} className="mt-8 space-y-5 rounded-xl bg-card p-6 shadow-card">
          <div>
            <label htmlFor="logo" className="mb-2 block text-sm font-semibold uppercase tracking-wide">
              Your logo
            </label>
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              className="w-full rounded-md border bg-background p-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="shirt" className="mb-2 block text-sm font-semibold uppercase tracking-wide">
              Shirt colour
            </label>
            <select
              id="shirt"
              value={shirt}
              onChange={(e) => setShirt(e.target.value)}
              className="w-full rounded-md border bg-background p-3"
            >
              <option>Black Shirt</option>
              <option>White Shirt</option>
              <option>Gold Shirt</option>
            </select>
          </div>
          <div>
            <label htmlFor="notes" className="mb-2 block text-sm font-semibold uppercase tracking-wide">
              Design notes
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Placement, sizes, quantity..."
              className="w-full rounded-md border bg-background p-3"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground"
          >
            Submit Design
          </button>
        </form>
      </section>

      {/* Payment */}
      <section id="payment" className="bg-ink py-20 text-ink-foreground">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-4xl">Payment</h2>
          <p className="mt-2 text-ink-foreground/70">Choose how you'd like to pay.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-xl border border-gold/25 p-6">
              <h3 className="text-2xl text-gold">Bank Transfer</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-ink-foreground/60">Account Number</dt>
                  <dd className="text-lg font-bold tracking-wider">8055256283</dd>
                </div>
                <div>
                  <dt className="text-ink-foreground/60">Account Name</dt>
                  <dd className="text-lg font-bold">Abby Design Hub</dd>
                </div>
              </dl>
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hello, here is my payment receipt.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-block rounded-md bg-gradient-gold px-5 py-3 text-sm font-bold uppercase tracking-wider text-accent-foreground shadow-gold"
              >
                Send Receipt on WhatsApp
              </a>
            </div>
            <div className="rounded-xl border border-ink-foreground/15 p-6">
              <h3 className="text-2xl">Pay Online</h3>
              <p className="mt-3 text-sm text-ink-foreground/70">
                Card and bank payments through a secure gateway. Coming soon — for now, use bank
                transfer or order on WhatsApp.
              </p>
              <button
                disabled
                className="mt-5 rounded-md border border-ink-foreground/25 px-5 py-3 text-sm font-bold uppercase tracking-wider opacity-50"
              >
                Pay Online (soon)
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Track order */}
      <section id="track" className="mx-auto max-w-2xl px-5 py-20">
        <h2 className="text-4xl">Order Tracking</h2>
        <form onSubmit={trackOrder} className="mt-6 flex flex-wrap gap-3">
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Enter your order number"
            aria-label="Order number"
            className="min-w-[220px] flex-1 rounded-md border bg-card p-3"
          />
          <button
            type="submit"
            className="rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground"
          >
            Track
          </button>
        </form>
        {trackResult && (
          <p className="mt-4 rounded-md bg-secondary p-4 text-sm font-medium">{trackResult}</p>
        )}
      </section>

      {/* Login */}
      <section id="login" className="mx-auto max-w-md px-5 py-20">
        <h2 className="text-4xl">Customer Login</h2>
        <p className="mt-2 text-muted-foreground">Sign in to view your saved designs and orders.</p>
        <form onSubmit={login} className="mt-6 space-y-4 rounded-xl bg-card p-6 shadow-card">
          <input
            id="username"
            value={username}
            maxLength={50}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter Username"
            aria-label="Username"
            className="w-full rounded-md border bg-background p-3"
          />
          <input
            id="password"
            type="password"
            value={password}
            maxLength={100}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Password"
            aria-label="Password"
            className="w-full rounded-md border bg-background p-3"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground"
          >
            Login
          </button>
          {loginMessage && (
            <p
              className={`rounded-md p-3 text-sm font-medium ${
                loginMessage.ok ? "bg-gold/15 text-accent-foreground" : "bg-secondary text-destructive"
              }`}
            >
              {loginMessage.text}
            </p>
          )}
        </form>
      </section>

      {/* Contact */}

      <section id="contact" className="bg-secondary py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-4xl">Contact Us</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <a
              href={`https://wa.me/${WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-card p-6 shadow-card transition-transform hover:-translate-y-1"
            >
              <p className="text-sm uppercase tracking-wide text-muted-foreground">WhatsApp</p>
              <p className="mt-1 text-xl font-bold">0805 525 6283</p>
            </a>
            <a
              href="mailto:abbydesignhub@gmail.com"
              className="rounded-xl bg-card p-6 shadow-card transition-transform hover:-translate-y-1"
            >
              <p className="text-sm uppercase tracking-wide text-muted-foreground">Email</p>
              <p className="mt-1 text-xl font-bold break-all">abbydesignhub@gmail.com</p>
            </a>
          </div>
        </div>
      </section>

      <footer className="bg-ink py-8 text-center text-sm text-ink-foreground/70">
        © 2026 Abby Design Hub. All rights reserved.
      </footer>
    </div>
  );
}
