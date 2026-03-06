<!-- index.html con modificaciones para funcionamiento online -->
<!-- No se requieren cambios significativos en este archivo, ya que las rutas son relativas y el script se carga desde /static/script.js. -->
<!-- Si el frontend está separado (ej: GitHub Pages), ajusta el <script src> a una URL absoluta si es necesario, pero asumiendo despliegue integrado en Render, está bien. -->
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generador de Previews</title>
    <style>
        :root {
            --verde-mm: #a6ce39;
            --verde-osc: #8fb82d;
            --verde-cl: #f5f9e8;
            --bg-light: #f5f9e8;
            --bg-dark: #333;
            --text-light: #333;
            --text-dark: #fff;
            --control-bg-light: #fff;
            --control-bg-dark: #444;
        }

        body {
            font-family: 'Montserrat-Regular', Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: var(--bg-light);
            color: var(--text-light);
        }

        body.dark {
            background-color: var(--bg-dark);
            color: var(--text-dark);
        }

        body.dark #controls {
            background-color: var(--control-bg-dark);
        }

        #app-container {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            gap: 30px;
            padding: 20px;
            flex-wrap: wrap;
        }

        #canvas-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            max-width: 600px;
        }

        .logo-wrapper {
            position: relative;
            display: inline-block;
            background: rgba(143, 184, 45, 0.7);
            border-radius: 8px;
            padding: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border: 3px solid white;
        }

        #canvas-section img.logo {
            width: 200px;
            margin-bottom: 10px;
            filter: brightness(1.2);
        }

        #canvas-wrapper {
            position: relative;
            display: inline-block;
            height: auto;
        }

        #canvas-container {
            position: relative;
            border: 1px solid #ccc;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            background-color: white;
            transform: scale(0.5);
            transform-origin: top center;
            transition: filter 0.3s ease;
        }

        #exportButton {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            margin-bottom: 2px;
            background-color: var(--verde-mm);
            color: white;
            border: none;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            transition: background-color 0.3s ease;
            z-index: 5;
        }

        #exportButton:hover {
            background-color: var(--verde-osc);
        }

        #controls {
            display: flex;
            flex-direction: column;
            gap: 15px;
            width: 100%;
            max-width: 400px;
            padding: 20px;
            background-color: var(--control-bg-light);
            border-radius: 8px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            position: relative;
            z-index: 10;
        }

        .control-group {
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        label {
            font-weight: bold;
        }

        input[type="range"] {
            width: 100%;
            -webkit-appearance: none;
            height: 8px;
            border-radius: 5px;
            background: #d3d3d3;
            outline: none;
            opacity: 0.7;
            transition: opacity 0.2s ease;
        }

        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--verde-mm);
            cursor: pointer;
        }

        input[type="range"]::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: var(--verde-mm);
            cursor: pointer;
        }

        button, input[type="text"], select, input[type="color"], input[type="file"] {
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-family: 'Montserrat-Regular', Arial, sans-serif;
            font-size: 1em;
            transition: background-color 0.3s ease, border-color 0.3s ease;
        }

        button {
            background-color: var(--verde-mm);
            color: white;
            border: none;
            cursor: pointer;
        }

        button:hover {
            background-color: var(--verde-osc);
        }

        .color-picker {
            display: none;
            margin-top: 5px;
        }

        .fabric-canvas-wrapper {
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
        }

        .value-display {
            font-size: 0.9em;
            margin-left: 10px;
        }
    </style>
