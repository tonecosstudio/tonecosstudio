#!/usr/bin/env python3
"""Audita WebP PRIVADO sem tocar nos originais: hashes, magic bytes e contagens."""
from __future__ import annotations
import argparse,hashlib,json
from pathlib import Path

ROOT=Path.home()/"Downloads"/"telegram-2370335738-images"
OUTPUT=Path.home()/"Documents"/"TONART-Telegram-Import"/"otimizacao-privada"/"webp"
def sha256(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for data in iter(lambda:f.read(1024*1024),b""):h.update(data)
    return h.hexdigest()
def validated(root,rel):
    obj=(root/rel).resolve()
    if root.resolve() not in obj.parents:raise ValueError("Tentativa de escapar da pasta de origem")
    if not obj.is_file():raise ValueError("Arquivo ausente: "+str(obj))
    return obj
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--root",type=Path,default=ROOT)
    p.add_argument("--output",type=Path,default=OUTPUT)
    args=p.parse_args()
    m=args.output/"manifests"/"manifest_final.jsonl"
    if not m.exists():raise ValueError("Manifesto WebP ausente")
    rows=[json.loads(s) for s in m.read_text(encoding="utf-8").splitlines() if s]
    seen=set()
    original_bytes=0
    final_bytes=0
    for r in rows:
        mid=int(r["message_id"])
        if mid in seen:raise AssertionError("Mensagem duplicada no manifesto")
        seen.add(mid)
        src=validated(args.root,str(r["source_name"]))
        if sha256(src)!=r["source_sha256"]:raise AssertionError("Original alterado: "+str(mid))
        original_bytes+=src.stat().st_size
        for typ,max_size in (("display",900),("thumb",512)):
            pth=validated(args.output,str(r[typ+"_relpath"]))
            with pth.open("rb") as f:
                magic=f.read(12)
            if not (magic[:4]==b"RIFF" and magic[8:12]==b"WEBP"):
                raise AssertionError("Saida nao WebP: "+str(pth))
            if max(r[typ+"_width"],r[typ+"_height"])>max_size:
                raise AssertionError("Dimensao acima do perfil")
            if pth.stat().st_size!=r[typ+"_bytes"]:
                raise AssertionError("Tamanho nao confere")
            final_bytes+=pth.stat().st_size
    report={"images":len(rows),"original_bytes":original_bytes,
       "webp_display_plus_thumbs_bytes":final_bytes,
       "reduction_pct":round(100*(1-final_bytes/max(original_bytes,1)),1),
       "all_original_sha256_valid":True,
       "all_webp_headers_valid":True,
       "public_upload_performed":False}
    print(json.dumps(report,ensure_ascii=False))
if __name__=="__main__":main()
