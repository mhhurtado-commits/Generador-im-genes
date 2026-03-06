// Variables globales
let fabricCanvas = null;
let currentImage = null;
let canvasContainer = null;
let tituloTextbox = null;
let categoriaTextbox = null;
let tituloRect = null;
let categoriaRect = null;
let centerLines = { h: null, v: null };
let logoObj = null;
let emojiObj = null;
let currentNewsData = null;
let darknessOverlay = null;
let localImageDataURL = null;

// Variables para modo manual
let dateText = null;
let headerText = null;
let bodyText = null;

// ---------- INICIALIZACIÓN ----------
document.addEventListener('DOMContentLoaded', async () => {
    const canvasEl = document.getElementById('canvas');
    fabricCanvas = new fabric.Canvas(canvasEl, {
        width: 1080,
        height: 1080,
        preserveObjectStacking: true,
        selection: true,
        backgroundColor: '#1a1a1a'
    });
    
    canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.style.width = `${fabricCanvas.width}px`;
        canvasContainer.style.height = `${fabricCanvas.height}px`;
    }

    fabric.Object.prototype.set({
        borderColor: '#8fb82d',
        cornerColor: '#8fb82d',
        cornerSize: 12,
        borderScaleFactor: 2,
        transparentCorners: false
    });

    // CARGA DE FUENTES (Case Sensitive para Render/Linux)
    try {
        await Promise.all([
            loadFont('Economica-Regular', '/static/fonts/Economica-Regular.ttf'),
            loadFont('BebasNeue-Regular', '/static/fonts/BebasNeue-Regular.ttf'),
            loadFont('Montserrat-Regular', '/static/fonts/Montserrat-Regular.ttf')
        ]);
        console.log("Fuentes cargadas correctamente.");
    } catch (err) {
        console.error("Error cargando fuentes:", err);
    }

    // --- EVENT LISTENERS ---
    setupEventListeners();
    toggleMode();
});

function setupEventListeners() {
    document.getElementById('blurRange').addEventListener('input', () => {
        document.getElementById('blurValue').textContent = document.getElementById('blurRange').value;
        updateImageFX();
    });
    document.getElementById('opacityRange').addEventListener('input', () => {
        document.getElementById('opacityValue').textContent = document.getElementById('opacityRange').value;
        updateImageFX();
    });
    
    document.getElementById('categoriaTextColor').addEventListener('change', updateCategoryStyle);
    document.getElementById('categoriaBgColor').addEventListener('change', updateCategoryStyle);
    document.getElementById('categoriaBgOpacity').addEventListener('input', () => {
        document.getElementById('categoriaBgOpacityValue').textContent = document.getElementById('categoriaBgOpacity').value;
        updateCategoryStyle();
    });
    
    document.getElementById('tituloTextColor').addEventListener('change', updateTitleStyle);
    document.getElementById('tituloBgColor').addEventListener('change', updateTitleStyle);
    document.getElementById('tituloBgOpacity').addEventListener('input', () => {
        document.getElementById('tituloBgOpacityValue').textContent = document.getElementById('tituloBgOpacity').value;
        updateTitleStyle();
    });

    document.getElementById('categoriaTextColorPicker').addEventListener('input', updateCategoryStyle);
    document.getElementById('categoriaBgColorPicker').addEventListener('input', updateCategoryStyle);
    document.getElementById('tituloTextColorPicker').addEventListener('input', updateTitleStyle);
    document.getElementById('tituloBgColorPicker').addEventListener('input', updateTitleStyle);

    document.getElementById('clearButton').addEventListener('click', clearForm);
    document.getElementById('generateButton').addEventListener('click', generatePreview);
    document.getElementById('sizeSelect').addEventListener('change', changeSize);
    document.getElementById('modeSelect').addEventListener('change', toggleMode);

    // Carga de imagen local
    document.getElementById('imageUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (f) => {
                localImageDataURL = f.target.result;
                if (currentImage) fabricCanvas.remove(currentImage);
                fabric.Image.fromURL(localImageDataURL, img => {
                    currentImage = img;
                    fabricCanvas.add(currentImage);
                    currentImage.sendToBack();
                    adjustImageToCanvas();
                }, { crossOrigin: 'anonymous' });
            };
            reader.readAsDataURL(file);
        }
    });

    toggleColorPicker('categoriaTextColor', 'categoriaTextColorPicker');
    toggleColorPicker('categoriaBgColor', 'categoriaBgColorPicker');
    toggleColorPicker('tituloTextColor', 'tituloTextColorPicker');
    toggleColorPicker('tituloBgColor', 'tituloBgColorPicker');

    fabricCanvas.on('object:moving', (e) => checkCenterWhileDragging(e.target));
    fabricCanvas.on('mouse:up', () => removeCenterLines());
}

