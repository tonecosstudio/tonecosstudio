import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const contract = JSON.parse(
  fs.readFileSync(
    path.join(root, "config/catalog-schema-contract.json"),
    "utf8",
  ),
);
const migrationDirectory = path.join(root, "migrations");
const bundled = await esbuild.build({
  entryPoints: [path.join(root, "worker/index.ts")],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node26",
  write: false,
});
const worker = await import(
  `data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`
);
const CATALOG_MODEL_COUNT = 20_320;
const PAGE_SIZE = 48;

/**
 * Synthetic scale tests run the same migrations as a populated D1 catalog.
 * Reviewed seed migrations require canonical franchise rows and referenced
 * model IDs to exist beforehand. Derive the prerequisites from those migration
 * files instead of duplicating editorial IDs in a second, test-only registry.
 * All prerequisite models are unpublished and do not enter public pagination.
 */
function insertReviewedSeedPrerequisites(db, migrations) {
  const reviewed = migrations
    .filter(({ name }) => /^003[1-3]_seed_/.test(name))
    .map(({ sql }) =>
      sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*--.*$/gm, ""),
    )
    .join("\n");
  const characterFranchises = new Map();
  for (const match of reviewed.matchAll(
    /\('(?<character>char_[a-z0-9_]+)',\s*\(SELECT id FROM franchises WHERE slug='(?<franchise>[a-z0-9-]+)'\)/g,
  )) {
    const { character, franchise } = match.groups;
    assert.ok(
      !characterFranchises.has(character),
      "Duplicate canonical character seed",
    );
    characterFranchises.set(character, franchise);
  }
  assert.ok(
    characterFranchises.size >= 50,
    "Required character seeds missing from migration source",
  );

  db.prepare(
    "INSERT INTO categories(id,slug,name) VALUES(2,'seed-fixtures','Unpublished migration prerequisites')",
  ).run();
  const insertFranchise = db.prepare(
    "INSERT INTO franchises(id,category_id,slug,name) VALUES(?,2,?,?)",
  );
  const franchises = new Map();
  for (const slug of new Set(characterFranchises.values())) {
    const id = 2 + franchises.size;
    insertFranchise.run(id, slug, "Unpublished migration prerequisite");
    franchises.set(slug, id);
  }

  const models = new Map();
  for (const match of reviewed.matchAll(
    /\('(?<model>mdl_[a-f0-9]{20})',\s*'(?<character>char_[a-z0-9_]+)'/g,
  )) {
    const { model, character } = match.groups;
    const franchise = characterFranchises.get(character);
    assert.ok(franchise, "Unknown canonical seed character: " + character);
    if (!models.has(model)) models.set(model, franchises.get(franchise));
  }
  assert.ok(
    models.size >= 70,
    "Reviewed model prerequisites missing from migration source",
  );
  const insertModel = db.prepare(
    "INSERT INTO models(id,franchise_id,slug,code,name,published,search_text) VALUES(?,?,?,?,?,0,?)",
  );
  let index = 0;
  for (const [id, franchiseId] of models) {
    index += 1;
    insertModel.run(
      id,
      franchiseId,
      "seed-fixture-" + index,
      "SEED-" + index,
      "Unpublished migration prerequisite " + index,
      "",
    );
  }
  assert.equal(
    db.prepare("SELECT COUNT(*) AS n FROM models WHERE published=1").get().n,
    0,
  );
}

function createCatalogDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(
    "PRAGMA foreign_keys = ON; CREATE TABLE d1_migrations(name TEXT PRIMARY KEY);",
  );
  const migrationInsert = db.prepare(
    "INSERT INTO d1_migrations(name) VALUES(?)",
  );
  const migrations = contract.requiredMigrations.map((name) => ({
    name,
    sql: fs.readFileSync(path.join(migrationDirectory, name), "utf8"),
  }));
  for (const { name, sql } of migrations) {
    if (name.startsWith("0031_"))
      insertReviewedSeedPrerequisites(db, migrations);
    db.exec(sql);
    migrationInsert.run(name);
  }

  // The migrated D1 already owns IDs 1-2 for provisional categories.
  // Allocate fixture IDs only after applying its real migrations.
  const nextCategoryId = db
    .prepare("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM categories")
    .get().id;
  const nextFranchiseId = db
    .prepare("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM franchises")
    .get().id;
  db.prepare("INSERT INTO categories(id,slug,name) VALUES(?,?,?)").run(
    nextCategoryId,
    "games",
    "Games",
  );
  db.prepare(
    "INSERT INTO franchises(id,category_id,slug,name) VALUES(?,?,?,?)",
  ).run(nextFranchiseId, nextCategoryId, "saga-alfa", "Saga Alfa");

  const insert = db.prepare(`INSERT INTO models(
    id,franchise_id,slug,code,name,variant_name,collection,material,height_cm,
    description,image_count,cover_storage_key,gallery_manifest_key,gallery_version,
    public_gallery_version,published,search_text
  ) VALUES(?,${nextFranchiseId},?,?,?,?,?,?,?,'Fixture local de paginação em escala.',1,?, ?,1,1,1,?)`);
  db.exec("BEGIN");
  for (let index = 1; index <= CATALOG_MODEL_COUNT; index += 1) {
    const suffix = String(index).padStart(5, "0");
    const collection = index % 3 === 0 ? "Coleção B" : "Coleção A";
    const material = index % 2 === 0 ? "PVC" : "Resina";
    const height = 20 + (index % 61);
    insert.run(
      `model-${suffix}`,
      `model-${suffix}`,
      `R29-${suffix}`,
      `Modelo escalável ${suffix}`,
      "",
      collection,
      material,
      height,
      `test-media/${suffix}/card.webp`,
      `test-media/${suffix}/manifest.json`,
      `pokémon modelo escalável ${suffix} ${collection} ${material}`,
    );
  }
  db.exec("COMMIT");
  return db;
}

