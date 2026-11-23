#!/usr/bin/env python3
"""Operações incrementais de galerias na curadoria canônica TONART.

Complementa a criação de grupos: mantém o mesmo SQLite e os mesmos IDs.
Sem fusão, identificação, licença ou publicação automática.
"""
from __future__ import annotations
import re
import json
import hashlib
from pathlib import Path
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

def merged_key(db_path,key):
    """Resolve old private gallery links from canonical audit events."""
    if not isinstance(key,str) or not re.fullmatch("[0-9a-f]{24}",key):
        raise ValueError("ID inválido")
    with smart.db_open(db_path,readonly=True) as db:
        for _ in range(8):
            if db.execute("SELECT 1 FROM model_groups WHERE group_key=?",(key,)).fetchone():
                return key
            row=db.execute("SELECT detail FROM curation_events WHERE group_key=? AND event_type='gallery_merged_into' ORDER BY event_id DESC LIMIT 1",(key,)).fetchone()
            if not row:return key
            following=json.loads(row["detail"])["target"]
            if not re.fullmatch("[0-9a-f]{24}",following) or following==key:
                raise ValueError("Histórico de fusão inválido")
            key=following
    raise ValueError("Fusões encadeadas em excesso")


def merge_reviewed(db_path,*,target,source,target_rev,source_rev,proofs,note,media_root):
    """Atomic cross-gallery visual merge; no automated naming or licensing."""
    if (not all(isinstance(k,str) and re.fullmatch("[0-9a-f]{24}",k) for k in (target,source))
            or target==source):raise ValueError("Galerias distintas obrigatórias")
    if any(type(x) is not int or x<0 for x in (target_rev,source_rev)):
        raise ValueError("Revisões inválidas")
    note=str(note or "").strip()
    if not 45<=len(note)<=500:raise ValueError("Descreva a evidência visual da MESMA estatueta")
    if (type(proofs) is not list or not 2<=len(proofs)<=48
            or any(type(x) is not dict or set(x)!={'message_id','sha256'}
            or type(x['message_id']) is not int or x['message_id']<=0
            or type(x['sha256']) is not str or not re.fullmatch('[0-9a-f]{64}',x['sha256'])
            for x in proofs)):raise ValueError("Provas SHA-256 completas obrigatórias")
    hashes={x['message_id']:x['sha256'] for x in proofs}
    if len(hashes)!=len(proofs):raise ValueError("IDs repetidos")
    root=Path(media_root).resolve()
    stamp=smart.utc()
    with smart.db_open(db_path) as db:
        smart.setup(db)
        db.execute("BEGIN IMMEDIATE")
        groups=[db.execute("SELECT * FROM model_groups WHERE group_key=?",(k,)).fetchone() for k in (target,source)]
        dest,old=groups
        if not dest or not old:raise ValueError("Galeria ausente: recarregue")
        if (dest['revision'],old['revision'])!=(target_rev,source_rev):
            raise RuntimeError("Revisão concorrente: recarregue as galerias")
        if 'confirmado' in (dest['state'],old['state']):raise ValueError("Grupo confirmado exige outra revisão")
        if dest['studio'].casefold()=='geral + 50k':raise ValueError("Origem geral excluída")
        for field in ('studio','title','universe','variant'):
            if smart.normalize(dest[field])!=smart.normalize(old[field]):
                raise ValueError("Divergência de modelo/variante: "+field)
        members={}
        for k in (target,source):
            if not db.execute("SELECT 1 FROM curation_events WHERE group_key=? AND event_type='visual_gallery_audited' LIMIT 1",(k,)).fetchone():
                raise ValueError("Ambas galerias precisam de auditoria visual anterior")
            rows=db.execute("SELECT m.message_id,a.sha256,a.source_relative,a.original_topic,p.studio,p.title,p.universe,p.variant FROM model_group_members m JOIN assets a USING(message_id) JOIN name_proposals p USING(message_id) WHERE m.group_key=? ORDER BY m.message_id",(k,)).fetchall()
            if not rows:raise ValueError("Galeria vazia")
            members[k]=rows
        expected={r['message_id'] for k in members for r in members[k]}
        if expected!=set(hashes) or len(expected)!=len(proofs):
            raise RuntimeError("Fotos alteradas: prova não cobre todos os membros")

        for k,rows in members.items():
            for r in rows:
                if r['original_topic']!=dest['studio']:
                    raise ValueError("Tópico Telegram divergente")
                for field in ('studio','title','universe','variant'):
                    if smart.normalize(r[field])!=smart.normalize(dest[field]):
                        raise ValueError("Foto com variante divergente: "+field)
                img=(root/r['source_relative']).resolve()
                if not img.is_relative_to(root) or not img.is_file():
                    raise ValueError("Original ausente ou caminho externo")
                with img.open('rb') as fd:
                    digest=hashlib.file_digest(fd,'sha256').hexdigest()
                if r['sha256']!=hashes[r['message_id']] or digest!=r['sha256']:
                    raise ValueError("SHA-256 físico divergente da fonte")
        updated=db.execute("UPDATE model_groups SET state='revisar',revision=revision+1,updated_at=? WHERE group_key=? AND revision=?",(stamp,target,target_rev))
        if updated.rowcount!=1:raise RuntimeError("Revisão concorrente")
        moved=db.execute("UPDATE model_group_members SET group_key=?,match_reason='reviewed_cross_gallery_angles',updated_at=? WHERE group_key=?",(target,stamp,source))
        if moved.rowcount!=len(members[source]):raise RuntimeError("Membros alterados concorrentemente")
        db.execute("INSERT OR IGNORE INTO model_group_evidence (group_key,source_url,source_type,description,recorded_at) SELECT ?,source_url,source_type,description,recorded_at FROM model_group_evidence WHERE group_key=?",(target,source))
        db.execute("DELETE FROM model_group_evidence WHERE group_key=?",(source,))
        deleted=db.execute("DELETE FROM model_groups WHERE group_key=? AND revision=?",(source,source_rev))
        if deleted.rowcount!=1:raise RuntimeError("Fusão incompleta")
        digest=hashlib.sha256(json.dumps(sorted(hashes.items())).encode()).hexdigest()
        detail=json.dumps({'target':target,'source':source,
            'moved':[r['message_id'] for r in members[source]],
            'before_target':[r['message_id'] for r in members[target]],
            'proof_sha256':digest,'visual_evidence':note,
            'identity_approved':False,'rights_approved':False},
            ensure_ascii=False,sort_keys=True)
        for key,kind in ((target,'gallery_merged_from'),(source,'gallery_merged_into')):
            db.execute("INSERT INTO curation_events(group_key,event_type,detail,occurred_at) VALUES(?,?,?,?)",(key,kind,detail,stamp))
        db.commit()
        return {'group_key':target,'source_key':source,'moved':moved.rowcount,
            'total_images':len(expected),'revision':target_rev+1,'state':'revisar',
            'names_changed':False,'rights_changed':False}

