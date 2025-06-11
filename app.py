from flask import Flask, render_template, request, send_from_directory, jsonify, g, redirect, url_for, session
from flask_babel import Babel, gettext as _
from flask import jsonify
from werkzeug.utils import secure_filename
import os
import uuid
import time # Geçici dosya temizliği için

from converters import CONVERTERS, POPPLER_PATH # converters.py'den import et

# Poppler path uyarısı
if POPPLER_PATH is None and os.name == 'nt': # Windows ve path belirtilmemişse
    print("UYARI: POPPLER_PATH ortam değişkeni ayarlanmamış veya converters.py içinde tanımlanmamış.")
    print("Windows'ta PDF işlemleri için Poppler'ın bin klasörünün PATH'e eklenmesi veya POPPLER_PATH'in ayarlanması gerekir.")
elif POPPLER_PATH and not os.path.exists(POPPLER_PATH) and os.name == 'nt':
     print(f"UYARI: Belirtilen POPPLER_PATH '{POPPLER_PATH}' bulunamadı.")


# --- Configuration ---
UPLOAD_FOLDER = 'uploads'
CONVERTED_FOLDER = 'converted'
ALLOWED_EXTENSIONS = set() # CONVERTERS'dan dinamik olarak doldurulacak
MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50 MB

LANGUAGES = {
    'en': 'English',
    'tr': 'Türkçe'
}

# --- App Setup ---
app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['CONVERTED_FOLDER'] = CONVERTED_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH
app.config['LANGUAGES'] = LANGUAGES
app.config['BABEL_DEFAULT_LOCALE'] = 'en'
app.config['SECRET_KEY'] = os.urandom(24) # Session için gerekli

# --- Locale Selector Fonksiyonu (Dekoratörsüz) ---
# Bu fonksiyon, babel nesnesi ilklendirilmeden ÖNCE tanımlanmalı
def get_current_locale():
    # 1. URL'den al (örn: /en/...)
    lang_code = None
    if request.path: # Ensure request.path is not None or empty
        path_parts = request.path.split('/')
        # path_parts[0] boş string olur (ilk / nedeniyle)
        # path_parts[1] dil kodu olmalı
        if len(path_parts) > 1 and path_parts[1] in LANGUAGES:
            lang_code = path_parts[1]
    
    if lang_code:
        g.locale = lang_code
        session['locale'] = lang_code
        return lang_code
    
    # 2. Session'dan al
    if 'locale' in session and session['locale'] in LANGUAGES:
        g.locale = session['locale']
        return session['locale']
        
    # 3. Tarayıcı ayarlarından veya varsayılan
    # best_match'e bir liste vermek daha güvenli
    best_match = request.accept_languages.best_match(list(LANGUAGES.keys()))
    current_locale_val = best_match if best_match else app.config['BABEL_DEFAULT_LOCALE']
    g.locale = current_locale_val
    session['locale'] = current_locale_val
    return current_locale_val

# --- Babel İlklendirmesi ---
# locale_selector fonksiyonunu parametre olarak veriyoruz
babel = Babel(app, locale_selector=get_current_locale)


# --- Helper Functions ---
def allowed_file(filename, conversion_key):
    if conversion_key not in CONVERTERS:
        return False
    expected_input_accept = CONVERTERS[conversion_key]['input_accept'] # .pdf, .png etc.
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in expected_input_accept.replace('.', '')

def get_converter_input_accepts():
    accepts = set()
    for conv_data in CONVERTERS.values():
        formats = conv_data['input_accept'].replace('.', '').split(',')
        for f in formats:
            if f: # Boş string olmaması için
                accepts.add(f.strip())
    return accepts

ALLOWED_EXTENSIONS.update(get_converter_input_accepts())