function createD1Adapter(db) {
  const catalogStatements = [];
  const categoryStatements = [];
  const database = {
    prepare(sql) {
      const statement = db.prepare(sql);
      const all = (values) => {
        if (sql.includes("SELECT m.id,m.slug,m.code,m.name"))
          catalogStatements.push({ sql, values });
        if (sql.includes("SELECT c.slug AS id,c.name AS label"))
          categoryStatements.push({ sql, values });
        return { results: statement.all(...values) };
      };
      return {
        async all() {
          return all([]);
        },
        bind(...values) {
          return {
            async all() {
              return all(values);
            },
            async first() {
              return statement.get(...values) ?? null;
            },
            async run() {
              return statement.run(...values);
            },
          };
        },
      };
    },
    async batch(statements) {
      return statements.map((statement) => statement.run());
    },
  };
  return { database, catalogStatements, categoryStatements };
}

async function requestCatalog(database, params) {
  const url = new URL("https://catalog.example.test/api/catalog");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "")
      url.searchParams.set(key, String(value));
  }
  const response = await worker.default.fetch(new Request(url), {
    DB: database,
    MEDIA: { get: async () => null },
    CORS_ORIGINS: "",
  });
  return { response, body: await response.json() };
}

test("D1 Worker SQL keyset pages and filters a 20k live catalog over a full migrated SQLite schema", async (context) => {
  const db = createCatalogDatabase();
  context.after(() => db.close());
  const { database, catalogStatements, categoryStatements } =
    createD1Adapter(db);

  const categoriesResponse = await worker.default.fetch(
    new Request("https://catalog.example.test/api/categories"),
    { DB: database, MEDIA: { get: async () => null }, CORS_ORIGINS: "" },
  );
  assert.equal(categoriesResponse.status, 200);
  const categories = await categoriesResponse.json();
  assert.equal(
    categories.items.find((item) => item.id === "games")?.label,
    "Games",
  );
  assert.equal(categoryStatements.length, 1);
  const categoryPlan = db
    .prepare(`EXPLAIN QUERY PLAN ${categoryStatements[0].sql}`)
    .all();
  const categoryPlanDescription = categoryPlan
    .map((row) => row.detail)
    .join(" | ");
  assert.match(categoryPlanDescription, /idx_franchises_category_discovery/);
  assert.match(
    categoryPlanDescription,
    /idx_models_franchise_published_image_name/,
  );
  assert.doesNotMatch(
    categoryPlanDescription,
    /MATERIALIZE ranked_franchises|SCAN f USING COVERING INDEX/,
  );
  assert.doesNotMatch(categoryStatements[0].sql, /ROW_NUMBER\(\) OVER/);

  const first = await requestCatalog(database, {
    category: "games",
    franchise: "saga-alfa",
    limit: PAGE_SIZE,
  });
  assert.equal(first.response.status, 200);
  assert.equal(first.body.items.length, PAGE_SIZE);
  assert.equal(first.body.items[0].code, "R29-00001");
  assert.ok(first.body.nextCursor);
  const firstCodes = first.body.items.map((item) => item.code);
  const firstStatement = catalogStatements.at(-1);
  const firstPlan = db
    .prepare(`EXPLAIN QUERY PLAN ${firstStatement.sql}`)
    .all(...firstStatement.values);
  assert.ok(
    firstPlan.some((row) =>
      row.detail.includes("idx_models_franchise_published_name_id"),
    ),
    `Expected the franchise/name keyset index; plan: ${firstPlan.map((row) => row.detail).join(" | ")}`,
  );

  const second = await requestCatalog(database, {
    category: "games",
    franchise: "saga-alfa",
    limit: PAGE_SIZE,
    cursor: first.body.nextCursor,
  });
  assert.equal(second.response.status, 200);
  assert.equal(second.body.items.length, PAGE_SIZE);
  assert.equal(second.body.items[0].code, "R29-00049");
  const secondCodes = second.body.items.map((item) => item.code);
  assert.equal(
    firstCodes.some((code) => secondCodes.includes(code)),
    false,
  );

  const filtered = await requestCatalog(database, {
    category: "games",
    franchise: "saga-alfa",
    material: "PVC",
    collection: "Coleção B",
    minHeight: 30,
    maxHeight: 60,
    limit: PAGE_SIZE,
  });
  assert.equal(filtered.response.status, 200);
  assert.equal(filtered.body.items.length, PAGE_SIZE);
  assert.ok(
    filtered.body.items.every(
      (item) =>
        item.material === "PVC" &&
        item.collection === "Coleção B" &&
        item.height_cm >= 30 &&
        item.height_cm <= 60,
    ),
  );
  const filteredNext = await requestCatalog(database, {
    category: "games",
    franchise: "saga-alfa",
    material: "PVC",
    collection: "Coleção B",
    minHeight: 30,
    maxHeight: 60,
    limit: PAGE_SIZE,
    cursor: filtered.body.nextCursor,
  });
  assert.equal(filteredNext.response.status, 200);
  assert.equal(
    filtered.body.items.some((item) =>
      filteredNext.body.items.some((next) => next.id === item.id),
    ),
    false,
  );

  const searched = await requestCatalog(database, {
    category: "games",
    franchise: "saga-alfa",
    q: "pokemon",
    limit: PAGE_SIZE,
  });
  assert.equal(searched.response.status, 200);
  assert.equal(searched.body.items.length, PAGE_SIZE);
  assert.equal(searched.body.items[0].code, "R29-00001");
  assert.ok(searched.body.nextCursor);
});

