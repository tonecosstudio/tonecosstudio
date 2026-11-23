/* One visual board, two independent editorial missions. No automatic writes. */
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const studio=el("studioMissionStudio"), mission=el("studioMissionKind");
  const gallery=el("studioMissionBoard"), status=el("studioMissionStatus");
  if(!studio||!mission||!gallery)return;
  const prev=el("studioMissionPrev"),next=el("studioMissionNext");
  const prepare=el("studioMissionPrepare");
  const selected=new Map();
  const label=el("studioMissionPage");
  const fmt=new Intl.NumberFormat("pt-BR");
  const studioMetrics=new Map();
  let page=1,pages=0,busy=false,serial=0;
  function updateSelection(){
    prepare.hidden=mission.value!=="grouping";
    prepare.disabled=selected.size<2;
    prepare.textContent="Preparar galeria · "+selected.size+" foto(s) selecionada(s)";
  }
  async function get(url){
    const res=await fetch(url,{cache:"no-store"}),body=await res.json();
    if(!res.ok)throw Error(body.error||"Falha ao consultar host");
    return body;
  }
  function node(tag,value,cls){
    const n=document.createElement(tag);
    if(value!==undefined)n.textContent=value;
    if(cls)n.className=cls;
    return n;
  }
  function lock(on){
    busy=on;studio.disabled=on;mission.disabled=on;
    prev.disabled=on||page<=1;next.disabled=on||page>=pages;
  }
  async function load(){
    const seq=++serial;
    lock(true);
    status.textContent="Lendo evidências do SQLite...";
    try{
      const q=new URLSearchParams({studio:studio.value,mission:mission.value,
            page:String(page),limit:"24"});
      const data=await get("/api/studio-missions/board?"+q);
      if(seq!==serial)return;
      pages=data.pages;
      gallery.replaceChildren();
      for(const item of data.items){
        const tile=node("article",undefined,"studio-mission-tile");
        const img=node("img");img.loading="lazy";
        img.alt="Foto Telegram "+item.message_id;
        img.src=item.thumbnail_url;
        const original=node("a");
        original.href=item.original_url;
        original.target="_blank";original.rel="noopener noreferrer";
        original.title="Abrir imagem original para comparação";
        original.append(img);
        const meta=node("div",undefined,"studio-mission-meta");
        meta.append(node("strong","#"+item.message_id+" · "+(item.title||"(sem nome)")));
        meta.append(node("span",item.universe||"Franquia pendente"));
        const subtitle=mission.value==="grouping"?
           (item.group_key?"Grupo "+item.group_key.slice(0,8)+" · "+item.group_state:
            "Foto avulsa (pode ser um modelo de foto única)"):
           "Nome: "+item.status+" · "+(item.variant||"sem variante");
        meta.append(node("small",subtitle));
        const action=node("button",mission.value==="grouping"&&item.group_key?
                          "Inspecionar galeria":"Revisar fotografia");
        action.type="button";
        action.addEventListener("click",async()=>{
          try{
            if(mission.value==="grouping"&&item.group_key){
              if(typeof setView==="function")setView("models");
              if(typeof openModel==="function")await openModel(item.group_key);
            }else{
              if(typeof setView==="function")setView("names");
              if(typeof openName==="function")openName(item);
            }
          }catch(err){status.textContent=err.message}
        });
        meta.append(action);
        if(mission.value==="grouping"&&!item.group_key){
          const choice=node("label",undefined,"studio-mission-choice");
          const cb=node("input");cb.type="checkbox";
          cb.checked=selected.has(item.message_id);
          cb.addEventListener("change",()=>{
            if(cb.checked){
              const sources=new Set([...selected.values()].map(x=>x.original_topic));
              if(sources.size&& !sources.has(item.original_topic)){
                cb.checked=false;
                status.textContent="Selecione somente fotos do mesmo tópico de origem. O álbum não prova mesma escultura.";
                return;
              }
              selected.set(item.message_id,{message_id:item.message_id,
                            original_topic:item.original_topic});
            }else selected.delete(item.message_id);
            updateSelection();
          });
          choice.append(cb,node("span","Selecionar para possível galeria"));
          meta.append(choice);
        }
        tile.append(original,meta);gallery.append(tile);
      }
      label.textContent="Prancha "+data.page+" de "+(data.pages||0);
      const stats=studioMetrics.get(studio.value);
      status.textContent=fmt.format(data.total)+" fotos · "+studio.value+
        (stats?" · Auditorias visuais registradas "+fmt.format(stats.groups_with_visual_audit_event)+
          "/"+fmt.format(stats.groups)+" (não é aprovação comercial)"+
          " · Nomes confirmados "+fmt.format(stats.names_confirmed)+"/"+fmt.format(stats.images):"")+
        (mission.value==="grouping"?" · Missão 1: conferir esculturas sem refazer auditorias anteriores.":
         " · Missão 2: verificar personagem e franquia em fonte do estúdio.");
      updateSelection();
      if(!data.items.length)gallery.append(node("p","Nenhuma foto nesta página."));
    }catch(err){
      gallery.replaceChildren();status.textContent="Falha: "+err.message;
    }finally{if(seq===serial)lock(false)}
  }
  studio.addEventListener("change",()=>{selected.clear();page=1;updateSelection();load()});
  mission.addEventListener("change",()=>{selected.clear();page=1;updateSelection();load()});
  prepare.addEventListener("click",()=>{
    if(busy||mission.value!=="grouping"||selected.size<2)return;
    const photos=[...selected.values()];
    const topics=new Set(photos.map(x=>x.original_topic));
    if(topics.size!==1){
      status.textContent="Não misturar tópicos. Refaça a seleção com origem única.";
      return;
    }
    // This is *preparation only*. The canonical gallery form does the actual
    // visual-attested POST; no new write endpoint or automatic grouping.
    if(typeof selectTopic!=="function"||typeof setView!=="function"){
      status.textContent="Editor de galeria não está disponível nesta versão do host.";
      return;
    }
    selectTopic(photos[0].original_topic);
    setView("models");
    const input=el("galleryIds");
    input.value=photos.map(x=>x.message_id).join(", ");
    const editor=el("galleryCreate");
    editor.hidden=false;
    editor.scrollIntoView({behavior:"smooth",block:"start"});
    status.textContent="IDs encaminhados ao editor canônico. Compare as fotos originais antes de SALVAR; seleção não cria grupo.";
  });
  prev.addEventListener("click",()=>{if(!busy&&page>1){page--;load()}});
  next.addEventListener("click",()=>{if(!busy&&page<pages){page++;load()}});
  el("studioMissionRefresh").addEventListener("click",load);
  // Two distinct and explicitly requested evidence queues backed by the
  // same SQLite. A SHA match is a candidate, never a write/approval.
  const evidenceKind=el("studioMissionEvidenceKind");
  const evidenceLoad=el("studioMissionEvidenceLoad");
  const evidenceMore=el("studioMissionEvidenceMore");
  const evidenceResults=el("studioMissionEvidenceResults");
  const evidenceStatus=el("studioMissionEvidenceStatus");
  let evidenceCursor=0,evidenceBusy=false;
  function jumpToEvidence(item){
    if(!Array.from(studio.options).some(o=>o.value===item.studio)){
      evidenceStatus.textContent="Coleção indisponível no índice atual; recarregue a curadoria.";
      return;
    }
    selected.clear();
    studio.value=item.studio;
    mission.value="grouping";
    page=Math.max(1,Number(item.page_hint)||1);
    updateSelection();
    load();
    el("studioMissionsPanel").scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function loadEvidence(reset){
    if(evidenceBusy)return;
    evidenceBusy=true;
    evidenceLoad.disabled=true;
    evidenceMore.disabled=true;
    if(reset){
      evidenceCursor=0;
      evidenceResults.replaceChildren();
    }
    evidenceStatus.textContent="Buscando evidências no SQLite somente leitura...";
    const kind=evidenceKind.value;
    try{
      const q=new URLSearchParams({kind,cursor:String(evidenceCursor),limit:"24"});
      const data=await get("/api/studio-missions/candidates?"+q);
      for(const item of data.items){
        const card=node("article",undefined,"studio-evidence-row");
        const summary=kind==="albums"
          ?item.studio+" · "+item.messages+" mensagens / "+item.unique_sha+" arquivos distintos"
          :item.studio+" · #"+item.message_id+" = cópia de #"+item.anchor_message_id;
        card.append(node("strong",summary));
        const why=kind==="albums"
          ?item.titles.join(" · ")+" · Álbum "+item.album_id
          :item.group_title+" · "+item.review_state;
        card.append(node("small",why));
        if(kind==="albums"){
          const photos=node("div",undefined,"studio-evidence-thumbs");
          for(const id of item.sample_ids.slice(0,3)){
            const preview=node("img");
            preview.loading="lazy";preview.alt="Prévia Telegram #"+id;
            preview.src="/thumb/"+id+"?w=256";
            photos.append(preview);
          }
          card.append(photos);
        }
        const jump=node("button","Ver na prancha da Curadoria");
        jump.type="button";
        jump.addEventListener("click",()=>jumpToEvidence(item));
        card.append(jump);
        evidenceResults.append(card);
      }
      evidenceMore.hidden=data.next_cursor===null;
      evidenceCursor=data.next_cursor===null?evidenceCursor:data.next_cursor;
      evidenceStatus.textContent=data.items.length?
        "Casos apresentados sem modificações. Confira originais, variantes e SHA físico antes de qualquer decisão.":
        "Nenhum caso neste filtro. Não foram criadas novas galerias.";
    }catch(err){
      evidenceStatus.textContent="Evidências indisponíveis: "+err.message;
    }finally{
      evidenceBusy=false;
      evidenceLoad.disabled=false;
      evidenceMore.disabled=false;
    }
  }
  evidenceLoad.addEventListener("click",()=>loadEvidence(true));
  evidenceMore.addEventListener("click",()=>loadEvidence(false));
  evidenceKind.addEventListener("change",()=>{
    evidenceCursor=0;
    evidenceResults.replaceChildren();
    evidenceMore.hidden=true;
    evidenceStatus.textContent="Escolha consultar para atualizar a fila.";
  });
  get("/api/studio-missions").then(data=>{
    evidenceStatus.textContent=(data.album_review_candidates||0)+
      " álbuns distintos identificados. Consulte a fila para ver provas.";
    studio.replaceChildren();
    for(const item of data.studios){
      studioMetrics.set(item.studio,item);
      const opt=node("option",item.studio+" · "+item.images+" fotos · "+item.pages+" pranchas"+
        (item.collection_type==="topic_without_groups"?" · origem não classificada":"")+
        (item.album_review_candidates?" · "+item.album_review_candidates+" álbuns para comparar":""));
      opt.value=item.studio;studio.append(opt);
    }
    if(data.studios.length){
      studio.value=data.studios.some(x=>x.studio==="RinArtPoke")?"RinArtPoke":data.studios[0].studio;
      load();
    }else status.textContent="Não há estúdios canônicos cadastrados.";
  }).catch(err=>status.textContent="Missões indisponíveis: "+err.message);
})();