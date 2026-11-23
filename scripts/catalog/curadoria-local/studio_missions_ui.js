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

  // Live contact boards are model-centered, not 24 unrelated photo tiles.
  // Existing SQLite and thumbnail endpoints remain the only sources.
  const livePanel=el("studioMissionLiveGalleries");
  const liveCards=el("studioMissionGalleryResults");
  const liveStatus=el("studioMissionGalleryStatus");
  const livePageLabel=el("studioMissionGalleryPage");
  const livePrev=el("studioMissionGalleryPrev");
  const liveNext=el("studioMissionGalleryNext");
  let livePage=1,livePages=0,liveSerial=0;
  async function loadLiveGalleries(reset=false){
    const seq=++liveSerial;
    if(reset)livePage=1;
    const isGrouping=mission.value==="grouping";
    livePanel.hidden=!isGrouping;
    if(!isGrouping)return;
    const current=studio.value;
    livePrev.disabled=true;liveNext.disabled=true;
    liveStatus.textContent="Carregando esculturas diretamente do host...";
    try{
      const params=new URLSearchParams({studio:current,
        page:String(livePage),limit:"12"});
      const response=await get("/api/studio-missions/galleries?"+params);
      if(seq!==liveSerial||current!==studio.value||mission.value!=="grouping")return;
      livePages=response.pages;
      liveCards.replaceChildren();
      for(const group of response.items){
        const card=node("article",undefined,"studio-gallery-card");
        card.append(node("strong",(group.title||"Escultura sem nome")+
          (group.variant?" · "+group.variant:"")));
        card.append(node("small",(group.universe||"Franquia pendente")+
          " · "+group.photos+" foto(s), "+group.unique_photos+
          " vista(s) distintas · galeria "+group.state));
        const pictures=node("div",undefined,"studio-gallery-pictures");
        for(const id of group.preview_ids){
          const a=node("a");
          a.href="/media/"+id;a.target="_blank";a.rel="noopener noreferrer";
          a.title="Abrir a fotografia original #"+id;
          const img=node("img");
          img.src="/thumb/"+id+"?w=256";
          img.loading="lazy";img.decoding="async";
          img.alt="Fotografia #"+id+" da escultura "+(group.title||"sem nome");
          a.append(img);pictures.append(a);
        }
        card.append(pictures);
        const open=node("button","Abrir galeria para revisão");
        open.type="button";
        open.addEventListener("click",async()=>{
          try{
            if(typeof setView!=="function"||typeof openModel!=="function")
              throw Error("Editor canônico indisponível");
            setView("models");
            await openModel(group.group_key);
          }catch(err){liveStatus.textContent="Não foi possível abrir: "+err.message;}
        });
        card.append(open);liveCards.append(card);
      }
      livePageLabel.textContent="Página "+response.page+" de "+(response.pages||0);
      liveStatus.textContent=response.total+" galerias · "+current+
        " · prévias carregadas sob demanda (somente leitura).";
      if(!response.items.length)liveCards.append(node("p","Nenhuma galeria nesta página."));
      livePrev.disabled=livePage<=1;
      liveNext.disabled=livePage>=livePages;
    }catch(err){
      if(seq===liveSerial){
        liveCards.replaceChildren();
        liveStatus.textContent="Falha ao carregar esculturas: "+err.message;
      }
    }
  }
  livePrev.addEventListener("click",()=>{if(livePage>1){livePage--;loadLiveGalleries();}});
  liveNext.addEventListener("click",()=>{if(livePage<livePages){livePage++;loadLiveGalleries();}});
  studio.addEventListener("change",()=>loadLiveGalleries(true));
  mission.addEventListener("change",()=>loadLiveGalleries(true));

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
  // The naming mission has a READ-ONLY entity-level index, separate from
  // sculpture grouping. Matching text is never accepted as verified identity.
  const identityPanel=el("studioMissionIdentityPanel");
  const identitySearch=el("studioMissionIdentitySearch");
  const identityLoad=el("studioMissionIdentityLoad");
  const identityMore=el("studioMissionIdentityMore");
  const identityResults=el("studioMissionIdentityResults");
  const identityStatus=el("studioMissionIdentityStatus");
  let identityCursor=0,identityBusy=false,identitySerial=0;
  async function loadIdentities(reset=true){
    const seq=++identitySerial;
    identityPanel.hidden=mission.value!=="naming";
    if(mission.value!=="naming")return;
    if(reset){
      identityCursor=0;
      identityResults.replaceChildren();
    }
    identityBusy=true;
    identityLoad.disabled=true;
    identityMore.disabled=true;
    identityStatus.textContent="Consolidando títulos do SQLite, sem alterar nomes...";
    try{
      const params=new URLSearchParams({
        studio:studio.value,cursor:String(identityCursor),limit:"24",
        q:identitySearch.value.trim()
      });
      const data=await get("/api/studio-missions/identities?"+params);
      if(seq!==identitySerial)return;
      for(const item of data.items){
        const card=node("article",undefined,"studio-evidence-row");
        card.append(node("strong",item.title+" · "+(item.universe||"Franquia não informada")));
        card.append(node("small",fmt.format(item.galleries)+" galerias distintas · "+
          fmt.format(item.photos)+" fotos · "+fmt.format(item.confirmed)+" nomes confirmados"));
        if(item.flags.length){
          card.append(node("small","Atenção: "+item.flags.join(", ")+
            ". Confirmar se é personagem, acessório ou conjunto."));
        }
        const action=node("button","Ver fotografia e galeria");
        action.type="button";
        action.addEventListener("click",()=>{
          page=Math.max(1,item.page_hint);
          mission.value="naming";
          selected.clear();
          load();
          el("studioMissionsPanel").scrollIntoView({behavior:"smooth",block:"start"});
        });
        card.append(action);
        identityResults.append(card);
      }
      identityCursor=data.next_cursor===null?identityCursor:data.next_cursor;
      identityMore.hidden=data.next_cursor===null;
      identityStatus.textContent=fmt.format(data.total)+
        " títulos candidatos distintos (não equivalem a personagens confirmados). "+
        "Verificar fonte do estúdio uma vez por personagem e variantes compatíveis.";
    }catch(err){
      if(seq===identitySerial)identityStatus.textContent="Falha na consulta de nomes: "+err.message;
    }finally{
      if(seq===identitySerial){
        identityBusy=false;identityLoad.disabled=false;identityMore.disabled=false;
      }
    }
  }
  identityLoad.addEventListener("click",()=>loadIdentities(true));
  identityMore.addEventListener("click",()=>{if(!identityBusy)loadIdentities(false)});
  identitySearch.addEventListener("keydown",event=>{
    if(event.key==="Enter"){event.preventDefault();loadIdentities(true)}
  });
  studio.addEventListener("change",()=>{selected.clear();page=1;updateSelection();load();loadIdentities(true)});
  mission.addEventListener("change",()=>{selected.clear();page=1;updateSelection();load();loadIdentities(true)});
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
  el("studioMissionRefresh").addEventListener("click",()=>{load();loadIdentities(true)});
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
  // Candidate discovery for Mission 1. Never mutate an audited gallery here.
  const mergePanel=el("studioMissionMergePanel");
  const mergeLoad=el("studioMissionMergeLoad");
  const mergeGap=el("studioMissionMergeGap");
  const mergeMore=el("studioMissionMergeMore");
  const mergeResults=el("studioMissionMergeResults");
  const mergeStatus=el("studioMissionMergeStatus");
  let mergePage=1,mergeBusy=false;
  async function loadMergeCandidates(reset=true){
    if(mergeBusy||mission.value!=="grouping")return;
    if(reset){mergePage=1;mergeResults.replaceChildren();}
    mergeBusy=true;mergeLoad.disabled=true;mergeMore.disabled=true;
    mergeStatus.textContent="Comparando metadados e proximidade no SQLite...";
    try{
      const q=new URLSearchParams({studio:studio.value,page:String(mergePage),
        limit:"12",max_gap:mergeGap.value});
      const result=await get("/api/gallery-merge-candidates?"+q);
      for(const item of result.items){
        const card=node("article",undefined,"studio-evidence-row");
        card.append(node("strong",item.title+" · "+(item.variant||"sem variante")));
        card.append(node("small","Postagens separadas por "+item.message_gap+
          " IDs. Comparar base, pose, rosto e acessórios antes de unir."));
        const views=node("div",undefined,"studio-merge-previews");
        for(const mid of [item.first_a,item.first_b]){
          const img=node("img");
          img.loading="lazy";img.alt="Telegram #"+mid;
          img.src="/thumb/"+mid+"?w=256";views.append(img);
        }
        card.append(views);
        // Expand on demand: compare EVERY available photo of both galleries
        // inside the existing host. No JPEG board, second database or writes.
        const compareButton=node("button","Comparar todas as fotos lado a lado");
        compareButton.type="button";
        compareButton.setAttribute("aria-expanded","false");
        const comparison=node("section",undefined,"studio-pair-comparison");
        comparison.hidden=true;
        comparison.setAttribute("aria-label","Comparação visual das duas galerias");
        let comparisonReady=false;
        compareButton.addEventListener("click",async()=>{
          if(!comparison.hidden){
            comparison.hidden=true;
            card.classList.remove("studio-pair-expanded");
            compareButton.setAttribute("aria-expanded","false");
            compareButton.textContent="Comparar todas as fotos lado a lado";
            return;
          }
          comparison.hidden=false;
          card.classList.add("studio-pair-expanded");
          compareButton.setAttribute("aria-expanded","true");
          compareButton.textContent="Fechar comparação lado a lado";
          if(comparisonReady)return;
          comparison.replaceChildren(node("p","Carregando apenas as fotografias deste par...","sub"));
          compareButton.disabled=true;
          try{
            const groups=await Promise.all([
              get("/api/model/"+item.group_a),get("/api/model/"+item.group_b)
            ]);
            if(groups[0].revision!==item.revision_a ||
               groups[1].revision!==item.revision_b){
              throw Error("Uma galeria foi revisada; atualize a fila antes de decidir.");
            }
            const columns=node("div",undefined,"studio-pair-columns");
            groups.forEach((group,i)=>{
              const col=node("section",undefined,"studio-pair-column");
              col.append(node("strong","Galeria "+(i===0?"A":"B")+" · "+
                group.images.length+" foto(s) · "+(group.variant||"sem variante")));
              const photos=node("div",undefined,"studio-pair-images");
              for(const photo of group.images){
                const link=node("a");
                link.href="/media/"+photo.message_id;
                link.target="_blank";link.rel="noopener noreferrer";
                link.title="Abrir original Telegram #"+photo.message_id;
                const img=node("img");
                img.loading="lazy";img.decoding="async";
                img.alt="Vista da galeria "+(i===0?"A":"B")+", foto #"+photo.message_id;
                img.src="/thumb/"+photo.message_id+"?w=480";
                link.append(img,node("small","#"+photo.message_id));
                photos.append(link);
              }
              if(!group.images.length)photos.append(node("p","Galeria sem fotos.","sub"));
              col.append(photos);
              columns.append(col);
            });
            comparison.replaceChildren(
              node("p","Compare pose, base, proporções e acessórios; título igual não prova a mesma escultura. Nenhuma alteração é feita nesta comparação.","sub"),
              columns
            );
            comparisonReady=true;
          }catch(err){
            comparison.replaceChildren(node("p","Comparação indisponível: "+err.message,"sub"));
          }finally{compareButton.disabled=false;}
        });
        card.append(compareButton,comparison);
        for(const [key,count,index] of [[item.group_a,item.photos_a,"A"],
                                         [item.group_b,item.photos_b,"B"]]){
          const open=node("button","Inspecionar galeria "+index+
            " · "+count+" foto(s)");
          open.type="button";
          open.addEventListener("click",async()=>{
            try{
              if(typeof setView!=="function"||typeof openModel!=="function"){
                throw Error("Editor de modelos indisponível");
              }
              setView("models");await openModel(key);
            }catch(err){mergeStatus.textContent=err.message;}
          });
          card.append(open);
        }
        const noteField=node("textarea");
        noteField.rows=3;noteField.maxLength=500;
        noteField.placeholder="Descreva as diferenças (ou coincidências) físicas de pose, base e acessórios; mínimo 45 caracteres";
        card.append(noteField);
        const mergeButton=node("button","Unir: é a mesma escultura");
        const differentButton=node("button","Manter separadas: esculturas diferentes");
        for(const btn of [mergeButton,differentButton])btn.type="button";
        async function reviewPair(merge){
          const note=noteField.value.trim();
          if(note.length<45){
            mergeStatus.textContent="Descreva em pelo menos 45 caracteres quais detalhes físicos comprovam a decisão.";
            return;
          }
          if(typeof post!=="function"){
            mergeStatus.textContent="Gravação canônica indisponível.";
            return;
          }
          mergeButton.disabled=true;differentButton.disabled=true;
          try{
            if(merge){
              const [a,b]=await Promise.all([
                get("/api/model/"+item.group_a),get("/api/model/"+item.group_b)
              ]);
              const proofs=[...a.images,...b.images].map(v=>({
                message_id:v.message_id,sha256:v.sha256
              }));
              if(a.revision!==item.revision_a||b.revision!==item.revision_b){
                throw Error("Uma galeria mudou. Recarregue as evidências.");
              }
              await post("/api/merge-reviewed-galleries",{
                target:item.group_a,source:item.group_b,
                target_rev:item.revision_a,source_rev:item.revision_b,
                proofs,note
              });
            }else{
              await post("/api/reject-gallery-pair",{
                group_a:item.group_a,group_b:item.group_b,
                revision_a:item.revision_a,revision_b:item.revision_b,note
              });
            }
            await loadMergeCandidates(true);
            mergeStatus.textContent=merge?"Fusão auditada. Nomes e direitos não mudaram.":
              "Diferença registrada. O par não será sugerido novamente sem mudança de revisão.";
          }catch(err){
            mergeButton.disabled=false;differentButton.disabled=false;
            mergeStatus.textContent="Não foi gravado: "+err.message;
          }
        }
        mergeButton.addEventListener("click",()=>reviewPair(true));
        differentButton.addEventListener("click",()=>reviewPair(false));
        card.append(mergeButton,differentButton);
        mergeResults.append(card);
      }
      mergeMore.hidden=!result.has_more;
      mergeStatus.textContent=result.total+" pares candidatos em "+studio.value+
        ". Título igual NÃO significa escultura igual. Consulta sem gravação.";
      mergePage++;
    }catch(err){mergeStatus.textContent="Erro: "+err.message;}
    finally{mergeBusy=false;mergeLoad.disabled=false;mergeMore.disabled=false;}
  }
  mergeLoad.addEventListener("click",()=>loadMergeCandidates(true));
  mergeGap.addEventListener("change",()=>{
    if(mission.value==="grouping")loadMergeCandidates(true);
  });
  const crossLoad=el("studioMissionCrossCaptionLoad");
  const crossResults=el("studioMissionCrossCaptionResults");
  let crossBusy=false;
  async function loadCrossCaptions(){
    if(crossBusy||mission.value!=="grouping")return;
    crossBusy=true;crossLoad.disabled=true;crossResults.replaceChildren();
    try{
      const q=new URLSearchParams({studio:studio.value,limit:"12"});
      const result=await get("/api/gallery-visual-cross-caption?"+q);
      mergeStatus.textContent=result.total+" pares de renders quase idênticos com legendas diferentes. Nenhuma fusão automática.";
      for(const item of result.items){
        const card=node("article",undefined,"studio-evidence-row");
        card.append(node("strong",item.title_a+" · "+item.universe_a+
          " / "+item.variant_a+" ↔ "+item.title_b+" · "+item.universe_b+
          " / "+item.variant_b));
        card.append(node("small","Diferença média de pixels: "+item.pixel_mae+
          ". Imagem igual não confirma licença ou pacote STL."));
        const previews=node("div",undefined,"studio-merge-previews");
        for(const mid of [item.message_a,item.message_b]){
          const img=node("img");img.loading="lazy";img.alt="Original Telegram #"+mid;
          img.src="/thumb/"+mid+"?w=480";previews.append(img);
        }
        card.append(previews);
        const note=node("textarea");note.rows=3;note.maxLength=600;
        note.placeholder="Explique qual legenda está errada, qual referência é correta e que o render é o mesmo (mínimo 60 caracteres)";
        card.append(note);
        for(const side of ["a","b"]){
          const from=side==="a"?"b":"a";
          const button=node("button","Corrigir "+side.toUpperCase()+" com "+from.toUpperCase()+" (preservar variantes)");
          button.type="button";
          button.addEventListener("click",async()=>{
            if(note.value.trim().length<60){
              mergeStatus.textContent="Justificativa específica deve ter pelo menos 60 caracteres.";
              return;
            }
            button.disabled=true;
            try{
              const a=item;const fixA=side==="a";
              await post("/api/correct-gallery-caption",{
                target_key:fixA?a.group_a:a.group_b,
                reference_key:fixA?a.group_b:a.group_a,
                target_rev:fixA?a.revision_a:a.revision_b,
                reference_rev:fixA?a.revision_b:a.revision_a,
                target_mid:fixA?a.message_a:a.message_b,
                reference_mid:fixA?a.message_b:a.message_a,
                note:note.value.trim()
              });
              mergeStatus.textContent="Legenda corrigida com evidência física. Versões vinculadas; nome continua em revisão.";
              crossBusy=false;await loadCrossCaptions();
            }catch(err){
              button.disabled=false;
              mergeStatus.textContent="Correção bloqueada: "+err.message;
            }
          });
          card.append(button);
        }
        crossResults.append(card);
      }
      if(!result.items.length)crossResults.append(node("p",
        "Nenhuma imagem quase idêntica com legenda diferente encontrada na cobertura atual."));
    }catch(err){mergeStatus.textContent="Erro na comparação visual: "+err.message;}
    finally{crossBusy=false;crossLoad.disabled=false;}
  }
  crossLoad.addEventListener("click",loadCrossCaptions);
  const fingerprintButton=el("studioMissionFingerprintsScan");
  const fingerprintStatus=el("studioMissionFingerprintCoverage");
  let fingerprintBusy=false;
  async function loadFingerprintCoverage(){
    const current=studio.value;
    try{
      const qs=new URLSearchParams({studio:current});
      const counts=await get("/api/visual-fingerprint-coverage?"+qs);
      if(studio.value!==current)return;
      fingerprintStatus.textContent="Impressões visuais válidas: "+counts.valid+"/"+counts.total+
        " · pendentes "+counts.missing+" · erro(s) "+counts.errors+
        ". Estes índices não confirmam nomes.";
      fingerprintButton.disabled=counts.complete;
    }catch(err){
      fingerprintStatus.textContent="Cobertura visual indisponível: "+err.message;
    }
  }
  fingerprintButton.addEventListener("click",async()=>{
    if(fingerprintBusy||mission.value!=="grouping")return;
    fingerprintBusy=true;fingerprintButton.disabled=true;
    const current=studio.value;
    fingerprintStatus.textContent="Verificando SHA dos originais e calculando impressões do estúdio...";
    try{
      const outcome=await post("/api/scan-studio-fingerprints",{
        studio:current,limit:96
      });
      if(studio.value!==current)return;
      const item=outcome.after;
      fingerprintStatus.textContent="Concluído: "+item.valid+"/"+item.total+
        " impressões válidas; falhas "+item.errors+
        ". Nenhum nome, galeria ou direito aprovado.";
      await loadFingerprintCoverage();
    }catch(err){
      fingerprintStatus.textContent="Varredura bloqueada: "+err.message;
      await loadFingerprintCoverage();
    }finally{fingerprintBusy=false;await loadFingerprintCoverage();}
  });


  // One-image editorial galleries are NOT name confirmations.
  const singletonPanel=el("studioMissionSingletonPanel");
  const singletonLoad=el("studioMissionSingletonLoad");
  const singletonMore=el("studioMissionSingletonMore");
  const singletonResults=el("studioMissionSingletonResults");
  const singletonStatus=el("studioMissionSingletonStatus");
  let singletonPage=1,singletonBusy=false;
  async function loadSingletons(reset=true){
    if(singletonBusy||mission.value!=="grouping")return;
    singletonBusy=true;singletonLoad.disabled=true;singletonMore.disabled=true;
    const current=studio.value;
    if(reset){singletonPage=1;singletonResults.replaceChildren();}
    singletonStatus.textContent="Consultando fotos sem galeria no SQLite...";
    try{
      const params=new URLSearchParams({studio:current,
        page:String(singletonPage),limit:"12"});
      const data=await get("/api/gallery-singleton-candidates?"+params);
      if(studio.value!==current)return;
      for(const item of data.items){
        const card=node("article",undefined,"studio-evidence-row");
        card.append(node("strong","#"+item.message_id+" · "+item.title+
          (item.variant?" · "+item.variant:"")));
        card.append(node("small","Nome "+item.status+
          " · prova de título impresso no render; não aprovado comercialmente."));
        const anchor=node("a");anchor.href="/media/"+item.message_id;
        anchor.target="_blank";anchor.rel="noopener noreferrer";
        const img=node("img");img.loading="lazy";
        img.alt="Original Telegram #"+item.message_id;
        img.src="/thumb/"+item.message_id+"?w=480";
        img.style.cssText="width:100%;max-height:260px;object-fit:contain;background:#0c0d0f";
        anchor.append(img);card.append(anchor);
        const note=node("textarea");note.rows=3;note.maxLength=600;
        note.placeholder="Descreva o que está visível, identidade ainda provisória e por que esta fotografia deve ter ficha de revisão própria (65+ caracteres).";
        card.append(note);
        const save=node("button","Criar galeria em revisão (sem confirmar nome)");
        save.type="button";
        save.addEventListener("click",async()=>{
          if(note.value.trim().length<65){
            singletonStatus.textContent="Revise a imagem e escreva uma justificativa de 65 caracteres ou mais.";
            return;
          }
          save.disabled=true;
          try{
            const outcome=await post("/api/create-gallery",{
              message_ids:[item.message_id],topic:current,
              note:note.value.trim(),sha256:item.sha256,
              revision:item.revision,review_only:true
            });
            if(!outcome.singleton||outcome.names_changed||outcome.rights_changed){
              throw Error("Host retornou um contrato de galeria inesperado");
            }
            await loadSingletons(true);
            singletonStatus.textContent="Galeria editorial registrada. Nome e direitos continuam pendentes.";
            await load();
          }catch(error){
            singletonStatus.textContent="Não foi gravado: "+error.message;
          }finally{save.disabled=false;}
        });
        card.append(save);
        singletonResults.append(card);
      }
      singletonMore.hidden=!data.has_more;
      singletonStatus.textContent=data.total+
        " fotos sem galeria elegíveis à revisão por render neste estúdio. Nenhuma aprovação automática.";
      singletonPage++;
      if(!data.items.length&&reset){
        singletonResults.append(node("p","Nenhuma foto pendente nesta fila."));}
    }catch(error){
      singletonStatus.textContent="Falha ao listar fotografias: "+error.message;
    }finally{singletonBusy=false;singletonLoad.disabled=false;singletonMore.disabled=false;}
  }
  singletonLoad.addEventListener("click",()=>loadSingletons(true));
  singletonMore.addEventListener("click",()=>loadSingletons(false));
  mergeMore.addEventListener("click",()=>loadMergeCandidates(false));
  studio.addEventListener("change",()=>{
    mergeResults.replaceChildren();mergePage=1;mergeMore.hidden=true;crossResults.replaceChildren();singletonResults.replaceChildren();singletonPage=1;singletonMore.hidden=true;fingerprintStatus.textContent="Consulte a cobertura visual deste estúdio.";loadFingerprintCoverage();
    mergeStatus.textContent="Consulte para comparar este estúdio.";
  });
  mission.addEventListener("change",()=>{
    mergePanel.hidden=mission.value!=="grouping";
    singletonPanel.hidden=mission.value!=="grouping";
  loadFingerprintCoverage();
  });
  mergePanel.hidden=mission.value!=="grouping";
    singletonPanel.hidden=mission.value!=="grouping";
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
      const requested=new URLSearchParams(window.location.search).get("studio");
      studio.value=data.studios.some(x=>x.studio===requested)?requested:
        data.studios.some(x=>x.studio==="RinArtPoke")?"RinArtPoke":data.studios[0].studio;
      load();
      loadLiveGalleries(true);
    }else status.textContent="Não há estúdios canônicos cadastrados.";
  }).catch(err=>status.textContent="Missões indisponíveis: "+err.message);
})();