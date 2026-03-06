// static/script.js - Versión completa y corregida para Render

const baseURL = window.location.origin;

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
let currentNewsData = null;
let darknessOverlay = null;
let currentImageDataURL = null;
let localImageDataURL = null;

// ──────────────────────────────────────────────────────────────
// INICIALIZACIÓN
// ──────────────────────────────────────────────────────────────
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

    // Cargar fuentes
    try {
        await Promise.all([
            loadFont('Economica-Regular', '/static/fonts/Economica-Regular.ttf'),
            loadFont('Bebasneue-regular', '/static/fonts/Bebasneue-regular.ttf'),
            loadFont('Montserrat-Regular', '/static/fonts/Montserrat-Regular.ttf')
        ]);
        console.log("Fuentes cargadas correctamente");
    } catch (err) {
        console.error("Error al cargar fuentes:", err);
    }

    // Cargar tema guardado
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.className = savedTheme;
    const themeSelect = document.getElementById('themeToggle');
    if (themeSelect) themeSelect.value = savedTheme;

    // Eventos
    themeSelect?.addEventListener('change', () => {
        const newTheme = themeSelect.value;
        document.body.className = newTheme;
        localStorage.setItem('theme', newTheme);
    });

    document.getElementById('blurRange')?.addEventListener('input', () => {
        document.getElementById('blurValue').textContent = document.getElementById('blurRange').value;
        updateImageFX();
    });

    document.getElementById('opacityRange')?.addEventListener('input', () => {
        document.getElementById('opacityValue').textContent = document.getElementById('opacityRange').value;
        updateImageFX();
    });

    document.getElementById('categoriaTextColor')?.addEventListener('change', handleCategoriaTextColorChange);
    document.getElementById('categoriaBgColor')?.addEventListener('change', handleCategoriaBgColorChange);
    document.getElementById('categoriaBgOpacity')?.addEventListener('input', () => {
        document.getElementById('categoriaBgOpacityValue').textContent = document.getElementById('categoriaBgOpacity').value;
        updateCategoryStyle();
    });

    document.getElementById('tituloTextColor')?.addEventListener('change', handleTituloTextColorChange);
    document.getElementById('tituloBgColor')?.addEventListener('change', handleTituloBgColorChange);
    document.getElementById('tituloBgOpacity')?.addEventListener('input', () => {
        document.getElementById('tituloBgOpacityValue').textContent = document.getElementById('tituloBgOpacity').value;
        updateTitleStyle();
    });

    ['categoriaTextColorPicker', 'categoriaBgColorPicker', 'tituloTextColorPicker', 'tituloBgColorPicker']
        .forEach(id => document.getElementById(id)?.addEventListener('input', () => {
            if (id.includes('categoria')) updateCategoryStyle();
            if (id.includes('titulo')) updateTitleStyle();
        }));

    document.getElementById('clearButton')?.addEventListener('click', clearForm);
    document.getElementById('generateButton')?.addEventListener('click', generatePreview);
    document.getElementById('sizeSelect')?.addEventListener('change', changeSize);

    // Guardar plantilla
    document.getElementById('saveTemplate')?.addEventListener('click', () => {
        const name = document.getElementById('templateName')?.value.trim();
        if (!name) return alert('Ingresa un nombre para la plantilla');
        
        const config = {
            size: document.getElementById('sizeSelect')?.value,
            blur: document.getElementById('blurRange')?.value,
            opacity: document.getElementById('opacityRange')?.value,
            categoriaTextColor: document.getElementById('categoriaTextColor')?.value,
            categoriaTextColorPicker: document.getElementById('categoriaTextColor')?.value === 'custom' ? document.getElementById('categoriaTextColorPicker')?.value : null,
            categoriaBgColor: document.getElementById('categoriaBgColor')?.value,
            categoriaBgColorPicker: document.getElementById('categoriaBgColor')?.value === 'custom' ? document.getElementById('categoriaBgColorPicker')?.value : null,
            categoriaBgOpacity: document.getElementById('categoriaBgOpacity')?.value,
            tituloTextColor: document.getElementById('tituloTextColor')?.value,
            tituloTextColorPicker: document.getElementById('tituloTextColor')?.value === 'custom' ? document.getElementById('tituloTextColorPicker')?.value : null,
            tituloBgColor: document.getElementById('tituloBgColor')?.value,
            tituloBgColorPicker: document.getElementById('tituloBgColor')?.value === 'custom' ? document.getElementById('tituloBgColorPicker')?.value : null,
            tituloBgOpacity: document.getElementById('tituloBgOpacity')?.value
        };

        let templates = JSON.parse(localStorage.getItem('templates') || '{}');
        templates[name] = config;
        localStorage.setItem('templates', JSON.stringify(templates));
        updateTemplateSelect();
        document.getElementById('templateName').value = '';
    });

    // Cargar plantilla
    document.getElementById('loadTemplate')?.addEventListener('change', (e) => {
        const name = e.target.value;
        if (!name) return;
        const templates = JSON.parse(localStorage.getItem('templates') || '{}');
        const config = templates[name];
        if (!config) return;

        Object.assign(document.getElementById('sizeSelect') || {}, {value: config.size});
        document.getElementById('blurRange').value = config.blur;
        document.getElementById('blurValue').textContent = config.blur;
        document.getElementById('opacityRange').value = config.opacity;
        document.getElementById('opacityValue').textContent = config.opacity;

        // Colores categoría
        document.getElementById('categoriaTextColor').value = config.categoriaTextColor;
        if (document.getElementById('categoriaTextColorPicker')) {
            document.getElementById('categoriaTextColorPicker').value = config.categoriaTextColorPicker || '#ffffff';
            document.getElementById('categoriaTextColorPicker').style.display = config.categoriaTextColor === 'custom' ? 'block' : 'none';
        }

        document.getElementById('categoriaBgColor').value = config.categoriaBgColor;
        if (document.getElementById('categoriaBgColorPicker')) {
            document.getElementById('categoriaBgColorPicker').value = config.categoriaBgColorPicker || '#ffffff';
            document.getElementById('categoriaBgColorPicker').style.display = config.categoriaBgColor === 'custom' ? 'block' : 'none';
        }
        document.getElementById('categoriaBgOpacity').value = config.categoriaBgOpacity;
        document.getElementById('categoriaBgOpacityValue').textContent = config.categoriaBgOpacity;

        // Colores título (similar)
        document.getElementById('tituloTextColor').value = config.tituloTextColor;
        if (document.getElementById('tituloTextColorPicker')) {
            document.getElementById('tituloTextColorPicker').value = config.tituloTextColorPicker || '#ffffff';
            document.getElementById('tituloTextColorPicker').style.display = config.tituloTextColor === 'custom' ? 'block' : 'none';
        }

        document.getElementById('tituloBgColor').value = config.tituloBgColor;
        if (document.getElementById('tituloBgColorPicker')) {
            document.getElementById('tituloBgColorPicker').value = config.tituloBgColorPicker || '#ffffff';
            document.getElementById('tituloBgColorPicker').style.display = config.tituloBgColor === 'custom' ? 'block' : 'none';
        }
        document.getElementById('tituloBgOpacity').value = config.tituloBgOpacity;
        document.getElementById('tituloBgOpacityValue').textContent = config.tituloBgOpacity;

        updateCategoryStyle();
        updateTitleStyle();
        updateImageFX();
        changeSize();
    });

    // Subir imagen local
    document.getElementById('imageUpload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file || !file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            localImageDataURL = ev.target.result;
            if (currentImage && fabricCanvas) {
                fabric.Image.fromURL(localImageDataURL, (img) => {
                    fabricCanvas.remove(currentImage);
                    currentImage = img;
                    fabricCanvas.add(currentImage);
                    currentImage.sendToBack();
                    darknessOverlay?.bringToFront();
                    categoriaRect?.bringToFront();
                    categoriaTextbox?.bringToFront();
                    tituloRect?.bringToFront();
                    tituloTextbox?.bringToFront();
                    logoObj?.bringToFront();
                    adjustImageToCanvas();
                    updateImageFX();
                });
            }
        };
        reader.readAsDataURL(file);
    });

    toggleColorPicker('categoriaTextColor', 'categoriaTextColorPicker');
    toggleColorPicker('categoriaBgColor', 'categoriaBgColorPicker');
    toggleColorPicker('tituloTextColor', 'tituloTextColorPicker');
    toggleColorPicker('tituloBgColor', 'tituloBgColorPicker');

    fabricCanvas?.on('object:moving', (e) => checkCenterWhileDragging(e.target));
    fabricCanvas?.on('object:scaling', (e) => checkCenterWhileDragging(e.target));
    fabricCanvas?.on('mouse:up', removeCenterLines);

    updateTemplateSelect();
});

