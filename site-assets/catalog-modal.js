// Catálogo de materias bajo demanda: libera espacio junto al horario individual.
(function () {
  'use strict';

  function initialize() {
    if (document.getElementById('scheduleCatalogDialog')) return;

    const search = document.getElementById('search');
    const scheduleBody = document.getElementById('scheduleBody');
    if (!search || !scheduleBody) return;

    const layout = search.closest('.layout') || document.querySelector('.layout');
    const schedulePanel = document.getElementById('schedulePanel') ||
      scheduleBody.closest('.panel') ||
      scheduleBody.closest('section');
    if (!layout || !schedulePanel) return;

    // Mueve el panel real, sin clonarlo: conserva filtros, resultados y listeners.
    const catalogPanel = Array.from(layout.children).find(child =>
      child !== schedulePanel && child.contains(search)
    ) || search.closest('.panel');

    if (!catalogPanel || catalogPanel === schedulePanel) {
      console.warn('[Catálogo] No se pudo localizar un panel independiente para la búsqueda.');
      return;
    }

    const header = schedulePanel.querySelector('.panel-head, .panel-header');
    if (!header) return;

    const style = document.createElement('style');
    style.textContent = [
      '.layout.schedule-layout-focus{grid-template-columns:minmax(0,1fr)!important}',
      '.schedule-catalog-trigger{flex:0 0 auto;margin-left:auto;min-height:40px;white-space:nowrap}',
      '.schedule-catalog-dialog{box-sizing:border-box;width:min(900px,calc(100vw - 28px));max-width:none;max-height:min(90vh,900px);max-height:min(90dvh,900px);padding:0;overflow:hidden;border:1px solid #d6e0ec;border-radius:16px;background:#fff;color:#26364c;box-shadow:0 24px 80px rgba(15,35,60,.28)}',
      '.schedule-catalog-dialog::backdrop{background:rgba(9,20,36,.58);backdrop-filter:blur(3px)}',
      '.schedule-catalog-frame{display:flex;flex-direction:column;width:100%;max-height:min(90vh,900px);max-height:min(90dvh,900px)}',
      '.schedule-catalog-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:0 0 auto;padding:13px 16px;border-bottom:1px solid #e5ebf3;background:#f7f9fc}',
      '.schedule-catalog-dialog-title{margin:0;color:#29486f;font-size:14px;font-weight:900}',
      '.schedule-catalog-dialog-subtitle{display:block;margin-top:3px;color:#718096;font-size:10px;line-height:1.4}',
      '.schedule-catalog-close{display:inline-grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border:1px solid #d3dce8;border-radius:9px;background:#fff;color:#405875;font-size:22px;line-height:1;cursor:pointer}',
      '.schedule-catalog-dialog-content{min-height:0;overflow:auto;padding:12px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}',
      '.schedule-catalog-dialog-content>.panel{width:100%!important;max-width:100%!important;margin:0!important;box-shadow:none!important}',
      '.schedule-catalog-dialog-content>.panel>.panel-head:first-child{padding-top:4px}',
      'body[data-theme="dark"] .schedule-catalog-dialog{background:#111f32;border-color:#3a4d66;color:#e6edf7}',
      'body[data-theme="dark"] .schedule-catalog-dialog-head{background:#17283f;border-color:#34465e}',
      'body[data-theme="dark"] .schedule-catalog-dialog-title{color:#e6efff}',
      'body[data-theme="dark"] .schedule-catalog-dialog-subtitle{color:#9cadc2}',
      'body[data-theme="dark"] .schedule-catalog-close{background:#20344f;border-color:#506782;color:#e6edf7}',
      '@media(max-width:760px){.schedule-catalog-dialog{width:calc(100vw - 16px);max-width:none;max-height:calc(100dvh - 16px - env(safe-area-inset-top));border-radius:13px}.schedule-catalog-frame{max-height:calc(100dvh - 16px - env(safe-area-inset-top))}.schedule-catalog-dialog-head{padding:11px 12px}.schedule-catalog-dialog-content{padding:8px}.schedule-catalog-trigger{min-height:42px;padding:9px 12px;font-size:11px}}',
      '@media(max-width:380px){.schedule-catalog-trigger{width:100%;margin-left:0}}'
    ].join('\n');
    document.head.appendChild(style);

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.id = 'openScheduleCatalog';
    trigger.className = 'btn primary schedule-catalog-trigger';
    trigger.textContent = '+ Agregar materia';
    trigger.setAttribute('aria-haspopup', 'dialog');
    trigger.setAttribute('aria-controls', 'scheduleCatalogDialog');
    header.appendChild(trigger);

    const dialog = document.createElement('dialog');
    dialog.id = 'scheduleCatalogDialog';
    dialog.className = 'schedule-catalog-dialog';
    dialog.setAttribute('aria-labelledby', 'scheduleCatalogDialogTitle');

    const frame = document.createElement('div');
    frame.className = 'schedule-catalog-frame';

    const dialogHeader = document.createElement('div');
    dialogHeader.className = 'schedule-catalog-dialog-head';
    const titleBlock = document.createElement('div');

    const title = document.createElement('h3');
    title.id = 'scheduleCatalogDialogTitle';
    title.className = 'schedule-catalog-dialog-title';
    title.textContent = 'Agregar materias al horario';

    const subtitle = document.createElement('span');
    subtitle.className = 'schedule-catalog-dialog-subtitle';
    subtitle.textContent = 'Busca por código o nombre y agrega las secciones que necesites.';
    titleBlock.append(title, subtitle);

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'schedule-catalog-close';
    close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar catálogo de materias');
    dialogHeader.append(titleBlock, close);

    const content = document.createElement('div');
    content.className = 'schedule-catalog-dialog-content';
    content.appendChild(catalogPanel);

    frame.append(dialogHeader, content);
    dialog.appendChild(frame);
    document.body.appendChild(dialog);

    layout.classList.add('schedule-layout-focus');

    function closeDialog() {
      if (typeof dialog.close === 'function' && dialog.open) dialog.close();
      else dialog.removeAttribute('open');
      trigger.focus();
    }

    trigger.addEventListener('click', () => {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
      window.setTimeout(() => {
        search.focus({ preventScroll: true });
        search.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 60);
    });

    close.addEventListener('click', closeDialog);
    dialog.addEventListener('click', event => {
      if (event.target === dialog) closeDialog();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();