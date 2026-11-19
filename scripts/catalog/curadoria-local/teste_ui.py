from pathlib import Path
import subprocess
root=Path(__file__).resolve().parent
html=(root/"curadoria.html").read_text(encoding="utf-8")
script=root/"curadoria.js"
assert '<script src="/curadoria.js" defer></script>' in html
assert '<script>' not in html
assert script.exists()
js=script.read_text(encoding="utf-8")
assert 'function drawGallery' in js
assert 'async function refresh' in js
assert '__LOCAL_CSRF__' in js
result=subprocess.run(["node","--check",str(script)],capture_output=True,text=True)
assert result.returncode==0,result.stderr
print("UI APROVADA: script externo, sintaxe JS valida, token local injetado pelo servidor")
