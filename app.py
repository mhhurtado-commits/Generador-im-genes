import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import base64

# Configuración de carpetas
app = Flask(__name__, 
            static_folder='static', 
            template_folder='templates')

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory('static', filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/extract', methods=['POST'])
def extract():
    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'URL no proporcionada'}), 400

    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        # Título
        titulo_tag = soup.find('meta', property='og:title')
        titulo = titulo_tag['content'] if titulo_tag else (soup.title.string if soup.title else "Sin título")

        # Categoría
        url_part = urlparse(url)
        path_parts = [p for p in url_part.path.split('/') if p]
        categoria = path_parts[0].upper() if path_parts else "NOTICIAS"
        
        # Imagen
        meta_image = soup.find('meta', property='og:image')
        imagen_url = meta_image['content'] if meta_image else None

        if not imagen_url:
            return jsonify({'error': 'No se encontró imagen en la noticia'}), 404

        return jsonify({
            'titulo': titulo,
            'categoria': categoria,
            'imagen_url': imagen_url
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/process-image', methods=['POST'])
def process_image():
    data = request.json
    # CAMBIO CLAVE: Ahora buscamos 'imagen_url' que viene del extractor
    imagen_url = data.get('imagen_url')
    
    if not imagen_url:
        return jsonify({'error': 'No se proporcionó URL de imagen'}), 400

    try:
        # Descargar la imagen directamente desde el servidor (evita bloqueos de navegador)
        headers = {'User-Agent': 'Mozilla/5.0'}
        img_response = requests.get(imagen_url, headers=headers, timeout=10)
        img = Image.open(BytesIO(img_response.content))
        
        # Convertir a RGB
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Redimensionado inteligente (Cover)
        target_width, target_height = 1080, 1080
        img_width, img_height = img.size
        
        img_ratio = img_width / img_height
        target_ratio = target_width / target_height

        if img_ratio > target_ratio:
            # Más ancha que alta
            new_height = target_height
            new_width = int(img_ratio * new_height)
        else:
            # Más alta que ancha
            new_width = target_width
            new_height = int(new_width / img_ratio)

        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Recortar al centro
        left = (new_width - target_width) / 2
        top = (new_height - target_height) / 2
        right = (new_width + target_width) / 2
        bottom = (new_height + target_height) / 2
        img = img.crop((left, top, right, bottom))
        
        # Exportar a Base64
        buffered = BytesIO()
        img.save(buffered, format="JPEG", quality=85)
        base64_img = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'image_base64': base64_img,
            'width': 1080,
            'height': 1080
        })
    except Exception as e:
        print(f"Error procesando imagen: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
