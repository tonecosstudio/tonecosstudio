import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";

/**
 * Admin Deactivate Collection Endpoint
 * 
 * Deactivates a collection (soft delete) by setting is_active = false.
 * Prevents deactivation if the collection has active deliveries.
 * 
 * Requirements: 14.7, 14.8
 * Task: 20.5
 * 
 * Request Body:
 * {
 *   id: string; // Collection ID to deactivate
 * }
 * 
 * Response:
 * {
 *   ok: true;
 *   collection: Collection;
 * }
 * 
 * Errors:
 * - 401: Unauthorized (no valid JWT)
 * - 403: Forbidden (not admin)
 * - 400: Bad Request (validation errors or has active deliveries)
 * - 404: Not Found (collection doesn't exist)
 * - 500: Internal Server Error
 */

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
    
    // Validate required ID field
    const id = String(body?.id ?? "").trim();
    if (!id) {
      return new Response(
        JSON.stringify({ ok: false, error: "id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if collection exists
    const { data: existingCollection, error: fetchError } = await service
      .from("collections")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch collection: ${fetchError.message}`);
    }

    if (!existingCollection) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Collection with id '${id}' not found` 
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if collection is already inactive
    if (!existingCollection.is_active) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "Collection is already inactive" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if collection has active deliveries
    // Active deliveries are those with status: scheduled, pending_choice, confirmed, in_production, or shipped
    const { data: activeDeliveries, error: deliveriesError } = await service
      .from("subscription_deliveries")
      .select("id, status")
      .eq("collection_id", id)
      .in("status", ["scheduled", "pending_choice", "confirmed", "in_production", "shipped"]);

    if (deliveriesError) {
      throw new Error(`Failed to check active deliveries: ${deliveriesError.message}`);
    }

    if (activeDeliveries && activeDeliveries.length > 0) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Cannot deactivate collection: ${activeDeliveries.length} active delivery(ies) found. Please wait until all deliveries are completed or cancelled.`,
          activeDeliveriesCount: activeDeliveries.length
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deactivate collection by setting is_active = false
    const { data: collection, error: updateError } = await service
      .from("collections")
      .update({ is_active: false })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to deactivate collection: ${updateError.message}`);
    }

    console.log(`Collection deactivated successfully: ${collection.id} (${collection.name})`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        collection 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden") ? 403 : msg === "Unauthorized" ? 401 : 500;
    
    console.error("Error deactivating collection:", msg);
    
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
