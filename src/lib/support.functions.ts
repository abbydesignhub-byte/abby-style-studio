import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SETTING_KEYS = [
  "support_ai_tone",
  "support_business_info",
  "support_escalation_keywords",
  "support_hours",
] as const;

type Db = any; // eslint-disable-line @typescript-eslint/no-explicit-any

async function loadAiContext(db: Db) {
  const { data: settings } = await db.from("site_settings").select("key, value").in("key", SETTING_KEYS);
  const s = Object.fromEntries((settings ?? []).map((r: { key: string; value: string }) => [r.key, r.value ?? ""]));
  const { data: kb } = await db
    .from("support_kb_articles")
    .select("title, content")
    .eq("is_published", true)
    .limit(40);
  return {
    tone: s.support_ai_tone || "Warm and concise.",
    business: s.support_business_info || "",
    hours: s.support_hours || "",
    keywords: String(s.support_escalation_keywords || "")
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean),
    kb: (kb ?? []) as { title: string; content: string }[],
  };
}

export function shouldEscalate(text: string, keywords: string[]) {
  const t = text.toLowerCase();
  return keywords.some((k) => k && t.includes(k));
}

/* ---------------- Customer-facing (public, token-verified) ---------------- */

const sendSchema = z.object({
  conversationId: z.string().uuid().optional(),
  token: z.string().uuid().optional(),
  name: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.string().trim().email().max(120).optional().or(z.literal("")),
  message: z.string().trim().min(1).max(1000),
});

async function verifyConversation(db: Db, id: string, token: string) {
  const { data } = await db
    .from("support_conversations")
    .select("id, access_token, status")
    .eq("id", id)
    .maybeSingle();
  if (!data || data.access_token !== token) throw new Error("Conversation not found");
  return data;
}

export const supportSend = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => sendSchema.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    let id = data.conversationId;
    let token = data.token;
    if (id && token) {
      await verifyConversation(db, id, token);
    } else {
      const { data: created, error } = await db
        .from("support_conversations")
        .insert({
          customer_name: data.name || null,
          customer_email: data.email || null,
          subject: data.message.slice(0, 80),
        })
        .select("id, access_token")
        .single();
      if (error || !created) throw new Error("Could not start chat");
      id = created.id;
      token = created.access_token;
    }
    const now = new Date().toISOString();
    await db.from("support_messages").insert({
      conversation_id: id,
      sender: "customer",
      author: data.name || "Customer",
      content: data.message,
    });

    const ctx = await loadAiContext(db);
    const patch: Record<string, unknown> = { last_message_at: now };
    if (data.name) patch.customer_name = data.name;
    if (data.email) patch.customer_email = data.email;

    if (shouldEscalate(data.message, ctx.keywords)) {
      patch.status = "escalated";
      patch.priority = "high";
      await db.from("support_conversations").update(patch).eq("id", id);
      const reply =
        "Thanks for letting us know — I've passed this to our support team, who will reply here during support hours" +
        (ctx.hours ? ` (${ctx.hours})` : "") +
        ". You can also reach us on WhatsApp at 08055256283.";
      await db.from("support_messages").insert({ conversation_id: id, sender: "ai", author: "AI assistant", content: reply });
      return { conversationId: id!, token: token!, escalated: true };
    }

    const { data: history } = await db
      .from("support_messages")
      .select("sender, content")
      .eq("conversation_id", id)
      .order("created_at")
      .limit(30);
    let reply: string;
    try {
      const { generateSupportReply, buildSystemPrompt } = await import("./support-ai.server");
      reply = await generateSupportReply(
        buildSystemPrompt(ctx),
        (history ?? []).map((m: { sender: string; content: string }) => ({
          role: m.sender === "customer" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        })),
      );
      if (!reply) throw new Error("empty");
    } catch (e) {
      console.error("support ai error", e);
      reply = "I couldn't answer that right now — a team member will follow up here. You can also WhatsApp 08055256283.";
      patch.status = "pending";
    }
    patch.ai_assisted = true;
    await db.from("support_messages").insert({ conversation_id: id, sender: "ai", author: "AI assistant", content: reply });
    const { data: conv } = await db.from("support_conversations").select("first_response_at").eq("id", id).single();
    if (!conv?.first_response_at) patch.first_response_at = new Date().toISOString();
    await db.from("support_conversations").update(patch).eq("id", id);
    return { conversationId: id!, token: token!, escalated: false };
  });

