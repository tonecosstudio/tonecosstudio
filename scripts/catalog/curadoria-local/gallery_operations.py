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

def _visual_same_render(image_a, image_b, *, threshold=1.5):
    """Compare decoded pixels; hashes alone are NOT same-sculpture evidence."""
    from PIL import Image, ImageOps, ImageChops, ImageStat
    def open_sample(path):
        with Image.open(path) as image:
            image.draft("RGB",(128,128))
            image=ImageOps.exif_transpose(image).convert("RGB")
            ratio=image.width/image.height
            thumb=image.resize((96,96),Image.Resampling.BILINEAR)
            return ratio,thumb
    ra,ia=open_sample(image_a);rb,ib=open_sample(image_b)
    if abs(ra-rb)>0.012:return None
    stat=ImageStat.Stat(ImageChops.difference(ia,ib))
    mae=sum(stat.mean)/3
    return round(mae,4) if mae<=threshold else None


def cross_caption_visual_candidates(db_path, media_root, studio="Wicked", limit=12):
    """Reuses existing dHash/aHash SSOT, then strictly compares decoded pixels.

    A candidate is the SAME render, not proof of the same package/license.
    No writes, no other index, no background scan.
    """
    from functools import lru_cache
    studio=str(studio or "").strip()
    if not studio or len(studio)>120 or studio.casefold()=="geral + 50k":
        raise ValueError("Selecione um estúdio específico")
    try:limit=int(limit)
    except (TypeError,ValueError) as exc:raise ValueError("Limite inválido") from exc
    if limit not in (12,24,48):raise ValueError("Limite inválido")
    media_root=Path(media_root).resolve()
    with smart.db_open(db_path,readonly=True) as db:
        rows=db.execute("""SELECT f.message_id,f.dhash,f.ahash,f.width,f.height,
            g.group_key,g.title,g.universe,g.variant,g.revision,
            a.sha256,a.source_relative
            FROM visual_fingerprints f
            JOIN assets a USING(message_id)
            JOIN model_group_members m USING(message_id)
            JOIN model_groups g USING(group_key)
            WHERE g.studio=? AND f.method='dhash-ahash-v1'
              AND f.source_sha=a.sha256 AND f.dhash IS NOT NULL
              ORDER BY f.message_id""",(studio,)).fetchall()
        if len(rows)>1800:
            raise ValueError("Estúdio excede limite de comparação de um lote")
        data=[dict(r) for r in rows]
        for item in data:
            item["d"]=int(item["dhash"],16)
            item["a"]=int(item["ahash"],16)
        possible=[]
        for i,a in enumerate(data):
            for b in data[i+1:]:
                if a['group_key']==b['group_key']:continue
                if (smart.normalize(a['title']),smart.normalize(a['universe']))==(
                    smart.normalize(b['title']),smart.normalize(b['universe'])):continue
                if abs(a['width']/a['height']-b['width']/b['height'])>0.02:continue
                d=(a['d']^b['d']).bit_count();h=(a['a']^b['a']).bit_count()
                if d<=7 and h<=8:possible.append((d+h,a,b))
        possible.sort(key=lambda x:(x[0],x[1]['message_id'],x[2]['message_id']))
        if len(possible)>240:
            possible=possible[:240]
        confirmed=[]
        for _,a,b in possible:
            paths=[]
            for row in (a,b):
                f=(media_root/row["source_relative"]).resolve()
                if (not f.is_relative_to(media_root) or not f.is_file()
                        or f.stat().st_size>30*1024*1024):
                    paths=[];break
                paths.append(f)
            if len(paths)!=2:continue
            try:score=_visual_same_render(*paths)
            except (OSError,ValueError):continue
            if score is None:continue
            confirmed.append({
                "studio":studio,"group_a":a['group_key'],"group_b":b['group_key'],
                "message_a":a["message_id"],"message_b":b["message_id"],
                "title_a":a["title"],"title_b":b["title"],
                "universe_a":a["universe"],"universe_b":b["universe"],
                "variant_a":a["variant"],"variant_b":b["variant"],
                "revision_a":a["revision"],"revision_b":b["revision"],
                "pixel_mae":score,"same_render":True,
                "same_stl_or_license":False,"automatic_merge":False})
        confirmed.sort(key=lambda x:(x['pixel_mae'],x['message_a'],x['message_b']))
        return {"studio":studio,"fingerprints_compared":len(data),
            "approximate_pairs_examined":len(possible),
            "total":len(confirmed),"items":confirmed[:limit],
            "read_only":True,"automatic_merge":False,
            "warning":"Imagem praticamente igual NÃO prova pacote STL ou direitos; revisar cada legenda."}

