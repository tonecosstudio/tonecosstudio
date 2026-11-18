import { test } from "node:test";
import assert from "node:assert/strict";
import { patchCanonicalEditorialContract, EditorialReviewError } from "./catalog-editorial-contract.mjs";

const a = "mdl_aaaaaaaaaaaaaaaaaaaa";
const b = "mdl_bbbbbbbbbbbbbbbbbbbb";
const base = {
  version: 1,
  source: { productionModels: 2, publishedModels: 2 },
  models: [
    { id: a, slug: "cafe-espresso", code: "E01", displayName: "Espresso",
      variantName: "Pequeno", categoryName: "Cafe", categorySlug: "cafe",
      franchiseName: "Bebidas", franchiseSlug: "bebidas", folderPathKey: "menu",
      published: 1 },
    { id: b, slug: "cafe-cap", code: "C02", displayName: "Cappuccino",
      variantName: "Grande", categoryName: "Cafe", categorySlug: "cafe",
      franchiseName: "Bebidas", franchiseSlug: "bebidas", folderPathKey: "menu",
      published: 1 },
  ],
};
// Same stable indentation/keys used by the original editorial contract.
const raw = JSON.stringify(base, null, 2)
  .replace(/^    "/gm, '      "')
  .replace(/^  \{/gm, "    {");
// Build correctly indented document without relying on a deployment or D1.
function contract() {
  const rows = base.models.map((entry) => {
    const properties = Object.entries(entry).map(([key, value]) =>
      "      " + JSON.stringify(key) + ": " + JSON.stringify(value));
    return "    {\n" + properties.join(",\n") + "\n    }";
  });
  return '{\n  "version": 1,\n  "source": ' + JSON.stringify(base.source) +
    ',\n  "models": [\n' + rows.join(",\n") + "\n  ]\n}";
}
function edit(id = a) {
  return {
    id, slug: "cafe-espresso", code: "E01", name: "Espresso",
    variantName: "Pequeno", category: "Cafe", franchise: "Bebidas",
    newName: "Espresso Premium", newVariant: "",
  };
}
function denied(edits, code) {
  assert.throws(() => patchCanonicalEditorialContract(contract(), edits),
    (error) => error instanceof EditorialReviewError && error.message === code);
}

test("patches exactly the selected model, preserving every unrelated byte", () => {
  const original = contract();
  const result = patchCanonicalEditorialContract(original, [edit()]);
  assert.deepEqual(result.ids, [a]);
  assert.equal(JSON.parse(result.content).models[0].displayName, "Espresso Premium");
  assert.deepEqual(JSON.parse(result.content).models[1], base.models[1]);
  assert.equal(result.content.replace("Espresso Premium", "Espresso"), original);
});
test("blocks stale identity and duplicate submission", () => {
  denied([{ ...edit(), name: "Previous name" }], "editorial_stale_model_snapshot");
  denied([edit(), edit()], "editorial_request_invalid");
});
test("rejects formulas, markup and control characters", () => {
  for (const text of ["=2+2", "<script>", "x\u0007y", " ".repeat(2)]) {
    denied([{ ...edit(), newName: text }], "invalid_editorial_label");
  }
});
test("blocks name collision in same category, franchise and folder", () => {
  denied([{ ...edit(), newName: "Cappuccino", newVariant: "Grande" }],
    "editorial_public_name_collision");
});
test("rejects untrusted extra request fields, missing changes and unbounded pages", () => {
  denied([{ ...edit(), published: 1 }], "editorial_request_invalid");
  denied([{ ...edit(), newName: "", newVariant: "" }], "editorial_nothing_to_change");
  denied(Array.from({ length: 13 }, () => edit()), "editorial_page_size_invalid");
});
