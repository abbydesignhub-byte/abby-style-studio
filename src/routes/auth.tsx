import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — Abby Design Hub" },
      {
        name: "description",
        content:
          "Sign in or create an Abby Design Hub account to manage your orders, saved designs and the store dashboard.",
      },
      { property: "og:title", content: "Sign In — Abby Design Hub" },
      {
        property: "og:description",
        content: "Access your Abby Design Hub account and order history.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin`,
          data: { full_name: fullName },
        },
      });
      setBusy(false);
      setMsg(
        error
          ? { text: error.message, ok: false }
          : { text: "Account created. Check your email to confirm, then sign in.", ok: true },
      );
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setMsg({ text: error.message, ok: false });
      return;
    }
    navigate({ to: "/admin" });
  };

  const google = async () => {
    setMsg(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMsg({ text: "Google sign-in failed. Please try again.", ok: false });
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/admin" });
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 py-16 text-ink-foreground">
      <div className="w-full max-w-md rounded-xl border border-gold/25 bg-card p-8 text-foreground shadow-card">
        <Link to="/" className="font-display text-2xl tracking-widest text-accent-foreground">
          ABBY DESIGN HUB
        </Link>
        <h1 className="mt-4 text-3xl">{mode === "signin" ? "Sign in" : "Create account"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your orders and the store dashboard.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              aria-label="Full name"
              maxLength={80}
              className="w-full rounded-md border bg-background p-3"
            />
          )}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            aria-label="Email address"
            className="w-full rounded-md border bg-background p-3"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className="w-full rounded-md border bg-background p-3"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-6 py-3 text-sm font-bold uppercase tracking-wider text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
          </button>
        </form>

        <button
          onClick={google}
          className="mt-3 w-full rounded-md border px-6 py-3 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-secondary"
        >
          Continue with Google
        </button>

        {msg && (
          <p
            className={`mt-4 rounded-md p-3 text-sm ${msg.ok ? "bg-secondary" : "bg-destructive/10 text-destructive"}`}
          >
            {msg.text}
          </p>
        )}

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-5 w-full text-sm text-muted-foreground underline"
        >
          {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
