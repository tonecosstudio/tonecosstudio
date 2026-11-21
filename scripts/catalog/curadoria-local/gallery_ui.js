/* Fotos candidatas e ampliação da galeria: operações semânticas do host,
   reutilizadas pelo navegador e pelo OrdaX MCP através das mesmas APIs. */
let galleryCandidatePage=1;
let galleryCandidateSelected=new Set();
let galleryCandidateGroupKey="";

function resetGalleryCandidates(){
  galleryCandidatePage=1;
  galleryCandidateSelected.clear();
  galleryCandidateGroupKey=chosenGroup?.group_key||"";
  el("galleryCandidateSearch").value="";
  el("galleryAppendIds").value="";
  el("galleryCandidateInfo").textContent="Use 'Ver candidatas' para comparar imagens ainda livres.";
  el("galleryCandidateTiles").replaceChildren();
  el("galleryCandidateNext").hidden=true;
}

async function loadGalleryCandidates(next=false){
  if(!chosenGroup)return;
  const groupKey=chosenGroup.group_key;
  const page=next?galleryCandidatePage+1:1;
  const query=el("galleryCandidateSearch").value.trim();
  const params=new URLSearchParams({group_key:groupKey,page,limit:48,q:query});
  el("galleryCandidateLoad").disabled=true;
  el("galleryCandidateNext").disabled=true;
  try{
    const result=await api("/api/gallery-candidates?"+params);
    if(chosenGroup?.group_key!==groupKey)return;
    if(!next){
      galleryCandidateSelected.clear();
      el("galleryCandidateTiles").replaceChildren();
    }
    galleryCandidatePage=page;
    galleryCandidateGroupKey=groupKey;
    const cards=el("galleryCandidateTiles");
    for(const item of result.items){
      const card=document.createElement("label");
      card.style.cssText="display:block;border:1px solid var(--line);border-radius:8px;padding:7px;min-width:0";
      const img=document.createElement("img");
      img.src="/media/"+item.message_id;
      img.loading="lazy";
      img.alt=item.title||("Foto "+item.message_id);
      img.style.cssText="width:100%;height:180px;object-fit:contain;background:#0c0d0f";
      const title=document.createElement("div");
      title.textContent=(item.title||"Sem nome")+" · #"+item.message_id+
        (item.variant?" · "+item.variant:"");
      title.style.cssText="overflow-wrap:anywhere";
      const caption=document.createElement("div");
      caption.className="sub";
      caption.textContent=(item.source_caption||"Sem legenda").slice(0,210);
      const check=document.createElement("input");
      check.type="checkbox";
      check.style.width="auto";
      check.checked=galleryCandidateSelected.has(item.message_id);
      check.onchange=()=>{
        if(check.checked)galleryCandidateSelected.add(item.message_id);
        else galleryCandidateSelected.delete(item.message_id);
        el("galleryCandidateInfo").textContent=galleryCandidateSelected.size+
          " fotos escolhidas manualmente; confirme que são da mesma escultura.";
      };
      card.append(img,check,title,caption);
      cards.append(card);
    }
    el("galleryCandidateInfo").textContent=
      result.total+" candidatas · página "+page+" · "+
      galleryCandidateSelected.size+" marcadas · "+(query?"busca manual":"mesmo álbum");
    el("galleryCandidateNext").hidden=!result.has_more;
  }catch(e){notify("Fotos candidatas: "+e.message)}
  finally{
    el("galleryCandidateLoad").disabled=false;
    el("galleryCandidateNext").disabled=false;
  }
}

el("galleryCandidateLoad").onclick=()=>loadGalleryCandidates(false);
el("galleryCandidateNext").onclick=()=>loadGalleryCandidates(true);
el("galleryCandidateSearch").addEventListener("keydown",event=>{
  if(event.key==="Enter"){event.preventDefault();loadGalleryCandidates(false)}
});
el("galleryAppendSave").onclick=async()=>{
  if(!chosenGroup)return;
  const typed=el("galleryAppendIds").value.split(/[,;\s]+/).filter(Boolean);
  if(typed.some(x=>!/^\d+$/.test(x)||!Number.isSafeInteger(Number(x))||Number(x)<=0)){
    notify("IDs adicionais inválidos");return;
  }
  const ids=[...new Set([...galleryCandidateSelected,...typed.map(Number)])];
  if(!ids.length){notify("Selecione fotos para acrescentar.");return;}
  const key=chosenGroup.group_key;
  let revision=chosenGroup.revision,applied=0;
  const button=el("galleryAppendSave");
  button.disabled=true;
  try{
    for(let start=0;start<ids.length;start+=200){
      const result=await post("/api/append-gallery",{
        group_key:key,revision,message_ids:ids.slice(start,start+200),
        note:"Mesma escultura verificada visualmente pelo operador no host; nomes e direitos sem aprovação automática."
      });
      revision=result.revision;
      applied+=result.added;
    }
    notify("Galeria ampliada: "+applied+" novas fotos; nenhuma ficha duplicada.");
    await openModel(key);
    await refreshModels();
  }catch(e){
    notify("Inclusão interrompida após "+applied+" novas fotos: "+e.message+
      ". Reabra a galeria para continuar.");
  }finally{button.disabled=false;}
};
