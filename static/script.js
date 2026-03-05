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

// Nuevas variables para modo manual
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
        backgroundColor: 'var(--verde-cl)'
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
        // CORRECCIÓN CRÍTICA PARA RENDER: Nombres exactos de archivos (Case Sensitive)
        await Promise.all([
            loadFont('Economica-Regular', '/static/fonts/Economica-Regular.ttf'),
            loadFont('BebasNeue-Regular', '/static/fonts/BebasNeue-Regular.ttf'), // Antes Bebasneue-regular
            loadFont('Montserrat-Regular', '/static/fonts/Montserrat-Regular.ttf')
        ]);
        console.log("Fuentes cargadas con éxito.");
    } catch (err) {
        console.error("Error al cargar las fuentes", err);
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
    document.getElementById('categoriaTextColor').addEventListener('change', handleCategoriaTextColorChange);
    document.getElementById('categoriaBgColor').addEventListener('change', handleCategoriaBgColorChange);
    document.getElementById('categoriaBgOpacity').addEventListener('input', () => {
        document.getElementById('categoriaBgOpacityValue').textContent = document.getElementById('categoriaBgOpacity').value;
        updateCategoryStyle();
    });
    document.getElementById('tituloTextColor').addEventListener('change', handleTituloTextColorChange);
    document.getElementById('tituloBgColor').addEventListener('change', handleTituloBgColorChange);
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
    document.getElementById('themeToggle').addEventListener('change', () => {
        document.body.className = document.getElementById('themeToggle').value;
    });

    // --- Cambio de modo ---
    document.getElementById('modeSelect').addEventListener('change', toggleMode);

    // --- Carga de imagen local ---
    document.getElementById('imageUpload').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.match(/image.*/)) {
            const reader = new FileReader();
            reader.onload = (event) => {
                localImageDataURL = event.target.result;
                if (currentImage && fabricCanvas) {
                    fabric.Image.fromURL(localImageDataURL, (img) => {
                        fabricCanvas.remove(currentImage);
                        currentImage = img;
                        fabricCanvas.add(currentImage);
                        currentImage.sendToBack();
                        if (darknessOverlay) darknessOverlay.bringToFront();
                        if (categoriaRect) categoriaRect.bringToFront();
                        if (categoriaTextbox) categoriaTextbox.bringToFront();
                        if (tituloRect) tituloRect.bringToFront();
                        if (tituloTextbox) tituloTextbox.bringToFront();
                        if (logoObj) logoObj.bringToFront();
                        if (emojiObj) emojiObj.bringToFront();
                        adjustImageToCanvas();
                        updateImageFX();
                    });
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

    toggleMode(); // Inicializar modo
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
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `DÍA: ${day}/${month}/${year} HORA: ${hours}:${minutes}`;
}

// ---------- LIMPIAR FORMULARIO ----------
function clearForm() {
    document.getElementById('modeSelect').value = 'link';
    document.getElementById('urlInput').value = '';
    document.getElementById('dateInput').value = getCurrentDateTime();
    document.getElementById('headerInput').value = 'Alerta Tormenta';
    document.getElementById('bodyInput').value = '';
    document.getElementById('imageUpload').value = '';
    document.getElementById('logoSelect').value = 'logo.png';
    document.getElementById('emojiEnabled').checked = false;
    
    document.getElementById('sizeSelect').value = '1080x1080';
    document.getElementById('blurRange').value = '0';
    document.getElementById('blurValue').textContent = '0';
    document.getElementById('opacityRange').value = '0';
    document.getElementById('opacityValue').textContent = '0';
    document.getElementById('categoriaTextColor').value = '#a6ce39';
    document.getElementById('categoriaBgColor').value = '#a6ce39';
    document.getElementById('categoriaBgOpacity').value = '0.5';
    document.getElementById('categoriaBgOpacityValue').textContent = '0.5';
    document.getElementById('tituloTextColor').value = '#a6ce39';
    document.getElementById('tituloBgColor').value = '#a6ce39';
    document.getElementById('tituloBgOpacity').value = '0.5';
    document.getElementById('tituloBgOpacityValue').textContent = '0.5';

    document.getElementById('categoriaTextColorPicker').style.display = 'none';
    document.getElementById('categoriaBgColorPicker').style.display = 'none';
    document.getElementById('tituloTextColorPicker').style.display = 'none';
    document.getElementById('tituloBgColorPicker').style.display = 'none';

    fabricCanvas.clear();
    currentImage = null;
    tituloTextbox = null;
    categoriaTextbox = null;
    tituloRect = null;
    categoriaRect = null;
    logoObj = null;
    emojiObj = null;
    currentNewsData = null;
    darknessOverlay = null;
    currentImageDataURL = null;
    localImageDataURL = null;
    dateText = null;
    headerText = null;
    bodyText = null;

    fabricCanvas.setDimensions({ width: 1080, height: 1080 });
    if (canvasContainer) {
        canvasContainer.style.width = '1080px';
        canvasContainer.style.height = '1080px';
    }

    updateExportButtonPosition();
    fabricCanvas.renderAll();
    toggleMode();
}

// ---------- LÓGICA DE CENTRADO ----------
function drawCenterLines() {
    removeCenterLines();
    const w = fabricCanvas.width;
    const h = fabricCanvas.height;
    centerLines.v = new fabric.Line([w / 2, 0, w / 2, h], {
        stroke: '#00bfff',
        strokeWidth: 4,
        selectable: false,
        evented: false,
        opacity: 0.7
    });
    centerLines.h = new fabric.Line([0, h / 2, w, h / 2], {
        stroke: '#00bfff',
        strokeWidth: 4,
        selectable: false,
        evented: false,
        opacity: 0.7
    });
    fabricCanvas.add(centerLines.v);
    fabricCanvas.add(centerLines.h);
    centerLines.v.bringToFront();
    centerLines.h.bringToFront();
    fabricCanvas.renderAll();
}

function removeCenterLines() {
    [centerLines.h, centerLines.v].forEach(l => l && fabricCanvas.remove(l));
    centerLines = { h: null, v: null };
}

function checkCenterWhileDragging(obj) {
    const cx = fabricCanvas.width / 2;
    const cy = fabricCanvas.height / 2;
    const c = obj.getCenterPoint();
    const thr = 10;

    let isCenteredH = Math.abs(c.x - cx) < thr;
    let isCenteredV = Math.abs(c.y - cy) < thr;

    if (isCenteredH && isCenteredV) {
        if (!centerLines.v || !centerLines.h) drawCenterLines();
    } else if (isCenteredH) {
        if (!centerLines.v) drawCenterLines();
        if (centerLines.h) fabricCanvas.remove(centerLines.h); centerLines.h = null;
    } else if (isCenteredV) {
        if (!centerLines.h) drawCenterLines();
        if (centerLines.v) fabricCanvas.remove(centerLines.v); centerLines.v = null;
    } else {
        removeCenterLines();
    }
}

// ---------- MANEJO DE OBJETOS ----------
function syncRectToText(rect, textbox) {
    if(!rect || !textbox) return;
    const textWidth = textbox.width * textbox.scaleX;
    const textHeight = textbox.height * textbox.scaleY;
    const paddedWidth = textWidth + (textbox.padding * 2);
    const paddedHeight = textHeight + (textbox.padding * 2);

    rect.set({ 
        left: textbox.left,
        top: textbox.top,
        width: paddedWidth,
        height: paddedHeight,
        originX: textbox.originX,
        originY: textbox.originY,
        angle: textbox.angle
    });
    rect.setCoords();
    fabricCanvas.renderAll();
}

function createTextWithRect(text, opts, bgColor, bgOpacity, textColor) {
    const rect = new fabric.Rect({
        fill: bgColor === 'custom' ? document.getElementById(`${opts.id}BgColorPicker`).value : bgColor,
        opacity: parseFloat(bgOpacity),
        selectable: false,
        evented: false,
        rx: 4,
        ry: 4,
        left: opts.left,
        top: opts.top,
        originX: opts.originX || 'left',
        originY: opts.originY || 'top'
    });
    const textbox = new fabric.Textbox(text, {
        ...opts,
        fill: textColor === 'custom' ? document.getElementById(`${opts.id}TextColorPicker`).value : textColor,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        editable: true,
        padding: 20
    });

    fabricCanvas.add(rect);
    fabricCanvas.add(textbox);
    textbox.bringToFront();
    syncRectToText(rect, textbox);
    
    textbox.on('moving', () => syncRectToText(rect, textbox));
    textbox.on('scaling', () => syncRectToText(rect, textbox));
    textbox.on('changed', () => syncRectToText(rect, textbox));
    textbox.on('rotated', () => syncRectToText(rect, textbox));

    return { textbox, rect };
}

// ---------- EFECTOS DE IMAGEN ----------
function updateImageFX() {
    if (!currentImage) return;

    const blurAmount = parseFloat(document.getElementById('blurRange').value);
    const darknessOpacity = parseFloat(document.getElementById('opacityRange').value);

    currentImage.filters = [];
    if (blurAmount > 0) {
        const blurFilter = new fabric.Image.filters.Blur({ blur: blurAmount / 1000 });
        currentImage.filters.push(blurFilter);
    }
    currentImage.applyFilters();
    
    if (darknessOverlay) {
        darknessOverlay.set({ opacity: darknessOpacity });
    }

    fabricCanvas.renderAll();
}

// ---------- ACTUALIZACIÓN DE ESTILO DE TEXTO EN VIVO ----------
function updateCategoryStyle() {
    if (categoriaRect && categoriaTextbox) {
        const bgColor = document.getElementById('categoriaBgColor').value;
        const textColor = document.getElementById('categoriaTextColor').value;
        const opacity = parseFloat(document.getElementById('categoriaBgOpacity').value);
        categoriaRect.set({ 
            fill: bgColor === 'custom' ? document.getElementById('categoriaBgColorPicker').value : bgColor,
            opacity: opacity 
        });
        categoriaTextbox.set({ 
            fill: textColor === 'custom' ? document.getElementById('categoriaTextColorPicker').value : textColor 
        });
        fabricCanvas.renderAll();
    }
}

function updateTitleStyle() {
    if (tituloRect && tituloTextbox) {
        const bgColor = document.getElementById('tituloBgColor').value;
        const textColor = document.getElementById('tituloTextColor').value;
        const opacity = parseFloat(document.getElementById('tituloBgOpacity').value);
        tituloRect.set({ 
            fill: bgColor === 'custom' ? document.getElementById('tituloBgColorPicker').value : bgColor,
            opacity: opacity 
        });
        tituloTextbox.set({ 
            fill: textColor === 'custom' ? document.getElementById('tituloTextColorPicker').value : textColor 
        });
        fabricCanvas.renderAll();
    }
}

// ---------- MANEJO DE COLOR PICKERS ----------
function toggleColorPicker(selectId, pickerId) {
    const select = document.getElementById(selectId);
    const picker = document.getElementById(pickerId);
    select.addEventListener('change', () => {
        picker.style.display = select.value === 'custom' ? 'block' : 'none';
        if (select.value === 'custom') {
            picker.value = '#ffffff';
            if (selectId.includes('categoria')) updateCategoryStyle();
            if (selectId.includes('titulo')) updateTitleStyle();
        }
    });
}

function handleCategoriaTextColorChange() {
    toggleColorPicker('categoriaTextColor', 'categoriaTextColorPicker');
    updateCategoryStyle();
}

function handleCategoriaBgColorChange() {
    toggleColorPicker('categoriaBgColor', 'categoriaBgColorPicker');
    updateCategoryStyle();
}

function handleTituloTextColorChange() {
    toggleColorPicker('tituloTextColor', 'tituloTextColorPicker');
    updateTitleStyle();
}

function handleTituloBgColorChange() {
    toggleColorPicker('tituloBgColor', 'tituloBgColorPicker');
    updateTitleStyle();
}

// ---------- AJUSTE DE IMAGEN AL CANVAS ----------
function adjustImageToCanvas() {
    if (!currentImage || !fabricCanvas) return;

    const canvasWidth = fabricCanvas.width;
    const canvasHeight = fabricCanvas.height;
    const imageWidth = currentImage.width;
    const imageHeight = currentImage.height;

    const canvasRatio = canvasWidth / canvasHeight;
    const imageRatio = imageWidth / imageHeight;

    let scaleFactor;
    if (imageRatio > canvasRatio) {
        scaleFactor = canvasHeight / imageHeight;
    } else {
        scaleFactor = canvasWidth / imageWidth;
    }

    currentImage.set({
        scaleX: scaleFactor,
        scaleY: scaleFactor,
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: 'center',
        originY: 'center'
    });
    
    fabricCanvas.renderAll();
}

// ---------- REDIMENSIONAR Y REPOSICIONAR OBJETOS ----------
function resizeAllObjects(newWidth, newHeight) {
    if (darknessOverlay) {
        darknessOverlay.set({ width: newWidth, height: newHeight });
    }
    if (currentImage) adjustImageToCanvas();

    if (currentNewsData) {
        [categoriaTextbox, categoriaRect, tituloTextbox, tituloRect, logoObj, emojiObj].forEach(o => o && fabricCanvas.remove(o));
        addTextAndLogoToCanvas(currentNewsData, newWidth, newHeight);
    }

    if (dateText || headerText || bodyText) {
        [dateText, headerText, bodyText, logoObj, emojiObj].forEach(o => o && fabricCanvas.remove(o));
        if (document.getElementById('modeSelect').value === 'manual') generateManualPreview();
    }

    fabricCanvas.renderAll();
}

// ---------- AJUSTAR POSICIÓN DEL BOTÓN EXPORTAR ----------
function updateExportButtonPosition() {
    const canvasWrapper = document.getElementById('canvas-wrapper');
    if(canvasWrapper) {
        const canvasHeight = fabricCanvas.height;
        const scale = 0.5;
        canvasWrapper.style.height = `${canvasHeight * scale}px`;
    }
}

// ---------- GENERAR PREVIEW ----------
async function generatePreview() {
    const mode = document.getElementById('modeSelect').value;
    const btn = document.getElementById('generateButton');
    btn.disabled = true;
    btn.innerText = "Generando...";

    fabricCanvas.clear();
    fabricCanvas.discardActiveObject().renderAll();

    if (mode === 'link') {
        const url = document.getElementById('urlInput').value;
        if (!url) { alert('Ingresa un URL'); btn.disabled = false; btn.innerText = "Generar Preview"; return; }

        try {
            const extractRes = await fetch('/api/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            const datos = await extractRes.json();
            if (datos.error) throw new Error(datos.error);

            currentNewsData = datos;

            let imageDataURL = localImageDataURL;
            if (!imageDataURL) {
                // CORRECCIÓN: Asegurar llamada al endpoint de Render
                const genRes = await fetch('/api/generate-base', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datos)
                });
                const imgData = await genRes.json();
                imageDataURL = `data:image/png;base64,${imgData.image_base64}`;
                currentImageDataURL = imageDataURL;
            }

            fabric.Image.fromURL(imageDataURL, img => {
                currentImage = img;
                darknessOverlay = new fabric.Rect({
                    left: 0, top: 0, width: fabricCanvas.width, height: fabricCanvas.height,
                    fill: 'black', opacity: parseFloat(document.getElementById('opacityRange').value),
                    selectable: false, evented: false
                });

                fabricCanvas.add(currentImage);
                fabricCanvas.add(darknessOverlay);
                adjustImageToCanvas();
                updateImageFX();
                addTextAndLogoToCanvas(currentNewsData, fabricCanvas.width, fabricCanvas.height);
                addEmojiIfEnabled();
                updateExportButtonPosition();
                btn.disabled = false;
                btn.innerText = "Generar Preview";
            }, { crossOrigin: 'anonymous' }); 

        } catch (err) {
            console.error(err);
            alert('Error: ' + err.message);
            btn.disabled = false;
            btn.innerText = "Generar Preview";
        }
    } else if (mode === 'manual') {
        generateManualPreview();
        btn.disabled = false;
        btn.innerText = "Generar Preview";
    }
}

// ---------- MODO MANUAL: GENERAR ALERTA ----------
function generateManualPreview() {
    const date = document.getElementById('dateInput').value || getCurrentDateTime();
    const header = document.getElementById('headerInput').value || 'Alerta Tormenta';
    const body = document.getElementById('bodyInput').value || '';

    const blackBackground = new fabric.Rect({
        left: 0, top: 0, width: fabricCanvas.width, height: fabricCanvas.height,
        fill: 'black', selectable: false, evented: false
    });
    fabricCanvas.add(blackBackground);

    dateText = new fabric.Textbox(date, {
        left: 20, top: 20, fontFamily: 'BebasNeue-Regular', fontSize: 40, fill: 'white', originX: 'left'
    });
    fabricCanvas.add(dateText);

    headerText = new fabric.Textbox(header, {
        left: fabricCanvas.width / 2, top: 90, fontFamily: 'BebasNeue-Regular',
        fontSize: 60, fill: '#cc0000', textAlign: 'center', originX: 'center'
    });
    fabricCanvas.add(headerText);

    bodyText = new fabric.Textbox(body, {
        left: fabricCanvas.width / 2, top: 170, width: fabricCanvas.width * 0.8,
        fontFamily: 'BebasNeue-Regular', fontSize: 70, fill: 'white', textAlign: 'center', originX: 'center'
    });
    fabricCanvas.add(bodyText);

    const logoPath = document.getElementById('logoSelect').value;
    fabric.Image.fromURL(`/static/${logoPath}`, logo => {
        if (logo) {
            logo.set({
                left: fabricCanvas.width / 2, top: fabricCanvas.height * 0.9,
                scaleX: 250 / logo.width, scaleY: 60 / logo.height,
                originX: 'center', originY: 'center',
                shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 10, offsetX: 5, offsetY: 5 })
            });
            fabricCanvas.add(logo);
            logoObj = logo;
            addEmojiIfEnabled();
        }
    }, { crossOrigin: 'anonymous' }); 

    fabricCanvas.renderAll();
    updateExportButtonPosition();
}

