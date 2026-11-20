from pathlib import Path
import hashlib,sqlite3,tempfile
from contextlib import closing
from PIL import Image,ImageDraw
import name_curadoria as n
import visual_name_suggestions as v

with tempfile.TemporaryDirectory(prefix="tonart-visuais-") as temp:
 root=Path(temp)
 files=root/"telegram"
 files.mkdir()
 db=root/"curadoria.sqlite3"
 with closing(sqlite3.connect(db)) as conn, conn as c:
  c.execute("""CREATE TABLE assets(message_id INTEGER PRIMARY KEY,
  sha256 TEXT,source_relative TEXT, original_topic TEXT,
  source_caption TEXT, source_album TEXT)""")
  for mid in (101,102,103,104):
   img=Image.new("RGB",(64,64),"white")
   draw=ImageDraw.Draw(img)
   if mid<103 or mid==104:draw.rectangle((4,4,35,56),fill="black")
   else:draw.ellipse((42,5,60,23),fill="black")
   file=files/("msg_%d.png"%mid)
   img.save(file)
   sha=hashlib.sha256(file.read_bytes()).hexdigest()
   caption="▪️ Modelo Teste - Teste\\n▫️ Estúdio: Studio Teste".replace("\\n","\n") if mid==101 else ""
   c.execute("INSERT INTO assets VALUES(?,?,?,?,?,?)",
    (mid,sha,file.name,"Other Studio" if mid==104 else "Studio Teste",caption,""))
 n.process_batch(db,20)
 before=n.stats(db)
 assert before["names_proposed"]==1,before
 scanned=v.scan(db,files)
 assert scanned["completed"]==4,scanned
 matches=v.match(db)
 assert matches["unlabeled_with_candidates"]>=1,matches
 candidates=v.get_candidates(db,102)
 assert candidates and candidates[0]["candidate_message_id"]==101,candidates
 assert v.get_candidates(db,104)==[], "Imagens de estúdios distintos não devem gerar sugestões"
 after=n.stats(db)
 assert after["names_proposed"]==before["names_proposed"],after
 assert after["names_confirmed"]==0,after
 print("E2E VISUAL OK",scanned,matches,candidates[:1])
