// static/js/pwa.js

let deferredPrompt;
let installPwaButtonElement;

function beforeInstallPromptHandler(e) {
    // Tarayıcının varsayılan istemini engelle
    e.preventDefault();
    // `beforeinstallprompt` olayını daha sonra kullanmak üzere sakla
    deferredPrompt = e;
    // Yükleme butonunu göster
    if (installPwaButtonElement) {
        installPwaButtonElement.style.display = 'inline-flex'; // md-filled-button için uygun display
    }
}

async function installPwaButtonClickHandler() {
    if (deferredPrompt && installPwaButtonElement) {
        // Saklanan `beforeinstallprompt` olayını kullanarak yükleme istemini göster
        deferredPrompt.prompt();
        // Kullanıcının seçeneğini bekle (kabul etti veya reddetti)
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // İstemi kullandık, artık `deferredPrompt`'a ihtiyacımız yok
        deferredPrompt = null;
        // Butonu tekrar gizle (kullanıcı yüklese de yüklemese de)
        installPwaButtonElement.style.display = 'none';
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => { // Sayfa tamamen yüklendikten sonra kaydetmek iyi bir pratik
            navigator.serviceWorker.register('/sw.js') // Kök dizindeki sw.js
            .then((registration) => {
                console.log('ServiceWorker: Kayıt başarılı, kapsam:', registration.scope);
            })
            .catch((error) => {
                console.log('ServiceWorker: Kayıt başarısız:', error);
            });
        });
    }
}


export function initPwa(installBtn) {
    installPwaButtonElement = installBtn;

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);

    if (installPwaButtonElement) {
        installPwaButtonElement.addEventListener('click', installPwaButtonClickHandler);
    }

    registerServiceWorker();
}