// ──────────────────────────────────────────────────────────────
// FUNCIONES AUXILIARES
// ──────────────────────────────────────────────────────────────

function loadFont(fontFamily, fontPath) {
    return new Promise((resolve, reject) => {
        const font = new FontFace(fontFamily, `url(${baseURL}${fontPath})`);
        document.fonts.add(font);
        font.load().then(resolve).catch(reject);
    });
}

function clearForm() {
    ['urlInput', 'imageUpload', 'templateName', 'loadTemplate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    ['sizeSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '1080x1080';
    });

    ['blurRange', 'opacityRange', 'categoriaBgOpacity', 'tituloBgOpacity'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = id.includes('blur') || id.includes('opacity') ? '0' : '0.5';
            document.getElementById(id.replace('Range','Value') || id.replace('Opacity','OpacityValue')).textContent = el.value;
        }
    });

    ['categoriaTextColor', 'tituloTextColor'].forEach(id => {
        document.getElementById(id).value = '#a6ce39';
    });

    ['categoriaBgColor', 'tituloBgColor'].forEach(id => {
        document.getElementById(id).value = id.includes('categoria') ? '#a6ce39' : '#8fb82d';
    });

    ['categoriaTextColorPicker', 'categoriaBgColorPicker', 'tituloTextColorPicker', 'tituloBgColorPicker']
        .forEach(id => document.getElementById(id).style.display = 'none');

    fabricCanvas?.clear();
    currentImage = tituloTextbox = categoriaTextbox = tituloRect = categoriaRect = logoObj = 
    currentNewsData = darknessOverlay = currentImageDataURL = localImageDataURL = null;

    fabricCanvas?.setDimensions({ width: 1080, height: 1080 });
    if (canvasContainer) {
        canvasContainer.style.width = '1080px';
        canvasContainer.style.height = '1080px';
    }

    updateExportButtonPosition();
    fabricCanvas?.renderAll();
}

