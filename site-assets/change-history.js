// Historial de cambios publicados por la DAE.
(function(){
  const DAY={LU:'Lunes',MA:'Martes',MI:'Miércoles',JU:'Jueves',VI:'Viernes',SA:'Sábado',DO:'Domingo'};
  const FIELD={name:'Nombre de la materia',professor:'Profesor',status:'Estado de la sección',curriculum:'Pensum',slots:'Horario y aula'};
  const css=document.createElement('style');
  css.textContent=[
    '.dae-history-launcher{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 16px;padding:11px 14px;border:1px solid var(--line,#d9e0e8);border-radius:12px;background:var(--panel,#fff)}',
    '.dae-history-launcher p{margin:0;color:var(--muted,#667085);font-size:11px;line-height:1.45}',
    '.dae-history-open{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;border:1px solid var(--line,#d9e0e8);border-radius:9px;background:var(--soft,#f5f7fa);color:var(--text,#172033);font-size:11px;font-weight:800;cursor:pointer;white-space:nowrap}',
    '.dae-history-open:hover{border-color:var(--accent,#5477aa)}',
    '.dae-history-count{display:inline-grid;place-items:center;min-width:20px;height:20px;padding:0 5px;border-radius:99px;background:var(--accent,#426b9b);color:white;font-size:10px}',
    '.dae-history-overlay{position:fixed;inset:0;z-index:10050;display:grid;place-items:center;padding:20px;background:rgba(12,20,34,.58)}',
    '.dae-history-overlay[hidden]{display:none!important}',
    '.dae-history-dialog{width:min(760px,100%);max-height:min(82vh,850px);display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--line,#d9e0e8);border-radius:16px;background:var(--panel,#fff);color:var(--text,#172033);box-shadow:0 24px 80px rgba(0,0,0,.25)}',
    '.dae-history-head{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;padding:18px 20px;border-bottom:1px solid var(--line,#d9e0e8)}',
    '.dae-history-head h2{margin:0 0 5px;font-size:17px}.dae-history-head p{margin:0;color:var(--muted,#667085);font-size:11px;line-height:1.5}',
    '.dae-history-close{flex:0 0 auto;width:32px;height:32px;border:0;border-radius:8px;background:var(--soft,#f5f7fa);color:var(--text,#172033);font-size:21px;cursor:pointer}',
    '.dae-history-body{padding:16px 20px 22px;overflow:auto}',
    '.dae-history-entry{margin:0 0 12px;border:1px solid var(--line,#d9e0e8);border-radius:12px;background:var(--panel,#fff);overflow:hidden}',
    '.dae-history-entry summary{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;cursor:pointer;list-style:none}',
    '.dae-history-entry summary::-webkit-details-marker{display:none}',
    '.dae-history-entry-title{display:block;font-size:12px;font-weight:850}.dae-history-entry-meta{display:block;margin-top:4px;color:var(--muted,#667085);font-size:10px}',
    '.dae-history-pills{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px}',
    '.dae-history-pill{display:inline-flex;align-items:center;padding:4px 7px;border-radius:99px;background:var(--soft,#f2f4f7);color:var(--muted,#667085);font-size:9px;font-weight:800;white-space:nowrap}',
    '.dae-history-pill.add{background:#e5f5eb;color:#17653a}.dae-history-pill.remove{background:#fde9e8;color:#9d2925}.dae-history-pill.change{background:#fff2d9;color:#805514}',
    '.dae-history-entry-content{padding:0 14px 14px;border-top:1px solid var(--line,#d9e0e8)}',
    '.dae-history-affect{display:inline-flex;margin:11px 0 2px;padding:5px 8px;border-radius:7px;background:#e8f2ff;color:#24558d;font-size:10px;font-weight:800}',
    '.dae-history-change{padding:10px 0;border-bottom:1px solid var(--line,#e7ebf0)}.dae-history-change:last-child{border-bottom:0}',
    '.dae-history-change-title{font-size:11px;font-weight:850}.dae-history-change-sub{margin-top:3px;color:var(--muted,#667085);font-size:10px}',
    '.dae-history-field{display:grid;grid-template-columns:minmax(95px, .7fr) minmax(0,2fr);gap:8px;padding-top:6px;font-size:10px;line-height:1.45}',
    '.dae-history-field strong{color:var(--muted,#667085)}.dae-history-field span{overflow-wrap:anywhere}',
    '.dae-history-empty{padding:20px;border:1px dashed var(--line,#cbd3df);border-radius:12px;color:var(--muted,#667085);font-size:12px;line-height:1.6;text-align:center}',
    'body[data-theme="dark"] .dae-history-pill.add{background:#193d2a;color:#a9e5be}body[data-theme="dark"] .dae-history-pill.remove{background:#4a2525;color:#ffc1bd}body[data-theme="dark"] .dae-history-pill.change{background:#4a391e;color:#f3d18d}body[data-theme="dark"] .dae-history-affect{background:#1d3857;color:#b9d9ff}',
    '@media(max-width:620px){.dae-history-launcher{align-items:flex-start;flex-direction:column}.dae-history-open{width:100%;justify-content:center}.dae-history-overlay{padding:9px}.dae-history-dialog{max-height:90vh}.dae-history-head,.dae-history-body{padding-left:14px;padding-right:14px}.dae-history-entry summary{align-items:flex-start;flex-direction:column}.dae-history-pills{justify-content:flex-start}.dae-history-field{grid-template-columns:1fr;gap:2px}}'
  ].join('\n');
  document.head.appendChild(css);

  const launcher=document.createElement('div');
  launcher.className='dae-history-launcher';
  launcher.innerHTML='<p>Consulta qué cambió entre las publicaciones de horarios de la DAE y revisa si afecta tus materias.</p><button class="dae-history-open" type="button" id="daeHistoryOpen">◷ Historial de cambios DAE <span class="dae-history-count" id="daeHistoryCount">…</span></button>';
  const notice=document.getElementById('catalogUpdateNotice');
  const intro=document.querySelector('main > .intro');
  const anchor=notice||intro;
  if(anchor)anchor.insertAdjacentElement('afterend',launcher);

  const overlay=document.createElement('div');
  overlay.className='dae-history-overlay';
  overlay.hidden=true;
  overlay.innerHTML='<section class="dae-history-dialog" role="dialog" aria-modal="true" aria-labelledby="daeHistoryTitle"><header class="dae-history-head"><div><h2 id="daeHistoryTitle">Historial de cambios de la DAE</h2><p>Comparación de las publicaciones consecutivas del catálogo oficial.</p></div><button type="button" class="dae-history-close" id="daeHistoryClose" aria-label="Cerrar historial">×</button></header><div class="dae-history-body" id="daeHistoryBody"><div class="dae-history-empty">Consultando el historial…</div></div></section>';
  document.body.appendChild(overlay);

  const body=document.getElementById('daeHistoryBody');
  const count=document.getElementById('daeHistoryCount');
  let historyLoaded=null;
  let previousFocus=null;

  function el(tag,className,text){
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=String(text);
    return node;
  }
  function dateLabel(entry){
    return entry.updated_at||entry.to?.updated_at||entry.generated_at||'Fecha no indicada';
  }
  function versionLabel(entry){
    const period=entry.period||entry.to?.period;
    return period&&period!=='No identificado'?'Período '+period:'Publicación DAE';
  }
  function selectedContext(){
    const ids=new Set();
    const codes=new Set();
    try{
      if(typeof selected!=='undefined'&&selected&&typeof selected.values==='function'){
        for(const course of selected.values()){
          if(course?.id)ids.add(course.id);
          if(course?.code)codes.add(course.code);
        }
      }
      if(typeof compareSubjects!=='undefined'&&compareSubjects&&typeof compareSubjects.values==='function'){
        for(const item of compareSubjects.values()){
          if(item?.code)codes.add(item.code);
          for(const id of item?.choices||[])if(id)ids.add(id);
        }
      }
    }catch(error){}
    return {ids,codes};
  }
  function isRelevant(change,context){
    return context.ids.has(change.id)||context.codes.has(change.code);
  }
  function slotText(slots){
    if(!Array.isArray(slots)||!slots.length)return 'Sin horario publicado';
    return slots.map(slot=>{
      const day=DAY[slot.day]||slot.day||'Día no indicado';
      const raw=String(slot.start||'');
      const time=/^\d{4}$/.test(raw)?raw.slice(0,2)+':'+raw.slice(2):raw;
      return day+' '+(time||'hora no indicada')+(slot.room?' · Aula '+slot.room:'');
    }).join('; ');
  }
  function valueText(field,value){
    if(value===null||value===undefined||value==='')return 'No indicado';
    if(field==='slots')return slotText(value);
    if(field==='status')return String(value).toUpperCase();
    return Array.isArray(value)?value.join(', '):String(value);
  }
  function appendField(parent,label,before,after,field){
    const row=el('div','dae-history-field');
    row.appendChild(el('strong','',label));
    row.appendChild(el('span','',before===''?after:before+' → '+after));
    parent.appendChild(row);
  }
  function changeNode(change){
    const node=el('div','dae-history-change');
    const names={added:'Nueva sección',removed:'Sección retirada',modified:'Sección modificada'};
    node.appendChild(el('div','dae-history-change-title',(names[change.type]||'Cambio')+' · '+(change.code||'')+' sección '+(change.section||'')));
    node.appendChild(el('div','dae-history-change-sub',change.name||'Nombre de materia no indicado'));
    if(change.type==='modified'){
      const labels={name:'Materia',professor:'Profesor',status:'Estado',curriculum:'Pensum',slots:'Horario / aula'};
      for(const [field,values] of Object.entries(change.fields||{})){
        appendField(node,labels[field]||field,valueText(field,values.before),valueText(field,values.after),field);
      }
    }else{
      const snapshot=change.type==='added'?change.after:change.before;
      if(snapshot){
        appendField(node,'Profesor','',valueText('professor',snapshot.professor),'professor');
        appendField(node,'Estado','',valueText('status',snapshot.status),'status');
        appendField(node,'Horario / aula','',valueText('slots',snapshot.slots),'slots');
      }
    }
    return node;
  }
  function renderHistory(data){
    body.replaceChildren();
    const entries=Array.isArray(data?.history)?data.history:[];
    count.textContent=String(entries.length);
    if(!entries.length){
      body.appendChild(el('div','dae-history-empty','Todavía no hay publicaciones comparadas. El historial se completará cuando el sistema registre la primera actualización de la DAE.'));
      return;
    }
    const context=selectedContext();
    const newestFirst=[...entries].reverse();
    for(let index=0;index<newestFirst.length;index++){
      const entry=newestFirst[index];
      const summary=entry.summary||{};
      const changes=Array.isArray(entry.changes)?entry.changes:[];
      const relevant=changes.filter(change=>isRelevant(change,context));
      const details=document.createElement('details');
      details.className='dae-history-entry';
      details.open=index===0;
      const heading=document.createElement('summary');
      const titleWrap=el('span','');
      titleWrap.appendChild(el('span','dae-history-entry-title',versionLabel(entry)));
      titleWrap.appendChild(el('span','dae-history-entry-meta',dateLabel(entry)));
      heading.appendChild(titleWrap);
      const pills=el('span','dae-history-pills');
      if(summary.added)pills.appendChild(el('span','dae-history-pill add','+'+summary.added+' nuevas'));
      if(summary.removed)pills.appendChild(el('span','dae-history-pill remove','−'+summary.removed+' retiradas'));
      if(summary.modified)pills.appendChild(el('span','dae-history-pill change',summary.modified+' modificadas'));
      if(!summary.added&&!summary.removed&&!summary.modified)pills.appendChild(el('span','dae-history-pill','Sin cambios en secciones'));
      heading.appendChild(pills);
      details.appendChild(heading);
      const content=el('div','dae-history-entry-content');
      if(relevant.length){
        content.appendChild(el('span','dae-history-affect','Este cambio afecta '+relevant.length+' sección(es) de tus materias seleccionadas o comparadas.'));
      }
      if(entry.baseline){
        content.appendChild(el('div','dae-history-empty','Este es el punto de inicio del historial. Las próximas publicaciones se compararán con esta versión.'));
      }else if(!changes.length){
        content.appendChild(el('div','dae-history-empty','La DAE publicó una nueva versión, pero no se detectaron diferencias en las secciones, horarios, profesores o aulas.'));
      }else{
        for(const change of changes)content.appendChild(changeNode(change));
      }
      details.appendChild(content);
      body.appendChild(details);
    }
  }
  async function loadHistory(force){
    if(historyLoaded&&!force)return historyLoaded;
    const response=await fetch('data/changes.json?history='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('No se pudo descargar el historial.');
    historyLoaded=await response.json();
    renderHistory(historyLoaded);
    return historyLoaded;
  }
  function openHistory(){
    previousFocus=document.activeElement;
    overlay.hidden=false;
    document.body.style.overflow='hidden';
    document.getElementById('daeHistoryClose').focus();
    loadHistory(true).catch(()=>{
      body.replaceChildren(el('div','dae-history-empty','No fue posible cargar el historial ahora. Comprueba tu conexión e inténtalo nuevamente.'));
      count.textContent='!';
    });
  }
  function closeHistory(){
    overlay.hidden=true;
    document.body.style.overflow='';
    if(previousFocus&&typeof previousFocus.focus==='function')previousFocus.focus();
  }
  document.getElementById('daeHistoryOpen').addEventListener('click',openHistory);
  document.getElementById('daeHistoryClose').addEventListener('click',closeHistory);
  overlay.addEventListener('click',event=>{if(event.target===overlay)closeHistory();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!overlay.hidden)closeHistory();});
  loadHistory(false).catch(()=>{count.textContent='—';});
})();