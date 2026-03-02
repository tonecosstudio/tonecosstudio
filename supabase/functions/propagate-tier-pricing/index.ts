import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";

/**
 * Propagate Tier Pricing Endpoint
 * 
 * Propaga mudanças de preço de um nível para todas as coleções atribuídas.
 * Chama a função do banco de dados propagate_tier_prices.
 * 
 * Requisitos: 3.1, 3.2, 3.3, 3.4, 3.6, 3.7, 12.8
 * Tarefa: 6.1
 * 
 * Request Body:
 * {
 *   tierId: string; // UUID do nível
 * }
 * 
 * Response:
 * {
 *   ok: true;
 *   updated_count: number;
 *   failed_count: number;
 *   results: Array<{
 *     collection_id: string;
 *     old_price: number;
 *     new_price: number;
 *     success: boolean;
 *     error_message?: string;
 *   }>;
 * }
 * 
 * Errors:
 * - 401: Unauthorized (no valid JWT)
 * - 403: Forbidden (not admin)
 * - 400: Bad Request (validation errors)
 * - 404: Not Found (tier doesn't exist)
 * - 500: Internal Server Error
 */

interface PropagateTierPricingRequest {
  tierId: string;
}

interface PropagationResult {
  collection_id: string;
  old_price: number;
  new_price: number;
  success: boolean;
  error_message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Validate admin authorization
    await assertAdmin(req);
    const service = getServiceClient();

    // Parse and validate request body
    const body = await req.json().catch(() => ({}));
    
    // Validate required tierId field
    const tierId = String(body?.tierId ?? "").trim();
    if (!tierId) {
      return new Response(
        JSON.stringify({ ok: false, error: "tierId is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tierId)) {
      return new Response(
        JSON.stringify({ ok: false, error: "tierId must be a valid UUID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if tier exists
    const { data: tier, error: tierError } = await service
      .from("pricing_tiers")
      .select("id, name")
      .eq("id", tierId)
      .maybeSingle();

    if (tierError) {
      throw new Error(`Failed to fetch tier: ${tierError.message}`);
    }

    if (!tier) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Pricing tier with id '${tierId}' not found` 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Propagating prices for tier: ${tier.name} (${tier.id})`);

    // Call database function to propagate prices
    const { data: results, error: propagateError } = await service
      .rpc("propagate_tier_prices", { p_tier_id: tierId });

    if (propagateError) {
      throw new Error(`Failed to propagate prices: ${propagateError.message}`);
    }

    // Process results
    const propagationResults = results as PropagationResult[];
    const updated_count = propagationResults.filter(r => r.success).length;
    const failed_count = propagationResults.filter(r => !r.success).length;

    console.log(`Propagation complete: ${updated_count} succeeded, ${failed_count} failed`);

    return new Response(
      JSON.stringify({ 
        ok: true,
        updated_count,
        failed_count,
        results: propagationResults
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden") ? 403 : msg === "Unauthorized" ? 401 : 500;
    
    console.error("Error propagating tier pricing:", msg);
    
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
