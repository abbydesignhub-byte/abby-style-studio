const links = [
  { href: "#home", label: "Home" },
  { href: "#shop", label: "Shop" },
  { href: "#custom", label: "Custom Design" },
  { href: "#payment", label: "Payment" },
  { href: "#track", label: "Track Order" },
  { href: "#contact", label: "Contact" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 bg-gradient-ink text-ink-foreground shadow-card">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <a href="#home" className="flex items-baseline gap-2">
          <span className="font-display text-2xl tracking-widest text-gold">ABBY</span>
          <span className="font-display text-2xl tracking-widest">DESIGN HUB</span>
        </a>
        <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium uppercase tracking-wide">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-ink-foreground/75 transition-colors hover:text-gold"
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
