const TOKEN="__LOCAL_CSRF__";
const el=id=>document.getElementById(id);
let chosenName=null,nameTotal=0;
let items=[],selected=null,currentPage=1,topic="",status="",search="",total=0,refreshing=false,typing=false;
const fmt=n=>Number(n||0).toLocaleString("pt-BR");
function setThumb(img,messageId,width=480){
  const mid=Number(messageId);
  if(!Number.isSafeInteger(mid)||mid<=0)return;
  const original="/media/"+mid;
  img.loading="lazy";
  img.decoding="async";
  img.onerror=()=>{img.onerror=null;img.src=original;};
  img.src="/thumb/"+mid+"?w="+width;
}
const fields={studio:"studio",model:"model",character_name:"character",universe:"universe",file_label:"fileLabel",status:"status",notes:"notes"};
function text(parent,tag,value,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=String(value??"");parent.append(e);return e}
function notify(s){el("notice").textContent=s;setTimeout(()=>{if(el("notice").textContent===s)el("notice").textContent=""},7000)}
async function api(route){const r=await fetch(route,{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error||"Erro");return d}
async function post(route,data){const r=await fetch(route,{method:"POST",headers:{"Content-Type":"application/json","X-Tonart-Token":TOKEN},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||"Falha");return d}
function drawTopics(topics){const node=el("topics");node.replaceChildren();const all=document.createElement("button");all.className="topic"+(!topic?" active":"");text(all,"span","Todos os estúdios");text(all,"span",fmt(total));all.onclick=()=>selectTopic("");node.append(all);
topics.forEach(x=>{const b=document.createElement("button");b.className="topic"+(topic===x.name?" active":"");text(b,"span",x.name);text(b,"span",fmt(x.count));b.onclick=()=>selectTopic(x.name);node.append(b)})}
function selectTopic(name){topic=name;currentPage=1;refresh()}
function drawGallery(){const root=el("gallery");root.replaceChildren();for(const x of items){const b=document.createElement("button");b.className="tile"+(selected?.message_id===x.message_id?" active":"");const img=document.createElement("img");img.loading="lazy";setThumb(img,x.message_id);img.alt=x.model||"Mensagem "+x.message_id;b.append(img);const d=document.createElement("div");d.className="details";text(d,"div",x.model||x.character_name||"Imagem #"+x.message_id);text(d,"div",x.original_topic,"sub");text(d,"span",x.status,"pill");b.append(d);b.onclick=()=>selectImage(x);root.append(b)}if(!items.length)text(root,"p","Nenhuma imagem encontrada.","empty");
el("summary").textContent=fmt(total)+" imagens nesta visualização";el("page").textContent="Página "+currentPage;el("prev").disabled=currentPage<=1;el("next").disabled=currentPage*48>=total}
function selectImage(item){selected=item;el("notSelected").hidden=true;el("editor").hidden=false;setThumb(el("large"),item.message_id,960);el("fileId").textContent="Mensagem "+item.message_id+" · "+item.original_topic;el("originalCaption").textContent=item.source_caption||"Sem legenda nesta mensagem. Consulte o álbum e o arquivo original antes de identificar.";for(const [key,id]of Object.entries(fields)){el(id).value=item[key]||(key==="studio"?item.original_topic:"")}drawGallery()}
async function refresh(){if(refreshing)return;refreshing=true;try{const stats=await api("/api/stats");el("numImages").textContent=fmt(stats.total);el("numPending").textContent=fmt(stats.by_status.pendente||0);el("numCheck").textContent=fmt(stats.source_checkpoint);const q=new URLSearchParams({page:currentPage,limit:48,topic,status,q:search});const data=await api("/api/items?"+q);items=data.items;total=data.total;drawTopics(stats.topics);drawGallery();if(selected){const latest=items.find(x=>x.message_id===selected.message_id);if(latest&&!typing)selected=latest}}catch(e){notify("Erro de sincronização: "+e.message)}finally{refreshing=false}}
el("search").addEventListener("input",()=>{search=el("search").value;currentPage=1;clearTimeout(window.searchTimer);window.searchTimer=setTimeout(refresh,350)});
el("statusFilter").onchange=()=>{status=el("statusFilter").value;currentPage=1;refresh()};
el("prev").onclick=()=>{currentPage=Math.max(1,currentPage-1);refresh()};el("next").onclick=()=>{currentPage++;refresh()};
el("editor").addEventListener("input",()=>{typing=true});
el("save").onclick=async()=>{if(!selected)return;const payload={message_id:selected.message_id,revision:selected.revision};for(const [key,id]of Object.entries(fields))payload[key]=el(id).value;try{const ret=await post("/api/annotate",payload);selected={...selected,...payload,revision:ret.revision};typing=false;notify("Identificação salva. Original preservado.");await refresh()}catch(e){notify(e.message)}};
el("original").onclick=()=>{if(selected)window.open("https://t.me/c/2370335738/"+selected.message_id,"_blank","noopener")};
el("export").onclick=async()=>{try{const result=await post("/api/export",{});el("exports").textContent="Manifesto gravado em: "+result.path;notify("Manifesto gerado para revisão, sem publicação.")}catch(e){notify(e.message)}};
el("materialize").onclick=async()=>{try{const result=await post("/api/materialize",{});el("exports").textContent="Pastas revisadas: "+result.root+" | novas "+result.created+" | existentes "+result.existing;notify("Pastas nomeadas geradas, sem modificar originais.")}catch(e){notify(e.message)}};
el("compare").onclick=async()=>{try{const result=await post("/api/import-tonart-csv",{path:el("tonartFile").value});el("exports").textContent="Comparadas "+result.candidates+" imagens TONART; duplicatas exatas com Telegram: "+result.exact_hash_matches;notify("Comparação em staging; nada foi publicado ou apagado.")}catch(e){notify(e.message)}};
refresh();setInterval(()=>{if(!typing)refresh()},10000);

/* Fluxo de revisão por MODELO. Não confirma automaticamente sugestões do Telegram. */
let viewMode="models",chosenGroup=null,modelTotal=0;
let queuePageIndex=0,queueCursors=[""],queueNextCursor="",queueHasMore=false;
let queueRequestId=0,chosenLegacyAudit=null;
function resetReviewQueue(){
 queuePageIndex=0;queueCursors=[""];queueNextCursor="";queueHasMore=false;queueRequestId++;
}
let lastSplitGalleryKey="";
function selectLegacyAuditGroup(item){
 chosenLegacyAudit=item;
 boardSplitSelection.clear();
 el("legacySplitForm").hidden=item.review_state!=="attention";
 el("legacySplitOpenNew").hidden=true;
 lastSplitGalleryKey="";
 el("legacySplitTitle").value="";
 el("legacySplitVariant").value="";
 el("legacySplitNote").value="";
 updateBoardSplitCount();
 el("nameReview").hidden=true;
 el("legacyAuditReview").hidden=false;
 el("legacyAuditTitle").textContent=(item.title||"Modelo sem título")+" · "+item.original_topic;
 el("legacyAuditMeta").textContent=item.photos+" fotos · "+
   item.unique_files+" arquivos únicos · "+item.source_albums+" álbuns · "+
   item.risk_label+" · "+item.review_state;
 el("legacyAuditDecision").value="";
 el("legacyAuditNotes").value="";
 const audited=item.review_state==="audited";
 el("legacyAuditForm").hidden=audited;
 el("legacyAuditStatus").textContent=audited
   ?"Já existe revisão visual registrada. Esta galeria não será auditada novamente automaticamente."
   :item.review_state==="attention"
    ?"Há pendência editorial registrada; confira as imagens e a justificativa anterior."
    :"Abra a prancha e compare todas as fotos antes de registrar uma conclusão.";
}
el("legacyAuditOpenBoard").onclick=()=>{
 if(chosenLegacyAudit)openBoard(chosenLegacyAudit.group_key);
};
el("legacyAuditSave").onclick=async()=>{
 if(!chosenLegacyAudit)return;
 const decision=el("legacyAuditDecision").value;
 const note=el("legacyAuditNotes").value.trim();
 if(!["same_sculpture","different_sculptures","needs_more_evidence"].includes(decision) ||
    note.length<15){
  notify("Selecione a conclusão e descreva a evidência visual (15+ caracteres).");return;
 }
 const item=chosenLegacyAudit;
 const control=el("legacyAuditSave");
 control.disabled=true;
 try{
  const result=await post("/api/audit-legacy-gallery",{
   group_key:item.group_key,revision:item.revision,decision,note
  });
  chosenLegacyAudit={...item,revision:result.revision,
    review_state:decision==="same_sculpture"?"audited":"attention"};
  el("legacyAuditStatus").textContent=decision==="same_sculpture"
    ?"Auditoria visual registrada; sem liberar identidade comercial ou publicação."
    :"Pendência editorial registrada. Galeria intacta; corrigir somente após revisão.";
  if(decision==="same_sculpture"){
   el("legacyAuditForm").hidden=true;
   el("legacySplitForm").hidden=true;
   boardSplitSelection.clear();
  }else{
   el("legacySplitForm").hidden=decision!=="different_sculptures";
  }
  updateBoardSplitCount();
  notify("Revisão registrada no histórico canônico. Nenhuma foto foi movida.");
  resetReviewQueue();await refreshReviewQueue();
 }catch(e){notify("Auditoria da galeria: "+e.message);}
 finally{control.disabled=false;}
};
el("legacySplitOpenNew").onclick=()=>{
 if(lastSplitGalleryKey)openBoard(lastSplitGalleryKey);
};
el("legacySplitSave").onclick=async()=>{
 if(!chosenLegacyAudit || chosenLegacyAudit.review_state!=="attention"){
  notify("Registre antes uma auditoria de esculturas diferentes.");return;
 }
 const ids=[...boardSplitSelection].sort((a,b)=>a-b);
 const note=el("legacySplitNote").value.trim();
 if(ids.length<1 || ids.length>=chosenLegacyAudit.photos || note.length<15){
  notify("Selecione apenas a escultura diferente na prancha e descreva a evidência (15+ caracteres).");
  return;
 }
 const item=chosenLegacyAudit;
 const control=el("legacySplitSave");
 control.disabled=true;
 try{
  const result=await post("/api/split-legacy-gallery",{
   group_key:item.group_key,revision:item.revision,
   message_ids:ids,title:el("legacySplitTitle").value.trim(),
   variant:el("legacySplitVariant").value.trim(),note
  });
  chosenLegacyAudit={...item,revision:result.source_revision,
    photos:result.remaining_ids.length,review_state:"attention"};
  lastSplitGalleryKey=result.new_group;
  boardSplitSelection.clear();
  el("legacySplitForm").hidden=true;
  el("legacySplitOpenNew").hidden=false;
  el("legacyAuditStatus").textContent=
   "Separação registrada: "+result.moved_ids.length+" mensagem(ns) na nova galeria "+
   result.new_group+". Todos os originais preservados; estado em revisão.";
  if(el("boardDialog").open)el("boardDialog").close();
  notify("Separação atômica registrada no histórico; sem aprovação comercial.");
  resetReviewQueue();await refreshReviewQueue();
 }catch(e){notify("Separação bloqueada: "+e.message);}
 finally{control.disabled=false;}
};
async function refreshReviewQueue(){
 if(viewMode!=="queue")return;
 const grouped=el("queueKind").value==="legacy_groups";
 el("legacyAuditFilters").hidden=!grouped;
 el("queueVariantLabel").hidden=grouped;
 if(!grouped)el("legacyAuditReview").hidden=true;
 const requestId=++queueRequestId;
 const params=grouped
   ?new URLSearchParams({
     topic,state:el("legacyAuditState").value,risk:el("legacyAuditRisk").value,
     q:search,cursor:queueCursors[queuePageIndex]||"",limit:24
   })
   :new URLSearchParams({
     topic,kind:el("queueKind").value,variant:el("queueVariant").value,
     q:search,cursor:queueCursors[queuePageIndex]||"",limit:48
   });
 try{
  const path=grouped?"/api/legacy-album-audit?":"/api/review-queue?";
  const data=await api(path+params);
  if(requestId!==queueRequestId||viewMode!=="queue")return;
  queueNextCursor=data.next_cursor||"";
  queueHasMore=data.has_more===true;
  const node=el("queueResults");
  node.replaceChildren();
  for(const item of data.items||[]){
   const tile=document.createElement("button");
   tile.className="tile";
   const img=document.createElement("img");
   setThumb(img,grouped?item.sample_message:item.message_id);
   img.alt=(item.title||"Sem nome")+" · "+(item.original_topic||"");
   tile.append(img);
   const detail=document.createElement("div");
   detail.className="details";
   text(detail,"div",item.title||"Sem nome identificado");
   text(detail,"div",(item.original_topic||"")+
     (item.universe?" · "+item.universe:"")+
     (item.variant?" · "+item.variant:""),"sub");
   text(detail,"div",grouped
      ?item.photos+" fotos · "+item.risk_label+" · "+
        (item.review_state==="audited"?"Já auditada":
         item.review_state==="attention"?"Pendente de correção":"Sem revisão visual")
      :item.reason+" · #"+item.message_id,"pill");
   tile.append(detail);
   tile.onclick=()=>{
    if(grouped){selectLegacyAuditGroup(item);openBoard(item.group_key);}
    else{el("legacyAuditReview").hidden=true;openName(item);el("nameReview").hidden=false;}
   };
   node.append(tile);
  }
  if(!data.items?.length)text(node,"p",grouped
    ?"Nenhuma galeria nesta classificação.":"Nenhuma pendência com esses filtros.","empty");
  const countLabel=grouped?" galerias":" imagens";
  el("queueSummary").textContent=fmt(data.total)+countLabel+
    (grouped?" · revisão de agrupamentos, sem mesclar ou desmembrar automaticamente."
            :" no filtro · sem confirmação ou publicação automática.");
  el("summary").textContent=fmt(data.total)+countLabel+" na fila filtrada";
  el("page").textContent="Página "+(queuePageIndex+1);
  el("prev").disabled=queuePageIndex<=0;
  el("next").disabled=!queueHasMore;
 }catch(e){if(requestId===queueRequestId)notify("Fila de revisão: "+e.message);}
}

let albumCandidates=[],albumCandidatePage=0,albumCandidateTopic="",albumCandidateBusy=false;
async function refreshAlbumCandidates(next=false){
 const requestedTopic=topic;
 if(albumCandidateBusy)return;
 if(!next&&albumCandidateTopic===requestedTopic&&albumCandidatePage>0)return;
 albumCandidateBusy=true;
 const select=el("albumCandidate"),previous=select.value;
 try{
  if(!next){
   albumCandidates=[];albumCandidatePage=0;albumCandidateTopic=requestedTopic;
   select.replaceChildren();
   const first=document.createElement("option");first.value="";
   first.textContent=requestedTopic?"Selecione um álbum para comparar as vistas":"Selecione um estúdio à esquerda";
   select.append(first);
  }
  if(!requestedTopic){el("loadMoreAlbums").hidden=true;return;}
  const page=next?albumCandidatePage+1:1;
  const data=await api("/api/album-candidates?"+new URLSearchParams({topic:requestedTopic,limit:60,page}));
  if(topic!==requestedTopic)return;
  for(const item of data.items||[]){
   if(albumCandidates.some(x=>x.album_id===item.album_id))continue;
   albumCandidates.push(item);
   const option=document.createElement("option");
   option.value=item.album_id;
   option.textContent=item.image_count+" livres / "+(item.album_image_count||item.image_count)+" fotos · #"+item.message_ids[0]+(item.caption?" · "+item.caption.slice(0,35):"");
   select.append(option);
  }
  albumCandidatePage=page;
  el("loadMoreAlbums").hidden=!data.has_more;
  if(albumCandidates.some(x=>x.album_id===previous))select.value=previous;
 }finally{albumCandidateBusy=false;}
}
el("loadMoreAlbums").onclick=()=>refreshAlbumCandidates(true);
el("loadAlbumCandidate").onclick=()=>{
 const item=albumCandidates.find(x=>x.album_id===el("albumCandidate").value);
 if(!item||item.topic!==topic){notify("Selecione um álbum do estúdio antes de revisar.");return;}
 const selectedIds=new Set(item.message_ids);
 const syncSelection=()=>{
  const ids=item.message_ids.filter(mid=>selectedIds.has(mid));
  el("galleryIds").value=ids.join(", ");
  el("albumSelectionCount").textContent=ids.length+" de "+item.image_count+" fotos livres selecionadas. Confira se todas pertencem à mesma escultura.";
 };
 const root=el("albumCandidatePreview");root.replaceChildren();
 const already=new Map((item.already_grouped||[]).map(x=>[x.message_id,x]));
 for(const mid of (item.all_message_ids||item.message_ids)){
  const wrapper=document.createElement("div");
  const a=document.createElement("a");a.href="/media/"+mid;a.target="_blank";a.rel="noopener noreferrer";
  const img=document.createElement("img");setThumb(img,mid);img.loading="lazy";
  img.alt="Mensagem "+mid;img.className="preview";
  a.append(img);
  const taken=already.get(mid);
  text(a,"div","#"+mid+(taken?" · já agrupada"+(taken.variant?" · "+taken.variant:""):" · livre"),"sub");
  wrapper.append(a);
  if(!taken){
   const label=document.createElement("label");label.className="sub";
   label.style.cssText="display:flex;gap:6px;align-items:center;margin:4px 0 8px";
   const check=document.createElement("input");check.type="checkbox";check.checked=true;
   check.style.width="auto";check.setAttribute("aria-label","Incluir foto #"+mid+" na galeria");
   check.onchange=()=>{if(check.checked)selectedIds.add(mid);else selectedIds.delete(mid);syncSelection();};
   label.append(check);text(label,"span","Incluir nesta galeria");wrapper.append(label);
  }
  root.append(wrapper);
 }
 syncSelection();
 const warning=item.grouped_images?
   "\n"+item.grouped_images+" imagens já pertencem a outras fichas ou versões. Somente "+item.image_count+
   " fotos livres foram selecionadas; não misture escalas nem substitua revisões anteriores.":"";
 el("albumCandidateCaption").textContent=(item.caption||"Álbum sem legenda.")+warning;
 notify("IDs preenchidos. Confira se todas as imagens são da mesma escultura antes de criar a galeria.");
};

async function refreshModels(){
 if(viewMode!=="models")return;
 try{
  const filter=(status==="revisar"||status==="confirmado"||status==="provavel")?status:"";
  const p=new URLSearchParams({page:currentPage,limit:48,topic,q:search,state:filter,min_images:el("multiplePhotosOnly").checked?2:1,unnamed:el("onlyUnnamedModels").checked?"1":"0"});
  const result=await api("/api/models?"+p);
  await refreshAlbumCandidates();
  modelTotal=result.total;
  const root=el("modelResults");root.replaceChildren();
  for(const g of result.items){
   const b=document.createElement("button");b.className="tile";
   const img=document.createElement("img");img.loading="lazy";setThumb(img,g.sample_message);img.alt=g.title;b.append(img);
   const details=document.createElement("div");details.className="details";
   text(details,"div",g.title);
   text(details,"div",g.studio+(g.universe?" · "+g.universe:""),"sub");
   const distinct=g.unique_photo_count===undefined?g.image_count:g.unique_photo_count;
   text(details,"span",distinct+" fotos únicas · "+g.image_count+" mensagens · "+g.state,"pill");
   if(distinct===1&&g.image_count>1)text(details,"div","Mensagens com foto repetida — revisar","sub");
   b.append(details);b.onclick=()=>openModel(g.group_key);root.append(b);
  }
  if(!result.items.length)text(root,"p","Nenhum grupo com estes filtros. Imagens sem legenda permanecem em revisão.","empty");
  el("summary").textContent=fmt(modelTotal)+(el("multiplePhotosOnly").checked?" galerias com m?ltiplas fotos":" galerias de modelos, incluindo foto ?nica");
  el("page").textContent="Página "+currentPage;
  el("prev").disabled=currentPage<=1;el("next").disabled=currentPage*48>=modelTotal;
  const stat=await api("/api/stats");
  const s=stat.smart||{};
  const gs=stat.galleries||{};
  el("smartSummary").textContent=fmt(gs.photos_in_galleries||0)+" mensagens de fotos vinculadas a "+fmt(gs.galleries||0)+" galerias · "+
    fmt(gs.visually_reviewed_galleries||0)+" galerias revisadas visualmente · "+
    fmt(s.images_needing_review||0)+" imagens ainda sem associação.";
 }catch(e){notify("Modelos: "+e.message)}
}
async function openModel(key){
 try{
  const g=await api("/api/model/"+key);
  chosenGroup=g;
  resetGalleryCandidates();
  const uniquePhotos=new Map();
  for(const item of g.images){
   const digest=(item.sha256||"").trim();
   const key=digest||"msg:"+item.message_id;
   if(!uniquePhotos.has(key))uniquePhotos.set(key,item);
  }
  el("modelReview").hidden=false;
  el("modelReviewTitle").textContent=g.title;
  el("modelReviewMeta").textContent=g.studio+(g.universe?" · "+g.universe:"")+(g.variant?" · "+g.variant:"")+" · "+g.state+" · "+uniquePhotos.size+" fotos únicas / "+g.images.length+" mensagens";
  el("modelReviewState").value=g.state==="confirmado"?"confirmado":"revisar";
  el("modelOfficialUrl").value="";
  el("modelReviewNotes").value="";
  const imgs=el("modelReviewImages");imgs.replaceChildren();
  if(g.images.length>uniquePhotos.size){
   text(imgs,"p",(g.images.length-uniquePhotos.size)+" mensagens repetem arquivos já exibidos; todas continuam vinculadas no SQLite.","sub");
  }
  for(const item of uniquePhotos.values()){
   const a=document.createElement("a");a.href="/media/"+item.message_id;a.target="_blank";a.rel="noopener";
   const img=document.createElement("img");setThumb(img,item.message_id);img.alt="Mensagem "+item.message_id;img.loading="lazy";img.className="preview";
   a.append(img);text(a,"div","#"+item.message_id,"sub");
   const cell=document.createElement("div");cell.append(a);
   const edit=document.createElement("button");edit.textContent="Nomear esta foto";
   edit.onclick=()=>editGalleryPhotoName(item.message_id);
   cell.append(edit);imgs.append(cell);
  }
  const evidence=el("modelReviewEvidence");evidence.replaceChildren();
  for(const conflict of (g.identity_conflicts||[])){
   text(evidence,"p","Atenção: um mesmo arquivo possui nomes diferentes: "+conflict.titles+". Confirme a identidade pela fonte original antes de aprovar esta ficha.","sub");
  }
  for(const e of g.evidence){
   const a=document.createElement("a");
   const url=new URL(e.source_url);if(url.protocol!=="https:")continue;
   a.href=url.href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=e.source_type+" · "+url.hostname+" · "+url.pathname; evidence.append(a);
  }
  if(!g.evidence.length)text(evidence,"p","Sem fonte vinculada.","sub");
 }catch(e){notify(e.message)}
}
el("saveModelReview").onclick=async()=>{
 if(!chosenGroup)return;
 const state=el("modelReviewState").value,official_url=el("modelOfficialUrl").value.trim();
 if(state==="confirmado"&&!official_url){notify("Para confirmar, informe a publicação oficial conferida.");return}
 try{
  await post("/api/review-model",{group_key:chosenGroup.group_key,revision:chosenGroup.revision,state,official_url,notes:el("modelReviewNotes").value});
  notify("Revisão registrada no banco local.");
  await openModel(chosenGroup.group_key);await refreshModels();
 }catch(e){notify(e.message)}
};
function setView(mode){
 viewMode=mode;currentPage=1;status="";el("statusFilter").value="";
 el("gallery").hidden=mode!=="images";
 el("modelResults").hidden=mode!=="models";
 el("nameResults").hidden=mode!=="names";
 el("queueResults").hidden=mode!=="queue";
 el("queueFilters").hidden=mode!=="queue";
 el("statusFilter").hidden=mode==="queue";
 el("smartSummary").hidden=mode==="queue";
 el("legacyAuditReview").hidden=true;
 el("galleryCreate").hidden=mode!=="models";
 el("unnamedFilter").hidden=mode!=="models";
 el("namesMode").className=mode==="names"?"primary":"";
 el("modelsMode").className=mode==="models"?"primary":"";
 el("imagesMode").className=mode==="images"?"primary":"";
 el("queueMode").className=mode==="queue"?"primary":"";
 el("modelReview").hidden=mode!=="models"||!chosenGroup;
 el("nameReview").hidden=!(mode==="names"||mode==="queue")||!chosenName;
 if(mode==="queue"){resetReviewQueue();refreshReviewQueue();}
 else if(mode==="names")refreshNames();
 else if(mode==="models")refreshModels();
 else originalRefresh();
}
const originalRefresh=refresh;
refresh=function(){return viewMode==="names"?refreshNames():viewMode==="queue"?refreshReviewQueue():viewMode==="models"?refreshModels():originalRefresh()};
el("modelsMode").onclick=()=>setView("models");
el("onlyUnnamedModels").onchange=()=>{currentPage=1;refreshModels()};
el("imagesMode").onclick=()=>setView("images");
selectTopic=function(name){topic=name;currentPage=1;if(viewMode==="models")refreshModels();else refresh()};
el("statusFilter").onchange=()=>{status=el("statusFilter").value;currentPage=1;if(viewMode==="models")refreshModels();else refresh()};
el("prev").onclick=()=>{currentPage=Math.max(1,currentPage-1);if(viewMode==="models")refreshModels();else refresh()};
el("next").onclick=()=>{currentPage++;if(viewMode==="models")refreshModels();else refresh()};
el("search").addEventListener("input",()=>{if(viewMode==="models"){search=el("search").value;currentPage=1;clearTimeout(window.smartSearch);window.smartSearch=setTimeout(refreshModels,350)}});
setView("models");
/* Um unico ciclo ja chama refresh() para a aba ativa. */

/* Etapa 1: nomear primeiro; etapa 2: agrupar após os nomes sugeridos. */
async function refreshNames(){
 if(viewMode!=="names")return;
 try {
  const nameStatus=["provavel","revisar","confirmado"].includes(status)?status:"";
  const qs=new URLSearchParams({page:currentPage,limit:48,topic,q:search,status:nameStatus});
  const [data,info]=await Promise.all([api("/api/names?"+qs),api("/api/stats")]);
  nameTotal=data.total;
  drawTopics(info.topics);
  el("numImages").textContent=fmt(info.total);
  el("numPending").textContent=fmt(info.naming?.awaiting_name_review||0);
  el("numCheck").textContent=fmt(info.source_checkpoint);
  const root=el("nameResults");root.replaceChildren();
  for(const item of data.items){
   const tile=document.createElement("button");tile.className="tile";
   const img=document.createElement("img");img.loading="lazy";setThumb(img,item.message_id);
   img.alt=item.title||"Mensagem "+item.message_id;tile.append(img);
   const infoBox=document.createElement("div");infoBox.className="details";
   text(infoBox,"div",item.title||"Sem nome identificado");
   text(infoBox,"div",item.studio+(item.universe?" · "+item.universe:""),"sub");
   text(infoBox,"span",(item.gallery_image_count>=2?item.gallery_image_count+" fotos · ":"")+item.status+" · #"+item.message_id,"pill");
   tile.append(infoBox);tile.onclick=()=>openName(item);root.append(tile);
  }
  if(!data.items.length)text(root,"p","Nenhuma proposta neste filtro.","empty");
  const names=info.naming||{};
  el("smartSummary").textContent=fmt(names.names_proposed||0)+" nomes sugeridos · "+
   fmt(names.names_confirmed||0)+" confirmados · "+
   fmt(names.awaiting_name_review||0)+" sem nome confiável · "+
   fmt(names.images_waiting||0)+" aguardando nomeação.";
  el("summary").textContent=fmt(nameTotal)+" imagens nesta etapa";
  el("page").textContent="Página "+currentPage;
  el("prev").disabled=currentPage<=1;
  el("next").disabled=currentPage*48>=nameTotal;
 }catch(e){notify("Nomes: "+e.message)}
}
function openName(item){
 chosenName=item;el("nameReview").hidden=false;
 setThumb(el("namePreview"),item.message_id,960);
 el("nameCaption").textContent=item.source_caption||"Legenda ausente: revisão necessária.";
 el("nameTitle").value=item.title||"";
 el("nameStudio").value=item.studio||"";
 el("nameUniverse").value=item.universe||"";
 el("nameVariant").value=item.variant||"";
 el("nameStatus").value=item.status==="confirmado"?"confirmado":"revisar";
 el("nameOfficialUrl").value=item.official_url||"";
 updateNameSourceLink();
 el("nameNotes").value=item.notes||"";
 el("nameFilename").textContent="Arquivo proposto: "+(item.filename||"A definir");
 el("nameOpenGallery").hidden=!(item.gallery_key&&item.gallery_image_count>=2);
 showNameReferences(item).catch(err=>notify("Fontes: "+err.message));
 showTelegramEvidence(item).catch(err=>{
   if(chosenName?.message_id===item.message_id)el("nameTelegramEvidence").textContent="Evidências indisponíveis: "+err.message;
 });
}
el("saveNameReview").onclick=async()=>{
 if(!chosenName)return;
 try{
  const data={
   message_id:chosenName.message_id,revision:chosenName.revision,
   title:el("nameTitle").value,studio:el("nameStudio").value,
   universe:el("nameUniverse").value,variant:el("nameVariant").value,
   status:el("nameStatus").value,official_url:el("nameOfficialUrl").value,
   notes:el("nameNotes").value
  };
  const result=await post("/api/review-name",data);
  chosenName={...chosenName,...data,revision:result.revision,filename:result.filename};
  el("nameFilename").textContent="Arquivo proposto: "+result.filename;
  notify("Nome salvo na curadoria; o arquivo original não foi alterado.");
  if(viewMode==="queue"){resetReviewQueue();await refreshReviewQueue();}
  else await refreshNames();
 }catch(e){notify(e.message)}
};
el("nameMessage").onclick=()=>{
 if(chosenName)window.open("https://t.me/c/2370335738/"+chosenName.message_id,"_blank","noopener");
};
el("exportNames").onclick=async()=>{
 try{
  const result=await post("/api/export-names",{});
  el("exports").textContent="Nomes propostos: "+result.path+" · "+fmt(result.exported)+" registros";
  notify("Manifesto de nomes exportado, sem publicar os arquivos.");
 }catch(e){notify(e.message)}
};
el("namesMode").onclick=()=>setView("names");
el("queueMode").onclick=()=>setView("queue");
for(const filter of ["queueKind","queueVariant","legacyAuditState","legacyAuditRisk"]){
 el(filter).onchange=()=>{el("legacyAuditReview").hidden=true;resetReviewQueue();refreshReviewQueue();};
}
selectTopic=function(name){topic=name;currentPage=1;if(viewMode==="queue")resetReviewQueue();refresh()};
el("statusFilter").onchange=()=>{status=el("statusFilter").value;currentPage=1;refresh()};
el("prev").onclick=()=>{
 if(viewMode==="queue"){queuePageIndex=Math.max(0,queuePageIndex-1);refreshReviewQueue();return;}
 currentPage=Math.max(1,currentPage-1);refresh();
};
el("next").onclick=()=>{
 if(viewMode==="queue"){
  if(queueHasMore&&queueNextCursor){
   queuePageIndex++;queueCursors[queuePageIndex]=queueNextCursor;refreshReviewQueue();
  }return;
 }
 currentPage++;refresh();
};
el("search").addEventListener("input",()=>{
 if(viewMode!=="images"){
  search=el("search").value;currentPage=1;
  if(viewMode==="queue")resetReviewQueue();
  clearTimeout(window.smartSearch);
  window.smartSearch=setTimeout(refresh,350);
 }
});
setView("models");


el("materializeNames").onclick=async()=>{
 try{
  const result=await post("/api/materialize-confirmed-names",{});
  el("exports").textContent="Biblioteca revisada: "+result.root+
   " · novos "+fmt(result.created)+" · já existentes "+fmt(result.existing)+
   " · originais ausentes "+fmt(result.missing_original);
  notify("Somente nomes confirmados gerados. Originais mantidos.");
 }catch(e){notify(e.message)}
};

async function showTelegramEvidence(item){
 const output=el("nameTelegramEvidence");
 output.replaceChildren();
 text(output,"div","Consultando a mensagem original e o álbum...","sub");
 const evidence=await api("/api/telegram-findings/"+encodeURIComponent(item.message_id));
 if(chosenName?.message_id!==item.message_id)return;
 output.replaceChildren();
 const candidates=(evidence.candidates||[]).filter(c=>
   c.evidence_type==="telegram_original_message" ||
   c.evidence_type==="telegram_reply_text" ||
   c.evidence_type==="telegram_album_context"
 );
 if(!candidates.length){
   text(output,"div","Sem legenda vinculada diretamente; manter revisão visual.","sub");
   return;
 }
 const seen=new Set();
 for(const candidate of candidates.slice(0,12)){
   const key=[candidate.source_message_id,candidate.title,candidate.evidence_type].join("|");
   if(seen.has(key))continue;
   seen.add(key);
   const card=document.createElement("div");
   card.className="buttons";
   card.style.alignItems="center";
   card.style.marginBottom="8px";
   const sourceId=Number(candidate.source_message_id);
   if(Number.isSafeInteger(sourceId)&&sourceId>0){
     const preview=document.createElement("img");
     preview.width=74;
     preview.height=90;
     preview.loading="lazy";
     preview.style.objectFit="contain";
     preview.alt="Imagem da mensagem "+sourceId;
     setThumb(preview,sourceId,256);
     card.append(preview);
   }
   const detail=document.createElement("div");
   detail.style.flex="1";
   text(detail,"div",candidate.title||"Sem título");
   text(detail,"div",
     (candidate.evidence_type==="telegram_album_context"?"Mesmo álbum, revisar vistas":
      candidate.evidence_type==="telegram_reply_text"?"Resposta vinculada ao Telegram":
      "Legenda da própria mensagem")+" · #"+sourceId+" · "+candidate.status,
     "sub");
   const use=document.createElement("button");
   use.type="button";
   use.textContent="Usar como rascunho";
   use.onclick=()=>{
     if(chosenName?.message_id!==item.message_id)return;
     el("nameTitle").value=candidate.title||"";
     el("nameStudio").value=candidate.studio||item.original_topic||"";
     el("nameUniverse").value=candidate.universe||"";
     el("nameVariant").value=candidate.variant||"";
     el("nameStatus").value="revisar";
     notify("Título copiado para revisão, sem confirmação ou gravação automática.");
   };
   detail.append(use);
   card.append(detail);
   output.append(card);
 }
}

async function showNameReferences(item){
 const refs=el("nameOfficialProfiles"),matches=el("nameVisualSuggestions");
 refs.replaceChildren();matches.replaceChildren();
 text(refs,"div","Consultando catálogos do estúdio...","sub");
 const [profiles,visual]=await Promise.all([
   api("/api/official-sources?"+new URLSearchParams({topic:item.original_topic})),
   api("/api/visual-candidates/"+item.message_id)
 ]);
 if(chosenName?.message_id!==item.message_id)return;
 refs.replaceChildren();
 if(!profiles.profiles.length)text(refs,"div","Não há perfil oficial previamente identificado para este tópico.","sub");
 for(const source of profiles.profiles){
   const link=document.createElement("a");link.href=source.url;link.rel="noopener noreferrer";link.target="_blank";
   link.textContent=source.studio+" · "+source.provider+" · Abrir catálogo oficial";refs.append(link);
 }
 if(!visual.candidates.length)text(matches,"div","Nenhuma imagem semelhante suficientemente próxima foi encontrada.","sub");
 for(const candidate of visual.candidates){
   const group=document.createElement("div");
   group.className="buttons";group.style.alignItems="center";group.style.marginBottom="8px";
   const img=document.createElement("img");img.width=70;img.height=85;
   img.style.objectFit="contain";setThumb(img,candidate.candidate_message_id,256);
   img.alt="Imagem semelhante #"+candidate.candidate_message_id;img.loading="lazy";
   group.append(img);
   const content=document.createElement("div");
   content.style.flex="1";
   text(content,"div",candidate.title||"Sem nome");
   text(content,"div","Origem #"+candidate.candidate_message_id+" · Semelhança "+Math.round(candidate.similarity*100)+"%","sub");
   const choose=document.createElement("button");
   choose.textContent="Usar como rascunho";choose.onclick=()=>{
     el("nameTitle").value=candidate.title||"";
     el("nameStudio").value=candidate.studio||"";
     el("nameUniverse").value=candidate.universe||"";
     el("nameVariant").value=candidate.variant||"";
     el("nameStatus").value="revisar";
     notify("Nome copiado para revisão; sem confirmação nem gravação automática.");
   };
   content.append(choose);group.append(content);matches.append(group);
 }
}

function updateNameSourceLink(){
 const link=el("nameSourceLink"),textValue=el("nameOfficialUrl").value.trim();
 let allowed=false,parsed;
 try{parsed=new URL(textValue);
   allowed=parsed.protocol==="https:"&&!parsed.username&&!parsed.password;
 }catch(_){allowed=false;}
 link.hidden=!allowed;
 if(allowed)link.href=parsed.href;
 else link.removeAttribute("href");
}
el("nameOfficialUrl").addEventListener("input",updateNameSourceLink);

async function editGalleryPhotoName(mid){
 try{
  const found=await api("/api/names?"+new URLSearchParams({q:String(mid),limit:120}));
  const item=found.items.find(x=>x.message_id===mid);
  if(!item)throw Error("Imagem não encontrada na etapa de nomes");
  topic=item.original_topic;
  search=String(mid);el("search").value=search;currentPage=1;
  setView("names");openName(item);
 }catch(e){notify("Nomear foto: "+e.message)}
}


el("nameOpenGallery").onclick=async()=>{
 if(!chosenName?.gallery_key)return;
 setView("models");
 await openModel(chosenName.gallery_key);
};
el("saveVisualGallery").onclick=async()=>{
 if(!topic){notify("Selecione um estúdio na coluna esquerda antes de reunir imagens.");return;}
 const ids=el("galleryIds").value.split(/[,;\s]+/).filter(Boolean);
 if(ids.length<2||ids.some(x=>!/^\d+$/.test(x)||!Number.isSafeInteger(Number(x)))){
   notify("Informe pelo menos 2 IDs válidos de mensagens.");return;
 }
 if(new Set(ids).size!==ids.length){notify("Há IDs repetidos.");return;}
 try{
  const allIds=ids.map(Number);
  const response=await post("/api/create-gallery",{
   message_ids:allIds.slice(0,500),topic,
   note:"Mesma escultura e diferentes vistas verificadas na Curadoria Visual local; identidade e direitos não confirmados."
  });
  let revision=(await api("/api/model/"+response.group_key)).revision;
  let total=response.image_count;
  for(let i=500;i<allIds.length;i+=200){
   const result=await post("/api/append-gallery",{
    group_key:response.group_key,revision,message_ids:allIds.slice(i,i+200),
    note:"Fotos adicionais da mesma prancha conferidas visualmente."
   });
   revision=result.revision;total+=result.added;
  }
  notify("Galeria com "+total+" fotos vinculada sem alterar os originais.");
  el("galleryIds").value="";
  await refreshModels();await openModel(response.group_key);
 }catch(e){notify("Galeria não criada: "+e.message);}
};



/* Prancha ampliada: vista unica das fotos do mesmo group_key canonico.
   Deduplica apenas na exibicao por SHA; nao modifica o acervo nem propoe fusoes. */
const BOARD_PAGE_SIZE=24;
let boardAllPhotos=[];
let boardCurrentTitle="";
let boardPage=1;
let boardMode="gallery";
let boardSplitSelection=new Set();
function updateBoardSplitCount(){
 const ids=[...boardSplitSelection].sort((a,b)=>a-b);
 el("legacySplitSelected").textContent=ids.length+" foto(s) selecionada(s): "+
   (ids.length?ids.map(x=>"#"+x).join(", "):"nenhuma");
 el("boardSplitSelection").textContent=ids.length+" marcada(s)";
 el("boardSplitSelection").hidden=boardMode!=="legacy_split";
}
function renderBoardPage(){
  const root=el("boardPhotos");root.replaceChildren();
  const total=boardAllPhotos.length;
  const pages=Math.max(1,Math.ceil(total/BOARD_PAGE_SIZE));
  boardPage=Math.max(1,Math.min(boardPage,pages));
  const start=(boardPage-1)*BOARD_PAGE_SIZE;
  for(const photo of boardAllPhotos.slice(start,start+BOARD_PAGE_SIZE)){
    const figure=document.createElement("figure");
    figure.className="board-photo";
    const link=document.createElement("a");
    link.href="/media/"+photo.message_id;
    link.target="_blank";link.rel="noopener noreferrer";
    const image=document.createElement("img");
    setThumb(image,photo.message_id,960);
    image.alt="Foto "+photo.message_id+" de "+boardCurrentTitle;
    link.append(image);figure.append(link);
    const caption=document.createElement("figcaption");
    caption.className="sub";
    caption.textContent=[
      "#"+photo.message_id,
      boardMode==="telegram"?"Mídia do mesmo álbum: conferir esculturas independentes":
      photo.match_reason==="reviewed_angles"?"Ângulos revisados":"Agrupamento provisório: conferir escultura",
      photo.source_album?"Álbum: "+photo.source_album:"",
      (photo.source_caption||"Legenda não disponível").slice(0,340)
    ].filter(Boolean).join("\n");
    figure.append(caption);
    if(boardMode==="legacy_split"){
      const choice=document.createElement("label");
      choice.className="split-choice";
      const checkbox=document.createElement("input");
      checkbox.type="checkbox";
      checkbox.checked=boardSplitSelection.has(photo.message_id);
      checkbox.onchange=()=>{
        // All Telegram messages with identical bytes must move together.
        for(const sibling of boardAllPhotos){
          if(sibling.sha256===photo.sha256){
            if(checkbox.checked)boardSplitSelection.add(sibling.message_id);
            else boardSplitSelection.delete(sibling.message_id);
          }
        }
        renderBoardPage();
      };
      choice.append(checkbox);
      text(choice,"span","Selecionar esta escultura para separar");
      figure.append(choice);
    }
    const edit=document.createElement("button");
    edit.textContent="Nomear esta foto";
    edit.onclick=async()=>{
      el("boardDialog").close();
      await editGalleryPhotoName(photo.message_id);
    };
    figure.append(edit);root.append(figure);
  }
  if(!total)text(root,"p","Sem fotos no grupo; revisar origem.","empty");
  el("boardPage").textContent="Página "+boardPage+" de "+pages+
    " · mostrando "+(total?start+1:0)+"–"+Math.min(total,start+BOARD_PAGE_SIZE)+
    " de "+total+" fotos";
  el("boardPrev").disabled=boardPage<=1;
  el("boardNext").disabled=boardPage>=pages;
  updateBoardSplitCount();
}
async function openBoard(key){
  if(!/^[0-9a-f]{24}$/.test(String(key||""))){notify("ID de prancha inválido.");return;}
  try{
    const group=await api("/api/model/"+key);
    const photos=new Map();
    for(const item of group.images||[]){
      const fingerprint=(item.sha256||"").trim()||("msg:"+item.message_id);
      if(!photos.has(fingerprint))photos.set(fingerprint,item);
    }
    const splitActive=viewMode==="queue" &&
      el("queueKind").value==="legacy_groups" &&
      chosenLegacyAudit?.group_key===key &&
      chosenLegacyAudit.review_state!=="audited";
    boardAllPhotos=splitActive?(group.images||[]):Array.from(photos.values());
    boardCurrentTitle=group.title||"Modelo sem título";
    boardPage=1;
    boardMode=splitActive?"legacy_split":"gallery";
    el("boardTitle").textContent=boardCurrentTitle;
    el("boardMeta").textContent=[
      group.studio,group.variant,group.state,
      photos.size+" fotos únicas",(group.images||[]).length+" mensagens",
      splitActive?"Marque apenas as fotos da escultura diferente":"",
      (group.identity_conflicts||[]).length+" conflitos de identidade"
    ].filter(Boolean).join(" | ");
    renderBoardPage();
    el("boardDialog").showModal();
  }catch(e){notify("Prancha: "+e.message);}
}
async function openTelegramAlbumBoard(mid){
  const numeric=Number(mid);
  if(!Number.isSafeInteger(numeric)||numeric<=0){
    notify("Mensagem Telegram inválida.");return;
  }
  try{
    const album=await api("/api/telegram-album/"+numeric);
    if(!album.has_album||!album.items?.length){
      notify("Esta imagem não possui álbum Telegram verificado.");return;
    }
    const unique=new Map();
    for(const item of album.items){
      const fingerprint=(item.sha256||"").trim()||("msg:"+item.message_id);
      if(!unique.has(fingerprint))unique.set(fingerprint,item);
    }
    boardAllPhotos=Array.from(unique.values());
    boardMode="telegram";
    boardPage=1;
    boardCurrentTitle="Álbum de origem · "+album.studio;
    el("boardTitle").textContent=boardCurrentTitle;
    el("boardMeta").textContent=[
      "Telegram "+album.album_id,
      unique.size+" fotos únicas",
      album.items.length+" mensagens",
      album.truncated?"Exibição limitada a 100 mídias":"",
      "Mesmo álbum NÃO comprova mesma escultura; compare antes de agrupar"
    ].filter(Boolean).join(" | ");
    renderBoardPage();
    el("boardDialog").showModal();
  }catch(e){notify("Prancha do Telegram: "+e.message);}
}
el("nameTelegramAlbumBoard").onclick=()=>{
  if(chosenName)openTelegramAlbumBoard(chosenName.message_id);
};
el("boardPrev").onclick=()=>{boardPage--;renderBoardPage();el("boardDialog").scrollTop=0;};
el("boardNext").onclick=()=>{boardPage++;renderBoardPage();el("boardDialog").scrollTop=0;};
el("openBoardBtn").onclick=()=>{if(chosenGroup)openBoard(chosenGroup.group_key)};
el("propagateGalleryName").onclick=async()=>{
  if(!chosenGroup)return;
  try{
    const result=await post("/api/propagate-gallery-name",{group_key:chosenGroup.group_key});
    notify("Propostas herdadas: "+fmt(result.inherited_names)+
      " | Galerias com conflito: "+fmt(result.conflicting_galleries)+
      ". Nomes permanecem provisorios.");
    await openModel(chosenGroup.group_key);
  }catch(e){notify("Nome nas outras vistas: "+e.message);}
};
el("closeBoard").onclick=()=>el("boardDialog").close();
el("multiplePhotosOnly").onchange=()=>{currentPage=1;refreshModels()};

/* Concilia o site e o host sem gravar no D1 nem alterar a curadoria.
   O backend compartilha um unico snapshot HTTP por 30 minutos. */
let latestCatalogSync=null;
function renderCatalogSync(){
  if(!latestCatalogSync)return;
  const info=latestCatalogSync;
  el("catalogSyncDetails").hidden=false;
  el("catalogSyncNumbers").textContent=
    "Site: "+fmt(info.site_models)+" | Host: "+fmt(info.host_groups)+
    " | Correspondentes: "+fmt(info.matched)+
    " | So host: "+fmt(info.local_only_count)+
    " | So site: "+fmt(info.site_only_count)+
    " | Variantes/identidades divergentes: "+fmt(info.differences_count);
  const filter=el("catalogSyncStudio").value;
  const host=(info.local_only||[]).filter(x=>!filter||x.studio===filter);
  const site=(info.site_only||[]).filter(x=>!filter||x.studio===filter);
  const diffs=(info.differences||[]).filter(x=>!filter||x.studio===filter);
  const root=el("catalogSyncList");root.replaceChildren();
  text(root,"strong","Somente no host ("+fmt(host.length)+")");
  for(const item of host.slice(0,45)){
    const b=document.createElement("button");
    b.textContent=(item.studio||"Estudio ?")+" | "+(item.title||"Sem nome")+" | "+item.state;
    b.onclick=async()=>{setView("models");await openModel(item.group_key);await openBoard(item.group_key)};
    root.append(b);
  }
  if(host.length>45)text(root,"small","Mais "+fmt(host.length-45)+" grupos: filtre por estudio.");
  text(root,"strong","Somente no site por ID ("+fmt(site.length)+")");
  for(const item of site.slice(0,20))text(root,"div",item.studio+" | "+item.title,"sub");
  if(site.length>20)text(root,"small","Mais "+fmt(site.length-20)+" fichas sem grupo local correspondente.");
  text(root,"strong","Metadados diferentes ("+fmt(diffs.length)+")");
  for(const item of diffs.slice(0,25)){
    const b=document.createElement("button");
    b.textContent=item.studio+" | "+item.title+" | "+item.fields.join(", ");
    b.onclick=async()=>{setView("models");await openModel(item.group_key);await openBoard(item.group_key)};
    root.append(b);
  }
}
async function refreshCatalogSync(){
  const button=el("catalogSyncButton");
  if(button.disabled)return;
  button.disabled=true;
  el("catalogSyncStatus").textContent="Conferindo a API publica e o SQLite local...";
  try{
    const report=await api("/api/catalog-sync");
    latestCatalogSync=report;
    const select=el("catalogSyncStudio"),previous=select.value;
    select.replaceChildren();
    const all=document.createElement("option");all.value="";all.textContent="Todos os estudios";select.append(all);
    for(const studio of report.studios||[]){
      const option=document.createElement("option");
      option.value=studio.studio;
      option.textContent=studio.studio+" | local "+studio.local_only+" / site "+studio.site_only;
      select.append(option);
    }
    if(Array.from(select.options).some(o=>o.value===previous))select.value=previous;
    el("catalogSyncStatus").textContent="Conferencia somente leitura em "+report.observed_at+
      ". Nenhum nome ou direito foi aprovado automaticamente.";
    renderCatalogSync();
  }catch(e){
    latestCatalogSync=null;
    el("catalogSyncDetails").hidden=true;
    el("catalogSyncStatus").textContent="Conferencia indisponivel: "+e.message+
      " Nenhuma divergencia foi inferida do site fora do ar.";
  }
  finally{button.disabled=false;}
}
el("catalogSyncButton").onclick=refreshCatalogSync;
el("catalogSyncStudio").onchange=renderCatalogSync;
// O inventario remoto e pesado: atualizar apenas por acao explicita do operador.
