// Búsqueda por pensum, escuela, semestre y énfasis. Todo el filtrado ocurre localmente.
(function(){
  'use strict';
  const DATA_URL='./data/pensum-index.json.gz.b64';
  const byId=id=>document.getElementById(id);
  let index=null;
  const resultCache={smart:new Map(),compare:new Map()};
  const normal=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const schoolLabel=id=>index?.schools?.find(item=>item.id===id)?.label||id;
  const curriculumLabel=id=>index?.curricula?.find(item=>item.id===id)?.label||id;
  const trackLabel=id=>index?.electrical_tracks?.find(item=>item.id===id)?.label||id;
  const entryMap=new Map();

  async function loadIndex(){
    const response=await fetch(DATA_URL,{cache:'no-cache'});
    if(!response.ok)throw new Error('No se pudo cargar el índice de pensums.');
    const base64=(await response.text()).trim();
    if(typeof DecompressionStream==='undefined')throw new Error('Este navegador no puede descomprimir el índice de pensums.');
    const binary=atob(base64);
    const bytes=new Uint8Array(binary.length);
    for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
    const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    index=JSON.parse(await new Response(stream).text());
    if(!index||!Array.isArray(index.entries))throw new Error('El índice de pensums tiene un formato no válido.');
    for(const row of index.entries){
      const [code]=row;
      if(!entryMap.has(code))entryMap.set(code,[]);
      entryMap.get(code).push(row);
    }
  }

  const css=document.createElement('style');
  css.textContent=[
    '.pensum-filter-panel{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:0 0 9px;padding:10px;border:1px solid #e0e7f0;border-radius:10px;background:#f7f9fc}',
    '.pensum-filter-field{display:grid;gap:4px;min-width:0}',
    '.pensum-filter-field label{font-size:9px;font-weight:850;letter-spacing:.025em;color:#52627a}',
    '.pensum-filter-field select{width:100%;min-width:0;padding:8px 9px;border:1px solid #ccd6e3;border-radius:8px;background:#fff;color:#29415f;font-size:10px;outline:none}',
    '.pensum-filter-field select:focus{border-color:#4a78c5;box-shadow:0 0 0 2px rgba(39,93,173,.1)}',
    '.pensum-filter-note{grid-column:1/-1;margin:0;color:#8290a3;font-size:9px;line-height:1.4}',
    '.pensum-filter-error{margin:5px 0;color:#9b3434;font-size:9px;line-height:1.4}',
    '.pensum-result-meta{display:block;margin-top:3px;color:#718096;font-size:9px;line-height:1.35}',
    '.pensum-search-result button{flex:0 0 auto;border:0;border-radius:7px;padding:6px 9px;background:#eaf2ff;color:#245b9b;font-size:9px;font-weight:850;cursor:pointer}',
    '.pensum-search-result button:disabled{background:#edf1f5;color:#8a95a5;cursor:default}',
    '.compare-search-result.pensum-search-result{gap:8px}',
    '.compare-search-result.pensum-search-result button{flex:0 0 auto}',
    '.pensum-search-empty{padding:10px;border:1px dashed #cbd5e1;border-radius:8px;color:#718096;background:#fff;font-size:10px;line-height:1.45}',
    'body[data-theme="dark"] .pensum-filter-panel{background:#111f32;border-color:#34465e}',
    'body[data-theme="dark"] .pensum-filter-field label{color:#a9bad0}',
    'body[data-theme="dark"] .pensum-filter-field select{background:#17283f;border-color:#506782;color:#e7effa}',
    'body[data-theme="dark"] .pensum-filter-note,body[data-theme="dark"] .pensum-result-meta{color:#9cadc2}',
    'body[data-theme="dark"] .pensum-search-result button{background:#203b5e;color:#d7e7ff}',
    'body[data-theme="dark"] .pensum-search-result button:disabled{background:#27384d;color:#9cadc2}',
    'body[data-theme="dark"] .pensum-search-empty{background:#18283d;border-color:#3a4d66;color:#b8c7da}',
    '@media(max-width:520px){.pensum-filter-panel{grid-template-columns:1fr;padding:9px}.pensum-filter-note{grid-column:auto}}'
  ].join('\n');
  document.head.appendChild(css);

  function makeSelect(id,label,options){
    const wrapper=document.createElement('div');
    wrapper.className='pensum-filter-field';
    const text=document.createElement('label');
    text.htmlFor=id;
    text.textContent=label;
    const select=document.createElement('select');
    select.id=id;
    select.setAttribute('aria-label',label);
    options.forEach(option=>{
      const node=document.createElement('option');
      node.value=option.value;
      node.textContent=option.label;
      select.appendChild(node);
    });
    wrapper.append(text,select);
    return {wrapper,select};
  }

  function installFilterPanel(mode){
    const input=byId(mode==='smart'?'smartSearch':'compareSearch');
    if(!input)return null;
    const scope=mode==='smart'?input.closest('.smart-subject-picker'):input.closest('.compare-controls');
    if(!scope)return null;
    const idPrefix=mode==='smart'?'smartPensum':'comparePensum';
    if(byId(idPrefix+'Filters'))return byId(idPrefix+'Filters');
    const panel=document.createElement('div');
    panel.className='pensum-filter-panel';
    panel.id=idPrefix+'Filters';

    const plan=makeSelect(idPrefix+'Plan','Pensum',[
      {value:'',label:'Todos los pensums'},
      ...index.curricula.map(item=>({value:item.id,label:item.label}))
    ]);
    const school=makeSelect(idPrefix+'School','Escuela',[
      {value:'',label:'Todas las escuelas'},
      ...index.schools.map(item=>({value:item.id,label:item.id==='quimica'?item.label+' · solo Pensum Actual':item.label}))
    ]);
    const semester=makeSelect(idPrefix+'Semester','Semestre',[
      {value:'',label:'Todos los semestres'},
      ...Array.from({length:10},(_,i)=>({value:String(i+1),label:(i+1)+'.º semestre'}))
    ]);
    const track=makeSelect(idPrefix+'Track','Énfasis de Ingeniería Eléctrica',[
      {value:'',label:'Todos los énfasis'},
      ...index.electrical_tracks.map(item=>({value:item.id,label:item.label}))
    ]);
    track.wrapper.hidden=true;
    panel.append(plan.wrapper,school.wrapper,semester.wrapper,track.wrapper);
    const note=document.createElement('p');
    note.className='pensum-filter-note';
    note.textContent='Puedes combinar los filtros con la búsqueda por código o nombre. Solo se muestran materias con secciones publicadas en el catálogo actual de la DAE.';
    panel.appendChild(note);

    const label=scope.querySelector('label[for="'+input.id+'"]');
    if(label)label.insertAdjacentElement('afterend',panel);
    else input.insertAdjacentElement('beforebegin',panel);

    const controls={plan:plan.select,school:school.select,semester:semester.select,track:track.select,trackWrap:track.wrapper,panel,note};
    panel.addEventListener('change',()=>{
      refreshFilterState(controls);
      render(mode);
    });
    return controls;
  }

  const controls={};
  function refreshFilterState(c){
    if(c.plan.value==='nuevo'&&c.school.value==='quimica'){
      c.school.value='';
    }
    const chemistry=Array.from(c.school.options).find(option=>option.value==='quimica');
    if(chemistry){
      chemistry.disabled=c.plan.value==='nuevo';
      chemistry.textContent=c.plan.value==='nuevo'?'Ingeniería Química · no disponible en Pensum Nuevo':'Ingeniería Química · solo Pensum Actual';
    }
    const electrical=c.school.value==='electrica'&&c.plan.value!=='viejo';
    c.trackWrap.hidden=!electrical;
    if(!electrical)c.track.value='';
    if(c.track.value){
      c.plan.value='nuevo';
      c.school.value='electrica';
    }
  }

  function selectedSmart(code){
    try{
      if(window.UCSmartGenerator)return window.UCSmartGenerator.has(code);
    }catch(error){}
    const root=byId('smartSelected');
    return !!root&&Array.from(root.querySelectorAll('[data-smart-remove]')).some(item=>item.getAttribute('data-smart-remove')===code);
  }
  function selectedCompare(code){
    try{return typeof compareSubjects!=='undefined'&&compareSubjects&&compareSubjects.has(code);}
    catch(error){return false;}
  }
  function curriculumOf(course){
    const value=String(course.curriculum||'').toLowerCase();
    return value==='viejo'||value==='nuevo'?value:'';
  }
  function filterEntries(course,state){
    const rows=entryMap.get(String(course.code))||[];
    return rows.filter(row=>{
      const [,curriculum,school,semester,track]=row;
      const courseCurriculum=curriculumOf(course);
      if(courseCurriculum&&courseCurriculum!==curriculum)return false;
      if(state.plan&&state.plan!==curriculum)return false;
      if(state.school&&state.school!==school)return false;
      if(state.semester&&Number(state.semester)!==Number(semester))return false;
      if(state.track&&state.track!==track)return false;
      return true;
    });
  }
  function getState(c){
    return {plan:c.plan.value,school:c.school.value,semester:c.semester.value,track:c.track.value};
  }
  function activeCourses(){
    if(typeof COURSES==='undefined'||!Array.isArray(COURSES))return [];
    return COURSES.filter(course=>course&&course.code&&course.status!=='CERRADA'&&Array.isArray(course.slots)&&course.slots.length>0);
  }
  function buildGroups(query,state){
    const hasFilters=Boolean(state.plan||state.school||state.semester||state.track);
    const groups=new Map();
    for(const course of activeCourses()){
      const code=String(course.code);
      const searchable=normal(code+' '+(course.name||''));
      if(query&&!searchable.includes(query))continue;
      const matches=hasFilters?filterEntries(course,state):[];
      if(hasFilters&&!matches.length)continue;
      if(!groups.has(code))groups.set(code,{code,name:course.name||code,sections:[],entries:matches,curriculum:curriculumOf(course)});
      const group=groups.get(code);
      if(!group.sections.some(item=>String(item.id)===String(course.id)))group.sections.push(course);
      if(matches.length){
        matches.forEach(row=>{if(!group.entries.some(existing=>existing.join('|')===row.join('|')))group.entries.push(row);});
      }
      if(!group.curriculum)group.curriculum=curriculumOf(course);
    }
    return [...groups.values()].sort((a,b)=>a.code.localeCompare(b.code,'es'));
  }
  function entryDescription(group,state){
    if(!state.plan&&!state.school&&!state.semester&&!state.track)return group.sections.length+' secciones activas en el catálogo';
    const entry=group.entries[0];
    if(!entry)return '';
    const [,curriculum,school,semester,track]=entry;
    const bits=[schoolLabel(school),'Semestre '+semester,curriculumLabel(curriculum)];
    if(state.track&&track)bits.push(trackLabel(track));
    return bits.join(' · ');
  }
  function renderEmpty(root,message){
    root.replaceChildren();
    const item=document.createElement('div');
    item.className='pensum-search-empty';
    item.textContent=message;
    root.appendChild(item);
  }
  function render(mode){
    const smart=mode==='smart';
    const input=byId(smart?'smartSearch':'compareSearch');
    const root=byId(smart?'smartSearchResults':'compareSearchResults');
    const c=controls[mode];
    if(!input||!root||!c)return;
    const state=getState(c);
    const query=normal(input.value);
    const hasFilters=Boolean(state.plan||state.school||state.semester||state.track);
    if(!query&&!hasFilters){
      resultCache[mode].clear();
      root.replaceChildren();
      return;
    }
    const groups=buildGroups(query,state);
    resultCache[mode]=new Map(groups.map(group=>[group.code,group]));
    if(!groups.length){
      renderEmpty(root,hasFilters?'No se encontraron materias con secciones publicadas que coincidan con esos filtros. Prueba otro semestre, escuela o pensum.':'No se encontraron materias con secciones publicadas que coincidan con la búsqueda.');
      return;
    }
    const fragment=document.createDocumentFragment();
    groups.slice(0,30).forEach(group=>{
      const row=document.createElement('div');
      row.className=smart?'smart-search-item pensum-search-result':'compare-search-result pensum-search-result';
      const info=document.createElement('span');
      const code=document.createElement('strong');
      code.textContent=group.code;
      const name=document.createElement('small');
      name.textContent=group.name;
      const meta=document.createElement('small');
      meta.className='pensum-result-meta';
      meta.textContent=entryDescription(group,state);
      info.append(code,name,meta);
      const button=document.createElement('button');
      button.type='button';
      if(smart){
        button.dataset.smartAdd=group.code;
        button.dataset.pensumCurriculum=state.plan||'';
        button.dataset.pensumSchool=state.school||'';
        button.dataset.pensumTrack=state.track||'';
        button.textContent=selectedSmart(group.code)?'Agregada':'Agregar';
        button.disabled=selectedSmart(group.code);
      }else{
        button.dataset.pensumCompareAdd=group.code;
        button.textContent=selectedCompare(group.code)?'Agregada':'Agregar';
        button.disabled=selectedCompare(group.code);
      }
      row.append(info,button);
      fragment.appendChild(row);
    });
    root.replaceChildren(fragment);
    if(groups.length>30){
      const more=document.createElement('p');
      more.className='pensum-filter-note';
      more.textContent='Se muestran 30 de '+groups.length+' resultados. Escribe parte del código o nombre para precisar la búsqueda.';
      root.appendChild(more);
    }
  }

  function addCompare(code){
    if(selectedCompare(code))return;
    const group=resultCache.compare.get(code);
    if(!group||!group.sections.length)return;
    const sections=group.sections.slice(0,3);
    const last=sections[sections.length-1];
    const choices=[0,1,2].map(i=>String((sections[i]||last).id));
    try{
      compareSubjects.set(code,{code,name:group.name,choices});
      if(typeof persistCompare==='function')persistCompare();
      if(typeof renderCompareAll==='function')renderCompareAll();
      if(typeof renderCompareSearch==='function')renderCompareSearch();
      render('compare');
      if(typeof showToast==='function')showToast(group.code+' agregado a la comparación.');
    }catch(error){
      if(typeof showToast==='function')showToast('No se pudo agregar la materia a la comparación.');
    }
  }

  function attach(){
    controls.smart=installFilterPanel('smart');
    controls.compare=installFilterPanel('compare');
    if(!controls.smart||!controls.compare)return false;
    refreshFilterState(controls.smart);
    refreshFilterState(controls.compare);

    byId('smartSearch').addEventListener('input',()=>render('smart'));
    byId('smartSearchResults').addEventListener('click',event=>{
      const button=event.target.closest('[data-smart-add]');
      if(!button)return;
      const code=button.dataset.smartAdd;
      try{
        window.UCSmartGenerator?.setMetadata(code,{
          curriculum:button.dataset.pensumCurriculum||'',
          school:button.dataset.pensumSchool||'',
          track:button.dataset.pensumTrack||''
        });
      }catch(error){}
      render('smart');
    });
    byId('compareSearch').addEventListener('input',()=>render('compare'));
    byId('compareSearchResults').addEventListener('click',event=>{
      const button=event.target.closest('[data-pensum-compare-add]');
      if(!button)return;
      addCompare(button.dataset.pensumCompareAdd);
    });
    // Re-render compare results when the old listener changes the list.
    byId('compareSearchResults').addEventListener('click',()=>render('compare'));
    byId('smartSelected')?.addEventListener('click',()=>render('smart'));
    render('smart');
    render('compare');
    return true;
  }

  async function initialize(){
    try{
      await loadIndex();
      if(!attach())return;
    }catch(error){
      console.warn('[Pensum Search]',error);
      ['smartSearchResults','compareSearchResults'].forEach(id=>{
        const root=byId(id);
        if(root)renderEmpty(root,'La clasificación por pensum no está disponible en este momento. La búsqueda habitual por código o nombre sigue funcionando.');
      });
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();