export const supportThread = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ conversationId: z.string().uuid(), token: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const conv = await verifyConversation(db, data.conversationId, data.token);
    const { data: msgs } = await db
      .from("support_messages")
      .select("id, sender, content, created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at");
    return { status: conv.status as string, messages: (msgs ?? []) as { id: string; sender: string; content: string; created_at: string }[] };
  });

/* ---------------- Admin ---------------- */

async function assertAdmin(context: { supabase: Db; userId: string; claims: Record<string, unknown> }) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (data !== true) throw new Error("ACCESS DENIED");
  return (context.claims["email"] as string | undefined)?.toLowerCase() ?? "admin";
}

const adminFn = <T extends z.ZodTypeAny>(method: "GET" | "POST", schema?: T) =>
  createServerFn({ method }).middleware([requireSupabaseAuth]).inputValidator((i: unknown) =>
    (schema ? schema.parse(i) : undefined) as z.infer<T>,
  );

export const supportListConversations = adminFn("GET").handler(async ({ context }) => {
  await assertAdmin(context);
  const { data, error } = await context.supabase
    .from("support_conversations")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(300);
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const supportGetConversation = adminFn("POST", z.object({ id: z.string().uuid() })).handler(
  async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    const { data: conv } = await db.from("support_conversations").select("*").eq("id", data.id).single();
    if (!conv) throw new Error("Not found");
    const [{ data: messages }, { data: notes }] = await Promise.all([
      db.from("support_messages").select("*").eq("conversation_id", data.id).order("created_at"),
      db.from("support_notes").select("*").eq("conversation_id", data.id).order("created_at"),
    ]);
    // Customer profile: other conversations + orders matched by email/phone.
    const ors = [
      conv.customer_email ? `customer_email.eq.${conv.customer_email}` : null,
      conv.customer_phone ? `customer_phone.eq.${conv.customer_phone}` : null,
    ].filter(Boolean) as string[];
    let orders: unknown[] = [];
    let otherConversations: unknown[] = [];
    if (ors.length) {
      const [o, c] = await Promise.all([
        db.from("orders").select("id, order_number, total, status, payment_status, created_at").or(ors.join(",")).order("created_at", { ascending: false }).limit(20),
        db.from("support_conversations").select("id, subject, status, created_at").or(ors.join(",")).neq("id", data.id).order("created_at", { ascending: false }).limit(20),
      ]);
      orders = o.data ?? [];
      otherConversations = c.data ?? [];
    }
    return { conversation: conv, messages: messages ?? [], notes: notes ?? [], orders, otherConversations };
  },
);

export const supportUpdateConversation = adminFn(
  "POST",
  z.object({
    id: z.string().uuid(),
    status: z.enum(["open", "pending", "escalated", "resolved"]).optional(),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
    assignedTo: z.string().trim().max(120).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(30)).max(12).optional(),
  }),
).handler(async ({ data, context }) => {
  await assertAdmin(context);
  const patch: Record<string, unknown> = {};
  if (data.status) {
    patch.status = data.status;
    patch.resolved_at = data.status === "resolved" ? new Date().toISOString() : null;
  }
  if (data.priority) patch.priority = data.priority;
  if (data.assignedTo !== undefined) patch.assigned_to = data.assignedTo || null;
  if (data.tags) patch.tags = data.tags;
  const { error } = await context.supabase.from("support_conversations").update(patch).eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const supportAddNote = adminFn(
  "POST",
  z.object({ id: z.string().uuid(), content: z.string().trim().min(1).max(2000) }),
).handler(async ({ data, context }) => {
  const email = await assertAdmin(context);
  const { error } = await context.supabase
    .from("support_notes")
    .insert({ conversation_id: data.id, author: email, content: data.content });
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const supportDraftReply = adminFn("POST", z.object({ id: z.string().uuid() })).handler(
  async ({ data, context }) => {
    await assertAdmin(context);
    const db = context.supabase;
    const ctx = await loadAiContext(db);
    const { data: msgs } = await db
      .from("support_messages")
      .select("sender, content")
      .eq("conversation_id", data.id)
      .order("created_at")
      .limit(30);
    if (!msgs?.length) throw new Error("No messages to reply to");
    const { generateSupportReply, buildSystemPrompt } = await import("./support-ai.server");
    try {
      const draft = await generateSupportReply(
        buildSystemPrompt({ ...ctx, forAgentDraft: true }),
        msgs.map((m: { sender: string; content: string }) => ({
          role: m.sender === "customer" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        })),
      );
      return { draft };
    } catch (e) {
      console.error("draft error", e);
      throw new Error("The AI could not draft a reply right now. Please write one manually.");
    }
  },
);

export const supportSendReply = adminFn(
  "POST",
  z.object({ id: z.string().uuid(), content: z.string().trim().min(1).max(4000), aiDrafted: z.boolean() }),
).handler(async ({ data, context }) => {
  const email = await assertAdmin(context);
  const db = context.supabase;
  const now = new Date().toISOString();
  const { error } = await db.from("support_messages").insert({
    conversation_id: data.id,
    sender: "agent",
    author: email,
    content: data.content,
    ai_drafted: data.aiDrafted,
  });
  if (error) throw new Error(error.message);
  const { data: conv } = await db.from("support_conversations").select("first_response_at, ai_assisted").eq("id", data.id).single();
  await db
    .from("support_conversations")
    .update({
      last_message_at: now,
      first_response_at: conv?.first_response_at ?? now,
      ai_assisted: (conv?.ai_assisted ?? false) || data.aiDrafted,
      status: "pending",
    })
    .eq("id", data.id);
  return { ok: true };
});

/* Knowledge base */
export const supportListKb = adminFn("GET").handler(async ({ context }) => {
  await assertAdmin(context);
  const { data } = await context.supabase.from("support_kb_articles").select("*").order("category").order("title");
  return data ?? [];
});

export const supportSaveKb = adminFn(
  "POST",
  z.object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(3).max(160),
    category: z.string().trim().min(2).max(40),
    content: z.string().trim().min(10).max(5000),
    isPublished: z.boolean(),
  }),
).handler(async ({ data, context }) => {
  await assertAdmin(context);
  const row = {
    title: data.title,
    category: data.category.toLowerCase(),
    content: data.content,
    is_published: data.isPublished,
    updated_at: new Date().toISOString(),
  };
  const q = data.id
    ? context.supabase.from("support_kb_articles").update(row).eq("id", data.id)
    : context.supabase.from("support_kb_articles").insert(row);
  const { error } = await q;
  if (error) throw new Error(error.message);
  return { ok: true };
});

export const supportDeleteKb = adminFn("POST", z.object({ id: z.string().uuid() })).handler(async ({ data, context }) => {
  await assertAdmin(context);
  const { error } = await context.supabase.from("support_kb_articles").delete().eq("id", data.id);
  if (error) throw new Error(error.message);
  return { ok: true };
});

/* Settings */
export const supportGetSettings = adminFn("GET").handler(async ({ context }) => {
  await assertAdmin(context);
  const { data } = await context.supabase.from("site_settings").select("key, value").in("key", SETTING_KEYS);
  return Object.fromEntries((data ?? []).map((r: { key: string; value: string }) => [r.key, r.value ?? ""])) as Record<string, string>;
});

export const supportSaveSettings = adminFn(
  "POST",
  z.object({
    support_ai_tone: z.string().trim().max(500),
    support_business_info: z.string().trim().max(3000),
    support_escalation_keywords: z.string().trim().max(1000),
    support_hours: z.string().trim().max(200),
  }),
).handler(async ({ data, context }) => {
  await assertAdmin(context);
  const rows = Object.entries(data).map(([key, value]) => ({ key, value, updated_at: new Date().toISOString() }));
  const { error } = await context.supabase.from("site_settings").upsert(rows);
  if (error) throw new Error(error.message);
  return { ok: true };
});

/* Analytics */
export function computeSupportStats(
  rows: { status: string; ai_assisted: boolean; created_at: string; first_response_at: string | null; resolved_at: string | null }[],
) {
  const resolved = rows.filter((r) => r.status === "resolved");
  const responded = rows.filter((r) => r.first_response_at);
  const avgFirstResponseMin = responded.length
    ? responded.reduce((s, r) => s + (new Date(r.first_response_at!).getTime() - new Date(r.created_at).getTime()), 0) /
      responded.length /
      60000
    : 0;
  return {
    total: rows.length,
    open: rows.filter((r) => r.status !== "resolved").length,
    resolved: resolved.length,
    escalated: rows.filter((r) => r.status === "escalated").length,
    resolutionRate: rows.length ? Math.round((resolved.length / rows.length) * 100) : 0,
    aiAssistedResolutions: resolved.filter((r) => r.ai_assisted).length,
    avgFirstResponseMin: Math.round(avgFirstResponseMin * 10) / 10,
  };
}

export const supportStats = adminFn("GET").handler(async ({ context }) => {
  await assertAdmin(context);
  const { data } = await context.supabase
    .from("support_conversations")
    .select("status, ai_assisted, created_at, first_response_at, resolved_at");
  return computeSupportStats(data ?? []);
});
