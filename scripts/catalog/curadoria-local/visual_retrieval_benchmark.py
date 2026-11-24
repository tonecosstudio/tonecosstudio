#!/usr/bin/env python3
"""Offline, read-only evaluation of DINOv2 or SigLIP2 against the existing perceptual hashes.

Existing confirmed galleries are proxy labels, not independent ground truth.
No model downloads, editorial writes, new database, server or automatic approval.
Optional --embedding-cache writes only derived vectors to the existing SQLite.
"""
from __future__ import annotations

import argparse
import hashlib
import heapq
import io
import json
import math
import time
from pathlib import Path

import smart_curadoria as smart
import visual_name_suggestions as visual


def load_rows(db_path, studio):
    if not studio.strip() or studio.casefold() == "geral + 50k":
        raise ValueError("specific studio required")
    with smart.db_open(db_path, readonly=True) as db:
        return [dict(r) for r in db.execute("""
            SELECT a.message_id,a.source_relative,a.sha256,m.group_key,
                   g.title,g.variant,g.revision AS group_revision,p.status
            FROM assets a JOIN name_proposals p USING(message_id)
            JOIN model_group_members m USING(message_id)
            JOIN model_groups g USING(group_key)
            WHERE a.original_topic=? AND p.studio=? AND g.studio=?
              AND p.status='confirmado'
              AND NOT EXISTS (
                SELECT 1 FROM model_group_members other
                LEFT JOIN name_proposals op ON op.message_id=other.message_id
                WHERE other.group_key=m.group_key
                  AND (op.status IS NULL OR op.status!='confirmado')
              )
              AND NOT EXISTS (
                SELECT 1 FROM assets oa JOIN model_group_members om USING(message_id)
                WHERE oa.sha256=a.sha256 AND om.group_key!=m.group_key
              )
            ORDER BY a.message_id
        """, (studio, studio, studio))]


def verified_bytes(root, row):
    path = visual.safe_path(root, row["source_relative"])
    if path is None:
        raise ValueError("missing or unsafe original: " + str(row["message_id"]))
    with path.open("rb") as stream:
        data = stream.read(30 * 1024 * 1024 + 1)
    if len(data) > 30 * 1024 * 1024 or hashlib.sha256(data).hexdigest() != row["sha256"]:
        raise ValueError("physical SHA mismatch: " + str(row["message_id"]))
    return data


def unique_rows(rows):
    """Remove every SHA associated with multiple groups; collapse copies."""
    groups = {}
    for row in rows:
        groups.setdefault(row["sha256"], set()).add(row["group_key"])
    unique = {}
    for row in rows:
        sha = row["sha256"]
        if len(groups[sha]) == 1:
            unique.setdefault(sha, row)
    return list(unique.values())


def sample_digest(rows):
    """Identity of the ordered, deduplicated proxy-label evaluation sample."""
    fields = ("message_id", "sha256", "group_key", "group_revision", "title", "variant")
    payload = [[row[k] for k in fields] for row in rows]
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False,
                                    separators=(",", ":")).encode("utf-8")).hexdigest()


def model_digest(model_dir):
    """Record local config/processor and safetensors provenance without loading code."""
    paths = sorted(p for p in model_dir.iterdir() if p.is_file() and
                   (p.name.endswith(".safetensors") or p.name.endswith(".json")))
    if not any(p.suffix == ".safetensors" for p in paths):
        raise ValueError("local safetensors weights required")
    if not all((model_dir / name).is_file()
               for name in ("config.json", "preprocessor_config.json")):
        raise ValueError("model and processor configs required")
    manifest = []
    for path in paths:
        with path.open("rb") as stream:
            manifest.append((path.name, hashlib.file_digest(stream, "sha256").hexdigest()))
    return hashlib.sha256(json.dumps(manifest, separators=(",", ":")).encode()).hexdigest()


def hash_features(image):
    from PIL import Image
    gray = image.convert("L")
    d = list(gray.resize((9, 8), Image.Resampling.LANCZOS).tobytes())
    a = list(gray.resize((8, 8), Image.Resampling.LANCZOS).tobytes())
    mean = sum(a) / 64
    return (int(visual.bits(d[y*9+x] > d[y*9+x+1]
                            for y in range(8) for x in range(8)), 16),
            int(visual.bits(v >= mean for v in a), 16),
            image.width / image.height)


def hash_score(a, b):
    dd = (a[0] ^ b[0]).bit_count()
    aa = (a[1] ^ b[1]).bit_count()
    if abs(math.log(a[2]/b[2])) > .25 or dd > 9 or aa > 12:
        return None
    return 1 - (dd + aa) / 128


