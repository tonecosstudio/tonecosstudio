import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertRateLimitedAdmin } from "../_shared/admin-rate-limit.ts";
import { getServiceClient } from "../_shared/supabase.ts";

/**
 * Migrate to Tiers Endpoint
 *
 * Analisa preços existentes e migra coleções para o sistema de níveis.
 * Pode executar em modo dry-run (apenas análise) ou modo real (executa migração).
 *
 * Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 * Tarefa: 6.5
 *
 * Request Body:
 * {
 *   dryRun: boolean; // Se true, apenas analisa sem modificar dados
 *   autoCreateTiers: boolean; // Se true, cria níveis automaticamente baseado na análise
 * }
 *
 * Response (dry run):
 * {
 *   ok: true;
 *   dryRun: true;
 *   suggestions: Array<{
 *     price_full: number;
 *     price_pix: number;
 *     deposit_amount: number;
 *     collection_count: number;
 *     collection_ids: string[];
 *     suggested_tier_name: string;
 *   }>;
 * }
 *
 * Response (real migration):
 * {
 *   ok: true;
 *   dryRun: false;
 *   tiersCreated: number;
 *   collectionsAssigned: number;
 *   errors: string[];
 * }
 *
 * Errors:
 * - 401: Unauthorized (no valid JWT)
 * - 403: Forbidden (not admin)
 * - 400: Bad Request (validation errors)
 * - 500: Internal Server Error
 */

interface MigrationSuggestion {
  price_full: number;
  price_pix: number;
  deposit_amount: number;
  collection_count: number;
  collection_ids: string[];
  suggested_tier_name: string;
}

serve(async (req) => {
  // Handle CORS preflight
  const opt = handleOptions(req);
  if (opt) return opt;

  try {
    // Validate admin authorization
    const admin = await assertRateLimitedAdmin(req, "migrate-to-tiers");
    if (admin.rateLimited) return admin.rateLimited;

    const { userId } = admin;
    const service = getServiceClient();

    // Parse and validate request body
    const body = await req.json().catch(() => ({}));

    const dryRun = Boolean(body?.dryRun ?? true); // Default to dry run for safety
    const autoCreateTiers = Boolean(body?.autoCreateTiers ?? true);

    console.log(
      `Migration mode: ${dryRun ? "DRY RUN" : "REAL"}, autoCreateTiers: ${autoCreateTiers}`,
    );

    // Call database function to analyze pricing
    const { data: suggestions, error: analyzeError } = await service.rpc(
      "analyze_pricing_for_migration",
    );

    if (analyzeError) {
      throw new Error(`Failed to analyze pricing: ${analyzeError.message}`);
    }

    const migrationSuggestions = suggestions as MigrationSuggestion[];

    console.log(
      `Analysis complete: ${migrationSuggestions.length} unique price groups found`,
    );

    // If dry run, return suggestions without modifying data
    if (dryRun) {
      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: true,
          suggestions: migrationSuggestions,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Real migration - create tiers and assign collections
    const migrationStartTime = new Date().toISOString();
    let tiersCreated = 0;
    let collectionsAssigned = 0;
    const errors: string[] = [];
    const createdTierIds: string[] = [];

    try {
      // Start migration audit record
      const { data: auditRecord, error: auditError } = await service
        .from("migration_audit")
        .insert({
          migration_type: "initial_migration",
          collections_affected: migrationSuggestions.reduce(
            (sum, s) => sum + s.collection_count,
            0,
          ),
          tiers_created: 0,
          started_at: migrationStartTime,
          status: "in_progress",
          executed_by: userId,
          migration_data: { suggestions: migrationSuggestions },
        })
        .select()
        .single();

      if (auditError) {
        throw new Error(
          `Failed to create migration audit record: ${auditError.message}`,
        );
      }

      const auditId = auditRecord.id;

      // Process each price group
      for (const suggestion of migrationSuggestions) {
        try {
          if (autoCreateTiers) {
            // Create tier for this price group
            const { data: tier, error: tierError } = await service.rpc(
              "create_pricing_tier",
              {
                p_name: suggestion.suggested_tier_name,
                p_description: `Criado automaticamente durante migração - ${suggestion.collection_count} coleções`,
                p_price_full: suggestion.price_full,
                p_deposit_amount: suggestion.deposit_amount,
                p_pix_discount_percentage: 5, // Default 5% discount
                p_is_default: false,
                p_created_by: userId,
              },
            );

            if (tierError) {
              errors.push(
                `Failed to create tier '${suggestion.suggested_tier_name}': ${tierError.message}`,
              );
              console.error(`Failed to create tier:`, tierError);
              continue;
            }

            const tierId = tier;
            createdTierIds.push(tierId);
            tiersCreated++;

            console.log(
              `Created tier: ${suggestion.suggested_tier_name} (${tierId})`,
            );

            // Assign collections to this tier
            for (const collectionId of suggestion.collection_ids) {
              try {
                const { error: assignError } = await service.rpc(
                  "assign_collection_to_tier",
                  {
                    p_collection_id: collectionId,
                    p_tier_id: tierId,
                    p_assigned_by: userId,
                  },
                );

                if (assignError) {
                  errors.push(
                    `Failed to assign collection ${collectionId} to tier ${tierId}: ${assignError.message}`,
                  );
                  console.error(`Failed to assign collection:`, assignError);
                } else {
                  collectionsAssigned++;
                }
              } catch (e) {
                const msg = e instanceof Error ? e.message : "Unknown error";
                errors.push(
                  `Exception assigning collection ${collectionId}: ${msg}`,
                );
                console.error(`Exception assigning collection:`, msg);
              }
            }
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Unknown error";
          errors.push(`Exception processing price group: ${msg}`);
          console.error(`Exception processing price group:`, msg);
        }
      }

      // Update migration audit record
      const migrationStatus =
        errors.length === 0 ? "completed" : "completed_with_errors";
      await service
        .from("migration_audit")
        .update({
          tiers_created: tiersCreated,
          completed_at: new Date().toISOString(),
          status: migrationStatus,
          error_message: errors.length > 0 ? errors.join("; ") : null,
          migration_data: {
            suggestions: migrationSuggestions,
            created_tier_ids: createdTierIds,
            collections_assigned: collectionsAssigned,
          },
        })
        .eq("id", auditId);

      console.log(
        `Migration complete: ${tiersCreated} tiers created, ${collectionsAssigned} collections assigned, ${errors.length} errors`,
      );

      return new Response(
        JSON.stringify({
          ok: true,
          dryRun: false,
          tiersCreated,
          collectionsAssigned,
          errors,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";

      // Try to update audit record with failure
      try {
        await service
          .from("migration_audit")
          .update({
            completed_at: new Date().toISOString(),
            status: "failed",
            error_message: msg,
          })
          .eq("started_at", migrationStartTime)
          .eq("executed_by", userId);
      } catch (auditUpdateError) {
        console.error("Failed to update audit record:", auditUpdateError);
      }

      throw e;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden")
      ? 403
      : msg === "Unauthorized"
        ? 401
        : 500;

    console.error("Error in migrate-to-tiers:", msg);

    return new Response(
      JSON.stringify({
        ok: false,
        error: status >= 500 ? "Internal server error" : msg,
      }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
