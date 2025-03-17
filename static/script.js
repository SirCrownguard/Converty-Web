"use strict";

// Check for stored theme preference; if present, apply it. Otherwise, use system preference.
let storedTheme = sessionStorage.getItem("selectedTheme");
if (storedTheme) {
  document.body.classList.remove("light-theme", "dark-theme");
  document.body.classList.add(storedTheme);
} else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
  document.body.classList.remove("light-theme");
  document.body.classList.add("dark-theme");
} else {
  document.body.classList.remove("dark-theme");
  document.body.classList.add("light-theme");
}

// Update theme icon based on current theme
function updateThemeIcon() {
  const themeIcon = document.getElementById("themeIcon");
  if (document.body.classList.contains("light-theme")) {
    // Light theme aktifse, dark_mode ikonu göster (geçiş için)
    themeIcon.textContent = "dark_mode";
  } else {
    // Dark theme aktifse, light_mode ikonu göster
    themeIcon.textContent = "light_mode";
  }
}
updateThemeIcon();

// Global değişkenler
let uploadedFiles = []; // Her dosya: {file_id, original_name, safeName, size}
let conversionIntervals = {}; // Her dosyanın ilerleme barı için interval saklanıyor.
let conversionComplete = false;
let downloadTriggered = false;
let downloadUrl = "";
let conversionType = "pdf_to_pptx";
let convertState = 1; // 1: deaktif, 2: aktif, 3: dönüştürülüyor, 4: indir, 5: indirme geri sayımı

// Dil verileri
let currentLang = "en";
const langData = {
  tr: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadButton: "Dosya yükleyiniz.",
    uploadText: "PDF dosyanızı sürükleyin veya seçin",
    uploadSubtext: "Maksimum dosya boyutu: 100MB",
    noFileAlert: "Lütfen geçerli dosya seçiniz.",
    convertBtn: "Dönüştür",
    readyConvert: "Dönüştürmeye Hazır",
    convertingText: "Dönüştürülüyor...",
    downloadBtn: "İndir",
    downloadCountdown: "İndirme",
    seconds: "saniye",
    resultThankYou: "Converty'yi tercih ettiğiniz için teşekkür ederiz!",
    resultConversionComplete: "Dönüştürme işleminiz tamamlandı.",
    resultDownloadInstruction: "Eğer indirme başlamadıysa <span class='link' id='downloadLink'>buraya</span> tıklayın.",
    resultConvertAgain: "Yeniden dönüştür"
    ,resultRedirecting: "Ana sayfaya yönlendiriliyorsunuz, {count} saniye kaldı...",
    zipNotFoundError: "ZIP dosya adı alınamadı:"
  },
  en: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadButton: "Upload a file.",
    uploadText: "Drag or select your PDF file",
    uploadSubtext: "Maximum file size: 100MB",
    noFileAlert: "Please select a valid file.",
    convertBtn: "Convert",
    readyConvert: "Ready to convert",
    convertingText: "Converting...",
    downloadBtn: "Download",
    downloadCountdown: "Download",
    seconds: "seconds",
    resultThankYou: "Thank you for choosing Converty!",
    resultConversionComplete: "Your conversion is complete.",
    resultDownloadInstruction: "If the download hasn't started, click <span class='link' id='downloadLink'>here</span>.",
    resultConvertAgain: "Convert again",
    resultRedirecting: "Redirecting to homepage in {count} second(s)...",
    zipNotFoundError: "ZIP file name could not be retrieved:"
  },
  zh: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadButton: "请上传文件。",
    uploadText: "拖放或选择您的PDF文件",
    uploadSubtext: "最大文件大小: 100MB",
    noFileAlert: "请选择有效的文件。",
    convertBtn: "转换",
    readyConvert: "准备转换",
    convertingText: "转换中...",
    downloadBtn: "下载",
    downloadCountdown: "下载",
    seconds: "秒",
    resultThankYou: "感谢您选择 Converty！",
    resultConversionComplete: "转换已完成。",
    resultDownloadInstruction: "如果下载未开始，请点击 <span class='link' id='downloadLink'>这里</span>。",
    resultConvertAgain: "重新转换",
    resultRedirecting: "将在 {count} 秒后跳转到主页...",
    zipNotFoundError: "无法获取 ZIP 文件名:"
  },
  es: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadButton: "Suba un archivo.",
    uploadText: "Arrastra o selecciona tu archivo PDF",
    uploadSubtext: "Tamaño máximo: 100MB",
    noFileAlert: "Por favor, selecciona un archivo válido.",
    convertBtn: "Convertir",
    readyConvert: "Listo para convertir",
    convertingText: "Convirtiendo...",
    downloadBtn: "Descargar",
    downloadCountdown: "Descarga",
    seconds: "segundos",
    resultThankYou: "¡Gracias por elegir Converty!",
    resultConversionComplete: "La conversión ha finalizado.",
    resultDownloadInstruction: "Si la descarga no ha comenzado, haz clic <span class='link' id='downloadLink'>aquí</span>.",
    resultConvertAgain: "Convertir de nuevo",
    resultRedirecting: "Redirigiendo a la página de inicio en {count} segundo(s)...",
    zipNotFoundError: "No se pudo obtener el nombre del archivo ZIP:"
  },
  pt: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadButton: "Carregue um arquivo.",
    uploadText: "Arraste ou selecione seu arquivo PDF",
    uploadSubtext: "Tamanho máximo: 100MB",
    noFileAlert: "Por favor, selecione um arquivo válido.",
    convertBtn: "Converter",
    readyConvert: "Pronto para converter",
    convertingText: "Convertendo...",
    downloadBtn: "Baixar",
    downloadCountdown: "Baixar",
    seconds: "segundos",
    resultThankYou: "Obrigado por escolher o Converty!",
    resultConversionComplete: "Sua conversão foi concluída.",
    resultDownloadInstruction: "Se o download não começou, clique <span class='link' id='downloadLink'>aqui</span>.",
    resultConvertAgain: "Converter novamente",
    resultRedirecting: "Redirecionando para a página inicial em {count} segundo(s)...",
    zipNotFoundError: "Não foi possível obter o nome do arquivo ZIP:"
  },
  hi: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadButton: "एक फ़ाइल अपलोड करें。",
    uploadText: "अपनी PDF फ़ाइल खींचें या चुनें",
    uploadSubtext: "अधिकतम फ़ाइल आकार: 100MB",
    noFileAlert: "कृपया एक वैध फ़ाइल चुनें।",
    convertBtn: "परिवर्तन",
    readyConvert: "परिवर्तन के लिए तैयार",
    convertingText: "परिवर्तन हो रहा है...",
    downloadBtn: "डाउनलोड",
    downloadCountdown: "डाउनलोड",
    seconds: "सेकंड",
    resultThankYou: "Converty चुनने के लिए धन्यवाद!",
    resultConversionComplete: "आपका रूपांतरण पूरा हो गया है।",
    resultDownloadInstruction: "यदि डाउनलोड शुरू नहीं हुआ है, तो <span class='link' id='downloadLink'>यहाँ</span> क्लिक करें।",
    resultConvertAgain: "फिर से रूपांतरण करें",
    resultRedirecting: "होमपेज पर {count} सेकंड में रीडायरेक्ट हो रहा है...",
    zipNotFoundError: "ZIP फ़ाइल का नाम प्राप्त नहीं किया जा सका:"
  }
};