</head>
<body class="light">
    <div id="app-container">
        <div id="canvas-section">
            <div class="logo-wrapper">
                <img src="/static/logo.png" alt="Logo" class="logo">
            </div>
            <h1>Generador de Previews</h1>
            <div id="canvas-wrapper">
                <div id="canvas-container">
                    <canvas id="canvas"></canvas>
                </div>
                <button id="exportButton" onclick="exportImage()">Exportar Imagen</button>
            </div>
        </div>
        <div id="controls">
            <div class="control-group">
                <label for="urlInput">URL de la noticia:</label>
                <input type="text" id="urlInput" placeholder="https://ejemplo.com/noticia">
            </div>
            <div class="control-group">
                <label for="imageUpload">Imagen de portada (opcional):</label>
                <input type="file" id="imageUpload" accept="image/*">
            </div>
            <div class="control-group">
                <label for="themeToggle">Tema:</label>
                <select id="themeToggle">
                    <option value="light" selected>Claro</option>
                    <option value="dark">Oscuro</option>
                </select>
            </div>
            <div class="control-group">
                <label for="sizeSelect">Tamaño:</label>
                <select id="sizeSelect">
                    <option value="1080x1080">Cuadrado (Instagram Post)</option>
                    <option value="1080x1350">Instagram Portrait</option>
                    <option value="1080x1920">Instagram Historia</option>
                </select>
            </div>
            <div class="control-group">
                <label for="blurRange">Desenfoque de la imagen: <span id="blurValue" class="value-display">0</span></label>
                <input type="range" id="blurRange" min="0" max="100" value="0">
            </div>
            <div class="control-group">
                <label for="opacityRange">Opacidad del fondo: <span id="opacityValue" class="value-display">0</span></label>
                <input type="range" id="opacityRange" min="0" max="1" step="0.05" value="0">
            </div>
            <div class="control-group">
                <label for="categoriaTextColor">Color del texto de la categoría:</label>
                <select id="categoriaTextColor">
                    <option value="#ffffff">Blanco</option>
                    <option value="#000000">Negro</option>
                    <option value="#a6ce39" selected>Verde Claro (Corporativo)</option>
                    <option value="#8fb82d">Verde Oscuro (Corporativo)</option>
                    <option value="custom">Personalizado</option>
                </select>
                <input type="color" id="categoriaTextColorPicker" class="color-picker">
            </div>
            <div class="control-group">
                <label for="categoriaBgColor">Color de fondo de la categoría:</label>
                <select id="categoriaBgColor">
                    <option value="#a6ce39" selected>Verde Claro (Corporativo)</option>
                    <option value="#8fb82d">Verde Oscuro (Corporativo)</option>
                    <option value="#ffffff">Blanco</option>
                    <option value="#000000">Negro</option>
                    <option value="custom">Personalizado</option>
                </select>
                <input type="color" id="categoriaBgColorPicker" class="color-picker">
            </div>
            <div class="control-group">
                <label for="categoriaBgOpacity">Opacidad del fondo de la categoría: <span id="categoriaBgOpacityValue" class="value-display">0.5</span></label>
                <input type="range" id="categoriaBgOpacity" min="0" max="1" step="0.05" value="0.5">
            </div>
            <div class="control-group">
                <label for="tituloTextColor">Color del texto del título:</label>
                <select id="tituloTextColor">
                    <option value="#ffffff">Blanco</option>
                    <option value="#000000">Negro</option>
                    <option value="#a6ce39" selected>Verde Claro (Corporativo)</option>
                    <option value="#8fb82d">Verde Oscuro (Corporativo)</option>
                    <option value="custom">Personalizado</option>
                </select>
                <input type="color" id="tituloTextColorPicker" class="color-picker">
            </div>
            <div class="control-group">
                <label for="tituloBgColor">Color de fondo del título:</label>
                <select id="tituloBgColor">
                    <option value="#8fb82d">Verde Oscuro (Corporativo)</option>
                    <option value="#a6ce39" selected>Verde Claro (Corporativo)</option>
                    <option value="#ffffff">Blanco</option>
                    <option value="#000000">Negro</option>
                    <option value="custom">Personalizado</option>
                </select>
                <input type="color" id="tituloBgColorPicker" class="color-picker">
            </div>
            <div class="control-group">
                <label for="tituloBgOpacity">Opacidad del fondo del título: <span id="tituloBgOpacityValue" class="value-display">0.5</span></label>
                <input type="range" id="tituloBgOpacity" min="0" max="1" step="0.05" value="0.5">
            </div>
            <div class="control-group">
                <label for="templateName">Nombre de la plantilla:</label>
                <input type="text" id="templateName" placeholder="Ej. Instagram Story">
                <button id="saveTemplate">Guardar Plantilla</button>
                <select id="loadTemplate">
                    <option value="">Seleccionar Plantilla</option>
                </select>
            </div>
            <button id="generateButton">Generar Preview</button>
            <button id="clearButton">Limpiar</button>
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
    <script src="/static/script.js"></script>
</body>
</html>
