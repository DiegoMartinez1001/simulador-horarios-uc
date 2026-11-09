// Instalación y registro offline del Simulador de Horarios UC.
(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    const register = () => {
      navigator.serviceWorker.register('./sw.js', { scope: './' })
        .then(registration => registration.update().catch(() => {}))
        .catch(error => console.warn('[Horarios UC] No se pudo activar el modo offline:', error));
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }

  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (standalone) return;

  const DISMISS_KEY = 'ucPwaInstallDismissedUntil';
  let dismissedUntil = 0;
  try { dismissedUntil = Number(localStorage.getItem(DISMISS_KEY) || 0); } catch (_) {}
  if (dismissedUntil > Date.now()) return;

  const style = document.createElement('style');
  style.textContent = [
    '.pwa-install-card{position:fixed;z-index:9998;right:16px;bottom:16px;width:min(340px,calc(100vw - 28px));box-sizing:border-box;padding:14px 15px;border:1px solid #d5e0ee;border-radius:14px;background:#fff;color:#243b56;box-shadow:0 12px 34px rgba(15,35,60,.2);font:13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}',
    '.pwa-install-head{display:flex;align-items:center;gap:9px;margin:0 26px 5px 0;font-size:13px;font-weight:800;color:#1b426d}',
    '.pwa-install-mark{display:grid;place-items:center;width:30px;height:30px;flex:0 0 30px;border-radius:9px;background:#e9f2fc;color:#245f98;font-weight:900}',
    '.pwa-install-copy{margin:0 0 10px;color:#60738a;font-size:11px}',
    '.pwa-install-actions{display:flex;gap:8px;align-items:center}',
    '.pwa-install-primary{border:0;border-radius:8px;padding:8px 12px;background:#245f98;color:#fff;font-size:11px;font-weight:800;cursor:pointer}',
    '.pwa-install-dismiss{position:absolute;right:9px;top:8px;width:26px;height:26px;border:0;border-radius:7px;background:transparent;color:#708198;font-size:18px;cursor:pointer}',
    '.pwa-install-help{margin:10px 0 0;padding:9px 10px;border-radius:8px;background:#f1f5fa;color:#445a72;font-size:11px;line-height:1.5}',
    'body[data-theme="dark"] .pwa-install-card{background:#17283d;border-color:#3a4f68;color:#e6edf6}',
    'body[data-theme="dark"] .pwa-install-head{color:#e8f1ff}',
    'body[data-theme="dark"] .pwa-install-copy{color:#aebdd0}',
    'body[data-theme="dark"] .pwa-install-help{background:#22364f;color:#d5e2f1}',
    '@media(max-width:520px){.pwa-install-card{right:10px;bottom:10px;width:calc(100vw - 20px)}}'
  ].join('\n');
  document.head.appendChild(style);

  const card = document.createElement('aside');
  card.className = 'pwa-install-card';
  card.setAttribute('aria-label', 'Instalar Simulador de Horarios UC');
  card.innerHTML =
    '<button class="pwa-install-dismiss" type="button" aria-label="Cerrar aviso">×</button>' +
    '<div class="pwa-install-head"><span class="pwa-install-mark">UC</span><span>Ten tu horario a mano</span></div>' +
    '<p class="pwa-install-copy">Instala el simulador en tu dispositivo y ábrelo desde la pantalla de inicio, como una aplicación.</p>' +
    '<div class="pwa-install-actions"><button class="pwa-install-primary" type="button">Cómo instalar</button></div>' +
    '<div class="pwa-install-help" hidden></div>';
  document.body.appendChild(card);

  const action = card.querySelector('.pwa-install-primary');
  const help = card.querySelector('.pwa-install-help');
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now() + 86400000)); } catch (_) {}
    card.remove();
  };
  card.querySelector('.pwa-install-dismiss').addEventListener('click', dismiss);

  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    action.textContent = 'Instalar aplicación';
    help.hidden = true;
  });

  action.addEventListener('click', async () => {
    if (installPrompt) {
      const promptEvent = installPrompt;
      installPrompt = null;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice && choice.outcome === 'accepted') card.remove();
      else action.textContent = 'Intentar instalar';
      return;
    }

    const ua = navigator.userAgent || '';
    let instructions;
    if (/iphone|ipad|ipod/i.test(ua)) {
      instructions = 'En Safari: toca el botón Compartir y elige «Añadir a pantalla de inicio». Luego confirma con «Añadir».';
    } else if (/android/i.test(ua)) {
      instructions = 'En Chrome: abre el menú ⋮ y selecciona «Instalar aplicación» o «Añadir a pantalla de inicio». En Samsung Internet: abre el menú ☰ y busca «Añadir página a» → «Pantalla de inicio».';
    } else {
      instructions = 'En Chrome o Edge: abre el menú del navegador y selecciona «Instalar Simulador de Horarios UC». También puede aparecer un icono de instalación junto a la barra de direcciones.';
    }
    help.textContent = instructions;
    help.hidden = !help.hidden;
  });

  window.addEventListener('appinstalled', () => card.remove());
  const updateConnectionMessage = () => {
    if (!navigator.onLine) {
      card.querySelector('.pwa-install-copy').textContent =
        'Estás sin conexión. El simulador puede utilizar el último catálogo guardado en este dispositivo.';
    }
  };
  updateConnectionMessage();
  window.addEventListener('offline', updateConnectionMessage);
  window.addEventListener('online', () => {
    card.querySelector('.pwa-install-copy').textContent =
      'Instala el simulador en tu dispositivo y ábrelo desde la pantalla de inicio, como una aplicación.';
  });
})();
