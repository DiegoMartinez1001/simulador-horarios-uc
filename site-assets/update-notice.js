// Aviso de nuevas publicaciones de horarios de la DAE.
(function(){
  const CHECK_INTERVAL=5*60*1000;
  const MIN_CHECK_GAP=60*1000;
  let loadedVersion='';
  let lastCheck=0;
  let checking=false;
  let refreshing=false;
  let noticeMeta=null;
  let dismissedVersion='';

  const style=document.createElement('style');
  style.textContent=[
    '.catalog-update-notice{display:flex;align-items:center;justify-content:space-between;gap:16px;margin:0 0 18px;padding:14px 16px;border:1px solid #e4bd68;border-radius:12px;background:#fff8e8;color:#57451f;box-shadow:0 4px 14px rgba(80,60,20,.06)}',
    '.catalog-update-copy{display:flex;align-items:flex-start;gap:11px;min-width:0}',
    '.catalog-update-icon{display:grid;place-items:center;flex:0 0 34px;width:34px;height:34px;border-radius:10px;background:#ffedc2;font-size:18px}',
    '.catalog-update-title{display:block;margin:0 0 4px;font-size:13px;font-weight:850;color:#654b16}',
    '.catalog-update-message{display:block;font-size:11px;line-height:1.5;color:#725d35}',
    '.catalog-update-date{display:block;margin-top:4px;font-size:10px;color:#8a744b}',
    '.catalog-update-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}',
    '.catalog-update-reload{border:0;border-radius:8px;padding:10px 13px;background:#795817;color:#fff;font-size:11px;font-weight:850;cursor:pointer;white-space:nowrap}',
    '.catalog-update-reload:hover{background:#654812}',
    '.catalog-update-reload:disabled{opacity:.65;cursor:wait}',
    '.catalog-update-dismiss{width:30px;height:30px;border:0;border-radius:8px;background:transparent;color:#7d6a46;font-size:20px;line-height:1;cursor:pointer}',
    '.catalog-update-dismiss:hover{background:rgba(100,75,20,.09)}',
    '.catalog-update-notice[hidden]{display:none!important}',
    'body[data-theme="dark"] .catalog-update-notice{background:#352b19;border-color:#80642f;color:#f5e8c9;box-shadow:none}',
    'body[data-theme="dark"] .catalog-update-icon{background:#59431e}',
    'body[data-theme="dark"] .catalog-update-title{color:#ffe3a2}',
    'body[data-theme="dark"] .catalog-update-message{color:#ead7ae}',
    'body[data-theme="dark"] .catalog-update-date,body[data-theme="dark"] .catalog-update-dismiss{color:#d0b985}',
    'body[data-theme="dark"] .catalog-update-reload{background:#bd8c35;color:#1f1a10}',
    '@media(max-width:650px){.catalog-update-notice{align-items:stretch;flex-direction:column}.catalog-update-actions{justify-content:space-between}.catalog-update-reload{flex:1}.catalog-update-copy{gap:9px}}'
  ].join('\n');
  document.head.appendChild(style);

  const notice=document.createElement('section');
  notice.id='catalogUpdateNotice';
  notice.className='catalog-update-notice';
  notice.hidden=true;
  notice.setAttribute('role','status');
  notice.setAttribute('aria-live','polite');
  notice.innerHTML=
    '<div class="catalog-update-copy">'+
      '<span class="catalog-update-icon" aria-hidden="true">🔔</span>'+
      '<span>'+
        '<strong class="catalog-update-title">¡Se encontró una nueva actualización de la DAE!</strong>'+
        '<span class="catalog-update-message" id="catalogUpdateMessage">Hay nuevos horarios disponibles. Recarga los datos para consultar las secciones, profesores y aulas más recientes.</span>'+
        '<span class="catalog-update-date" id="catalogUpdateDate"></span>'+
      '</span>'+
    '</div>'+
    '<div class="catalog-update-actions">'+
      '<button type="button" class="catalog-update-reload" id="catalogUpdateReload">Recargar datos</button>'+
      '<button type="button" class="catalog-update-dismiss" id="catalogUpdateDismiss" aria-label="Cerrar aviso" title="Cerrar aviso">×</button>'+
    '</div>';
  const intro=document.querySelector('main > .intro');
  if(intro)intro.insertAdjacentElement('afterend',notice);

  const reloadButton=document.getElementById('catalogUpdateReload');
  const dismissButton=document.getElementById('catalogUpdateDismiss');

  function versionOf(meta){
    if(!meta)return '';
    return [meta.sha256||'',meta.updated_at||'',meta.generated_at||'',meta.sections||'',meta.slots||''].join('|');
  }
  async function readLatestMeta(){
    const response=await fetch('data/meta.json?version-check='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('No se pudo consultar la versión publicada.');
    const meta=await response.json();
    if(!meta||(meta.status&&meta.status!=='ok'))throw new Error('La información de versión no es válida.');
    return meta;
  }
  function showNotice(meta){
    const key=versionOf(meta);
    if(!key||key===loadedVersion||key===dismissedVersion)return;
    noticeMeta=meta;
    const term=meta.period?' del período '+meta.period:'';
    document.getElementById('catalogUpdateMessage').textContent='La DAE publicó nuevos horarios'+term+'. Recarga los datos para consultar las secciones, profesores y aulas más recientes.';
    const date=meta.updated_at||meta.generated_at||'Fecha no indicada';
    document.getElementById('catalogUpdateDate').textContent='Actualización publicada: '+date+(meta.sections?' · '+Number(meta.sections).toLocaleString('es-VE')+' secciones':'');
    notice.hidden=false;
  }
  async function checkForUpdates(){
    if(checking||document.visibilityState==='hidden'||Date.now()-lastCheck<MIN_CHECK_GAP)return;
    checking=true;
    lastCheck=Date.now();
    try{
      const meta=await readLatestMeta();
      const key=versionOf(meta);
      if(!loadedVersion)loadedVersion=key;
      else if(key!==loadedVersion)showNotice(meta);
    }catch(error){
      // Una falla temporal de red no debe interrumpir el uso del simulador.
    }finally{checking=false;}
  }
  function compareSelectionsChanged(before){
    return before.some(previous=>{
      const current=compareSubjects.get(previous.code);
      return !current||previous.choices.some((id,index)=>id!==current.choices[index]);
    });
  }
  // Intercepta cualquier recarga del catálogo, incluida la del botón original,
  // para sincronizar la versión conocida y refrescar los resultados calculados.
  const originalRefreshCatalog=window.refreshCatalog;
  if(typeof originalRefreshCatalog==='function'){
    window.refreshCatalog=async function(showMessage=true){
      const metaAtStart=await readLatestMeta().catch(()=>null);
      const baselineAtStart=versionOf(metaAtStart)||versionOf(noticeMeta)||loadedVersion;
      const previousSelected=[...selected.keys()];
      const previousCompare=[...compareSubjects.values()].map(item=>({code:item.code,choices:[...item.choices]}));

      const result=await originalRefreshCatalog(showMessage);
      if(typeof persist==='function')persist();
      if(typeof persistCompare==='function')persistCompare();

      loadedVersion=baselineAtStart;
      noticeMeta=null;
      dismissedVersion='';
      notice.hidden=true;
      document.dispatchEvent(new Event('uc-catalog-updated'));

      const removed=previousSelected.filter(id=>!COURSES.some(course=>course.id===id)).length;
      const adjustedCompare=compareSelectionsChanged(previousCompare);
      const unavailableSelected=Array.from(selected.values()).some(course=>course.status==='CERRADA'||!(course.slots||[]).length);
      const unavailableCompare=Array.from(compareSubjects.values()).some(item=>item.choices.some(id=>{
        const course=COURSES.find(candidate=>candidate.id===id);
        return !course||course.status==='CERRADA'||!(course.slots||[]).length;
      }));
      const warning=removed||adjustedCompare||unavailableSelected||unavailableCompare;

      if(warning){
        showToast('Catálogo actualizado. Algunas secciones cambiaron o dejaron de publicarse; revisa tu horario y las alternativas.');
      }else if(!showMessage){
        showToast('Catálogo actualizado en pantalla. Se conservaron tus selecciones.');
      }

      try{
        const latest=await readLatestMeta();
        if(versionOf(latest)!==loadedVersion)showNotice(latest);
      }catch(error){}
      return result;
    };
  }

  async function reloadCatalogFromNotice(){
    if(refreshing||!noticeMeta)return;
    refreshing=true;
    reloadButton.disabled=true;
    reloadButton.textContent='Actualizando…';
    try{
      await refreshCatalog(false);
    }catch(error){
      showToast(error&&error.message?error.message:'No fue posible recargar el catálogo. Inténtalo nuevamente.');
    }finally{
      refreshing=false;
      reloadButton.disabled=false;
      reloadButton.textContent='Recargar datos';
    }
  }

  reloadButton.addEventListener('click',reloadCatalogFromNotice);
  dismissButton.addEventListener('click',()=>{
    if(noticeMeta)dismissedVersion=versionOf(noticeMeta);
    noticeMeta=null;
    notice.hidden=true;
  });

  async function initialize(){
    try{loadedVersion=versionOf(await readLatestMeta());}catch(error){}
    lastCheck=Date.now();
    window.setInterval(checkForUpdates,CHECK_INTERVAL);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkForUpdates();});
    window.addEventListener('focus',checkForUpdates);
  }
  initialize();
})();