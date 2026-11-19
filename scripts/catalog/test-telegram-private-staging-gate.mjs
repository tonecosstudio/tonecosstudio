import test from "node:test";
import assert from "node:assert/strict";
import { isPrivateCuradoriaRecord } from "./telegram-private-staging-gate.mjs";

test("bloqueia registros privados recentes e antigos mesmo sem flag", () => {
  const privateCases = [
    { private_staging_only: true },
    { status: "prepared_private" },
    { curation_status: "private_not_authorized" },
    {
      // Manifesto das primeiras 30 imagens geradas antes da flag.
      original_catalog_relpath: "curadoria-privada/kaidan-3d/toga/msg_7005.jpg",
      curation_status: "taxonomy_applied",
    },
    {
      original_catalog_relpath: "C:\\catalogo\\curadoria-privada\\modelo\\img.webp",
    },
    { source_category: "Curadoria Privada", curation_status: "taxonomy_applied" },
    { final_category: "curadoria-privada" },
    { category: "CURADORIA_PRIVADA" },
  ];
  for (const record of privateCases) {
    assert.equal(isPrivateCuradoriaRecord(record), true, JSON.stringify(record));
  }
});

test("não classifica registros do catálogo público como privados", () => {
  const publicCases = [
    null,
    undefined,
    {},
    { status: "copied", source_category: "anime", original_catalog_relpath: "anime/frieren/fern.webp" },
    { status: "already_cataloged", final_category: "games", private_staging_only: false },
    { source_category: "curadoria-avaliada", original_catalog_relpath: "catalog/approved/img.webp" },
  ];
  for (const record of publicCases) {
    assert.equal(isPrivateCuradoriaRecord(record), false, JSON.stringify(record));
  }
});
