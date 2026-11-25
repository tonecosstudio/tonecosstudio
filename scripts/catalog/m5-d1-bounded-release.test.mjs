import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { planMigrationFiles, stageOnly } from "./m5-d1-bounded-release.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const migrations = readdirSync(join(root, "services/catalogo/migrations"));
const baseline = ["0027_telegram_pending_franchise_taxonomy.sql"];
const authorized = [
  "0028_telegram_showcase_listing_index.sql",
  "0029_canonical_characters_across_sources.sql",
  "0030_canonical_character_attributes.sql",
  "0031_seed_reviewed_canonical_model_tags.sql",
  "0032_seed_marvel_individual_catalog_tags.sql",
  "0033_seed_reviewed_dc_character_tags.sql",
];
test("M5 includes exactly the six authorized existing migration files", () => {
  const plan = planMigrationFiles({ applied: baseline, additionalFiles: migrations.filter((x) => /^00(?:3[4-9]|[4-9]\d)_/.test(x)) });
  assert.deepEqual(plan.pending, authorized);
  assert.equal(plan.pending.length, 6);
  assert.ok(migrations.some((x) => x.startsWith("0053_")), "future migrations must be excluded");
  for (const name of plan.pending) {
    assert.ok(migrations.includes(name));
    assert.ok(readFileSync(join(root, "services/catalogo/migrations", name), "utf8").length > 0);
  }
});
test("temporary Wrangler configuration can see only M5 authorized SQL", () => {
  const tmp = mkdtempSync(join(tmpdir(), "tonart-m5-test-"));
  const target = join(tmp, "isolated");
  try {
    const file = stageOnly(target, authorized, {database_name:"tonecos-catalogo",database_id:"87006366-60f3-4937-af73-2ef5a5f901fb"}, {name:"tonecos-catalogo-api",compatibility_date:"2026-01-01"});
    assert.ok(existsSync(file));
    assert.deepEqual(readdirSync(join(target,"migrations")).sort(),[...authorized].sort());
    const cfg = JSON.parse(readFileSync(file,"utf8"));
    assert.deepEqual(cfg.d1_databases.map((x)=>x.migrations_dir),["migrations"]);
    assert.equal(cfg.d1_databases[0].database_name,"tonecos-catalogo");
    assert.throws(()=>stageOnly(target,authorized,{},{}),/staging_path_exists/);
  } finally {
    rmSync(tmp,{recursive:true,force:true});
  }
});
test("M5 resume is only a contiguous prefix", () => {
  for (let n=0;n<=6;n++) {
    const applied = baseline.concat(authorized.slice(0,n));
    const plan = planMigrationFiles({ applied });
    assert.deepEqual(plan.applied, authorized.slice(0,n));
    assert.deepEqual(plan.pending, authorized.slice(n));
  }
});
test("M5 rejects out of order or duplicate migration ledger", () => {
  assert.throws(() => planMigrationFiles({applied:baseline.concat(authorized[2])}), /noncontiguous_migration_ledger/);
  assert.throws(() => planMigrationFiles({applied:baseline.concat(baseline)}), /duplicate_migration_in_ledger/);
  assert.throws(() => planMigrationFiles({applied:[]}), /baseline_0027_missing/);
});
test("M5 blocks future migrations already applied in production", () => {
  assert.throws(() => planMigrationFiles({applied:baseline.concat(["0034_seed_reviewed_marvel_group_page2.sql"])}), /future_migrations_already_applied/);
  assert.throws(() => planMigrationFiles({applied:baseline.concat(["0053_restore_marvel_individuals_page2_a.sql"])}), /future_migrations_already_applied/);
});
test("M5 scope cannot be silently widened", () => {
  assert.throws(() => planMigrationFiles({applied:baseline,canonical:authorized.concat("0034_wrong.sql")}), /scope_not_0028_to_0033/);
  assert.throws(() => planMigrationFiles({applied:baseline,canonical:authorized.slice(0,5)}), /scope_not_0028_to_0033/);
});
test("M5 never confuses migration file presence with remote applied state", () => {
  const p = planMigrationFiles({applied:baseline});
  assert.deepEqual(p.applied, []);
  assert.deepEqual(p.pending,p.all);
});
