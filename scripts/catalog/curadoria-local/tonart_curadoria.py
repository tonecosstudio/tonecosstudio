#!/usr/bin/env python3
"""TONART Curadoria local: acompanha o downloader e edita apenas metadados.
Biblioteca de origem e catalogo de producao nunca sao modificados.
"""
from __future__ import annotations
import csv
import hashlib
import html
import io
import json
import mimetypes
import os
import re
import secrets
import sqlite3
import sys
import threading
import time
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
import smart_curadoria as smart
import name_curadoria as naming
import visual_name_suggestions as visual
import model_gallery as gallery
import gallery_operations as gallery_ops
import catalog_sync_status as catalog_sync
import telegram_curadoria_adapter as telegram_identity

HOST, PORT = "127.0.0.1", 8769
ROOT = Path(__file__).resolve().parent
SOURCE = Path.home() / "Downloads" / "telegram-2370335738-images"
SOURCE_DB = SOURCE / "progresso.sqlite3"
APP_DIR = ROOT / "curadoria-local"
DB_PATH = APP_DIR / "curadoria.sqlite3"
TOKEN_PATH = APP_DIR / "token-local.txt"
UI_PATH = ROOT / "curadoria.html"
SOURCE_ID = -1002370335738
SYNC_LOCK = threading.Lock()
ALLOWED_STATUS = {"pendente", "revisar", "aprovado", "descartado"}
NAME_RE = re.compile(r'[^\w .()\-+&]', re.UNICODE)

def now():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")

class ManagedConnection(sqlite3.Connection):
    """Context manager que fecha o handle SQLite, inclusive no Windows."""
    def __exit__(self, exc_type, exc_value, traceback):
        try:
            return super().__exit__(exc_type, exc_value, traceback)
        finally:
            self.close()

def connect(path, readonly=False):
    if readonly:
        db = sqlite3.connect(f"file:{path.as_posix()}?mode=ro", uri=True, timeout=5,
                             factory=ManagedConnection)
    else:
        db = sqlite3.connect(path, timeout=10, factory=ManagedConnection)
        db.execute("PRAGMA journal_mode=WAL")
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA busy_timeout=5000")
    return db

def initialize():
    APP_DIR.mkdir(parents=True, exist_ok=True)
    if not TOKEN_PATH.exists():
        TOKEN_PATH.write_text(secrets.token_urlsafe(32), encoding="ascii")
    with connect(DB_PATH) as db:
        db.execute("""CREATE TABLE IF NOT EXISTS assets(
          message_id INTEGER PRIMARY KEY,
          sha256 TEXT NOT NULL,
          source_relative TEXT NOT NULL,
          original_topic TEXT NOT NULL,
          source_date TEXT,
          source_caption TEXT,
          source_album TEXT,
          indexed_at TEXT NOT NULL)""")
        db.execute("""CREATE TABLE IF NOT EXISTS annotations(
          message_id INTEGER PRIMARY KEY REFERENCES assets(message_id),
          studio TEXT, model TEXT, character_name TEXT, universe TEXT,
          file_label TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'pendente',
          modified_at TEXT, revision INTEGER NOT NULL DEFAULT 0)""")
        db.execute("""CREATE TABLE IF NOT EXISTS external_candidates(
          external_id TEXT PRIMARY KEY, filename TEXT, sha256 TEXT, model TEXT,
          source TEXT NOT NULL, matched_message_id INTEGER, status TEXT NOT NULL DEFAULT 'revisar')""")
        db.execute("""CREATE INDEX IF NOT EXISTS idx_assets_topic ON assets(original_topic)""")
        db.execute("""CREATE INDEX IF NOT EXISTS idx_assets_hash ON assets(sha256)""")
    return TOKEN_PATH.read_text(encoding="ascii").strip()

def safe_source_path(relative):
    if not isinstance(relative,str):return None
    path=(SOURCE/relative).resolve()
    if SOURCE.resolve() not in path.parents:return None
    if path.suffix.lower() not in (".jpg",".jpeg",".png",".gif",".webp",".bmp",".tif",".tiff",".heif",".heic",".avif"):return None
    return path