// ---------- AGREGAR EMOJI CENTRADO ARRIBA ----------
function addEmojiIfEnabled() {
    if (emojiObj) fabricCanvas.remove(emojiObj);
    if (document.getElementById('emojiEnabled').checked) {
        const emojiURL = document.getElementById('emojiSelect').value;
        fabric.Image.fromURL(emojiURL, emoji => {
            if (emoji) {
                emoji.set({
                    left: fabricCanvas.width / 2, top: 120, scaleX: 0.9, scaleY: 0.9,
                    originX: 'center', originY: 'center',
                    shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.6)', blur: 15, offsetX: 5, offsetY: 5 })
                });
                fabricCanvas.add(emoji);
                emoji.bringToFront();
                emojiObj = emoji;
                fabricCanvas.renderAll();
            }
        }, { crossOrigin: 'anonymous' }); 
    }
}

// ---------- CAMBIAR TAMAÑO ----------
function changeSize() {
    const [newW, newH] = document.getElementById('sizeSelect').value.split('x').map(Number);
    fabricCanvas.setDimensions({ width: newW, height: newH });
    if (canvasContainer) {
        canvasContainer.style.width = `${newW}px`;
        canvasContainer.style.height = `${newH}px`;
    }
    resizeAllObjects(newW, newH);
    updateExportButtonPosition();
}

