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
        {
          role: "assistant",
          content: "Something went wrong. Please try again or message us on WhatsApp.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <section
          aria-label="Style assistant chat"
          className="panel-luxe flex h-[27rem] w-[min(22rem,calc(100vw-3rem))] flex-col overflow-hidden"
        >
          <header className="flex items-center gap-3 bg-gradient-ink px-4 py-3 text-ink-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/60 font-display text-sm tracking-widest text-gold">
              AE
            </span>
            <span>
              <span className="block font-display text-lg tracking-[0.18em] text-gold">
                ASK ABBY AI
              </span>
              <span className="block text-[10px] uppercase tracking-[0.28em] text-ink-foreground/60">
                Style Assistant
              </span>
            </span>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background/60 p-4">
            {messages.map((m, i) => (
              <p
                key={i}
                className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto bg-gold text-primary-foreground"
                    : "border border-border bg-card text-foreground"
                }`}
              >
                {m.content}
              </p>
            ))}
            {busy && (
              <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                Typing…
              </p>
            )}
            <div ref={endRef} />
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-border bg-card p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              aria-label="Message the style assistant"
              className="flex-1 rounded-sm border border-border bg-background px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy}
              className="btn-gold px-4 py-2 text-[11px] disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </section>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close style assistant" : "Open style assistant"}
        className="btn-gold flex items-center gap-2 px-5 py-3.5 text-[11px]"
      >
        <span className="font-display text-base tracking-[0.18em]">
          {open ? "CLOSE" : "ASK ABBY AI"}
        </span>
      </button>
    </div>
  );
}
