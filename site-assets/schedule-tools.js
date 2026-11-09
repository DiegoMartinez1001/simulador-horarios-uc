// Biblioteca de horarios personales.
(function(){
  'use strict';

  const STORAGE_KEY='ucSavedSchedulesV1';
  const MAX_SAVED=20;
  const byId=id=>document.getElementById(id);
  const notify=message=>{
    if(typeof showToast==='function')showToast(message);
    else console.info('[Horario UC]',message);
  };

  function readSaved(){
    try{
      const value=JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');
      return Array.isArray(value)?value.filter(item=>item&&typeof item.id==='string'&&Array.isArray(item.courses)):[];
    }catch(error){return [];}
  }
  function writeSaved(items){
    try{
      localStorage.setItem(STORAGE_KEY,JSON.stringify(items));
      return true;
    }catch(error){
      notify('No se pudieron guardar los horarios. Comprueba el espacio disponible del navegador.');
      return false;
    }
  }
  function snapshotCourse(course){
    return {
      id:String(course.id||''),
      code:String(course.code||''),
      name:String(course.name||''),
      section:String(course.section||''),
      professor:String(course.professor||''),
      status:String(course.status||''),
      curriculum:String(course.curriculum||''),
      slots:(course.slots||[]).map(slot=>({
        day:String(slot.day||''),
        start:String(slot.start||''),
        room:String(slot.room||'')
      }))
    };
  }
  function currentCourses(){
    return Array.from(selected.values()).map(snapshotCourse);
  }
  function displayDate(value){
    if(!value)return 'Fecha no indicada';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return 'Fecha no indicada';
    return new Intl.DateTimeFormat('es-VE',{dateStyle:'medium',timeStyle:'short'}).format(date);
  }
  function makeButton(label,action,kind){
    const button=document.createElement('button');
    button.type='button';
    button.className='schedule-library-action'+(kind?' '+kind:'');
    button.textContent=label;
    button.addEventListener('click',action);
    return button;
  }

  const style=document.createElement('style');
  style.textContent=[
    '.schedule-library{margin:13px 0 15px;padding:14px 16px;border:1px solid #dbe3ed;border-radius:12px;background:#f8fafd;color:#26364c}',
    '.schedule-library-top{display:flex;align-items:flex-start;justify-content:space-between;gap:14px;margin-bottom:11px}',
    '.schedule-library-title{margin:0;font-size:13px;font-weight:850;color:#263f61}',
    '.schedule-library-description{margin:4px 0 0;color:#718096;font-size:10px;line-height:1.5}',
    '.schedule-library-form{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}',
    '.schedule-library-name{flex:1 1 190px;min-width:0;padding:9px 11px;border:1px solid #cbd6e4;border-radius:8px;background:#fff;color:#26364c;font-size:11px;outline:none}',
    '.schedule-library-name:focus{border-color:#4d78ba;box-shadow:0 0 0 3px rgba(63,112,182,.1)}',
    '.schedule-library-action{display:inline-flex;align-items:center;justify-content:center;gap:5px;padding:8px 10px;border:1px solid #cbd6e4;border-radius:8px;background:#fff;color:#355477;font-size:10px;font-weight:800;cursor:pointer;white-space:nowrap}',
    '.schedule-library-action:hover{border-color:#7c9bc4;background:#f0f5fc}',
    '.schedule-library-action.primary{border-color:#315f9d;background:#315f9d;color:white}',
    '.schedule-library-action.primary:hover{background:#274f86}',
    '.schedule-library-action.danger{color:#a43636;border-color:#efd1d1}',
    '.schedule-library-action:disabled{opacity:.55;cursor:not-allowed}',
    '.schedule-library-list{display:grid;gap:8px}',
    '.schedule-library-empty{padding:13px;border:1px dashed #cbd6e4;border-radius:9px;color:#7b8797;font-size:10px;line-height:1.5;text-align:center;background:#fff}',
    '.schedule-library-item{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 11px;border:1px solid #e0e7ef;border-radius:9px;background:#fff}',
    '.schedule-library-item-main{min-width:0}',
    '.schedule-library-item-name{display:block;overflow-wrap:anywhere;color:#2c4668;font-size:11px;font-weight:850}',
    '.schedule-library-item-meta{display:block;margin-top:4px;color:#7b8797;font-size:9px;line-height:1.45}',
    '.schedule-library-item-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:5px;flex:0 0 auto}',
    '.schedule-library-item-actions .schedule-library-action{padding:6px 8px;font-size:9px}',
    '.schedule-library-footnote{margin:10px 0 0;color:#7b8797;font-size:9px;line-height:1.5}',
    'body[data-theme="dark"] .schedule-library{background:#111f32;border-color:#34465e;color:#e6edf6}',
    'body[data-theme="dark"] .schedule-library-title,body[data-theme="dark"] .schedule-library-item-name{color:#e6efff}',
    'body[data-theme="dark"] .schedule-library-description,body[data-theme="dark"] .schedule-library-item-meta,body[data-theme="dark"] .schedule-library-footnote{color:#9cadc2}',
    'body[data-theme="dark"] .schedule-library-name,body[data-theme="dark"] .schedule-library-item,body[data-theme="dark"] .schedule-library-empty,body[data-theme="dark"] .schedule-library-action{background:#18283d;border-color:#3a4d66;color:#e5edf8}',
    'body[data-theme="dark"] .schedule-library-action.primary{background:#4778b7;border-color:#4778b7;color:#fff}',
    'body[data-theme="dark"] .schedule-library-action.danger{color:#ffb9b9;border-color:#684747}',
    '@media(max-width:680px){.schedule-library-top{flex-direction:column}.schedule-library-form{display:grid;grid-template-columns:1fr}.schedule-library-form .schedule-library-action{width:100%}.schedule-library-item{align-items:flex-start;flex-direction:column}.schedule-library-item-actions{justify-content:flex-start;width:100%}.schedule-library-item-actions .schedule-library-action{flex:1}}'
  ].join('\n');
  document.head.appendChild(style);

  function buildInterface(){
    if(byId('scheduleLibrary'))return true;

    // Localiza el bloque real del horario. Se usa la tabla como punto de anclaje
    // para no depender de una clase concreta en la cabecera del panel.
    const scheduleBody=byId('scheduleBody');
    const table=scheduleBody?.closest('table')||null;
    const panel=byId('schedulePanel')||table?.closest('.panel')||table?.parentElement;
    if(!panel||!scheduleBody)return false;

    const root=document.createElement('section');
    root.id='scheduleLibrary';
    root.className='schedule-library';
    root.setAttribute('aria-label','Horarios personales guardados');
    root.innerHTML=
      '<div class="schedule-library-top">'+
        '<div><h4 class="schedule-library-title">Mis horarios guardados</h4>'+
        '<p class="schedule-library-description">Guarda diferentes planes para recuperarlos y compararlos cuando lo necesites.</p></div>'+
      '</div>'+
      '<form class="schedule-library-form" id="scheduleLibraryForm">'+
        '<input class="schedule-library-name" id="scheduleLibraryName" type="text" maxlength="60" required autocomplete="off" placeholder="Nombre del horario · Ej. Plan A - Ideal" aria-label="Nombre del horario a guardar">'+
        '<button class="schedule-library-action primary" id="scheduleLibrarySave" type="submit">Guardar horario actual</button>'+
      '</form>'+
      '<div class="schedule-library-list" id="scheduleLibraryList"></div>'+
      '<p class="schedule-library-footnote">Los horarios guardados permanecen únicamente en este navegador y dispositivo.</p>';
    const head=panel.querySelector('.panel-head,.panel-header,.schedule-panel-head');
    if(head)head.insertAdjacentElement('afterend',root);
    else if(table)table.insertAdjacentElement('beforebegin',root);
    else panel.prepend(root);

    byId('scheduleLibraryForm').addEventListener('submit',saveCurrentSchedule);
    renderSaved();
    return true;
  }

  function renderSaved(){
    const list=byId('scheduleLibraryList');
    if(!list)return;
    const saved=readSaved();
    list.replaceChildren();
    if(!saved.length){
      const empty=document.createElement('div');
      empty.className='schedule-library-empty';
      empty.textContent='Todavía no tienes horarios guardados. Carga tus materias en el horario individual, escribe un nombre y pulsa «Guardar horario actual».';
      list.appendChild(empty);
      return;
    }
    saved.slice().sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).forEach(item=>{
      const row=document.createElement('article');
      row.className='schedule-library-item';
      const main=document.createElement('div');
      main.className='schedule-library-item-main';
      const title=document.createElement('strong');
      title.className='schedule-library-item-name';
      title.textContent=item.name||'Horario sin nombre';
      const meta=document.createElement('span');
      meta.className='schedule-library-item-meta';
      const courseCount=item.courses.length;
      const slots=item.courses.reduce((sum,course)=>sum+(course.slots||[]).length,0);
      meta.textContent=courseCount+' materia'+(courseCount===1?'':'s')+' · '+slots+' bloque'+(slots===1?'':'s')+' · Guardado: '+displayDate(item.createdAt);
      main.append(title,meta);

      const actions=document.createElement('div');
      actions.className='schedule-library-item-actions';
      actions.appendChild(makeButton('Cargar',()=>loadSavedSchedule(item.id),'primary'));
      actions.appendChild(makeButton('Renombrar',()=>renameSavedSchedule(item.id)));
      actions.appendChild(makeButton('Eliminar',()=>deleteSavedSchedule(item.id),'danger'));
      row.append(main,actions);
      list.appendChild(row);
    });
  }

  function saveCurrentSchedule(event){
    event.preventDefault();
    const courses=currentCourses();
    const input=byId('scheduleLibraryName');
    const name=input.value.trim();
    if(!courses.length){
      notify('Agrega al menos una materia al horario individual antes de guardarlo.');
      return;
    }
    if(!name){
      notify('Escribe un nombre para identificar este horario.');
      input.focus();
      return;
    }
    const saved=readSaved();
    if(saved.length>=MAX_SAVED){
      notify('Has alcanzado el máximo de '+MAX_SAVED+' horarios guardados. Elimina alguno para guardar otro.');
      return;
    }
    const record={
      id:'schedule-'+Date.now()+'-'+Math.random().toString(36).slice(2,8),
      name,
      createdAt:new Date().toISOString(),
      courses
    };
    saved.push(record);
    if(writeSaved(saved)){
      input.value='';
      renderSaved();
      notify('Horario «'+name+'» guardado correctamente.');
    }
  }

  function loadSavedSchedule(id){
    const record=readSaved().find(item=>item.id===id);
    if(!record)return;
    if(selected.size&&!window.confirm('Se reemplazará el horario individual actual por «'+(record.name||'Horario guardado')+'». ¿Deseas continuar?'))return;

    const catalogById=new Map(COURSES.map(course=>[String(course.id),course]));
    const missing=[];
    const changed=[];
    const restored=[];
    for(const savedCourse of record.courses){
      const current=catalogById.get(String(savedCourse.id));
      if(!current){missing.push(savedCourse.code+' Sec. '+savedCourse.section);continue;}
      if(JSON.stringify(snapshotCourse(current))!==JSON.stringify(snapshotCourse(savedCourse)))changed.push(savedCourse.code+' Sec. '+savedCourse.section);
      restored.push(current);
    }
    selected.clear();
    restored.forEach(course=>selected.set(course.id,course));
    persist();
    renderAll();
    const parts=[];
    if(missing.length)parts.push(missing.length+' sección(es) ya no aparecen en el catálogo y no se cargaron');
    if(changed.length)parts.push(missing.length?'otras secciones cambiaron desde que guardaste el horario':changed.length+' sección(es) tienen datos actualizados de la DAE');
    if(!restored.length)parts.push('no se pudo recuperar ninguna materia');
    notify('«'+(record.name||'Horario guardado')+'» cargado: '+restored.length+' materia(s). '+parts.join('; ')+(restored.length?' Revisa los cruces si hubo cambios.':''));
    const panel=byId('schedulePanel');
    if(panel)panel.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function renameSavedSchedule(id){
    const saved=readSaved();
    const item=saved.find(record=>record.id===id);
    if(!item)return;
    const proposed=window.prompt('Nuevo nombre para este horario:',item.name||'');
    if(proposed===null)return;
    const name=proposed.trim();
    if(!name){notify('El nombre no puede quedar vacío.');return;}
    item.name=name.slice(0,60);
    if(writeSaved(saved)){renderSaved();notify('Nombre del horario actualizado.');}
  }

  function deleteSavedSchedule(id){
    const saved=readSaved();
    const item=saved.find(record=>record.id===id);
    if(!item)return;
    if(!window.confirm('¿Eliminar «'+(item.name||'Horario guardado')+'» de tus horarios guardados?'))return;
    if(writeSaved(saved.filter(record=>record.id!==id))){renderSaved();notify('Horario eliminado.');}
  }

  function initialize(){
    if(buildInterface())return;
    // Si el panel se monta después, observa el DOM y vuelve a intentarlo.
    const observer=new MutationObserver(()=>{
      if(buildInterface())observer.disconnect();
    });
    observer.observe(document.body,{childList:true,subtree:true});
    window.setTimeout(()=>observer.disconnect(),15000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
