/**
 * 吾家祠堂 · Service Worker
 *
 * 缓存策略：
 *   - precache: 静态资源（HTML/Logo/Manifest）
 *   - runtime cache：CSS/JS/字体 — Stale-While-Revalidate
 *   - 离线 fallback：所有页面 navigate 失败时返回 /offline
 *
 * 不缓存 Supabase API 与 Auth 接口（避免敏感数据）。
 */

const CACHE_PREFIX = 'wj-citang-';
const VERSION = 'v1';
const STATIC_CACHE = `${CACHE_PREFIX}static-${VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}runtime-${VERSION}`;

const PRECACHE_URLS = ['/offline', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => undefined)
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && ![STATIC_CACHE, RUNTIME_CACHE].includes(key))
            .map((stale) => caches.delete(stale))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理 same-origin GET
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  // 不缓存动态 API / Auth 请求
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.search.includes('supabase')
  ) {
    return;
  }

  // 导航请求：网络优先 → 失败 → cache → 失败 → /offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match('/offline'))
            .then((res) => res || new Response('Offline', { status: 503 }))
        )
    );
    return;
  }

  // 静态资源（_next/static、图片、字体）：cache 优先 + 后台刷新
  if (
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpg|jpeg|svg|webp|woff2?|css|js|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            if (response && response.status === 200) {
              const clone = response.clone();
              caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => cached);
        return cached || networkFetch;
      })
    );
  }
});
