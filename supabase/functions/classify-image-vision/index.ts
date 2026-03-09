import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { classifyImageWithVision } from "../_shared/ai-vision.ts";
import { assertAdmin, getClaims } from "../_shared/supabase.ts";
import { checkRateLimit, RATE_LIMITS } from "../_shared/rate-limit.ts";

type VisionModel = "gpt-4o-mini" | "gpt-4o";

function parseVisionModel(input: unknown): VisionModel {
  const v = String(input ?? "").trim();
  return v === "gpt-4o" ? "gpt-4o" : "gpt-4o-mini";
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
    await assertAdmin(req);
    const { client } = await getClaims(req);

    const body = await req.json().catch(() => ({}));
    const queueId = String(body?.queue_id ?? "").trim();
    const model = parseVisionModel(body?.model);

    if (!queueId) {
      return new Response(JSON.stringify({ error: "queue_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch image from queue
    const { data: queueItem, error: queueErr } = await client
      .from("images_queue")
      .select("id,storage_bucket,storage_path,image_hash,original_filename")
      .eq("id", queueId)
      .maybeSingle();

    if (queueErr) throw queueErr;
    if (!queueItem) {
      return new Response(JSON.stringify({ error: "Queue item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check cache by image hash
    if (queueItem.image_hash) {
      const { data: cached, error: cacheErr } = await client
        .from("ai_vision_cache")
        .select("name,franchise,category,subcategory,tags,confidence,model")
        .eq("image_hash", queueItem.image_hash)
        .maybeSingle();

      if (cacheErr) throw cacheErr;

      if (cached) {
        // Update queue with cached result
        await client
          .from("images_queue")
          .update({
            ai_suggested_name: cached.name,
            ai_confidence: cached.confidence,
            ai_model_used: cached.model,
          })
          .eq("id", queueId);

        return new Response(
          JSON.stringify({
            name: cached.name,
            franchise: cached.franchise,
            category: cached.category,
            subcategory: cached.subcategory,
            tags: cached.tags ?? [],
            confidence: cached.confidence,
            model: cached.model,
            fromCache: true,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Generate public URL for the image
    const bucket = queueItem.storage_bucket || "product-images";
    const { data: urlData } = await client.storage
      .from(bucket)
      .createSignedUrl(queueItem.storage_path, 3600);

    if (!urlData?.signedUrl) {
      throw new Error("Failed to generate image URL");
    }

    // Fetch franchise rules in a fault-tolerant way
    // If the table doesn't exist or RLS blocks access, we log and continue without rules
    let franchiseRules: FranchiseRuleRow[] = [];
    try {
      const { data: rules } = await client
        .from("franchise_rules")
        .select("pattern,franchise_canonical,priority,enabled")
        .eq("enabled", true)
        .order("priority", { ascending: true })
        .limit(500);
      franchiseRules = (rules ?? []) as FranchiseRuleRow[];
    } catch (rulesErr) {
      console.error("Error fetching franchise_rules in classify-image-vision (ignoring):", rulesErr);
      // Continue without rules
      franchiseRules = [];
    }

    // Call AI Vision with current name as context
    const currentName = queueItem.original_filename || "";
    const result = await classifyImageWithVision(urlData.signedUrl, model, currentName);

    // Apply franchise rules if name matches
    const franchiseFromRule = applyFranchiseRules(result.name, franchiseRules);
    const finalResult = franchiseFromRule ? { ...result, franchise: franchiseFromRule } : result;

    // Save to cache
    if (queueItem.image_hash) {
      await client.from("ai_vision_cache").upsert(
        {
          image_hash: queueItem.image_hash,
          name: finalResult.name,
          franchise: finalResult.franchise,
          category: finalResult.category,
          subcategory: finalResult.subcategory,
          tags: finalResult.tags,
          confidence: finalResult.confidence,
          model,
          cost_usd: finalResult.costUsd,
        },
        { onConflict: "image_hash" },
      );
    }

    // Update queue with AI result
    await client
      .from("images_queue")
      .update({
        ai_suggested_name: finalResult.name,
        ai_confidence: finalResult.confidence,
        ai_model_used: model,
      })
      .eq("id", queueId);

    return new Response(
      JSON.stringify({
        ...finalResult,
        model,
        fromCache: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden") ? 403 : msg === "Unauthorized" ? 401 : 500;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
