// static/js/language.js

let languageSelectElement;

function syncLanguageSelectWithPath() {
    if (!languageSelectElement) return;

    const pathLang = window.location.pathname.split('/')[1];
    const supportedLangs = Array.from(languageSelectElement.options).map(op => op.value);

    if (supportedLangs.includes(pathLang)) {
        // URL'deki dil geçerli ve destekleniyorsa, localStorage'ı ve select'i güncelle
        localStorage.setItem('language', pathLang);
        if (languageSelectElement.value !== pathLang) {
            languageSelectElement.value = pathLang;
        }
    } else {
        // URL'de geçerli dil yoksa (veya kök path'deyse), localStorage'daki dili kullan
        // Flask zaten bu durumda doğru dile yönlendirmiş olmalı.
        // Bu kısım, sayfa doğrudan (Flask yönlendirmesi olmadan) açılırsa diye bir güvence.
        const storedLang = localStorage.getItem('language');
        if (storedLang && languageSelectElement.value !== storedLang && supportedLangs.includes(storedLang)) {
            // Normalde Flask'ın yönlendirmesi gerekir, bu satır nadiren çalışır.
            // languageSelectElement.value = storedLang;
        }
    }
}

function handleLanguageSelectChange(event) {
    const selectedLang = event.target.value;
    // Önceki kod: window.location.pathname.substring(3)
    // Bu, '/en' veya '/tr' gibi bir şey varsa çalışır, ama sadece '/' varsa sorun çıkarır.
    // Daha güvenli bir yol:
    const pathSegments = window.location.pathname.split('/');
    // pathSegments[0] = "" (ilk / nedeniyle)
    // pathSegments[1] = lang_code or "" (eğer kök path ise)
    // pathSegments[2+] = geri kalan path
    
    let newPathWithoutLang = "/"; // Varsayılan olarak kök dizin
    if (pathSegments.length > 2) { // /lang/something/...
        newPathWithoutLang = "/" + pathSegments.slice(2).join('/');
    } else if (pathSegments.length === 2 && pathSegments[1] !== "" && !Array.from(languageSelectElement.options).map(op => op.value).includes(pathSegments[1])) {
        // Eğer /someNonLangPath ise, bunu koru
        newPathWithoutLang = "/" + pathSegments[1];
    }


    // Eğer path sadece '/' veya '/en/' veya '/tr/' gibi ise newPathWithoutLang sadece '/' olur.
    // Bu durumda, window.location.pathname = `/${selectedLang}/` olmalı.
    // Eğer /en/settings gibi bir path ise, /tr/settings olmalı.
    if (newPathWithoutLang === "/" && (window.location.pathname.endsWith('/') || window.location.pathname.split('/').length <=2) ) {
         window.location.pathname = `/${selectedLang}/`;
    } else {
         window.location.pathname = `/${selectedLang}${newPathWithoutLang.startsWith('/') ? '' : '/'}${newPathWithoutLang}`.replace('//', '/');
    }
}

export function initLanguage(langSelect) {
    languageSelectElement = langSelect;

    if (languageSelectElement) {
        syncLanguageSelectWithPath(); // Başlangıçta select'i URL/localStorage ile senkronize et
        languageSelectElement.addEventListener('change', handleLanguageSelectChange);
    }
}