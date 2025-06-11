// static/js/ui.js

let errorDialog;
let errorDialogContent;

export function initErrorDialog() {
    errorDialog = document.getElementById('error-dialog');
    errorDialogContent = document.getElementById('error-dialog-content');
    // Gerekirse burada errorDialog'a olay dinleyicileri eklenebilir,
    // örneğin kapanma animasyonundan sonra içeriği temizlemek için.
}

export function gosterHataMesaji(mesaj) {
    if (errorDialogContent && errorDialog) {
        errorDialogContent.textContent = mesaj;
        if (errorDialog.open !== true) { // Zaten açıksa tekrar açma animasyonunu tetikleme
             errorDialog.show(); // veya errorDialog.open = true;
        }
    } else {
        // Bu durum, initErrorDialog çağrılmadan önce veya DOM elemanları yoksa oluşur.
        console.error("Hata diyalog elemanları bulunamadı veya başlatılmadı. Mesaj: ", mesaj);
        alert(mesaj); // Fallback olarak alert
    }
}