import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/site/Logo";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Login — EMMY & ABBY" },
      {
        name: "description",
        content: "Secure administrator sign-in for the EMMY & ABBY store dashboard.",
      },
      { property: "og:title", content: "Admin Login — EMMY & ABBY" },
      { property: "og:description", content: "Authorized administrators only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signInError) {
      setError("Sign-in failed. Check your email and password.");
      return;
    }
    navigate({ to: "/admin" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-16 text-ink-foreground">
      <div className="panel-luxe w-full max-w-md bg-card p-8 text-foreground">
        <Logo size={52} withTagline />
        <h1 className="mt-5 text-3xl">Admin login</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Authorized administrators only. Customers should use the{" "}
          <Link to="/auth" className="underline">
            customer login
          </Link>
          .
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Admin email"
            aria-label="Admin email"
            className="w-full border bg-background p-3"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className="w-full border bg-background p-3"
          />
          <button type="submit" disabled={busy} className="btn-gold w-full disabled:opacity-50">
            {busy ? "Please wait…" : "Sign in to dashboard"}
          </button>
        </form>

        {error && <p className="mt-4 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        <Link to="/" className="mt-6 block text-center text-sm text-muted-foreground underline">
          Return to store
        </Link>
      </div>
    </main>
  );
}
