import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

type Msg = { role: "user" | "assistant"; content: string };

/** Calls the Lovable AI Gateway (Responses API) and returns the final text. */
export async function generateSupportReply(system: string, messages: Msg[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI unavailable");
  let runId: string | undefined;
  const openai = createOpenAI({
    apiKey,
    baseURL: "https://ai.gateway.lovable.dev/v1",
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      return res;
    },
  });
  const result = streamText({
    model: openai.responses("openai/gpt-6-astra"),
    system,
    messages,
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return (await result.text).trim();
}

export function buildSystemPrompt(opts: {
  tone: string;
  business: string;
  hours: string;
  kb: { title: string; content: string }[];
  forAgentDraft?: boolean;
}) {
  return `You are the customer support assistant for EMMY & ABBY (Abby's Custom Tees), a premium Nigerian t-shirt brand.
Tone: ${opts.tone}
Business information: ${opts.business}
Support hours: ${opts.hours}
Knowledge base (only source of policy facts):
${opts.kb.map((a) => `## ${a.title}\n${a.content}`).join("\n\n")}

Rules: answer in 2-4 sentences. Never invent prices, order details, delivery dates, discounts or policies not listed above. If you cannot answer, or the customer needs a human (refunds, damaged items, complaints), say a team member will follow up.${
    opts.forAgentDraft
      ? "\nYou are drafting a reply that a human support agent will review before sending. Write only the reply text."
      : ""
  }`;
}
