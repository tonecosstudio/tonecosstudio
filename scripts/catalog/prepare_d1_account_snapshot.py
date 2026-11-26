"""Prepare a D1 SQL import from a trusted, restored LOCAL SQLite snapshot.

No cloud calls, source writes, credentials, or automatic upload. The output
contains private production data: keep it outside the repository. A verified
local round-trip is necessary, not sufficient for remote import/cutover.
"""
import argparse
import hashlib
import json
import math
import sqlite3
from pathlib import Path

FTS = {
    "models_fts": ("model_id", "search_text", "SELECT id, search_text FROM models"),
    "franchises_fts": ("franchise_id", "search_text", "SELECT id, name || ' ' || slug FROM franchises"),
}
MAX_STATEMENT_BYTES = 100_000


def ident(s):
    return '"' + s.replace('"', '""') + '"'


def literal(value):
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float):
        if not math.isfinite(value):
            raise ValueError("nonfinite_numeric_value")
        return repr(value)
    if isinstance(value, bytes):
        return "X'" + value.hex() + "'"
    if isinstance(value, str):
        if "\x00" in value:
            return "CAST(X'" + value.encode("utf-8").hex() + "' AS TEXT)"
        return "'" + value.replace("'", "''") + "'"
    raise ValueError("unsupported_sql_value")


def rows(db, name, cols):
    return db.execute("SELECT " + ",".join(map(ident, cols)) + " FROM " + ident(name))


def columns(db, name):
    return [r[1] for r in db.execute("PRAGMA table_xinfo(" + ident(name) + ")") if r[6] == 0]


def fingerprint(db, name, cols):
    hashes = sorted(hashlib.sha256(json.dumps(row, ensure_ascii=True, default=lambda b: {"blob": b.hex()}, separators=(",", ":")).encode()).digest() for row in rows(db, name, cols))
    return len(hashes), hashlib.sha256(b"".join(hashes)).hexdigest()


def catalog_schema(db):
    tables = {r[1]: r[2] for r in db.execute("PRAGMA table_list") if r[0] == "main"}
    virtual = {k for k, v in tables.items() if v == "virtual"}
    if virtual != set(FTS):
        raise ValueError("unexpected_virtual_tables")
    objects = list(db.execute("SELECT type,name,tbl_name,sql FROM sqlite_schema WHERE sql IS NOT NULL ORDER BY rowid"))
    base = {n for n, t in tables.items() if t == "table" and not n.startswith("sqlite_") and n != "_cf_KV"}
    if any(n.startswith("_cf_") for n in base):
        raise ValueError("unexpected_provider_table")
    if not {"models", "franchises", "d1_migrations"} <= base:
        raise ValueError("required_catalog_tables_missing")
    kept = [o for o in objects if o[2] in base or o[2] in virtual or o[0] == "view" or (o[0] == "trigger" and tables.get(o[2]) == "view")]
    return base, kept


def integrity(db):
    if db.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
        raise ValueError("sqlite_integrity_failed")
    if db.execute("PRAGMA foreign_key_check").fetchone() is not None:
        raise ValueError("foreign_key_integrity_failed")


def prepare(source):
    integrity(source)
    base, objects = catalog_schema(source)
    statements = ["PRAGMA defer_foreign_keys=ON;"]
    def add(sql):
        sql = sql.strip().rstrip(";") + ";"
        if len(sql.encode("utf-8")) > MAX_STATEMENT_BYTES:
            raise ValueError("statement_exceeds_d1_limit")
        statements.append(sql)
    for kind, name, table, sql in objects:
        if kind == "table" and name in base:
            add(sql)
    expected = {}
    for name in sorted(base):
        cols = columns(source, name)
        if not cols:
            raise ValueError("no_writable_columns")
        prefix = "INSERT INTO " + ident(name) + "(" + ",".join(map(ident, cols)) + ") VALUES("
        for row in rows(source, name, cols):
            add(prefix + ",".join(map(literal, row)) + ")")
        # Compare generated columns too, if present.
        allcols = [r[1] for r in source.execute("PRAGMA table_xinfo(" + ident(name) + ")") if r[6] != 1]
        expected[name] = (allcols, fingerprint(source, name, allcols))
    # Preserve AUTOINCREMENT high-water marks even if the highest row was deleted.
    has_sequence = source.execute("SELECT 1 FROM sqlite_schema WHERE name='sqlite_sequence'").fetchone()
    seq = []
    if has_sequence:
        seq = [r for r in source.execute("SELECT name,seq FROM sqlite_sequence ORDER BY name") if r[0] in base]
        for name, value in seq:
            add("DELETE FROM sqlite_sequence WHERE name=" + literal(name))
            add("INSERT INTO sqlite_sequence(name,seq) VALUES(" + literal(name) + "," + literal(value) + ")")
    for kind, name, table, sql in objects:
        if kind == "index":
            add(sql)
    for name, (idcol, textcol, query) in FTS.items():
        add(next(o[3] for o in objects if o[0] == "table" and o[1] == name))
        add("INSERT INTO " + ident(name) + "(" + ident(idcol) + "," + ident(textcol) + ") " + query)
        cols = [idcol, textcol]
        expected[name] = (cols, fingerprint(source, name, cols))
    for kind in ("view", "trigger"):
        for o in objects:
            if o[0] == kind:
                add(o[3])
    sql = "\n".join(statements) + "\n"
    with sqlite3.connect(":memory:") as target:
        target.execute("PRAGMA foreign_keys=ON")
        target.executescript("BEGIN;\n" + sql + "COMMIT;")
        integrity(target)
        tbase, tobjects = catalog_schema(target)
        if tbase != base or sorted(objects) != sorted(tobjects):
            raise ValueError("schema_roundtrip_mismatch")
        for name, (cols, fp) in expected.items():
            if fingerprint(target, name, cols) != fp:
                raise ValueError("content_roundtrip_mismatch:" + name)
        if has_sequence and list(target.execute("SELECT name,seq FROM sqlite_sequence ORDER BY name")) != seq:
            raise ValueError("sequence_roundtrip_mismatch")
    return sql, {"localRoundtripVerified": True, "baseTables": len(base), "ftsTables": sorted(FTS), "rows": {n: fp[0] for n, (_, fp) in expected.items()}, "sqlBytes": len(sql.encode("utf-8")), "sqlSha256": hashlib.sha256(sql.encode("utf-8")).hexdigest(), "remoteImportVerified": False}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--snapshot", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    args = p.parse_args()
    source = args.snapshot.resolve(strict=True)
    out = args.output.resolve()
    if source == out or out.exists():
        raise SystemExit("output_must_be_new_file")
    with sqlite3.connect(source.as_uri() + "?mode=ro", uri=True) as db:
        db.execute("PRAGMA query_only=ON")
        db.execute("BEGIN")
        sql, receipt = prepare(db)
    # Exclusive create; never overwrite an earlier snapshot artifact.
    with out.open("xb") as f:
        f.write(sql.encode("utf-8"))
    print(json.dumps(receipt, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