// ---------- EXPORTAR IMAGEN ----------
function exportImage() {
    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1 });
    const link = document.createElement('a');
    link.download = `preview-${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ---------- AÑADIR TEXTO Y LOGO (MODO LINK) ----------
function addTextAndLogoToCanvas(data, width, height) {
    if (!data) return;

    const sanitizedCategory = data.categoria.replace(/_/g, ' ');
    const capitalized = sanitizedCategory.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const cat = createTextWithRect(capitalized, {
        id: 'categoria', left: width / 2, top: height * 0.05,
        fontFamily: 'Economica-Regular', fontSize: 66, textAlign: 'center', width: 550, originX: 'center'
    }, document.getElementById('categoriaBgColor').value, document.getElementById('categoriaBgOpacity').value, document.getElementById('categoriaTextColor').value);
    categoriaTextbox = cat.textbox;
    categoriaRect = cat.rect;

    const tit = createTextWithRect(data.titulo, {
        id: 'titulo', left: width / 2, top: height / 2, width: width * 0.8,
        fontFamily: 'BebasNeue-Regular', fontSize: 70, textAlign: 'center', originX: 'center', originY: 'center'
    }, document.getElementById('tituloBgColor').value, document.getElementById('tituloBgOpacity').value, document.getElementById('tituloTextColor').value);
    tituloTextbox = tit.textbox;
    tituloRect = tit.rect;

    const logoPath = document.getElementById('logoSelect').value;
    fabric.Image.fromURL(`/static/${logoPath}`, logo => {
        if (logo) {
            logo.set({
                left: width / 2, top: height * 0.9,
                scaleX: 330 / logo.width, scaleY: 79 / logo.height,
                originX: 'center', originY: 'center',
                shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 10, offsetX: 5, offsetY: 5 })
            });
            fabricCanvas.add(logo);
            logoObj = logo;
            addEmojiIfEnabled();
        }
    }, { crossOrigin: 'anonymous' }); 
}