def correct_cross_caption(db_path, media_root, *, target_key, reference_key,
                          target_rev, reference_rev, target_mid, reference_mid, note):
    """Correct one wrong caption by physical proof of almost identical renders."""
    import name_curadoria as naming
    if (not all(isinstance(k,str) and re.fullmatch("[0-9a-f]{24}",k)
                for k in (target_key,reference_key)) or target_key==reference_key):
        raise ValueError("Selecione duas galerias válidas")
    if (any(type(x) is not int or x<0 for x in (target_rev,reference_rev))
            or any(type(x) is not int or x<=0 for x in (target_mid,reference_mid))):
        raise ValueError("IDs e revisões CAS obrigatórios")
    note=str(note or "").strip()
    if not 60<=len(note)<=600:
        raise ValueError("Descreva erro de legenda e evidência visual (60+ caracteres)")
    root=Path(media_root).resolve()
    stamp=smart.utc()
    with smart.db_open(db_path) as db:
        smart.setup(db);naming.setup(db)
        db.execute('BEGIN IMMEDIATE')
        target=db.execute("SELECT * FROM model_groups WHERE group_key=?",(target_key,)).fetchone()
        ref=db.execute("SELECT * FROM model_groups WHERE group_key=?",(reference_key,)).fetchone()
        if not target or not ref:raise ValueError("Galeria ausente; recarregue")
        if (target['revision'],ref['revision'])!=(target_rev,reference_rev):
            raise RuntimeError("Revisão concorrente")
        if target['studio']!=ref['studio'] or target['studio'].casefold()=='geral + 50k':
            raise ValueError("Estúdios incompatíveis")
        if (target['state']=='confirmado' or ref['state']=='confirmado'
                or not ref['title'] or not ref['universe']):
            raise ValueError("Estado editorial incompatível")
        if (target['title'],target['universe'])==(ref['title'],ref['universe']):
            raise ValueError("Nenhuma legenda divergente")
        for key in (target_key,reference_key):
            if not db.execute("SELECT 1 FROM curation_events WHERE group_key=? AND event_type='visual_gallery_audited'",(key,)).fetchone():
                raise ValueError("Falta auditoria visual prévia")
        if db.execute("SELECT COUNT(*) FROM model_group_members WHERE group_key=?",(target_key,)).fetchone()[0]!=1:
            raise ValueError("Grupo de várias fotos exige auditoria específica")
        imgs=[]
        for key,mid in ((target_key,target_mid),(reference_key,reference_mid)):
            row=db.execute("""SELECT a.message_id,a.sha256,a.source_relative,a.original_topic,
                p.title,p.universe,p.variant,p.status,p.revision AS image_revision,p.notes
                FROM model_group_members m JOIN assets a USING(message_id)
                JOIN name_proposals p USING(message_id)
                WHERE m.group_key=? AND a.message_id=?""",(key,mid)).fetchone()
            if not row or row['original_topic']!=target['studio']:
                raise ValueError("Mensagem não pertence à galeria")
            imgs.append(row)
        t,r=imgs
        if (t['title'],t['universe'],t['variant'])!=(target['title'],target['universe'],target['variant']):
            raise ValueError("Metadados alvo divergentes")
        if (r['title'],r['universe'])!=(ref['title'],ref['universe']):
            raise ValueError("Metadados de referência divergentes")
        if t['status']=='confirmado':raise ValueError("Nome já confirmado, requer outra revisão")
        photos=[]
        for row in imgs:
            path=(root/row['source_relative']).resolve()
            if not path.is_relative_to(root) or not path.is_file() or path.stat().st_size>30*1024*1024:
                raise ValueError("Original ausente ou externo")
            with path.open('rb') as stream:
                digest=hashlib.file_digest(stream,'sha256').hexdigest()
            if digest!=row['sha256']:raise ValueError("SHA-256 físico divergente")
            photos.append(path)
        pixel_mae=_visual_same_render(*photos,threshold=1.5)
        if pixel_mae is None:raise ValueError("Não é o mesmo render")

        filename=naming.proposed_name(
            {'title':ref['title'],'variant':target['variant']},
            target_mid,t['source_relative'])
        updated=db.execute("""UPDATE name_proposals SET title=?,universe=?,
            filename=?,status='revisar',confidence=0.0,
            notes=?,revision=revision+1,modified_at=?
            WHERE message_id=? AND revision=?""",
            (ref['title'],ref['universe'],filename,
             (str(t['notes'] or '')+'\n'+note).strip()[:1000],
             stamp,target_mid,t['image_revision']))
        if updated.rowcount!=1:raise RuntimeError("Foto alterada concorrentemente")
        changed=db.execute("""UPDATE model_groups SET title=?,universe=?,
            state='revisar',revision=revision+1,updated_at=?
            WHERE group_key=? AND revision=?""",
            (ref['title'],ref['universe'],stamp,target_key,target_rev))
        if changed.rowcount!=1:raise RuntimeError("Galeria alterada concorrentemente")
        detail={'target_group_key':target_key,'reference_group_key':reference_key,
            'target_message_id':target_mid,'reference_message_id':reference_mid,
            'sha256':[t['sha256'],r['sha256']],'pixel_mae':pixel_mae,
            'before':{'title':target['title'],'universe':target['universe']},
            'after':{'title':ref['title'],'universe':ref['universe']},
            'variant_kept':target['variant'],'visual_evidence':note,
            'identity_confirmed':False,'publication_approved':False,'packages_merged':False}
        evidence=json.dumps(detail,ensure_ascii=False,sort_keys=True)
        db.execute("""INSERT INTO name_proposal_events(message_id,event_type,evidence,occurred_at)
            VALUES(?,'visual_cross_caption_correction',?,?)""",(target_mid,evidence,stamp))
        for key,other in ((target_key,reference_key),(reference_key,target_key)):
            db.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
                VALUES(?,'gallery_same_sculpture_variant_link',?,?)""",
                (key,json.dumps({**detail,'other_key':other},
                                ensure_ascii=False,sort_keys=True),stamp))
        db.commit()
        return {'target_group_key':target_key,'reference_group_key':reference_key,
            'corrected_message_id':target_mid,'title':ref['title'],
            'universe':ref['universe'],'variant_kept':target['variant'],
            'pixel_mae':pixel_mae,'status':'revisar','target_revision':target_rev+1,
            'groups_merged':False,'rights_changed':False}


def related_sculpture_galleries(db_path, group_key):
    """Display editorial links between gallery variants without merging packages."""
    with smart.db_open(db_path,readonly=True) as db:
        events=db.execute("""SELECT detail FROM curation_events
            WHERE group_key=? AND event_type='gallery_same_sculpture_variant_link'
            ORDER BY event_id DESC LIMIT 20""",(group_key,)).fetchall()
        seen=set();items=[]
        for ev in events:
            try:key=json.loads(ev['detail'])['other_key']
            except (ValueError,KeyError,TypeError):continue
            if key in seen:continue
            row=db.execute("""SELECT g.group_key,g.title,g.universe,g.variant,g.state,
                COUNT(m.message_id) photos, MIN(m.message_id) preview_id
                FROM model_groups g JOIN model_group_members m USING(group_key)
                WHERE g.group_key=? GROUP BY g.group_key""",(key,)).fetchone()
            if row:
                seen.add(key);items.append(dict(row))
        return items

def relate_orphan_variant(db_path,media_root,*,orphan_mid,orphan_revision,
                          reference_key,reference_revision,reference_mid,note):
    """First-class, idempotent single-image VARIANT gallery, never duplicate media.

    Use only when ungrouped photo is physically byte-identical to a visual-
    audited existing gallery but its printing package variant is different.
    """
    if (type(orphan_mid) is not int or type(reference_mid) is not int
        or orphan_mid<=0 or reference_mid<=0 or orphan_mid==reference_mid):
        raise ValueError("Duas mensagens diferentes obrigatórias")
    if type(orphan_revision) is not int or orphan_revision<0:
        raise ValueError("Revisão da foto avulsa obrigatória")
    if type(reference_revision) is not int or reference_revision<0:
        raise ValueError("Revisão da galeria referência obrigatória")
    if not isinstance(reference_key,str) or not re.fullmatch("[0-9a-f]{24}",reference_key):
        raise ValueError("ID de galeria inválido")
    note=str(note or "").strip()
    if not 65<=len(note)<=600:
        raise ValueError("Justifique igualdade física e diferença de pacote (65-600 caracteres)")
    media_root=Path(media_root).resolve()
    stamp=smart.utc()
    with smart.db_open(db_path) as db:
        smart.setup(db)
        db.execute("BEGIN IMMEDIATE")
        orphan=db.execute("""SELECT a.message_id,a.source_relative,a.original_topic,a.sha256,
            p.studio,p.title,p.universe,p.variant,p.status,p.revision,
            m.group_key AS previous_key
            FROM assets a JOIN name_proposals p USING(message_id)
            LEFT JOIN model_group_members m USING(message_id)
            WHERE a.message_id=?""",(orphan_mid,)).fetchone()
        reference=db.execute("SELECT * FROM model_groups WHERE group_key=?",(reference_key,)).fetchone()
        if not orphan or not reference:raise ValueError("Foto ou galeria ausente")
        if orphan['previous_key']:
            old=db.execute("""SELECT detail FROM curation_events
                WHERE group_key=? AND event_type='gallery_variant_singleton_linked'
                ORDER BY event_id DESC LIMIT 1""",(orphan['previous_key'],)).fetchone()
            if old:
                detail=json.loads(old['detail'])
                if (detail.get('orphan_message_id')==orphan_mid and
                    detail.get('reference_group_key')==reference_key):
                    return {'already_linked':True,'group_key':orphan['previous_key'],
                            'source_message_id':orphan_mid,'reference_group_key':reference_key}
            raise ValueError("Foto já vinculada a galeria: recarregue")
        if orphan['revision']!=orphan_revision or reference['revision']!=reference_revision:
            raise RuntimeError("Revisão concorrente: recarregue antes de vincular")
        if (orphan['studio']!=reference['studio'] or
            orphan['original_topic']!=reference['studio'] or
            orphan['studio'].casefold()=="geral + 50k"):
            raise ValueError("Coleções diferentes")
        for key in ("title","universe"):
            if smart.normalize(orphan[key])!=smart.normalize(reference[key]):
                raise ValueError("Título/franquia distintos; exige correção editorial independente")
        if (not orphan['title'] or not orphan['variant']
            or not reference['variant'] or
            smart.normalize(orphan['variant'])==smart.normalize(reference['variant'])):
            raise ValueError("Variantes diferentes e explícitas obrigatórias")
        if not db.execute("SELECT 1 FROM curation_events WHERE group_key=? AND event_type='visual_gallery_audited' LIMIT 1",(reference_key,)).fetchone():
            raise ValueError("Falta auditoria visual da galeria de referência")
        ref=db.execute("""SELECT a.message_id,a.source_relative,a.sha256,a.original_topic
             FROM model_group_members m JOIN assets a USING(message_id)
             WHERE m.group_key=? AND a.message_id=?""",(reference_key,reference_mid)).fetchone()
        if not ref or ref['original_topic']!=orphan['original_topic']:
            raise ValueError("Imagem da referência não pertence à galeria")
        if orphan['sha256']!=ref['sha256']:
            raise ValueError("Imagens diferentes: não vincular variantes só pela legenda")
        for photo in (orphan,ref):
            file=(media_root/photo['source_relative']).resolve()
            if (not file.is_relative_to(media_root) or not file.is_file()
                or file.stat().st_size>30*1024*1024):
                raise ValueError("Original físico ausente ou externo")
            with file.open('rb') as stream:
                digest=hashlib.file_digest(stream,'sha256').hexdigest()
            if digest!=photo['sha256']:
                raise ValueError("SHA-256 físico incompatível")
        key=hashlib.sha256(json.dumps(["visual-variant-singleton-v1",
             orphan['studio'],orphan_mid],ensure_ascii=False).encode()).hexdigest()[:24]
        if db.execute("SELECT 1 FROM model_groups WHERE group_key=?",(key,)).fetchone():
            raise ValueError("Conflito de ID da variante")
        db.execute("""INSERT INTO model_groups
            (group_key,studio,title,universe,variant,state,confidence,revision,created_at,updated_at)
            VALUES(?,?,?,?,?,'revisar',0.0,0,?,?)""",
            (key,orphan['studio'],orphan['title'],orphan['universe'],orphan['variant'],stamp,stamp))
        db.execute("""INSERT INTO model_group_members
            (message_id,group_key,match_reason,updated_at)
            VALUES(?,?,'reviewed_same_render_distinct_variant',?)""",
            (orphan_mid,key,stamp))
        db.execute("""INSERT INTO model_group_evidence
            (group_key,source_url,source_type,description,recorded_at)
            VALUES(?,?,?,?,?)""",
            (key,smart.SOURCE_C+str(orphan_mid),'visual_review_exact_original_sha',
             note[:500],stamp))
        detail={'orphan_message_id':orphan_mid,'reference_message_id':reference_mid,
            'orphan_variant':orphan['variant'],'reference_variant':reference['variant'],
            'reference_group_key':reference_key,'new_group_key':key,
            'sha256':orphan['sha256'],'visual_note':note,
            'same_render':True,'distinct_print_variants':True,
            'identity_approved':False,'rights_approved':False,'published':False}
        proof=json.dumps(detail,ensure_ascii=False,sort_keys=True)
        db.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
            VALUES(?,'gallery_variant_singleton_linked',?,?)""",(key,proof,stamp))
        db.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
            VALUES(?,'visual_gallery_audited',?,?)""",(key,proof,stamp))
        for group,other in ((key,reference_key),(reference_key,key)):
            db.execute("""INSERT INTO curation_events(group_key,event_type,detail,occurred_at)
                VALUES(?,'gallery_same_sculpture_variant_link',?,?)""",
                (group,json.dumps({**detail,'other_key':other},
                                  ensure_ascii=False,sort_keys=True),stamp))
        db.commit()
        return {'already_linked':False,'group_key':key,
            'reference_group_key':reference_key,'source_message_id':orphan_mid,
            'variant':orphan['variant'],'reference_variant':reference['variant'],
            'images_added':1,'source_sha256':orphan['sha256'],
            'state':'revisar','names_approved':False,
            'rights_changed':False,'originals_modified':False,'packages_merged':False}


def split_audited_variant(db_path, media_root, *, group_key, revision,
                          selected_message_id, proofs, corrected_variant,
                          official_url, note):
    """Split ONE proven, wrong-variant photo from a prior-audited two-photo gallery.

    This is not a legacy album re-audit or automatic regroup. The complete
    current member/SHA/name-revision contract and each physical original are
    verified before an atomic split. A dedicated audit supersedes the earlier
    full-gallery assumption; both galleries remain editorial-only.
    """
    import name_curadoria as naming
    from urllib.parse import urlparse

    if not isinstance(group_key, str) or not re.fullmatch("[0-9a-f]{24}", group_key):
        raise ValueError("Galeria invalida")
    if type(revision) is not int or revision < 0:
        raise ValueError("Revisao CAS obrigatoria")
    if type(selected_message_id) is not int or selected_message_id <= 0:
        raise ValueError("Selecione foto fisica")
    variant = str(corrected_variant or "").strip()
    if not 1 <= len(variant) <= 120:
        raise ValueError("Variante revisada obrigatoria")
    note = str(note or "").strip()
    if not 90 <= len(note) <= 650:
        raise ValueError("Prova visual de ambas esculturas, 90-650 caracteres")
    official_url = str(official_url or "").strip()
    url = urlparse(official_url)
    if (url.scheme != "https" or url.hostname != "3dwicked.gumroad.com"
            or not url.path.startswith("/l/") or len(official_url) > 600
            or url.username or url.password):
        raise ValueError("Produto oficial individual Wicked obrigatorio")
    if (not isinstance(proofs, list) or len(proofs) != 2 or
        any(not isinstance(p, dict) or
            set(p) != {"message_id", "sha256", "revision"} or
            type(p["message_id"]) is not int or
            type(p["revision"]) is not int or p["revision"] < 0 or
            not isinstance(p["sha256"], str) or
            not re.fullmatch("[0-9a-f]{64}", p["sha256"]) for p in proofs)):
        raise ValueError("Provas SHA-256 e revisao de ambas fotos obrigatorias")
    if len({p["message_id"] for p in proofs}) != 2 or selected_message_id not in {
        p["message_id"] for p in proofs
    }:
        raise ValueError("Provas duplicadas ou foto escolhida ausente")
    proof_map = {p["message_id"]: (p["sha256"], p["revision"]) for p in proofs}
    root = Path(media_root).resolve()
    timestamp = smart.utc()
    with smart.db_open(db_path) as db:
        smart.setup(db)
        naming.setup(db)
        db.execute("BEGIN IMMEDIATE")
        try:
            source = db.execute("SELECT * FROM model_groups WHERE group_key=?",
                                (group_key,)).fetchone()
            if source is None:
                raise ValueError("Galeria indisponivel")
            if source["revision"] != revision:
                raise RuntimeError("Galeria alterada: reabra a prancha")
            if (source["studio"] != "Wicked" or
                source["state"] == "confirmado"):
                raise ValueError("Separacao restrita a Wicked nao comercial")
            if smart.normalize(source["variant"]) == smart.normalize(variant):
                raise ValueError("Variantes originais e corrigidas identicas")
            audited = db.execute("""SELECT 1 FROM curation_events
                WHERE group_key=? AND event_type='visual_gallery_audited'
                LIMIT 1""", (group_key,)).fetchone()
            if not audited:
                raise ValueError("Auditoria visual anterior obrigatoria")
            members = db.execute("""SELECT a.message_id,a.sha256,a.source_relative,
                a.source_caption,a.source_album,a.original_topic,
                p.title,p.universe,p.variant,p.studio,p.status,
                p.revision AS name_revision,p.notes
                FROM model_group_members m JOIN assets a USING(message_id)
                JOIN name_proposals p USING(message_id)
                WHERE m.group_key=? ORDER BY a.message_id""",
                (group_key,)).fetchall()
            if len(members) != 2 or set(proof_map) != {m["message_id"] for m in members}:
                raise ValueError("Separacao somente de galeria revisada com duas fotos")
            for m in members:
                if proof_map[m["message_id"]] != (m["sha256"], m["name_revision"]):
                    raise RuntimeError("Prova SHA/revisao da foto mudou")
                if (m["original_topic"] != "Wicked" or m["studio"] != "Wicked" or
                    m["status"] == "confirmado" or
                    smart.normalize(m["title"]) != smart.normalize(source["title"]) or
                    smart.normalize(m["universe"]) != smart.normalize(source["universe"]) or
                    smart.normalize(m["variant"]) != smart.normalize(source["variant"])):
                    raise ValueError("Nome, fonte ou situacao editorial conflitante")
                path = (root / m["source_relative"]).resolve()
                if (not path.is_relative_to(root) or not path.is_file() or
                    path.stat().st_size > 30 * 1024 * 1024):
                    raise ValueError("Original fora de escopo ou ausente")
                with path.open("rb") as stream:
                    if hashlib.file_digest(stream, "sha256").hexdigest() != m["sha256"]:
                        raise ValueError("SHA fisico da foto divergente")
            moved = next(m for m in members if m["message_id"] == selected_message_id)
            survivor = next(m for m in members if m["message_id"] != selected_message_id)
            if moved["sha256"] == survivor["sha256"]:
                raise ValueError("Mesmo arquivo fisico nao pode representar variantes diferentes")
            overlap = db.execute("""SELECT g.group_key FROM assets a
                JOIN model_group_members mg USING(message_id)
                JOIN model_groups g ON g.group_key=mg.group_key
                WHERE a.sha256=? AND g.group_key!=?
                AND g.studio='Wicked' LIMIT 1""",
                (moved["sha256"], group_key)).fetchone()
            if overlap:
                raise ValueError("Mesmo SHA fisico presente em outra galeria")
            new_key = hashlib.sha256(json.dumps(
                ["tonart.post-audit-variant-split/1", group_key,
                 selected_message_id, moved["sha256"]],
                ensure_ascii=False).encode()).hexdigest()[:24]
            if db.execute("SELECT 1 FROM model_groups WHERE group_key=?",
                          (new_key,)).fetchone():
                raise RuntimeError("Separacao ja aplicada: recarregue")
            db.execute("""INSERT INTO model_groups(
                group_key,studio,title,universe,variant,state,
                confidence,revision,created_at,updated_at)
                VALUES(?,?,?,?,?,'revisar',0,0,?,?)""",
                (new_key, source["studio"], source["title"], source["universe"],
                 variant, timestamp, timestamp))
            changed = db.execute("""UPDATE model_groups
                SET revision=revision+1,state='revisar',updated_at=?
                WHERE group_key=? AND revision=?""",
                (timestamp, group_key, revision))
            if changed.rowcount != 1:
                raise RuntimeError("Revisao concorrente da galeria")
            changed = db.execute("""UPDATE model_group_members
                SET group_key=?,match_reason='audited_distinct_variant',
                    updated_at=? WHERE group_key=? AND message_id=?""",
                (new_key, timestamp, group_key, selected_message_id))
            if changed.rowcount != 1:
                raise RuntimeError("Membro alterado concorrentemente")
            filename = naming.proposed_name(
                {"title": moved["title"], "variant": variant},
                selected_message_id, moved["source_relative"])
            updated_note = (str(moved["notes"] or "").strip() + "\n" +
                            "Separada como variante " + variant + ": " + note).strip()[:1000]
            changed = db.execute("""UPDATE name_proposals
                SET variant=?,filename=?,status='revisar',confidence=0,
                    official_url='',notes=?,revision=revision+1,modified_at=?
                WHERE message_id=? AND revision=? AND status IN ('provavel','revisar')""",
                (variant, filename, updated_note, timestamp,
                 selected_message_id, moved["name_revision"]))
            if changed.rowcount != 1:
                raise RuntimeError("Nome original mudou concorrentemente")
            db.execute("""UPDATE model_group_evidence SET group_key=?
                WHERE group_key=? AND source_url=?
                AND source_type IN ('telegram_album','telegram_caption')""",
                (new_key, group_key, smart.SOURCE_C + str(selected_message_id)))
            db.execute("""INSERT OR IGNORE INTO model_group_evidence
                (group_key,source_url,source_type,description,recorded_at)
                VALUES(?,?,'visual_review',?,?)""",
                (new_key, official_url, note[:400], timestamp))
            for m in members:
                fp = hashlib.sha256(json.dumps([
                    "group-policy-v2", m["sha256"], m["original_topic"],
                    m["source_caption"], m["source_album"], m["source_relative"]
                ], ensure_ascii=False).encode()).hexdigest()
                db.execute("""INSERT INTO curation_seen
                    (message_id,fingerprint,outcome,processed_at)
                    VALUES(?,?,'editorial_variant_split',?)
                    ON CONFLICT(message_id) DO UPDATE SET
                    fingerprint=excluded.fingerprint,outcome=excluded.outcome,
                    processed_at=excluded.processed_at""",
                    (m["message_id"], fp, timestamp))
            detail = json.dumps({
                "schema": "tonart.post-audit-variant-split/1",
                "source_group": group_key, "new_group": new_key,
                "studio": source["studio"], "title": source["title"],
                "universe": source["universe"],
                "original_variant": source["variant"],
                "new_variant": variant,
                "before_ids": [m["message_id"] for m in members],
                "before_sha256": [m["sha256"] for m in members],
                "moved_id": selected_message_id,
                "surviving_id": survivor["message_id"],
                "official_product_url": official_url,
                "note": note, "identity_confirmed": False,
                "rights_approved": False, "commercial_published": False,
                "originals_modified": False
            }, ensure_ascii=False, sort_keys=True)
            for key, kind in (
                (group_key, "gallery_post_audit_variant_split_source"),
                (new_key, "gallery_post_audit_variant_split_new")
            ):
                db.execute("""INSERT INTO curation_events
                    (group_key,event_type,detail,occurred_at)
                    VALUES(?,?,?,?)""", (key, kind, detail, timestamp))
            for key, mid, sha in (
                (group_key, survivor["message_id"], survivor["sha256"]),
                (new_key, selected_message_id, moved["sha256"]),
            ):
                audit = json.dumps({
                    "schema": "tonart.visual-gallery-audit-post-split/1",
                    "classification": "single_sculpture_verified_after_split",
                    "group_key": key, "studio": "Wicked",
                    "member_ids": [mid], "sha256s": [sha],
                    "prior_group": group_key, "official_product_url": official_url,
                    "note": note, "identity_approved": False,
                    "rights_approved": False, "publication_approved": False
                }, ensure_ascii=False, sort_keys=True)
                db.execute("""INSERT INTO curation_events
                    (group_key,event_type,detail,occurred_at)
                    VALUES(?,'visual_gallery_audited',?,?)""",
                    (key, audit, timestamp))
            db.commit()
        except BaseException:
            db.rollback()
            raise
    return {
        "ok": True, "old_group": group_key, "new_group": new_key,
        "old_revision": revision+1, "new_revision": 0,
        "moved_id": selected_message_id,
        "surviving_id": survivor["message_id"],
        "new_variant": variant, "new_state": "revisar",
        "rights_changed": False, "originals_modified": False,
        "publication_approved": False
    }
