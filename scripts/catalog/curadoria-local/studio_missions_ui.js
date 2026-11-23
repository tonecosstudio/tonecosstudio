/* One visual board, two independent editorial missions. No automatic writes. */
(() => {
  "use strict";
  const el = id => document.getElementById(id);
  const studio=el("studioMissionStudio"), mission=el("studioMissionKind");
  const gallery=el("studioMissionBoard"), status=el("studioMissionStatus");
  if(!studio||!mission||!gallery)return;
  const prev=el("studioMissionPrev"),next=el("studioMissionNext");
  const label=el("studioMissionPage");
  const fmt=new Intl.NumberFormat("pt-BR");
  let page=1,pages=0,busy=false,serial=0;
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
        const meta=node("div",undefined,"studio-mission-meta");
        meta.append(node("strong","#"+item.message_id+" · "+(item.title||"(sem nome)")));
        meta.append(node("span",item.universe||"Franquia pendente"));
        const subtitle=mission.value==="grouping"?
           (item.group_key?"Grupo "+item.group_key.slice(0,8)+" · "+item.group_state:
            "SEM GRUPO: comparar esculturas"):
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
        meta.append(action);tile.append(img,meta);gallery.append(tile);
      }
      label.textContent="Prancha "+data.page+" de "+(data.pages||0);
      status.textContent=fmt.format(data.total)+" fotos · "+studio.value+
        (mission.value==="grouping"?" · Missão 1: agrupar apenas esculturas comprovadas.":
         " · Missão 2: verificar nome/personagem/franquia e fonte oficial.");
      if(!data.items.length)gallery.append(node("p","Nenhuma foto nesta página."));
    }catch(err){
      gallery.replaceChildren();status.textContent="Falha: "+err.message;
    }finally{if(seq===serial)lock(false)}
  }
  studio.addEventListener("change",()=>{page=1;load()});
  mission.addEventListener("change",()=>{page=1;load()});
  prev.addEventListener("click",()=>{if(!busy&&page>1){page--;load()}});
  next.addEventListener("click",()=>{if(!busy&&page<pages){page++;load()}});
  el("studioMissionRefresh").addEventListener("click",load);
  get("/api/studio-missions").then(data=>{
    studio.replaceChildren();
    for(const item of data.studios){
      const opt=node("option",item.studio+" · "+item.images+" fotos · "+item.pages+" pranchas");
      opt.value=item.studio;studio.append(opt);
    }
    if(data.studios.length){
      studio.value=data.studios.some(x=>x.studio==="RinArtPoke")?"RinArtPoke":data.studios[0].studio;
      load();
    }else status.textContent="Não há estúdios canônicos cadastrados.";
  }).catch(err=>status.textContent="Missões indisponíveis: "+err.message);
})();