@app.route('/manifest.webmanifest') # Tercihen .webmanifest uzantısı
def web_manifest():
    # Bu route çağrıldığında g.locale'in doğru ayarlanmış olması beklenir.
    # Flask-Babel'in @babel.localeselector ve @app.before_request fonksiyonları
    # sayesinde g.locale, kullanıcının mevcut dilini yansıtmalıdır.

    # Çevrilecek metinleri _() ile alalım.
    # Bu metinlerin .po dosyalarınızda olması ve çevrilmiş olması gerekir.
    manifest_data = {
        "name": _("Converty - File Converter"),
        "short_name": _("Converty"),
        "description": _("Easily convert your files with Converty."),
        "start_url": f"/{str(g.locale)}/", # g.locale'i stringe çevirmek daha güvenli olabilir
        "display": "standalone",
        "background_color": "#F8FAF0",
        "theme_color": "#3A6A2A",
        "orientation": "portrait-primary",
        "icons": [
            {
                "src": url_for('static', filename='icons/icon-192x192.png', _external=True),
                "sizes": "192x192",
                "type": "image/png",
                "purpose": "any maskable"
            }, # <-- ÖNCEKİ KODDA BURADA VİRGÜL EKSİK OLABİLİR
            {
                "src": url_for('static', filename='icons/icon-512x512.png', _external=True),
                "sizes": "512x512",
                "type": "image/png",
                "purpose": "any maskable"
            }
            # Eğer daha fazla ikon eklerseniz, bir önceki ikon sözlüğünden sonra virgül koymayı unutmayın
        ], # <-- Köşeli parantez doğru kapatılmış
        "lang": str(g.locale)
    } # <-- Süslü parantez doğru kapatılmış
    response = jsonify(manifest_data)
    response.headers['Content-Type'] = 'application/manifest+json'
    return response

@app.before_request
def ensure_lang_prefix():
    # Service Worker, Manifest ve statik dosyalar için yönlendirme yapma
    if request.endpoint in ('static', 'serve_sw', 'web_manifest', 'download_converted'): # 'serve_sw' ve 'web_manifest' route adlarınızla eşleşmeli
        return

    # g.locale'in burada ayarlanmış olması beklenir... (önceki kodunuz)
    current_locale_from_g = getattr(g, 'locale', None)
    if not current_locale_from_g:
        current_locale_from_g = get_current_locale() # Bu get_current_locale çağrısı session'ı da set eder

    path_parts = request.path.split('/')
    is_root_path = (request.path == '/')
    # path_parts[1] boş değilse VE geçerli bir dil değilse yönlendir.
    # Sadece '/' veya '/gecersiz_dil/...' durumlarını yakala. '/gecersiz_dil' durumunu yakalama.
    has_invalid_lang_prefix = (len(path_parts) > 1 and path_parts[1] != '' and path_parts[1] not in LANGUAGES)

    if is_root_path or has_invalid_lang_prefix:
        new_path_prefix = f'/{current_locale_from_g}'
        
        if is_root_path:
            new_path = f'{new_path_prefix}/'
        else:
            # /gecersiz_dil/kalan/yol -> /dogru_dil/kalan/yol
            # /yalnizca_kalan_yol (öneksiz) -> /dogru_dil/yalnizca_kalan_yol
            # Bu kısım biraz karmaşık olabilir, dikkatli olun.
            # En basit haliyle, eğer geçersiz bir prefix varsa onu atıp doğru olanı ekleyelim.
            # Eğer prefix yoksa, direkt ekleyelim.
            if has_invalid_lang_prefix:
                original_path_no_prefix = '/' + '/'.join(path_parts[2:]) if len(path_parts) > 2 else '/'
            else: # Prefix yok, direkt request.path'i kullan (is_root_path zaten yukarıda handle edildi)
                original_path_no_prefix = request.path

            new_path = f'{new_path_prefix}{original_path_no_prefix}'
            # Eğer original_path_no_prefix '/' ile bitiyorsa ve new_path bitmiyorsa, ekle
            if original_path_no_prefix.endswith('/') and not new_path.endswith('/'):
                new_path += '/'
            # Eğer original_path_no_prefix '/' değilse ve new_path '//' içeriyorsa düzelt (örn: /en//foo)
            new_path = new_path.replace('//', '/')


        if request.query_string:
            new_path += '?' + request.query_string.decode('utf-8')
        
        # Yönlendirme yapmadan önce, yeni path'in mevcut path'ten farklı olduğundan emin ol
        if new_path != request.path:
            return redirect(new_path)

    # g.locale'in her zaman ayarlı olduğundan emin ol
    if not hasattr(g, 'locale') or g.locale is None:
        g.locale = get_current_locale()

# app.py içinde sw.js için route olduğundan emin olun:
@app.route('/sw.js')
def serve_sw():
    return send_from_directory('.', 'sw.js', mimetype='application/javascript')

# app.py içinde offline.html için route olduğundan emin olun (eğer sw.js'de kullanıyorsanız):
@app.route('/offline.html')
def offline_page():
    return render_template('offline.html')