function updateTemplateSelect() {
    const select = document.getElementById('loadTemplate');
    if (!select) return;
    select.innerHTML = '<option value="">Seleccionar Plantilla</option>';
    const templates = JSON.parse(localStorage.getItem('templates') || '{}');
    Object.keys(templates).forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

// ──────────────────────────────────────────────────────────────
// Centrado visual (líneas guía)
// ──────────────────────────────────────────────────────────────

function drawCenterLines() {
    removeCenterLines();
    const w = fabricCanvas.width, h = fabricCanvas.height;
    centerLines.v = new fabric.Line([w/2, 0, w/2, h], {stroke: '#00bfff', strokeWidth: 4, selectable: false, evented: false, opacity: 0.7});
    centerLines.h = new fabric.Line([0, h/2, w, h/2], {stroke: '#00bfff', strokeWidth: 4, selectable: false, evented: false, opacity: 0.7});
    fabricCanvas.add(centerLines.v, centerLines.h);
    centerLines.v.bringToFront();
    centerLines.h.bringToFront();
    fabricCanvas.renderAll();
}

function removeCenterLines() {
    if (centerLines.h) fabricCanvas.remove(centerLines.h);
    if (centerLines.v) fabricCanvas.remove(centerLines.v);
    centerLines = { h: null, v: null };
}

function checkCenterWhileDragging(obj) {
    const cx = fabricCanvas.width / 2;
    const cy = fabricCanvas.height / 2;
    const c = obj.getCenterPoint();
    const thr = 10;

    const h = Math.abs(c.x - cx) < thr;
    const v = Math.abs(c.y - cy) < thr;

    if (h && v) {
        if (!centerLines.v || !centerLines.h) drawCenterLines();
    } else if (h) {
        if (!centerLines.v) drawCenterLines();
        if (centerLines.h) { fabricCanvas.remove(centerLines.h); centerLines.h = null; }
    } else if (v) {
        if (!centerLines.h) drawCenterLines();
        if (centerLines.v) { fabricCanvas.remove(centerLines.v); centerLines.v = null; }
    } else {
        removeCenterLines();
    }
}

// ──────────────────────────────────────────────────────────────
// Texto + fondo rectángulo sincronizado
// ──────────────────────────────────────────────────────────────

function syncRectToText(rect, textbox) {
    if (!rect || !textbox) return;
    const tw = textbox.width * textbox.scaleX;
    const th = textbox.height * textbox.scaleY;
    const pw = tw + textbox.padding * 2;
    const ph = th + textbox.padding * 2;

    rect.set({
        left: textbox.left,
        top: textbox.top,
        width: pw,
        height: ph,
        originX: textbox.originX,
        originY: textbox.originY
    });
    rect.setCoords();
    fabricCanvas.renderAll();
}

function createTextWithRect(text, opts, bgColor, bgOpacity, textColor) {
    const rect = new fabric.Rect({
        fill: bgColor === 'custom' ? document.getElementById(`${opts.id}BgColorPicker`)?.value : bgColor,
        opacity: parseFloat(bgOpacity),
        selectable: false,
        evented: false,
        rx: 4, ry: 4,
        left: opts.left,
        top: opts.top,
        originX: opts.originX || 'left',
        originY: opts.originY || 'top'
    });

    const textbox = new fabric.Textbox(text, {
        ...opts,
        fill: textColor === 'custom' ? document.getElementById(`${opts.id}TextColorPicker`)?.value : textColor,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        padding: 6
    });

    fabricCanvas.add(rect);
    fabricCanvas.add(textbox);
    textbox.bringToFront();
    syncRectToText(rect, textbox);

    ['moving','scaling','changed','rotated'].forEach(event => {
        textbox.on(event, () => syncRectToText(rect, textbox));
    });

    return { textbox, rect };
}

// ──────────────────────────────────────────────────────────────
// Efectos imagen (blur + overlay oscuridad)
// ──────────────────────────────────────────────────────────────

function updateImageFX() {
    if (!currentImage) return;

    const blurVal = parseFloat(document.getElementById('blurRange')?.value || 0) / 1000;
    const darkOpacity = parseFloat(document.getElementById('opacityRange')?.value || 0);

    currentImage.filters = blurVal > 0 ? [new fabric.Image.filters.Blur({ blur: blurVal })] : [];
    currentImage.applyFilters();

    if (darknessOverlay) darknessOverlay.set({ opacity: darkOpacity });

    fabricCanvas.renderAll();

    // Detectar si la imagen se volvió gris (fallback a original)
    const ctx = fabricCanvas.getContext();
    const data = ctx.getImageData(0, 0, fabricCanvas.width, fabricCanvas.height).data;
    let isGray = true;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] !== data[i+1] || data[i] !== data[i+2]) {
            isGray = false;
            break;
        }
    }
    if (isGray && currentImageDataURL) {
        fabric.Image.fromURL(currentImageDataURL, img => {
            fabricCanvas.remove(currentImage);
            currentImage = img;
            fabricCanvas.add(currentImage);
            currentImage.sendToBack();
            darknessOverlay?.bringToFront();
            categoriaRect?.bringToFront();
            categoriaTextbox?.bringToFront();
            tituloRect?.bringToFront();
            tituloTextbox?.bringToFront();
            logoObj?.bringToFront();
            adjustImageToCanvas();
            updateImageFX();
        });
    }
}

