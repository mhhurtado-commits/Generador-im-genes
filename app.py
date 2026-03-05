import os
from flask import Flask, render_template, request, jsonify, send_from_directory
from urllib.parse import urlparse
import requests
from bs4 import BeautifulSoup
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from io import BytesIO
import base64

app = Flask(__name__)

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
        response = requests.get(url, timeout=5)
        soup = BeautifulSoup(response.text, 'html.parser')

        titulo = soup.find('meta', property='og:title')
        titulo = titulo['content'] if titulo else soup.title.string

        url_part = urlparse(url)
        categoria = url_part.path.split('/')[1]
        
        meta_image = soup.find('meta', property='og:image')
        imagen_url = meta_image['content'] if meta_image else None

        if not imagen_url:
            return jsonify({'error': 'No se encontró una imagen para la URL'}), 404

        return jsonify({
            'titulo': titulo,
            'categoria': categoria,
            'imagen_url': imagen_url
        })
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'Error al obtener la URL: {e}'}), 500
    except Exception as e:
        return jsonify({'error': f'Error inesperado: {e}'}), 500

@app.route('/api/generate-base', methods=['POST'])
def generate_base():
    data = request.json
    imagen_url = data.get('imagen_url')

    if not imagen_url:
        return jsonify({'error': 'URL de imagen no proporcionada'}), 400

    try:
        image_response = requests.get(imagen_url, stream=True)
        img = Image.open(image_response.raw).convert("RGB")
        
        # Tamaño objetivo (cuadrado para Instagram)
        target_size = (1080, 1080)
        
        # Calcular proporciones para "cover" (escalar y recortar sin distorsionar)
        img_width, img_height = img.size
        target_width, target_height = target_size
        
        # Ratio del canvas (siempre 1 para cuadrado)
        canvas_ratio = target_width / target_height
        
        # Ratio de la imagen original
        img_ratio = img_width / img_height
        
        # Determinar el lado restrictivo para escalar
        if img_ratio > canvas_ratio:
            # Imagen más ancha: escalar por altura y recortar lados
            new_height = target_height
            new_width = int(img_width * (new_height / img_height))
        else:
            # Imagen más alta: escalar por ancho y recortar arriba/abajo
            new_width = target_width
            new_height = int(img_height * (new_width / img_width))
        
        # Redimensionar manteniendo proporción
        img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Recortar al centro para ajustarse exactamente al target_size
        left = (new_width - target_width) // 2
        top = (new_height - target_height) // 2
        right = left + target_width
        bottom = top + target_height
        img = img.crop((left, top, right, bottom))
        
        # Ahora img es exactamente 1080x1080 sin distorsión
        buffered = BytesIO()
        img.save(buffered, format="PNG") 
        base64_img = base64.b64encode(buffered.getvalue()).decode('utf-8')

        return jsonify({
            'image_base64': base64_img,
            'width': 1080,
            'height': 1080
        })

    except Exception as e:
        return jsonify({'error': f'Error al generar la imagen base: {e}'}), 500
        
if __name__ == '__main__':
    app.run(debug=True)