def sync():
    """SQLite snapshot, preserving edits, no writes to downloader DB."""
    if not SOURCE_DB.exists():return 0
    with SYNC_LOCK:
        with connect(DB_PATH) as index:
            seen=index.execute("SELECT COALESCE(MAX(message_id),0) FROM assets").fetchone()[0]
        with connect(SOURCE_DB, readonly=True) as origin:
            rows=origin.execute("""SELECT m.mensagem,m.hash,m.caminho,m.data_mensagem,
                         COALESCE(t.topico_nome,''),COALESCE(t.legenda,''),
                         COALESCE(t.album_id,'')
                         FROM mensagens m LEFT JOIN topicos_mensagens t
                         ON t.origem=m.origem AND t.mensagem=m.mensagem
                         WHERE m.origem=? AND m.status='salvo' AND m.caminho IS NOT NULL
                         AND m.mensagem>? ORDER BY m.mensagem""",(SOURCE_ID,max(0,seen-20))).fetchall()
        count=0
        with connect(DB_PATH) as dest:
            for m in rows:
                mid,digest,path,date,topic,caption,album=m
                if not safe_source_path(path):continue
                topic=topic or path.replace("\\","/").split("/")[0]
                dest.execute("""INSERT INTO assets
                     (message_id,sha256,source_relative,original_topic,source_date,source_caption,source_album,indexed_at)
                     VALUES(?,?,?,?,?,?,?,?)
                     ON CONFLICT(message_id) DO UPDATE SET
                     source_relative=excluded.source_relative,original_topic=excluded.original_topic,
                     source_caption=CASE WHEN excluded.source_caption!='' THEN excluded.source_caption ELSE assets.source_caption END,
                     source_album=CASE WHEN excluded.source_album!='' THEN excluded.source_album ELSE assets.source_album END""",
                     (mid,digest,path,topic,date,caption,album,now()))
                dest.execute("""INSERT OR IGNORE INTO annotations(message_id,status) VALUES (?,'pendente')""",(mid,))
                count+=1
        return count

def as_obj(row):
    return dict(row)

def get_items(params):
    page=max(1,min(999999,int(params.get("page",["1"])[0])))
    limit=max(1,min(120,int(params.get("limit",["48"])[0])))
    topic=params.get("topic",[""])[0][:120]
    status=params.get("status",[""])[0][:30]
    q=params.get("q",[""])[0][:120]
    where=["1=1"];args=[]
    if topic:
        where.append("a.original_topic=?");args.append(topic)
    if status in ALLOWED_STATUS:
        where.append("n.status=?");args.append(status)
    if q:
        where.append("(a.original_topic LIKE ? OR n.model LIKE ? OR n.character_name LIKE ? OR n.universe LIKE ? OR a.source_caption LIKE ? OR CAST(a.message_id AS TEXT) LIKE ?)")
        args.extend(["%"+q+"%"]*6)
    clause=" AND ".join(where)
    with connect(DB_PATH) as db:
        count=db.execute("SELECT COUNT(*) FROM assets a JOIN annotations n USING(message_id) WHERE "+clause,args).fetchone()[0]
        rows=db.execute("""SELECT a.message_id,a.sha256,a.source_relative,a.original_topic,
         a.source_caption,a.source_date,a.source_album,n.studio,n.model,n.character_name,
         n.universe,n.file_label,n.notes,n.status,n.revision,n.modified_at
         FROM assets a JOIN annotations n USING(message_id) WHERE """+clause+
         " ORDER BY a.message_id DESC LIMIT ? OFFSET ?",args+[limit,(page-1)*limit]).fetchall()
    return {"total":count,"page":page,"limit":limit,"items":[as_obj(r) for r in rows]}

