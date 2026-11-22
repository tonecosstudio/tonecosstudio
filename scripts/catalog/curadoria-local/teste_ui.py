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
assert 'id="queueMode"' in html
assert 'id="queueFilters"' in html and 'id="queueResults"' in html
assert 'id="queueKind"' in html and 'id="queueVariant"' in html
assert 'id="legacyWallControls"' in html
assert 'id="legacyWallPageSize"' in html and 'id="legacyWallViews"' in html
assert 'id="legacyWallFocus"' in html
assert 'id="queueSiteStatus"' in html and 'id="queueSiteCheck"' in html
assert 'id="boardSize"' in html
assert 'id="boardPrevGroup"' in html and 'id="boardNextGroup"' in html
assert 'id="boardGroupPosition"' in html
assert 'async function navigateBoardGroup(step)' in js
assert 'if(!el("boardDialog").open)el("boardDialog").showModal()' in js

assert 'id="modelWallControls"' in html
assert 'id="modelWallPageSize"' in html and 'id="modelWallViews"' in html
assert 'id="modelWallFocus"' in html
assert 'let modelWallRequestId=0' in js
assert 'g.preview_ids?.length' in js
assert 'gallery_preview_ids' in (root/'smart_curadoria.py').read_text(encoding='utf-8')

assert 'className="audit-previews"' in js
assert '"/api/catalog-sync-summary"' in js
assert 'gallery.legacy_audit' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'catalog.summary' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'async function refreshReviewQueue()' in js
assert 'function resetReviewQueue()' in js
assert 'queueCursors[queuePageIndex]' in js
assert 'el("queueMode").onclick=()=>setView("queue")' in js
assert '/api/review-queue' in js
assert 'review.queue' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'id="legacyAuditFilters"' in html and 'id="legacyAuditReview"' in html
assert 'id="legacyAuditState"' in html and 'id="legacyAuditRisk"' in html
assert 'id="legacyAuditOpenBoard"' in html
assert 'id="legacyAuditDecision"' in html and 'id="legacyAuditNotes"' in html
assert 'async function refreshReviewQueue()' in js
assert '/api/legacy-album-audit?' in js
assert 'post("/api/audit-legacy-gallery"' in js
assert 'openBoard(item.group_key)' in js
assert 'gallery.legacy_audit' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'gallery.legacy_audit_review' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'gallery.legacy_split' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'id="legacySplitForm"' in html and 'id="legacySplitSave"' in html
assert 'id="legacySplitSelected"' in html and 'id="boardSplitSelection"' in html
assert '/api/split-legacy-gallery' in js
assert 'boardSplitSelection' in js and 'reviewed_split' in (root/'legacy_album_audit.py').read_text(encoding='utf-8')


assert 'id="nameReview"' in html
assert 'id="materializeNames"' in html
assert 'async function refreshNames' in js
assert 'api/review-name' in js
assert 'nameOfficialProfiles' in html
assert 'nameTelegramEvidence' in html
assert 'showTelegramEvidence' in js
assert '/api/telegram-findings/' in js
assert 'images.telegram_evidence' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'status="revisar"' not in js  # review state is assigned through the existing select
assert 'el("nameStatus").value="revisar";' in js
assert 'nameSourceLink' in html
assert 'galleryCreate' in html and 'saveVisualGallery' in html
assert 'nameOpenGallery' in html
assert 'min_images:el("multiplePhotosOnly").checked?2:1' in js
assert 'id="multiplePhotosOnly"' in html
assert 'id="boardDialog"' in html and 'id="openBoardBtn"' in html
assert 'id="boardPrev"' in html and 'id="boardNext"' in html and 'id="boardPage"' in html
assert 'id="nameTelegramAlbumBoard"' in html
assert 'async function openTelegramAlbumBoard(mid)' in js
assert '/api/telegram-album/' in js
assert 'images.telegram_album_board' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')

assert 'let BOARD_PAGE_SIZE=48;' in js
assert 'function renderBoardPage()' in js
assert 'function setThumb(img,messageId,width=480)' in js
assert 'img.src="/thumb/"+mid+"?w="+width;' in js
assert '/api/performance' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'images.thumbnail' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'setThumb(img,item.message_id);' in (root/'gallery_ui.js').read_text(encoding='utf-8')

