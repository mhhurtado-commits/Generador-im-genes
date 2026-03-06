import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import base64

app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# Ruta raíz → sirve index.html
@app.route('/')
def index():
    return render_template('index.html')

# Endpoint para extraer metadatos
@app.route('/api/extract', methods=['POST'])
def extract():
    url = request.json.get('url')
    if not url:
        return jsonify({'error': 'URL no proporcionada'}), 400

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()  # Lanza error si no es 200

        soup = BeautifulSoup(response.text, 'html.parser')

        # Título (mejor fallback)
        titulo_tag = soup.find('meta', property='og:title')
        titulo = titulo_tag['content'] if titulo_tag else \
                 (soup.title.string.strip() if soup.title else "Sin título")

        # Categoría (de la URL)
        url_part = urlparse(url)
        path_parts = [p for p in url_part.path.split('/') if p]
        categoria = path_parts[0].upper() if path_parts else "NOTICIAS"

        # Imagen OG
        meta_image = soup.find('meta', property='og:image')
        imagen_url = meta_image['content'] if meta_image else None

        if not imagen_url:
            return jsonify({'error': 'No se encontró imagen en la noticia (og:image)'}), 404

        return jsonify({
            'titulo': titulo,
            'categoria': categoria,
            'imagen_url': imagen_url
        })

    except requests.RequestException as e:
        return jsonify({'error': f'Error al obtener la página: {str(e)}'}), 502
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Procesamiento de imagen (ahora se llama desde el frontend con imagen_url)
@app.route('/api/process-image', methods=['POST'])
def process_image():
    data = request.json
    imagen_url = data.get('imagen_url')

    if not imagen_url:
        return jsonify({'error': 'No se proporcionó URL de imagen'}), 400

    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        img_response = requests.get(imagen_url, headers=headers, timeout=15)
        img_response.raise_for_status()

        img = Image.open(BytesIO(img_response.content))

        # Convertir a RGB si es necesario
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # Redimensionado inteligente (cover)
        target_width, target_height = 1080, 1080
        img_width, img_height = img.size
        img_ratio = img_width / img_height
        target_ratio = target_width / target_height

        if img_ratio > target_ratio:
            new_height = target_height
            new_width = int(img_ratio * new_height)
        else:
            new_width = target_width
            new_height = int(new_width / img_ratio)

        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

        # Recorte centrado
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height
        img = img.crop((left, top, right, bottom))

        # Guardar como JPEG base64
        buffered = BytesIO()
        img.save(buffered, format="JPEG", quality=85, optimize=True)
        base64_img = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'image_base64': base64_img,
            'width': target_width,
            'height': target_height
        })

    except requests.RequestException as e:
        return jsonify({'error': f'Error descargando imagen: {str(e)}'}), 502
    except Exception as e:
        return jsonify({'error': f'Error procesando imagen: {str(e)}'}), 500


# Solo para desarrollo local (NO se ejecuta en Render)
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
