#!/usr/bin/env python3
"""Operações incrementais de galerias na curadoria canônica TONART.

Complementa a criação de grupos: mantém o mesmo SQLite e os mesmos IDs.
Sem fusão, identificação, licença ou publicação automática.
"""
from __future__ import annotations
import re
import model_gallery as gallery
import smart_curadoria as smart


def candidates(db_path, group_key, page=1, limit=48, query=""):
    """Busca imagens livres do mesmo álbum ou por pesquisa explícita no tópico."""
    key=str(group_key or "")
    if not re.fullmatch(r"[0-9a-f]{24}",key):
        raise ValueError("ID de galeria inválido")
    page=max(1,int(page))
    limit=max(1,min(120,int(limit)))
    query=str(query or "").strip()[:120]
    with smart.db_open(db_path,readonly=True) as db:
        group=db.execute("SELECT group_key FROM model_groups WHERE group_key=?",(key,)).fetchone()
        if not group:raise ValueError("Galeria não encontrada")
        topics=db.execute("""SELECT DISTINCT a.original_topic FROM model_group_members m
            JOIN assets a USING(message_id) WHERE m.group_key=?""",(key,)).fetchall()
        if len(topics)!=1:raise ValueError("Origem da galeria inconsistente")
        topic=topics[0][0]
        clause="""FROM assets a LEFT JOIN model_group_members m USING(message_id)
            LEFT JOIN name_proposals p USING(message_id)
            WHERE a.original_topic=? AND m.message_id IS NULL"""
        args=[topic]
        if query:
            clause+=" AND (p.title LIKE ? OR a.source_caption LIKE ? OR a.source_album LIKE ?)"
            args+=["%"+query+"%"]*3
        else:
            clause+=""" AND TRIM(COALESCE(a.source_album,''))!=''
                AND EXISTS(SELECT 1 FROM assets ga JOIN model_group_members gm
                  ON gm.message_id=ga.message_id
                  WHERE gm.group_key=? AND ga.original_topic=a.original_topic
                    AND ga.source_album=a.source_album)"""
            args.append(key)
        count=db.execute("SELECT COUNT(*) "+clause,args).fetchone()[0]
        items=db.execute("""SELECT a.message_id,a.source_caption,a.source_album,a.sha256,
            p.title,p.studio,p.variant,p.status """+clause+
            " ORDER BY a.message_id LIMIT ? OFFSET ?",
            args+[limit,(page-1)*limit]).fetchall()
        return {"group_key":key,"topic":topic,"mode":"search" if query else "same_album",
                "page":page,"limit":limit,"total":count,"has_more":page*limit<count,
                "items":[dict(r) for r in items]}


def append(db_path, group_key, revision, message_ids, note=""):
    """Acrescenta fotos à galeria existente em lotes atômicos e revisionados.

    Lotes de até 500 mantêm tempo/SQL limitados sem limitar o tamanho final.
    Reusa model_group_members e model_group_evidence; nunca move outro grupo.
    """
    key=str(group_key or "")
    if not re.fullmatch(r"[0-9a-f]{24}",key):
        raise ValueError("ID de galeria inválido")
    if not isinstance(message_ids,(list,tuple)) or not 1<=len(message_ids)<=500:
        raise ValueError("Selecione de 1 a 500 fotos por lote")
    if any(type(mid) is not int or not 0<mid<=9007199254740991 for mid in message_ids):
        raise ValueError("Mensagem inválida")
    ids=list(message_ids)
    if len(ids)!=len(set(ids)):raise ValueError("Mensagens duplicadas")
    try:revision=int(revision)
    except (TypeError,ValueError) as exc:raise ValueError("Revisão obrigatória") from exc
    if revision<0:raise ValueError("Revisão inválida")
    stamp=smart.utc()
    with smart.db_open(db_path) as db:
        smart.setup(db)
        db.execute("BEGIN IMMEDIATE")
        g=db.execute("""SELECT studio,title,universe,variant,state,revision
            FROM model_groups WHERE group_key=?""",(key,)).fetchone()
        if g is None:raise ValueError("Galeria inexistente")
        if g["revision"]!=revision:raise RuntimeError("Revisão concorrente; recarregue a galeria")
        if g["state"]=="confirmado":raise ValueError("Galeria confirmada exige revisão editorial")
        topics=db.execute("""SELECT DISTINCT a.original_topic FROM model_group_members m
            JOIN assets a USING(message_id) WHERE m.group_key=?""",(key,)).fetchall()
        if len(topics)!=1:raise ValueError("Grupo sem origem única")
        found={}
        for offset in range(0,len(ids),200):
            batch=ids[offset:offset+200]
            for r in db.execute("""SELECT a.message_id,a.original_topic,p.studio,p.title,
                p.universe,p.variant,m.group_key previous_key
                FROM assets a LEFT JOIN name_proposals p USING(message_id)
                LEFT JOIN model_group_members m USING(message_id)
                WHERE a.message_id IN ("""+",".join("?" for _ in batch)+")",batch):
                found[r["message_id"]]=r
        if len(found)!=len(ids):raise ValueError("Foto não encontrada no Telegram")
        added=[]
        for mid in ids:
            r=found[mid]
            if r["original_topic"]!=topics[0][0]:
                raise ValueError("Não misturar tópicos de origem")
            if r["previous_key"] not in (None,key):
                raise ValueError("Foto já pertence a outra galeria")
            for field in ("studio","title","universe","variant"):
                incoming=(r[field] or "").strip()
                current=(g[field] or "").strip()
                if field=="title" and current.startswith("Modelo sem nome #"):continue
                if incoming and current and smart.normalize(incoming)!=smart.normalize(current):
                    raise ValueError(f"Identidade divergente na foto #{mid}: {field}")
            if r["previous_key"] is None:added.append(mid)
        if not added:
            total=db.execute("SELECT COUNT(*) FROM model_group_members WHERE group_key=?",(key,)).fetchone()[0]
            return {"group_key":key,"added":0,"total_images":total,"revision":revision}
        changed=db.execute("""UPDATE model_groups SET revision=revision+1,state='revisar',
            updated_at=? WHERE group_key=? AND revision=?""",(stamp,key,revision))
        if changed.rowcount!=1:raise RuntimeError("Revisão concorrente")
        for mid in added:
            db.execute("""INSERT INTO model_group_members(message_id,group_key,match_reason,updated_at)
                VALUES(?,?,'reviewed_angles',?)""",(mid,key,stamp))
            db.execute("""INSERT OR IGNORE INTO model_group_evidence
                (group_key,source_url,source_type,description,recorded_at)
                VALUES(?,?,?,?,?)""",(key,smart.SOURCE_C+str(mid),"visual_review",
                str(note or "Nova vista conferida; identidade e direitos não confirmados")[:500],stamp))
        db.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
            VALUES(?,'gallery_photos_added',?,?)""",
            (key,"IDs "+",".join(map(str,added)),stamp))
        total=db.execute("SELECT COUNT(*) FROM model_group_members WHERE group_key=?",(key,)).fetchone()[0]
        db.commit()
        return {"group_key":key,"added":len(added),"total_images":total,
                "revision":revision+1,"state":"revisar"}
