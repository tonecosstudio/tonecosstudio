import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const base = readFileSync(new URL("../migrations/0001_catalog.sql", import.meta.url), "utf8");
const taxonomy = readFileSync(new URL("../migrations/0029_canonical_characters_across_sources.sql", import.meta.url), "utf8");

function fixture() {
  const db = new DatabaseSync(":memory:");
  db.exec(base);
  db.exec("INSERT INTO categories (id,slug,name) VALUES (1,'animes-desenhos','Animes & Desenhos'),(2,'games','Games')");
  db.exec("INSERT INTO franchises (id,category_id,slug,name) VALUES (10,1,'one-piece','One Piece'),(11,1,'pokemon','Pokémon'),(12,2,'another-world','Another World')");
  const insert = db.prepare("INSERT INTO models (id,franchise_id,slug,code,name,published) VALUES (?,?,?,?,?,?)");
  insert.run("tg_ace1", 10, "ace-telegram", "TG-ACE", "Ace", 0);
  insert.run("mdl_ace1", 10, "ace-original", "MDL-ACE", "Portgas D. Ace", 1);
  insert.run("tg_abra1", 11, "abra-telegram", "TG-ABRA", "Abra", 0);
  insert.run("mdl_other", 12, "another-world", "MDL-OTHER", "Ace", 1);
  return db;
}
const character = (db, id, franchiseId, slug, name, editorialId = null) =>
  db.prepare("INSERT INTO catalog_characters (id,franchise_id,canonical_slug,display_name,editorial_identity_id,evidence_origin) VALUES (?,?,?,?,?,?)")
    .run(id, franchiseId, slug, name, editorialId, "curation:reviewed");
const modelCharacter = (db, model, id, note = null, cross = 0) =>
  db.prepare("INSERT INTO catalog_model_characters(model_id,character_id,evidence_origin,evidence_note,cross_franchise_approved) VALUES (?,?,?,?,?)")
    .run(model,id,"curation:reviewed",note,cross);

test("migration is additive: models, publication status, and source-specific IDs remain unchanged", () => {
  const db = fixture();
  try {
    const snapshot = db.prepare("SELECT id,franchise_id,name,published FROM models ORDER BY id").all();
    db.exec(taxonomy);
    assert.deepEqual(db.prepare("SELECT id,franchise_id,name,published FROM models ORDER BY id").all(), snapshot);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM catalog_characters").get().n, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM catalog_model_characters").get().n, 0);
  } finally { db.close(); }
});

test("Telegram and legacy models share one reviewed character identity without merging sculptures", () => {
  const db = fixture();
  try {
    db.exec(taxonomy);
    character(db, "ch_ace",10,"portgas-d-ace","Portgas D. Ace","editorial:ace");
    modelCharacter(db, "tg_ace1","ch_ace");
    modelCharacter(db, "mdl_ace1","ch_ace");
    const rows = db.prepare(`
      SELECT mc.model_id, m.published, c.display_name, c.id AS character_id
      FROM catalog_model_characters mc
      JOIN catalog_characters c ON c.id=mc.character_id AND c.status='confirmed'
      JOIN models m ON m.id=mc.model_id
      WHERE mc.character_id=? AND mc.review_state='confirmed'
      ORDER BY mc.model_id`).all("ch_ace");
    assert.deepEqual(rows.map(x=>x.model_id),["mdl_ace1","tg_ace1"]);
    assert.deepEqual(rows.map(x=>x.character_id),["ch_ace","ch_ace"]);
    assert.deepEqual(rows.map(x=>x.published),[1,0]);
    assert.throws(()=>modelCharacter(db,"tg_ace1","ch_ace"),/UNIQUE/);
    assert.throws(()=>character(db,"ch_duplicate",10,"portgas-d-ace","Wrong"),/UNIQUE/);
    db.prepare("UPDATE models SET name='Ace sculpture variant' WHERE id='tg_ace1'").run();
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM catalog_model_characters WHERE character_id='ch_ace'").get().n, 2);
  } finally { db.close(); }
});

test("aliases cannot cross franchises, collide with canonical slugs or alter identity", () => {
  const db = fixture();
  try {
    db.exec(taxonomy);
    character(db,"ch_ace",10,"portgas-d-ace","Portgas D. Ace");
    character(db,"ch_other",12,"ace","Ace");
    const add=db.prepare("INSERT INTO catalog_character_aliases(franchise_id,alias_slug,character_id,evidence_origin) VALUES(?,?,?,?)");
    add.run(10,"ace","ch_ace","owner:reviewed");
    assert.throws(()=>add.run(11,"ace","ch_ace","owner:reviewed"),/alias must match/);
    assert.throws(()=>add.run(10,"portgas-d-ace","ch_ace","owner:reviewed"),/alias must match/);
    assert.throws(()=>add.run(10,"ace","ch_ace","owner:reviewed"),/UNIQUE/);
    assert.throws(()=>character(db,"ch_shadow",10,"ace","Another Ace"),/canonical character collides/);
    assert.throws(()=>db.prepare("UPDATE catalog_characters SET canonical_slug='ace' WHERE id='ch_ace'").run(),/canonical character collides/);
    assert.equal(db.prepare("SELECT id FROM catalog_characters WHERE id='ch_ace'").get().id,"ch_ace");
  } finally { db.close(); }
});

test("unreviewed crossovers cannot link unrelated characters; reviewed multi-character models are supported", () => {
  const db = fixture();
  try {
    db.exec(taxonomy);
    character(db,"ch_ace",10,"ace","Ace");
    character(db,"ch_luffy",10,"luffy","Luffy");
    character(db,"ch_abra",11,"abra","Abra");
    modelCharacter(db,"tg_ace1","ch_ace");
    modelCharacter(db,"tg_ace1","ch_luffy");
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM catalog_model_characters WHERE model_id='tg_ace1'").get().n,2);
    assert.throws(()=>modelCharacter(db,"tg_ace1","ch_abra"),/cross-franchise link requires/);
    assert.throws(()=>modelCharacter(db,"tg_ace1","ch_abra","short",1),/cross-franchise link requires/);
    modelCharacter(db,"tg_ace1","ch_abra","reviewed explicit crossover in artwork",1);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM catalog_model_characters WHERE model_id='tg_ace1'").get().n,3);
    assert.throws(()=>db.prepare("UPDATE models SET franchise_id=11 WHERE id='tg_ace1'").run(),/review character links/);
    db.prepare("UPDATE catalog_model_characters SET review_state='withdrawn' WHERE model_id='tg_ace1' AND character_id='ch_abra'").run();
    const visible=db.prepare("SELECT COUNT(*) AS n FROM catalog_model_characters WHERE model_id='tg_ace1' AND review_state='confirmed'").get().n;
    assert.equal(visible,2);
  } finally { db.close(); }
});

test("index serves character-to-model lookup without materializing all models", () => {
  const db = fixture();
  try {
    db.exec(taxonomy);
    character(db,"ch_ace",10,"ace","Ace");
    modelCharacter(db,"tg_ace1","ch_ace");
    const details=db.prepare("EXPLAIN QUERY PLAN SELECT model_id FROM catalog_model_characters WHERE character_id=? AND review_state='confirmed' ORDER BY model_id").all("ch_ace");
    assert.ok(details.some(x=>x.detail.includes("idx_catalog_model_characters_character")),JSON.stringify(details));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM catalog_model_characters").get().n,1);
  } finally { db.close(); }
});
