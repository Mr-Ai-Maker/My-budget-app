const CACHE_NAME = "mizaniyati-mrai-v11";

const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css?v=11",
  "./script.js?v=11",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// عند التثبيت: تخزين الملفات الأساسية للعمل دون إنترنت
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// عند التفعيل: حذف أي نسخ كاش قديمة
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// عند كل طلب: حاول الشبكة أولاً (لضمان أحدث تحديث)، وإن تعذر الاتصال استخدم الكاش
self.addEventListener("fetch", (event) => {
  // لا نتدخل في طلبات المكتبات الخارجية (CDN) لضمان عملها بشكل طبيعي
  if (event.request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, response.clone());
            return response;
          });
        })
        .catch(() => caches.match(event.request))
    );
  }
});
