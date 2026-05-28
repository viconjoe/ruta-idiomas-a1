const CACHE_NAME = "ruta-idiomas-a1-v1";
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
  }));
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(caches.match(event.request).then(function (cached) {
    return cached || fetch(event.request);
  }));
});
