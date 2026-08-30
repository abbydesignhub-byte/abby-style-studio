import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1000),
      }),
    )
    .min(1)
    .max(20),
});

const SYSTEM_PROMPT = `You are the friendly shopping assistant for Abby × Emmy Style Studio, a premium Nigerian t-shirt brand.
You help customers choose tees, explain custom design and printing, sizing, pricing in Naira, delivery across Nigeria, payment (bank transfer to 8055256283, Abby Design Hub) and order tracking (customers enter their ADH- order number in the Track Order section).
Support contact: WhatsApp 08055256283, email abbydesignhub@gmail.com.
Be warm, concise (2-4 sentences), and never invent order details or promise delivery dates. If you don't know, point the customer to WhatsApp.`;

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => chatSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false as const, reply: "The assistant is unavailable right now." };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...data.messages],
      }),
    });

    if (res.status === 429)
      return { ok: false as const, reply: "Too many messages right now — please try again shortly." };
    if (!res.ok)
      return { ok: false as const, reply: "I couldn't reach the assistant. Please chat with us on WhatsApp." };

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = json.choices?.[0]?.message?.content?.trim();
    if (!reply) return { ok: false as const, reply: "I didn't catch that — could you rephrase?" };
    return { ok: true as const, reply };
  });
