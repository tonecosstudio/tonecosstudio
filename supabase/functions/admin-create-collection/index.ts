import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";

/**
 * Admin Create Collection Endpoint
 * 
 * Creates a new collection with all required fields including rotation settings,
 * character revelation configuration, and image uploads.
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5
 * Task: 20.3
 * 
 * Request Body:
 * {
 *   name: string;
 *   description: string;
 *   slug: string;
 *   image_url?: string;
 *   rotation_type: 'fixed' | 'odd_months' | 'even_months';
 *   character_revelation_date?: string; // ISO 8601 format
 *   character_name?: string;
 *   character_image_url?: string;
 *   is_active?: boolean;
 *   display_order?: number;
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
 * - 400: Bad Request (validation errors)
 * - 500: Internal Server Error
 */

interface CreateCollectionRequest {
  name: string;
  description: string;
  slug: string;
  image_url?: string;
  rotation_type: 'fixed' | 'odd_months' | 'even_months';
  character_revelation_date?: string;
  character_name?: string;
  character_image_url?: string;
  is_active?: boolean;
  display_order?: number;
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
    
    // Validate required fields
    const name = String(body?.name ?? "").trim();
    const description = String(body?.description ?? "").trim();
    const slug = String(body?.slug ?? "").trim();
    const rotation_type = String(body?.rotation_type ?? "fixed").trim();

    if (!name) {
      return new Response(
        JSON.stringify({ ok: false, error: "name is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!description) {
      return new Response(
        JSON.stringify({ ok: false, error: "description is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!slug) {
      return new Response(
        JSON.stringify({ ok: false, error: "slug is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate rotation_type
    if (!['fixed', 'odd_months', 'even_months'].includes(rotation_type)) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: "rotation_type must be 'fixed', 'odd_months', or 'even_months'" 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if slug already exists
    const { data: existingCollection, error: checkError } = await service
      .from("collections")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Failed to check existing collection: ${checkError.message}`);
    }

    if (existingCollection) {
      return new Response(
        JSON.stringify({ 
          ok: false, 
          error: `Collection with slug '${slug}' already exists` 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Prepare collection data
    const collectionData: any = {
      name,
      description,
      slug,
      rotation_type,
      is_active: body?.is_active !== undefined ? Boolean(body.is_active) : true,
      display_order: body?.display_order !== undefined ? Number(body.display_order) : 0,
      revealed: false, // New collections start unrevealed
    };

    // Add optional fields if provided
    if (body?.image_url) {
      collectionData.image_url = String(body.image_url).trim();
    }

    if (body?.character_revelation_date) {
      // Validate ISO 8601 date format
      const revelationDate = new Date(body.character_revelation_date);
      if (isNaN(revelationDate.getTime())) {
        return new Response(
          JSON.stringify({ 
            ok: false, 
            error: "character_revelation_date must be a valid ISO 8601 date" 
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      collectionData.character_revelation_date = revelationDate.toISOString();
    }

    if (body?.character_name) {
      collectionData.character_name = String(body.character_name).trim();
    }

    if (body?.character_image_url) {
      collectionData.character_image_url = String(body.character_image_url).trim();
    }

    // Insert collection record
    const { data: collection, error: insertError } = await service
      .from("collections")
      .insert(collectionData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to create collection: ${insertError.message}`);
    }

    console.log(`Collection created successfully: ${collection.id} (${collection.name})`);

    return new Response(
      JSON.stringify({ 
        ok: true, 
        collection 
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg.startsWith("Forbidden") ? 403 : msg === "Unauthorized" ? 401 : 500;
    
    console.error("Error creating collection:", msg);
    
    return new Response(
      JSON.stringify({ ok: false, error: msg }),
      {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