def evaluate(rows, scorer, k=5):
    if k < 1:
        raise ValueError("k must be positive")
    queries = hits = retrieved = relevant = correct = 0
    singleton_queries = singleton_retrieved = variant_conflicts = 0
    covered_queries = 0
    for i, query in enumerate(rows):
        positives = {j for j, row in enumerate(rows)
                     if j != i and row["group_key"] == query["group_key"]}
        if positives:
            queries += 1
            relevant += len(positives)
        else:
            singleton_queries += 1
        ranked = []
        for j, row in enumerate(rows):
            if j == i:
                continue
            score = scorer(i, j)
            if score is not None:
                if not math.isfinite(float(score)):
                    raise ValueError("nonfinite score")
                ranked.append((-float(score), row["message_id"], j))
        top = [j for _, _, j in sorted(ranked)[:k]]
        if not positives:
            singleton_retrieved += bool(top)
            continue
        covered_queries += bool(top)
        variant_conflicts += sum(
            rows[j]["group_key"] != query["group_key"]
            and bool(query.get("title")) and rows[j].get("title") == query["title"]
            and bool(query.get("variant")) and bool(rows[j].get("variant"))
            and rows[j]["variant"] != query["variant"]
            for j in top
        )
        n = len(set(top) & positives)
        hits += bool(n)
        retrieved += len(top)
        correct += n
    return dict(queries=queries, k=k, retrieved=retrieved,
                hit_at_k=hits/queries if queries else None,
                query_coverage=covered_queries/queries if queries else None,
                singleton_queries=singleton_queries,
                singleton_with_candidates=singleton_retrieved,
                cross_variant_candidates=variant_conflicts,
                micro_precision=correct/retrieved if retrieved else None,
                micro_recall=correct/relevant if relevant else None)


def review_pairs(rows, scorer, limit=24, threshold=None):
    """Rank cross-gallery pairs once; suggestions, not verified negatives."""
    if not 0 <= limit <= 100:
        raise ValueError("review limit must be 0..100")
    if not limit:
        return []
    def candidates():
        for i, a in enumerate(rows):
            for j in range(i+1, len(rows)):
                b = rows[j]
                if a["group_key"] == b["group_key"]:
                    continue
                score = scorer(i, j)
                if score is None:
                    continue
                score = float(score)
                if not math.isfinite(score):
                    raise ValueError("nonfinite score")
                if threshold is not None and score < threshold:
                    continue
                yield (-score, a["message_id"], b["message_id"], i, j)
    result = []
    for neg, _, _, i, j in heapq.nsmallest(limit, candidates()):
        a, b = rows[i], rows[j]
        result.append(dict(score=-neg,
            message_ids=[a["message_id"], b["message_id"]],
            group_keys=[a["group_key"], b["group_key"]],
            group_revisions=[a["group_revision"], b["group_revision"]],
            titles=[a["title"], b["title"]],
            variants=[a["variant"], b["variant"]],
            source_sha256=[a["sha256"], b["sha256"]],
            automatic_decision=False))
    return result


def image_vectors(model, inputs, model_type):
    """Handle Transformers 4.x tensor and 5.x pooled output contracts."""
    import torch
    if model_type == "dinov2":
        features = model(**inputs).last_hidden_state[:, 0]
    elif model_type == "siglip2":
        features = model.get_image_features(**inputs)
        if not isinstance(features, torch.Tensor):
            features = features.pooler_output
    else:
        raise ValueError("unsupported vision model")
    if not isinstance(features, torch.Tensor) or features.ndim != 2:
        raise ValueError("expected a matrix of image embeddings")
    if features.shape[0] != inputs["pixel_values"].shape[0]:
        raise ValueError("embedding batch size mismatch")
    features = features.float()
    if not torch.isfinite(features).all() or (features.norm(dim=1) <= 1e-12).any():
        raise ValueError("invalid embeddings")
    return torch.nn.functional.normalize(features, dim=1)