// Dil seçimi
if (sessionStorage.getItem("selectedLanguage") && langData[sessionStorage.getItem("selectedLanguage")]) {
  currentLang = sessionStorage.getItem("selectedLanguage");
} else {
  const userLang = navigator.language.slice(0, 2);
  if (langData[userLang]) {
    currentLang = userLang;
  }
}

// UI güncelleme fonksiyonları
function updateLanguage(lang) {
  currentLang = lang;
  document.getElementById("tabPdfToPptx").textContent = langData[lang].tabPdfToPptx;
  document.getElementById("tabPptxToPdf").textContent = langData[lang].tabPptxToPdf;
  document.getElementById("uploadText").textContent = langData[lang].uploadText;
  document.getElementById("uploadSubtext").textContent = langData[lang].uploadSubtext;
  if (convertState !== 3 && convertState !== 5) {
    if (!conversionComplete) {
      updateConvertButton(2);
    } else {
      updateConvertButton(4);
    }
  }
  updateResultPageText();
}

function updateResultPageText() {
  let h1 = document.querySelector(".result-container h1");
  if (h1) {
    h1.innerHTML = langData[currentLang].resultThankYou;
  }
  let message = document.querySelector(".result-container .message");
  if (message) {
    message.textContent = langData[currentLang].resultConversionComplete;
  }
  let downloadInstruction = document.getElementById("downloadInstruction");
  if (downloadInstruction) {
    downloadInstruction.innerHTML = langData[currentLang].resultDownloadInstruction;
  }
  let convertAgainBtn = document.getElementById("convertAgainBtn");
  if (convertAgainBtn) {
    convertAgainBtn.textContent = langData[currentLang].resultConvertAgain;
  }
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Dönüştürme buton modlarını güncelleyen fonksiyon
function updateConvertButton(state, extraData) {
  convertState = state;
  switch(state) {
    case 1: // Deaktif: Dosya yüklenmedi
      startConvertBtn.textContent = langData[currentLang].uploadButton;
      startConvertBtn.disabled = true;
      break;
    case 2: // Aktif: Dönüştürmeye hazır
      startConvertBtn.textContent = langData[currentLang].readyConvert;
      startConvertBtn.disabled = false;
      break;
    case 3: // Dönüştürülüyor
      startConvertBtn.textContent = langData[currentLang].convertingText;
      startConvertBtn.disabled = true;
      break;
    case 4: // İndir modu
      if (uploadedFiles.length === 1) {
        startConvertBtn.textContent = langData[currentLang].downloadBtn + " (" + formatFileSize(uploadedFiles[0].size) + ")";
      } else {
        startConvertBtn.textContent = langData[currentLang].downloadBtn;
      }
      startConvertBtn.disabled = false;
      break;
    case 5: // İndirme geri sayımı
      startConvertBtn.textContent = langData[currentLang].downloadCountdown + " " + extraData + " " + langData[currentLang].seconds;
      startConvertBtn.disabled = true;
      break;
  }
  startConvertBtn.style.transform = "scale(0.95)";
  setTimeout(() => {
    startConvertBtn.style.transform = "scale(1)";
  }, 150);
}

// Elemanlar
const languageSwitch = document.getElementById("languageSwitch");
const languageMenu = document.getElementById("languageMenu");
const themeSwitch = document.getElementById("themeSwitch");
const tabPdfToPptx = document.getElementById("tabPdfToPptx");
const tabPptxToPdf = document.getElementById("tabPptxToPdf");
const fileInput = document.getElementById("fileInput");
const startConvertBtn = document.getElementById("startConvertBtn");

// Dil menüsü olayları
languageSwitch.addEventListener("click", (e) => {
  e.stopPropagation();
  languageMenu.classList.toggle("active");
});
document.addEventListener("click", (e) => {
  if (!languageSwitch.contains(e.target) && !languageMenu.contains(e.target)) {
    languageMenu.classList.remove("active");
  }
});
languageMenu.querySelectorAll("button").forEach(btn => {
  btn.addEventListener("click", () => {
    let selected = btn.getAttribute("data-lang");
    sessionStorage.setItem("selectedLanguage", selected);
    updateLanguage(selected);
    languageMenu.classList.remove("active");
  });
});

// Tema değiştirme olayı
themeSwitch.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");
  let currentTheme = document.body.classList.contains("dark-theme") ? "dark-theme" : "light-theme";
  sessionStorage.setItem("selectedTheme", currentTheme);
  updateThemeIcon();
});