def cross_gallery_candidates(db_path, studio, page=1, limit=24, max_gap=120):
    """Read-only shortlist, NEVER a similarity assertion or an auto-merge."""
    from collections import defaultdict
    from itertools import combinations
    studio=str(studio or "").strip()
    if not studio or len(studio)>120 or studio.casefold()=="geral + 50k":
        raise ValueError("Coleção específica obrigatória")
    try:
        page=int(page);limit=int(limit);max_gap=int(max_gap)
    except (ValueError,TypeError) as exc:raise ValueError("Paginação inválida") from exc
    if not 1<=page<=10000 or limit not in (12,24,48) or not 1<=max_gap<=500:
        raise ValueError("Limite ou distância inválida")
    with smart.db_open(db_path,readonly=True) as db:
        data=db.execute("""SELECT g.group_key,g.studio,g.title,g.universe,
            g.variant,g.state,g.revision,MIN(m.message_id) first_id,
            COUNT(m.message_id) photo_count
            FROM model_groups g JOIN model_group_members m USING(group_key)
            WHERE g.studio=? GROUP BY g.group_key ORDER BY first_id""",(studio,)).fetchall()
        buckets=defaultdict(list)
        for item in data:
            if item['state']=='confirmado':continue
            key=tuple(smart.normalize(item[f]) for f in ('studio','title','universe','variant'))
            buckets[key].append(item)
        rejected={}
        for event in db.execute("SELECT group_key,detail FROM curation_events WHERE event_type='gallery_pair_distinct_sculptures'"):
            try:
                info=json.loads(event['detail'])
                rejected[(event['group_key'],info['other'])]=(info['revision_self'],info['revision_other'])
            except (ValueError,KeyError,TypeError):continue
        pairs=[]
        for rows in buckets.values():
            for a,b in combinations(rows,2):
                gap=abs(a['first_id']-b['first_id'])
                if gap>max_gap:continue
                left,right=sorted((a['group_key'],b['group_key']))
                revisions={a['group_key']:a['revision'],b['group_key']:b['revision']}
                if rejected.get((left,right))==(revisions[left],revisions[right]):
                    continue
                pairs.append({
                    'studio':studio,'title':a['title'],
                    'universe':a['universe'],'variant':a['variant'],
                    'group_a':a['group_key'],'group_b':b['group_key'],
                    'first_a':a['first_id'],'first_b':b['first_id'],
                    'photos_a':a['photo_count'],'photos_b':b['photo_count'],
                    'revision_a':a['revision'],'revision_b':b['revision'],
                    'message_gap':gap,'reason':'same_label_nearby_posts_only',
                    'automatic_merge':False,'requires_visual_comparison':True})
        pairs.sort(key=lambda r:(r['message_gap'],r['title'].casefold(),r['first_a'],r['first_b']))
        start=(page-1)*limit
        return {'studio':studio,'total':len(pairs),'page':page,'limit':limit,
            'has_more':start+limit<len(pairs),
            'items':pairs[start:start+limit],
            'read_only':True,'automatic_merge':False,
            'warning':'Mesmo título ou data próxima não prova mesma estatueta; comparar base, pose, peças e fotos originais.'}

