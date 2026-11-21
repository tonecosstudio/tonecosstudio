#!/usr/bin/env python3
"""Etapa 1: nomear imagens por evidência Telegram antes de agrupar modelos.

Grava apenas propostas no SQLite existente da Curadoria Visual. Não altera,
renomeia, copia ou publica imagens originais, nem o banco do downloader.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from urllib.parse import urlparse

import smart_curadoria as smart

VALID_STATES={"provavel","revisar","confirmado"}
INVALID_WINDOWS={"CON","PRN","AUX","NUL",*(f"COM{x}" for x in range(1,10)),*(f"LPT{x}" for x in range(1,10))}
SOURCE_C="https://t.me/c/2370335738/"

def slug(text, max_len=76):
    norm=unicodedata.normalize("NFKD",str(text or ""))
    norm="".join(c for c in norm if not unicodedata.combining(c))
    norm=re.sub(r"[^a-zA-Z0-9]+","-",norm).strip("-").lower()
    norm=(norm[:max_len].rstrip("-") or "sem-nome")
    if norm.upper() in INVALID_WINDOWS: norm="_"+norm
    return norm

def extension(path):
    ext=Path(str(path).replace("\\","/")).suffix.lower()
    if ext not in {".jpg",".jpeg",".png",".webp",".gif",".bmp",".tif",".tiff",".avif",".heic",".heif"}:
        return ".jpg"
    return ext

def proposed_name(identity,mid,relative):
    if not identity: return ""
    core=slug(identity["title"])
    variation=slug(identity["variant"],25) if identity.get("variant") else ""
    if variation==core: variation=""
    if variation and core.endswith("-"+variation.split("-")[0]):
        variation="-".join(variation.split("-")[1:])
    if variation: core+=("-"+variation)
    return f"{core[:103].rstrip('-')}-msg{int(mid)}{extension(relative)}"

def setup(db):
    db.executescript("""
    CREATE TABLE IF NOT EXISTS name_proposals(
       message_id INTEGER PRIMARY KEY REFERENCES assets(message_id),
       studio TEXT NOT NULL DEFAULT '',
       title TEXT NOT NULL DEFAULT '',
       universe TEXT NOT NULL DEFAULT '',
       variant TEXT NOT NULL DEFAULT '',
       filename TEXT NOT NULL DEFAULT '',
       status TEXT NOT NULL DEFAULT 'revisar',
       confidence REAL NOT NULL DEFAULT 0,
       evidence_type TEXT NOT NULL DEFAULT '',
       evidence_message_id INTEGER,
       source_fingerprint TEXT NOT NULL,
       official_url TEXT NOT NULL DEFAULT '',
       notes TEXT NOT NULL DEFAULT '',
       revision INTEGER NOT NULL DEFAULT 0,
       modified_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_name_proposals_status ON name_proposals(status);
    CREATE INDEX IF NOT EXISTS idx_name_proposals_title ON name_proposals(title);
    CREATE TABLE IF NOT EXISTS name_proposal_events(
       event_id INTEGER PRIMARY KEY AUTOINCREMENT,
       message_id INTEGER NOT NULL, event_type TEXT NOT NULL,
       evidence TEXT NOT NULL, occurred_at TEXT NOT NULL
    );
    """)

def source_fingerprint(asset):
    return hashlib.sha256(json.dumps(["name-policy-v1",asset["sha256"],
        asset["original_topic"],asset["source_caption"],asset["source_album"],
        asset["source_relative"]],ensure_ascii=False).encode()).hexdigest()

def extract_candidates(assets):
    """Primeiro identifica cada imagem; álbuns só herdam um nome não contraditório."""
    albums={}
    for a in assets:
        if a["source_album"]:
            key=(a["original_topic"],str(a["source_album"]))
            ident=smart.identify(a["original_topic"],a["source_caption"] or "")
            if ident: albums.setdefault(key,[]).append((a["message_id"],ident))
    resolved={}
    for a in assets:
        mid=a["message_id"]
        ident=smart.identify(a["original_topic"],a["source_caption"] or "")
        reason="telegram_caption" if ident else ""
        evidence_mid=mid if ident else None
        conf=0.82 if ident else 0
        if ident is None and a["source_album"]:
            options=albums.get((a["original_topic"],str(a["source_album"])),[])
            keys={q["group_key"] for _,q in options}
            if len(keys)==1:
                evidence_mid,ident=options[0]
                reason="telegram_album"
                conf=0.68
            elif len(options)>=2:
                # Mesma identidade textual, mas edições/escalas diferentes:
                # herdar SOMENTE nome, estúdio e universo, NUNCA a variante.
                cores={(smart.normalize(x["studio"]),smart.normalize(x["title"]),
                        smart.normalize(x["universe"])) for _,x in options}
                if len(cores)==1:
                    evidence_mid,seed=options[0]
                    ident={**seed,"variant":""}
                    reason="telegram_album_shared_identity"
                    conf=0.55
        resolved[mid]=(ident,reason,evidence_mid,conf)
    return resolved

def process_batch(db_path,limit=500):
    limit=max(1,min(int(limit),3000))
    with smart.db_open(db_path) as db:
        setup(db)
        assets=db.execute("""SELECT message_id,sha256,original_topic,source_caption,
            source_album,source_relative FROM assets ORDER BY message_id""").fetchall()
        seen={r["message_id"]:r for r in db.execute(
            "SELECT message_id,source_fingerprint,status,evidence_type,notes FROM name_proposals")}
        manual_review_ids={r[0] for r in db.execute(
            "SELECT DISTINCT message_id FROM name_proposal_events WHERE event_type LIKE 'manual_%'")}
        resolved=extract_candidates(assets)
        processed=named=review=0
        for a in assets:
            mid=a["message_id"]
            fingerprint=source_fingerprint(a)
            previous=seen.get(mid)
            # Atualiza sem reindexar o acervo: antes os álbuns com variantes
            # diferentes ficavam sem nome, mesmo com identidade comum.
            # A proposta já criada não volta a ser editada no próximo ciclo.
            shared_identity_upgrade=bool(previous and
                previous["status"]=="revisar" and
                not (previous["evidence_type"] or "").strip() and
                resolved[mid][1]=="telegram_album_shared_identity")
            if previous and previous["source_fingerprint"]==fingerprint and not shared_identity_upgrade:
                continue
            if previous and (previous["status"]=="confirmado" or mid in manual_review_ids or
                previous["evidence_type"] in {"embedded_render_title","studio_catalog_visual_candidate"}
                or (previous["notes"] or "").strip()):
                # Revisão humana não é sobrescrita por sincronização automática.
                continue
            ident,reason,evidence_mid,conf=resolved[mid]
            status="provavel" if ident else "revisar"
            studio=ident["studio"] if ident else a["original_topic"]
            title=ident["title"] if ident else ""
            universe=ident["universe"] if ident else ""
            variant=ident["variant"] if ident else ""
            filename=proposed_name(ident,mid,a["source_relative"])
            stamp=smart.utc()
            db.execute("""INSERT INTO name_proposals(
                message_id,studio,title,universe,variant,filename,status,
                confidence,evidence_type,evidence_message_id,source_fingerprint,
                modified_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(message_id) DO UPDATE SET studio=excluded.studio,
                title=excluded.title,universe=excluded.universe,
                variant=excluded.variant,filename=excluded.filename,
                status=excluded.status,confidence=excluded.confidence,
                evidence_type=excluded.evidence_type,evidence_message_id=excluded.evidence_message_id,
                source_fingerprint=excluded.source_fingerprint,modified_at=excluded.modified_at,
                revision=name_proposals.revision+1
                WHERE name_proposals.status!='confirmado'""",
                (mid,studio,title,universe,variant,filename,status,conf,
                 reason,evidence_mid,fingerprint,stamp))
            db.execute("""INSERT INTO name_proposal_events(message_id,event_type,evidence,occurred_at)
                VALUES(?,?,?,?)""",(mid,"suggested" if ident else "needs_review",
                    SOURCE_C+str(evidence_mid) if evidence_mid else "",stamp))
            processed+=1
            named+=bool(ident)
            review+=not bool(ident)
            if processed>=limit: break
        db.commit()
    return {"processed":processed,"named_this_batch":named,
            "review_this_batch":review,**stats(db_path)}

def stats(db_path):
    with smart.db_open(db_path) as db:
        setup(db)
        total=db.execute("SELECT COUNT(*) FROM assets").fetchone()[0]
        count=db.execute("SELECT COUNT(*) FROM name_proposals").fetchone()[0]
        statuses={r["status"]:r["n"] for r in db.execute(
            "SELECT status,COUNT(*) n FROM name_proposals GROUP BY status")}
        with_names=db.execute("SELECT COUNT(*) FROM name_proposals WHERE TRIM(title)!=''").fetchone()[0]
        return {"images_indexed":total,"images_processed":count,
            "names_proposed":with_names,"awaiting_name_review":statuses.get("revisar",0),
            "names_confirmed":statuses.get("confirmado",0),
            "images_waiting":total-count,"status":statuses}

def list_names(db_path,page=1,limit=48,topic="",q="",status=""):
    page=max(1,int(page));limit=max(1,min(120,int(limit)))
    clause=["1=1"];args=[]
    if topic: clause.append("a.original_topic=?");args.append(topic)
    if status in VALID_STATES:clause.append("p.status=?");args.append(status)
    if q:
        clause.append("(p.title LIKE ? OR p.studio LIKE ? OR p.universe LIKE ? OR p.variant LIKE ? OR a.original_topic LIKE ? OR CAST(a.message_id AS TEXT) LIKE ?)")
        args.extend(["%"+q+"%"]*6)
    where=" AND ".join(clause)
    with smart.db_open(db_path) as db:
        setup(db)
        smart.setup(db)
        total=db.execute("""SELECT COUNT(*) FROM name_proposals p JOIN assets a
          USING(message_id) WHERE """+where,args).fetchone()[0]
        rows=db.execute("""SELECT p.message_id,p.studio,p.title,p.universe,p.variant,
            p.filename,p.status,p.confidence,p.evidence_type,p.evidence_message_id,
            p.official_url,p.notes,p.revision,a.original_topic,a.source_caption,a.source_album,
            (SELECT gm.group_key FROM model_group_members gm WHERE gm.message_id=p.message_id) AS gallery_key,
            (SELECT COUNT(*) FROM model_group_members gm2 WHERE gm2.group_key=(
              SELECT gm1.group_key FROM model_group_members gm1 WHERE gm1.message_id=p.message_id)) AS gallery_image_count
            FROM name_proposals p JOIN assets a USING(message_id) WHERE """+where+"""
            ORDER BY (p.status='revisar') DESC,p.message_id DESC LIMIT ? OFFSET ?""",
            args+[limit,(page-1)*limit]).fetchall()
        return {"total":total,"page":page,"limit":limit,"items":[dict(r) for r in rows]}

def review_name(db_path,mid,revision,title,studio,universe,variant,status,official_url="",notes=""):
    mid=int(mid)
    if status not in {"revisar","confirmado"}:raise ValueError("Estado inválido")
    title=str(title or "").strip()
    studio=str(studio or "").strip()
    universe=str(universe or "").strip()
    variant=str(variant or "").strip()
    if len(title)>170 or len(studio)>120 or len(universe)>120 or len(variant)>160:
        raise ValueError("Texto muito longo")
    official_url=str(official_url or "").strip()
    if status=="confirmado":
        if not title or not studio:raise ValueError("Nome e estúdio obrigatórios")
        u=urlparse(official_url)
        if u.scheme!="https" or not u.netloc or u.username or u.password:
            raise ValueError("Confirmação exige fonte oficial HTTPS")
    with smart.db_open(db_path) as db:
        setup(db)
        a=db.execute("SELECT source_relative FROM assets WHERE message_id=?",(mid,)).fetchone()
        if not a:raise ValueError("Imagem não encontrada")
        new_name=proposed_name({"title":title,"variant":variant},mid,a["source_relative"]) if title else ""
        change=db.execute("""UPDATE name_proposals SET studio=?,title=?,universe=?,
            variant=?,filename=?,status=?,confidence=?,official_url=?,notes=?,
            revision=revision+1,modified_at=? WHERE message_id=? AND revision=?""",
            (studio,title,universe,variant,new_name,status,
             1.0 if status=="confirmado" else 0.0,official_url,notes[:1000],
             smart.utc(),mid,int(revision)))
        if change.rowcount!=1:raise RuntimeError("Conflito de versão; recarregue")
        db.execute("""INSERT INTO name_proposal_events(message_id,event_type,evidence,occurred_at)
            VALUES(?,?,?,?)""",(mid,"manual_"+status,official_url or notes[:250],smart.utc()))
        db.commit()
    return {"ok":True,"revision":int(revision)+1,"filename":new_name,"status":status}

def export_manifest(db_path,destination):
    """Lista nomes sugeridos, caminhos de origem e evidência; não gera hardlinks."""
    output=Path(destination)
    output.parent.mkdir(parents=True,exist_ok=True)
    tmp=output.with_suffix(".tmp")
    with smart.db_open(db_path) as db, tmp.open("w",newline="",encoding="utf-8-sig") as fh:
        setup(db)
        smart.setup(db)
        writer=csv.writer(fh,delimiter=";")
        writer.writerow(["message_id","status","studio","nome_modelo","universo",
            "versao","nome_arquivo_proposto","arquivo_original","sha256",
            "evidencia_tipo","evidencia_telegram","fonte_oficial",
            "galeria_id","galeria_nome","fotos_na_galeria","prova_agrupamento",
            "aprovado_para_publicacao"])
        count=0
        for r in db.execute("""SELECT p.*,a.source_relative,a.sha256,
            g.group_key AS gallery_key,g.title AS gallery_title,
            m.match_reason,(SELECT COUNT(*) FROM model_group_members x
              WHERE x.group_key=m.group_key) AS gallery_photos
            FROM name_proposals p JOIN assets a USING(message_id)
            LEFT JOIN model_group_members m USING(message_id)
            LEFT JOIN model_groups g ON g.group_key=m.group_key
            ORDER BY a.message_id"""):
            mid=r["evidence_message_id"] or r["message_id"]
            writer.writerow([r["message_id"],r["status"],r["studio"],r["title"],
                r["universe"],r["variant"],r["filename"],r["source_relative"],
                r["sha256"],r["evidence_type"],SOURCE_C+str(mid),
                r["official_url"],r["gallery_key"] or "",r["gallery_title"] or "",
                r["gallery_photos"] or "",r["match_reason"] or "","false"])
            count+=1
    tmp.replace(output)
    return {"exported":count,"path":str(output),"size_bytes":output.stat().st_size}


def safe_component(value):
    """Componente seguro de pasta Windows, preservando o nome editorial."""
    bad_chars=set('<>:"/|?*'+chr(92))
    name="".join("_" if ch in bad_chars or ord(ch)<32 else ch for ch in str(value or "")).strip(" .")
    name=name[:90].rstrip(" .") or "sem-nome"
    if name.upper() in INVALID_WINDOWS: name="_"+name
    return name

def materialize_confirmed(db_path,source_root,app_root):
    """Só nomes CONFIRMADOS viram hardlinks na biblioteca B, nunca na origem."""
    import os
    root=Path(source_root).resolve()
    library=Path(app_root)/"modelos-revisados"
    with smart.db_open(db_path) as db:
        setup(db)
        rows=db.execute("""SELECT p.message_id,p.studio,p.title,p.filename,
            a.source_relative,a.sha256 FROM name_proposals p JOIN assets a
            USING(message_id) WHERE p.status='confirmado' AND p.title!=''
            ORDER BY p.message_id""").fetchall()
    created=existing=missing=0
    for item in rows:
        original=(root/item["source_relative"]).resolve()
        if root not in original.parents or not original.is_file():
            missing+=1;continue
        if original.suffix.lower() not in {".jpg",".jpeg",".png",".webp",".gif",".bmp",".tif",".tiff",".avif",".heic",".heif"}:
            missing+=1;continue
        with original.open("rb") as stream:
            digest=hashlib.file_digest(stream,"sha256").hexdigest()
        if digest!=item["sha256"]:
            raise RuntimeError("Original diverge do SHA registrado: msg "+str(item["message_id"]))
        dest=library/safe_component(item["studio"])/safe_component(item["title"])/item["filename"]
        if dest.exists():
            with dest.open("rb") as stream:
                if hashlib.file_digest(stream,"sha256").hexdigest()!=digest:
                    raise RuntimeError("Conflito de conteúdo no destino: "+str(dest))
            existing+=1;continue
        dest.parent.mkdir(parents=True,exist_ok=True)
        os.link(original,dest)
        created+=1
    return {"approved_images":len(rows),"created":created,"existing":existing,
        "missing_original":missing,"root":str(library)}

# Catálogos oficiais verificados, como pistas de pesquisa, NÃO como identificação.
# Tópicos agregados podem conter trabalhos de vários modeladores.
OFFICIAL_STUDIO_PROFILES={
 "Merge Project Figures _ Nostalgic Studios":[
   ("Merge Project Figures","patreon","https://www.patreon.com/cw/MergeProject"),
   ("Merge Project Figures","cults3d","https://cults3d.com/en/users/MergeProjectFigures/3d-models")],
 "Uel Winner_ ilustrartuel":[
   ("Uel Winner","artstation","https://uel.artstation.com/"),
   ("Uel Winner","cults3d","https://cults3d.com/en/users/ilustrartuel/3d-models"),
   ("Uel Winner","patreon","https://www.patreon.com/uelwinner3d")],
 "Abe3D":[
   ("Abe3D","cults3d","https://cults3d.com/en/users/Abe3D/3d-models"),
   ("Abe3D","patreon","https://www.patreon.com/cw/abe3d"),
   ("Abe3D","artstation","https://abe3660.artstation.com/")],
 "Sekai 3D Models":[
   ("Sekai 3D Models","cults3d","https://cults3d.com/en/users/Sekai3DModels/3d-models"),
   ("Sekai 3D Models","patreon","https://www.patreon.com/cw/sekai3dmodels")],
 "Nomnom Figures _ Edythe Cross 3D _ EllaArt":[
   ("Nomnom Figures","patreon","https://www.patreon.com/cw/NomnomFigures")],
 "Kaidan 3D":[
   ("Kaidan 3D","cults3d","https://cults3d.com/en/users/kaidan3d/3d-models"),
   ("Kaidan 3D","patreon","https://www.patreon.com/cw/kaidan3d")],
 "3Dmoonn":[
   ("3Dmoonn","cults3d","https://cults3d.com/en/users/3Dmoonn/3d-models"),
   ("3Dmoonn","patreon","https://www.patreon.com/cw/3Dmoonn")],
 "3DXM":[
   ("3DXM","patreon","https://www.patreon.com/3DXM"),
   ("3DXM","cgtrader","https://www.cgtrader.com/designers/3DPrintingSTL")],
 "Bulkamancer":[
   ("Bulkamancer","website","https://bulkamancer.com/"),
   ("Bulkamancer","cults3d","https://cults3d.com/en/users/Bulkamancer/3d-models")],
 "C27 Collectibles":[
   ("C27 Collectibles","website","https://c27-studios.com/")],
 "Kuton Sculpts":[
   ("Kuton Sculpts","website","https://kutonsculpts.com/"),
   ("Kuton Sculpts","cults3d","https://cults3d.com/en/users/Kuton/3d-models"),
   ("Kuton Sculpts","cgtrader","https://www.cgtrader.com/designers/kutonsculpts"),
   ("Kuton Sculpts","patreon","https://www.patreon.com/kuton_sculpts")],
 "MPPrints _ My Poke Prints":[
   ("MPPrints","cults3d","https://cults3d.com/en/users/MPPrints/3d-models"),
   ("MPPrints","patreon","https://www.patreon.com/mypokeprints")],
 "Momoji":[
   ("Momoji","cults3d","https://cults3d.com/en/users/3DMomoji/3d-models"),
   ("Momoji","patreon","https://www.patreon.com/3Dmomoji")],
 "StepanovSculpts":[
   ("StepanovSculpts","cgtrader","https://www.cgtrader.com/designers/stepanovsculpts"),
   ("StepanovSculpts","etsy","https://www.etsy.com/shop/stepanovsculpts")],
 "Wicked":[
   ("Wicked","cults3d","https://cults3d.com/en/users/Wicked/3d-models"),
   ("Wicked","patreon","https://www.patreon.com/c/3dWicked")]
}

def official_sources(topic):
    """Perfis autênticos encontrados online, sem implicar autoria da imagem."""
    return [{"studio":studio,"provider":provider,"url":url,
             "identity_matched":False,"role":"studio_catalog_reference"}
            for studio,provider,url in OFFICIAL_STUDIO_PROFILES.get(str(topic),[])]

def suggest_name_from_embedded_text(db_path,message_id,title,studio,universe="",variant="",evidence_note=""):
    """Nome visto no próprio cartaz, para revisão; não confirma publicação oficial."""
    mid=int(message_id)
    title=str(title or "").strip()
    studio=str(studio or "").strip()
    universe=str(universe or "").strip()
    variant=str(variant or "").strip()
    if not (title and studio) or max(map(len,(title,studio,universe,variant)))>170:
        raise ValueError("Título de cartaz inválido")
    with smart.db_open(db_path) as db:
        setup(db)
        row=db.execute("""SELECT p.status,p.title,p.revision,a.source_relative
            FROM name_proposals p JOIN assets a USING(message_id)
            WHERE p.message_id=?""",(mid,)).fetchone()
        if row is None:raise ValueError("Mensagem sem indexação")
        # Nunca sobrescrever qualquer proposta prévia ou nome confirmado.
        if row["status"]!="revisar" or (row["title"] or "").strip():
            return {"ok":False,"reason":"existing_proposal_or_review","message_id":mid}
        filename=proposed_name({"title":title,"variant":variant},mid,row["source_relative"])
        stamp=smart.utc()
        updated=db.execute("""UPDATE name_proposals SET title=?,studio=?,universe=?,
            variant=?,filename=?,status='provavel',confidence=0.75,
            evidence_type='embedded_render_title',evidence_message_id=?,
            notes=?,revision=revision+1,modified_at=?
            WHERE message_id=? AND revision=? AND status='revisar'
            AND TRIM(COALESCE(title,''))=''""",
            (title,studio,universe,variant,filename,mid,
             str(evidence_note)[:500] or "Título legível na imagem; validar publicação oficial",
             stamp,mid,row["revision"]))
        if updated.rowcount!=1:raise RuntimeError("Conflito de revisão")
        db.execute("""INSERT INTO name_proposal_events
          (message_id,event_type,evidence,occurred_at) VALUES(?,?,?,?)""",
          (mid,"proposed_from_render",SOURCE_C+str(mid),stamp))
        db.commit()
        return {"ok":True,"message_id":mid,"filename":filename,
                "status":"provavel","revision":row["revision"]+1}

def suggest_name_from_telegram_caption(db_path,message_id,title,studio,universe="",variant="",evidence_note=""):
    """Registra como PROVÁVEL um título conferido na legenda original do Telegram.

    O texto precisa estar presente na legenda do próprio ativo. Não confunde a
    identificação do personagem com a confirmação oficial da escultura, nem
    modifica propostas existentes ou cria um novo agrupamento.
    """
    mid=int(message_id)
    title=str(title or "").strip()
    studio=str(studio or "").strip()
    universe=str(universe or "").strip()
    variant=str(variant or "").strip()
    if not title or not studio or len(title)>170 or len(studio)>120 or len(universe)>120 or len(variant)>160:
        raise ValueError("Nome da legenda inválido")
    with smart.db_open(db_path) as db:
        setup(db)
        row=db.execute("""SELECT p.status,p.title,p.revision,
            a.original_topic,a.source_caption,a.source_relative
            FROM name_proposals p JOIN assets a USING(message_id)
            WHERE p.message_id=?""",(mid,)).fetchone()
        if row is None:
            raise ValueError("Mensagem não indexada")
        caption=smart.normalize(row["source_caption"])
        if not caption or smart.normalize(title) not in caption:
            raise ValueError("Título proposto não consta na legenda original")
        if variant and smart.normalize(variant) not in caption:
            raise ValueError("Versão não consta na legenda original")
        if universe and smart.normalize(universe) not in caption:
            raise ValueError("Universo não consta na legenda original")
        studio_n=smart.normalize(studio)
        topic_n=smart.normalize(row["original_topic"])
        if not studio_n or (studio_n not in topic_n and topic_n not in studio_n):
            raise ValueError("Estúdio não corresponde ao tópico de origem")
        if row["status"]!="revisar" or (row["title"] or "").strip():
            return {"ok":False,"reason":"existing_proposal_or_review","message_id":mid}
        filename=proposed_name({"title":title,"variant":variant},mid,row["source_relative"])
        stamp=smart.utc()
        note=("Título conferido na legenda original do Telegram; "
              "identidade editorial e publicação oficial pendentes. "
              +str(evidence_note or "").strip())[:500]
        changed=db.execute("""UPDATE name_proposals SET
            studio=?,title=?,universe=?,variant=?,filename=?,
            status='provavel',confidence=0.72,
            evidence_type='telegram_caption_curated',evidence_message_id=?,
            notes=?,revision=revision+1,modified_at=?
            WHERE message_id=? AND revision=? AND status='revisar'
              AND TRIM(COALESCE(title,''))=''""",
            (studio,title,universe,variant,filename,mid,note,
             stamp,mid,row["revision"]))
        if changed.rowcount!=1:
            raise RuntimeError("Conflito de revisão")
        db.execute("""INSERT INTO name_proposal_events
            (message_id,event_type,evidence,occurred_at)
            VALUES(?,?,?,?)""",
            (mid,"telegram_caption_curated",SOURCE_C+str(mid),stamp))
        db.commit()
        return {"ok":True,"message_id":mid,"filename":filename,
                "status":"provavel","revision":row["revision"]+1}


def suggest_name_from_studio_catalog(db_path,message_id,title,studio,source_url,
                                    topic,universe="",variant="",evidence_note=""):
    """Sugere SEM CONFIRMAR nome visto no catálogo do modelador + inspeção local.

    A fonte prova que o criador publica um modelo com esse título; não prova,
    por si só, que esta imagem é exatamente a do produto.
    """
    mid=int(message_id)
    fields=[str(s or "").strip() for s in (title,studio,universe,variant)]
    title,studio,universe,variant=fields
    if not title or not studio or max(map(len,fields))>170 or len(studio)>120:
        raise ValueError("Identidade candidata inválida")
    parsed=urlparse(str(source_url or "").strip())
    if parsed.scheme!="https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError("Fonte deve usar HTTPS")
    domain=parsed.hostname.lower().removeprefix("www.")
    sources=official_sources(topic)
    allowed={urlparse(profile["url"]).hostname.lower().removeprefix("www.")
             for profile in sources}
    if not allowed or domain not in allowed:
        raise ValueError("Fonte não pertence a um provedor homologado para este tópico")
    if studio not in {source["studio"] for source in sources}:
        raise ValueError("Estúdio informado não corresponde ao catálogo do tópico")
    with smart.db_open(db_path) as db:
        setup(db)
        a=db.execute("""SELECT p.status,p.title,p.revision,a.source_relative,
                           a.original_topic FROM name_proposals p JOIN assets a
                       USING(message_id) WHERE p.message_id=?""",(mid,)).fetchone()
        if a is None:raise ValueError("Imagem não indexada")
        if a["original_topic"]!=str(topic):
            raise ValueError("Tópico da origem diferente do estúdio pesquisado")
        if a["status"]!="revisar" or a["title"].strip():
            return {"ok":False,"reason":"existing_proposal_or_review","message_id":mid}
        filename=proposed_name({"title":title,"variant":variant},mid,a["source_relative"])
        stamp=smart.utc()
        response=db.execute("""UPDATE name_proposals SET title=?,studio=?,universe=?,
                    variant=?,filename=?,status='provavel',confidence=0.60,
                    evidence_type='studio_catalog_visual_candidate',
                    evidence_message_id=?,official_url=?,notes=?,
                    revision=revision+1,modified_at=?
                    WHERE message_id=? AND revision=? AND status='revisar'
                      AND TRIM(COALESCE(title,''))=''""",
                    (title,studio,universe,variant,filename,mid,source_url,
                     (str(evidence_note or "").strip() or
                      "Catálogo oficial e comparação visual: confirmar correspondência exata")[:1000],
                     stamp,mid,a["revision"]))
        if response.rowcount!=1:raise RuntimeError("Conflito de revisão")
        db.execute("""INSERT INTO name_proposal_events
                    (message_id,event_type,evidence,occurred_at) VALUES(?,?,?,?)""",
                   (mid,"studio_catalog_candidate",source_url,stamp))
        db.commit()
        return {"ok":True,"message_id":mid,"status":"provavel",
                "filename":filename,"revision":a["revision"]+1}

def attach_catalog_reference(db_path,message_id,expected_title,source_url,note=""):
    """Vincula página de produto como referência; NÃO confirma nem muda status."""
    mid=int(message_id)
    u=urlparse(str(source_url or "").strip())
    if u.scheme!="https" or not u.hostname or u.username or u.password:
        raise ValueError("Referência exige HTTPS sem credenciais")
    with smart.db_open(db_path) as db:
        setup(db)
        row=db.execute("""SELECT p.message_id,p.status,p.title,p.studio,p.revision,
                    p.official_url,p.notes,a.original_topic FROM name_proposals p
                    JOIN assets a USING(message_id) WHERE p.message_id=?""",(mid,)).fetchone()
        if row is None or row["status"]!="provavel" or row["title"]!=expected_title:
            raise ValueError("Só é possível vincular fonte a proposta correspondente não confirmada")
        valid=[s for s in official_sources(row["original_topic"])
               if s["studio"]==row["studio"]]
        providers={urlparse(s["url"]).hostname.lower().removeprefix("www.")
                   for s in valid}
        if u.hostname.lower().removeprefix("www.") not in providers:
            raise ValueError("Página não pertence à lista oficial do estúdio")
        if row["official_url"]:
            if row["official_url"]==source_url:
                return {"ok":True,"changed":False,"message_id":mid,"status":"provavel"}
            raise ValueError("Proposta já vinculada a outra página: revisão manual obrigatória")
        stamp=smart.utc()
        hint=(str(note or "").strip() or
              "Publicação encontrada no catálogo do criador; verificar se o render corresponde")
        notes=(row["notes"].rstrip()+"\n"+hint).strip()[:1000]
        updated=db.execute("""UPDATE name_proposals SET official_url=?,notes=?,
                        revision=revision+1,modified_at=?
                        WHERE message_id=? AND revision=? AND status='provavel'
                        AND official_url=''""",
                        (source_url,notes,stamp,mid,row["revision"]))
        if updated.rowcount!=1:raise RuntimeError("Revisão mudou; recarregue a imagem")
        db.execute("""INSERT INTO name_proposal_events
            (message_id,event_type,evidence,occurred_at) VALUES(?,?,?,?)""",
            (mid,"reference_linked",source_url,stamp))
        db.commit()
        return {"ok":True,"changed":True,"message_id":mid,"status":"provavel"}

def propagate_reviewed_gallery_names(db_path,limit=300,group_key=None):
    """Herdar proposta de nome entre VISTAS JÁ REVISADAS da mesma escultura.

    Não se usa similaridade automática, proximidade, mesmo personagem ou
    coincidência de título para definir a galeria. Grupos são os revisados
    manualmente por `model_gallery.register_visual_gallery`.
    Quando group_key é informado, processa somente essa galeria, evitando
    percorrer todas as demais em revisões incrementais.
    """
    limit=max(1,min(int(limit),1000))
    changed=skipped_conflicts=0
    with smart.db_open(db_path) as db:
        setup(db)
        smart.setup(db)
        db.execute("BEGIN IMMEDIATE")
        query="""SELECT DISTINCT g.group_key FROM model_groups g
            JOIN model_group_members m USING(group_key)
            WHERE g.state='revisar' AND m.match_reason='reviewed_angles'"""
        parameters=()
        if group_key is not None:
            query+=" AND g.group_key=?"
            parameters=(str(group_key),)
        groups=db.execute(query+" ORDER BY g.group_key",parameters).fetchall()
        # A chamada pontual pode recusar qualquer proposta previamente editada
        # pela revisao > 0, sem varrer todo o historico de eventos da biblioteca.
        # A chamada geral conserva a verificacao completa do historico manual.
        if group_key is None:
            manual={r[0] for r in db.execute(
                "SELECT DISTINCT message_id FROM name_proposal_events WHERE event_type LIKE 'manual_%'")}
        else:
            manual=set()
        for g in groups:
            members=db.execute("""SELECT p.message_id,p.studio,p.title,p.universe,
                  p.variant,p.status,p.confidence,p.evidence_type,p.notes,
                  p.official_url,p.revision,a.source_relative
                FROM model_group_members m JOIN name_proposals p
                ON p.message_id=m.message_id JOIN assets a USING(message_id)
                WHERE m.group_key=? ORDER BY p.message_id""",
                (g["group_key"],)).fetchall()
            named=[r for r in members if (r["title"] or "").strip()]
            if not named:continue
            identities={(smart.normalize(r["studio"]),smart.normalize(r["title"]),
                         smart.normalize(r["universe"]),smart.normalize(r["variant"]))
                        for r in named}
            if len(identities)!=1:
                skipped_conflicts+=1
                continue
            origin=sorted(named,key=lambda r:(r["status"]!="confirmado",
                 r["evidence_type"] not in {"telegram_caption","embedded_render_title"},
                 r["message_id"]))[0]
            for dest in members:
                if changed>=limit:break
                if (dest["status"]!="revisar" or (dest["title"] or "").strip()
                    or dest["notes"] or dest["official_url"] or dest["message_id"] in manual
                    or (group_key is not None and dest["revision"]!=0)):
                    continue
                stamp=smart.utc()
                filename=proposed_name({"title":origin["title"],"variant":origin["variant"]},
                    dest["message_id"],dest["source_relative"])
                updated=db.execute("""UPDATE name_proposals SET studio=?,title=?,
                    universe=?,variant=?,filename=?,status='provavel',
                    confidence=?,evidence_type='gallery_name_inherited',
                    evidence_message_id=?,notes=?,revision=revision+1,modified_at=?
                    WHERE message_id=? AND revision=? AND status='revisar'
                    AND TRIM(COALESCE(title,''))='' AND TRIM(COALESCE(notes,''))=''
                    AND TRIM(COALESCE(official_url,''))=''""",
                    (origin["studio"],origin["title"],origin["universe"],origin["variant"],
                     filename,min(0.66,float(origin["confidence"] or 0.66)),
                     origin["message_id"],
                     "Nome proposto a partir de outra vista da mesma escultura em galeria revisada; requer verificação oficial.",
                     stamp,dest["message_id"],dest["revision"]))
                if updated.rowcount:
                    db.execute("""INSERT INTO name_proposal_events
                      (message_id,event_type,evidence,occurred_at)
                      VALUES(?,?,?,?)""",
                      (dest["message_id"],"gallery_name_inherited",
                       SOURCE_C+str(origin["message_id"]),stamp))
                    changed+=1
            if changed>=limit:break
        db.commit()
    return {"inherited_names":changed,"conflicting_galleries":skipped_conflicts}