assert 'id="propagateGalleryName"' in html and '/api/propagate-gallery-name' in js
assert 'galleryCandidateTiles' in html and 'galleryAppendSave' in html
assert '<script src="/gallery_ui.js" defer></script>' in html
assert (root/'gallery_ui.js').exists()
assert '/api/append-gallery' in (root/'gallery_ui.js').read_text(encoding='utf-8')
assert '/api/gallery-candidates' in (root/'gallery_ui.js').read_text(encoding='utf-8')
assert '/api/append-gallery' in js
assert '/api/capabilities' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
for operation in ('albums.candidates','names.list','images.visual_candidates',
                  'images.annotate','catalog.export','catalog.compare_csv',
                  'external_candidates.list'):
    assert '\"id\":\"'+operation+'\"' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')
assert 'async function openBoard(' in js
assert 'id="catalogSyncButton"' in html and '/api/catalog-sync' in js
assert 'id="loadMoreAlbums"' in html
assert 'el("loadMoreAlbums").onclick' in js
assert 'page=next?albumCandidatePage+1:1' in js
assert 'catalogSyncStudio' in html and 'renderCatalogSync' in js
assert '1800000' not in js
assert 'latestCatalogSync=null;' in js
assert 'catalog_upstream_unavailable' in (root/'tonart_curadoria.py').read_text(encoding='utf-8')

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
assert 'identity_conflicts' in js
assert 'um mesmo arquivo possui nomes diferentes' in js
assert 'Mensagens repetem o mesmo arquivo' in js
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
for extra in ('gallery_ui.js',):
    check=subprocess.run(['node','--check',str(root/extra)],capture_output=True,text=True)
    assert check.returncode==0,check.stderr
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
const setThumb=(img,mid)=>{img.src='/thumb/'+mid+'?w=480';};
vm.runInNewContext(source.slice(a,b),{el:id=>els[id],albumCandidates:[item],
 topic:'Kuton Sculpts',document:{createElement:tag=>new E(tag)},
 text,setThumb,notify:()=>{},Map,Set});
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


