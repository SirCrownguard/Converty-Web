// static/js/main.js
import { initTheme } from './theme.js';
import { initLanguage } from './language.js';
import { initPwa } from './pwa.js';
import { initFileUpload } from './fileUpload.js';
import { initErrorDialog } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // Genel DOM Elemanları (Modüllere parametre olarak geçilecek olanlar)
    const body = document.body;
    const themeToggleButton = document.getElementById('theme-toggle');
    const mainThemeSelect = document.getElementById('main-theme-select');
    const languageSelect = document.getElementById('language-select');
    const installPwaButton = document.getElementById('install-pwa-button');
    const convertButton = document.getElementById('convert-button');
    const fileInput = document.getElementById('file-input');
    const conversionTypeSelect = document.getElementById('conversion-type-select');

    // --- ÇEVİRİ VE KONFİGÜRASYON YÜKLEME (ÖRNEK) ---
    // Bu kısım, Flask/Jinja2'den gelen verileri global `window.appTranslations` objesine
    // atadığınızı varsayar. Bu script, layout.html'de bu main.js'den ÖNCE gelmeli.
    // Örneğin, layout.html içinde:
    /*
    <script>
      window.appTranslations = {
        dosyaSecilmedi: "{{ _('Dosya seçilmedi') }}",
        yukleniyor: "{{ _('Yükleniyor...') }}",
        isleniyor: "{{ _('İşlem sürüyor...') }}",
        hataOlustu: "{{ _('Bir hata meydana geldi.') }}",
        dosyaCokBuyukFormat: "{{ _('Dosya çok büyük. İzin verilen en yüksek boyut: {size}MB.') }}",
        lutfenSecimYapin: "{{ _('Lütfen bir dosya ve dönüştürme tipi seçin.') }}",
        maxFileSizeMB: {{ config.MAX_CONTENT_LENGTH / (1024*1024) | round(1) }}
      };
    </script>
    <script type="module" src="{{ url_for('static', filename='js/main.js') }}"></script>
    */
    // `fileUpload.js` içindeki `initializeTextsAndLimits` fonksiyonu bu `window.appTranslations`'ı kullanacaktır.

    // Modül Başlatmaları
    initErrorDialog(); // Hata diyalogunu diğerlerinden önce veya en başlarda başlatmak iyi olabilir.
    initTheme(body, themeToggleButton, mainThemeSelect);
    initLanguage(languageSelect);
    initPwa(installPwaButton);
    initFileUpload(); // Bu fonksiyon, kendi DOM elemanlarını seçer ve olay dinleyicilerini ayarlar.

    console.log("Converty uygulaması başlatıldı ve tüm modüller yüklendi.");
});