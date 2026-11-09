// Exporta el horario como PNG de alta resolución.
(function(){
  const CDN='https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js';
  let libraryPromise=null;
  const MIME='image/png';

  function byId(id){return document.getElementById(id);}
  function notify(message){
    if(typeof showToast==='function')showToast(message);
    else console.info('[Horario UC]',message);
  }
  function getLibrary(){
    if(window.htmlToImage)return Promise.resolve(window.htmlToImage);
    if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src=CDN;script.async=true;
      script.onload=()=>window.htmlToImage
        ?resolve(window.htmlToImage)
        :reject(new Error('No se pudo inicializar el exportador de imágenes.'));
      script.onerror=()=>reject(new Error('No se pudo cargar el exportador. Comprueba tu conexión a Internet e inténtalo de nuevo.'));
      document.head.appendChild(script);
    });
    return libraryPromise;
  }

  function getIndividualTarget(){
    const tbody=byId('scheduleBody');
    if(!tbody)return null;
    const table=tbody.closest('table');
    if(!table)return tbody;

    // Busca el contenedor del panel que contiene tanto el título como la cuadrícula.
    const panel=table.closest('.panel');
    if(panel)return panel;

    // Respaldo: localiza el ancestro que incluya el encabezado del horario y su tabla.
    let node=table;
    let best=table;
    for(let depth=0;depth<8&&node&&node.parentElement;depth++){
      node=node.parentElement;
      if(node.querySelector&&node.querySelector('#scheduleBody')){
        best=node;
        if(node.querySelector('.panel-head'))return node;
      }
    }
    return best;
  }

  function getTarget(kind){
    return kind==='individual'?getIndividualTarget():byId('comparePanel');
  }

  function makeToolbar(kind){
    const wrap=document.createElement('div');
    wrap.className='image-export-toolbar';
    wrap.dataset.exportKind=kind;

    const button=document.createElement('button');
    button.type='button';
    button.className='btn primary image-export-button';
    button.textContent=kind==='individual'
      ?'Guardar horario como PNG'
      :'Guardar las 3 opciones como PNG';
    button.addEventListener('click',()=>exportImage(kind,button));
    wrap.appendChild(button);
    return wrap;
  }

  function filename(kind){
    const date=new Date();
    const stamp=[
      date.getFullYear(),
      String(date.getMonth()+1).padStart(2,'0'),
      String(date.getDate()).padStart(2,'0')
    ].join('-');
    return (kind==='individual'?'horario-individual':'tres-opciones-horario')+'-'+stamp+'.png';
  }

  async function exportImage(kind,button){
    const target=getTarget(kind);
    if(!target){
      notify(kind==='individual'
        ?'No se encontró la cuadrícula del horario individual. Recarga la página y vuelve a intentarlo.'
        :'No se encontró la comparación de tres opciones. Recarga la página y vuelve a intentarlo.');
      return;
    }

    const oldText=button.textContent;
    const mobileTableState=Array.from(target.querySelectorAll('table[data-mobile-day-enhanced="true"]')).map(table=>({
      table,
      classes:Array.from(table.classList).filter(name=>/^mobile-day-col-\\d+$/.test(name))
    }));
    const hadFullWeekClass=document.body.classList.contains('uc-export-full-week');
    document.body.classList.add('uc-export-full-week');
    mobileTableState.forEach(state=>state.classes.forEach(name=>state.table.classList.remove(name)));
    button.disabled=true;
    button.textContent='Generando PNG…';

    try{
      const htmlToImage=await getLibrary();
      const isDark=document.body.dataset.theme==='dark';
      const pixelRatio=Math.min(3,Math.max(2,window.devicePixelRatio||2));
      const canvas=await htmlToImage.toCanvas(target,{
        pixelRatio,
        backgroundColor:isDark?'#0c1626':'#ffffff',
        cacheBust:true,
        skipAutoScale:false,
        filter(node){
          if(node===target)return true;
          if(node.nodeType!==1)return true;
          return !node.matches(
            'button, select, input, .image-export-toolbar, .compare-controls, .option-actions, .search-wrap, .filters'
          );
        },
        style:{transform:'none',transformOrigin:'top left'}
      });

      const blob=await new Promise((resolve,reject)=>{
        canvas.toBlob(result=>result
          ?resolve(result)
          :reject(new Error('El navegador no pudo generar el PNG.')),MIME);
      });
      if(blob.type!=='image/png')throw new Error('No se pudo generar el archivo PNG.');

      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download=filename(kind);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);

      notify('PNG guardado correctamente · '+Math.round(blob.size/1024)+' KB.');
    }catch(error){
      console.error(error);
      notify(error&&error.message?error.message:'No se pudo generar el PNG. Inténtalo de nuevo.');
    }finally{
      mobileTableState.forEach(state=>state.classes.forEach(name=>state.table.classList.add(name)));
      if(!hadFullWeekClass)document.body.classList.remove('uc-export-full-week');
      button.disabled=false;
      button.textContent=oldText;
    }
  }

  function install(){
    const oldButton=Array.from(document.querySelectorAll('button'))
      .find(button=>/imprimir|guardar\s*(como\s*)?pdf|guardar horario como imagen/i.test(button.textContent||''));
    const individual=makeToolbar('individual');

    if(oldButton){
      oldButton.replaceWith(individual);
    }else{
      const target=getIndividualTarget();
      const head=target&&target.querySelector('.panel-head');
      if(head)head.appendChild(individual);
    }

    const actions=document.querySelector('#comparePanel .compare-search-actions');
    if(actions)actions.appendChild(makeToolbar('comparison'));
  }

  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',install,{once:true});
  else
    install();
})();