// ---------- FUNCIONES DE APOYO ----------
function loadFont(name, url) {
    const f = new FontFace(name, `url(${url})`);
    return f.load().then(loaded => document.fonts.add(loaded));
}

function toggleMode() {
    const isLink = document.getElementById('modeSelect').value === 'link';
    document.getElementById('linkInput').style.display = isLink ? 'block' : 'none';
    document.getElementById('manualInputs').style.display = isLink ? 'none' : 'block';
}

function getCurrentDateTime() {
    const now = new Date();
    return `DÍA: ${now.toLocaleDateString()} HORA: ${now.getHours()}:${now.getMinutes()}`;
}

function clearForm() {
    fabricCanvas.clear();
    currentImage = null;
    localImageDataURL = null;
    document.getElementById('urlInput').value = '';
    fabricCanvas.renderAll();
}

// ---------- LÓGICA DE FABRIC JS ----------
function syncRectToText(rect, textbox) {
    if (!rect || !textbox) return;
    rect.set({
        left: textbox.left, top: textbox.top,
        width: (textbox.width * textbox.scaleX) + (textbox.padding * 2),
        height: (textbox.height * textbox.scaleY) + (textbox.padding * 2),
        originX: textbox.originX, originY: textbox.originY, angle: textbox.angle
    });
    rect.setCoords();
}

function createTextWithRect(text, opts, bgColor, bgOpacity, textColor) {
    const rect = new fabric.Rect({
        fill: bgColor === 'custom' ? document.getElementById(`${opts.id}BgColorPicker`).value : bgColor,
        opacity: parseFloat(bgOpacity), selectable: false, evented: false, rx: 8, ry: 8
    });
    const textbox = new fabric.Textbox(text, {
        ...opts, fill: textColor === 'custom' ? document.getElementById(`${opts.id}TextColorPicker`).value : textColor,
        padding: 20
    });
    fabricCanvas.add(rect, textbox);
    textbox.on('moving', () => syncRectToText(rect, textbox));
    textbox.on('scaling', () => syncRectToText(rect, textbox));
    syncRectToText(rect, textbox);
    return { textbox, rect };
}

function updateCategoryStyle() {
    if (!categoriaRect) return;
    const bg = document.getElementById('categoriaBgColor').value;
    const tc = document.getElementById('categoriaTextColor').value;
    categoriaRect.set({ 
        fill: bg === 'custom' ? document.getElementById('categoriaBgColorPicker').value : bg,
        opacity: parseFloat(document.getElementById('categoriaBgOpacity').value)
    });
    categoriaTextbox.set({ fill: tc === 'custom' ? document.getElementById('categoriaTextColorPicker').value : tc });
    fabricCanvas.renderAll();
}

function updateTitleStyle() {
    if (!tituloRect) return;
    const bg = document.getElementById('tituloBgColor').value;
    const tc = document.getElementById('tituloTextColor').value;
    tituloRect.set({ 
        fill: bg === 'custom' ? document.getElementById('tituloBgColorPicker').value : bg,
        opacity: parseFloat(document.getElementById('tituloBgOpacity').value)
    });
    tituloTextbox.set({ fill: tc === 'custom' ? document.getElementById('tituloTextColorPicker').value : tc });
    fabricCanvas.renderAll();
}

function toggleColorPicker(sId, pId) {
    const s = document.getElementById(sId), p = document.getElementById(pId);
    s.addEventListener('change', () => p.style.display = s.value === 'custom' ? 'inline-block' : 'none');
}

// ---------- GENERACIÓN ----------
async function generatePreview() {
    const btn = document.getElementById('generateButton');
    const mode = document.getElementById('modeSelect').value;
    btn.disabled = true; btn.innerText = "Procesando...";

    if (mode === 'link') {
        const url = document.getElementById('urlInput').value;
        try {
            // 1. Extraer datos
            const res = await fetch('/api/extract', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            currentNewsData = data;

            // 2. Procesar imagen (enviamos imagen_url al nuevo app.py)
            let imgDataURL = localImageDataURL;
            if (!imgDataURL) {
                const imgRes = await fetch('/api/process-image', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ imagen_url: data.imagen_url })
                });
                const imgJson = await imgRes.json();
                imgDataURL = `data:image/jpeg;base64,${imgJson.image_base64}`;
            }

            // 3. Dibujar en Canvas
            fabric.Image.fromURL(imgDataURL, img => {
                fabricCanvas.clear();
                currentImage = img;
                darknessOverlay = new fabric.Rect({
                    width: fabricCanvas.width, height: fabricCanvas.height, fill: 'black',
                    opacity: parseFloat(document.getElementById('opacityRange').value), selectable: false
                });
                
                fabricCanvas.add(currentImage, darknessOverlay);
                currentImage.sendToBack();
                adjustImageToCanvas();
                updateImageFX();
                
                // Añadir textos al final para que estén arriba
                addTextAndLogoToCanvas(data, fabricCanvas.width, fabricCanvas.height);
                
                btn.disabled = false; btn.innerText = "Generar Preview";
            }, { crossOrigin: 'anonymous' });

        } catch (e) {
            alert("Error: " + e.message);
            btn.disabled = false; btn.innerText = "Generar Preview";
        }
    } else {
        generateManualPreview();
        btn.disabled = false; btn.innerText = "Generar Preview";
    }
}

