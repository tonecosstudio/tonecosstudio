import test from "node:test";
import assert from "node:assert/strict";
import { verifyPublicTags } from "./verify-public-tags-live.mjs";

const response = (data, status = 200, contentType = "application/json") =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": contentType },
  });

test("only marks release ready if UI contract and canonical franchise filter work", async () => {
  const called = [];
  const fetcher = async (url) => {
    called.push(url);
    if (url.endsWith("/catalog-ui-contract.json")) {
      return response({
        schema: "tonart.public-catalog.ui-contract/2",
        facet_contract: "telegram-facets-v2",
        provisional_characters_not_filterable: true,
        private_character_candidates_exposed: false,
      });
    }
    if (url.includes("franchise=one-piece"))
      return response({ total: 2, items: [] });
    return response({
      total: 1,
      items: [
        { name: "Ace Diorama", franchiseSlug: "one-piece", provisional: true },
      ],
    });
  };
  const result = await verifyPublicTags(fetcher);
  assert.equal(result.ready, true);
  assert.equal(result.provisional_in_sample, 1);
  assert.equal(called.length, 3);
  assert.ok(
    called.every((value) =>
      value.startsWith("https://catalogo.tonartstudio.com.br/"),
    ),
  );
});

test("old deployment or failed franchise route never qualifies as updated", async () => {
  const fetcher = async (url) => {
    if (url.endsWith("/catalog-ui-contract.json"))
      return new Response("<!doctype html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    if (url.includes("&franchise="))
      return new Response("Invalid catalog query", {
        status: 400,
        headers: { "content-type": "text/plain" },
      });
    return response({
      total: 10,
      items: [{ franchiseSlug: "marvel", provisional: true }],
    });
  };
  const result = await verifyPublicTags(fetcher);
  assert.equal(result.ready, false);
  assert.equal(result.contract_current, false);
  assert.equal(result.franchise_http_status, 400);
});

test("no franchise on the current page does not infer a tag from draft names", async () => {
  const fetcher = async (url) =>
    url.endsWith("/catalog-ui-contract.json")
      ? response({
          schema: "tonart.public-catalog.ui-contract/2",
          facet_contract: "telegram-facets-v2",
          private_character_candidates_exposed: false,
          provisional_characters_not_filterable: true,
        })
      : response({
          total: 1,
          items: [{ character: "unverified-title", provisional: true }],
        });
  const result = await verifyPublicTags(fetcher);
  assert.equal(result.ready, false);
  assert.equal(result.franchise_filter_healthy, false);
});
