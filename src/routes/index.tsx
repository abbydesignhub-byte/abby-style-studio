import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Nav } from "@/components/site/Nav";
import { listProducts, placeOrder, trackOrder } from "@/lib/shop.functions";
import { startOnlinePayment } from "@/lib/payment.functions";
import heroImg from "@/assets/hero.jpg";
import teeNaija from "@/assets/tee-naija.jpg";
import teeLimited from "@/assets/tee-limited.jpg";
import teeGod from "@/assets/tee-god.jpg";
import teeGrowing from "@/assets/tee-growing.jpg";
import teeFocus from "@/assets/tee-focus.jpg";
import teePretty from "@/assets/tee-pretty.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abby × Emmy Style Studio — Premium Tees Made For You" },
      {
        name: "description",
        content:
          "Luxury comfort, timeless style. Shop premium branded tees, design your own shirt, pay securely and track your order — designed in Nigeria, worn everywhere.",
      },
      { property: "og:title", content: "Abby × Emmy Style Studio — Premium Tees Made For You" },
      {
        property: "og:description",
        content:
          "Premium branded and custom-printed tees. Design your own shirt, order online and track delivery nationwide.",
      },
    ],
  }),
  component: Index,
});

const WHATSAPP = "2348055256283";
const EMAIL = "abbydesignhub@gmail.com";

const fallbackImages = [teeNaija, teeLimited, teeGod, teeGrowing, teeFocus, teePretty];

const fallbackProducts = [
  { id: "f1", name: "Made In Naija Tee", description: "Heavyweight cotton, statement print", price: 12500, image_url: null, category: "shop" },
  { id: "f2", name: "Limited Edition Tee", description: "Cream drop-shoulder, gold script", price: 11500, image_url: null, category: "shop" },
  { id: "f3", name: "God Is Good Tee", description: "Obsidian black, premium screen print", price: 12500, image_url: null, category: "shop" },
  { id: "f4", name: "Growing Daily Tee", description: "Soft cream, minimal typography", price: 11500, image_url: null, category: "shop" },
  { id: "f5", name: "Focus & Discipline Tee", description: "Forest green oversized fit", price: 12000, image_url: null, category: "shop" },
  { id: "f6", name: "Pretty & Prayerful Tee", description: "Dusty rose, delicate serif print", price: 11500, image_url: null, category: "shop" },
];

const categories = [
  { label: "Graphic Tees", note: "Shop Now" },
  { label: "Essentials", note: "Shop Now" },
  { label: "Oversized", note: "Shop Now" },
  { label: "Premium", note: "Shop Now" },
  { label: "Custom Tees", note: "Design Now" },
];

const offers = [
  { id: "p1", name: "Business Branding Package", description: "10 custom tees + logo printing", price: 100000 },
  { id: "p2", name: "VIP Customer Package", description: "Exclusive designs + priority delivery", price: 50000 },
];

const deal = { id: "d1", name: "Weekend Fashion Sale Tee", description: "20% off selected branded tees", price: 6000 };

const promises = [
  { title: "Nationwide Delivery", copy: "We deliver to all 36 states in Nigeria." },
  { title: "Secure Payments", copy: "Pay safely by transfer or on delivery." },
  { title: "Order Tracking", copy: "Track your order in real time with your order number." },
  { title: "Customer Support", copy: "We're here to help you 24/7 on WhatsApp." },
];

const reviews = [
  { name: "Blessing A.", city: "Lagos, Nigeria", text: "The quality is top notch. The fabric is so comfortable and the print is perfect. Highly recommended." },
  { name: "Tunde O.", city: "Abuja, Nigeria", text: "Fast delivery and amazing customer service. I love the customisation options — will order again." },
  { name: "Maryam K.", city: "Port Harcourt, Nigeria", text: "Finally a brand that understands style and quality. My new favourite store." },
];

const naira = (n: number) => "₦" + n.toLocaleString("en-NG");

type Product = { id: string; name: string; description: string | null; price: number; image_url: string | null; category: string };
type CartLine = { id: string; name: string; price: number; qty: number };

