// static/js/fileUpload.js
import { gosterHataMesaji } from './ui.js';

// DOM Elemanları (initFileUpload içinde seçilecek)
let uploadForm;
let conversionTypeSelect;
let selectFileButton;
let fileInput;
let fileNameTextSpan; // ID="file-name-text" ile seçilecek
let convertButton;
let progressContainer;
let uploadProgress;
let progressText;
let resultContainer;
let downloadLink;

// Çeviri Metinleri ve Limitler için varsayılanlar
let translations = {
    dosyaSecilmedi: "No file selected", // Varsayılan (İngilizce)
    yukleniyor: "Loading...",
    isleniyor: "Processing...",
    hataOlustu: "An error occurred.",
    dosyaCokBuyukFormat: "File is too large. Maximum allowed size: {size}MB.",
    lutfenSecimYapin: "Please select a file and a conversion type."
};
let maxFileSizeMB = 50; // Varsayılan

// Bu fonksiyon, metinleri ve limiti global window.appTranslations objesinden (Flask/Jinja tarafından sağlanır)
// veya HTML elemanlarından (fallback olarak) alır.
function initializeTextsAndLimits() {
    if (window.appTranslations) {
        translations.dosyaSecilmedi = window.appTranslations.dosyaSecilmedi || translations.dosyaSecilmedi;
        translations.yukleniyor = window.appTranslations.yukleniyor || translations.yukleniyor;
        translations.isleniyor = window.appTranslations.isleniyor || translations.isleniyor;
        translations.hataOlustu = window.appTranslations.hataOlustu || translations.hataOlustu;
        translations.dosyaCokBuyukFormat = window.appTranslations.dosyaCokBuyukFormat || translations.dosyaCokBuyukFormat;
        translations.lutfenSecimYapin = window.appTranslations.lutfenSecimYapin || translations.lutfenSecimYapin;
        maxFileSizeMB = parseFloat(window.appTranslations.maxFileSizeMB) || maxFileSizeMB;
    } else {
        // Fallback: Eğer window.appTranslations yoksa, HTML'den okumaya çalış
        // fileNameTextSpan.textContent zaten initFileUpload'da ayarlanacak.
        console.warn("window.appTranslations bulunamadı. Metinler için fallback HTML değerleri veya varsayılanlar kullanılacak.");

        if (progressText && progressText.textContent) { // Yükleniyor... metni için
            const initialProgressText = progressText.textContent.split(' ')[0];
            if (initialProgressText) translations.yukleniyor = initialProgressText;
        }

        const fileSizeLimitEl = document.querySelector('.file-size-limit');
        if (fileSizeLimitEl) {
            const match = fileSizeLimitEl.textContent?.match(/(\d+(\.\d+)?|\d+)MB/i); // Büyük/küçük harf duyarsız ve ondalıksız sayıları da yakala
            if (match && (match[1] || match[2])) {
                maxFileSizeMB = parseFloat(match[1] || match[2]);
            }
        }
    }
}


function handleConversionTypeChange() {
    if (!conversionTypeSelect || !fileInput || !fileNameTextSpan || !convertButton) return;

    const selectedOption = conversionTypeSelect.selectedOptions?.[0];
    if (selectedOption) {
        fileInput.accept = selectedOption.dataset.inputAccept || '';
    }
    fileInput.value = ''; // Dosya seçimini sıfırla
    fileNameTextSpan.textContent = translations.dosyaSecilmedi;
    convertButton.disabled = true;
    if (resultContainer) resultContainer.style.display = 'none';
    localStorage.setItem('lastConversionType', conversionTypeSelect.value);
}

function handleFileInputChange() {
    if (!fileInput || !fileNameTextSpan || !convertButton) return;

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        fileNameTextSpan.textContent = file.name;

        const maxFileSizeBytes = maxFileSizeMB * 1024 * 1024;

        if (file.size > maxFileSizeBytes) {
            gosterHataMesaji(translations.dosyaCokBuyukFormat.replace('{size}', maxFileSizeMB.toString()));
            fileInput.value = '';
            fileNameTextSpan.textContent = translations.dosyaSecilmedi;
            convertButton.disabled = true;
            return;
        }
        convertButton.disabled = false;
        if (resultContainer) resultContainer.style.display = 'none';
    } else {
        fileNameTextSpan.textContent = translations.dosyaSecilmedi;
        convertButton.disabled = true;
    }
}

