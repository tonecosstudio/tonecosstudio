#!/usr/bin/env python3
"""Offline, read-only evaluation of DINOv2 against the existing perceptual hashes.

Existing confirmed galleries are proxy labels, not independent ground truth.
No model downloads, editorial writes, new database, server or automatic approval.
"""
from __future__ import annotations

import argparse
import hashlib
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


def run(db_path, media_root, model_dir, studio, batch_size=8):
    import torch
    from PIL import Image, ImageOps
    from transformers import AutoImageProcessor, AutoModel
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
    processor = AutoImageProcessor.from_pretrained(
        str(model_dir), local_files_only=True, trust_remote_code=False)
    model = AutoModel.from_pretrained(str(model_dir), local_files_only=True,
                                      trust_remote_code=False, use_safetensors=True)
    if model.config.model_type != "dinov2":
        raise ValueError("expected DINOv2")
    model.eval()
    device = "cuda" if torch.cuda.is_available() else "cpu"
    model.to(device)
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
        inputs = processor(images=images, return_tensors="pt")
        with torch.inference_mode():
            result = model(**{k: v.to(device) for k, v in inputs.items()})
            vectors = torch.nn.functional.normalize(
                result.last_hidden_state[:, 0].float(), dim=1)
        embeddings.append(vectors.cpu())
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
        results.append(dict(k=k, hash=baseline, dinov2=deep))
    return dict(studio=studio, eligible_confirmed_rows=len(raw), unique_rows=len(rows),
                excluded_or_duplicate=len(raw)-len(rows), device=device,
                elapsed_seconds=round(time.perf_counter()-start, 3),
                proxy_labels=True, automatic_decisions=False,
                hash_extraction_seconds=round(hash_seconds, 6),
                embedding_extraction_seconds=round(embedding_seconds, 6),
                similarity_matrix_seconds=round(similarity_seconds, 6),
                results=results)


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
        row.update(title="same character", variant=row["group_key"])
    assert evaluate(rows, lambda i,j: 1, 3)["cross_variant_candidates"] == 4
    assert hash_score((0,0,1),(0,0,1)) == 1
    assert hash_score((0,0,1),(0,0,2)) is None
    assert len(unique_rows(rows+[dict(message_id=5, group_key="x",sha256="0")])) == 3
    print("VISUAL_RETRIEVAL_SYNTHETIC_PASS")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--sqlite", type=Path)
    parser.add_argument("--media-root", type=Path)
    parser.add_argument("--model-dir", type=Path)
    parser.add_argument("--studio", default="Wicked")
    parser.add_argument("--batch-size", type=int, default=8)
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    if not all((args.sqlite, args.media_root, args.model_dir)):
        parser.error("--sqlite, --media-root and --model-dir are required")
    print(json.dumps(run(args.sqlite, args.media_root, args.model_dir,
                         args.studio, args.batch_size), ensure_ascii=False, allow_nan=False))


if __name__ == "__main__":
    main()