def run(db_path, media_root, model_dir, studio, batch_size=8, review_limit=24, use_cache=False):
    import torch
    from PIL import Image, ImageOps
    import transformers
    from PIL import __version__ as pillow_version
    from transformers import AutoImageProcessor, AutoModel
    if not 0 <= review_limit <= 100:
        raise ValueError("review limit must be 0..100")
    if not 1 <= batch_size <= 32:
        raise ValueError("batch_size must be 1..32")
    model_dir = Path(model_dir).resolve(strict=True)
    if not model_dir.is_dir():
        raise ValueError("local model directory required")
    root = Path(media_root).resolve(strict=True)
    raw = load_rows(db_path, studio)
    rows = unique_rows(raw)
    if not rows or len(rows) > 2000:
        raise ValueError("evaluation requires 1..2000 distinct confirmed photos")
    sample_sha = sample_digest(rows)
    model_sha = model_digest(model_dir)
    processor = AutoImageProcessor.from_pretrained(
        str(model_dir), local_files_only=True, trust_remote_code=False, use_fast=False)
    model = AutoModel.from_pretrained(str(model_dir), local_files_only=True,
                                      trust_remote_code=False, use_safetensors=True)
    model_type = model.config.model_type
    if model_type not in ("dinov2", "siglip2"):
        raise ValueError("expected DINOv2 or SigLIP2")
    model.eval()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
    cache = None
    if use_cache:
        import inspect
        from visual_embedding_cache import EmbeddingCache, namespace
        adapter_sha = hashlib.sha256(inspect.getsource(image_vectors).encode()).hexdigest()
        space = namespace(model_sha, model_type, {"torch": str(torch.__version__),
                          "transformers": transformers.__version__, "pillow": pillow_version},
                          device, adapter_sha)
        dim = model.config.hidden_size if model_type == "dinov2" else model.config.vision_config.hidden_size
        cache = EmbeddingCache(db_path, space, dim)
    hashes, embeddings = [], []
    start = time.perf_counter()
    hash_seconds = embedding_seconds = 0.0
    for offset in range(0, len(rows), batch_size):
        images = []
        for row in rows[offset:offset + batch_size]:
            data = verified_bytes(root, row)
            with Image.open(io.BytesIO(data)) as source:
                source.seek(0)
                image = ImageOps.exif_transpose(source).convert("RGB")
            tick = time.perf_counter()
            hashes.append(hash_features(image))
            hash_seconds += time.perf_counter() - tick
            images.append(image)
        tick = time.perf_counter()
        batch_rows = rows[offset:offset + batch_size]
        vectors = [cache.get(row["sha256"]) if cache else None for row in batch_rows]
        missing = [i for i, vector in enumerate(vectors) if vector is None]
        if missing:
            inputs = processor(images=[images[i] for i in missing], return_tensors="pt")
            with torch.inference_mode():
                fresh = image_vectors(model, {k: v.to(device) for k, v in inputs.items()}, model_type).cpu()
            for i, vector in zip(missing, fresh):
                vectors[i] = vector.tolist()
            if cache:
                cache.put_batch([(batch_rows[i]["sha256"], vectors[i]) for i in missing])
        embeddings.append(torch.tensor(vectors, dtype=torch.float32))
        embedding_seconds += time.perf_counter() - tick
    matrix = torch.cat(embeddings)
    if not torch.isfinite(matrix).all() or (matrix.norm(dim=1) < .99).any():
        raise ValueError("invalid embeddings")
    tick = time.perf_counter()
    similarity = (matrix @ matrix.T).numpy()
    similarity_seconds = time.perf_counter() - tick
    if load_rows(db_path, studio) != raw:
        raise ValueError("catalog changed during evaluation; rerun")
    results = []
    for k in (1,3,5):
        tick = time.perf_counter()
        baseline = evaluate(rows, lambda i,j: hash_score(hashes[i],hashes[j]), k)
        baseline["ranking_seconds"] = round(time.perf_counter()-tick, 6)
        tick = time.perf_counter()
        deep = evaluate(rows, lambda i,j: similarity[i,j].item(), k)
        deep["ranking_seconds"] = round(time.perf_counter()-tick, 6)
        results.append({"k": k, "hash": baseline, model_type: deep})
    review = review_pairs(rows, lambda i,j: similarity[i,j].item(), review_limit)
    if load_rows(db_path, studio) != raw:
        raise ValueError("catalog changed during ranking; rerun")
    if model_digest(model_dir) != model_sha:
        raise ValueError("model files changed during evaluation; rerun")
    return dict(studio=studio, model_type=model_type, sample_sha256=sample_sha,
                model_sha256=model_sha, torch_version=str(torch.__version__),
                transformers_version=transformers.__version__, batch_size=batch_size,
                eligible_confirmed_rows=len(raw), unique_rows=len(rows),
                excluded_or_duplicate=len(raw)-len(rows), device=device,
                elapsed_seconds=round(time.perf_counter()-start, 3),
                proxy_labels=True, automatic_decisions=False,
                hash_extraction_seconds=round(hash_seconds, 6),
                embedding_extraction_seconds=round(embedding_seconds, 6),
                similarity_matrix_seconds=round(similarity_seconds, 6),
                embedding_cache=dict(enabled=bool(cache), hits=cache.hits if cache else 0,
                    misses=cache.misses if cache else len(rows), writes=cache.writes if cache else 0),
                results=results, cross_gallery_review=review)


