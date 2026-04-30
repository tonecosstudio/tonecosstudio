import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";

/**
 * Admin Update Collection Endpoint
 *
 * Updates an existing collection with all fields including rotation settings,
 * character revelation configuration, and image updates.
 *
 * Requirements: 14.6
 * Task: 20.4
 *
 * Request Body:
 * {
 *   id: string; // Collection ID to update
 *   name?: string;
 *   description?: string;
 *   slug?: string;
 *   image_url?: string;
 *   rotation_type?: 'fixed' | 'odd_months' | 'even_months';
 *   character_revelation_date?: string | null; // ISO 8601 format
 *   character_name?: string | null;
 *   character_image_url?: string | null;
 *   revealed?: boolean;
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
        },
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
          error: `Collection with id '${id}' not found`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Prepare update data - only include fields that are provided
    const updateData: any = {};

    // String fields
    if (body?.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return new Response(
          JSON.stringify({ ok: false, error: "name cannot be empty" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      updateData.name = name;
    }

    if (body?.description !== undefined) {
      updateData.description = String(body.description).trim();
    }

    if (body?.slug !== undefined) {
      const slug = String(body.slug).trim();
      if (!slug) {
        return new Response(
          JSON.stringify({ ok: false, error: "slug cannot be empty" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // Check if slug is already used by another collection
      if (slug !== existingCollection.slug) {
        const { data: slugCheck, error: slugError } = await service
          .from("collections")
          .select("id")
          .eq("slug", slug)
          .neq("id", id)
          .maybeSingle();

        if (slugError) {
          throw new Error(
            `Failed to check slug uniqueness: ${slugError.message}`,
          );
        }

        if (slugCheck) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: `Collection with slug '${slug}' already exists`,
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      updateData.slug = slug;
    }

    // Image URL
    if (body?.image_url !== undefined) {
      updateData.image_url = body.image_url
        ? String(body.image_url).trim()
        : null;
    }

    // Rotation type
    if (body?.rotation_type !== undefined) {
      const rotation_type = String(body.rotation_type).trim();
      if (!["fixed", "odd_months", "even_months"].includes(rotation_type)) {
        return new Response(
          JSON.stringify({
            ok: false,
            error:
              "rotation_type must be 'fixed', 'odd_months', or 'even_months'",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      updateData.rotation_type = rotation_type;
    }

    // Character revelation date
    if (body?.character_revelation_date !== undefined) {
      if (body.character_revelation_date === null) {
        updateData.character_revelation_date = null;
      } else {
        const revelationDate = new Date(body.character_revelation_date);
        if (isNaN(revelationDate.getTime())) {
          return new Response(
            JSON.stringify({
              ok: false,
              error:
                "character_revelation_date must be a valid ISO 8601 date or null",
            }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        updateData.character_revelation_date = revelationDate.toISOString();
      }
    }

    // Character name
    if (body?.character_name !== undefined) {
      updateData.character_name = body.character_name
        ? String(body.character_name).trim()
        : null;
    }

    // Character image URL
    if (body?.character_image_url !== undefined) {
      updateData.character_image_url = body.character_image_url
        ? String(body.character_image_url).trim()
        : null;
    }

    // Revealed flag
    if (body?.revealed !== undefined) {
      updateData.revealed = Boolean(body.revealed);
    }

    // Active flag
    if (body?.is_active !== undefined) {
      updateData.is_active = Boolean(body.is_active);
    }

    // Display order
    if (body?.display_order !== undefined) {
      updateData.display_order = Number(body.display_order);
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "No fields provided to update",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Update collection record
    const { data: collection, error: updateError } = await service
      .from("collections")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update collection: ${updateError.message}`);
    }

    console.log(
      `Collection updated successfully: ${collection.id} (${collection.name})`,
    );

    return new Response(
      JSON.stringify({
        ok: true,
        collection,
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

    console.error("Error updating collection:", msg);

    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
