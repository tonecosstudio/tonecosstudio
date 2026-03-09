import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { getClaims } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeTag(t: string) {
  return t
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Auth (verify_jwt=true já valida, mas ainda garantimos que há usuário)
    await getClaims(req);

    const payload = await req.json().catch(() => ({}));
    const text = typeof payload?.text === "string" ? payload.text.trim() : "";

    if (!text) return json(200, { tags: [] });
    if (text.length > 1000) return json(400, { error: "Texto muito longo (máx 1000 caracteres)." });

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY não configurada." });

    const tool = {
      type: "function",
      function: {
        name: "extract_tags",
        description: "Extrai tags de preferência a partir de um texto livre do cliente.",
        parameters: {
          type: "object",
          properties: {
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Lista curta de tags normalizadas (máx 20).",
            },
          },
          required: ["tags"],
          additionalProperties: false,
        },
      },
    };

    const resp = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "Você extrai preferências em tags. Use tags curtas e úteis, em pt-BR quando fizer sentido. Não invente detalhes. Evite duplicatas. Não inclua emojis. Máx 20 tags.",
          },
          {
            role: "user",
            content: `Texto do cliente: ${text}`,
          },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "extract_tags" } },
      }),
    });

    if (!resp.ok) {
      // Surface pricing/rate limit
      if (resp.status === 429) return json(429, { error: "Muitas requisições. Tente novamente em instantes." });
      if (resp.status === 402) return json(402, { error: "Créditos esgotados. Adicione créditos para usar IA." });
      const t = await resp.text();
      return json(500, { error: `Falha na IA (${resp.status}).`, details: t.slice(0, 500) });
    }

    const raw = await resp.text();
    const j = JSON.parse(raw);
    const call = j.choices?.[0]?.message?.tool_calls?.[0];
    const args = call?.function?.arguments;
    const parsed = typeof args === "string" ? JSON.parse(args) : args;

    const tagsIn = Array.isArray(parsed?.tags) ? parsed.tags : [];
    const tags = Array.from(
      new Set(
        tagsIn
          .map((t: unknown) => normalizeTag(String(t)))
          .map((t: string) => t.toLocaleLowerCase())
          .filter(Boolean),
      ),
    ).slice(0, 20);

    return json(200, { tags });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg.toLowerCase().includes("unauthorized")) return json(401, { error: "Não autenticado" });
    return json(500, { error: msg });
  }
});