def stats():
    with connect(DB_PATH) as db:
        total=db.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
        by_status={r[0]:r[1] for r in db.execute("SELECT status,COUNT(*) FROM annotations GROUP BY status")}
        topics=[{"name":r[0],"count":r[1]} for r in db.execute("SELECT original_topic,COUNT(*) FROM assets GROUP BY original_topic ORDER BY COUNT(*) DESC,original_topic")]
        duplicates=db.execute("SELECT COUNT(*) FROM (SELECT sha256 FROM assets GROUP BY sha256 HAVING COUNT(*)>1)").fetchone()[0]
        candidates=db.execute("SELECT COUNT(*) FROM external_candidates").fetchone()[0]
    latest=None
    if SOURCE_DB.exists():
        try:
            with connect(SOURCE_DB,readonly=True) as db:
                row=db.execute("SELECT ultima_mensagem FROM progresso WHERE origem=?",(SOURCE_ID,)).fetchone()
                latest=row[0] if row else 0
        except sqlite3.Error:pass
    return {"total":total,"by_status":by_status,"topics":topics,"duplicate_hash_groups":duplicates,
            "tonart_candidates":candidates,"source_checkpoint":latest,"preference":"telegram"}

def annotate(obj):
    mid=int(obj.get("message_id",0))
    expected=int(obj.get("revision",-1))
    fields=("studio","model","character_name","universe","file_label","notes","status")
    clean={}
    for key in fields:
        value=obj.get(key)
        if not isinstance(value,str):raise ValueError("Campo invalido: "+key)
        if len(value)> (3000 if key=="notes" else 180):raise ValueError("Valor muito extenso: "+key)
        clean[key]=value.strip()
    if clean["status"] not in ALLOWED_STATUS:raise ValueError("Status invalido")
    with connect(DB_PATH) as db:
        base=db.execute("SELECT original_topic FROM assets WHERE message_id=?",(mid,)).fetchone()
        if not base:raise ValueError("Imagem nao encontrada")
        result=db.execute("""UPDATE annotations SET
           studio=?,model=?,character_name=?,universe=?,file_label=?,notes=?,status=?,
           modified_at=?,revision=revision+1
           WHERE message_id=? AND revision=?""",
           (*[clean[x] for x in fields],now(),mid,expected))
        if result.rowcount!=1:raise RuntimeError("CONFLICT: Esta imagem foi editada em outra janela. Recarregue.")
        row=db.execute("SELECT revision FROM annotations WHERE message_id=?",(mid,)).fetchone()
    return {"ok":True,"revision":row[0]}

def export_catalog():
    output=APP_DIR/"manifesto-revisao.csv"
    tmp=output.with_suffix(".tmp")
    with connect(DB_PATH) as db, tmp.open("w",newline="",encoding="utf-8-sig") as f:
        w=csv.writer(f,delimiter=";")
        w.writerow(["source","source_priority","message_id","sha256","telegram_topic",
                    "filename_original","studio","model","character","universe",
                    "file_label","status","notes","telegram_link","approved_for_publication"])
        for r in db.execute("""SELECT a.*,n.studio,n.model,n.character_name,n.universe,
                               n.file_label,n.status,n.notes FROM assets a
                               JOIN annotations n USING(message_id) ORDER BY a.message_id"""):
            w.writerow(["telegram","primary",r["message_id"],r["sha256"],r["original_topic"],
               r["source_relative"],r["studio"],r["model"],r["character_name"],r["universe"],
               r["file_label"],r["status"],r["notes"],
               "https://t.me/c/2370335738/"+str(r["message_id"]),"false"])
    os.replace(tmp,output)
    return {"path":str(output),"size_bytes":output.stat().st_size}

def safe_label(text):
    name=NAME_RE.sub("_",text or "").strip(" ._-")
    return (name[:100] or "modelo-sem-nome")

