#!/usr/bin/env python3
"""Sugestões visuais para imagens SEM legenda, usando o MESMO SQLite local.

Somente comparação e evidência. Nunca atribui nome oficialmente, escreve em
originais, move arquivos, toca sessões do Telegram ou publica no catálogo.
Requer Pillow apenas para este processo local opcional.
"""
from __future__ import annotations
import argparse
import json
import hashlib
import math
import sqlite3
from pathlib import Path

import name_curadoria as names
import smart_curadoria as smart

IMAGE_EXTS={".jpg",".jpeg",".png",".webp",".gif",".bmp",".tif",".tiff",".avif"}
POLICY="dhash-ahash-v1"

def setup(db):
    db.executescript("""
    CREATE TABLE IF NOT EXISTS visual_fingerprints (
      message_id INTEGER PRIMARY KEY REFERENCES assets(message_id),
      source_sha TEXT NOT NULL, method TEXT NOT NULL,
      dhash TEXT, ahash TEXT, width INTEGER, height INTEGER,
      error TEXT NOT NULL DEFAULT '', analyzed_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS name_visual_candidates (
      message_id INTEGER NOT NULL REFERENCES assets(message_id),
      candidate_message_id INTEGER NOT NULL REFERENCES assets(message_id),
      dhash_distance INTEGER NOT NULL, ahash_distance INTEGER NOT NULL,
      aspect_difference REAL NOT NULL, similarity REAL NOT NULL,
      method TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(message_id,candidate_message_id));
    CREATE INDEX IF NOT EXISTS idx_visual_matches_source
    ON name_visual_candidates(message_id, similarity DESC);
    """)

def bits(vals):
    result=0
    for x in vals:
        result=(result<<1)|int(bool(x))
    return f"{result:016x}"

def fingerprint(path):
    from PIL import Image,ImageOps
    with Image.open(path) as image:
        image.draft("RGB",(128,128))
        image=ImageOps.exif_transpose(image)
        image.seek(0)
        width,height=image.size
        if width<=0 or height<=0: raise ValueError("Dimensões inválidas")
        grayscale=image.convert("L")
        from PIL.Image import Resampling
        dh=list(grayscale.resize((9,8),Resampling.LANCZOS).tobytes())
        ah=list(grayscale.resize((8,8),Resampling.LANCZOS).tobytes())
        avg=sum(ah)/64
        d=bits(dh[row*9+col]>dh[row*9+col+1] for row in range(8) for col in range(8))
        a=bits(x>=avg for x in ah)
        return d,a,width,height

def safe_path(root,relative):
    original=(root/relative).resolve()
    if root not in original.parents or original.suffix.lower() not in IMAGE_EXTS:
        return None
    if not original.is_file() or original.stat().st_size>30*1024*1024:
        return None
    return original

