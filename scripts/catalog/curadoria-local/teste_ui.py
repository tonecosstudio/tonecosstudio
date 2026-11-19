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
assert 'albumSelectionCount' in html and 'albumSelectionCount' in js
assert 'const selectedIds=new Set(item.message_ids)' in js
assert 'if(!taken)' in js and 'check.onchange' in js
assert 'ids.join(", ")' in js and 'item.message_ids.filter' in js
assert 'Nomear esta foto' in js
# A visualização deve exibir cada arquivo SHA-256 uma única vez,
# sem eliminar vínculos/proveniência das mensagens repetidas.
assert 'const uniquePhotos=new Map()' in js
assert 'if(!uniquePhotos.has(key))uniquePhotos.set(key,item)' in js
assert 'for(const item of uniquePhotos.values())' in js
assert 'unique_photo_count' in js
assert 'mensagens repetem arquivos já exibidos' in js
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
# Simula a seleção dos álbuns sem abrir navegador ou acessar as fotos reais.
# Foto já agrupada aparece para comparação, mas nunca recebe checkbox.
selection_script=r"""
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(process.argv[1],'utf8');
const a=source.indexOf('el("loadAlbumCandidate").onclick=()=>{');
const b=source.indexOf('\nasync function refreshModels(){',a);
assert(a>=0&&b>a);
class E {
 constructor(tag){this.tagName=tag;this.children=[];this.style={};this.value='';this.checked=false;}
 append(...v){this.children.push(...v);}
 replaceChildren(...v){this.children=[...v];}
 setAttribute(k,v){this[k]=v;}
}
const els={albumCandidate:new E('select'),galleryIds:new E('input'),
 albumCandidatePreview:new E('div'),albumSelectionCount:new E('p'),
 albumCandidateCaption:new E('div'),loadAlbumCandidate:new E('button')};
els.albumCandidate.value='album-1';
const item={album_id:'album-1',topic:'Kuton Sculpts',
 message_ids:[101,102],all_message_ids:[101,102,103],
 already_grouped:[{message_id:103,variant:'BUST'}],image_count:2,grouped_images:1,caption:'teste'};
const text=(parent,tag,value)=>{const e=new E(tag);e.textContent=String(value);parent.append(e);return e;};
vm.runInNewContext(source.slice(a,b),{el:id=>els[id],albumCandidates:[item],
 topic:'Kuton Sculpts',document:{createElement:tag=>new E(tag)},
 text,notify:()=>{},Map,Set});
els.loadAlbumCandidate.onclick();
assert.strictEqual(els.galleryIds.value,'101, 102');
const cards=els.albumCandidatePreview.children;
assert.strictEqual(cards.length,3);
const checkbox=card=>card.children.find(x=>x.tagName==='label')?.children.find(x=>x.tagName==='input');
assert(checkbox(cards[0])&&checkbox(cards[1])&&!checkbox(cards[2]));
checkbox(cards[0]).checked=false;checkbox(cards[0]).onchange();
assert.strictEqual(els.galleryIds.value,'102');
checkbox(cards[0]).checked=true;checkbox(cards[0]).onchange();
assert.strictEqual(els.galleryIds.value,'101, 102');
console.log('CHECKBOX_SELECTION_E2E_OK');
"""
selection=subprocess.run(["node","-e",selection_script,str(script)],
                         capture_output=True,text=True,timeout=20)
assert selection.returncode==0,selection.stderr
assert "CHECKBOX_SELECTION_E2E_OK" in selection.stdout
print("UI APROVADA: script externo, sintaxe JS valida, token local injetado pelo servidor")
