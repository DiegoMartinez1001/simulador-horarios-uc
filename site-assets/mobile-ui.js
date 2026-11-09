// Mejora móvil: selector de día para tablas semanales.
(function () {
  'use strict';

  const TABLE_SELECTOR = 'table.schedule-table, table.option-table, table.smart-result-table';
  const DAY_CLASS = /^mobile-day-col-\d+$/;

  function enhanceTable(table) {
    if (!table || table.dataset.mobileDayEnhanced === 'true') return;

    const header = table.tHead && table.tHead.rows && table.tHead.rows[0];
    if (!header || header.cells.length < 3) return;

    const dayHeaders = Array.from(header.cells).slice(1);
    const nav = document.createElement('div');
    nav.className = 'mobile-day-nav';
    nav.setAttribute('role', 'group');
    nav.setAttribute('aria-label', 'Seleccionar día del horario');

    dayHeaders.forEach((cell, index) => {
      const button = document.createElement('button');
      const column = index + 2;
      button.type = 'button';
      button.textContent = (cell.textContent || '').trim().replace(/\s+/g, ' ') || ('Día ' + (index + 1));
      button.dataset.mobileDayColumn = String(column);
      button.setAttribute('aria-pressed', index === 0 ? 'true' : 'false');
      nav.appendChild(button);
    });

    function selectDay(column) {
      Array.from(table.classList).filter(name => DAY_CLASS.test(name)).forEach(name => table.classList.remove(name));
      table.classList.add('mobile-day-col-' + column);
      nav.querySelectorAll('button[data-mobile-day-column]').forEach(button => {
        button.setAttribute('aria-pressed', button.dataset.mobileDayColumn === String(column) ? 'true' : 'false');
      });
    }

    nav.addEventListener('click', event => {
      const button = event.target.closest('button[data-mobile-day-column]');
      if (!button) return;
      selectDay(Number(button.dataset.mobileDayColumn));
    });

    table.dataset.mobileDayEnhanced = 'true';
    selectDay(2);

    const wrapper = table.closest('.option-table-scroll, .smart-result-table-wrap, .schedule-table-wrap, .schedule-table-scroll');
    if (wrapper && wrapper.parentNode) wrapper.insertAdjacentElement('beforebegin', nav);
    else table.insertAdjacentElement('beforebegin', nav);
  }

  function scan(root) {
    if (!root) return;
    if (root.nodeType === 1 && root.matches && root.matches(TABLE_SELECTOR)) enhanceTable(root);
    if (root.querySelectorAll) root.querySelectorAll(TABLE_SELECTOR).forEach(enhanceTable);
  }

  function start() {
    scan(document);
    if (!document.body) return;
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) scan(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();