def self_test():
    rows = [dict(message_id=i, group_key=g, sha256=str(i))
            for i,g in enumerate(("a","a","b","c"))]
    result = evaluate(rows, lambda i,j: 1 if rows[i]["group_key"] == rows[j]["group_key"] else 0, 1)
    assert result["queries"] == 2 and result["hit_at_k"] == 1
    assert result["micro_precision"] == 1 and result["micro_recall"] == 1
    assert result["singleton_queries"] == 2 and result["singleton_with_candidates"] == 2
    assert result["query_coverage"] == 1
    assert evaluate(rows, lambda i,j: None)["micro_recall"] == 0
    assert evaluate(rows, lambda i,j: None)["singleton_with_candidates"] == 0
    for row in rows:
        row.update(title="same character", variant=row["group_key"], group_revision=0)
    assert evaluate(rows, lambda i,j: 1, 3)["cross_variant_candidates"] == 4
    assert hash_score((0,0,1),(0,0,1)) == 1
    assert hash_score((0,0,1),(0,0,2)) is None
    assert len(unique_rows(rows+[dict(message_id=5, group_key="x",sha256="0")])) == 3
    digest = sample_digest(rows)
    assert len(digest) == 64 and sample_digest(rows) == digest
    assert sample_digest(list(reversed(rows))) != digest
    assert sample_digest([dict(rows[0], group_revision=1), *rows[1:]]) != digest
    pairs = review_pairs(rows, lambda i,j: 0.8, 3)
    assert len(pairs) == 3 and pairs[0]["message_ids"] == [0,2]
    assert all(p["group_keys"][0] != p["group_keys"][1] for p in pairs)
    assert all(not p["automatic_decision"] for p in pairs)
    assert review_pairs(rows, lambda i,j: 0.8, 3, .9) == []
    assert review_pairs(rows, lambda i,j: 0.8, 0) == []
    import tempfile
    assert sample_digest([dict(rows[0], variant="different"), *rows[1:]]) != digest
    assert sample_digest([dict(rows[0], sha256="changed"), *rows[1:]]) != digest
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        def rejects():
            try:
                model_digest(root)
            except ValueError:
                return
            raise AssertionError("incomplete model accepted")
        rejects()
        (root/"model.safetensors").write_bytes(b"synthetic fixture")
        rejects()
        (root/"config.json").write_text("{}", encoding="utf-8")
        (root/"preprocessor_config.json").write_text("{}", encoding="utf-8")
        proof = model_digest(root)
        assert model_digest(root) == proof
        (root/"model.safetensors").write_bytes(b"changed fixture")
        assert model_digest(root) != proof
        proof = model_digest(root)
        (root/"preprocessor_config.json").write_text('{"size":224}', encoding="utf-8")
        assert model_digest(root) != proof
        proof = model_digest(root)
        (root/"irrelevant.txt").write_text("ignored", encoding="utf-8")
        assert model_digest(root) == proof
    print("VISUAL_RETRIEVAL_SYNTHETIC_PASS")


def self_test_adapter():
    import torch
    from types import SimpleNamespace

    class Fake:
        def __init__(self, result):
            self.result = result

        def get_image_features(self, **kwargs):
            return self.result

        def __call__(self, **kwargs):
            return self.result

    inputs = {"pixel_values": torch.zeros(2,3,8,8)}
    v = torch.tensor([[3.,4.],[0.,2.]])
    expected = torch.tensor([[.6,.8],[0.,1.]])
    for model, kind in (
        (Fake(SimpleNamespace(last_hidden_state=v[:,None,:])), "dinov2"),
        (Fake(v), "siglip2"),
        (Fake(SimpleNamespace(pooler_output=v)), "siglip2"),
    ):
        assert torch.allclose(image_vectors(model, inputs, kind), expected)
    for model, kind in (
        (Fake(torch.zeros_like(v)), "siglip2"),
        (Fake(v*float("nan")), "siglip2"),
        (Fake(v*float("inf")), "siglip2"),
        (Fake(v[:,None,:]), "siglip2"),
        (Fake(v[:1]), "siglip2"),
        (Fake(v), "other"),
    ):
        try:
            image_vectors(model, inputs, kind)
        except ValueError:
            pass
        else:
            raise AssertionError("invalid adapter result accepted")
    print("VISUAL_ADAPTER_SYNTHETIC_9_OF_9_PASS")