# Exercise the actual group-queue JavaScript with a synthetic DOM.
# This checks that the audit card opens the native board and posts only
# an explicit decision; it never touches images or production.
group_queue_js=r"""
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(process.argv[1],'utf8');
const start=source.indexOf('let queuePageIndex=0');
const end=source.indexOf('let albumCandidates=',start);
assert(start>=0&&end>start);
class Element{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.hidden=false;
  this.disabled=false;this.value='';this.textContent='';
  this.classList={toggle:()=>true,contains:()=>false,remove:()=>{}};}
 append(...children){this.children.push(...children);}
 replaceChildren(...children){this.children=[...children];}
}
const ids=['queueKind','queueVariant','legacyAuditState','legacyAuditRisk',
 'legacyAuditFilters','legacyWallControls','legacyWallPageSize',
 'legacyWallViews','legacyWallFocus','queueSiteCheck','queueSiteStatus',
 'queueVariantLabel','legacyAuditReview','nameReview',
 'legacyAuditTitle','legacyAuditMeta','legacyAuditDecision','legacyAuditNotes',
 'legacyAuditOpenBoard','legacyAuditSave','legacyAuditForm','legacyAuditStatus',
 'legacySplitForm','legacySplitSave','legacySplitOpenNew','legacySplitTitle',
 'legacySplitVariant','legacySplitNote','legacySplitSelected','boardDialog','queueResults',
 'queueSummary','summary','page','prev','next'];
const elements=Object.fromEntries(ids.map(id=>[id,new Element(id)]));
elements.queueKind.value='legacy_groups';
elements.legacyAuditState.value='pending';
elements.legacyAuditRisk.value='all';
elements.legacyWallPageSize.value='96';
elements.legacyWallViews.value='4';
const group={group_key:'a'.repeat(24),title:'Garrosh',original_topic:'Luftmensch',
 sample_message:20231,preview_ids:[20231,20232,20233,20234],
 photos:10,unique_files:10,source_albums:1,
 risk_label:'Galeria grande',review_state:'pending',revision:0,priority:2};
const boards=[],posts=[],paths=[],selection=new Set();
const ctx=vm.createContext({
  el:id=>elements[id],viewMode:'queue',topic:'Luftmensch',search:'',
  URLSearchParams,fmt:n=>String(n),document:{createElement:tag=>new Element(tag)},
  text:(parent,tag,value)=>{
    const node=new Element(tag);node.textContent=String(value);
    parent.append(node);return node;
  },
  setThumb:(node,id)=>{node.src='/thumb/'+id;},
  boardSplitSelection:selection,updateBoardSplitCount:()=>{},
  openBoard:key=>boards.push(key),
  openName:()=>{throw Error('Should not open name editor for legacy group')},
  api:async url=>{
    paths.push(url);assert(url.startsWith('/api/legacy-album-audit?'));
    return {items:[group],total:1,next_cursor:'',has_more:false};
  },
  post:async (url,payload)=>{
    posts.push({url,payload});
    if(url==='/api/audit-legacy-gallery')
      return {ok:true,revision:1,publication_approved:false};
    if(url==='/api/split-legacy-gallery')
      return {ok:true,source_revision:2,new_group:'b'.repeat(24),
        moved_ids:[20235,20236],remaining_ids:[20231],publication_approved:false};
    throw Error('Unexpected POST '+url);
  },
  notify:()=>{},console,
});
vm.runInContext(source.slice(start,end),ctx);
(async()=>{
 await vm.runInContext('refreshReviewQueue()',ctx);
 assert.strictEqual(elements.legacyAuditFilters.hidden,false);
 assert.strictEqual(elements.queueVariantLabel.hidden,true);
 assert.strictEqual(elements.queueResults.children.length,1);
 assert.strictEqual(elements.legacyWallControls.hidden,false);
 assert.strictEqual(elements.queueResults.children[0].children[0].className,'audit-previews');
 assert.deepStrictEqual(
  Array.from(elements.queueResults.children[0].children[0].children,x=>x.src),
  ['/thumb/20231','/thumb/20232','/thumb/20233','/thumb/20234']
 );
 assert(paths[0].includes('limit=96') && paths[0].includes('previews=4'));
 elements.queueResults.children[0].onclick();
 assert.deepStrictEqual(boards,[group.group_key]);
 assert.strictEqual(elements.legacyAuditReview.hidden,false);
 assert.strictEqual(elements.legacyAuditTitle.textContent,'Garrosh · Luftmensch');
 elements.legacyAuditOpenBoard.onclick();
 assert.strictEqual(boards.length,2);
 elements.legacyAuditDecision.value='same_sculpture';
 elements.legacyAuditNotes.value='Dez imagens originais da mesma escultura e base.';
 await elements.legacyAuditSave.onclick();
 assert.strictEqual(posts.length,1);
 assert.strictEqual(posts[0].url,'/api/audit-legacy-gallery');
 assert.strictEqual(posts[0].payload.revision,0);
 assert.strictEqual(posts[0].payload.group_key,group.group_key);
 assert.strictEqual(posts[0].payload.decision,'same_sculpture');
 assert.strictEqual(elements.legacyAuditForm.hidden,true);
 // A previously divergent gallery can now explicitly split selected photos.
 const insufficient={...group,review_state:'attention',split_eligible:false,revision:1};
 vm.runInContext('selectLegacyAuditGroup',ctx)(insufficient);
 assert.strictEqual(elements.legacySplitForm.hidden,true);
 const divergent={...group,review_state:'attention',split_eligible:true,revision:1};
 vm.runInContext('selectLegacyAuditGroup',ctx)(divergent);
 assert.strictEqual(elements.legacySplitForm.hidden,false);
 selection.add(20235);selection.add(20236);
 elements.legacySplitTitle.value='Outro modelo provisório';
 elements.legacySplitVariant.value='Pose alternativa';
 elements.legacySplitNote.value='Base e silhueta demonstram outra escultura.';
 await elements.legacySplitSave.onclick();
 assert.strictEqual(posts.length,2);
 assert.strictEqual(posts[1].url,'/api/split-legacy-gallery');
 assert.strictEqual(posts[1].payload.group_key,group.group_key);
 assert.strictEqual(posts[1].payload.revision,1);
 assert.deepStrictEqual(Array.from(posts[1].payload.message_ids),[20235,20236]);
 assert.strictEqual(elements.legacySplitOpenNew.hidden,false);
 elements.legacySplitOpenNew.onclick();
 assert.strictEqual(boards[boards.length-1],'b'.repeat(24));
 assert(paths.length>=3);
 console.log('NATIVE_GROUP_AUDIT_UI_E2E_OK');
})().catch(e=>{console.error(e);process.exitCode=1});
"""
group_test=subprocess.run(
    ["node","-e",group_queue_js,str(script)],
    capture_output=True,text=True,timeout=20,
)
assert group_test.returncode==0,group_test.stderr
assert "NATIVE_GROUP_AUDIT_UI_E2E_OK" in group_test.stdout


