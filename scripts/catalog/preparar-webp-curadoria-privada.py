#!/usr/bin/env python3
"""Preparacao privada, SOMENTE LEITURA, para o conversor WebP canônico.

Gera manifest de imagens com nomes PROPOSTOS no SQLite Curadoria, sem aprovar,
publicar, ou converter por conta propria. Converter usa build-telegram-webp-final.mjs.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from pathlib import Path

HOME=Path.home()
SOURCE_DEFAULT=HOME/"Downloads"/"telegram-2370335738-images"
DB_DEFAULT=HOME/"Documents"/"TONART-Telegram-Import"/"espelho-telegram"/"curadoria-local"/"curadoria.sqlite3"
OUTPUT_DEFAULT=HOME/"Documents"/"TONART-Telegram-Import"/"otimizacao-privada"/"entrada-curadoria.jsonl"
EXTS={".jpg",".jpeg",".png",".webp",".gif",".tiff",".tif",".avif",".heic",".heif"}

def slug(s, max_length=70):
    s=unicodedata.normalize("NFKD",str(s or ""))
    s="".join(x for x in s if not unicodedata.combining(x))
    s=re.sub(r"[^a-zA-Z0-9]+","-",s).strip("-").lower()
    return (s or "sem-nome")[:max_length].strip("-") or "sem-nome"

def sha256(path):
    digest=hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda:stream.read(1024*1024),b""):
            digest.update(chunk)
    return digest.hexdigest()

def read_candidates(db_path, source_root, limit):
    if not db_path.is_file():raise ValueError("SQLite Curadoria nao encontrado")
    source_root=source_root.resolve()
    uri="file:"+db_path.resolve().as_posix()+"?mode=ro"
    db=sqlite3.connect(uri,uri=True,timeout=10)
    db.row_factory=sqlite3.Row
    try:
        rows=db.execute("""SELECT a.message_id,a.sha256,a.source_relative,a.original_topic,
              p.studio,p.title,p.universe,p.variant,p.status,p.confidence,
              n.status AS review_status
              FROM assets a JOIN name_proposals p USING(message_id)
              JOIN annotations n USING(message_id)
              WHERE TRIM(p.title)!='' AND p.status IN ('provavel','confirmado')
              ORDER BY a.message_id LIMIT ?""",(limit,)).fetchall()
        candidates=[]
        rejected=[]
        for a in rows:
            relative=str(a["source_relative"] or "").replace("\\","/")
            source=(source_root/relative).resolve()
            if (source_root not in source.parents or source.suffix.lower() not in EXTS
                    or not source.is_file()):
                rejected.append((a["message_id"],"missing_or_unsafe_path"))
                continue
            digest=str(a["sha256"] or "").lower()
            if not re.fullmatch(r"[a-f0-9]{64}",digest) or sha256(source)!=digest:
                rejected.append((a["message_id"],"invalid_hash"))
                continue
            studio=slug(a["studio"] or a["original_topic"])
            model=slug(a["title"])
            mid=int(a["message_id"])
            confidence=float(a["confidence"] or 0.82)
            # O conversor aceita confianca >=.75. A imagem permanece PRIVADA.
            if confidence<0.75:
                rejected.append((mid,"confidence_below_converter_gate"))
                continue
            candidates.append({
              "message_id":mid,
              "sha256":digest,
              "source_name":relative,
              "catalog_relpath":f"curadoria-privada/{studio}/{model}/msg_{mid}{source.suffix.lower()}",
              "status":"prepared_private",
              "private_staging_only":True,
              "category":"curadoria-privada",
              "folder":studio,
              "franchise":model,
              "filename":f"msg_{mid}{source.suffix.lower()}",
              "confidence":confidence,
              "source_type":"telegram",
              "notes":"PRIVATE_NOT_APPROVED_FOR_PUBLICATION",
              "name_review_status":a["status"],
              "model_review_status":a["review_status"]
            })
        return candidates,rejected
    finally:
        db.close()

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--db",type=Path,default=DB_DEFAULT)
    p.add_argument("--root",type=Path,default=SOURCE_DEFAULT)
    p.add_argument("--manifest",type=Path,default=OUTPUT_DEFAULT)
    p.add_argument("--limit",type=int,default=40)
    args=p.parse_args()
    if not 1<=args.limit<=100000:raise ValueError("Limite fora da faixa")
    origin=args.root.resolve();out=args.manifest.resolve()
    if origin==out or origin in out.parents:raise ValueError("Saida nao pode ficar na pasta original")
    for parent in (out,*out.parents):
        if (parent/".git").exists():raise ValueError("Saida privada nao pode ficar no Git")
    rows,errors=read_candidates(args.db,args.root,args.limit)
    out.parent.mkdir(parents=True,exist_ok=True)
    tmp=out.with_suffix(out.suffix+".tmp")
    tmp.write_text("".join(json.dumps(x,ensure_ascii=False)+"\n" for x in rows),encoding="utf-8")
    tmp.replace(out)
    print(json.dumps({"manifest":str(out),"candidate_records":len(rows),
        "rejected":len(errors),"reasons":errors[:10],
        "public_release_authorized":False},ensure_ascii=False))

if __name__=="__main__":main()