test("global search combines eligible historical and Telegram rows, preserves keyset pagination and hides private drafts", async (context) => {
  const db = createCatalogDatabase();
  context.after(() => db.close());
  const { database } = createD1Adapter(db);
  const franchise = db
    .prepare("SELECT id FROM franchises WHERE slug='saga-alfa'")
    .get().id;
  db.prepare(
    "INSERT INTO models(id,franchise_id,slug,code,name,published,search_text,image_count) VALUES(?,?,?,?,?,1,?,1)",
  ).run(
    "historical-thanos",
    franchise,
    "historical-thanos",
    "OLD-THANOS",
    "Thanos A",
    "Thanos A",
  );
  const put = db.prepare(
    "INSERT INTO models(id,franchise_id,slug,code,name,published,search_text,image_count,telegram_group_key,telegram_origin_id,telegram_studio,telegram_character,telegram_review_status,telegram_name_provisional,telegram_rights_status) VALUES(?,?,?,?,?,0,?,1,?,'2370335738','Test Studio',?,'pending',1,'not_reviewed')",
  );
  const ids = ["a", "b", "c", "d"].map((x) => "tg_" + x.repeat(24));
  put.run(
    ids[0],
    franchise,
    "telegram-a",
    "TG-A",
    "Thanos B",
    "Thanos B",
    "a".repeat(24),
    "Thanos",
  );
  put.run(
    ids[1],
    franchise,
    "telegram-b",
    "TG-B",
    "Modelo sem nome #2",
    "Modelo sem nome #2",
    "b".repeat(24),
    "Thanos",
  );
  put.run(
    ids[2],
    franchise,
    "telegram-c",
    "TG-C",
    "Thanos hidden",
    "Thanos hidden",
    "c".repeat(24),
    "Thanos",
  );
  put.run(
    ids[3],
    franchise,
    "telegram-d",
    "TG-D",
    "Thanos rejected",
    "Thanos rejected",
    "d".repeat(24),
    "Thanos",
  );
  for (const id of [ids[0], ids[1], ids[3]]) {
    db.prepare(
      "INSERT INTO telegram_showcase_owner_preview_grants(model_id,authority,scope,reason) VALUES(?,'owner_explicit_request','noncommercial_readonly_preview','Synthetic test fixture')",
    ).run(id);
    db.prepare("UPDATE models SET telegram_showcase_visible=1 WHERE id=?").run(
      id,
    );
  }
  db.prepare(
    "UPDATE models SET telegram_review_status='rejected' WHERE id=?",
  ).run(ids[3]);
  const sha = "e".repeat(64);
  db.prepare(
    "INSERT INTO model_image_sources(model_id,image_id,position,role,source_sha256,gallery_version) VALUES(?,'tg:42',0,'cover',?,1)",
  ).run(ids[0], sha);
  const oldOnly = await requestCatalog(database, { q: "Thanos", limit: 10 });
  assert.equal(oldOnly.response.status, 200);
  assert.deepEqual(
    oldOnly.body.items.map((m) => m.id),
    ["historical-thanos"],
  );
  const first = await requestCatalog(database, {
    q: "Thanos",
    scope: "all",
    limit: 2,
  });
  assert.equal(first.response.status, 200);
  assert.ok(first.body.nextCursor);
  const second = await requestCatalog(database, {
    q: "Thanos",
    scope: "all",
    limit: 2,
    cursor: first.body.nextCursor,
  });
  assert.equal(second.response.status, 200);
  assert.equal(second.body.nextCursor, null);
  const results = [...first.body.items, ...second.body.items];
  assert.deepEqual(
    results.map((m) => m.id),
    [ids[1], "historical-thanos", ids[0]],
  );
  assert.equal(
    results.find((m) => m.id === "historical-thanos").telegram_preview,
    undefined,
  );
  assert.deepEqual(results.find((m) => m.id === ids[0]).telegram_preview, {
    pending: true,
    cover: "/api/telegram-studios/" + ids[0] + "/media/" + sha + "/thumb",
  });
  assert.equal(results.find((m) => m.id === ids[0]).cover_storage_key, null);
  const wildcard = await requestCatalog(database, {
    q: "___",
    scope: "all",
    limit: 10,
  });
  assert.equal(wildcard.response.status, 200);
  assert.deepEqual(wildcard.body.items, []);
  const invalid = await requestCatalog(database, { scope: "all" });
  assert.equal(invalid.response.status, 400);
});
