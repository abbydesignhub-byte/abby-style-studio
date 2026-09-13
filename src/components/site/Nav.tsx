import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";


const links = [
  { href: "#home", label: "Home" },
  { href: "#shop", label: "Shop" },
  { href: "#custom", label: "Customize" },
  { href: "#premium", label: "Collections" },
  { href: "#deals", label: "New Arrivals" },
  { href: "#track", label: "Track Order" },
  { href: "#contact", label: "About Us" },
];

export function Nav({ cartCount = 0 }: { cartCount?: number }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setEmail(session?.user?.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40">
      <div className="bg-ink text-ink-foreground/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-1 px-5 py-2 text-[11px] uppercase tracking-[0.18em]">
          <span>Proudly Nigerian</span>
          <span className="hidden sm:inline">Free delivery on orders over ₦40,000</span>
          <span className="hidden md:inline">Easy returns &amp; exchanges</span>
          <span className="hidden lg:inline">Order via WhatsApp</span>
        </div>
      </div>

      <div className="border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <a href="#home" className="flex items-center">
            <Logo size={44} withTagline />
          </a>


          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-semibold uppercase tracking-[0.16em]">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-foreground/70 transition-colors hover:text-gold"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.16em]">
            {email ? (
              <>
                <Link to="/admin" className="text-foreground/70 transition-colors hover:text-gold">
                  Dashboard
                </Link>
                <button
                  onClick={() => supabase.auth.signOut()}
                  className="text-foreground/70 transition-colors hover:text-gold"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link to="/auth" className="text-foreground/70 transition-colors hover:text-gold">
                Sign in
              </Link>
            )}
            <a
              href="#cart"
              className="rounded-sm bg-gradient-gold px-4 py-2 text-primary-foreground shadow-gold"
            >
              Cart ({cartCount})
            </a>
          </div>
        </div>
      </div>
    </header>
  );
}
