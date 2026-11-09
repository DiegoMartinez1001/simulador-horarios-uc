// Búsqueda por pensum, escuela, semestre y énfasis. Todo el filtrado ocurre localmente.
(function(){
  'use strict';
  const DATA_URL='./data/pensum-index.json.gz.b64';
  const byId=id=>document.getElementById(id);
  let index=null;
  const resultCache={smart:new Map(),compare:new Map()};
  const pending={smart:new Set(),compare:new Set()};
  let comparePairObserver=null;
  const normal=value=>String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const subjectKey=value=>normal(value).replace(/[^a-z0-9]/g,'');
  function allCourses(){return typeof COURSES!=='undefined'&&Array.isArray(COURSES)?COURSES:[];}
  function curriculumOf(course){const value=String(course?.curriculum||'').toLowerCase();return value==='viejo'||value==='nuevo'?value:'';}
  function linkedLab(course){
    if(!course||String(course.code).endsWith('L'))return null;
    const labCode=String(course.code)+'L';
    const name=subjectKey(course.name);
    const curriculum=curriculumOf(course);
    return allCourses().find(candidate=>
      candidate.code===labCode&&subjectKey(candidate.name)===name&&
      (!curriculum||!candidate.curriculum||curriculumOf(candidate)===curriculum)
    )||null;
  }
  function linkedTheory(course){
    if(!course||!String(course.code).endsWith('L'))return null;
    const theoryCode=String(course.code).slice(0,-1);
    const name=subjectKey(course.name);
    const curriculum=curriculumOf(course);
    return allCourses().find(candidate=>
      candidate.code===theoryCode&&subjectKey(candidate.name)===name&&
      (!curriculum||!candidate.curriculum||curriculumOf(candidate)===curriculum)
    )||null;
  }
  function courseSections(code,curriculum=''){
    const rows=allCourses().filter(course=>course.code===code&&
      (!curriculum||!course.curriculum||curriculumOf(course)===curriculum)&&
      Array.isArray(course.slots)&&course.slots.length);
    const available=rows.filter(course=>course.status!=='CERRADA');
    return available.length?available:rows;
  }
  function intervalsOverlap(a,b){
    const duration=typeof DUR!=='undefined'&&Number(DUR)>0?Number(DUR):50;
    const toMinutes=value=>{
      const raw=String(value??'');
      if(/^\\d{1,2}:\\d{2}$/.test(raw)){const [h,m]=raw.split(':').map(Number);return h*60+m;}
      if(/^\\d{3,4}$/.test(raw)){const t=raw.padStart(4,'0');return Number(t.slice(0,2))*60+Number(t.slice(2));}
      return NaN;
    };
    return (a?.slots||[]).some(left=>(b?.slots||[]).some(right=>{
      if(left.day!==right.day)return false;
      const x=toMinutes(left.start),y=toMinutes(right.start);
      return Number.isFinite(x)&&Number.isFinite(y)&&Math.max(x,y)<Math.min(x+duration,y+duration);
    }));
  }
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
    '@media(max-width:520px){.pensum-filter-panel{grid-template-columns:1fr;padding:9px}.pensum-filter-note{grid-column:auto}}',
    '.pensum-result-select{display:flex;align-items:flex-start;gap:9px;min-width:0;flex:1;cursor:pointer}',
    '.pensum-result-select input{flex:0 0 auto;width:16px;height:16px;margin:2px 0 0;accent-color:#315f9d;cursor:pointer}',
    '.pensum-result-select span{min-width:0;display:grid;gap:2px}',
    '.pensum-result-type{display:inline-block;margin-left:5px;padding:2px 5px;border-radius:5px;background:#eaf2ff;color:#245b9b;font-size:8px;font-weight:850;vertical-align:middle}',
    '.pensum-result-pair{display:block;margin-top:4px;color:#47704f;font-size:8px;line-height:1.35}',
    '.pensum-bulk-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px;padding:9px;border:1px solid #d9e4f0;border-radius:9px;background:#f4f8fd}',
    '.pensum-bulk-actions[hidden]{display:none!important}',
    '.pensum-bulk-count{color:#52627a;font-size:9px;font-weight:800}',
    '.pensum-bulk-buttons{display:flex;gap:6px;flex-wrap:wrap}',
    '.pensum-bulk-buttons button{padding:7px 10px;border:1px solid #315f9d;border-radius:7px;background:#315f9d;color:#fff;font-size:9px;font-weight:850;cursor:pointer}',
    '.pensum-bulk-buttons button.secondary{background:#fff;color:#315f9d}',
    '.pensum-bulk-buttons button:disabled{opacity:.45;cursor:default}',
    'body[data-theme="dark"] .pensum-result-type{background:#203b5e;color:#d7e7ff}',
    'body[data-theme="dark"] .pensum-result-pair{color:#9fcbad}',
    'body[data-theme="dark"] .pensum-bulk-actions{background:#111f32;border-color:#34465e}',
    'body[data-theme="dark"] .pensum-bulk-count{color:#b8c7da}',
    'body[data-theme="dark"] .pensum-bulk-buttons button.secondary{background:#18283d;color:#d7e7ff;border-color:#506782}',
    '@media(max-width:520px){.pensum-bulk-actions{align-items:flex-start;flex-direction:column}.pensum-bulk-buttons{width:100%}.pensum-bulk-buttons button{flex:1}}'
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
    note.textContent='Combina los filtros con la búsqueda por código o nombre. Solo aparecen materias con secciones publicadas en el catálogo actual de la DAE. El semestre indica su ubicación en el pensum; no garantiza que la materia se oferte en el período vigente.';
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

  function ensureBulkActions(mode,root){
    const id='pensumBulkActions-'+mode;
    let panel=byId(id);
    if(panel)return panel;
    panel=document.createElement('div');
    panel.className='pensum-bulk-actions';
    panel.id=id;
    panel.hidden=true;
    const count=document.createElement('span');
    count.className='pensum-bulk-count';
    count.dataset.pensumBulkCount=mode;
    const buttons=document.createElement('div');
    buttons.className='pensum-bulk-buttons';
    const selectAll=document.createElement('button');
    selectAll.type='button';
    selectAll.className='secondary';
    selectAll.dataset.pensumSelectAll=mode;
    selectAll.textContent='Seleccionar visibles';
    const clear=document.createElement('button');
    clear.type='button';
    clear.className='secondary';
    clear.dataset.pensumClear=mode;
    clear.textContent='Limpiar';
    const add=document.createElement('button');
    add.type='button';
    add.dataset.pensumAddAll=mode;
    add.textContent='Agregar seleccionadas';
    buttons.append(selectAll,clear,add);
    panel.append(count,buttons);
    root.insertAdjacentElement('afterend',panel);
    return panel;
  }
  function renderBulkActions(mode,groups){
    const root=byId(mode==='smart'?'smartSearchResults':'compareSearchResults');
    if(!root)return;
    const panel=ensureBulkActions(mode,root);
    const count=byId(panel.id).querySelector('[data-pensumBulkCount]');
    const add=panel.querySelector('[data-pensumAddAll]');
    const selected=[...pending[mode]];
    panel.hidden=selected.length===0&&groups.length===0;
    count.textContent=selected.length+' materia(s) seleccionada(s)';
    add.disabled=!selected.length;
    add.textContent='Agregar '+selected.length+' seleccionada(s)';
  }
  function getGroupForCode(code,state={}){
    const sections=activeCourses().filter(course=>course.code===code&&
      (!state.plan||!curriculumOf(course)||curriculumOf(course)===state.plan));
    if(!sections.length)return null;
    const course=sections[0];
    const rows=(entryMap.get(code)||[]).filter(row=>
      (!state.plan||row[1]===state.plan)&&(!state.school||row[2]===state.school)&&
      (!state.semester||Number(row[3])===Number(state.semester))&&
      (!state.track||row[4]===state.track)
    );
    return {code,name:course.name||code,sections,entries:rows,curriculum:state.plan||curriculumOf(course)};
  }
  function groupMetadata(group,state){
    const entry=group.entries?.[0];
    return {
      curriculum:state.plan||group.curriculum||'',
      school:state.school||(entry?entry[2]:''),
      track:state.track||(entry?entry[4]:'')
    };
  }
  function addSmart(code,state){
    const group=resultCache.smart.get(code)||getGroupForCode(code,state);
    if(!group||!window.UCSmartGenerator)return false;
    window.UCSmartGenerator.add(code,groupMetadata(group,state));
    return true;
  }
  function compareLabChoices(theoryChoices,labSections){
    if(!labSections.length)return [];
    return theoryChoices.map((theory,index)=>{
      const compatible=labSections.filter(lab=>!intervalsOverlap(theory,lab));
      const pool=compatible.length?compatible:labSections;
      return pool[index%pool.length];
    });
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
      if(linkedTheory(course))continue;
      const code=String(course.code);
      const searchable=normal(code+' '+(course.name||''));
      if(query&&!searchable.includes(query))continue;
      const matches=hasFilters?filterEntries(course,state):[];
      if(hasFilters&&!matches.length)continue;
      const sectionMatches=hasFilters?activeCourses().filter(section=>
        section.code===code&&(!state.plan||!curriculumOf(section)||curriculumOf(section)===state.plan)
      ):activeCourses().filter(section=>section.code===code);
      if(!groups.has(code))groups.set(code,{
        code,name:course.name||code,sections:sectionMatches,entries:matches,curriculum:curriculumOf(course)
      });
      const group=groups.get(code);
      matches.forEach(row=>{if(!group.entries.some(existing=>existing.join('|')===row.join('|')))group.entries.push(row);});
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
      renderBulkActions(mode,[]);
      return;
    }
    const groups=buildGroups(query,state);
    resultCache[mode]=new Map(groups.map(group=>[group.code,group]));
    if(!groups.length){
      renderEmpty(root,hasFilters?'No se encontraron materias con secciones publicadas que coincidan con esos filtros. Prueba otro semestre, escuela o pensum.':'No se encontraron materias con secciones publicadas que coincidan con la búsqueda.');
      renderBulkActions(mode,[]);
      return;
    }
    const fragment=document.createDocumentFragment();
    groups.slice(0,30).forEach(group=>{
      const row=document.createElement('div');
      row.className=smart?'smart-search-item pensum-search-result':'compare-search-result pensum-search-result';
      const label=document.createElement('label');
      label.className='pensum-result-select';
      const checkbox=document.createElement('input');
      checkbox.type='checkbox';
      checkbox.dataset.pensumSelect=mode;
      checkbox.value=group.code;
      const already=smart?selectedSmart(group.code):selectedCompare(group.code);
      checkbox.checked=pending[mode].has(group.code);
      checkbox.disabled=already;
      const info=document.createElement('span');
      const code=document.createElement('strong');
      code.textContent=group.code;
      const type=document.createElement('i');
      type.className='pensum-result-type';
      type.textContent='Teoría / materia';
      code.appendChild(type);
      const name=document.createElement('small');
      name.textContent=group.name;
      const meta=document.createElement('small');
      meta.className='pensum-result-meta';
      meta.textContent=entryDescription(group,state);
      info.append(code,name,meta);
      const lab=linkedLab(group.sections[0]);
      if(lab){
        const pair=document.createElement('small');
        pair.className='pensum-result-pair';
        pair.textContent='Incluye automáticamente laboratorio '+lab.code+' al agregar';
        info.appendChild(pair);
      }
      label.append(checkbox,info);
      const status=document.createElement('small');
      status.className='pensum-result-meta';
      status.textContent=already?'Ya agregada':'';
      row.append(label,status);
      fragment.appendChild(row);
    });
    root.replaceChildren(fragment);
    if(groups.length>30){
      const more=document.createElement('p');
      more.className='pensum-filter-note';
      more.textContent='Se muestran 30 de '+groups.length+' resultados. Escribe parte del código o nombre para precisar la búsqueda.';
      root.appendChild(more);
    }
    renderBulkActions(mode,groups);
  }

  function addCompareSingle(code,group,state){
    if(selectedCompare(code))return;
    if(!group||!group.sections.length)return;
    const metadata=groupMetadata(group,state);
    const sections=group.sections.filter(item=>
      !metadata.curriculum||!item.curriculum||curriculumOf(item)===metadata.curriculum
    );
    const pool=sections.length?sections:group.sections;
    const theoryChoices=[0,1,2].map(index=>pool[Math.min(index,pool.length-1)]);
    const choices=theoryChoices.map(item=>String(item.id));
    const entry={
      code,name:group.name,choices,
      curriculum:metadata.curriculum,
      school:metadata.school,
      track:metadata.track
    };
    const lab=linkedLab(pool[0]);
    if(lab){
      const labSections=courseSections(lab.code,metadata.curriculum);
      const labChoices=compareLabChoices(theoryChoices,labSections);
      entry.linkedLab=lab.code;
      compareSubjects.set(code,entry);
      if(labSections.length&&!compareSubjects.has(lab.code)){
        compareSubjects.set(lab.code,{
          code:lab.code,name:lab.name||lab.code,
          choices:labChoices.map(item=>String(item.id)),
          curriculum:metadata.curriculum,
          school:metadata.school,
          track:metadata.track,
          linkedTo:code,
          pairRole:'laboratorio'
        });
      }
    }else{
      compareSubjects.set(code,entry);
    }
  }

  function addSelected(mode){
    const codes=[...pending[mode]];
    if(!codes.length)return;
    const state=getState(controls[mode]);
    if(mode==='smart'){
      codes.forEach(code=>addSmart(code,state));
    }else{
      codes.forEach(code=>{
        const group=resultCache.compare.get(code)||getGroupForCode(code,state);
        addCompareSingle(code,group,state);
      });
      if(typeof persistCompare==='function')persistCompare();
      if(typeof renderCompareAll==='function')renderCompareAll();
      if(typeof renderCompareSearch==='function')renderCompareSearch();
      if(typeof showToast==='function')showToast(codes.length+' materia(s) agregada(s) a la comparación, con sus laboratorios vinculados cuando existen.');
    }
    pending[mode].clear();
    render(mode);
  }
  function reconcileComparePairs(){
    if(typeof compareSubjects==='undefined'||!compareSubjects)return;
    let changed=false;
    for(const [code,entry] of [...compareSubjects.entries()]){
      if(entry?.pairRole==='laboratorio'&&entry.linkedTo&&!compareSubjects.has(entry.linkedTo)){
        compareSubjects.delete(code);changed=true;continue;
      }
      if(entry?.linkedLab&&!compareSubjects.has(entry.linkedLab)){
        compareSubjects.delete(code);changed=true;
      }
    }
    if(changed){
      if(typeof persistCompare==='function')persistCompare();
      if(typeof renderCompareAll==='function')renderCompareAll();
    }
  }
  function upgradeExistingComparePairs(){
    if(typeof compareSubjects==='undefined'||!compareSubjects)return;
    let changed=false;
    for(const [code,entry] of [...compareSubjects.entries()]){
      if(!entry||entry.pairRole==='laboratorio'||entry.linkedLab)continue;
      const section=courseSections(code,entry.curriculum||'')[0];
      const lab=linkedLab(section);
      if(!lab)continue;
      const labs=courseSections(lab.code,entry.curriculum||'');
      if(!labs.length)continue;
      const theories=(entry.choices||[]).map(id=>allCourses().find(item=>String(item.id)===String(id))).filter(Boolean);
      const labChoices=compareLabChoices(theories,labs);
      compareSubjects.set(code,{...entry,linkedLab:lab.code});
      if(!compareSubjects.has(lab.code)){
        compareSubjects.set(lab.code,{
          code:lab.code,name:lab.name||lab.code,
          choices:labChoices.map(item=>String(item.id)),
          curriculum:entry.curriculum||'',
          school:entry.school||'',
          track:entry.track||'',
          linkedTo:code,pairRole:'laboratorio'
        });
      }
      changed=true;
    }
    if(changed&&typeof persistCompare==='function')persistCompare();
    if(changed&&typeof renderCompareAll==='function')renderCompareAll();
  }
  function attach(){
    controls.smart=installFilterPanel('smart');
    controls.compare=installFilterPanel('compare');
    if(!controls.smart||!controls.compare)return false;
    refreshFilterState(controls.smart);
    refreshFilterState(controls.compare);

    ensureBulkActions('smart',byId('smartSearchResults'));
    ensureBulkActions('compare',byId('compareSearchResults'));

    ['smart','compare'].forEach(mode=>{
      const root=byId(mode==='smart'?'smartSearchResults':'compareSearchResults');
      root.addEventListener('change',event=>{
        const checkbox=event.target.closest('[data-pensum-select]');
        if(!checkbox)return;
        const code=checkbox.value;
        if(checkbox.checked)pending[mode].add(code);
        else pending[mode].delete(code);
        render(mode);
      });
      const actions=byId('pensumBulkActions-'+mode);
      actions.addEventListener('click',event=>{
        const add=event.target.closest('[data-pensum-add-all]');
        if(add){addSelected(mode);return;}
        const clear=event.target.closest('[data-pensum-clear]');
        if(clear){pending[mode].clear();render(mode);return;}
        const selectAll=event.target.closest('[data-pensum-select-all]');
        if(selectAll){
          const state=getState(controls[mode]);
          buildGroups(normal(byId(mode==='smart'?'smartSearch':'compareSearch').value),state)
            .slice(0,30).forEach(group=>{
              const already=mode==='smart'?selectedSmart(group.code):selectedCompare(group.code);
              if(!already)pending[mode].add(group.code);
            });
          render(mode);
        }
      });
      byId(mode==='smart'?'smartSearch':'compareSearch').addEventListener('input',()=>render(mode));
    });

    byId('compareSearchResults').addEventListener('click',()=>render('compare'));
    byId('smartSelected')?.addEventListener('click',()=>render('smart'));

    upgradeExistingComparePairs();
    const compareRoot=byId('comparePanel')||byId('optionSchedules');
    if(compareRoot&&!comparePairObserver){
      comparePairObserver=new MutationObserver(()=>reconcileComparePairs());
      comparePairObserver.observe(compareRoot,{childList:true,subtree:true});
    }
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
  document.addEventListener('uc-catalog-updated',()=>{
    pending.smart.clear();pending.compare.clear();
    resultCache.smart.clear();resultCache.compare.clear();
    render('smart');render('compare');
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();