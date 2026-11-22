#!/usr/bin/env python3
import hashlib
import importlib.util
import json
import sqlite3
import socket
import tempfile
import threading
import time
import urllib.request
from pathlib import Path

f=Path(__file__).with_name("tonart_curadoria.py")
sp=importlib.util.spec_from_file_location("tonart_curadoria",f)
m=importlib.util.module_from_spec(sp)
sp.loader.exec_module(m)
with tempfile.TemporaryDirectory(prefix="tonart-curadoria-test-") as p:
    root=Path(p)
    m.APP_DIR=root/"curadoria"
    m.DB_PATH=m.APP_DIR/"curadoria.sqlite3"
    m.TOKEN_PATH=m.APP_DIR/"token.txt"
    m.SOURCE=root/"telegram"
    m.SOURCE.mkdir()
    image=m.SOURCE/"SaltSculpt"/"msg_101.jpg"
    image.parent.mkdir()
    image.write_bytes(b"jpeg-test-content")
    digest=hashlib.sha256(image.read_bytes()).hexdigest()
    m.initialize()
    with m.connect(m.DB_PATH) as db:
        db.execute("INSERT INTO assets VALUES (?,?,?,?,?,?,?,?)",
                   (101,digest,"SaltSculpt/msg_101.jpg","SaltSculpt","2026-11-18","","",m.now()))
        db.execute("INSERT INTO annotations(message_id) VALUES (101)")
    payload={"message_id":101,"revision":0,"studio":"SaltSculpt","model":"Frieren",
             "character_name":"Frieren","universe":"Sousou no Frieren",
             "file_label":"frente","notes":"Teste local","status":"aprovado"}
    response=m.annotate(payload)
    assert response["revision"]==1,response
    assert m.get_items({"page":["1"]})["total"]==1
    failed=False
    try:
        m.annotate(payload)
    except RuntimeError:
        failed=True
    assert failed,"Edicao com versao antiga deveria falhar"
    created=m.materialize_curated()
    assert created["created"]==1,created
    expected=m.APP_DIR/"modelos-revisados"/"SaltSculpt"/"Frieren"/"frente-msg101.jpg"
    assert expected.read_bytes()==image.read_bytes()
    assert m.materialize_curated()["existing"]==1
    assert image.is_file(),"Original foi alterado"
    manifest=m.export_catalog()
    assert Path(manifest["path"]).exists()
    csv_path=root/"candidatos.csv"
    csv_path.write_text("sha256,source,model\n"+digest+",tonart-old-1,Frieren\n",encoding="utf-8")
    reconcile=m.import_tonart_csv(str(csv_path))
    assert reconcile["exact_hash_matches"]==1,reconcile
    assert reconcile["preferred"]=="telegram"
    print("E2E APROVADO: anotacao, conflito de revisao, exportacao de nome por hardlink, integridade, reconciliacao Telegram-prioritario")

# The UI must serve health while the downloader's SQLite sync is still busy.
# This is a real loopback HTTP smoke with an intentionally blocked sync.
started=threading.Event()
release=threading.Event()
def blocked_sync():
    started.set()
    release.wait(6)

with socket.socket() as sock:
    sock.bind(("127.0.0.1",0))
    test_port=sock.getsockname()[1]
m.HOST,m.PORT="127.0.0.1",test_port
m.sync=blocked_sync
m.telegram_identity.run_cycle=lambda *args,**kwargs: None
threading.Thread(target=m.main,daemon=True,name="test-nonblocking-startup").start()
try:
    assert started.wait(3),"background sync did not begin"
    ready=False
    for attempt in range(40):
        try:
            with urllib.request.urlopen(
                f"http://127.0.0.1:{test_port}/health",timeout=0.5
            ) as response:
                body=json.loads(response.read())
                ready=response.status==200 and body.get("ok") is True
                if ready: break
        except (OSError,ValueError):
            pass
        time.sleep(0.1)
    assert ready,"host health must remain responsive during blocked SQLite sync"
    assert not release.is_set(),"test must not release sync before HTTP health check"
    print("BOOT APROVADO: /health responde durante sincronizacao SQLite bloqueada")
finally:
    release.set()
