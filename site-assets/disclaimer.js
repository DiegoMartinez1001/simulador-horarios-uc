// Aviso de independencia, alcance y fuente del Simulador de Horarios UC.
(function(){
  if(document.getElementById('ucAboutNotice'))return;
  const css=document.createElement('style');
  css.textContent=[
    '.uc-about-notice{margin:18px 0 12px;padding:15px 17px;border:1px solid var(--line,#d9e0e8);border-left:4px solid var(--accent,#426b9b);border-radius:12px;background:var(--panel,#fff);color:var(--text,#172033);font-size:11px;line-height:1.6}',
    '.uc-about-notice strong{font-size:12px}.uc-about-notice p{margin:5px 0;color:var(--muted,#667085)}',
    '.uc-about-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:9px}',
    '.uc-about-actions a,.uc-about-button{color:var(--accent,#315f91);font:inherit;font-weight:800;text-decoration:underline;text-underline-offset:2px}',
    '.uc-about-button{padding:0;border:0;background:transparent;cursor:pointer}',
    '.uc-about-dialog{position:fixed;inset:0;z-index:11000;display:grid;place-items:center;padding:16px;background:rgba(12,20,34,.6)}',
    '.uc-about-dialog[hidden]{display:none!important}',
    '.uc-about-card{width:min(590px,100%);max-height:85vh;overflow:auto;padding:20px;border:1px solid var(--line,#d9e0e8);border-radius:16px;background:var(--panel,#fff);color:var(--text,#172033);box-shadow:0 24px 80px rgba(0,0,0,.25)}',
    '.uc-about-card h2{margin:0 0 12px;font-size:17px}.uc-about-card p{font-size:12px;line-height:1.65;color:var(--muted,#667085)}',
    '.uc-about-card a{color:var(--accent,#315f91);overflow-wrap:anywhere}',
    '.uc-about-close{float:right;width:32px;height:32px;border:0;border-radius:8px;background:var(--soft,#f5f7fa);color:var(--text,#172033);font-size:21px;cursor:pointer}',
    '@media(max-width:600px){.uc-about-notice{font-size:10px}.uc-about-actions{gap:9px}}'
  ].join('\n');
  document.head.appendChild(css);
  const notice=document.createElement('section');
  notice.className='uc-about-notice';
  notice.id='ucAboutNotice';
  notice.innerHTML='<strong>Proyecto independiente</strong><p>Herramienta informativa para apoyar la planificación académica. No es una plataforma oficial ni está administrada o respaldada por la Universidad de Carabobo o la DAE. Verifica siempre los horarios y condiciones de inscripción en los canales oficiales.</p><div class="uc-about-actions"><button type="button" class="uc-about-button" id="ucAboutOpen">Acerca del simulador</button><a href="https://dae.ing.uc.edu.ve/horarios/" target="_blank" rel="noopener noreferrer">Consultar fuente oficial de horarios ↗</a></div>';
  const main=document.querySelector('main');
  const footer=document.querySelector('footer');
  if(footer)footer.insertAdjacentElement('beforebegin',notice);
  else if(main)main.appendChild(notice);
  else document.body.appendChild(notice);
  const dialog=document.createElement('div');
  dialog.className='uc-about-dialog';
  dialog.id='ucAboutDialog';
  dialog.hidden=true;
  dialog.innerHTML='<section class="uc-about-card" role="dialog" aria-modal="true" aria-labelledby="ucAboutTitle"><button type="button" class="uc-about-close" id="ucAboutClose" aria-label="Cerrar">×</button><h2 id="ucAboutTitle">Acerca del Simulador de Horarios UC</h2><p>El Simulador de Horarios UC es un proyecto independiente, desarrollado con fines informativos y de apoyo a la planificación académica de los estudiantes de Ingeniería de la Universidad de Carabobo.</p><p>Esta herramienta no es una plataforma oficial de la Universidad de Carabobo ni está administrada, respaldada o afiliada institucionalmente a la Dirección de Asuntos Estudiantiles (DAE).</p><p>La información de horarios se obtiene de las publicaciones disponibles de la DAE y se presenta con fines de consulta. Los datos pueden cambiar, por lo que se recomienda verificar siempre la información y las condiciones de inscripción en los canales oficiales de la Universidad.</p><p><strong>Fuente oficial de horarios:</strong><br><a href="https://dae.ing.uc.edu.ve/horarios/" target="_blank" rel="noopener noreferrer">https://dae.ing.uc.edu.ve/horarios/</a></p><p>Las materias, secciones, profesores, aulas y horarios se muestran según la información disponible al momento de la última actualización del catálogo.</p></section>';
  document.body.appendChild(dialog);
  const open=document.getElementById('ucAboutOpen');
  const close=document.getElementById('ucAboutClose');
  function show(){dialog.hidden=false;document.body.style.overflow='hidden';close.focus();}
  function hide(){dialog.hidden=true;document.body.style.overflow='';open.focus();}
  open.addEventListener('click',show);
  close.addEventListener('click',hide);
  dialog.addEventListener('click',event=>{if(event.target===dialog)hide();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!dialog.hidden)hide();});
})();