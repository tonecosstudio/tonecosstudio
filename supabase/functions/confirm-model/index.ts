import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { classifyNameWithAI } from "../_shared/ai.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";

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

function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    const { userId } = await assertAdmin(req);
    const service = getServiceClient();

    const body = await req.json().catch(() => ({}));
    const queueId = String(body?.queueId ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const franchiseOverride = body?.franchiseOverride ? String(body.franchiseOverride).trim() : "";

    if (!queueId || !name) {
      return new Response(JSON.stringify({ ok: false, error: "queueId and name are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: queueRow, error: qErr } = await service
      .from("images_queue")
      .select("id,storage_bucket,storage_path,status")
      .eq("id", queueId)
      .maybeSingle();
    if (qErr) throw qErr;
    if (!queueRow) return new Response(JSON.stringify({ ok: false, error: "queue item not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    // Get cached classification if possible
    const { data: cached } = await service
      .from("ai_name_cache")
      .select("name,franchise,category,subcategory,tags")
      .eq("name", name)
      .maybeSingle();

    // Fetch rules (admin) and apply before IA (and also useful as fallback)
    let franchiseFromRule = null;
    try {
      const { data: rules } = await service
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

    const aiBase = cached
      ? {
          franchise: cached.franchise as string | null,
          category: cached.category as string | null,
          subcategory: cached.subcategory as string | null,
          tags: (cached.tags as string[] | null) ?? [],
        }
      : await classifyNameWithAI(name);

    const ai = {
      ...aiBase,
      franchise:
        franchiseOverride || franchiseFromRule || (aiBase.franchise?.trim() ? aiBase.franchise.trim() : null),
    };

    if (!cached) {
      await service.from("ai_name_cache").upsert(
        { name, franchise: ai.franchise, category: ai.category, subcategory: ai.subcategory, tags: ai.tags, model: modelForCache() },
        { onConflict: "name" },
      );
    }

    // Se o admin confirmou manualmente uma franquia, salva regra automática
    // (para a próxima vez sugerir/aplicar sem depender da IA).
    if (franchiseOverride) {
      try {
        await service.from("franchise_rules").insert({
          created_by: userId,
          pattern: name,
          franchise_canonical: franchiseOverride,
          enabled: true,
          priority: 50,
          note: "auto: confirmado na esteira",
        });
      } catch (insertRuleErr) {
        console.error("Error inserting franchise_rule (ignoring):", insertRuleErr);
        // Ignora erro e continua
      }
    }

    // "Mapa fixo" que aprende: upsert canonical e adiciona alias se necessário
    const franchise = ai.franchise?.trim() || null;
    if (franchise) {
      const canonical = franchise; // mantém o que a IA sugeriu como canônico por enquanto
      const { data: existing } = await service.from("franchises").select("id,canonical,aliases").eq("canonical", canonical).maybeSingle();
      if (!existing) {
        await service.from("franchises").insert({ canonical, aliases: [franchise] });
      } else {
        const aliases = Array.isArray(existing.aliases) ? (existing.aliases as string[]) : [];
        if (!aliases.includes(franchise)) {
          await service.from("franchises").update({ aliases: [...aliases, franchise] }).eq("id", existing.id);
        }
      }
    }

    const ext = queueRow.storage_path.split(".").pop()?.toLowerCase() || "bin";
    const cat = slugify(ai.category || "uncategorized") || "uncategorized";
    const sub = slugify(ai.subcategory || "misc") || "misc";
    const nameSlug = slugify(name).replace(/^-+|-+$/g, "");
    const newPath = `catalog/${cat}/${sub}/${nameSlug}.${ext}`;

    // Copy file instead of move (more reliable)
    console.log("Copying image:", queueRow.storage_path, "->", newPath);
    const { error: copyErr } = await service.storage.from(queueRow.storage_bucket).copy(queueRow.storage_path, newPath);
    if (copyErr) throw new Error(`Storage copy failed: ${copyErr.message}`);

    // Delete original image
    console.log("Deleting original image:", queueRow.storage_path);
    await service.storage.from(queueRow.storage_bucket).remove([queueRow.storage_path]);

    // create model
    console.log("Creating model:", { name, franchise, category: ai.category, subcategory: ai.subcategory, tags: ai.tags });
    const { error: mErr } = await service.from("models").insert({
      created_by: userId,
      name,
      franchise: franchise,
      category: ai.category,
      subcategory: ai.subcategory,
      tags: ai.tags,
      image_bucket: queueRow.storage_bucket,
      image_path: newPath,
    });
    if (mErr) {
      console.error("Error creating model:", mErr);
      throw mErr;
    }
    console.log("Model created successfully");

    // update queue
    const { error: uErr } = await service.from("images_queue").update({
      status: "processed",
      name,
      franchise,
      category: ai.category,
      subcategory: ai.subcategory,
      tags: ai.tags,
      last_error: null,
    }).eq("id", queueId);
    if (uErr) throw uErr;

    return new Response(JSON.stringify({ ok: true, newPath }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden") ? 403 : msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