// Sekme (tab) değiştirme ve dosya input güncelleme
function resetConversionUI() {
  fileInput.value = "";
  uploadedFiles = [];
  document.getElementById("fileList").innerHTML = "";
  conversionComplete = false;
  downloadTriggered = false;
  updateConvertButton(1);
}
tabPdfToPptx.addEventListener("click", () => {
  conversionType = "pdf_to_pptx";
  tabPdfToPptx.classList.add("active");
  tabPptxToPdf.classList.remove("active");
  fileInput.accept = ".pdf";
  resetConversionUI();
  updateLanguage(currentLang);
});
tabPptxToPdf.addEventListener("click", () => {
  conversionType = "pptx_to_pdf";
  tabPptxToPdf.classList.add("active");
  tabPdfToPptx.classList.remove("active");
  fileInput.accept = ".pptx";
  resetConversionUI();
  updateLanguage(currentLang);
});

// Drag & Drop desteği
const uploadArea = document.getElementById("uploadArea");
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "var(--primary)";
});
uploadArea.addEventListener("dragleave", (e) => {
  e.preventDefault();
  uploadArea.style.borderColor = "var(--border)";
});
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  fileInput.files = e.dataTransfer.files;
  uploadArea.style.borderColor = "var(--border)";
  handleFileSelection();
});

