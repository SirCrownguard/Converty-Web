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

// Global variables
let uploadedFiles = []; // Each file: {file_id, original_name, safeName, size}
let conversionIntervals = {}; // Holds intervals for each file's conversion progress
let conversionComplete = false;
let downloadTriggered = false;
let downloadUrl = "";
let conversionType = "pdf_to_pptx";

// Language data (extended with result page texts)
let currentLang = "en";
const langData = {
  tr: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadText: "PDF dosyanızı sürükleyin veya seçin",
    uploadSubtext: "Maksimum dosya boyutu: 100MB",
    noFileAlert: "Lütfen geçerli dosya seçiniz.",
    convertSuccess: "Dönüştürme başarılı! Dosya 5 saniye içinde indirilecek.",
    error: "Hata:",
    convertBtn: "Dönüştür",
    downloadBtn: "İndir",
    convertingText: "Dönüştürülüyor...",
    downloadCountdown: "İndirme",
    seconds: "saniye",
    resultThankYou: "Converty'yi tercih ettiğiniz için teşekkür ederiz!",
    resultConversionComplete: "Dönüştürme işleminiz tamamlandı.",
    resultDownloadInstruction: "Eğer indirme başlamadıysa <span class='link' id='downloadLink'>buraya</span> tıklayın.",
    resultConvertAgain: "Yeniden dönüştür",
    resultRedirecting: "Ana sayfaya yönlendiriliyorsunuz, {count} saniye kaldı..."
  },
  en: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadText: "Drag or select your PDF file",
    uploadSubtext: "Maximum file size: 100MB",
    noFileAlert: "Please select a valid file.",
    convertSuccess: "Conversion successful! The file will download in 5 seconds.",
    error: "Error:",
    convertBtn: "Convert",
    downloadBtn: "Download",
    convertingText: "Converting...",
    downloadCountdown: "Download in",
    seconds: "seconds",
    resultThankYou: "Thank you for choosing Converty!",
    resultConversionComplete: "Your conversion is complete.",
    resultDownloadInstruction: "If the download hasn't started, click <span class='link' id='downloadLink'>here</span>.",
    resultConvertAgain: "Convert again",
    resultRedirecting: "Redirecting to homepage in {count} second(s)..."
  },
  zh: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadText: "拖放或选择您的PDF文件",
    uploadSubtext: "最大文件大小: 100MB",
    noFileAlert: "请选择有效的文件。",
    convertSuccess: "转换成功！文件将在5秒内下载。",
    error: "错误:",
    convertBtn: "转换",
    downloadBtn: "下载",
    convertingText: "转换中...",
    downloadCountdown: "下载将在",
    seconds: "秒",
    resultThankYou: "感谢您选择 Converty！",
    resultConversionComplete: "转换已完成。",
    resultDownloadInstruction: "如果下载未开始，请点击 <span class='link' id='downloadLink'>这里</span>。",
    resultConvertAgain: "重新转换",
    resultRedirecting: "将在 {count} 秒后跳转到主页..."
  },
  es: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadText: "Arrastra o selecciona tu archivo PDF",
    uploadSubtext: "Tamaño máximo: 100MB",
    noFileAlert: "Por favor, selecciona un archivo válido.",
    convertSuccess: "¡Conversión exitosa! El archivo se descargará en 5 segundos.",
    error: "Error:",
    convertBtn: "Convertir",
    downloadBtn: "Descargar",
    convertingText: "Convirtiendo...",
    downloadCountdown: "Descarga en",
    seconds: "segundos",
    resultThankYou: "¡Gracias por elegir Converty!",
    resultConversionComplete: "La conversión ha finalizado.",
    resultDownloadInstruction: "Si la descarga no ha comenzado, haz clic <span class='link' id='downloadLink'>aquí</span>.",
    resultConvertAgain: "Convertir de nuevo",
    resultRedirecting: "Redirigiendo a la página de inicio en {count} segundo(s)..."
  },
  pt: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadText: "Arraste ou selecione seu arquivo PDF",
    uploadSubtext: "Tamanho máximo: 100MB",
    noFileAlert: "Por favor, selecione um arquivo válido.",
    convertSuccess: "Conversão bem-sucedida! O arquivo será baixado em 5 segundos.",
    error: "Erro:",
    convertBtn: "Converter",
    downloadBtn: "Baixar",
    convertingText: "Convertendo...",
    downloadCountdown: "Baixar em",
    seconds: "segundos",
    resultThankYou: "Obrigado por escolher o Converty!",
    resultConversionComplete: "Sua conversão foi concluída.",
    resultDownloadInstruction: "Se o download não começou, clique <span class='link' id='downloadLink'>aqui</span>.",
    resultConvertAgain: "Converter novamente",
    resultRedirecting: "Redirecionando para a página inicial em {count} segundo(s)..."
  },
  hi: {
    tabPdfToPptx: "PDF › PPTX",
    tabPptxToPdf: "PPTX › PDF",
    uploadText: "अपनी PDF फ़ाइल खींचें या चुनें",
    uploadSubtext: "अधिकतम फ़ाइल आकार: 100MB",
    noFileAlert: "कृपया एक वैध फ़ाइल चुनें।",
    convertSuccess: "परिवर्तन सफल! फ़ाइल 5 सेकंड में डाउनलोड होगी।",
    error: "त्रुटि:",
    convertBtn: "परिवर्तन",
    downloadBtn: "डाउनलोड",
    convertingText: "परिवर्तन हो रहा है...",
    downloadCountdown: "डाउनलोड",
    seconds: "सेकंड",
    resultThankYou: "Converty चुनने के लिए धन्यवाद!",
    resultConversionComplete: "आपका रूपांतरण पूरा हो गया है।",
    resultDownloadInstruction: "यदि डाउनलोड शुरू नहीं हुआ है, तो <span class='link' id='downloadLink'>यहाँ</span> क्लिक करें।",
    resultConvertAgain: "फिर से रूपांतरण करें",
    resultRedirecting: "होमपेज पर {count} सेकंड में रीडायरेक्ट हो रहा है..."
  }
};

