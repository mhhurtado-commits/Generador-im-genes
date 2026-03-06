import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from PIL import Image
from io import BytesIO
import base64
import logging

app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# Logging para Render
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_from_directory(app.static_folder, filename)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/extract', methods=['POST'])
def extract():
    if not request.is_json:
        return jsonify({'error': 'Se esperaba Content-Type: application/json'}), 400

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({'error': 'JSON inválido en el cuerpo de la solicitud'}), 400

    url = data.get('url')
    if not url:
        return jsonify({'error': 'Campo "url" requerido'}), 400

    logger.info(f"Extrayendo metadatos de: {url}")

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=12)
        response.raise_for_status()

        soup = BeautifulSoup(response.text, 'html.parser')

        # Título
        titulo_tag = soup.find('meta', property='og:title')
        titulo = titulo_tag['content'].strip() if titulo_tag and titulo_tag.get('content') else \
                 (soup.title.string.strip() if soup.title else "Sin título")

        # Categoría desde URL
        path = urlparse(url).path
        parts = [p for p in path.split('/') if p]
        categoria = parts[0].upper() if parts else "NOTICIAS"

        # Imagen
        image_tag = soup.find('meta', property='og:image') or soup.find('meta', property='twitter:image')
        imagen_url = image_tag['content'] if image_tag and image_tag.get('content') else None

        if not imagen_url:
            return jsonify({'error': 'No se encontró imagen (og:image o twitter:image)'}), 404

        return jsonify({
            'titulo': titulo,
            'categoria': categoria,
            'imagen_url': imagen_url
        })

    except requests.Timeout:
        logger.warning(f"Timeout en {url}")
        return jsonify({'error': 'Tiempo de espera agotado al cargar la página'}), 504
    except requests.RequestException as e:
        logger.error(f"Error de red en {url}: {str(e)}")
        return jsonify({'error': f'Error al acceder a la URL: {str(e)}'}), 502
    except Exception as e:
        logger.exception("Error inesperado en /api/extract")
        return jsonify({'error': 'Error interno del servidor'}), 500

@app.route('/api/generate-base', methods=['POST'])
def generate_base():
    if not request.is_json:
        return jsonify({'error': 'Se esperaba JSON'}), 400

    data = request.get_json(silent=True)
    if data is None:
        return jsonify({'error': 'JSON inválido'}), 400

    imagen_url = data.get('imagen_url')
    if not imagen_url:
        return jsonify({'error': 'No se proporcionó imagen_url'}), 400

    logger.info(f"Procesando imagen: {imagen_url}")

    try:
        img_response = requests.get(imagen_url, timeout=15)
        img_response.raise_for_status()

        img = Image.open(BytesIO(img_response.content))
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')

        target_w, target_h = 1080, 1080
        img_ratio = img.width / img.height
        target_ratio = target_w / target_h

        if img_ratio > target_ratio:
            new_h = target_h
            new_w = int(new_h * img_ratio)
        else:
            new_w = target_w
            new_h = int(new_w / img_ratio)

        img_resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        left = (new_w - target_w) // 2
        top = (new_h - target_h) // 2
        img_cropped = img_resized.crop((left, top, left + target_w, top + target_h))

        buffered = BytesIO()
        img_cropped.save(buffered, format='PNG', optimize=True)
        base64_img = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'image_base64': base64_img,
            'width': target_w,
            'height': target_h
        })

    except Exception as e:
        logger.exception("Error en generate-base")
        return jsonify({'error': f'Error procesando imagen: {str(e)}'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