function handleUploadFormSubmit(event) {
    event.preventDefault();
    if (!fileInput || !conversionTypeSelect || !fileInput.files.length || !conversionTypeSelect.value) {
        gosterHataMesaji(translations.lutfenSecimYapin);
        return;
    }

    const formData = new FormData(uploadForm);

    if (progressContainer) progressContainer.style.display = 'flex';
    if (uploadProgress) {
        uploadProgress.value = 0;
        uploadProgress.indeterminate = false;
    }
    if (progressText) progressText.textContent = `${translations.yukleniyor} 0%`;
    if (convertButton) convertButton.disabled = true;
    if (resultContainer) resultContainer.style.display = 'none';

    const xhr = new XMLHttpRequest();
    const activeLang = localStorage.getItem('language') || 'en'; // Dil seçimi için varsayılan
    xhr.open('POST', `/${activeLang}/convert`, true);

    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total);
            if (uploadProgress) uploadProgress.value = percentComplete;
            if (progressText) progressText.textContent = `${translations.yukleniyor} ${Math.round(percentComplete * 100)}%`;
        }
    };

    xhr.onloadstart = () => { // Yükleme bitti, sunucu işliyor
        if (uploadProgress) {
            uploadProgress.value = 1; // Yükleme tamamlandı göster
            uploadProgress.indeterminate = true; // Sunucu işlerken belirsiz moda geç
        }
        if (progressText) progressText.textContent = translations.isleniyor;
    };

    xhr.onload = () => {
        if (progressContainer) progressContainer.style.display = 'none';
        if (uploadProgress) uploadProgress.indeterminate = false;
        if (convertButton) convertButton.disabled = false;

        if (xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    if (downloadLink && resultContainer) {
                        downloadLink.href = response.download_url;
                        
                        // YENİ: Tercihen sunucudan gelen dosya adını kullan (app.py'de eklendiyse)
                        const outputFilenameFromServer = response.download_filename;
                        // Fallback: Eğer sunucudan gelmezse, istemci tarafında oluştur
                        const fallbackFilename = `${fileInput.files[0].name.split('.').slice(0, -1).join('.')}_donusturuldu${conversionTypeSelect.selectedOptions?.[0]?.dataset.outputExtension || '.zip'}`;
                        
                        downloadLink.download = outputFilenameFromServer || fallbackFilename;
                        
                        resultContainer.style.display = 'block';
                    }
                } else {
                    gosterHataMesaji(response.error || translations.hataOlustu);
                }
            } catch (parseError) {
                console.error("JSON parse hatası:", parseError, "Gelen yanıt:", xhr.responseText);
                gosterHataMesaji(`${translations.hataOlustu} (Sunucudan geçersiz yanıt)`);
            }
        } else { // HTTP Hata Durumu
            try {
                const errorResponse = JSON.parse(xhr.responseText);
                gosterHataMesaji(errorResponse.error || `Hata ${xhr.status}: ${xhr.statusText}`);
            } catch (e) {
                gosterHataMesaji(`Hata ${xhr.status}: ${xhr.statusText}`);
            }
        }
    };

    xhr.onerror = () => { // Ağ hatası
        if (progressContainer) progressContainer.style.display = 'none';
        if (uploadProgress) uploadProgress.indeterminate = false;
        if (convertButton) convertButton.disabled = false;
        gosterHataMesaji("Ağ hatası oluştu. Lütfen bağlantınızı kontrol edin.");
    };

    xhr.send(formData);
}


export function initFileUpload() {
    // DOM Elemanlarını Seç
    uploadForm = document.getElementById('upload-form');
    conversionTypeSelect = document.getElementById('conversion-type');
    selectFileButton = document.getElementById('select-file-button');
    fileInput = document.getElementById('file-input');
    fileNameTextSpan = document.getElementById('file-name-text'); 
    convertButton = document.getElementById('convert-button');
    progressContainer = document.getElementById('progress-container');
    uploadProgress = document.getElementById('upload-progress');
    progressText = document.getElementById('progress-text');
    resultContainer = document.getElementById('result-container');
    downloadLink = document.getElementById('download-link');

    // Tüm elemanların varlığını kontrol et (opsiyonel ama iyi bir pratik)
    if (!uploadForm || !conversionTypeSelect || !selectFileButton || !fileInput || 
        !fileNameTextSpan || !convertButton || !progressContainer || !uploadProgress ||
        !progressText || !resultContainer || !downloadLink) {
        console.error("fileUpload.js: Gerekli DOM elemanlarından bazıları bulunamadı. Fonksiyonellik etkilenebilir.");
        // İsteğe bağlı olarak burada bir hata fırlatabilir veya kullanıcıya bir uyarı gösterebilirsiniz.
        // Şimdilik devam ediyoruz, null kontrolleri zaten fonksiyonlarda var.
    }
    
    initializeTextsAndLimits();

    // Başlangıçta fileNameTextSpan'ın içeriğini translations.dosyaSecilmedi ile ayarla
    if (fileNameTextSpan) {
        fileNameTextSpan.textContent = translations.dosyaSecilmedi;
    }

    if (selectFileButton && fileInput) {
        selectFileButton.addEventListener('click', () => {
            fileInput.click();
        });
    }

    if (conversionTypeSelect && fileInput && fileNameTextSpan && convertButton) {
        conversionTypeSelect.addEventListener('change', handleConversionTypeChange);

        // Başlangıçta kayıtlı dönüşüm tipini yükle
        const lastConversionType = localStorage.getItem('lastConversionType');
        if (lastConversionType && conversionTypeSelect.querySelector(`md-select-option[value="${lastConversionType}"]`)) {
            conversionTypeSelect.value = lastConversionType;
        }
        // Başlangıçta 'accept' özelliğini ve diğer durumları ayarla
        if (conversionTypeSelect.value) {
            handleConversionTypeChange(); // Mevcut seçime göre ayarla (input.accept vs.)
        } else if (conversionTypeSelect.options && conversionTypeSelect.options.length > 0) {
            // Eğer hiçbir şey seçili değilse ve seçenek varsa, ilkini seç ve ayarla
            // Dikkat: conversionTypeSelect.options bir HTMLCollection, doğrudan [0] ile erişim güvenli olmalı
            // ama querySelector ile kontrol etmek daha da garanti olabilir.
            const firstOption = conversionTypeSelect.querySelector('md-select-option');
            if (firstOption) {
                conversionTypeSelect.value = firstOption.value;
                handleConversionTypeChange();
            }
        }
    }

    if (fileInput && fileNameTextSpan && convertButton) {
        fileInput.addEventListener('change', handleFileInputChange);
    }

    if (uploadForm && fileInput && conversionTypeSelect) {
        uploadForm.addEventListener('submit', handleUploadFormSubmit);
    }
}