import { useState, useRef, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askAssistant } from "@/lib/ai.functions";

type Msg = { role: "user" | "assistant"; content: string };

const GREETING: Msg = {
  role: "assistant",
  content:
    "Hi! I'm Abby's style assistant. Ask me about our tees, custom printing, sizes, delivery or tracking your order.",
};

export function AiAssistant() {
  const ask = useServerFn(askAssistant);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await ask({
        data: { messages: next.filter((m) => m !== GREETING).slice(-12) },
      });
      setMessages([...next, { role: "assistant", content: res.reply }]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Something went wrong. Please try again or message us on WhatsApp." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {open && (
        <section
          aria-label="Style assistant chat"
          className="fixed bottom-24 right-5 z-50 flex h-[26rem] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-gold/30 bg-card shadow-card"
        >
          <header className="bg-gradient-ink px-4 py-3 text-ink-foreground">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-gold">Style Assistant</p>
            <p className="text-xs text-ink-foreground/70">Ask about tees, custom prints & delivery</p>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "bg-secondary text-foreground"
                }`}
              >
                {m.content}
              </p>
            ))}
            {busy && <p className="text-xs text-muted-foreground">Typing…</p>}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex gap-2 border-t p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              aria-label="Message the style assistant"
              className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-gradient-gold px-4 py-2 text-xs font-bold uppercase text-accent-foreground disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close style assistant" : "Open style assistant"}
        className="fixed bottom-5 right-5 z-50 rounded-full bg-gradient-gold px-5 py-4 text-sm font-bold uppercase tracking-wide text-accent-foreground shadow-gold"
      >
        {open ? "Close" : "Ask Abby AI"}
      </button>
    </>
  );
}
