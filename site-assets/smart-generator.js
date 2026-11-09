// Generador inteligente de horarios: búsqueda con poda y ranking por preferencias.
(function(){
  const DAY_ORDER=['LU','MA','MI','JU','VI','SA'];
  const DAY_NAMES={LU:'Lun',MA:'Mar',MI:'Mié',JU:'Jue',VI:'Vie',SA:'Sáb'};
  const DAY_FULL={LU:'Lunes',MA:'Martes',MI:'Miércoles',JU:'Jueves',VI:'Viernes',SA:'Sábado'};
  const $s=id=>document.getElementById(id);
  const chosen=new Map();
  let generated=[];
  function updateCustomPreferences(){
    const active=$s('smartStrategy').value==='custom';
    const panel=$s('smartCustomOptions');
    panel.classList.toggle('is-disabled',!active);
    panel.setAttribute('aria-disabled',String(!active));
    ['smartTime','smartFreeDay','smartMaxHours','smartAvoidGaps'].forEach(id=>{$s(id).disabled=!active;});
    $s('smartCustomHint').textContent=active
      ?'Estas preferencias se aplicarán al ordenar las combinaciones. Los cruces siempre se descartan.'
      :'Estas preferencias se habilitan al seleccionar «Horario personalizado».';
  }
  function coursesFor(code){return COURSES.filter(c=>c.code===code);}
  function availableSections(code){return coursesFor(code).filter(c=>c.status!=='CERRADA'&&(c.slots||[]).length>0);}
  function addSubject(code){
    if(chosen.has(code))return;
    const item=coursesFor(code)[0];if(!item)return;
    chosen.set(code,{code,name:item.name||code});renderChosen();$s('smartSearch').value='';$s('smartSearchResults').innerHTML='';
  }
  function renderChosen(){
    $s('smartSelectedCount').textContent=chosen.size;
    $s('smartSelected').innerHTML=chosen.size?[...chosen.values()].map(x=>'<span class="smart-chip">'+esc(x.code)+'<button type="button" data-smart-remove="'+esc(x.code)+'" aria-label="Quitar '+esc(x.code)+'">×</button></span>').join(''):'<span class="smart-muted">Agrega las materias que planeas inscribir.</span>';
  }
  function searchSubjects(value){
    const q=norm(value||'');
    if(!q){$s('smartSearchResults').innerHTML='';return;}
    const groups=new Map();
    for(const c of COURSES){if(!groups.has(c.code))groups.set(c.code,c);}
    const found=[...groups.values()].filter(c=>!chosen.has(c.code)&&(norm(c.code).includes(q)||norm(c.name).includes(q))).slice(0,8);
    $s('smartSearchResults').innerHTML=found.map(c=>'<div class="smart-search-item"><span><b>'+esc(c.code)+'</b><small>'+esc(c.name||'Nombre no indicado')+'</small></span><button type="button" data-smart-add="'+esc(c.code)+'">Agregar</button></div>').join('');
  }
  function slotInterval(slot){const start=toMinutes(slot.start);return {day:slot.day,start,end:start+DUR};}
  function conflictsWith(section,placed){
    const own=(section.slots||[]).map(slotInterval);
    for(const slot of own)for(const other of placed){
      if(slot.day===other.day&&Math.max(slot.start,other.start)<Math.min(slot.end,other.end))return true;
    }
    return false;
  }
  function metrics(items,prefs){
    const byDay={};DAY_ORDER.forEach(d=>byDay[d]=[]);
    for(const c of items)for(const s of c.slots||[]){if(byDay[s.day])byDay[s.day].push(slotInterval(s));}
    let active=0,totalGaps=0,maxDaily=0,variance=0;
    const loads=[];
    for(const day of DAY_ORDER){
      const a=byDay[day].sort((x,y)=>x.start-y.start);
      if(a.length)active++;
      let minutes=0,gaps=0;
      a.forEach((x,i)=>{minutes+=x.end-x.start;if(i&&x.start>a[i-1].end){gaps+=x.start-a[i-1].end;}});
      totalGaps+=gaps;maxDaily=Math.max(maxDaily,minutes);loads.push(minutes/60);
    }
    const mean=loads.reduce((a,b)=>a+b,0)/loads.length;
    variance=loads.reduce((a,b)=>a+(b-mean)**2,0)/loads.length;
    const free=prefs.freeDay&&!byDay[prefs.freeDay].length?1:0;
    const maxOver=prefs.maxHours?Math.max(0,maxDaily/60-prefs.maxHours):0;
    let earlyPenalty=0,latePenalty=0;
    for(const c of items)for(const s of c.slots||[]){const m=toMinutes(s.start);if(prefs.time==='morning'&&m>=720)latePenalty++;if(prefs.time==='afternoon'&&m<720)earlyPenalty++;}
    const gapsPenalty=prefs.avoidGaps?totalGaps:0;
    let score;
    if(prefs.strategy==='balanced')score=variance*12;
    else if(prefs.strategy==='custom')score=(prefs.freeDay?(free?0:35):0)+maxOver*10+gapsPenalty/50+earlyPenalty*1.5+latePenalty*1.5+active*0.15;
    else score=active*100;
    return {active,freeDays:6-active,gaps:Math.round(totalGaps/60*10)/10,maxDaily:Math.round(maxDaily/60*10)/10,score,freeDay:free};
  }
  function makeTable(items){
    const rows=TIMES.map(t=>{
      const cells=DAY_ORDER.map(day=>{
        const blocks=items.flatMap(c=>(c.slots||[]).filter(s=>s.day===day&&s.start===t).map(s=>'<span class="smart-class"><b>'+esc(c.code)+'</b><small>Sec. '+esc(c.section)+' · '+esc(s.room||'')+'</small></span>')).join('');
        return '<td>'+blocks+'</td>';
      }).join('');
      return '<tr><th>'+timeLabel(t)+'<br>'+endLabel(t)+'</th>'+cells+'</tr>';
    }).join('');
    return '<div class="smart-result-table-wrap"><table class="smart-result-table"><thead><tr><th>Hora</th>'+DAY_ORDER.map(d=>'<th>'+DAY_NAMES[d]+'</th>').join('')+'</tr></thead><tbody>'+rows+'</tbody></table></div>';
  }
  function renderResults(){
    const root=$s('smartResults');
    if(!generated.length){root.hidden=false;root.innerHTML='<div class="smart-no-results">No se encontró una combinación completa sin cruces. Prueba quitando alguna materia o cambiando las preferencias. Las materias sin horario publicado o con secciones cerradas no pueden formar parte de una combinación validada.</div>';return;}
    root.hidden=false;
    root.innerHTML=generated.map((r,i)=>{
      const title=['Más días libres','Distribución alternativa','Otra combinación conveniente'][i]||('Alternativa '+(i+1));
      const days=DAY_ORDER.filter(d=>r.metrics.activeDays.includes(d));
      const free=DAY_ORDER.filter(d=>!days.includes(d)).map(d=>DAY_NAMES[d]).join(', ')||'Ninguno';
      const analysis=window.UCScheduleAnalyzer?window.UCScheduleAnalyzer.analyze(r.items):null;
      return '<article class="smart-result-card"><div class="smart-result-head"><strong>Opción '+(i+1)+' · '+title+'</strong><small>'+r.items.length+' de '+chosen.size+' materias · '+r.metrics.active+' días con clases</small></div><div class="smart-result-stats"><span><b>'+r.metrics.freeDays+'</b>Días libres</span><span><b>0</b>Cruces</span><span><b>'+r.metrics.gaps+' h</b>Espacios</span></div><div class="smart-result-stats"><span>Días libres: <b style="font-size:11px">'+free+'</b></span><span>Jornada máx.: <b style="font-size:11px">'+r.metrics.maxDaily+' h</b></span></div><div class="smart-result-stats"><span>Índice orientativo: <b style="font-size:13px">'+(analysis?analysis.score+'/100':'—')+'</b></span><span>'+(analysis?esc(analysis.label):'Análisis no disponible')+'</span></div>'+makeTable(r.items)+'<button type="button" class="btn smart-use" data-smart-use="'+i+'">Usar este horario</button></article>';
    }).join('')+'<div class="smart-results-footer"><div><strong>¿Quieres comparar estas alternativas?</strong><small>Envía las combinaciones al comparador para revisar los tres calendarios lado a lado.</small></div><button type="button" class="btn smart-compare-btn" data-smart-compare>⇄ Comparar las tres opciones</button></div>';
  }
  function importToCompare(){
    if(!generated.length)return;
    if(compareSubjects.size&&!window.confirm('Esto reemplazará las materias y secciones que ya tienes en el comparador de tres opciones. ¿Deseas continuar?'))return;
    const codes=[...chosen.keys()];
    const incomplete=codes.filter(code=>generated.some(result=>!result.items.some(item=>item.code===code)));
    if(incomplete.length){$s('smartStatus').textContent='No se pudieron transferir todas las materias: '+incomplete.join(', ')+'. Genera nuevamente las opciones.';return;}
    compareSubjects.clear();
    for(const code of codes){
      const sections=generated.map(result=>result.items.find(item=>item.code===code));
      const choices=[0,1,2].map(index=>sections[Math.min(index,sections.length-1)].id);
      compareSubjects.set(code,{code,name:chosen.get(code).name,choices});
    }
    persistCompare();
    renderCompareAll();
    renderCompareSearch();
    if(generated.length<3){
      $('compareBest').textContent='Se encontraron '+generated.length+' combinación(es) distinta(s). Las columnas restantes repiten la última combinación disponible.';
    }else{
      $('compareBest').textContent='Las tres alternativas fueron generadas automáticamente y no presentan cruces en los horarios publicados.';
    }
    showToast(codes.length+' materias enviadas al comparador.');
    $('comparePanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function generate(){
    const codes=[...chosen.keys()];
    if(!codes.length){$s('smartStatus').textContent='Primero agrega al menos una materia.';$s('smartResults').hidden=true;return;}
    const strategy=$s('smartStrategy').value;
    const custom=strategy==='custom';
    const prefs={strategy,time:custom?$s('smartTime').value:'any',freeDay:custom?$s('smartFreeDay').value:'',maxHours:custom?Number($s('smartMaxHours').value):0,avoidGaps:custom&&$s('smartAvoidGaps').checked};
    const groups=codes.map(code=>({code,sections:availableSections(code)}));
    const unavailable=groups.filter(g=>!g.sections.length);
    if(unavailable.length){$s('smartStatus').textContent='No se puede generar un horario completo: '+unavailable.map(g=>g.code).join(', ')+' no tiene secciones activas con bloques horarios publicados.';$s('smartResults').hidden=true;return;}
    groups.sort((a,b)=>a.sections.length-b.sections.length);
    let visited=0;const LIMIT=180000;const best=[];
    const placed=[],picked=[];
    function addCandidate(items,met){
      const signature=items.map(c=>c.id).sort().join('~');
      if(best.some(x=>x.signature===signature))return;
      best.push({items:items.slice(),metrics:{...met},signature});
      best.sort((a,b)=>a.metrics.score-b.metrics.score);
      if(best.length>18)best.length=18;
    }
    function walk(index){
      if(++visited>LIMIT)return;
      if(index===groups.length){
        const met=metrics(picked,prefs);
        met.activeDays=DAY_ORDER.filter(d=>picked.some(c=>(c.slots||[]).some(s=>s.day===d)));
        addCandidate(picked,met);return;
      }
      const group=groups[index];
      for(const section of group.sections){
        if(conflictsWith(section,placed))continue;
        picked.push(section);
        const added=(section.slots||[]).map(slotInterval);placed.push(...added);
        walk(index+1);
        placed.splice(placed.length-added.length,added.length);picked.pop();
        if(visited>LIMIT)break;
      }
    }
    walk(0);
    const distinct=[];
    for(const candidate of best){
      if(distinct.some(x=>x.signature===candidate.signature))continue;
      distinct.push(candidate);if(distinct.length===3)break;
    }
    generated=distinct;
    $s('smartStatus').textContent=distinct.length?'Se evaluaron '+Math.min(visited,LIMIT).toLocaleString('es-VE')+' pasos de búsqueda. '+(visited>LIMIT?'Se alcanzó el límite de búsqueda; los resultados son las mejores combinaciones encontradas.':'Se completó la búsqueda de combinaciones compatibles.'):'No existe una combinación completa sin cruces para estas materias con los horarios publicados.';
    renderResults();
  }
  function applyResult(index){
    const result=generated[index];if(!result)return;
    if(selected.size&&!window.confirm('Esto reemplazará las materias del horario individual por las '+result.items.length+' materias de esta combinación. ¿Deseas continuar?'))return;
    selected.clear();result.items.forEach(c=>selected.set(c.id,c));persist();renderAll();
    showToast('Horario generado aplicado: '+result.items.length+' materias sin cruces.');
    $('schedulePanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  $s('smartStrategy').addEventListener('change',updateCustomPreferences);
  updateCustomPreferences();
  $s('smartSearch').addEventListener('input',e=>searchSubjects(e.target.value));
  $s('smartSearchResults').addEventListener('click',e=>{const b=e.target.closest('[data-smart-add]');if(b)addSubject(b.dataset.smartAdd);});
  $s('smartSelected').addEventListener('click',e=>{const b=e.target.closest('[data-smart-remove]');if(b){chosen.delete(b.dataset.smartRemove);renderChosen();}});
  $s('smartGenerate').addEventListener('click',generate);
  $s('smartResults').addEventListener('click',e=>{
    const use=e.target.closest('[data-smart-use]');
    if(use){applyResult(Number(use.dataset.smartUse));return;}
    if(e.target.closest('[data-smart-compare]'))importToCompare();
  });
  document.addEventListener('uc-catalog-updated',()=>{
    generated=[];
    $s('smartResults').hidden=true;
    $s('smartStatus').textContent='El catálogo se actualizó. Genera nuevamente las combinaciones para utilizar los horarios más recientes.';
  });
})();