def scan(db_path,source_root,limit=5000,*,studio=None,verify_sha=False):
    """Reuse SSOT fingerprints; optional studio-scoped, physical-SHA-verified batch."""
    root=Path(source_root).resolve()
    limit=max(1,min(20000,int(limit)))
    if studio is not None:
        studio=str(studio or "").strip()
        if not studio or len(studio)>120 or studio.casefold()=="geral + 50k":
            raise ValueError("Estúdio específico obrigatório")
    with smart.db_open(db_path) as db:
        setup(db)
        if studio is None:
            assets=db.execute("SELECT message_id,source_relative,sha256 FROM assets ORDER BY message_id").fetchall()
        else:
            assets=db.execute("""SELECT a.message_id,a.source_relative,a.sha256
                FROM assets a JOIN name_proposals p USING(message_id)
                WHERE a.original_topic=? AND p.studio=? ORDER BY a.message_id""",
                (studio,studio)).fetchall()
        known={r["message_id"]:(r["source_sha"],r["method"],r["dhash"]) for r in
            db.execute("SELECT message_id,source_sha,method,dhash FROM visual_fingerprints")}
    pending_all=[a for a in assets if (known.get(a["message_id"]) is None
        or known[a["message_id"]][0]!=a["sha256"]
        or known[a["message_id"]][1]!=POLICY)]
    pending=pending_all[:limit]
    if verify_sha:
        # Fail BEFORE any writes if an original is missing, moved or differs.
        for asset in pending:
            physical=safe_path(root,asset["source_relative"])
            if physical is None:raise ValueError("Original ausente ou inválido: "+str(asset["message_id"]))
            with physical.open("rb") as stream:
                if hashlib.file_digest(stream,"sha256").hexdigest()!=asset["sha256"]:
                    raise ValueError("SHA-256 físico divergente: "+str(asset["message_id"]))
    counts={"pending":len(pending),"pending_total_before":len(pending_all),
            "completed":0,"unavailable":0,"failure":0,
            "studio":studio or "(all)","physical_sha_verified":bool(verify_sha)}
    rows=[]
    for a in pending:
        source=safe_path(root,a["source_relative"])
        if not source:
            rows.append((a["message_id"],a["sha256"],POLICY,None,None,None,None,"arquivo ausente",smart.utc()))
            counts["unavailable"]+=1
        else:
            try:
                dh,ah,w,h=fingerprint(source)
                rows.append((a["message_id"],a["sha256"],POLICY,dh,ah,w,h,"",smart.utc()))
                counts["completed"]+=1
            except Exception as exc:
                rows.append((a["message_id"],a["sha256"],POLICY,None,None,None,None,
                             type(exc).__name__[:90],smart.utc()))
                counts["failure"]+=1
        if len(rows)>=100:
            with smart.db_open(db_path) as db:
                setup(db)
                db.executemany("""INSERT INTO visual_fingerprints
                     (message_id,source_sha,method,dhash,ahash,width,height,error,analyzed_at)
                     VALUES(?,?,?,?,?,?,?,?,?)
                     ON CONFLICT(message_id) DO UPDATE SET
                     source_sha=excluded.source_sha,method=excluded.method,
                     dhash=excluded.dhash,ahash=excluded.ahash,
                     width=excluded.width,height=excluded.height,error=excluded.error,
                     analyzed_at=excluded.analyzed_at""",rows)
                db.commit()
            rows.clear()
    if rows:
        with smart.db_open(db_path) as db:
            setup(db)
            db.executemany("""INSERT INTO visual_fingerprints
                 (message_id,source_sha,method,dhash,ahash,width,height,error,analyzed_at)
                 VALUES(?,?,?,?,?,?,?,?,?)
                 ON CONFLICT(message_id) DO UPDATE SET
                 source_sha=excluded.source_sha,method=excluded.method,
                 dhash=excluded.dhash,ahash=excluded.ahash,
                 width=excluded.width,height=excluded.height,
                 error=excluded.error,analyzed_at=excluded.analyzed_at""",rows)
            db.commit()
    return counts

def studio_coverage(db_path,studio):
    studio=str(studio or "").strip()
    if not studio or len(studio)>120 or studio.casefold()=="geral + 50k":
        raise ValueError("Estúdio específico obrigatório")
    with smart.db_open(db_path,readonly=True) as db:
        counts=db.execute("""SELECT COUNT(*) AS total,
          SUM(CASE WHEN f.method=? AND f.source_sha=a.sha256
              AND f.dhash IS NOT NULL AND f.ahash IS NOT NULL THEN 1 ELSE 0 END) AS valid,
          SUM(CASE WHEN f.message_id IS NULL OR f.method!=?
              OR f.source_sha!=a.sha256 THEN 1 ELSE 0 END) AS missing,
          SUM(CASE WHEN f.message_id IS NOT NULL AND f.method=?
              AND f.source_sha=a.sha256 AND (f.dhash IS NULL OR f.ahash IS NULL)
              THEN 1 ELSE 0 END) AS errors
          FROM assets a JOIN name_proposals p USING(message_id)
          LEFT JOIN visual_fingerprints f USING(message_id)
          WHERE a.original_topic=? AND p.studio=?""",(POLICY,POLICY,POLICY,studio,studio)).fetchone()
        result=dict(counts)
        for k,v in result.items():result[k]=int(v or 0)
        result['studio']=studio
        result['policy']=POLICY
        result['complete']=result['valid']==result['total'] and result['errors']==0
        return result


