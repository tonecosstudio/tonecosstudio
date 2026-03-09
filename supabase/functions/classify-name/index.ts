import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { classifyNameWithAI } from "../_shared/ai.ts";
import { assertAdmin, getClaims } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { checkContentLength, PAYLOAD_LIMITS } from "../_shared/payload-guard.ts";

function modelForCache() {
  const env = (Deno.env.get("AI_CLASSIFY_MODELS") || "").trim();
  const first = env ? env.split(",")[0]?.trim() : "";
  return first || "google/gemini-3-flash-preview";
}

type FranchiseRuleRow = {
  pattern: string;
  franchise_canonical: string;
  priority: number;
  enabled: boolean;
};

function applyFranchiseRules(name: string, rules: FranchiseRuleRow[]) {
  const hay = name.toLowerCase();
  const enabled = rules
    .filter((r) => r.enabled)
    .sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100));
  for (const r of enabled) {
    const pat = String(r.pattern ?? "").trim().toLowerCase();
    if (!pat) continue;
    if (hay.includes(pat)) return String(r.franchise_canonical);
  }
  return null;
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { userId } = await assertAdmin(req);
    const { client } = await getClaims(req);

    // Rate limit: AI operations
    const rateLimited = await checkRateLimit(req, "classify-name", RATE_LIMITS.AI, userId);
    if (rateLimited) return rateLimited;

    // Payload size guard (AI text: 32 KB)
    const tooLarge = checkContentLength(req, PAYLOAD_LIMITS.AI_TEXT);
    if (tooLarge) return tooLarge;

    const body = await req.json().catch(() => ({}));

    // Reject unknown fields
    const knownFields = new Set(["name"]);
    for (const key of Object.keys(body)) {
      if (!knownFields.has(key)) {
        return new Response(JSON.stringify({ error: `Unknown field: '${key}'` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const name = typeof body?.name === "string" ? body.name.trim().slice(0, 500) : "";
    if (!name) {
      return new Response(JSON.stringify({ error: "name is required (max 500 chars)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cached, error: cacheErr } = await client
      .from("ai_name_cache")
      .select("name,franchise,category,subcategory,tags")
      .eq("name", name)
      .maybeSingle();
    if (cacheErr) throw cacheErr;

    if (cached) {
      return new Response(
        JSON.stringify({
          franchise: cached.franchise,
          category: cached.category,
          subcategory: cached.subcategory,
          tags: cached.tags ?? [],
          fromCache: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Regras automáticas (admin) antes de chamar IA
    let franchiseFromRule = null;
    try {
      const { data: rules } = await client
        .from("franchise_rules")
        .select("pattern,franchise_canonical,priority,enabled")
        .eq("enabled", true)
        .order("priority", { ascending: true })
        .limit(500);
      franchiseFromRule = applyFranchiseRules(name, (rules ?? []) as FranchiseRuleRow[]);
    } catch (rulesErr) {
      console.error("Error fetching franchise_rules (ignoring):", rulesErr);
      // Ignora erro e continua sem regras
    }

    const ai = await classifyNameWithAI(name);

    // Se alguma regra bater, força a franquia canônica mesmo que a IA chute outra
    const finalAi = franchiseFromRule ? { ...ai, franchise: franchiseFromRule } : ai;

    const { error: upErr } = await client.from("ai_name_cache").upsert(
      {
        name,
        franchise: finalAi.franchise,
        category: finalAi.category,
        subcategory: finalAi.subcategory,
        tags: finalAi.tags,
        model: modelForCache(),
      },
      { onConflict: "name" },
    );
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ...finalAi, fromCache: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden") ? 403 : msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
