// Exporta los horarios como imágenes de alta resolución.
(function(){
  const CDN='https://cdn.jsdelivr.net/npm/html-to-image@1.11.11/dist/html-to-image.min.js';
  let libraryPromise=null;
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
      script.onload=()=>window.htmlToImage?resolve(window.htmlToImage):reject(new Error('No se pudo inicializar el exportador de imágenes.'));
      script.onerror=()=>reject(new Error('No se pudo cargar el exportador. Comprueba tu conexión a Internet e inténtalo de nuevo.'));
      document.head.appendChild(script);
    });
    return libraryPromise;
  }
  function mimeSupported(mime){
    try{
      const canvas=document.createElement('canvas');
      const uri=canvas.toDataURL(mime);
      return uri.startsWith('data:'+mime+';');
    }catch(e){return false;}
  }
  function makeToolbar(kind){
    const wrap=document.createElement('div');
    wrap.className='image-export-toolbar';
    wrap.dataset.exportKind=kind;
    const select=document.createElement('select');
    select.className='image-export-format';
    select.setAttribute('aria-label','Formato de imagen');
    select.title='Formato de imagen';
    const formats=[
      {value:'image/png',label:'PNG · sin pérdida',ext:'png'},
      {value:'image/webp',label:'WebP · ligero',ext:'webp'},
      {value:'image/avif',label:'AVIF · compacto',ext:'avif'}
    ];
    formats.forEach(f=>{
      const option=document.createElement('option');
      option.value=f.value;option.textContent=f.label;
      if(f.value==='image/avif'&&!mimeSupported(f.value))option.disabled=true;
      select.appendChild(option);
    });
    try{
      const saved=localStorage.getItem('ucImageFormatV1');
      if(saved&&formats.some(f=>f.value===saved)&&mimeSupported(saved))select.value=saved;
    }catch(e){}
    select.addEventListener('change',()=>{
      try{localStorage.setItem('ucImageFormatV1',select.value);}catch(e){}
      document.querySelectorAll('.image-export-format').forEach(other=>{other.value=select.value;});
    });
    const button=document.createElement('button');
    button.type='button';button.className='btn primary image-export-button';
    button.textContent=kind==='individual'?'Guardar horario como imagen':'Guardar las 3 opciones como imagen';
    button.addEventListener('click',()=>exportImage(kind,select,button));
    wrap.append(select,button);
    return wrap;
  }
  function getTarget(kind){
    return byId(kind==='individual'?'schedulePanel':'comparePanel');
  }
  function filename(kind,mime){
    const date=new Date();
    const stamp=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('-');
    const ext=mime==='image/png'?'png':mime==='image/webp'?'webp':'avif';
    return (kind==='individual'?'horario-individual':'tres-opciones-horario')+'-'+stamp+'.'+ext;
  }
  async function exportImage(kind,select,button){
    const target=getTarget(kind);
    if(!target){notify('No se encontró el horario que deseas guardar.');return;}
    const mime=select.value;
    if(!mimeSupported(mime)){notify('Este navegador no admite ese formato. Selecciona PNG.');select.value='image/png';return;}
    const oldText=button.textContent;
    button.disabled=true;button.textContent='Generando imagen…';
    try{
      const htmlToImage=await getLibrary();
      const isDark=document.body.dataset.theme==='dark';
      const canvas=await htmlToImage.toCanvas(target,{
        pixelRatio:3,
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
        canvas.toBlob(result=>result?resolve(result):reject(new Error('El navegador no pudo generar la imagen.')),mime,0.96);
      });
      if(blob.type!==mime)throw new Error('El navegador no generó el formato solicitado. Selecciona PNG, que es compatible.');
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;link.download=filename(kind,mime);
      document.body.appendChild(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);
      const kb=Math.round(blob.size/1024);
      notify('Imagen guardada en '+mime.split('/')[1].toUpperCase()+' · '+kb+' KB.');
    }catch(error){
      console.error(error);
      notify(error&&error.message?error.message:'No se pudo generar la imagen. Inténtalo de nuevo.');
    }finally{
      button.disabled=false;button.textContent=oldText;
    }
  }
  function install(){
    const printButton=Array.from(document.querySelectorAll('button')).find(button=>/imprimir|guardar\s*(como\s*)?pdf/i.test(button.textContent||''));
    const individual=makeToolbar('individual');
    if(printButton)printButton.replaceWith(individual);
    else{
      const panel=byId('schedulePanel');
      const head=panel&&panel.querySelector('.panel-head');
      if(head)head.appendChild(individual);
    }
    const actions=document.querySelector('#comparePanel .compare-search-actions');
    if(actions)actions.appendChild(makeToolbar('comparison'));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