def reject_pair(db_path,*,group_a,group_b,revision_a,revision_b,note):
    """Remember a human-reviewed negative comparison; no model rows changed."""
    if (not all(isinstance(k,str) and re.fullmatch("[0-9a-f]{24}",k) for k in (group_a,group_b))
            or group_a==group_b):raise ValueError("Duas galerias válidas obrigatórias")
    if type(revision_a) is not int or type(revision_b) is not int or min(revision_a,revision_b)<0:
        raise ValueError("Revisões CAS obrigatórias")
    note=str(note or "").strip()
    if not 45<=len(note)<=500:raise ValueError("Descreva qual geometria/pose/base é diferente")
    ordered=sorted([group_a,group_b])
    revisions={group_a:revision_a,group_b:revision_b}
    a,b=ordered
    stamp=smart.utc()
    with smart.db_open(db_path) as db:
        smart.setup(db)
        db.execute("BEGIN IMMEDIATE")
        rows=[db.execute("SELECT studio,title,universe,variant,state,revision FROM model_groups WHERE group_key=?",(key,)).fetchone() for key in ordered]
        if not all(rows):raise ValueError("Galeria inexistente ou já reunida")
        if any(x['revision']!=revisions[key] for x,key in zip(rows,ordered)):
            raise RuntimeError("Revisão concorrente, recarregue a comparação")
        for field in ('studio','title','universe','variant'):
            if smart.normalize(rows[0][field])!=smart.normalize(rows[1][field]):
                raise ValueError("Os grupos já têm metadados diferentes")
        previous=db.execute("SELECT detail FROM curation_events WHERE group_key=? AND event_type='gallery_pair_distinct_sculptures' ORDER BY event_id DESC",(a,)).fetchall()
        for record in previous:
            try:
                x=json.loads(record['detail'])
                if (x['other'],x['revision_self'],x['revision_other'])==(b,revisions[a],revisions[b]):
                    return {'recorded':False,'already_reviewed':True,'group_a':a,'group_b':b}
            except (KeyError,TypeError,ValueError):continue
        detail=json.dumps({'other':b,'revision_self':revisions[a],
            'revision_other':revisions[b],'visual_evidence':note,
            'names_changed':False,'rights_changed':False},
            ensure_ascii=False,sort_keys=True)
        db.execute("INSERT INTO curation_events(group_key,event_type,detail,occurred_at) VALUES(?,'gallery_pair_distinct_sculptures',?,?)",(a,detail,stamp))
        db.commit()
        return {'recorded':True,'already_reviewed':False,'group_a':a,'group_b':b}
