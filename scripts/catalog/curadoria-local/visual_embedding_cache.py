"""Content-addressed derived image embeddings, stored in the existing SQLite.

No editorial fields, no model execution or untrusted object serialization here.
Opt-in writer; callers verify the physical source SHA before lookup.
"""
import hashlib
import json
import re
import sqlite3
import struct
import math
from pathlib import Path
from contextlib import closing

HEX = re.compile(r"^[0-9a-f]{64}$")
POLICY = "embedding-v1/exif-first-frame-rgb/l2-f32le/slow-processor"

def namespace(model_sha, model_type, versions, device, adapter_sha):
    if not HEX.fullmatch(model_sha) or not HEX.fullmatch(adapter_sha):
        raise ValueError("invalid model/adapter digest")
    payload = [POLICY, model_sha, model_type, versions, device, adapter_sha]
    return hashlib.sha256(json.dumps(payload, sort_keys=True, separators=(",", ":")).encode()).hexdigest()

class EmbeddingCache:
    def __init__(self, db_path, space, dimensions):
        if not HEX.fullmatch(space) or not 1 <= dimensions <= 4096:
            raise ValueError("invalid embedding namespace/dimensions")
        self.path = Path(db_path).resolve(strict=True)
        self.space, self.dimensions = space, dimensions
        self.hits = self.misses = self.writes = 0
        with closing(self._connect()) as db, db:
            # Never silently create a separate catalog or attach another database.
            if not db.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name='assets'").fetchone():
                raise ValueError("existing catalog required")
            db.execute("""CREATE TABLE IF NOT EXISTS visual_embeddings (
                namespace TEXT NOT NULL, source_sha256 TEXT NOT NULL,
                dimensions INTEGER NOT NULL CHECK(dimensions BETWEEN 1 AND 4096),
                vector BLOB NOT NULL CHECK(length(vector)=4*dimensions),
                vector_sha256 TEXT NOT NULL,
                PRIMARY KEY(namespace,source_sha256)
            ) WITHOUT ROWID""")

    def _connect(self):
        db = sqlite3.connect(self.path.as_uri()+"?mode=rw", uri=True, timeout=5)
        db.execute("PRAGMA busy_timeout=5000")
        return db

    def _validate(self, values):
        if len(values) != self.dimensions or not all(math.isfinite(x) for x in values):
            raise ValueError("invalid vector")
        if abs(math.sqrt(math.fsum(x*x for x in values))-1)>0.005:
            raise ValueError("vector must be normalized")
        return tuple(values)

    def _key(self, sha):
        if not HEX.fullmatch(sha):
            raise ValueError("invalid source digest")
        return self.space, sha

    def get(self, sha):
        with closing(self._connect()) as db:
            row = db.execute("SELECT dimensions,vector,vector_sha256 FROM visual_embeddings WHERE namespace=? AND source_sha256=?", self._key(sha)).fetchone()
        if row:
            dim, blob, digest = row
            if dim == self.dimensions and len(blob)==4*dim and hashlib.sha256(blob).hexdigest()==digest:
                try:
                    values = self._validate(struct.unpack("<"+"f"*dim,blob))
                except ValueError:
                    pass
                else:
                    self.hits += 1
                    return values
        self.misses += 1
        return None

    def put_batch(self, items):
        payload = []
        for sha, vector in items:
            values = self._validate(tuple(float(x) for x in vector))
            blob = struct.pack("<"+"f"*self.dimensions,*values)
            payload.append((*self._key(sha),self.dimensions,blob,hashlib.sha256(blob).hexdigest()))
        if not payload:
            return
        with closing(self._connect()) as db, db:
            db.executemany("""INSERT INTO visual_embeddings
                (namespace,source_sha256,dimensions,vector,vector_sha256)
                VALUES (?,?,?,?,?) ON CONFLICT(namespace,source_sha256)
                DO UPDATE SET dimensions=excluded.dimensions,vector=excluded.vector,
                vector_sha256=excluded.vector_sha256
                WHERE visual_embeddings.vector_sha256!=excluded.vector_sha256
                   OR visual_embeddings.vector!=excluded.vector
                   OR visual_embeddings.dimensions!=excluded.dimensions""",payload)
            self.writes += db.total_changes

def self_test():
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp)/"fixture.sqlite3"
        with closing(sqlite3.connect(p)) as db, db:
            db.execute("CREATE TABLE assets(id INTEGER PRIMARY KEY, title TEXT)")
            db.execute("INSERT INTO assets VALUES(1,'original')")
        a = "a"*64
        ns = namespace("b"*64,"dinov2",{"torch":"test"},"cpu","c"*64)
        c = EmbeddingCache(p,ns,2)
        assert c.get(a) is None
        c.put_batch([(a,[1,0])])
        c.put_batch([(a,[1,0])])
        assert c.writes==1
        assert EmbeddingCache(p,ns,2).get(a)==(1,0)
        with closing(sqlite3.connect(p)) as db, db:
            db.execute("UPDATE assets SET title='renamed'")
        assert c.get(a)==(1,0)
        assert c.get("d"*64) is None
        assert EmbeddingCache(p,namespace("e"*64,"dinov2",{"torch":"test"},"cpu","c"*64),2).get(a) is None
        with closing(sqlite3.connect(p)) as db, db:
            db.execute("UPDATE visual_embeddings SET vector=zeroblob(8)")
        assert c.get(a) is None
        c.put_batch([(a,[1,0])])
        assert c.get(a)==(1,0)
        try: c.put_batch([("d"*64,[float("nan"),0])])
        except ValueError: pass
        else: raise AssertionError("non-finite accepted")
        with closing(sqlite3.connect(p)) as db:
            assert db.execute("SELECT title FROM assets").fetchone()==("renamed",)
            assert db.execute("PRAGMA quick_check").fetchone()==("ok",)
        print("EMBEDDING_CACHE_FIXTURE_PASS",flush=True)

if __name__=="__main__":
    self_test()