// Dosya seçimi ve liste gösterimi
function handleFileSelection() {
  const files = fileInput.files;
  for (const file of files) {
    if (file.size > 104857600) {
      alert("File size cannot exceed 100MB.");
      fileInput.value = "";
      document.getElementById("fileList").innerHTML = "";
      return;
    }
    if (conversionType === "pdf_to_pptx" && !file.name.toLowerCase().endsWith(".pdf")) {
      alert(langData[currentLang].noFileAlert);
      fileInput.value = "";
      document.getElementById("fileList").innerHTML = "";
      return;
    }
    if (conversionType === "pptx_to_pdf" && !file.name.toLowerCase().endsWith(".pptx")) {
      alert(langData[currentLang].noFileAlert);
      fileInput.value = "";
      document.getElementById("fileList").innerHTML = "";
      return;
    }
  }
  uploadedFiles = [];
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";
  for (const file of files) {
    const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '');
    uploadedFiles.push({ file_id: null, original_name: file.name, safeName: safeName, size: file.size });
    fileList.insertAdjacentHTML("beforeend", `
      <div class="file-item">
        <div class="file-name">${file.name} <span class="file-size">(${formatFileSize(file.size)})</span></div>
        <div class="progress-bar-container">
          <div class="progress-bar" id="progress-${safeName}"></div>
        </div>
      </div>
    `);
  }
  let completed = 0;
  for (const file of files) {
    uploadFile(file);
  }
  function uploadFile(file) {
    const safeName = file.name.replace(/[^a-zA-Z0-9]/g, '');
    const progressBar = document.getElementById("progress-" + safeName);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = function(e) {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        progressBar.style.width = percent + "%";
      }
    };
    xhr.onload = function() {
      if (xhr.status === 200) {
        progressBar.style.width = "100%";
        for (let fileObj of uploadedFiles) {
          if (fileObj.safeName === safeName) {
            fileObj.file_id = xhr.response.file_id;
            break;
          }
        }
      } else {
        progressBar.style.backgroundColor = "red";
      }
      completed++;
      if (completed === fileInput.files.length) {
        updateConvertButton(2);
      }
    };
    const formData = new FormData();
    formData.append("conversion_type", conversionType);
    formData.append("file", file);
    xhr.send(formData);
  }
}
fileInput.addEventListener("change", handleFileSelection);

// Buton tıklama olayını mod durumuna göre yönlendiriyoruz.
startConvertBtn.addEventListener("click", () => {
  if (convertState === 2) {
    // Dönüştürme işlemini başlat (aktif moddan dönüştürülüyor moduna geçiş)
    updateConvertButton(3);
    const fileItems = document.querySelectorAll(".file-item");
    fileItems.forEach(item => {
      const pb = item.querySelector(".progress-bar");
      pb.style.width = "0%";
      pb.style.backgroundColor = "var(--convert-color)";
      const safeName = pb.id.replace("progress-", "");
      if (conversionIntervals[safeName]) {
        clearInterval(conversionIntervals[safeName]);
      }
      conversionIntervals[safeName] = setInterval(() => {
        let current = parseInt(pb.style.width) || 0;
        const increment = Math.floor(Math.random() * 5) + 1;
        let newProgress = current + increment;
        if (newProgress >= 100) {
          newProgress = 100;
          clearInterval(conversionIntervals[safeName]);
        }
        pb.style.width = newProgress + "%";
      }, 200 + Math.floor(Math.random() * 200));
    });
    fetch("/convert_all", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversion_type: conversionType,
        file_ids: uploadedFiles.map(f => f.file_id)
      })
    })
    .then(async response => {
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error");
      }
      return response.json();
    })
    .then(data => {
      for (const fileObj of uploadedFiles) {
        const pb = document.getElementById("progress-" + fileObj.safeName);
        if (pb) {
          clearInterval(conversionIntervals[fileObj.safeName]);
          pb.style.width = "100%";
        }
      }
      conversionComplete = true;
      downloadUrl = data.download_url;
      updateConvertButton(4);
    })
    .catch(err => {
      for (const key in conversionIntervals) {
        clearInterval(conversionIntervals[key]);
      }
      updateConvertButton(2);
      alert(langData[currentLang].error + " " + err.message);
    });
  } else if (convertState === 4) {
    // İndir modunda, geri sayım başlasın
    if (downloadTriggered) return;
    downloadTriggered = true;
    let count = 5;
    updateConvertButton(5, count);
    const countdownInterval = setInterval(() => {
      count--;
      if (count > 0) {
        updateConvertButton(5, count);
      } else {
        clearInterval(countdownInterval);
        if (!downloadUrl) {
          alert(langData[currentLang].error + " " + "No files converted.");
          return;
        }
        document.body.insertAdjacentHTML("beforeend", `<a id="downloadLink" href="${downloadUrl}" download="${(uploadedFiles.length === 1) ? 'converted.pptx' : 'converted.zip'}"></a>`);
        const a = document.getElementById("downloadLink");
        a.click();
        a.remove();
        setTimeout(() => {
          window.location.href = "/result";
        }, 2000);
      }
    }, 1000);
  }
});
