const TOKEN="__LOCAL_CSRF__";
const el=id=>document.getElementById(id);
let chosenName=null,nameTotal=0;
let items=[],selected=null,currentPage=1,topic="",status="",search="",total=0,refreshing=false,typing=false;
const fmt=n=>Number(n||0).toLocaleString("pt-BR");
const fields={studio:"studio",model:"model",character_name:"character",universe:"universe",file_label:"fileLabel",status:"status",notes:"notes"};
function text(parent,tag,value,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=String(value??"");parent.append(e);return e}
function notify(s){el("notice").textContent=s;setTimeout(()=>{if(el("notice").textContent===s)el("notice").textContent=""},7000)}
async function api(route){const r=await fetch(route,{cache:"no-store"});const d=await r.json();if(!r.ok)throw Error(d.error||"Erro");return d}
async function post(route,data){const r=await fetch(route,{method:"POST",headers:{"Content-Type":"application/json","X-Tonart-Token":TOKEN},body:JSON.stringify(data)});const d=await r.json();if(!r.ok)throw Error(d.error||"Falha");return d}
function drawTopics(topics){const node=el("topics");node.replaceChildren();const all=document.createElement("button");all.className="topic"+(!topic?" active":"");text(all,"span","Todos os estúdios");text(all,"span",fmt(total));all.onclick=()=>selectTopic("");node.append(all);
topics.forEach(x=>{const b=document.createElement("button");b.className="topic"+(topic===x.name?" active":"");text(b,"span",x.name);text(b,"span",fmt(x.count));b.onclick=()=>selectTopic(x.name);node.append(b)})}
function selectTopic(name){topic=name;currentPage=1;refresh()}
function drawGallery(){const root=el("gallery");root.replaceChildren();for(const x of items){const b=document.createElement("button");b.className="tile"+(selected?.message_id===x.message_id?" active":"");const img=document.createElement("img");img.loading="lazy";img.src="/media/"+x.message_id;img.alt=x.model||"Mensagem "+x.message_id;b.append(img);const d=document.createElement("div");d.className="details";text(d,"div",x.model||x.character_name||"Imagem #"+x.message_id);text(d,"div",x.original_topic,"sub");text(d,"span",x.status,"pill");b.append(d);b.onclick=()=>selectImage(x);root.append(b)}if(!items.length)text(root,"p","Nenhuma imagem encontrada.","empty");
el("summary").textContent=fmt(total)+" imagens nesta visualização";el("page").textContent="Página "+currentPage;el("prev").disabled=currentPage<=1;el("next").disabled=currentPage*48>=total}
function selectImage(item){selected=item;el("notSelected").hidden=true;el("editor").hidden=false;el("large").src="/media/"+item.message_id;el("fileId").textContent="Mensagem "+item.message_id+" · "+item.original_topic;el("originalCaption").textContent=item.source_caption||"Sem legenda nesta mensagem. Consulte o álbum e o arquivo original antes de identificar.";for(const [key,id]of Object.entries(fields)){el(id).value=item[key]||(key==="studio"?item.original_topic:"")}drawGallery()}
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
let albumCandidates=[];
async function refreshAlbumCandidates(){
 const select=el("albumCandidate"),previous=select.value;
 albumCandidates=[];select.replaceChildren();
 const first=document.createElement("option");first.value="";
 first.textContent=topic?"Selecione um álbum para comparar as vistas":"Selecione um estúdio à esquerda";
 select.append(first);
 if(!topic)return;
 const data=await api("/api/album-candidates?"+new URLSearchParams({topic,limit:60}));
 albumCandidates=data.items||[];
 for(const item of albumCandidates){
  const option=document.createElement("option");
  option.value=item.album_id;
  option.textContent=item.image_count+" fotos · #"+item.message_ids[0]+(item.caption?" · "+item.caption.slice(0,35):"");
  select.append(option);
 }
 if(albumCandidates.some(x=>x.album_id===previous))select.value=previous;
}
el("loadAlbumCandidate").onclick=()=>{
 const item=albumCandidates.find(x=>x.album_id===el("albumCandidate").value);
 if(!item||item.topic!==topic){notify("Selecione um álbum do estúdio antes de revisar.");return;}
 el("galleryIds").value=item.message_ids.join(", ");
 const root=el("albumCandidatePreview");root.replaceChildren();
 for(const mid of item.message_ids){
  const a=document.createElement("a");a.href="/media/"+mid;a.target="_blank";a.rel="noopener noreferrer";
  const img=document.createElement("img");img.src="/media/"+mid;img.loading="lazy";
  img.alt="Mensagem "+mid;img.className="preview";
  a.append(img);text(a,"div","#"+mid,"sub");root.append(a);
 }
 el("albumCandidateCaption").textContent=item.caption||"Álbum sem legenda: verifique as fotos antes de unir.";
 notify("IDs preenchidos. Confira se todas as imagens são da mesma escultura antes de criar a galeria.");
};

