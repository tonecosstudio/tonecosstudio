#!/usr/bin/env node
/** Read-only production smoke test: no SQL, no rights/media mutation. */
import { pathToFileURL } from "node:url";

export const EXPECTED_CONTRACT = "telegram-facets-v2";
export const PUBLIC_ORIGIN = "https://catalogo.tonartstudio.com.br";
const safePath = (path) => PUBLIC_ORIGIN + path;

async function getJson(path, fetcher) {
  const response = await fetcher(safePath(path), {
    headers: { Accept: "application/json", "Cache-Control": "no-cache" },
    signal: AbortSignal.timeout(15000),
  });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.toLowerCase().includes("json")) {
    return { ok: false, status: response.status, json: null, type };
  }
  try {
    return {
      ok: true,
      status: response.status,
      json: await response.json(),
      type,
    };
  } catch {
    return { ok: false, status: response.status, json: null, type };
  }
}

export async function verifyPublicTags(fetcher = fetch) {
  const contract = await getJson("/catalog-ui-contract.json", fetcher);
  const correctContract =
    contract.ok &&
    contract.json?.schema === "tonart.public-catalog.ui-contract/2" &&
    contract.json?.facet_contract === EXPECTED_CONTRACT &&
    contract.json?.provisional_characters_not_filterable === true &&
    contract.json?.private_character_candidates_exposed === false;
  const listing = await getJson(
    "/catalogo-api/api/telegram-studios?limit=24&offset=0",
    fetcher,
  );
  const items = Array.isArray(listing.json?.items) ? listing.json.items : [];
  // Pick only a bounded slug already returned from the Worker in production.
  const franchise = items.find(
    (model) =>
      typeof model.franchiseSlug === "string" &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(model.franchiseSlug) &&
      model.franchiseSlug !== "franquia-a-identificar",
  )?.franchiseSlug;
  const franchiseResult = franchise
    ? await getJson(
        "/catalogo-api/api/telegram-studios?limit=2&offset=0&franchise=" +
          encodeURIComponent(franchise),
        fetcher,
      )
    : { ok: false, status: null, json: null };
  const outcome = {
    origin: PUBLIC_ORIGIN,
    contract_current: Boolean(correctContract),
    contract_http_status: contract.status,
    list_healthy:
      listing.ok &&
      Number.isInteger(listing.json?.total) &&
      listing.json.total >= items.length,
    listing_http_status: listing.status,
    franchise_filter_healthy:
      franchiseResult.ok && Number.isInteger(franchiseResult.json?.total),
    franchise_http_status: franchiseResult.status,
    provisional_in_sample: items.filter((item) => item.provisional === true)
      .length,
    model_items_sampled: items.length,
    private_identifications_not_published: correctContract,
  };
  return {
    ...outcome,
    ready: Boolean(
      outcome.contract_current &&
      outcome.list_healthy &&
      outcome.franchise_filter_healthy,
    ),
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    const report = await verifyPublicTags();
    process.stdout.write(JSON.stringify(report, null, 2) + "\n");
    if (!report.ready) process.exitCode = 1;
  } catch (error) {
    process.stderr.write(
      "TONART public tag smoke failed: " +
        (error instanceof Error ? error.message : "unknown error") +
        "\n",
    );
    process.exitCode = 1;
  }
}
