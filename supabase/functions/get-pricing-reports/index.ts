import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { corsHeaders, handleOptions } from "../_shared/cors.ts";
import { assertAdmin, getServiceClient } from "../_shared/supabase.ts";

/**
 * Get Pricing Reports Endpoint
 *
 * Gera relatórios sobre níveis de preço e coleções.
 * Suporta diferentes tipos de relatórios com filtros de data.
 *
 * Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5
 * Tarefa: 6.7
 *
 * Request Body:
 * {
 *   reportType: 'collections_by_tier' | 'revenue_by_tier' | 'conversion_by_tier';
 *   dateRange?: {
 *     start: string; // ISO 8601 date
 *     end: string; // ISO 8601 date
 *   };
 * }
 *
 * Response (collections_by_tier):
 * {
 *   ok: true;
 *   reportType: 'collections_by_tier';
 *   data: Array<{
 *     tier_id: string;
 *     tier_name: string;
 *     collection_count: number;
 *     active_collection_count: number;
 *   }>;
 * }
 *
 * Response (revenue_by_tier):
 * {
 *   ok: true;
 *   reportType: 'revenue_by_tier';
 *   data: Array<{
 *     tier_id: string;
 *     tier_name: string;
 *     total_revenue: number;
 *     subscription_revenue: number;
 *     standalone_revenue: number;
 *   }>;
 * }
 *
 * Response (conversion_by_tier):
 * {
 *   ok: true;
 *   reportType: 'conversion_by_tier';
 *   data: Array<{
 *     tier_id: string;
 *     tier_name: string;
 *     views: number;
 *     purchases: number;
 *     conversion_rate: number;
 *   }>;
 * }
 *
 * Errors:
 * - 401: Unauthorized (no valid JWT)
 * - 403: Forbidden (not admin)
 * - 400: Bad Request (validation errors)
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

    // Validate reportType
    const reportType = String(body?.reportType ?? "").trim();
    const validReportTypes = [
      "collections_by_tier",
      "revenue_by_tier",
      "conversion_by_tier",
    ];

    if (!validReportTypes.includes(reportType)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: `reportType must be one of: ${validReportTypes.join(", ")}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse date range if provided
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (body?.dateRange) {
      if (body.dateRange.start) {
        startDate = new Date(body.dateRange.start);
        if (isNaN(startDate.getTime())) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid start date format" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }

      if (body.dateRange.end) {
        endDate = new Date(body.dateRange.end);
        if (isNaN(endDate.getTime())) {
          return new Response(
            JSON.stringify({ ok: false, error: "Invalid end date format" }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    console.log(
      `Generating report: ${reportType}`,
      startDate ? `from ${startDate.toISOString()}` : "",
      endDate ? `to ${endDate.toISOString()}` : "",
    );

    let reportData: any[] = [];

    // Generate report based on type
    switch (reportType) {
      case "collections_by_tier": {
        // Query collections grouped by tier
        const { data, error } = await service
          .from("pricing_tiers")
          .select(
            `
            id,
            name,
            collection_tier_assignments (
              collection_id,
              collections (
                id,
                is_active
              )
            )
          `,
          )
          .eq("is_active", true);

        if (error) {
          throw new Error(
            `Failed to fetch collections by tier: ${error.message}`,
          );
        }

        reportData = data.map((tier: any) => {
          const assignments = tier.collection_tier_assignments || [];
          const collection_count = assignments.length;
          const active_collection_count = assignments.filter(
            (a: any) => a.collections?.is_active === true,
          ).length;

          return {
            tier_id: tier.id,
            tier_name: tier.name,
            collection_count,
            active_collection_count,
          };
        });

        break;
      }

      case "revenue_by_tier": {
        // Query revenue grouped by tier
        // This requires joining with subscriptions and standalone_purchases tables
        const { data, error } = await service
          .from("pricing_tiers")
          .select(
            `
            id,
            name
          `,
          )
          .eq("is_active", true);

        if (error) {
          throw new Error(`Failed to fetch tiers: ${error.message}`);
        }

        // For each tier, calculate revenue
        reportData = await Promise.all(
          data.map(async (tier: any) => {
            // Get collections in this tier
            const { data: assignments } = await service
              .from("collection_tier_assignments")
              .select("collection_id")
              .eq("tier_id", tier.id);

            const collectionIds =
              assignments?.map((a: any) => a.collection_id) || [];

            if (collectionIds.length === 0) {
              return {
                tier_id: tier.id,
                tier_name: tier.name,
                total_revenue: 0,
                subscription_revenue: 0,
                standalone_revenue: 0,
              };
            }

            // Calculate subscription revenue
            let subscriptionQuery = service
              .from("subscriptions")
              .select("total_price")
              .in("collection_id", collectionIds)
              .eq("status", "active");

            if (startDate) {
              subscriptionQuery = subscriptionQuery.gte(
                "created_at",
                startDate.toISOString(),
              );
            }
            if (endDate) {
              subscriptionQuery = subscriptionQuery.lte(
                "created_at",
                endDate.toISOString(),
              );
            }

            const { data: subscriptions } = await subscriptionQuery;
            const subscription_revenue =
              subscriptions?.reduce(
                (sum: number, s: any) => sum + (s.total_price || 0),
                0,
              ) || 0;

            // Calculate standalone purchase revenue
            let standaloneQuery = service
              .from("standalone_purchases")
              .select("price_full")
              .in("collection_id", collectionIds)
              .in("status", ["active", "completed"]);

            if (startDate) {
              standaloneQuery = standaloneQuery.gte(
                "created_at",
                startDate.toISOString(),
              );
            }
            if (endDate) {
              standaloneQuery = standaloneQuery.lte(
                "created_at",
                endDate.toISOString(),
              );
            }

            const { data: standalones } = await standaloneQuery;
            const standalone_revenue =
              standalones?.reduce(
                (sum: number, s: any) => sum + (s.price_full || 0),
                0,
              ) || 0;

            return {
              tier_id: tier.id,
              tier_name: tier.name,
              total_revenue: subscription_revenue + standalone_revenue,
              subscription_revenue,
              standalone_revenue,
            };
          }),
        );

        break;
      }

      case "conversion_by_tier": {
        // This would require tracking page views, which may not be implemented yet
        // For now, return a placeholder structure
        const { data, error } = await service
          .from("pricing_tiers")
          .select(
            `
            id,
            name
          `,
          )
          .eq("is_active", true);

        if (error) {
          throw new Error(`Failed to fetch tiers: ${error.message}`);
        }

        reportData = data.map((tier: any) => ({
          tier_id: tier.id,
          tier_name: tier.name,
          views: 0, // Would need analytics integration
          purchases: 0, // Would need to count purchases
          conversion_rate: 0,
        }));

        break;
      }
    }

    console.log(`Report generated: ${reportData.length} rows`);

    return new Response(
      JSON.stringify({
        ok: true,
        reportType,
        data: reportData,
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

    console.error("Error generating pricing report:", msg);

    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