async function refreshModels(){
 if(viewMode!=="models")return;
 try{
  const filter=(status==="revisar"||status==="confirmado"||status==="provavel")?status:"";
  const p=new URLSearchParams({page:currentPage,limit:48,topic,q:search,state:filter,min_images:2,unnamed:el("onlyUnnamedModels").checked?"1":"0"});
  const result=await api("/api/models?"+p);
  await refreshAlbumCandidates();
  modelTotal=result.total;
  const root=el("modelResults");root.replaceChildren();
  for(const g of result.items){
   const b=document.createElement("button");b.className="tile";
   const img=document.createElement("img");img.loading="lazy";img.src="/media/"+g.sample_message;img.alt=g.title;b.append(img);
   const details=document.createElement("div");details.className="details";
   text(details,"div",g.title);
   text(details,"div",g.studio+(g.universe?" · "+g.universe:""),"sub");
   text(details,"span",g.image_count+" imagens · "+g.state,"pill");
   b.append(details);b.onclick=()=>openModel(g.group_key);root.append(b);
  }
  if(!result.items.length)text(root,"p","Nenhum grupo com estes filtros. Imagens sem legenda permanecem em revisão.","empty");
  el("summary").textContent=fmt(modelTotal)+" galerias com pelo menos 2 imagens";
  el("page").textContent="Página "+currentPage;
  el("prev").disabled=currentPage<=1;el("next").disabled=currentPage*48>=modelTotal;
  const stat=await api("/api/stats");
  const s=stat.smart||{};
  const gs=stat.galleries||{};
  el("smartSummary").textContent=fmt(gs.photos_in_galleries||0)+" fotos reunidas em "+fmt(gs.galleries||0)+" galerias · "+
    fmt(gs.visually_reviewed_galleries||0)+" galerias revisadas visualmente · "+
    fmt(s.images_needing_review||0)+" imagens ainda sem associação.";
 }catch(e){notify("Modelos: "+e.message)}
}
async function openModel(key){
 try{
  const g=await api("/api/model/"+key);
  chosenGroup=g;
  el("modelReview").hidden=false;
  el("modelReviewTitle").textContent=g.title;
  el("modelReviewMeta").textContent=g.studio+(g.universe?" · "+g.universe:"")+(g.variant?" · "+g.variant:"")+" · "+g.state+" · "+g.images.length+" imagens";
  el("modelReviewState").value=g.state==="confirmado"?"confirmado":"revisar";
  el("modelOfficialUrl").value="";
  el("modelReviewNotes").value="";
  const imgs=el("modelReviewImages");imgs.replaceChildren();
  for(const item of g.images){
   const a=document.createElement("a");a.href="/media/"+item.message_id;a.target="_blank";a.rel="noopener";
   const img=document.createElement("img");img.src="/media/"+item.message_id;img.alt="Mensagem "+item.message_id;img.loading="lazy";img.className="preview";
   a.append(img);text(a,"div","#"+item.message_id,"sub");
   const cell=document.createElement("div");cell.append(a);
   const edit=document.createElement("button");edit.textContent="Nomear esta foto";
   edit.onclick=()=>editGalleryPhotoName(item.message_id);
   cell.append(edit);imgs.append(cell);
  }
  const evidence=el("modelReviewEvidence");evidence.replaceChildren();
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
 el("galleryCreate").hidden=mode!=="models";
 el("unnamedFilter").hidden=mode!=="models";
 el("namesMode").className=mode==="names"?"primary":"";
 el("modelsMode").className=mode==="models"?"primary":"";
 el("imagesMode").className=mode==="images"?"primary":"";
 el("modelReview").hidden=mode!=="models"||!chosenGroup;
 el("nameReview").hidden=mode!=="names"||!chosenName;
 if(mode==="names")refreshNames();else if(mode==="models")refreshModels();else originalRefresh();
}
const originalRefresh=refresh;
refresh=function(){return viewMode==="names"?refreshNames():viewMode==="models"?refreshModels():originalRefresh()};
el("modelsMode").onclick=()=>setView("models");
el("onlyUnnamedModels").onchange=()=>{currentPage=1;refreshModels()};
el("imagesMode").onclick=()=>setView("images");
selectTopic=function(name){topic=name;currentPage=1;if(viewMode==="models")refreshModels();else refresh()};
el("statusFilter").onchange=()=>{status=el("statusFilter").value;currentPage=1;if(viewMode==="models")refreshModels();else refresh()};
el("prev").onclick=()=>{currentPage=Math.max(1,currentPage-1);if(viewMode==="models")refreshModels();else refresh()};
el("next").onclick=()=>{currentPage++;if(viewMode==="models")refreshModels();else refresh()};
el("search").addEventListener("input",()=>{if(viewMode==="models"){search=el("search").value;currentPage=1;clearTimeout(window.smartSearch);window.smartSearch=setTimeout(refreshModels,350)}});
setView("models");
setInterval(refreshModels,10000);

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
   const img=document.createElement("img");img.loading="lazy";img.src="/media/"+item.message_id;
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
 el("namePreview").src="/media/"+item.message_id;
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
  await refreshNames();
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
selectTopic=function(name){topic=name;currentPage=1;refresh()};
el("statusFilter").onchange=()=>{status=el("statusFilter").value;currentPage=1;refresh()};
el("prev").onclick=()=>{currentPage=Math.max(1,currentPage-1);refresh()};
el("next").onclick=()=>{currentPage++;refresh()};
el("search").addEventListener("input",()=>{
 if(viewMode!=="images"){
  search=el("search").value;currentPage=1;
  clearTimeout(window.smartSearch);
  window.smartSearch=setTimeout(refresh,350);
 }
});
setView("models");
setInterval(refreshNames,10000);

el("materializeNames").onclick=async()=>{
 try{
  const result=await post("/api/materialize-confirmed-names",{});
  el("exports").textContent="Biblioteca revisada: "+result.root+
   " · novos "+fmt(result.created)+" · já existentes "+fmt(result.existing)+
   " · originais ausentes "+fmt(result.missing_original);
  notify("Somente nomes confirmados gerados. Originais mantidos.");
 }catch(e){notify(e.message)}
};

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
   img.style.objectFit="contain";img.src="/media/"+candidate.candidate_message_id;
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
 if(ids.length<2||ids.length>40||ids.some(x=>!/^\d+$/.test(x))){
   notify("Informe entre 2 e 40 IDs de mensagens, separados por vírgulas.");return;
 }
 if(new Set(ids).size!==ids.length){notify("Há IDs repetidos.");return;}
 try{
  const response=await post("/api/create-gallery",{
   message_ids:ids.map(Number),topic,
   note:"Mesma escultura e diferentes vistas verificadas na Curadoria Visual local; identidade e direitos não confirmados."
  });
  notify("Galeria com "+response.image_count+" fotos vinculada sem alterar os originais.");
  el("galleryIds").value="";
  await refreshModels();await openModel(response.group_key);
 }catch(e){notify("Galeria não criada: "+e.message);}
};

