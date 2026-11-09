import { useState, useRef, useEffect, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { supportSend, supportThread } from "@/lib/support.functions";

type Msg = { id: string; sender: string; content: string };
const STORE_KEY = "ea-support-chat";

const GREETING: Msg = {
  id: "greeting",
  sender: "ai",
  content:
    "Hi! I'm the EMMY & ABBY support assistant. Ask about our tees, pricing, custom printing, orders, delivery or returns.",
};

export function AiAssistant() {
  const send = useServerFn(supportSend);
  const thread = useServerFn(supportThread);
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<{ conversationId: string; token: string } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      const res = await thread({ data: session });
      setMessages([GREETING, ...res.messages]);
    } catch {
      localStorage.removeItem(STORE_KEY);
      setSession(null);
    }
  }, [session, thread]);

  useEffect(() => {
    if (!open || !session) return;
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [open, session, refresh]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open, busy]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open, busy]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setError("");
    setMessages((m) => [...m, { id: `tmp-${Date.now()}`, sender: "customer", content: text }]);
    setInput("");
    setBusy(true);
    try {
      const res = await send({
        data: { ...(session ?? {}), name: name || undefined, email: email || undefined, message: text },
      });
      const s = { conversationId: res.conversationId, token: res.token };
      localStorage.setItem(STORE_KEY, JSON.stringify(s));
      setSession(s);
      const t = await thread({ data: s });
      setMessages([GREETING, ...t.messages]);
    } catch {
      setError("Message failed to send. Please try again or WhatsApp 08055256283.");
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    localStorage.removeItem(STORE_KEY);
    setSession(null);
    setMessages([GREETING]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="Customer support chat"
          className="panel-luxe flex h-[32rem] w-[min(23rem,calc(100vw-3rem))] flex-col overflow-hidden"
        >
          <header className="flex items-center gap-3 bg-gradient-ink px-4 py-3 text-ink-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/60 font-display text-sm tracking-widest text-gold">
              AE
            </span>
            <span className="flex-1">
              <span className="block font-display text-lg tracking-[0.18em] text-gold">ASK ABBY AI</span>
              <span className="block text-[10px] uppercase tracking-[0.28em] text-ink-foreground/60">
                Support · AI-assisted
              </span>
            </span>
            {session && (
              <button onClick={newChat} className="text-[10px] uppercase tracking-[0.2em] text-ink-foreground/70 hover:text-gold">
                New chat
              </button>
            )}
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background/60 p-4" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={m.sender === "customer" ? "flex justify-end" : ""}>
                <div
                  className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                    m.sender === "customer"
                      ? "bg-gold text-primary-foreground"
                      : "border border-border bg-card text-foreground"
                  }`}
                >
                  {m.sender !== "customer" && (
                    <span className="mb-1 block text-[9px] uppercase tracking-[0.24em] text-muted-foreground">
                      {m.sender === "agent" ? "Support team" : "AI assistant (automated)"}
                    </span>
                  )}
                  <div className="prose prose-sm max-w-none text-inherit [&_p]:my-0">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {busy && (
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">Typing…</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div ref={endRef} />
          </div>

          {!session && (
            <div className="grid grid-cols-2 gap-2 border-t border-border bg-card px-3 pt-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                aria-label="Your name"
                className="rounded-sm border border-border bg-background px-2 py-1.5 text-xs"
              />
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                placeholder="Email (optional)"
                aria-label="Your email"
                className="rounded-sm border border-border bg-background px-2 py-1.5 text-xs"
              />
            </div>
          )}
          <form onSubmit={submit} className="flex gap-2 bg-card p-3">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              aria-label="Message support"
              className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm"
            />
            <button type="submit" disabled={busy} className="btn-gold px-4 py-2 text-[11px] disabled:opacity-50">
              Send
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close support chat" : "Open support chat"}
        className="btn-gold flex items-center gap-2 px-5 py-3.5 text-[11px]"
      >
        <span className="font-display text-base tracking-[0.18em]">{open ? "CLOSE" : "ASK ABBY AI"}</span>
      </button>
    </div>
  );
}
