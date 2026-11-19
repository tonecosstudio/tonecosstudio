from pathlib import Path
import subprocess
root=Path(__file__).resolve().parent
html=(root/"curadoria.html").read_text(encoding="utf-8")
script=root/"curadoria.js"
assert '<script src="/curadoria.js" defer></script>' in html
assert '<script>' not in html
assert script.exists()
js=script.read_text(encoding="utf-8")
assert 'id="namesMode"' in html
assert 'id="nameReview"' in html
assert 'id="materializeNames"' in html
assert 'async function refreshNames' in js
assert 'api/review-name' in js
assert 'nameOfficialProfiles' in html
assert 'nameSourceLink' in html
assert 'galleryCreate' in html and 'saveVisualGallery' in html
assert 'nameOpenGallery' in html
assert 'min_images:2' in js
assert 'api/create-gallery' in js
assert 'gallery_image_count' in js
assert 'editGalleryPhotoName' in js
assert 'onlyUnnamedModels' in js and 'unnamedFilter' in html
assert 'Nomear esta foto' in js
assert 'updateNameSourceLink' in js
assert 'nameVisualSuggestions' in html
assert 'showNameReferences' in js
assert 'api/official-sources' in js
assert 'api/visual-candidates' in js
assert 'api/materialize-confirmed-names' in js
assert 'function drawGallery' in js
assert 'async function refresh' in js
assert '__LOCAL_CSRF__' in js
result=subprocess.run(["node","--check",str(script)],capture_output=True,text=True)
assert result.returncode==0,result.stderr
print("UI APROVADA: script externo, sintaxe JS valida, token local injetado pelo servidor")
