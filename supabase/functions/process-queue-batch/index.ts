import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { classifyImageWithVision } from "../_shared/ai-vision.ts";
import { assertAdmin, getClaims } from "../_shared/supabase.ts";

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

async function processImage(
  client: any,
  queueItem: any,
  rules: FranchiseRuleRow[],
  model: VisionModel,
) {
  try {
    // Check cache first
    if (queueItem.image_hash) {
      const { data: cached } = await client
        .from("ai_vision_cache")
        .select("name,franchise,category,subcategory,tags,confidence,model")
        .eq("image_hash", queueItem.image_hash)
        .maybeSingle();

      if (cached) {
        await client
          .from("images_queue")
          .update({
            ai_suggested_name: cached.name,
            ai_confidence: cached.confidence,
            ai_model_used: cached.model,
          })
          .eq("id", queueItem.id);

        return { success: true, fromCache: true, queueId: queueItem.id };
      }
    }

    // Generate public URL
    const bucket = queueItem.storage_bucket || "product-images";
    const { data: urlData } = await client.storage
      .from(bucket)
      .createSignedUrl(queueItem.storage_path, 3600);

    if (!urlData?.signedUrl) {
      throw new Error("Failed to generate image URL");
    }

    // Call AI Vision
    const result = await classifyImageWithVision(urlData.signedUrl, model);

    // Apply franchise rules
    const franchiseFromRule = applyFranchiseRules(result.name, rules);
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

    // Update queue
    await client
      .from("images_queue")
      .update({
        ai_suggested_name: finalResult.name,
        ai_confidence: finalResult.confidence,
        ai_model_used: model,
      })
      .eq("id", queueItem.id);

    return { success: true, fromCache: false, queueId: queueItem.id, cost: finalResult.costUsd };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return { success: false, queueId: queueItem.id, error: msg };
  }
}

serve(async (req) => {
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    await assertAdmin(req);
    const { client } = await getClaims(req);

    const body = await req.json().catch(() => ({}));
    const batchSize = Math.min(Math.max(Number(body?.batch_size ?? 10), 1), 50);
    const model = parseVisionModel(body?.model);
    const maxConcurrent = 5;

    // Fetch pending images
    const { data: queueItems, error: queueErr } = await client
      .from("images_queue")
      .select("id,storage_bucket,storage_path,image_hash")
      .is("ai_suggested_name", null)
      .order("created_at", { ascending: true })
      .limit(batchSize);

    if (queueErr) throw queueErr;

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending images to process", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Create processing job
    const { data: job, error: jobErr } = await client
      .from("ai_processing_jobs")
      .insert({
        total_images: queueItems.length,
        processed_images: 0,
        failed_images: 0,
        status: "processing",
        model_used: model,
      })
      .select()
      .single();

    if (jobErr) throw jobErr;

    // Fetch franchise rules once
    const { data: rules, error: rulesErr } = await client
      .from("franchise_rules")
      .select("pattern,franchise_canonical,priority,enabled")
      .eq("enabled", true)
      .order("priority", { ascending: true })
      .limit(500);

    if (rulesErr) throw rulesErr;

    // Process images in parallel batches
    const results = [];
    let totalCost = 0;
    let processed = 0;
    let failed = 0;

    for (let i = 0; i < queueItems.length; i += maxConcurrent) {
      const batch = queueItems.slice(i, i + maxConcurrent);
      const promises = batch.map((item) =>
        processImage(client, item, (rules ?? []) as FranchiseRuleRow[], model)
      );

      const batchResults = await Promise.all(promises);
      results.push(...batchResults);

      // Update job progress
      for (const result of batchResults) {
        if (result.success) {
          processed++;
          if (result.cost) totalCost += result.cost;
        } else {
          failed++;
        }
      }

      await client
        .from("ai_processing_jobs")
        .update({
          processed_images: processed,
          failed_images: failed,
          total_cost_usd: totalCost,
        })
        .eq("id", job.id);
    }

    // Mark job as completed
    await client
      .from("ai_processing_jobs")
      .update({
        status: failed === queueItems.length ? "failed" : "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    return new Response(
      JSON.stringify({
        jobId: job.id,
        total: queueItems.length,
        processed,
        failed,
        totalCost,
        results,
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