# --- Routes ---
@app.route('/')
def root_redirect():
    # Bu route doğrudan erişilmemeli, ensure_lang_prefix yönlendirecek
    # Ama bir fallback olarak yine de dil kodlu ana sayfaya yönlendirebiliriz.
    session['locale'] = get_current_locale() # g.locale'in ayarlanması için
    return redirect(url_for('index', lang_code=session['locale']))

@app.route('/<lang_code>/')
def index(lang_code):
    if lang_code not in LANGUAGES:
        return redirect(url_for('index', lang_code=get_current_locale()))
    # g.locale burada Babel ve get_current_locale tarafından zaten ayarlanmış olmalı.
    # session['locale'] de get_current_locale içinde ayarlanıyor.
    return render_template('index.html', converters=CONVERTERS)

@app.route('/<lang_code>/convert', methods=['POST'])
def convert_file(lang_code):
    if lang_code not in LANGUAGES:
        return jsonify({'success': False, 'error': _('Invalid language code.')}), 400
    # g.locale ve session['locale'] zaten ayarlı olmalı

    if 'file' not in request.files:
        return jsonify({'success': False, 'error': _('No file part')}), 400 # PO: "Dosya bölümü bulunamadı"
    
    file = request.files['file']
    conversion_key = request.form.get('conversion_type')

    if not conversion_key or conversion_key not in CONVERTERS:
        return jsonify({'success': False, 'error': _('Invalid conversion type')}), 400 # PO: "Geçersiz dönüştürme tipi"

    if file.filename == '':
        return jsonify({'success': False, 'error': _('No selected file')}), 400 # PO: "Dosya seçilmedi"

    if file and allowed_file(file.filename, conversion_key):
        original_filename = secure_filename(file.filename)
        unique_id = str(uuid.uuid4())
        
        # Orijinal dosya adının uzantısız kısmını al
        original_filename_base = original_filename.rsplit('.', 1)[0]
        input_ext = original_filename.rsplit('.', 1)[1].lower()
        
        # Sunucuda saklanacak geçici girdi dosyası adı
        temp_input_filename = f"{unique_id}_{original_filename_base}.{input_ext}"
        input_filepath = os.path.join(app.config['UPLOAD_FOLDER'], temp_input_filename)
        file.save(input_filepath)

        converter_info = CONVERTERS[conversion_key]
        output_extension = converter_info['output_extension']
        
        # Sunucuda saklanacak çıktı dosyası adı (benzersiz ID ile)
        # Bu ad, download_converted route'unda kullanılacak olan 'filename' parametresidir.
        server_output_filename_base = f"{unique_id}_{original_filename_base}_donusturuldu"
        server_output_filename_with_ext = f"{server_output_filename_base}{output_extension}"
        output_filepath = os.path.join(app.config['CONVERTED_FOLDER'], server_output_filename_with_ext)

        # İstemciye gönderilecek, kullanıcının göreceği indirme dosya adı
        # Bu, tarayıcının "Farklı Kaydet" iletişim kutusunda önerilen addır.
        client_download_filename = f"{original_filename_base}_donusturuldu{output_extension}"

        try:
            converter_func = converter_info['function']
            
            # ÖNEMLİ: Bu kısım sizin converter fonksiyonlarınızın nasıl çalıştığına göre düzenlenmeli!
            # Örnek olarak pdf_to_pptx bırakıldı, diğerlerini siz eklemelisiniz veya
            # tüm converter'larınız standart bir arayüze (örn: func(input_path, output_path)) sahip olmalı.
            if conversion_key == "pdf_to_pptx":
                presentation = converter_func(input_filepath) 
                presentation.save(output_filepath)
            # Diğer dönüştürücü türleri için benzer mantık
            # elif conversion_key == "image_to_pdf":
            #     converter_func(input_filepath, output_filepath) # Eğer fonksiyon bu şekilde çalışıyorsa
            else:
                # Bu durum, CONVERTERS'da tanımlı ama burada özel bir işlem bloğu yoksa oluşur.
                # İdealde, tüm 'function'larınız benzer bir şekilde çağrılabilmeli.
                # Şimdilik, bu durum için bir hata döndürüyoruz.
                app.logger.error(f"'{conversion_key}' için arka uçta özel dönüştürme yolu bulunamadı.")
                return jsonify({'success': False, 'error': _('The selected conversion type is not fully implemented on the server.')}), 501


            download_url = url_for('download_converted', lang_code=g.locale, filename=server_output_filename_with_ext, _external=True)
            
            try:
                if os.path.exists(input_filepath): # Dosyanın varlığını kontrol et
                    os.remove(input_filepath) 
            except OSError as e:
                app.logger.error(f"Başarılı dönüştürme sonrası girdi dosyası {input_filepath} silinirken hata: {e}")

            return jsonify({
                'success': True, 
                'download_url': download_url,
                'download_filename': client_download_filename # YENİ: İstemcinin kullanacağı dosya adı
            })

        except ValueError as ve: # Dönüştürücüden gelen beklenen hatalar (örn: dosya bozuk, yanlış format)
             app.logger.warning(f"'{original_filename}' için dönüştürme sırasında beklenen hata (ValueError): {ve}")
             try: 
                 if os.path.exists(input_filepath): os.remove(input_filepath)
             except OSError as e:
                 app.logger.error(f"ValueError sonrası girdi dosyası {input_filepath} silinirken hata: {e}")
             # Kullanıcıya dönüştürücüden gelen hata mesajını göstermek daha iyi olabilir
             return jsonify({'success': False, 'error': str(ve)}), 400 # 400 Bad Request, çünkü girdiyle ilgili bir sorun
        except Exception as e:
            app.logger.error(f"'{original_filename}' için dönüştürme sırasında beklenmedik hata: {e}", exc_info=True) # exc_info traceback'i loglar
            try: 
                if os.path.exists(input_filepath): os.remove(input_filepath)
            except OSError as ose:
                app.logger.error(f"Beklenmedik hata sonrası girdi dosyası {input_filepath} silinirken hata: {ose}")
            return jsonify({'success': False, 'error': _('An unexpected error occurred during conversion.')}), 500 # PO: "Dönüştürme sırasında beklenmedik bir sorunla karşılaşıldı."
    else:
        # Çeviri metni güncellendi/iyileştirildi
        return jsonify({'success': False, 'error': _('File type not allowed for the selected conversion.')}), 400 # PO: "Seçilen dönüştürme için dosya tipine izin verilmiyor."

