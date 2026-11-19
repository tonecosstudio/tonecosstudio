const TOKEN="__LOCAL_CSRF__";
const el=id=>document.getElementById(id);
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
async function refreshModels(){
 if(viewMode!=="models")return;
 try{
  const filter=(status==="revisar"||status==="confirmado"||status==="provavel")?status:"";
  const p=new URLSearchParams({page:currentPage,limit:48,topic,q:search,state:filter});
  const result=await api("/api/models?"+p);
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
  el("summary").textContent=fmt(modelTotal)+" grupos de modelos";
  el("page").textContent="Página "+currentPage;
  el("prev").disabled=currentPage<=1;el("next").disabled=currentPage*48>=modelTotal;
  const stat=await api("/api/stats");
  const s=stat.smart||{};
  el("smartSummary").textContent=fmt(s.images_grouped||0)+" imagens em "+fmt(s.model_groups||0)+" grupos prováveis/avaliados · "+fmt(s.images_needing_review||0)+" imagens sem associação · "+fmt(s.images_waiting||0)+" aguardando processamento.";
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
   a.append(img);text(a,"div","#"+item.message_id,"sub");imgs.append(a);
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
 viewMode=mode;currentPage=1;
 el("gallery").hidden=mode==="models";
 el("modelResults").hidden=mode!=="models";
 el("modelsMode").className=mode==="models"?"primary":"";
 el("imagesMode").className=mode==="images"?"primary":"";
 el("modelReview").hidden=mode!=="models"||!chosenGroup;
 if(mode==="models")refreshModels();else refresh();
}
el("modelsMode").onclick=()=>setView("models");
el("imagesMode").onclick=()=>setView("images");
selectTopic=function(name){topic=name;currentPage=1;if(viewMode==="models")refreshModels();else refresh()};
el("statusFilter").onchange=()=>{status=el("statusFilter").value;currentPage=1;if(viewMode==="models")refreshModels();else refresh()};
el("prev").onclick=()=>{currentPage=Math.max(1,currentPage-1);if(viewMode==="models")refreshModels();else refresh()};
el("next").onclick=()=>{currentPage++;if(viewMode==="models")refreshModels();else refresh()};
el("search").addEventListener("input",()=>{if(viewMode==="models"){search=el("search").value;currentPage=1;clearTimeout(window.smartSearch);window.smartSearch=setTimeout(refreshModels,350)}});
setView("models");
setInterval(refreshModels,10000);