// Determine current language based on stored preference or browser language.
if (sessionStorage.getItem("selectedLanguage") && langData[sessionStorage.getItem("selectedLanguage")]) {
  currentLang = sessionStorage.getItem("selectedLanguage");
} else {
  const userLang = navigator.language.slice(0, 2);
  if (langData[userLang]) {
    currentLang = userLang;
  }
}

// Update UI language for index page elements
function updateLanguage(lang) {
  currentLang = lang;
  document.getElementById("tabPdfToPptx").textContent = langData[lang].tabPdfToPptx;
  document.getElementById("tabPptxToPdf").textContent = langData[lang].tabPptxToPdf;
  document.getElementById("uploadText").textContent = langData[lang].uploadText;
  document.getElementById("uploadSubtext").textContent = langData[lang].uploadSubtext;
  if (!conversionComplete) {
    startConvertBtn.textContent = langData[lang].convertBtn;
  } else {
    if (uploadedFiles.length === 1) {
      startConvertBtn.textContent = langData[lang].downloadBtn + " (" + formatFileSize(uploadedFiles[0].size) + ")";
    } else {
      startConvertBtn.textContent = langData[lang].downloadBtn;
    }
  }
}

// Update result page texts based on the selected language
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

// Helper: Format file size (B, KB, or MB)
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + " B";
  else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  else return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

// Elements
const languageSwitch = document.getElementById("languageSwitch");
const languageMenu = document.getElementById("languageMenu");
const themeSwitch = document.getElementById("themeSwitch");
const tabPdfToPptx = document.getElementById("tabPdfToPptx");
const tabPptxToPdf = document.getElementById("tabPptxToPdf");
const fileInput = document.getElementById("fileInput");
const startConvertBtn = document.getElementById("startConvertBtn");