// ──────────────────────────────────────────────────────────────
// Actualizar estilos de texto/fondo
// ──────────────────────────────────────────────────────────────

function updateCategoryStyle() {
    if (!categoriaRect || !categoriaTextbox) return;
    const bg = document.getElementById('categoriaBgColor')?.value;
    const txt = document.getElementById('categoriaTextColor')?.value;
    const op = parseFloat(document.getElementById('categoriaBgOpacity')?.value || 0.5);

    categoriaRect.set({
        fill: bg === 'custom' ? document.getElementById('categoriaBgColorPicker')?.value : bg,
        opacity: op
    });
    categoriaTextbox.set({
        fill: txt === 'custom' ? document.getElementById('categoriaTextColorPicker')?.value : txt
    });
    fabricCanvas.renderAll();
}

function updateTitleStyle() {
    if (!tituloRect || !tituloTextbox) return;
    const bg = document.getElementById('tituloBgColor')?.value;
    const txt = document.getElementById('tituloTextColor')?.value;
    const op = parseFloat(document.getElementById('tituloBgOpacity')?.value || 0.5);

    tituloRect.set({
        fill: bg === 'custom' ? document.getElementById('tituloBgColorPicker')?.value : bg,
        opacity: op
    });
    tituloTextbox.set({
        fill: txt === 'custom' ? document.getElementById('tituloTextColorPicker')?.value : txt
    });
    fabricCanvas.renderAll();
}

// ──────────────────────────────────────────────────────────────
// Toggle color picker personalizado
// ──────────────────────────────────────────────────────────────

