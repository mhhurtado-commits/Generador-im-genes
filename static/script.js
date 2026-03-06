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
let currentImageDataURL = null;
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

    try {
        // CORRECCIÓN RENDER: Nombres de fuentes exactos
        await Promise.all([
            loadFont('Economica-Regular', '/static/fonts/Economica-Regular.ttf'),
            loadFont('BebasNeue-Regular', '/static/fonts/BebasNeue-Regular.ttf'),
            loadFont('Montserrat-Regular', '/static/fonts/Montserrat-Regular.ttf')
        ]);
        console.log("Fuentes cargadas con éxito.");
    } catch (err) {
        console.error("Error al cargar las fuentes. Revisa /static/fonts/", err);
    }

    // --- EVENT LISTENERS ---
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
        if (file && file.type.match(/image.*/)) {
            const reader = new FileReader();
            reader.onload = (event) => {
                localImageDataURL = event.target.result;
                if (fabricCanvas) {
                    fabric.Image.fromURL(localImageDataURL, (img) => {
                        if (currentImage) fabricCanvas.remove(currentImage);
                        currentImage = img;
                        fabricCanvas.add(currentImage);
                        currentImage.sendToBack();
                        adjustImageToCanvas();
                        updateImageFX();
                    }, { crossOrigin: 'anonymous' });
                }
            };
            reader.readAsDataURL(file);
        }
    });

    toggleColorPicker('categoriaTextColor', 'categoriaTextColorPicker');
    toggleColorPicker('categoriaBgColor', 'categoriaBgColorPicker');
    toggleColorPicker('tituloTextColor', 'tituloTextColorPicker');
    toggleColorPicker('tituloBgColor', 'tituloBgColorPicker');

    fabricCanvas.on('object:moving', (e) => checkCenterWhileDragging(e.target));
    fabricCanvas.on('object:scaling', (e) => checkCenterWhileDragging(e.target));
    fabricCanvas.on('mouse:up', () => removeCenterLines());

    toggleMode();
});

// ---------- CARGA DE FUENTES ----------
function loadFont(fontFamily, fontPath) {
    return new Promise((resolve, reject) => {
        const font = new FontFace(fontFamily, `url(${fontPath})`);
        document.fonts.add(font);
        font.load().then(() => resolve()).catch(reject);
    });
}

// ---------- CAMBIO DE MODO ----------
function toggleMode() {
    const mode = document.getElementById('modeSelect').value;
    const linkInput = document.getElementById('linkInput');
    const manualInputs = document.getElementById('manualInputs');
    if (mode === 'link') {
        linkInput.style.display = 'block';
        manualInputs.style.display = 'none';
    } else {
        linkInput.style.display = 'none';
        manualInputs.style.display = 'block';
        if (!document.getElementById('dateInput').value) {
            document.getElementById('dateInput').value = getCurrentDateTime();
        }
    }
}

function getCurrentDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear().toString().slice(-2);
    return `DÍA: ${day}/${month}/${year} HORA: ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// ---------- LIMPIAR ----------
function clearForm() {
    document.getElementById('urlInput').value = '';
    fabricCanvas.clear();
    currentImage = null;
    currentNewsData = null;
    localImageDataURL = null;
    fabricCanvas.renderAll();
}

// ---------- GUÍAS ----------
function drawCenterLines() {
    removeCenterLines();
    const w = fabricCanvas.width, h = fabricCanvas.height;
    centerLines.v = new fabric.Line([w / 2, 0, w / 2, h], { stroke: '#00bfff', strokeWidth: 2, selectable: false, evented: false });
    centerLines.h = new fabric.Line([0, h / 2, w, h / 2], { stroke: '#00bfff', strokeWidth: 2, selectable: false, evented: false });
    fabricCanvas.add(centerLines.v, centerLines.h);
}

function removeCenterLines() {
    if (centerLines.v) fabricCanvas.remove(centerLines.v);
    if (centerLines.h) fabricCanvas.remove(centerLines.h);
    centerLines = { h: null, v: null };
}

function checkCenterWhileDragging(obj) {
    const cx = fabricCanvas.width / 2, cy = fabricCanvas.height / 2, c = obj.getCenterPoint();
    if (Math.abs(c.x - cx) < 10 || Math.abs(c.y - cy) < 10) drawCenterLines();
    else removeCenterLines();
}

// ---------- OBJETOS DINÁMICOS ----------
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
    textbox.on('changed', () => syncRectToText(rect, textbox));
    syncRectToText(rect, textbox);
    return { textbox, rect };
}

// ---------- ACTUALIZACIÓN EN VIVO ----------
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

function toggleColorPicker(selectId, pickerId) {
    const select = document.getElementById(selectId);
    const picker = document.getElementById(pickerId);
    select.addEventListener('change', () => { picker.style.display = select.value === 'custom' ? 'inline-block' : 'none'; });
}

// ---------- IMAGEN Y TAMAÑO ----------
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

// ---------- GENERACIÓN PRINCIPAL ----------
async function generatePreview() {
    const mode = document.getElementById('modeSelect').value;
    const btn = document.getElementById('generateButton');
    btn.disabled = true; btn.innerText = "Procesando...";

    if (mode === 'link') {
        const url = document.getElementById('urlInput').value;
        try {
            const res = await fetch('/api/extract', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const data = await res.json();
            currentNewsData = data;

            let imgURL = localImageDataURL;
            if (!imgURL) {
                const imgRes = await fetch('/api/process-image', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                const imgData = await imgRes.json();
                imgURL = `data:image/png;base64,${imgData.image_base64}`;
            }

            fabric.Image.fromURL(imgURL, img => {
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
                addTextAndLogoToCanvas(data, fabricCanvas.width, fabricCanvas.height);
                btn.disabled = false; btn.innerText = "Generar Preview";
            }, { crossOrigin: 'anonymous' });
        } catch (e) {
            console.error(e); alert("Error de servidor.");
            btn.disabled = false; btn.innerText = "Generar Preview";
        }
    } else { generateManualPreview(); btn.disabled = false; btn.innerText = "Generar Preview"; }
}

function addTextAndLogoToCanvas(data, w, h) {
    const catTxt = data.categoria.toUpperCase().replace(/_/g, ' ');
    const cat = createTextWithRect(catTxt, {
        id: 'categoria', left: w / 2, top: h * 0.08,
        fontFamily: 'Economica-Regular', fontSize: 55, originX: 'center', textAlign: 'center'
    }, document.getElementById('categoriaBgColor').value, '0.8', '#ffffff');
    categoriaTextbox = cat.textbox; categoriaRect = cat.rect;

    const tit = createTextWithRect(data.titulo, {
        id: 'titulo', left: w / 2, top: h / 2, width: w * 0.85,
        fontFamily: 'BebasNeue-Regular', fontSize: 85, originX: 'center', originY: 'center', textAlign: 'center'
    }, document.getElementById('tituloBgColor').value, '0.8', '#ffffff');
    tituloTextbox = tit.textbox; tituloRect = tit.rect;

    const logoP = `/static/${document.getElementById('logoSelect').value}`;
    fabric.Image.fromURL(logoP, img => {
        img.set({ left: w / 2, top: h * 0.92, originX: 'center', scaleX: 0.5, scaleY: 0.5 });
        fabricCanvas.add(img); logoObj = img;
    }, { crossOrigin: 'anonymous' });
}

function generateManualPreview() {
    fabricCanvas.clear();
    const bg = new fabric.Rect({ width: fabricCanvas.width, height: fabricCanvas.height, fill: 'black' });
    fabricCanvas.add(bg);
    const body = new fabric.Textbox(document.getElementById('bodyInput').value || "TEXTO MANUAL", {
        left: fabricCanvas.width / 2, top: fabricCanvas.height / 2, width: fabricCanvas.width * 0.8,
        fontFamily: 'BebasNeue-Regular', fontSize: 70, fill: 'white', originX: 'center', originY: 'center', textAlign: 'center'
    });
    fabricCanvas.add(body);
}

function exportImage() {
    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = `imagen-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
}