function Index() {
  const listProductsFn = useServerFn(listProducts);
  const placeOrderFn = useServerFn(placeOrder);
  const trackOrderFn = useServerFn(trackOrder);
  const startPaymentFn = useServerFn(startOnlinePayment);

  const { data } = useQuery({
    queryKey: ["products"],
    queryFn: () => listProductsFn(),
  });

  const rows = (data ?? []) as Product[];
  const catalog: Product[] = rows.length > 0 ? rows : (fallbackProducts as Product[]);
  const shopItems = catalog.filter((p) => p.category !== "deal");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [shirt, setShirt] = useState("Black Shirt");
  const [notes, setNotes] = useState("");
  const [fileName, setFileName] = useState("");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [placing, setPlacing] = useState(false);
  const [orderResult, setOrderResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [orderNumber, setOrderNumber] = useState("");
  const [tracking, setTracking] = useState<string | null>(null);

  const total = cart.reduce((s, l) => s + l.price * l.qty, 0);
  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  const imageFor = (p: Product, i: number) => p.image_url || fallbackImages[i % fallbackImages.length];

  const addToCart = (p: { id: string; name: string; price: number }) =>
    setCart((c) =>
      c.some((l) => l.id === p.id)
        ? c.map((l) => (l.id === p.id ? { ...l, qty: l.qty + 1 } : l))
        : [...c, { id: p.id, name: p.name, price: Number(p.price), qty: 1 }],
    );

  const changeQty = (id: string, delta: number) =>
    setCart((c) => c.map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));

  const checkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setPlacing(true);
    setOrderResult(null);
    try {
      const res = await placeOrderFn({
        data: {
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim(),
          paymentMethod: "transfer" as const,
          items: cart.map((l) => ({ name: l.name, price: l.price, qty: l.qty })),
        },
      });
      if (res.ok) {
        setOrderResult({
          ok: true,
          text: `Order ${res.orderNumber} received — total ${naira(res.total)}. Transfer to the account below and send your receipt on WhatsApp. Keep your order number to track delivery.`,
        });
        setCart([]);
      } else {
        setOrderResult({ ok: false, text: res.error });
      }
    } catch {
      setOrderResult({ ok: false, text: "Please check your name and phone number and try again." });
    } finally {
      setPlacing(false);
    }
  };

  const orderOnWhatsApp = () => {
    const lines = cart.map((l) => `${l.qty} x ${l.name} — ${naira(l.price * l.qty)}`).join("\n");
    const msg = `Hello Abby x Emmy Style Studio, I'd like to order:\n${lines}\n\nTotal: ${naira(total)}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const submitDesign = (e: React.FormEvent) => {
    e.preventDefault();
    const msg = `Custom design request:\nShirt: ${shirt}\nNotes: ${notes || "—"}\nLogo file: ${fileName || "will send in chat"}`;
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const runTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim()) {
      setTracking("Please enter your order number.");
      return;
    }
    const res = await trackOrderFn({ data: { orderNumber: orderNumber.trim() } });
    if (!res.found) {
      setTracking("We couldn't find that order number. Please check and try again.");
      return;
    }
    setTracking(
      `Order ${res.orderNumber} — status: ${res.status.toUpperCase()}. Total ${naira(res.total)}.` +
        (res.trackingNumber ? ` Tracking: ${res.trackingNumber}.` : "") +
        (res.trackingNote ? ` ${res.trackingNote}` : ""),
    );
  };

  return (
    <div id="home" className="min-h-screen scroll-smooth">
      <Nav cartCount={cartCount} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-ink text-ink-foreground">
        <img
          src={heroImg}
          alt="Models wearing premium Abby x Emmy branded tees"
          width={1600}
          height={1000}
          className="absolute inset-0 h-full w-full object-cover opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink/85 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 sm:py-32">
          <p className="text-eyebrow text-gold">Wear Your Story</p>
          <h1 className="mt-5 max-w-3xl text-5xl leading-[0.92] sm:text-7xl">
            Premium tees.
            <br />
            <span className="text-gold">Made for you.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-ink-foreground/80">
            Luxury comfort. Timeless style. Designed in Nigeria. Worn everywhere.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <a
              href="#shop"
              className="rounded-sm bg-gradient-gold px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold transition-transform hover:-translate-y-0.5"
            >
              Shop Now →
            </a>
            <a
              href="#custom"
              className="rounded-sm border border-gold/60 px-8 py-3.5 text-xs font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold/10"
            >
              Customize your t-shirt
            </a>
          </div>
          <ul className="mt-12 grid max-w-3xl gap-5 text-sm sm:grid-cols-4">
            {[
              ["Premium Quality", "100% Guaranteed"],
              ["Fast & Reliable", "Delivery Nationwide"],
              ["Secure Payments", "Safe, Simple & Trusted"],
              ["7-Day Returns", "No Questions Asked"],
            ].map(([t, s]) => (
              <li key={t}>
                <p className="font-semibold text-gold">{t}</p>
                <p className="text-ink-foreground/65">{s}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Category strip */}
      <section className="border-y border-border/60 bg-card/60">
        <div className="mx-auto grid max-w-7xl gap-px px-5 py-6 sm:grid-cols-3 lg:grid-cols-5">
          {categories.map((c) => (
            <a
              key={c.label}
              href="#shop"
              className="flex flex-col items-center gap-1 border-border/50 px-4 py-4 text-center transition-colors hover:text-gold lg:border-r lg:last:border-r-0"
            >
              <span className="text-xs font-bold uppercase tracking-[0.2em]">{c.label}</span>
              <span className="text-xs text-muted-foreground">{c.note}</span>
            </a>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section id="shop" className="mx-auto max-w-7xl px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-4xl">Featured Products</h2>
          <a href="#cart" className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            View all products →
          </a>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {shopItems.map((p, i) => (
            <article key={p.id} className="group">
              <div className="overflow-hidden rounded-sm bg-card shadow-card">
                <img
                  src={imageFor(p, i)}
                  alt={p.name}
                  width={800}
                  height={800}
                  loading="lazy"
                  className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <h3 className="mt-4 text-lg tracking-wide">{p.name}</h3>
              {p.description ? (
                <p className="text-xs text-muted-foreground">{p.description}</p>
              ) : null}
              <p className="mt-1 font-semibold text-gold">{naira(Number(p.price))}</p>
              <button
                onClick={() => addToCart({ id: p.id, name: p.name, price: Number(p.price) })}
                className="mt-3 w-full rounded-sm border border-gold/50 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-gold transition-colors hover:bg-gold hover:text-primary-foreground"
              >
                Add to cart
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* Design your own */}
      <section id="custom" className="mx-auto max-w-7xl px-5 pb-20">
        <div className="grid gap-10 rounded-sm bg-gradient-ink p-8 shadow-card lg:grid-cols-2 lg:p-12">
          <div>
            <p className="text-eyebrow text-gold">Make it yours</p>
            <h2 className="mt-4 text-4xl leading-tight sm:text-5xl">
              Design your
              <br />
              own t-shirt
            </h2>
            <p className="mt-4 max-w-md text-sm text-ink-foreground/75">
              Create a piece that's uniquely you. Upload your logo, add text, choose colours and see
              your vision come to life.
            </p>
            <ol className="mt-8 grid gap-4 sm:grid-cols-4">
              {[
                ["Choose product", "Pick your favourite style & size"],
                ["Customize", "Add your design, text & colours"],
                ["Preview", "See how it looks before you order"],
                ["Add to cart", "Place your order & we deliver"],
              ].map(([t, s], i) => (
                <li key={t}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gold/60 text-xs text-gold">
                    {i + 1}
                  </span>
                  <p className="mt-2 text-xs font-bold uppercase tracking-wider text-ink-foreground">{t}</p>
                  <p className="text-xs text-ink-foreground/60">{s}</p>
                </li>
              ))}
            </ol>
          </div>

          <form onSubmit={submitDesign} className="space-y-5 rounded-sm bg-card/70 p-6">
            <div>
              <label htmlFor="logo" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Upload your logo
              </label>
              <input
                id="logo"
                type="file"
                accept="image/*"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                className="w-full rounded-sm border bg-background p-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="shirt" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Choose colour
              </label>
              <select
                id="shirt"
                value={shirt}
                onChange={(e) => setShirt(e.target.value)}
                className="w-full rounded-sm border bg-background p-3"
              >
                <option>Black Shirt</option>
                <option>Cream Shirt</option>
                <option>White Shirt</option>
                <option>Gold Shirt</option>
              </select>
            </div>
            <div>
              <label htmlFor="notes" className="mb-2 block text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Design notes
              </label>
              <textarea
                id="notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Placement, sizes, quantity..."
                className="w-full rounded-sm border bg-background p-3"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-sm bg-gradient-gold px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold"
            >
              Start customising →
            </button>
          </form>
        </div>
      </section>

      {/* Collections / premium offers */}
      <section id="premium" className="border-y border-border/60 bg-card/40 py-20">
        <div className="mx-auto max-w-5xl px-5">
          <p className="text-eyebrow text-gold">Collections</p>
          <h2 className="mt-3 text-4xl">Premium packages</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {offers.map((o) => (
              <div key={o.id} className="rounded-sm border border-gold/25 bg-background p-7">
                <h3 className="text-2xl text-gold">{o.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{o.description}</p>
                <p className="mt-5 text-3xl font-bold">{naira(o.price)}</p>
                <button
                  onClick={() => addToCart(o)}
                  className="mt-6 w-full rounded-sm bg-gradient-gold px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold"
                >
                  Add to cart
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* New arrivals / deal */}
      <section id="deals" className="mx-auto max-w-5xl px-5 py-20">
        <p className="text-eyebrow text-gold">New Arrivals</p>
        <h2 className="mt-3 text-4xl">Weekend fashion sale</h2>
        <div className="mt-6 flex flex-wrap items-center justify-between gap-6 rounded-sm bg-card p-7 shadow-card">
          <div>
            <h3 className="text-2xl">{deal.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{deal.description}</p>
          </div>
          <button
            onClick={() => addToCart(deal)}
            className="rounded-sm bg-gradient-gold px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold"
          >
            Buy now {naira(deal.price)}
          </button>
        </div>
      </section>

      {/* Cart + checkout */}
      <section id="cart" className="border-y border-border/60 bg-card/40 py-20">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-4xl">Your cart</h2>
          <div className="mt-6 rounded-sm bg-background p-7 shadow-card">
            {cart.length === 0 ? (
              <p className="text-muted-foreground">Your cart is empty — add a tee to get started.</p>
            ) : (
              <ul className="divide-y divide-border">
                {cart.map((l) => (
                  <li key={l.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="font-semibold">{l.name}</p>
                      <p className="text-sm text-muted-foreground">{naira(l.price)} each</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => changeQty(l.id, -1)} aria-label={`Remove one ${l.name}`} className="h-8 w-8 rounded-sm border font-bold">−</button>
                      <span className="w-6 text-center font-semibold">{l.qty}</span>
                      <button onClick={() => changeQty(l.id, 1)} aria-label={`Add one ${l.name}`} className="h-8 w-8 rounded-sm border font-bold">+</button>
                      <span className="w-24 text-right font-bold text-gold">{naira(l.price * l.qty)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-6 border-t border-border pt-5 text-2xl font-bold">
              Total: <span className="text-gold">{naira(total)}</span>
            </p>

            <form onSubmit={checkout} className="mt-6 grid gap-4 sm:grid-cols-3">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full name"
                className="rounded-sm border bg-card p-3"
              />
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone number"
                className="rounded-sm border bg-card p-3"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email (optional)"
                className="rounded-sm border bg-card p-3"
              />
              <div className="flex flex-wrap gap-3 sm:col-span-3">
                <button
                  type="submit"
                  disabled={cart.length === 0 || placing}
                  className="rounded-sm bg-gradient-gold px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold disabled:opacity-40"
                >
                  {placing ? "Placing order..." : "Place order"}
                </button>
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={orderOnWhatsApp}
                  className="rounded-sm border border-gold/50 px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-gold disabled:opacity-40"
                >
                  Order on WhatsApp
                </button>
              </div>
            </form>

            {orderResult ? (
              <p className={`mt-5 rounded-sm border p-4 text-sm ${orderResult.ok ? "border-gold/50 text-gold" : "border-destructive/60 text-destructive"}`}>
                {orderResult.text}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Promises */}
      <section className="mx-auto max-w-7xl px-5 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {promises.map((p) => (
            <div key={p.title}>
              <h3 className="text-xl text-gold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Payment */}
      <section id="payment" className="border-y border-border/60 bg-card/40 py-20">
        <div className="mx-auto max-w-4xl px-5">
          <h2 className="text-4xl">Payment</h2>
          <p className="mt-2 text-muted-foreground">Choose how you'd like to pay.</p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="rounded-sm border border-gold/25 bg-background p-7">
              <h3 className="text-2xl text-gold">Bank Transfer</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Account number</dt>
                  <dd className="text-lg font-bold">8055256283</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Account name</dt>
                  <dd className="text-lg font-bold">Abby Design Hub</dd>
                </div>
              </dl>
              <a
                href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent("Hello, here is my payment receipt.")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-block rounded-sm bg-gradient-gold px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold"
              >
                Send receipt on WhatsApp
              </a>
            </div>
            <div className="rounded-sm border border-border bg-background p-7">
              <h3 className="text-2xl">Pay Online</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Card and USSD payments are coming soon. For now, bank transfer confirms your order
                fastest.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Track order */}
      <section id="track" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-4xl">Order tracking</h2>
        <p className="mt-2 text-muted-foreground">Enter the order number from your confirmation.</p>
        <form onSubmit={runTracking} className="mt-6 flex flex-wrap gap-3">
          <input
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="e.g. ADH-1001"
            className="min-w-56 flex-1 rounded-sm border bg-card p-3"
          />
          <button className="rounded-sm bg-gradient-gold px-7 py-3 text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold">
            Track
          </button>
        </form>
        {tracking ? <p className="mt-4 text-sm text-gold">{tracking}</p> : null}
      </section>

      {/* Reviews */}
      <section className="border-y border-border/60 bg-card/40 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <h2 className="text-4xl">Our customers love us</h2>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {reviews.map((r) => (
              <figure key={r.name} className="rounded-sm bg-background p-7 shadow-card">
                <p className="text-gold">★★★★★</p>
                <blockquote className="mt-3 text-sm text-muted-foreground">{r.text}</blockquote>
                <figcaption className="mt-4 text-sm font-semibold">
                  {r.name}
                  <span className="block text-xs font-normal text-muted-foreground">{r.city}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / contact */}
      <footer id="contact" className="bg-ink py-16 text-ink-foreground">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl tracking-[0.16em]">
              ABBY <span className="text-gold">×</span> EMMY
            </p>
            <p className="text-[10px] uppercase tracking-[0.42em] text-ink-foreground/50">Style Studio</p>
            <p className="mt-4 text-sm text-ink-foreground/70">
              Premium tees. Timeless style. Wear your story.
            </p>
          </div>
          <div>
            <h3 className="text-lg text-gold">Shop</h3>
            <ul className="mt-3 space-y-1 text-sm text-ink-foreground/70">
              <li><a href="#shop" className="hover:text-gold">All products</a></li>
              <li><a href="#premium" className="hover:text-gold">Premium packages</a></li>
              <li><a href="#deals" className="hover:text-gold">New arrivals</a></li>
              <li><a href="#custom" className="hover:text-gold">Custom tees</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg text-gold">Customer care</h3>
            <ul className="mt-3 space-y-1 text-sm text-ink-foreground/70">
              <li><a href="#track" className="hover:text-gold">Track order</a></li>
              <li><a href="#payment" className="hover:text-gold">Payment methods</a></li>
              <li>Returns &amp; exchanges</li>
              <li>Shipping &amp; delivery</li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg text-gold">Contact</h3>
            <ul className="mt-3 space-y-1 text-sm text-ink-foreground/70">
              <li>
                WhatsApp:{" "}
                <a href={`https://wa.me/${WHATSAPP}`} target="_blank" rel="noreferrer" className="hover:text-gold">
                  08055256283
                </a>
              </li>
              <li>
                Email:{" "}
                <a href={`mailto:${EMAIL}`} className="hover:text-gold">
                  {EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-12 max-w-7xl px-5 text-xs text-ink-foreground/40">
          © 2026 Abby × Emmy Style Studio. All rights reserved. Designed in Nigeria.
        </p>
      </footer>

    </div>
  );
}