function toggleColorPicker(selectId, pickerId) {
    const select = document.getElementById(selectId);
    const picker = document.getElementById(pickerId);
    if (!select || !picker) return;

    select.addEventListener('change', () => {
        picker.style.display = select.value === 'custom' ? 'block' : 'none';
        if (select.value === 'custom') {
            picker.value = '#ffffff';
            if (selectId.includes('categoria')) updateCategoryStyle();
            if (selectId.includes('titulo')) updateTitleStyle();
        }
    });
}

function handleCategoriaTextColorChange() { toggleColorPicker('categoriaTextColor', 'categoriaTextColorPicker'); updateCategoryStyle(); }
function handleCategoriaBgColorChange()   { toggleColorPicker('categoriaBgColor', 'categoriaBgColorPicker');   updateCategoryStyle(); }
function handleTituloTextColorChange()    { toggleColorPicker('tituloTextColor', 'tituloTextColorPicker');    updateTitleStyle(); }
function handleTituloBgColorChange()      { toggleColorPicker('tituloBgColor', 'tituloBgColorPicker');        updateTitleStyle(); }

// ──────────────────────────────────────────────────────────────
// Ajustar imagen al canvas (cover)
// ──────────────────────────────────────────────────────────────

function adjustImageToCanvas() {
    if (!currentImage || !fabricCanvas) return;

    const cw = fabricCanvas.width, ch = fabricCanvas.height;
    const { width: iw, height: ih } = currentImage.getOriginalSize();
    const scale = Math.max(cw / iw, ch / ih);

    currentImage.set({
        scaleX: scale,
        scaleY: scale,
        left: cw / 2,
        top: ch / 2,
        originX: 'center',
        originY: 'center'
    });

    fabricCanvas.renderAll();
}

// ──────────────────────────────────────────────────────────────
// Redimensionar todo al cambiar tamaño
// ──────────────────────────────────────────────────────────────

function resizeAllObjects(w, h) {
    fabricCanvas.setDimensions({ width: w, height: h });
    if (canvasContainer) {
        canvasContainer.style.width = w + 'px';
        canvasContainer.style.height = h + 'px';
    }

    if (darknessOverlay) {
        darknessOverlay.set({ width: w, height: h });
    }

    if (currentImage) adjustImageToCanvas();

    if (currentNewsData) {
        // Remover objetos viejos
        [categoriaRect, categoriaTextbox, tituloRect, tituloTextbox, logoObj]
            .forEach(obj => obj && fabricCanvas.remove(obj));

        addTextAndLogoToCanvas(currentNewsData, w, h);

        // Restaurar colores/opacidad
        if (categoriaRect && categoriaTextbox) {
            categoriaRect.set({ opacity: parseFloat(document.getElementById('categoriaBgOpacity')?.value || 0.5) });
            categoriaTextbox.set({ fill: document.getElementById('categoriaTextColor')?.value });
        }
        if (tituloRect && tituloTextbox) {
            tituloRect.set({ opacity: parseFloat(document.getElementById('tituloBgOpacity')?.value || 0.5) });
            tituloTextbox.set({ fill: document.getElementById('tituloTextColor')?.value });
        }
    }

    fabricCanvas.renderAll();
}

function updateExportButtonPosition() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) wrapper.style.height = (fabricCanvas.height * 0.5) + 'px';
}

// ──────────────────────────────────────────────────────────────
// GENERAR PREVIEW (parte crítica)
// ──────────────────────────────────────────────────────────────

async function generatePreview() {
    const urlInput = document.getElementById('urlInput');
    if (!urlInput?.value.trim()) {
        alert('Ingresa una URL válida');
        return;
    }

    try {
        const extractRes = await fetch(`${baseURL}/api/extract`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: urlInput.value.trim() })
        });

        if (!extractRes.ok) throw new Error(`Extract error: ${extractRes.status}`);

        const data = await extractRes.json();
        if (data.error) throw new Error(data.error);

        currentNewsData = data;

        let imageSrc = localImageDataURL;
        if (!imageSrc) {
            const processRes = await fetch(`${baseURL}/api/process-image`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!processRes.ok) throw new Error(`Process image error: ${processRes.status}`);

            const { image_base64 } = await processRes.json();
            imageSrc = `data:image/jpeg;base64,${image_base64}`;
            currentImageDataURL = imageSrc;
        }

        fabricCanvas.clear();
        document.getElementById('opacityRange').value = '0';
        document.getElementById('opacityValue').textContent = '0';

        fabric.Image.fromURL(imageSrc, (img) => {
            currentImage = img;

            darknessOverlay = new fabric.Rect({
                left: 0, top: 0,
                width: fabricCanvas.width,
                height: fabricCanvas.height,
                fill: 'black',
                opacity: 0,
                selectable: false,
                evented: false
            });

            fabricCanvas.add(currentImage);
            fabricCanvas.add(darknessOverlay);
            currentImage.sendToBack();

            adjustImageToCanvas();
            addTextAndLogoToCanvas(data, fabricCanvas.width, fabricCanvas.height);
            fabricCanvas.renderAll();
            updateExportButtonPosition();
        }, { crossOrigin: 'anonymous' });

    } catch (err) {
        console.error("Error en generatePreview:", err);
        alert(`Error al generar preview:\n${err.message}`);
    }
}