@app.route('/<lang_code>/download/<filename>')
def download_converted(lang_code, filename):
    if lang_code not in LANGUAGES:
        # Bu durum normalde ensure_lang_prefix tarafından engellenmeli
        # ama bir fallback olarak ana dile yönlendirebilir veya 404 verebiliriz.
        return redirect(url_for('index', lang_code=get_current_locale())) 
    
    safe_filename = secure_filename(filename)
    if safe_filename != filename:
        return _("Invalid filename."), 400

    file_path = os.path.join(app.config['CONVERTED_FOLDER'], safe_filename)
    
    if not os.path.exists(file_path):
        return _("File not found."), 404
        
    response = send_from_directory(app.config['CONVERTED_FOLDER'], safe_filename, as_attachment=True)
    return response

def cleanup_old_files(directory, max_age_seconds=3600): # 1 saat
    now = time.time()
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            if os.stat(filepath).st_mtime < (now - max_age_seconds):
                try:
                    os.remove(filepath)
                    app.logger.info(f"Eski dosya temizlendi: {filepath}")
                except Exception as e:
                    app.logger.error(f"{filepath} dosyası temizlenirken hata: {e}")

if __name__ == '__main__':
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    if not os.path.exists(CONVERTED_FOLDER):
        os.makedirs(CONVERTED_FOLDER)
    
    cleanup_old_files(app.config['UPLOAD_FOLDER'])
    cleanup_old_files(app.config['CONVERTED_FOLDER'])
    
    cert_file_mkcert = '192.168.3.90+2.pem'
    key_file_mkcert = '192.168.3.90+2-key.pem'
    
    context = (cert_file_mkcert, key_file_mkcert) 
    
    if not os.path.exists(cert_file_mkcert) or not os.path.exists(key_file_mkcert):
        print(f"HATA: SSL sertifika dosyaları bulunamadı: {cert_file_mkcert}, {key_file_mkcert}")
        print("Lütfen mkcert ile sertifikaları oluşturduğunuzdan ve dosya adlarının doğru olduğundan emin olun.")
    else:
        print(f"SSL sertifikaları yükleniyor: {cert_file_mkcert}, {key_file_mkcert}")
        app.run(debug=True, host='0.0.0.0', port=5000, ssl_context=context, use_reloader=False)