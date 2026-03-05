import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import base64

# Configuración de carpetas para que funcione en la nube
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
        # User-agent para evitar que el diario nos bloquee por parecer un bot
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(url, headers=headers, timeout=10)
        soup = BeautifulSoup(response.text, 'html.parser')

        titulo = soup.find('meta', property='og:title')
        titulo = titulo['content'] if titulo else soup.title.string

        url_part = urlparse(url)
        # Manejo simple de categoría basado en la URL
        path_parts = [p for p in url_part.path.split('/') if p]
        categoria = path_parts[0].upper() if path_parts else "NOTICIAS"
        
        meta_image = soup.find('meta', property='og:image')
        imagen_url = meta_image['content'] if meta_image else None

        if not imagen_url:
            return jsonify({'error': 'No se encontró una imagen para la URL'}), 404

        return jsonify({
            'titulo': titulo,
            'categoria': categoria,
            'imagen_url': imagen_url
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/proxy-image')
def proxy_image():
    url = request.args.get('url')
    if not url:
        return "No URL provided", 400
    try:
        headers = {'User-Agent': 'Mozilla/5.0'}
        resp = requests.get(url, headers=headers)
        return (resp.content, resp.status_code, resp.headers.items())
    except Exception as e:
        return str(e), 500

@app.route('/api/process-image', methods=['POST'])
def process_image():
    data = request.json
    img_data = data.get('image')
    if not img_data:
        return jsonify({'error': 'No image data'}), 400

    try:
        # Quitar el encabezado base64 si existe
        if ',' in img_data:
            img_data = img_data.split(',')[1]
        
        img_bytes = base64.b64decode(img_data)
        img = Image.open(BytesIO(img_bytes))
        
        # Convertir a RGB si es necesario (para JPG)
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")

        # El proceso de redimensionado que ya tenías
        target_width, target_height = 1080, 1080
        canvas_ratio = target_width / target_height
        img_width, img_height = img.size
        img_ratio = img_width / img_height
        
        if img_ratio > canvas_ratio:
            new_height = target_height
            new_width = int(img_width * (new_height / img_height))
        else:
            new_width = target_width
            new_height = int(img_height * (new_width / img_width))
        
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height
        img = img.crop((left, top, right, bottom))
        
        buffered = BytesIO()
        img.save(buffered, format="JPEG", quality=90) 
        base64_img = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'image_base64': base64_img,
            'width': 1080,
            'height': 1080
        })
    except Exception as e:
        print(f"Error procesando imagen: {e}")
        return jsonify({'error': str(e)}), 500

# ESTA PARTE ES CLAVE PARA QUE FUNCIONE EN INTERNET
if __name__ == '__main__':
    # Render asigna un puerto automáticamente en la variable de entorno PORT
    port = int(os.environ.get('PORT', 5000))
    # En producción usamos 0.0.0.0 para que sea accesible externamente
    app.run(host='0.0.0.0', port=port)
