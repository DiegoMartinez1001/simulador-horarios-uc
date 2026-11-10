/* Service worker: interfaz y último catálogo disponible sin conexión. */
'use strict';

const CACHE_NAME = 'uc-horarios-pwa-v7';
const APP_ROOT = new URL('./', self.registration.scope);
const CORE_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './pwa.js',
  './icons/app-192.png',
  './icons/app-512.png',
  './data/courses.json.gz.b64',
  './data/meta.json',
  './data/changes.json',
  './data/pensum-index.json.gz.b64',
  './data/pensum-quimica-nuevo.json'
];

const scopedUrl = path => new URL(path, APP_ROOT).href;
const isInScope = url => url.origin === self.location.origin &&
  url.pathname.startsWith(APP_ROOT.pathname);
const isCatalogData = url =>
  /\/data\/(courses\.json\.gz\.b64|meta\.json|changes\.json)$/.test(url.pathname);

function cacheKey(request) {
  const url = new URL(request.url);
  url.search = '';
  url.hash = '';
  return new Request(url.href, { method: 'GET', credentials: 'same-origin' });
}

async function fetchWithTimeout(request, milliseconds) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), milliseconds);
  try {
    return await fetch(new Request(request, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES.map(scopedUrl));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('uc-horarios-pwa-') && key !== CACHE_NAME)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (!isInScope(url)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const response = await fetchWithTimeout(request, 3500);
        if (response && response.ok) {
          await cache.put(cacheKey(request), response.clone());
          return response;
        }
      } catch (_) {}
      return (await cache.match(cacheKey(request))) ||
        (await cache.match(scopedUrl('./index.html'))) ||
        Response.error();
    })());
    return;
  }

  if (isCatalogData(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const key = cacheKey(request);
      const cached = await cache.match(key);
      try {
        const response = await fetchWithTimeout(request, 3500);
        if (response && response.ok) {
          await cache.put(key, response.clone());
          return response;
        }
        if (cached) return cached;
        return response;
      } catch (_) {
        if (cached) return cached;
        return new Response('No hay catálogo guardado en este dispositivo.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) await cache.put(cacheKey(request), response.clone());
      return response;
    } catch (_) {
      return Response.error();
    }
  })());
});
