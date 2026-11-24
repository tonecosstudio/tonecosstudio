#!/usr/bin/env python3
"""Teste isolado da nomeação; nenhum acesso à pasta real do Telegram."""
import hashlib
import sqlite3
import tempfile
from contextlib import closing
from pathlib import Path
import name_curadoria as m

with tempfile.TemporaryDirectory(prefix="tonart-nomeacao-test-") as directory:
    root=Path(directory)
    source=root/"originais"
    source.mkdir()
    db=root/"curadoria.sqlite3"
    with closing(sqlite3.connect(db)) as conn, conn as cn:
        cn.execute("""CREATE TABLE assets(
            message_id INTEGER PRIMARY KEY,sha256 TEXT,source_relative TEXT,
            original_topic TEXT,source_caption TEXT,source_album TEXT)""")
        for mid,model,variant,album in [
            (101,"Pikachu","Diorama","grupo-a"),(102,"","","grupo-a"),
            (103,"Pikachu","Diorama",""),(104,"","","")]:
            p=source/f"msg_{mid}.jpg"
            p.write_bytes(f"imagem-ficticia-{mid}".encode())
            sha=hashlib.sha256(p.read_bytes()).hexdigest()
            caption=f"▪️ {model} - Pokémon\\n▫️ Versão: {variant}\\n▫️ Estúdio: Poke Studio" if model else ""
            caption=caption.replace("\\n","\n")
            cn.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
                (mid,sha,p.name,"Poke Studio",caption,album))
    assert m.proposed_name({"title":"Zoro vs Mihawk Diorama","variant":"Diorama 1/10"},5739,"foo.jpg")=="zoro-vs-mihawk-diorama-1-10-msg5739.jpg"
    first=m.process_batch(db,50)
    # Event lookups must remain indexed as the private curation history grows.
    with closing(sqlite3.connect(db)) as conn:
        indexes = {row[1] for row in conn.execute("PRAGMA index_list(name_proposal_events)")}
        assert "idx_name_proposal_events_message_type" in indexes,indexes
        columns = [row[2] for row in conn.execute(
            "PRAGMA index_info(idx_name_proposal_events_message_type)"
        )]
        assert columns == ["message_id", "event_type"],columns
    assert first["images_processed"]==4,first
    assert first["names_proposed"]==3,first
    assert first["awaiting_name_review"]==1,first
    assert m.process_batch(db,50)["processed"]==0
    names=m.list_names(db,limit=10)["items"]
    by_id={row["message_id"]:row for row in names}
    assert by_id[101]["filename"]=="pikachu-diorama-msg101.jpg"
    assert by_id[102]["evidence_message_id"]==101
    assert by_id[102]["evidence_type"]=="telegram_album"
    assert by_id[103]["filename"]=="pikachu-diorama-msg103.jpg"
    assert by_id[104]["status"]=="revisar"
    try:
        m.review_name(db,101,0,"Pikachu Especial","Poke Studio","Pokémon","Diorama","confirmado")
        assert False,"Falta de fonte oficial deveria bloquear a confirmação"
    except ValueError: pass
    confirmed=m.review_name(db,101,0,"Pikachu Especial","Poke Studio","Pokémon",
        "Diorama","confirmado","https://example.org/modelo","Fonte revisada em teste")
    assert confirmed["filename"]=="pikachu-especial-diorama-msg101.jpg",confirmed
    try:
        m.review_name(db,101,0,"Pikachu","Poke Studio","","","revisar")
        assert False,"Revisão desatualizada deveria falhar"
    except RuntimeError: pass
    with closing(sqlite3.connect(db)) as conn, conn as cn:
        cn.execute("UPDATE assets SET source_caption=? WHERE message_id=101",
            ("▪️ Eevee - Pokémon\n▫️ Estúdio: Poke Studio",))
        cn.execute("UPDATE assets SET source_caption=? WHERE message_id=103",
            ("▪️ Gengar - Pokémon\n▫️ Estúdio: Poke Studio",))
    changed=m.process_batch(db,50)
    assert changed["processed"]>=1,changed
    by_id={a["message_id"]:a for a in m.list_names(db,limit=10)["items"]}
    assert by_id[101]["status"]=="confirmado"
    assert by_id[101]["title"]=="Pikachu Especial"
    assert by_id[103]["filename"]=="gengar-msg103.jpg"
    material=m.materialize_confirmed(db,source,root/"revisada")
    assert material["created"]==1,material
    target=root/"revisada"/"modelos-revisados"/"Poke Studio"/"Pikachu Especial"/"pikachu-especial-diorama-msg101.jpg"
    assert target.is_file() and target.read_bytes()==(source/"msg_101.jpg").read_bytes()
    assert m.materialize_confirmed(db,source,root/"revisada")["existing"]==1
    assert m.safe_component("Nome: especial?")=="Nome_ especial_"
    suggestion=m.suggest_name_from_embedded_text(db,104,"Eevee","Poke Studio","Pokémon",evidence_note="Cartaz sintético")
    assert suggestion["ok"] and suggestion["status"]=="provavel",suggestion
    assert not m.suggest_name_from_embedded_text(db,104,"Eevee","Poke Studio")["ok"]
    profiles=m.official_sources("Sekai 3D Models")
    assert any("Sekai3DModels" in profile["url"] for profile in profiles)
    assert all(not profile["identity_matched"] for profile in profiles)
    verified_topics={
        "3DXM":{"patreon","cgtrader"},
        "Bulkamancer":{"website","cults3d"},
        "C27 Collectibles":{"website"},
        "Kuton Sculpts":{"website","cults3d","cgtrader","patreon"},
        "MPPrints _ My Poke Prints":{"cults3d","patreon"},
        "Momoji":{"cults3d","patreon"},
        "StepanovSculpts":{"cgtrader","etsy"},
        "Wicked":{"cults3d","patreon"},
    }
    for topic,expected in verified_topics.items():
        sources=m.official_sources(topic)
        assert {source["provider"] for source in sources}==expected,(topic,sources)
        assert all(source["url"].startswith("https://") for source in sources)
        assert all(not source["identity_matched"] for source in sources)
    assert m.official_sources("Ydeval")==[]
    out=m.export_manifest(db,root/"manifesto-nomes.csv")
    assert out["exported"]==4,out
    assert (root/"manifesto-nomes.csv").exists()
    for mid in (101,102,103,104):
        assert (source/f"msg_{mid}.jpg").read_bytes()==f"imagem-ficticia-{mid}".encode()
    # Legenda livre, sem marcadores: proposta auditável, nunca confirmação automática.
    caption="Wonder Woman - Battle Scarred Gal Gadot #DianaPrince"
    fixture=source/"msg_105.jpg"
    fixture.write_bytes(b"imagem-ficticia-105")
    with closing(sqlite3.connect(db)) as conn, conn as cn:
        cn.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
            (105,hashlib.sha256(fixture.read_bytes()).hexdigest(),
             fixture.name,"VX-Labs",caption,"album-vx"))
    assert m.process_batch(db,50)["processed"]==1
    for wrong_title,wrong_studio in [("Batman","VX-Labs"),
                                     ("Wonder Woman - Battle Scarred","Outra Marca")]:
        try:
            m.suggest_name_from_telegram_caption(
                db,105,wrong_title,wrong_studio,variant="Battle Scarred")
            assert False,"Legenda ou estúdio sem evidência deveria falhar"
        except ValueError: pass
    proposed=m.suggest_name_from_telegram_caption(
        db,105,"Wonder Woman - Battle Scarred","VX-Labs",
        variant="Battle Scarred",evidence_note="Painel visual fictício")
    assert proposed["ok"] and proposed["status"]=="provavel",proposed
    assert not m.suggest_name_from_telegram_caption(
        db,105,"Wonder Woman - Battle Scarred","VX-Labs")["ok"]
    with closing(sqlite3.connect(db)) as conn, conn as cn:
        state=cn.execute("""SELECT title,status,evidence_type,notes
            FROM name_proposals WHERE message_id=105""").fetchone()
        assert state[0]=="Wonder Woman - Battle Scarred"
        assert state[1]=="provavel" and state[2]=="telegram_caption_curated"
        assert "pendentes" in state[3]
        cn.execute("UPDATE assets SET source_caption=? WHERE message_id=105",
                   ("Legenda editada pelo downloader",))
    m.process_batch(db,50)
    with closing(sqlite3.connect(db)) as conn:
        assert conn.execute("SELECT title FROM name_proposals WHERE message_id=105").fetchone()[0]=="Wonder Woman - Battle Scarred"
    assert fixture.read_bytes()==b"imagem-ficticia-105"
    # Mesmo título de álbum, com versões de impressão diferentes:
    # somente a identidade deve ser herdada, sem inventar escala.
    with closing(sqlite3.connect(db)) as conn, conn as cn:
        for mid,title,variant,album in [
            (201,"Varian Wrynn","Pre-Supported 1/6","album-variantes"),
            (202,"Varian Wrynn","1/6","album-variantes"),
            (203,"","","album-variantes"),
            (204,"","","album-variantes"),
            (205,"Varian Wrynn","1/10","album-variantes"),
            (210,"Varian Wrynn","1/6","album-conflito"),
            (211,"Uther Lightbringer","1/6","album-conflito"),
            (212,"","","album-conflito")]:
            payload=("imagem-ficticia-"+str(mid)).encode()
            (source/f"msg_{mid}.jpg").write_bytes(payload)
            caption=(f"▪️ {title} - World of Warcraft\n"
                     f"▫️ Versão: {variant}\n▫️ Estúdio: Luftmensch") if title else ""
            cn.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
                (mid,hashlib.sha256(payload).hexdigest(),f"msg_{mid}.jpg",
                 "Luftmensch",caption,album))
    initial=m.process_batch(db,50)
    assert initial["processed"]==8,initial
    with closing(sqlite3.connect(db)) as cn:
        varian=cn.execute("""SELECT title,variant,status,evidence_type,evidence_message_id
            FROM name_proposals WHERE message_id=203""").fetchone()
        conflict=cn.execute("""SELECT title,status
            FROM name_proposals WHERE message_id=212""").fetchone()
    assert varian[0]=="Varian Wrynn" and varian[1]=="",varian
    assert varian[2]=="provavel" and varian[3]=="telegram_album_shared_identity",varian
    assert varian[4]==201,varian
    assert conflict==("","revisar"),conflict
    assert m.process_batch(db,50)["processed"]==0
    # Migração idempotente de proposta antiga sem fingerprint novo:
    # preserve todo registro confirmado e toda decisão manual.
    with closing(sqlite3.connect(db)) as cn, cn:
        cn.execute("""UPDATE name_proposals
            SET title='',variant='',status='revisar',evidence_type=''
            WHERE message_id=204""")
    upgrade=m.process_batch(db,50)
    assert upgrade["processed"]==1,upgrade
    with closing(sqlite3.connect(db)) as cn:
        row=cn.execute("SELECT title,variant,status FROM name_proposals WHERE message_id=204").fetchone()
    assert row==("Varian Wrynn","","provavel"),row
    # Regressao do contrato de variante de galeria: identidade e variante
    # mudam juntas, sob provas fisicas e CAS, nunca alterando direitos.
    with tempfile.TemporaryDirectory(prefix="tonart-variant-proof-") as proof_dir:
        proof_root = Path(proof_dir)
        proof_db = proof_root / "proof.sqlite3"
        gkey = "f" * 24
        gkey2 = "e" * 24
        now = m.smart.utc()
        proofs = []
        for mid in (801, 802, 803):
            content = ("original-sintetico-%d" % mid).encode()
            (proof_root / ("msg_%d.jpg" % mid)).write_bytes(content)
            proofs.append({
                "message_id": mid,
                "sha256": hashlib.sha256(content).hexdigest(),
                "revision": 0,
            })
        with m.smart.db_open(proof_db) as con:
            m.smart.setup(con)
            m.setup(con)
            for key, name, variant in (
                (gkey, "Spock", "Busto"),
                (gkey2, "Voldemort", "Busto"),
            ):
                con.execute("""INSERT INTO model_groups
                   (group_key,studio,title,universe,variant,state,
                    confidence,revision,created_at,updated_at)
                   VALUES (?,'Wicked',?,'Ficcao',?,'provavel',0,0,?,?)""",
                    (key, name, variant, now, now))
                con.execute("""INSERT INTO curation_events
                   (group_key,event_type,detail,occurred_at)
                   VALUES (?,'visual_gallery_audited','{}',?)""",(key,now))
            for mid, key, name in (
                (801,gkey,"Spock"),(802,gkey,"Spock"),
                (803,gkey2,"Voldemort"),
            ):
                content=(proof_root / ("msg_%d.jpg" % mid)).read_bytes()
                digest=hashlib.sha256(content).hexdigest()
                relative="msg_%d.jpg" % mid
                con.execute("""INSERT INTO assets
                    (message_id,sha256,source_relative,original_topic,indexed_at)
                    VALUES(?,?,?,'Wicked',?)""",(mid,digest,relative,now))
                con.execute("""INSERT INTO model_group_members
                    (message_id,group_key,match_reason,updated_at)
                    VALUES(?,?,'telegram_caption',?)""",(mid,key,now))
                con.execute("""INSERT INTO name_proposals
                    (message_id,studio,title,universe,variant,filename,
                     status,confidence,source_fingerprint,revision,modified_at)
                    VALUES(?,'Wicked',?,'Ficcao','Busto',?,
                     'provavel',0.82,?,0,?)""",
                    (mid,name,m.proposed_name({"title":name,"variant":"Busto"},mid,relative),
                     "synthetic-%d" % mid,now))
            con.commit()
        note = ("Produto visual oficial de Wicked mostra Spock Full Size "
                "com corpo inteiro e mesma pose, rosto, mao erguida, roupa "
                "e base dos arquivos ficticios usados no teste de contrato; "
                "a mudanca nao autoriza licenca nem publicacao.")
        def variant_call(**extra):
            return m.confirm_reviewed_gallery(
                proof_db,proof_root,group_key=gkey,group_revision=0,
                proofs=proofs[:2],title="Spock",universe="Ficcao",
                official_url="https://3dwicked.gumroad.com/l/SpockS",
                note=note,**extra)
        for invalid in ("", "Busto"):
            try:
                variant_call(corrected_variant=invalid)
                assert False,"Variante vazia/inalterada deveria ser rejeitada"
            except ValueError:
                pass
        try:
            m.confirm_reviewed_gallery(proof_db,proof_root,
                group_key=gkey,group_revision=0,proofs=proofs[:2],
                title="Spock",universe="Ficcao",
                official_url="https://another-shop.example/l/SpockS",
                note=note,corrected_variant="Full Size")
            assert False,"Origem não oficial rejeitada para variante"
        except ValueError:
            pass
        assert variant_call(corrected_variant="Full Size")["confirmed"]==2
        with m.smart.db_open(proof_db,readonly=True) as con:
            assert con.execute("SELECT variant FROM model_groups WHERE group_key=?",
                (gkey,)).fetchone()[0]=="Full Size"
            rows=con.execute("""SELECT variant,status,filename FROM name_proposals
                WHERE message_id IN(801,802) ORDER BY message_id""").fetchall()
            assert all(v["variant"]=="Full Size" and v["status"]=="confirmado"
                and "-full-size-" in v["filename"] for v in rows)
            events=con.execute("""SELECT event_type,detail FROM curation_events
               WHERE group_key=? AND event_type='gallery_variant_corrected_editorial'""",
               (gkey,)).fetchall()
            assert len(events)==1 and json.loads(events[0]["detail"])["variant_corrected"]
        try:
            variant_call(corrected_variant="Full Size")
            assert False,"Reenvio CAS desatualizado nao pode reexecutar"
        except RuntimeError:
            pass
        # Sem corrected_variant, o contrato anterior continua preservando
        # a variante. Isto protege os demais studios e automacoes antigas.
        traditional=m.confirm_reviewed_gallery(
            proof_db,proof_root,group_key=gkey2,group_revision=0,
            proofs=proofs[2:],title="Voldemort",universe="Ficcao",
            official_url="https://3dwicked.gumroad.com/l/VoldemortB",
            note=note)
        assert traditional["variant"]=="Busto" and not traditional["variant_changed"]
        assert (proof_root/"msg_801.jpg").read_bytes()==b"original-sintetico-801"
        assert (proof_root/"msg_802.jpg").read_bytes()==b"original-sintetico-802"
        print("VARIANTE ATOMICA E2E APROVADA: CAS, SHA, auditoria, direitos e legado")

    print("NOMEAÇÃO E2E APROVADA: propostas, álbum, nomes únicos, aprovação com fonte, conflito, retomada, CSV e originais intactos")