def materialize_curated():
    """Gera visualizacao fisica revisada via hardlinks; nao move arquivos de origem."""
    dest_root=APP_DIR/"modelos-revisados"
    created=0
    skipped=0
    with connect(DB_PATH) as db:
        rows=db.execute("""SELECT a.message_id,a.sha256,a.source_relative,a.original_topic,
                                   n.studio,n.model,n.file_label
                            FROM assets a JOIN annotations n USING(message_id)
                            WHERE n.status='aprovado' AND TRIM(COALESCE(n.model,''))!=''
                            ORDER BY a.message_id""").fetchall()
    for r in rows:
        source=safe_source_path(r["source_relative"])
        if not source or not source.is_file():continue
        studio=safe_label(r["studio"] or r["original_topic"])
        model=safe_label(r["model"])
        label=safe_label(r["file_label"] or "imagem")
        destination=dest_root/studio/model/(label+"-msg"+str(r["message_id"])+source.suffix.lower())
        destination.parent.mkdir(exist_ok=True,parents=True)
        if destination.exists():
            if hashlib.sha256(destination.read_bytes()).hexdigest()!=r["sha256"]:
                raise RuntimeError("Conflito no destino: "+str(destination))
            skipped+=1
            continue
        os.link(source,destination)
        created+=1
    return {"created":created,"existing":skipped,"root":str(dest_root),
            "note":"Links locais para imagens aprovadas, originais intactos"}

def import_tonart_csv(csv_path):
    """Read-only external candidate import; nothing is overwritten/published."""
    path=Path(csv_path).resolve()
    if not path.is_file():raise ValueError("CSV nao encontrado")
    if path.suffix.lower()!=".csv":raise ValueError("Apenas CSV")
    if path.stat().st_size>20*1024*1024:raise ValueError("CSV grande demais")
    with path.open("r",encoding="utf-8-sig",newline="") as f:
        reader=csv.DictReader(f)
        if not reader.fieldnames:raise ValueError("CSV sem cabecalho")
        fields=set(reader.fieldnames)
        if not ("sha256" in fields and ("source" in fields or "filename" in fields)):raise ValueError("CSV precisa de sha256 e source ou filename")
        records=[]
        for i,r in enumerate(reader):
            if i>=100000:raise ValueError("Limite de 100 mil registros")
            digest=(r.get("sha256") or "").lower().strip()
            if not re.fullmatch("[0-9a-f]{64}",digest):continue
            records.append((str(r.get("source") or r.get("filename") or i)[:200],
                            str(r.get("filename") or r.get("source") or "")[:250],digest,
                            str(r.get("model") or "")[:180]))
    matched=0
    with connect(DB_PATH) as db:
        for key,filename,digest,model in records:
            candidate=db.execute("SELECT message_id FROM assets WHERE sha256=? ORDER BY message_id LIMIT 1",(digest,)).fetchone()
            if candidate:matched+=1
            external_id=hashlib.sha256((key+"|"+digest).encode()).hexdigest()
            db.execute("""INSERT INTO external_candidates
                (external_id,filename,sha256,model,source,matched_message_id,status)
                VALUES (?,?,?,?,?,?,?)
                ON CONFLICT(external_id) DO UPDATE SET matched_message_id=excluded.matched_message_id""",
                (external_id,filename,digest,model,"tonart",candidate[0] if candidate else None,"revisar"))
    return {"candidates":len(records),"exact_hash_matches":matched,"preferred":"telegram",
            "note":"Somente comparacao; nenhuma imagem TONART foi alterada"}

TOKEN = initialize()

