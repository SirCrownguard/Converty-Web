// sw.js (Projenizin KÖK DİZİNİNE yerleştirin)

const CACHE_NAME = 'converty-v1.1'; // Önbellek sürümünü güncel tutun (önemli değişikliklerde artırın)
const OFFLINE_URL = '/offline.html'; // Çevrimdışı durumunda gösterilecek sayfa

// Önbelleğe alınacak temel uygulama kabuğu ve statik varlıklar:
// Yolların uygulamanızdaki gerçek yollarla eşleştiğinden emin olun!
const ASSETS_TO_CACHE = [
  // Ana sayfalar (Flask dil yönlendirmesini hesaba katarak)
  // Her dil için ana URL'yi eklemek, ilk yüklemede daha hızlı çevrimdışı erişim sağlayabilir.
  '/en/',
  '/tr/',
  // '/' ana yolu da eklenebilir, ensure_lang_prefix yönlendirecektir.
  // Ancak spesifik dil yollarını önbelleğe almak daha garantili olabilir.

  // Çevrimdışı sayfası
  OFFLINE_URL,

  // CSS Dosyası
  '/static/css/style.css',

  // JS Dosyaları
  '/static/js/main.js',

  // İkonlar (manifest'te kullanılanlar)
  '/static/icons/icon-192x192.png',
  '/static/icons/icon-512x512.png',

  // CDN'den yüklenen Material Web Bileşenleri ve Fontları ÖNBELLEĞE ALMAK RİSKLİ OLABİLİR
  // ve genellikle tarayıcının kendi HTTP önbelleğine bırakılır.
  // Eğer kesinlikle önbelleğe almak istiyorsanız, CORS ve sürüm sorunlarına dikkat edin.
  // Şimdilik bunları dışarıda bırakmak daha güvenli.
  // 'https://esm.run/@material/web/all.js',
  // 'https://esm.run/@material/web/typography/md-typescale-styles.js',
  // 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
  // 'https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined',
];

// Service Worker Yükleme (Install) Olayı
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install Event: Caching app shell and static assets.');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // ÖNEMLİ: addAll, yollardan biri bile bulunamazsa başarısız olur.
        // Bu yüzden listedeki tüm yolların doğru ve erişilebilir olduğundan emin olun.
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .catch(error => {
        console.error('[ServiceWorker] Failed to cache assets during install event:', error);
      })
  );
});

// Service Worker Aktifleştirme (Activate) Olayı
// Genellikle eski önbellekleri temizlemek için kullanılır.
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate Event: Removing old caches.');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) { // Sadece bu SW sürümüne ait olmayan önbellekleri sil
          console.log('[ServiceWorker] Removing old cache:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  // Yeni Service Worker'ın sayfaları hemen kontrol etmesini sağla.
  return self.clients.claim();
});

// Fetch Olayı (Ağ İsteklerini Yakalama)
// Bu, uygulamanızın çevrimdışı çalışmasını sağlar.
self.addEventListener('fetch', (event) => {
  // Sadece GET isteklerini ve http/https şemalarını dikkate al.
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Strateji: Önce Ağdan Getirmeye Çalış (Network First), Başarısız Olursa Önbelleğe Bak.
  // Bu, dinamik içerik için daha uygundur, ama statik varlıklar için de çalışır.
  // Alternatif olarak, statik varlıklar için "Cache First" kullanılabilir.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Ağdan başarılı bir yanıt alındı.
        // İsteğe bağlı: Yanıtı önbelleğe al (özellikle sık değişmeyen statik varlıklar için).
        // Sadece 200 OK durumundaki yanıtları ve önbelleğe almak istediğimiz türdeki varlıkları önbelleğe alalım.
        if (networkResponse && networkResponse.status === 200 && ASSETS_TO_CACHE.includes(new URL(event.request.url).pathname)) {
          const responseToCache = networkResponse.clone(); // Yanıtı klonla, çünkü bir kez okunabilir.
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Ağ hatası oluştu (çevrimdışı olabilirsiniz). Önbelleğe bak.
        // console.log('[ServiceWorker] Network request failed, trying cache for:', event.request.url);
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse; // Önbellekten sun.
            }
            // Eğer istek bir sayfa navigasyonuysa ve önbellekte yoksa, çevrimdışı sayfasını göster.
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
            // Diğer türdeki istekler (resim, API vb.) için özel bir şey döndürmeyebiliriz
            // ya da uygun bir fallback sağlanabilir.
            return new Response("Kaynak bulunamadı ve çevrimdışısınız.", {
              status: 404,
              statusText: "Resource not found offline",
              headers: {'Content-Type': 'text/plain'}
            });
          });
      })
  );
});