# Exercise the real generic 4k-model wall renderer without browser packages,
# public site calls or touching the physical catalog.
models_wall_js=r"""
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(process.argv[1],'utf8');
const start=source.indexOf('let modelWallRequestId=0');
const end=source.indexOf('async function openModel(key)',start);
assert(start>=0&&end>start);
class Element {
 constructor(){this.children=[];this.hidden=false;this.disabled=false;
  this.textContent='';this.checked=false;this.value='';
  this.classList={add:()=>{},toggle:()=>true};}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
}
const controls=['modelWallPageSize','modelWallViews','multiplePhotosOnly',
 'onlyUnnamedModels','modelResults','summary','page','prev','next','smartSummary'];
const elements=Object.fromEntries(controls.map(x=>[x,new Element()]));
elements.modelWallPageSize.value='96';
elements.modelWallViews.value='4';
let requests=[];
const fixture={
 total:4433,items:[{
  group_key:'a'.repeat(24),title:'Modelo A',studio:'Studio A',universe:'',
  image_count:6,unique_photo_count:6,revision:1,state:'revisar',
  sample_message:101,preview_ids:[101,102,105,106]
 }]
};
const context=vm.createContext({
  viewMode:'models',el:id=>elements[id],status:'',topic:'',search:'',
  currentPage:1,modelTotal:0,boardBatchGroups:[],Date,URLSearchParams,fmt:n=>String(n),
  document:{createElement:()=>new Element()},
  text:(parent,tag,value)=>{const item=new Element();item.textContent=String(value);parent.append(item);},
  setThumb:(img,mid,size)=>{img.src='/thumb/'+mid+'?w='+size;},
  openModel:()=>{},notify:()=>{},refreshAlbumCandidates:async()=>{},
  api:async url=>{
   requests.push(url);
   if(url.startsWith('/api/models?'))return fixture;
   if(url==='/api/stats')return {smart:{images_needing_review:4},
      galleries:{photos_in_galleries:5,galleries:3,visually_reviewed_galleries:2}};
   throw Error('Unexpected request '+url);
  },console,
});
vm.runInContext(source.slice(start,end),context);
(async()=>{
 await vm.runInContext('refreshModels()',context);
 assert(requests[0].includes('limit=96')&&requests[0].includes('previews=4'));
 assert.strictEqual(elements.modelResults.children.length,1);
 const images=elements.modelResults.children[0].children[0].children;
 assert.strictEqual(images.length,4);
 assert.deepStrictEqual(Array.from(images,x=>x.src),
  ['/thumb/101?w=256','/thumb/102?w=256','/thumb/105?w=256','/thumb/106?w=256']);
 assert.strictEqual(elements.next.disabled,false);
 await vm.runInContext('refreshModels()',context);
 assert.strictEqual(requests.filter(x=>x==='/api/stats').length,1,
  'Stats must be cached during wall pagination');
 console.log('MODEL_WALL_96_IMAGES_UI_E2E_OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
"""
model_test=subprocess.run(
    ["node","-e",models_wall_js,str(script)],
    capture_output=True,text=True,timeout=20,
)
assert model_test.returncode==0,model_test.stderr
assert "MODEL_WALL_96_IMAGES_UI_E2E_OK" in model_test.stdout