class Handler(BaseHTTPRequestHandler):
    protocol_version="HTTP/1.0"
    def log_message(self,*args):pass

    def respond(self,body,status=200,ctype="application/json"):
        if isinstance(body,(dict,list)):
            payload=json.dumps(body,ensure_ascii=False).encode("utf-8")
        elif isinstance(body,str):payload=body.encode("utf-8")
        else:payload=body
        self.send_response(status)
        self.send_header("Content-Type",ctype)
        self.send_header("Content-Length",str(len(payload)))
        self.send_header("Cache-Control","no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.send_header("Content-Security-Policy","default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'")
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        try:
            route=urlparse(self.path)
            if route.path=="/":
                data=UI_PATH.read_text(encoding="utf-8").replace("__LOCAL_CSRF__",TOKEN)
                return self.respond(data,ctype="text/html; charset=utf-8")
            if route.path=="/gallery_ui.js":
                return self.respond((ROOT/"gallery_ui.js").read_text(encoding="utf-8"),
                                    ctype="text/javascript; charset=utf-8")
            if route.path=="/curadoria.js":
                script=(ROOT/"curadoria.js").read_text(encoding="utf-8").replace(
                    "__LOCAL_CSRF__", TOKEN)
                return self.respond(script,ctype="text/javascript; charset=utf-8")
            if route.path=="/api/capabilities":
                return self.respond({
                  "contract":"tonart.curadoria.host/2",
                  "transport":"loopback-http",
                  "operations":[
                    {"id":"catalog.compare","method":"GET","path":"/api/catalog-sync","effect":"read"},
                    {"id":"models.list","method":"GET","path":"/api/models","effect":"read","pagination":True},
                    {"id":"models.inspect","method":"GET","path":"/api/model/{group_key}","effect":"read"},
                    {"id":"gallery.candidates","method":"GET","path":"/api/gallery-candidates","effect":"read","pagination":True},
                    {"id":"gallery.create","method":"POST","path":"/api/create-gallery","effect":"write","batch_max":500},
                    {"id":"gallery.append","method":"POST","path":"/api/append-gallery","effect":"write","batch_max":500},
                    {"id":"gallery.propose_names","method":"POST","path":"/api/propagate-gallery-name","effect":"write"},
                    {"id":"models.review","method":"POST","path":"/api/review-model","effect":"write"},
                    {"id":"images.review_name","method":"POST","path":"/api/review-name","effect":"write"},
                    {"id":"images.list","method":"GET","path":"/api/items","effect":"read","pagination":True},
                    {"id":"images.preview","method":"GET","path":"/media/{message_id}","effect":"read"},
                    {"id":"stats.read","method":"GET","path":"/api/stats","effect":"read"},
                    {"id":"names.list","method":"GET","path":"/api/names","effect":"read","pagination":True},
                    {"id":"albums.candidates","method":"GET","path":"/api/album-candidates","effect":"read","pagination":True},
                    {"id":"studios.official_sources","method":"GET","path":"/api/official-sources","effect":"read"},
                    {"id":"images.visual_candidates","method":"GET","path":"/api/visual-candidates/{message_id}","effect":"read"},
                    {"id":"external_candidates.list","method":"GET","path":"/api/candidates","effect":"read"},
                    {"id":"images.annotate","method":"POST","path":"/api/annotate","effect":"write"},
                    {"id":"names.export","method":"POST","path":"/api/export-names","effect":"write"},
                    {"id":"names.materialize_confirmed","method":"POST","path":"/api/materialize-confirmed-names","effect":"write"},
                    {"id":"catalog.export","method":"POST","path":"/api/export","effect":"write"},
                    {"id":"catalog.materialize","method":"POST","path":"/api/materialize","effect":"write"},
                    {"id":"catalog.compare_csv","method":"POST","path":"/api/import-tonart-csv","effect":"write"}
                  ],
                  "writes":"loopback origin + local token; optimistic revisions",
                  "write_auth":{"type":"local-token","header":"X-Tonart-Token","origin_required":True},
                  "gallery":"single persistent group_key; add photos in repeated batches",
                  "publication":"never automatic; D1/R2 canonical owner",
                })
            if route.path=="/health":
                return self.respond({"ok":True,"service":"tonart-curadoria-local","source":str(SOURCE)})
            if route.path.startswith("/media/"):
                mid=int(route.path.rsplit("/",1)[-1])
                with connect(DB_PATH) as db:
                    row=db.execute("SELECT source_relative FROM assets WHERE message_id=?",(mid,)).fetchone()
                if not row:return self.respond({"error":"nao encontrado"},404)
                path=safe_source_path(row[0])
                if not path or not path.is_file():return self.respond({"error":"arquivo ausente"},404)
                mime=mimetypes.guess_type(path.name)[0] or "application/octet-stream"
                data=path.read_bytes()
                if len(data)>25*1024*1024:return self.respond({"error":"imagem excede limite de preview"},413)
                return self.respond(data,ctype=mime)
            if route.path=="/api/stats":
                sync()
                return self.respond({**stats(),"smart":smart.stats(DB_PATH),
                       "naming":naming.stats(DB_PATH),"galleries":gallery.stats(DB_PATH),
                       "telegram_identity":telegram_identity.status(DB_PATH)})
            if route.path=="/api/items":
                sync()
                return self.respond(get_items(parse_qs(route.query)))
            if route.path=="/api/official-sources":
                p=parse_qs(route.query)
                return self.respond({"topic":p.get("topic",[""])[0][:120],
                      "profiles":naming.official_sources(p.get("topic",[""])[0][:120]),
                      "note":"Perfis oficiais não confirmam a identidade de cada imagem"})
            if route.path.startswith("/api/visual-candidates/"):
                mid=int(route.path.rsplit("/",1)[-1])
                return self.respond({"message_id":mid,"candidates":visual.get_candidates(DB_PATH,mid),
                    "note":"Semelhança visual: NÃO é confirmação de identidade"})
            if route.path=="/api/names":
                p=parse_qs(route.query)
                return self.respond(naming.list_names(DB_PATH,
                   page=p.get("page",["1"])[0],limit=p.get("limit",["48"])[0],
                   topic=p.get("topic",[""])[0][:120],q=p.get("q",[""])[0][:120],
                   status=p.get("status",[""])[0][:20]))
            if route.path=="/api/catalog-sync":
                return self.respond(catalog_sync.compare(DB_PATH))
            if route.path=="/api/gallery-candidates":
                p=parse_qs(route.query)
                return self.respond(gallery_ops.candidates(DB_PATH,
                   p.get("group_key",[""])[0],page=p.get("page",["1"])[0],
                   limit=p.get("limit",["48"])[0],query=p.get("q",[""])[0]))
            if route.path=="/api/album-candidates":
                p=parse_qs(route.query)
                return self.respond(gallery.list_album_candidates(DB_PATH,
                    topic=p.get("topic",[""])[0][:120],
                    limit=p.get("limit",["60"])[0],page=p.get("page",["1"])[0]))
            if route.path=="/api/models":
                p=parse_qs(route.query)
                return self.respond(smart.list_models(DB_PATH,
                    page=p.get("page",["1"])[0],limit=p.get("limit",["48"])[0],
                    topic=p.get("topic",[""])[0][:120],q=p.get("q",[""])[0][:120],
                    state=p.get("state",[""])[0][:20],
                    min_images=p.get("min_images",["1"])[0],
                    unnamed_only=p.get("unnamed",["0"])[0]=="1"))
            if route.path.startswith("/api/model/"):
                return self.respond(smart.model_detail(DB_PATH,route.path.split("/")[-1]))
            if route.path=="/api/candidates":
                with connect(DB_PATH) as db:
                    rows=db.execute("""SELECT filename,sha256,model,matched_message_id,status
                                       FROM external_candidates ORDER BY matched_message_id IS NULL,filename LIMIT 200""").fetchall()
                return self.respond({"items":[as_obj(x) for x in rows]})
            return self.respond({"error":"not found"},404)
        except catalog_sync.CatalogUnavailable as exc:
            return self.respond({
                "ok": False,
                "error": str(exc),
                "code": "catalog_upstream_unavailable",
                "retry_after_seconds": exc.retry_after_seconds,
                "mode": "read_only",
                "site_models": None,
            }, 503)
        except Exception as exc:
            return self.respond({"error":str(exc)},500)

    def do_POST(self):
        try:
            if self.headers.get("Origin")!=f"http://{HOST}:{PORT}":return self.respond({"error":"origin bloqueada"},403)
            if not secrets.compare_digest(self.headers.get("X-Tonart-Token",""),TOKEN):
                return self.respond({"error":"token invalido"},403)
            n=int(self.headers.get("Content-Length","0"))
            if n<1 or n>21*1024*1024:return self.respond({"error":"tamanho invalido"},413)
            obj=json.loads(self.rfile.read(n))
            if self.path=="/api/materialize-confirmed-names":
                return self.respond(naming.materialize_confirmed(DB_PATH,SOURCE,APP_DIR))
            if self.path=="/api/export-names":
                return self.respond(naming.export_manifest(DB_PATH,APP_DIR/"manifesto-nomes-propostos.csv"))
            if self.path=="/api/review-name":
                return self.respond(naming.review_name(DB_PATH,
                    obj.get("message_id",0),obj.get("revision",-1),
                    obj.get("title",""),obj.get("studio",""),
                    obj.get("universe",""),obj.get("variant",""),
                    obj.get("status","revisar"),obj.get("official_url",""),
                    obj.get("notes","")))
            if self.path=="/api/propagate-gallery-name":
                key=str(obj.get("group_key",""))
                if not re.fullmatch("[0-9a-f]{24}",key):
                    raise ValueError("ID de galeria invalido")
                return self.respond(naming.propagate_reviewed_gallery_names(
                    DB_PATH,limit=40,group_key=key))
            if self.path=="/api/append-gallery":
                return self.respond(gallery_ops.append(DB_PATH,
                   obj.get("group_key",""),obj.get("revision",-1),
                   obj.get("message_ids",[]),obj.get("note","")))
            if self.path=="/api/create-gallery":
                return self.respond(gallery.register_visual_gallery(DB_PATH,
                    obj.get("message_ids",[]),obj.get("topic",""),
                    obj.get("note","")))
            if self.path=="/api/review-model":
                return self.respond(smart.review_model(DB_PATH,
                   obj.get("group_key",""),obj.get("revision",-1),
                   obj.get("state",""),obj.get("official_url",""),obj.get("notes","")))
            if self.path=="/api/annotate":return self.respond(annotate(obj))
            if self.path=="/api/export":return self.respond(export_catalog())
            if self.path=="/api/materialize":return self.respond(materialize_curated())
            if self.path=="/api/import-tonart-csv":
                return self.respond(import_tonart_csv(obj.get("path","")))
            return self.respond({"error":"not found"},404)
        except RuntimeError as exc:
            return self.respond({"error":str(exc)},409)
        except ValueError as exc:
            return self.respond({"error":str(exc)},400)
        except Exception as exc:
            return self.respond({"error":str(exc)},500)

def main():
    manual_only = os.environ.get("TONART_CURADORIA_MANUAL_ONLY", "").strip() == "1"
    # Sync is exclusively owned by the background worker. Never delay the
    # HTTP listener with a potentially slow downloader SQLite snapshot.
    def background_curadoria():
        while True:
            try:
                sync()
                telegram_identity.run_cycle(
                    ROOT,SOURCE_DB,DB_PATH,SOURCE_ID,
                    naming=naming,smart=smart,gallery=gallery,
                    ignored_batch=100,history_page_size=300,
                    official_entities_per_cycle=1,
                )
            except Exception as exc:
                print("Curadoria incremental:",type(exc).__name__,str(exc)[:250],flush=True)
            time.sleep(8)
    with ThreadingHTTPServer((HOST,PORT),Handler) as srv:
        # Bind before starting any SQLite synchronization: /health and the UI
        # remain reachable even if the downloader is busy or a scan stalls.
        if not manual_only:
            threading.Thread(target=background_curadoria,daemon=True,name="tonart-smart-curadoria").start()
        print(f"TONART CURADORIA | http://{HOST}:{PORT}",flush=True)
        print(f"Banco isolado: {DB_PATH}",flush=True)
        print("Revisao manual sem sincronizacao global." if manual_only else "Origem intocada; sincronizacao incremental ativa.",flush=True)
        srv.serve_forever()

if __name__=="__main__":main()
