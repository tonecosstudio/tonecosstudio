import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";

/**
 * Bulk Assign Tier Endpoint
 *
 * Atribui múltiplas coleções a um nível de preço em massa.
 * Chama a função do banco de dados assign_collection_to_tier para cada coleção.
 *
 * Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 * Tarefa: 6.3
 *
 * Request Body:
 * {
 *   collection_ids: string[]; // Array de UUIDs das coleções
 *   tier_id: string; // UUID do nível
 * }
 *
 * Response:
 * {
 *   ok: true;
 *   success: string[]; // IDs das coleções atribuídas com sucesso
 *   failed: Array<{
 *     id: string;
 *     error: string;
 *   }>;
 * }
 *
 * Errors:
 * - 401: Unauthorized (no valid JWT)
 * - 403: Forbidden (not admin)
 * - 400: Bad Request (validation errors)
 * - 404: Not Found (tier doesn't exist or is inactive)
 * - 500: Internal Server Error
 */

interface FailedAssignment {
  id: string;
  error: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Validate admin authorization
    const { userId } = await assertAdmin(req);
    const service = getServiceClient();

    // Parse and validate request body
    const body = await req.json().catch(() => ({}));

    // Validate required fields
    const tier_id = String(body?.tier_id ?? "").trim();
    if (!tier_id) {
      return new Response(
        JSON.stringify({ ok: false, error: "tier_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate UUID format for tier_id
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tier_id)) {
      return new Response(
        JSON.stringify({ ok: false, error: "tier_id must be a valid UUID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate collection_ids array
    if (
      !Array.isArray(body?.collection_ids) ||
      body.collection_ids.length === 0
    ) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "collection_ids must be a non-empty array",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const collection_ids = body.collection_ids.map((id: any) =>
      String(id).trim(),
    );

    // Validate all collection IDs are UUIDs
    for (const id of collection_ids) {
      if (!uuidRegex.test(id)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: `Invalid UUID in collection_ids: ${id}`,
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Check if tier exists and is active
    const { data: tier, error: tierError } = await service
      .from("pricing_tiers")
      .select("id, name, is_active")
      .eq("id", tier_id)
      .maybeSingle();

    if (tierError) {
      throw new Error(`Failed to fetch tier: ${tierError.message}`);
    }

    if (!tier) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Pricing tier with id '${tier_id}' not found`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!tier.is_active) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `Pricing tier '${tier.name}' is not active`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `Bulk assigning ${collection_ids.length} collections to tier: ${tier.name} (${tier.id})`,
    );

    // Process each collection assignment
    const success: string[] = [];
    const failed: FailedAssignment[] = [];

    for (const collection_id of collection_ids) {
      try {
        // Call database function to assign collection to tier
        const { error: assignError } = await service.rpc(
          "assign_collection_to_tier",
          {
            p_collection_id: collection_id,
            p_tier_id: tier_id,
            p_assigned_by: userId,
          },
        );

        if (assignError) {
          failed.push({
            id: collection_id,
            error: "Assignment failed",
          });
          console.error(
            `Failed to assign collection ${collection_id}:`,
            assignError.message,
          );
        } else {
          success.push(collection_id);
          console.log(`Successfully assigned collection ${collection_id}`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        failed.push({
          id: collection_id,
          error: "Assignment failed",
        });
        console.error(`Exception assigning collection ${collection_id}:`, msg);
      }
    }

    console.log(
      `Bulk assignment complete: ${success.length} succeeded, ${failed.length} failed`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        success,
        failed,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden")
      ? 403
      : msg === "Unauthorized"
        ? 401
        : 500;

    console.error("Error in bulk assign tier:", msg);

    return new Response(JSON.stringify({ ok: false, error: status >= 500 ? "Internal server error" : msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