def match(db_path,limit=10000):
    with smart.db_open(db_path) as db:
        setup(db)
        names.setup(db)
        refs=db.execute("""SELECT f.message_id,f.dhash,f.ahash,f.width,f.height,p.title,p.studio,
                   a.original_topic AS topic
            FROM visual_fingerprints f JOIN name_proposals p USING(message_id)
            JOIN assets a USING(message_id)
            WHERE p.title!='' AND p.status IN ('provavel','confirmado')
              AND f.dhash IS NOT NULL AND f.method=?
              ORDER BY f.message_id""",(POLICY,)).fetchall()
        missing=db.execute("""SELECT f.message_id,f.dhash,f.ahash,f.width,f.height,
                   a.original_topic AS topic
            FROM visual_fingerprints f JOIN name_proposals p USING(message_id)
            JOIN assets a USING(message_id)
            WHERE p.title='' AND p.status='revisar' AND f.dhash IS NOT NULL AND f.method=?
            ORDER BY f.message_id LIMIT ?""",(POLICY,int(limit))).fetchall()
        viable=[(r["message_id"],int(r["dhash"],16),int(r["ahash"],16),r["width"]/r["height"],r["topic"]) for r in refs]
        updates=[]
        for a in missing:
            if not a["height"]:continue
            d,a_hash,ratio=int(a["dhash"],16),int(a["ahash"],16),a["width"]/a["height"]
            best=[]
            for mid,ref_d,ref_a,ref_ratio,ref_topic in viable:
                if ref_topic!=a["topic"]:continue
                aspect=abs(math.log(ratio/ref_ratio))
                if aspect>0.25:continue
                dd=(d^ref_d).bit_count()
                if dd>9:continue
                aa=(a_hash^ref_a).bit_count()
                if aa>12:continue
                similarity=round(1-(dd+aa)/128,4)
                best.append((mid,dd,aa,aspect,similarity))
            for mid,dd,aa,aspect,similarity in sorted(best,key=lambda x:(-x[4],x[1]+x[2],x[0]))[:3]:
                updates.append((a["message_id"],mid,dd,aa,round(aspect,4),
                                similarity,POLICY,smart.utc()))
        db.execute("DELETE FROM name_visual_candidates WHERE method=?",(POLICY,))
        db.executemany("""INSERT OR REPLACE INTO name_visual_candidates(
            message_id,candidate_message_id,dhash_distance,ahash_distance,
            aspect_difference,similarity,method,created_at)
            VALUES(?,?,?,?,?,?,?,?)""",updates)
        db.commit()
        return {"possible_matches":len(updates),
                "unlabeled_with_candidates":len({r[0] for r in updates}),
                "unlabeled_scanned":len(missing),"named_references":len(viable)}

def get_candidates(db_path,mid):
    with smart.db_open(db_path,readonly=True) as db:
        if not db.execute(
            "SELECT 1 FROM sqlite_master WHERE type='table' AND name='name_visual_candidates'"
        ).fetchone():
            return []
        return [dict(r) for r in db.execute("""SELECT c.message_id,
            c.candidate_message_id,c.similarity,c.dhash_distance,c.ahash_distance,
            p.title,p.studio,p.universe,p.variant,p.status
            FROM name_visual_candidates c JOIN name_proposals p
            ON p.message_id=c.candidate_message_id
            WHERE c.message_id=? ORDER BY c.similarity DESC LIMIT 3""",(int(mid),))]

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--root",type=Path,default=Path(__file__).resolve().parent)
    p.add_argument("--source",type=Path,default=Path.home()/"Downloads"/"telegram-2370335738-images")
    p.add_argument("--limit",type=int,default=6000)
    a=p.parse_args()
    db=a.root/"curadoria-local"/"curadoria.sqlite3"
    print("FINGERPRINTS",json.dumps(scan(db,a.source,a.limit),ensure_ascii=False),flush=True)
    print("SUGGESTIONS",json.dumps(match(db),ensure_ascii=False),flush=True)