// ──────────────────────────────────────────────────────────────
// Agregar texto y logo al canvas
// ──────────────────────────────────────────────────────────────

function addTextAndLogoToCanvas(data, width, height) {
    if (!data) return;

    const catClean = data.categoria?.replace(/_/g, ' ') || 'NOTICIAS';
    const categoria = catClean
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

    const cat = createTextWithRect(categoria, {
        id: 'categoria',
        left: width / 2,
        top: height * 0.05,
        fontFamily: 'Economica-Regular',
        fontSize: 66,
        textAlign: 'center',
        width: 550,
        originX: 'center',
        originY: 'top'
    }, document.getElementById('categoriaBgColor')?.value, 
       document.getElementById('categoriaBgOpacity')?.value, 
       document.getElementById('categoriaTextColor')?.value);

    categoriaTextbox = cat.textbox;
    categoriaRect = cat.rect;
    syncRectToText(categoriaRect, categoriaTextbox);

    const tit = createTextWithRect(data.titulo || 'Sin título', {
        id: 'titulo',
        left: width / 2,
        top: height / 2,
        width: width * 0.8,
        fontFamily: 'Bebasneue-regular',
        fontSize: 70,
        textAlign: 'center',
        originX: 'center',
        originY: 'center'
    }, document.getElementById('tituloBgColor')?.value, 
       document.getElementById('tituloBgOpacity')?.value, 
       document.getElementById('tituloTextColor')?.value);

    tituloTextbox = tit.textbox;
    tituloRect = tit.rect;
    syncRectToText(tituloRect, tituloTextbox);

    fabric.Image.fromURL(`${baseURL}/static/logo.png`, (logo) => {
        if (!logo) return;
        logo.set({
            left: width / 2,
            top: height * 0.9,
            scaleX: 330 / logo.width,
            scaleY: 79 / logo.height,
            selectable: true,
            hasControls: true,
            hasBorders: false,
            originX: 'center',
            originY: 'center',
            shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.5)', blur: 10, offsetX: 5, offsetY: 5 })
        });
        fabricCanvas.add(logo);
        logoObj = logo;
        logo.bringToFront();
        fabricCanvas.renderAll();
    }, { crossOrigin: 'anonymous' });
}

// ──────────────────────────────────────────────────────────────
// Cambiar tamaño canvas
// ──────────────────────────────────────────────────────────────

function changeSize() {
    const val = document.getElementById('sizeSelect')?.value;
    if (!val) return;
    const [w, h] = val.split('x').map(Number);
    resizeAllObjects(w, h);
    updateExportButtonPosition();
}

// ──────────────────────────────────────────────────────────────
// Exportar imagen final
// ──────────────────────────────────────────────────────────────

function exportImage() {
    if (!fabricCanvas) return;

    const blurVal = parseFloat(document.getElementById('blurRange')?.value || 0);
    if (blurVal > 0) {
        currentImage.filters = [new fabric.Image.filters.Blur({ blur: blurVal / 1000 })];
        currentImage.applyFilters();
        fabricCanvas.renderAll();
    }

    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1 });

    // Restaurar imagen sin blur (opcional)
    if (blurVal > 0 && currentImageDataURL) {
        fabric.Image.fromURL(currentImageDataURL, (img) => {
            fabricCanvas.remove(currentImage);
            currentImage = img;
            fabricCanvas.add(currentImage);
            currentImage.sendToBack();
            darknessOverlay?.bringToFront();
            categoriaRect?.bringToFront();
            categoriaTextbox?.bringToFront();
            tituloRect?.bringToFront();
            tituloTextbox?.bringToFront();
            logoObj?.bringToFront();
            adjustImageToCanvas();
            updateImageFX();
        });
    }

    const link = document.createElement('a');
    link.download = 'preview-noticia.png';
    link.href = dataURL;
    link.click();
}
