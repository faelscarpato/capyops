/* capyops Service Worker — v3 hardened
 * Objetivos:
 * - NÃO interceptar Supabase nem Mercado Livre nem /api (Pages Functions)
 * - Offline/Cache só para assets do app e navegação
 * - Evitar “Failed to fetch” em cascata causado por SW respondWith(fetch) em endpoints externos
 */

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `capyops-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `capyops-runtime-${CACHE_VERSION}`;

const OFFLINE_URL = '/';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Ajuste fino: quais tipos de arquivo vale cachear runtime (mesmo origin)
const RUNTIME_CACHEABLE = /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2|woff|ttf|eot|map)$/i;

// Helpers
function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiPath(url) {
  // Pages Functions /api/*
  return isSameOrigin(url) && url.pathname.startsWith('/api/');
}

function isSupabase(url) {
  return url.hostname.endsWith('.supabase.co');
}

function isMeli(url) {
  return (
    url.hostname.includes('mercadolibre') ||
    url.hostname.includes('mercadolivre') ||
    url.hostname.includes('meli')
  );
}

// Install: precache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: cleanup + claim
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - NÃO INTERCEPTAR: Supabase, Meli, /api, requests não-GET
// - navigate: network-first com fallback cache + offline
// - assets same-origin: cache-first (com populate runtime)
// - resto: passa reto (não mexe)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Só GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // ✅ NÃO interceptar endpoints sensíveis (deixa o browser lidar)
  if (isApiPath(url) || isSupabase(url) || isMeli(url)) {
    return;
  }

  // Navegação (HTML/doc): network-first
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          // Cachear cópia (opcional, ajuda em offline)
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, fresh.clone());
          return fresh;
        } catch (_) {
          // Tenta cache da navegação
          const cached = await caches.match(req);
          if (cached) return cached;
          // Fallback offline (shell)
          const offline = await caches.match(OFFLINE_URL);
          return offline || new Response('offline', { status: 504 });
        }
      })()
    );
    return;
  }

  // Assets do app (same-origin): cache-first
  if (isSameOrigin(url) && (RUNTIME_CACHEABLE.test(url.pathname) || url.pathname.startsWith('/assets/'))) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;

        try {
          const fresh = await fetch(req);
          // Só cacheia resposta OK e básica (evita problemas)
          if (fresh && fresh.ok && fresh.type === 'basic') {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(req, fresh.clone());
          }
          return fresh;
        } catch (_) {
          // Se asset não estiver em cache, devolve 504
          return new Response('offline', {
            status: 504,
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })()
    );
    return;
  }

  // Resto: não intercepta (evita surprises/opaque issues)
  return;
});

// Push notifications
self.addEventListener('push', (event) => {
  let payload = { title: 'CapyOps', body: 'Atualização disponível.', url: '/app' };

  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {
    // ignore parse failure
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { url: payload.url || '/app' },
    })
  );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/app';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const matched = clients.find((client) => client.url.includes('/app') && 'focus' in client);
      if (matched) return matched.focus();
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
      return undefined;
    })
  );
});

// Background sync hooks (noop, mas mantidos)
self.addEventListener('sync', (event) => {
  if (event.tag === 'capyops-sync') {
    event.waitUntil(Promise.resolve());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'capyops-periodic-sync') {
    event.waitUntil(Promise.resolve());
  }
});
