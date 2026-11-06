// Preferencias visuales y acciones adicionales del comparador.
(function(){
  const courseColors = {};
  const palette = ['#416fb5','#238477','#bf7a25','#8058ad','#b44e70','#648b48','#64748b','#ad8a27'];
  function colorFor(code){
    if(courseColors[code]) return courseColors[code];
    let hash=0;for(const ch of String(code)){hash=(hash*31+ch.charCodeAt(0))>>>0;}
    return palette[hash%palette.length];
  }
  function colorStyle(code){
    const color=colorFor(code);
    const dark=document.body.dataset.theme==='dark';
    return '--course-bg:'+color+(dark?'35':'24')+';--course-accent:'+color+';--course-ink:'+(dark?'#f2f6fc':'#203b62');
  }
  function saveColors(){
    try{localStorage.setItem('ucCourseColorsV1',JSON.stringify(courseColors));}catch(e){}
  }
  function restoreColors(){
    try{Object.assign(courseColors,JSON.parse(localStorage.getItem('ucCourseColorsV1')||'{}'));}catch(e){}
  }
  function applyTheme(theme,rerender){
    const mode=theme==='dark'?'dark':'light';
    document.body.dataset.theme=mode;
    const button=document.getElementById('themeToggle');
    if(button){
      button.setAttribute('aria-pressed',String(mode==='dark'));
      document.getElementById('themeIcon').textContent=mode==='dark'?'☀':'☾';
      document.getElementById('themeLabel').textContent=mode==='dark'?'Modo claro':'Modo oscuro';
    }
    try{localStorage.setItem('ucThemeV1',mode);}catch(e){}
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.content=mode==='dark'?'#0c1626':'#101d35';
    if(rerender!==false){
      if(typeof renderCompareAll==='function')renderCompareAll();
      if(typeof renderAll==='function')renderAll();
    }
  }
  renderSchedule=function(conflicts){
    const conflictKeys=new Set();
    for(const c of conflicts){
      for(const t of TIMES){
        const a=toMinutes(t),b=a+DUR;
        if(Math.max(a,c.start)<Math.min(b,c.end))conflictKeys.add(c.day+'|'+t);
      }
    }
    const body=TIMES.map(t=>{
      const cells=DAYS.map(day=>{
        const courses=Array.from(selected.values()).filter(c=>(c.slots||[]).some(s=>s.day===day&&s.start===t));
        const conflict=conflictKeys.has(day+'|'+t);
        const blocks=courses.map(c=>{
          const slot=c.slots.find(s=>s.day===day&&s.start===t);
          return '<div class="class-block" style="'+colorStyle(c.code)+'" title="'+esc(c.name)+' · Sección '+esc(c.section)+' · '+timeLabel(t)+'–'+endLabel(t)+' · Aula '+esc(slot.room||'')+'"><strong>'+esc(c.code)+'</strong><small>Sec. '+esc(c.section)+' · '+esc(slot.room||'')+'</small></div>';
        }).join('');
        return '<td class="'+(conflict?'conflict-cell':'')+'">'+blocks+'</td>';
      }).join('');
      return '<tr><td class="time-cell">'+timeLabel(t)+'<span>'+endLabel(t)+'</span></td>'+cells+'</tr>';
    }).join('');
    $('scheduleBody').innerHTML=body;
  };
  renderSelected=function(){
    const items=Array.from(selected.values());
    $('selectedList').innerHTML=items.length?items.map(c=>{
      const rooms=[...new Set((c.slots||[]).map(slot=>(slot.room||'').trim()).filter(Boolean))];
      const roomLabel=rooms.length?rooms.join(', '):'No indicado';
      const professor=(c.professor||'').trim()||'No indicado';
      return '<div class="selected-chip selected-chip-detailed">'
        +'<input class="chip-color-picker" type="color" value="'+colorFor(c.code)+'" data-selected-course-color="'+esc(c.code)+'" aria-label="Color de '+esc(c.code)+'" title="Cambiar color de '+esc(c.code)+'">'
        +'<span class="selected-chip-info">'
          +'<strong class="selected-chip-code">'+esc(c.code)+' · Sección '+esc(c.section)+'</strong>'
          +'<span class="selected-chip-name">'+esc(c.name||'Nombre no indicado')+'</span>'
          +'<span class="selected-chip-meta"><b>Salón:</b> '+esc(roomLabel)+'</span>'
          +'<span class="selected-chip-meta"><b>Profesor:</b> '+esc(professor)+'</span>'
        +'</span>'
        +'<button class="chip-remove" title="Quitar '+esc(c.code)+'" aria-label="Quitar '+esc(c.code)+'" data-remove="'+esc(c.id)+'">×</button>'
        +'</div>';
    }).join(''):'<div class="no-selection">Todavía no has agregado materias. Busca un código a la izquierda para comenzar.</div>';
  };

  renderCompareRows=function(){
    const rows=Array.from(compareSubjects.values());
    $('compareRowsWrap').hidden=!rows.length;
    $('compareEmpty').hidden=!!rows.length;
    $('compareSummary').hidden=!rows.length;
    if(!rows.length){$('compareRows').innerHTML='';return;}
    $('compareRows').innerHTML=rows.map(item=>{
      const sections=orderedSections(item.code);
      const selectors=item.choices.map((id,i)=>{
        const opts=sections.map(c=>'<option value="'+esc(c.id)+'" '+(c.id===id?'selected':'')+'>'+esc(sectionLabel(c))+'</option>').join('');
        return '<td><select aria-label="'+esc(OPTION_LABELS[i])+' para '+esc(item.code)+'" data-compare-choice="'+esc(item.code)+'" data-option="'+i+'">'+opts+'</select></td>';
      }).join('');
      return '<tr><td><button type="button" class="compare-remove" data-compare-remove="'+esc(item.code)+'" aria-label="Quitar '+esc(item.code)+'" title="Quitar materia">×</button></td><td class="compare-code">'+esc(item.code)+'</td><td class="compare-name">'+esc(item.name)+'</td><td class="course-color-cell"><input class="course-color-picker" type="color" value="'+colorFor(item.code)+'" data-course-color="'+esc(item.code)+'" aria-label="Color de '+esc(item.code)+'" title="Elegir color para '+esc(item.code)+'"></td>'+selectors+'</tr>';
    }).join('');
  };
  renderOptionSchedule=function(option){
    const index=option+1,items=getOptionItems(option),conflicts=conflictsForItems(items);
    const conflictKeys=new Set();
    conflicts.forEach(c=>TIMES.forEach(t=>{
      const a=toMinutes(t),b=a+DUR;
      if(Math.max(a,c.start)<Math.min(b,c.end))conflictKeys.add(c.day+'|'+t);
    }));
    const missing=items.filter(c=>!(c.slots||[]).length);
    $('optionMeta'+index).textContent=items.length+' materia'+(items.length===1?'':'s')+' · '+conflicts.length+' cruce'+(conflicts.length===1?'':'s')+(missing.length?' · '+missing.length+' sin horario':'');
    $('optionMeta'+index).classList.toggle('option-conflict-count',conflicts.length>0);
    const body=TIMES.map(t=>{
      const cells=DAYS.map(day=>{
        const courses=items.filter(c=>(c.slots||[]).some(s=>s.day===day&&s.start===t));
        const conflict=conflictKeys.has(day+'|'+t);
        const blocks=courses.map(c=>{
          const slot=c.slots.find(s=>s.day===day&&s.start===t);
          return '<div class="option-block" style="'+colorStyle(c.code)+'" title="'+esc(c.name)+' · Sección '+esc(c.section)+' · '+timeLabel(t)+'–'+endLabel(t)+'"><strong>'+esc(c.code)+'</strong><small>Sec. '+esc(c.section)+' · '+esc(slot.room||'')+'</small></div>';
        }).join('');
        return '<td class="'+(conflict?'conflict-cell':'')+'">'+blocks+'</td>';
      }).join('');
      return '<tr><td class="time-cell">'+timeLabel(t)+'<small>'+endLabel(t)+'</small></td>'+cells+'</tr>';
    }).join('');
    $('optionBody'+index).innerHTML=body;
    const status=$('optionStatus'+index);
    if(!items.length){status.innerHTML='<div class="option-note">Agrega materias para construir esta alternativa.</div>';}
    else{
      const missingNote=missing.length?'<div class="option-note">⚠ '+missing.map(c=>esc(c.code)).join(', ')+': sin horario publicado; no se puede validar su compatibilidad.</div>':'';
      const conflictNote=conflicts.length?conflicts.map(c=>'<div class="conflict-item"><strong>'+DAY_LABEL[c.day]+' · '+fromMinutes(c.start)+'–'+fromMinutes(c.end)+'</strong><br>'+esc(c.a.code)+' Sec. '+esc(c.a.section)+' coincide con '+esc(c.b.code)+' Sec. '+esc(c.b.section)+'.</div>').join(''):'<div class="no-conflicts">✓ Sin cruces detectados entre los horarios publicados</div>';
      status.innerHTML=missingNote+conflictNote;
    }
    return {items:items,conflicts:conflicts};
  };
  function applyOption(option){
    const items=getOptionItems(option);
    if(!items.length){showToast('Primero agrega materias a esta alternativa.');return;}
    if(selected.size&&!window.confirm('Esta acción reemplazará las materias del horario individual por la Opción '+(option+1)+'. ¿Deseas continuar?'))return;
    selected.clear();
    items.forEach(c=>selected.set(c.id,c));
    persist();
    renderAll();
    showToast('Opción '+(option+1)+' cargada en el horario individual ('+items.length+' materias).');
    $('schedulePanel').scrollIntoView({behavior:'smooth',block:'start'});
  }
  $('selectedList').addEventListener('change',function(e){
    const input=e.target.closest('[data-selected-course-color]');
    if(!input||!/^#[0-9a-f]{6}$/i.test(input.value))return;
    courseColors[input.dataset.selectedCourseColor]=input.value;
    saveColors();
    renderAll();
    renderCompareAll();
  });
  $('compareRows').addEventListener('change',function(e){
    const input=e.target.closest('[data-course-color]');
    if(!input)return;
    if(!/^#[0-9a-f]{6}$/i.test(input.value))return;
    courseColors[input.dataset.courseColor]=input.value;
    saveColors();
    renderCompareAll();
    renderAll();
  });
  $('optionSchedules').addEventListener('click',function(e){
    const button=e.target.closest('[data-apply-option]');
    if(button)applyOption(Number(button.dataset.applyOption));
  });
  $('themeToggle').addEventListener('click',function(){
    applyTheme(document.body.dataset.theme==='dark'?'light':'dark',true);
  });
  restoreColors();
  let savedTheme='light';
  try{savedTheme=localStorage.getItem('ucThemeV1')||'light';}catch(e){}
  applyTheme(savedTheme,false);
})();