// Language menu events
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
    updateResultPageText();
  });
});

// Theme switch toggle
themeSwitch.addEventListener("click", () => {
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");
  let currentTheme = document.body.classList.contains("dark-theme") ? "dark-theme" : "light-theme";
  sessionStorage.setItem("selectedTheme", currentTheme);
});

// Tab switching and file input type update
function resetConversionUI() {
  fileInput.value = "";
  uploadedFiles = [];
  document.getElementById("fileList").innerHTML = "";
  startConvertBtn.disabled = true;
  conversionComplete = false;
  downloadTriggered = false;
  startConvertBtn.textContent = langData[currentLang].convertBtn;
  startConvertBtn.style.backgroundColor = "";
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

// Drag & Drop support
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

// Handle file selection and display file list with individual sizes
function handleFileSelection() {
  uploadedFiles = [];
  const files = fileInput.files;
  // Check file size and type
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
  // Build file list display with file size
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
  // Upload each file
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
        // Store returned file_id
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
        // Enable Convert button once all uploads finish
        startConvertBtn.disabled = false;
      }
    };
    const formData = new FormData();
    formData.append("conversion_type", conversionType);
    formData.append("file", file);
    xhr.send(formData);
  }
}
fileInput.addEventListener("change", handleFileSelection);

// Convert button behavior: simulate independent conversion progress for each file
startConvertBtn.addEventListener("click", () => {
  if (uploadedFiles.length === 0) {
    alert(langData[currentLang].noFileAlert);
    return;
  }
  // Reset conversion UI: reset progress bars and update their color for conversion
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
  
  // Disable the button and update its label to indicate conversion in progress
  startConvertBtn.disabled = true;
  startConvertBtn.textContent = langData[currentLang].convertingText;
  startConvertBtn.style.backgroundColor = "#cccccc";
  
  // Send conversion request
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
    // On successful conversion, ensure each file’s progress bar shows complete status
    for (const fileObj of uploadedFiles) {
      const pb = document.getElementById("progress-" + fileObj.safeName);
      if (pb) {
        clearInterval(conversionIntervals[fileObj.safeName]);
        pb.style.width = "100%";
      }
    }
    conversionComplete = true;
    downloadUrl = data.download_url;
    // Update button label to include file size if only one file converted
    if (uploadedFiles.length === 1) {
      startConvertBtn.textContent = langData[currentLang].downloadBtn + " (" + formatFileSize(uploadedFiles[0].size) + ")";
    } else {
      startConvertBtn.textContent = langData[currentLang].downloadBtn;
    }
    startConvertBtn.disabled = false;
    // Assign download trigger (prevent duplicate triggers)
    startConvertBtn.onclick = downloadAndRedirect;
  })
  .catch(err => {
    // On error, clear all conversion intervals and reset button
    for (const key in conversionIntervals) {
      clearInterval(conversionIntervals[key]);
    }
    startConvertBtn.style.backgroundColor = "var(--primary)";
    startConvertBtn.textContent = langData[currentLang].convertBtn;
    alert(langData[currentLang].error + " " + err.message);
  });
});

// Download functionality with a 5-second countdown and prevention of duplicate triggers
function downloadAndRedirect() {
  if (downloadTriggered) return;
  downloadTriggered = true;
  startConvertBtn.disabled = true;
  let count = 5;
  startConvertBtn.textContent = `${langData[currentLang].downloadCountdown} ${count} ${langData[currentLang].seconds}`;
  const countdownInterval = setInterval(() => {
    count--;
    if (count > 0) {
      startConvertBtn.textContent = `${langData[currentLang].downloadCountdown} ${count} ${langData[currentLang].seconds}`;
    } else {
      clearInterval(countdownInterval);
      if (!downloadUrl) {
        alert(langData[currentLang].error + " " + "No files converted.");
        return;
      }
      // Insert an anchor element to trigger download without using forbidden terminology.
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
