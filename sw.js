const CACHE_NAME = "ruta-idiomas-a1-v3";
const ESSENTIALS = [
  "./",
  "./index.html",
  "./shared/css/formador.css",
  "./engine/formador-engine.js",
  "./manifest.webmanifest",
  "./resources/frances-a1/",
  "./resources/frances-a1/index.html",
  "./resources/frances-a1/content.json",
  "./resources/frances-a1/manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(function (cache) {
    return cache.addAll(ESSENTIALS);
  }));
});

self.addEventListener("activate", function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key !== CACHE_NAME;
    }).map(function (key) {
      return caches.delete(key);
    }));
  }).then(function () {
    return self.clients.claim();
  }));
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("content.json")) {
    event.respondWith(fetch(event.request).then(function (response) {
      var copy = response.clone();
      caches.open(CACHE_NAME).then(function (cache) { cache.put(event.request, copy); });
      return response;
    }).catch(function () {
      return caches.match(event.request);
    }));
    return;
  }

  event.respondWith(caches.match(event.request).then(function (cached) {
    return cached || fetch(event.request);
  }));
});