function addTextAndLogoToCanvas(data, w, h) {
    // Categoría con fuente Economica
    const catTxt = data.categoria.toUpperCase().replace(/_/g, ' ');
    const cat = createTextWithRect(catTxt, {
        id: 'categoria', left: w / 2, top: h * 0.08,
        fontFamily: 'Economica-Regular', fontSize: 55, originX: 'center', textAlign: 'center'
    }, document.getElementById('categoriaBgColor').value, '0.8', '#ffffff');
    categoriaTextbox = cat.textbox; categoriaRect = cat.rect;

    // Título con fuente BebasNeue
    const tit = createTextWithRect(data.titulo, {
        id: 'titulo', left: w / 2, top: h / 2, width: w * 0.85,
        fontFamily: 'BebasNeue-Regular', fontSize: 85, originX: 'center', originY: 'center', textAlign: 'center'
    }, document.getElementById('tituloBgColor').value, '0.8', '#ffffff');
    tituloTextbox = tit.textbox; tituloRect = tit.rect;

    // Logo
    const logoP = `/static/${document.getElementById('logoSelect').value}`;
    fabric.Image.fromURL(logoP, img => {
        img.set({ left: w / 2, top: h * 0.92, originX: 'center', scaleX: 0.5, scaleY: 0.5 });
        fabricCanvas.add(img);
        img.bringToFront();
    }, { crossOrigin: 'anonymous' });
}

function adjustImageToCanvas() {
    if (!currentImage) return;
    const scale = Math.max(fabricCanvas.width / currentImage.width, fabricCanvas.height / currentImage.height);
    currentImage.set({ scaleX: scale, scaleY: scale, left: fabricCanvas.width/2, top: fabricCanvas.height/2, originX: 'center', originY: 'center' });
    fabricCanvas.renderAll();
}

function updateImageFX() {
    if (!currentImage) return;
    const b = parseFloat(document.getElementById('blurRange').value);
    currentImage.filters = b > 0 ? [new fabric.Image.filters.Blur({ blur: b / 100 })] : [];
    currentImage.applyFilters();
    if (darknessOverlay) darknessOverlay.set({ opacity: parseFloat(document.getElementById('opacityRange').value) });
    fabricCanvas.renderAll();
}

function changeSize() {
    const [w, h] = document.getElementById('sizeSelect').value.split('x').map(Number);
    fabricCanvas.setDimensions({ width: w, height: h });
    if (canvasContainer) { canvasContainer.style.width = `${w}px`; canvasContainer.style.height = `${h}px`; }
    if (currentImage) adjustImageToCanvas();
    if (darknessOverlay) darknessOverlay.set({ width: w, height: h });
}

function exportImage() {
    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = `noticia-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}

// ---------- GUÍAS DE CENTRADO ----------
function checkCenterWhileDragging(obj) {
    const cx = fabricCanvas.width / 2, cy = fabricCanvas.height / 2, c = obj.getCenterPoint();
    removeCenterLines();
    if (Math.abs(c.x - cx) < 15) {
        centerLines.v = new fabric.Line([cx, 0, cx, fabricCanvas.height], { stroke: '#00bfff', strokeWidth: 2, selectable: false });
        fabricCanvas.add(centerLines.v);
    }
    if (Math.abs(c.y - cy) < 15) {
        centerLines.h = new fabric.Line([0, cy, fabricCanvas.width, cy], { stroke: '#00bfff', strokeWidth: 2, selectable: false });
        fabricCanvas.add(centerLines.h);
    }
}

function removeCenterLines() {
    if (centerLines.v) fabricCanvas.remove(centerLines.v);
    if (centerLines.h) fabricCanvas.remove(centerLines.h);
    centerLines = { h: null, v: null };
}
