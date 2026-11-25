#!/usr/bin/env python3
"""Offline safety checks for reviewed DINO-pair reconciliation."""
from reconcile_reviewed_dino_pairs import classify_pair, expand_candidates


PAIR = {"studio": "Studio A", "score": 0.99,
        "images": [{"message_id": 1, "group_key": "old-a"},
                   {"message_id": 2, "group_key": "old-b"}]}


def group(key, ids, *, variant="", state="revisar"):
    return key, {"studio": "Studio A", "title": "Model", "universe": "World",
                 "variant": variant, "state": state, "revision": 4,
                 "images": [{"message_id": mid, "sha256": f"sha-{mid}"} for mid in ids]}


ka, a = group("a", [1, 3])
kb, b = group("b", [2])
GROUPS = {ka: a, kb: b}
AUDITS = {mid: ("same_sculpture", f"sha-{mid}") for mid in (1, 2, 3)}

result = classify_pair(PAIR, GROUPS, AUDITS)
assert result["status"] == "ready_from_existing_visual_audits", result
assert result["member_ids"] == [[1, 3], [2]], result

same = classify_pair(PAIR, {"a": {**a, "images": a["images"] + b["images"]}}, AUDITS)
assert same["status"] == "already_merged", same

variant_b = {**b, "variant": "Chibi"}
result = classify_pair(PAIR, {ka: a, kb: variant_b}, AUDITS)
assert result["status"] == "editorial_or_variant_conflict", result

result = classify_pair(PAIR, GROUPS, {1: AUDITS[1], 3: AUDITS[3]})
assert result["status"] == "visual_review_required", result

result = classify_pair(PAIR, GROUPS, {**AUDITS, 3: ("same_sculpture", "stale-sha")})
assert result["status"] == "visual_review_required", result

result = classify_pair({**PAIR, "images": [{"message_id": 1, "sha256": "stale"},
                                            {"message_id": 2, "sha256": "sha-2"}]},
                       GROUPS, AUDITS)
assert result["status"] == "stale_candidate_sha_hold", result

expanded = expand_candidates({
    "strong_pairs": [PAIR],
    "exact_clusters": [{"studio": "Studio A", "sha256": "a" * 64,
                         "message_ids": [3, 1, 2]}],
})
assert len(expanded) == 4, expanded
assert sum(pair["source_kind"] == "exact_sha_cluster" for pair in expanded) == 3

print("reviewed DINO pair reconciler: safety checks passed")