def self_test_sqlite():
    """Exercise actual SQLite queries and PNG bytes; no trained weights."""
    import sqlite3
    import tempfile
    from PIL import Image, ImageDraw, ImageOps
    with tempfile.TemporaryDirectory() as td:
        root = Path(td) / "media"
        root.mkdir()
        db_path = Path(td) / "fixture.sqlite3"

        def png(n):
            image = Image.new("RGB", (96, 96), "white")
            ImageDraw.Draw(image).rectangle((10+n, 15, 45+n, 75), fill="black")
            buffer = io.BytesIO()
            image.save(buffer, format="PNG")
            return buffer.getvalue()

        db = sqlite3.connect(db_path)
        try:
            db.executescript("""
                CREATE TABLE assets(message_id INTEGER PRIMARY KEY,
                    source_relative TEXT, sha256 TEXT, original_topic TEXT);
                CREATE TABLE name_proposals(message_id INTEGER PRIMARY KEY,
                    studio TEXT, status TEXT);
                CREATE TABLE model_groups(group_key TEXT PRIMARY KEY,
                    studio TEXT, title TEXT, variant TEXT, revision INTEGER);
                CREATE TABLE model_group_members(message_id INTEGER PRIMARY KEY,
                    group_key TEXT);
            """)
            for group in ("a", "b", "partial", "missing", "conflict_a", "conflict_b", "other"):
                db.execute("INSERT INTO model_groups VALUES(?,?,?,?,?)",
                           (group, "Other" if group == "other" else "Wicked",
                            group, "bust", 0))
            spec = [(1,"a","confirmado",1), (2,"a","confirmado",2),
                    (3,"a","confirmado",1), (4,"b","confirmado",4),
                    (5,"partial","confirmado",5), (6,"partial","provavel",6),
                    (7,"missing","confirmado",7), (8,"missing",None,8),
                    (9,"conflict_a","confirmado",9), (10,"conflict_b","confirmado",9),
                    (11,"other","confirmado",11)]
            for mid, group, status, n in spec:
                data = png(n)
                name = f"{mid}.png"
                (root/name).write_bytes(data)
                studio = "Other" if group == "other" else "Wicked"
                db.execute("INSERT INTO assets VALUES(?,?,?,?)",
                           (mid, name, hashlib.sha256(data).hexdigest(), studio))
                db.execute("INSERT INTO model_group_members VALUES(?,?)", (mid, group))
                if status is not None:
                    db.execute("INSERT INTO name_proposals VALUES(?,?,?)", (mid, studio, status))
            db.commit()
        finally:
            db.close()
        before = hashlib.sha256(db_path.read_bytes()).hexdigest()
        rows = load_rows(db_path, "Wicked")
        assert [row["message_id"] for row in rows] == [1,2,3,4]
        rows = unique_rows(rows)
        assert [row["message_id"] for row in rows] == [1,2,4]
        vectors = []
        for row in rows:
            with Image.open(io.BytesIO(verified_bytes(root, row))) as image:
                vectors.append(hash_features(ImageOps.exif_transpose(image).convert("RGB")))
        assert hash_score(vectors[0], vectors[0]) == 1
        for row in (dict(rows[0], source_relative="../fixture.sqlite3"),
                    dict(rows[0], source_relative="missing.png"),
                    dict(rows[0], sha256="0"*64)):
            try:
                verified_bytes(root, row)
            except ValueError:
                pass
            else:
                raise AssertionError("unsafe or invalid original accepted")
        assert hashlib.sha256(db_path.read_bytes()).hexdigest() == before
    print("SYNTHETIC_SQLITE_IMAGE_FIXTURE_PASS")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--self-test-adapter", action="store_true")
    parser.add_argument("--self-test-sqlite", action="store_true")
    parser.add_argument("--sqlite", type=Path)
    parser.add_argument("--media-root", type=Path)
    parser.add_argument("--model-dir", type=Path)
    parser.add_argument("--studio", default="Wicked")
    parser.add_argument("--embedding-cache", action="store_true", help="Opt-in derived cache table in existing catalog; warm timings are not cold benchmark timings")
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--review-limit", type=int, default=24)
    args = parser.parse_args()
    if args.self_test_sqlite:
        self_test_sqlite()
        return
    if args.self_test_adapter:
        self_test_adapter()
        return
    if args.self_test:
        self_test()
        return
    if not all((args.sqlite, args.media_root, args.model_dir)):
        parser.error("--sqlite, --media-root and --model-dir are required")
    print(json.dumps(run(args.sqlite, args.media_root, args.model_dir,
                         args.studio, args.batch_size, args.review_limit, args.embedding_cache), ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
