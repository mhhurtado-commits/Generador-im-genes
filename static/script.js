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

const baseURL = window.location.origin;

// ---------- INICIALIZACIÓN ----------
document.addEventListener('DOMContentLoaded', async () => {
    fabricCanvas = new fabric.Canvas('canvas', {
        width: 1080,
        height: 1080,
        preserveObjectStacking: true,
        selection: true,
        backgroundColor: 'var(--verde-cl)'
    });

    canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.style.width = '1080px';
        canvasContainer.style.height = '1080px';
    }

    fabric.Object.prototype.set({
        borderColor: '#8fb82d',
        cornerColor: '#8fb82d',
        cornerSize: 12,
        borderScaleFactor: 2,
        transparentCorners: false
    });

    try {
        await Promise.all([
            loadFont('Bebas Neue', '/static/fonts/BebasNeue-Regular.ttf'),
            loadFont('Economica', '/static/fonts/Economica-Regular.ttf'),
            loadFont('Montserrat', '/static/fonts/Montserrat-Regular.ttf')
        ]);
        console.log("Fuentes cargadas OK");
    } catch (err) {
        console.warn("Algunas fuentes fallaron → usando Arial", err);
    }

    // Eventos
    document.getElementById('blurRange')?.addEventListener('input', updateImageFX);
    document.getElementById('opacityRange')?.addEventListener('input', updateImageFX);

    document.getElementById('categoriaTextColor')?.addEventListener('change', updateCategoryStyle);
    document.getElementById('categoriaBgColor')?.addEventListener('change', updateCategoryStyle);
    document.getElementById('categoriaBgOpacity')?.addEventListener('input', updateCategoryStyle);
    document.getElementById('tituloTextColor')?.addEventListener('change', updateTitleStyle);
    document.getElementById('tituloBgColor')?.addEventListener('change', updateTitleStyle);
    document.getElementById('tituloBgOpacity')?.addEventListener('input', updateTitleStyle);

    document.getElementById('categoriaTextColorPicker')?.addEventListener('input', updateCategoryStyle);
    document.getElementById('categoriaBgColorPicker')?.addEventListener('input', updateCategoryStyle);
    document.getElementById('tituloTextColorPicker')?.addEventListener('input', updateTitleStyle);
    document.getElementById('tituloBgColorPicker')?.addEventListener('input', updateTitleStyle);

    document.getElementById('clearButton')?.addEventListener('click', clearForm);
    document.getElementById('generateButton')?.addEventListener('click', generatePreview);
    document.getElementById('sizeSelect')?.addEventListener('change', changeSize);

    document.getElementById('themeToggle')?.addEventListener('change', () => {
        document.body.className = document.getElementById('themeToggle')?.value || 'light';
    });

    document.getElementById('imageUpload')?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                localImageDataURL = ev.target.result;
                if (currentImage) {
                    fabric.Image.fromURL(localImageDataURL, (img) => {
                        fabricCanvas.remove(currentImage);
                        currentImage = img;
                        fabricCanvas.add(currentImage);
                        currentImage.sendToBack();
                        bringAllToFront();
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
    fabricCanvas.on('selection:created', (e) => checkCenterWhileDragging(e.target));
    fabricCanvas.on('selection:updated', (e) => checkCenterWhileDragging(e.target));
    fabricCanvas.on('mouse:up', removeCenterLines);
});

// ---------- CARGA DE FUENTES ----------
function loadFont(fontFamily, fontPath) {
    return new Promise((resolve) => {
        const font = new FontFace(fontFamily, `url(${baseURL}${fontPath})`);
        document.fonts.add(font);
        font.load().then(() => {
            console.log(`Fuente ${fontFamily} cargada`);
            resolve();
        }).catch(() => {
            console.warn(`Fuente ${fontFamily} no cargada`);
            resolve();
        });
    });
}

// ---------- FUNCIONES AUXILIARES ----------
function bringAllToFront() {
    [darknessOverlay, categoriaRect, categoriaTextbox, tituloRect, tituloTextbox, logoObj]
        .forEach(obj => obj && obj.bringToFront());
    fabricCanvas.renderAll();
}

// ---------- LIMPIAR ----------
function clearForm() {
    document.getElementById('urlInput')?.value = '';
    document.getElementById('imageUpload')?.value = '';
    document.getElementById('sizeSelect')?.value = '1080x1080';
    document.getElementById('blurRange')?.value = '0';
    document.getElementById('blurValue')?.textContent = '0';
    document.getElementById('opacityRange')?.value = '0';
    document.getElementById('opacityValue')?.textContent = '0';
    document.getElementById('categoriaTextColor')?.value = '#ffffff';
    document.getElementById('categoriaBgColor')?.value = '#a6ce39';
    document.getElementById('categoriaBgOpacity')?.value = '0.5';
    document.getElementById('categoriaBgOpacityValue')?.textContent = '0.5';
    document.getElementById('tituloTextColor')?.value = '#ffffff';
    document.getElementById('tituloBgColor')?.value = '#8fb82d';
    document.getElementById('tituloBgOpacity')?.value = '0.5';
    document.getElementById('tituloBgOpacityValue')?.textContent = '0.5';

    ['categoriaTextColorPicker', 'categoriaBgColorPicker', 'tituloTextColorPicker', 'tituloBgColorPicker']
        .forEach(id => document.getElementById(id) && (document.getElementById(id).style.display = 'none'));

    fabricCanvas.clear();
    currentImage = tituloTextbox = categoriaTextbox = tituloRect = categoriaRect = logoObj = 
    currentNewsData = darknessOverlay = currentImageDataURL = localImageDataURL = null;

    fabricCanvas.setDimensions({ width: 1080, height: 1080 });
    canvasContainer && (canvasContainer.style.width = '1080px', canvasContainer.style.height = '1080px');

    updateExportButtonPosition();
    fabricCanvas.renderAll();
}

// ---------- CENTRADO ----------
function drawCenterLines() {
    removeCenterLines();
    const w = fabricCanvas.width, h = fabricCanvas.height;
    centerLines.v = new fabric.Line([w/2,0,w/2,h], {stroke:'#00bfff', strokeWidth:4, selectable:false, evented:false, opacity:0.7});
    centerLines.h = new fabric.Line([0,h/2,w,h/2], {stroke:'#00bfff', strokeWidth:4, selectable:false, evented:false, opacity:0.7});
    fabricCanvas.add(centerLines.v, centerLines.h);
    centerLines.v.bringToFront();
    centerLines.h.bringToFront();
    fabricCanvas.renderAll();
}

function removeCenterLines() {
    [centerLines.h, centerLines.v].forEach(l => l && fabricCanvas.remove(l));
    centerLines = { h: null, v: null };
}

function checkCenterWhileDragging(obj) {
    if (!obj) return;
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

// ---------- OBJETOS ----------
function syncRectToText(rect, textbox) {
    if (!rect || !textbox) return;
    const tw = textbox.width * textbox.scaleX;
    const th = textbox.height * textbox.scaleY;
    const pw = tw + textbox.padding * 2;
    const ph = th + textbox.padding * 2;
    rect.set({ left: textbox.left, top: textbox.top, width: pw, height: ph, originX: textbox.originX, originY: textbox.originY });
    rect.setCoords();
    fabricCanvas.renderAll();
}

function createTextWithRect(text, opts, bgColor, bgOpacity, textColor) {
    const rect = new fabric.Rect({
        fill: bgColor === 'custom' ? document.getElementById(`${opts.id}BgColorPicker`)?.value || bgColor : bgColor,
        opacity: parseFloat(bgOpacity) || 0.5,
        selectable: false,
        evented: false,
        rx: 8,
        ry: 8,
        left: opts.left,
        top: opts.top,
        originX: opts.originX || 'left',
        originY: opts.originY || 'top'
    });

    const textbox = new fabric.Textbox(text || ' ', {
        ...opts,
        fill: textColor === 'custom' ? document.getElementById(`${opts.id}TextColorPicker`)?.value || textColor : textColor,
        selectable: true,
        hasControls: true,
        hasBorders: true,
        padding: 40,
        fontFamily: opts.fontFamily || 'Arial',
        fontSize: opts.fontSize || 100,
        textAlign: 'center',
        lineHeight: 1.1,
        splitByGrapheme: true,
        breakWords: true,
        dirty: true
    });

    fabricCanvas.add(rect);
    fabricCanvas.add(textbox);
    textbox.bringToFront();
    rect.sendToBack();
    syncRectToText(rect, textbox);

    textbox.setCoords();
    textbox.dirty = true;
    fabricCanvas.requestRenderAll();

    setTimeout(() => {
        textbox.dirty = true;
        fabricCanvas.requestRenderAll();
    }, 50);

    return { textbox, rect };
}

// ---------- EFECTOS ----------
function updateImageFX() {
    if (!currentImage) return;
    const blur = parseFloat(document.getElementById('blurRange')?.value || 0) / 1000;
    const dark = parseFloat(document.getElementById('opacityRange')?.value || 0);
    currentImage.filters = blur > 0 ? [new fabric.Image.filters.Blur({ blur })] : [];
    currentImage.applyFilters();
    darknessOverlay && darknessOverlay.set({ opacity: dark });
    fabricCanvas.renderAll();
}

// ---------- ESTILOS ----------
function updateCategoryStyle() {
    if (categoriaRect && categoriaTextbox) {
        categoriaRect.set({
            fill: document.getElementById('categoriaBgColor')?.value === 'custom' ? document.getElementById('categoriaBgColorPicker')?.value : document.getElementById('categoriaBgColor')?.value,
            opacity: parseFloat(document.getElementById('categoriaBgOpacity')?.value || 0.5)
        });
        categoriaTextbox.set({
            fill: document.getElementById('categoriaTextColor')?.value === 'custom' ? document.getElementById('categoriaTextColorPicker')?.value : document.getElementById('categoriaTextColor')?.value
        });
        fabricCanvas.renderAll();
    }
}

function updateTitleStyle() {
    if (tituloRect && tituloTextbox) {
        tituloRect.set({
            fill: document.getElementById('tituloBgColor')?.value === 'custom' ? document.getElementById('tituloBgColorPicker')?.value : document.getElementById('tituloBgColor')?.value,
            opacity: parseFloat(document.getElementById('tituloBgOpacity')?.value || 0.5)
        });
        tituloTextbox.set({
            fill: document.getElementById('tituloTextColor')?.value === 'custom' ? document.getElementById('tituloTextColorPicker')?.value : document.getElementById('tituloTextColor')?.value
        });
        fabricCanvas.renderAll();
    }
}

// ---------- COLOR PICKERS ----------
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

// ---------- AJUSTE IMAGEN ----------
function adjustImageToCanvas() {
    if (!currentImage || !fabricCanvas) return;
    const cw = fabricCanvas.width, ch = fabricCanvas.height;
    const { width: iw, height: ih } = currentImage.getOriginalSize();
    const scale = Math.max(cw / iw, ch / ih);
    currentImage.set({ scaleX: scale, scaleY: scale, left: cw/2, top: ch/2, originX: 'center', originY: 'center' });
    fabricCanvas.renderAll();
}

// ---------- REDIMENSIONAR ----------
function resizeAllObjects(w, h) {
    fabricCanvas.setDimensions({ width: w, height: h });
    canvasContainer && (canvasContainer.style.width = w + 'px', canvasContainer.style.height = h + 'px');
    darknessOverlay && darknessOverlay.set({ width: w, height: h });
    currentImage && adjustImageToCanvas();
    if (currentNewsData) {
        [categoriaRect, categoriaTextbox, tituloRect, tituloTextbox, logoObj].forEach(o => o && fabricCanvas.remove(o));
        addTextAndLogoToCanvas(currentNewsData, w, h);
    }
    fabricCanvas.renderAll();
}

// ---------- EXPORTAR ----------
function updateExportButtonPosition() {
    const w = document.getElementById('canvas-wrapper');
    w && (w.style.height = (fabricCanvas.height * 0.5) + 'px');
}

function exportImage() {
    const blur = parseFloat(document.getElementById('blurRange')?.value || 0);
    if (blur > 0) {
        currentImage.filters = [new fabric.Image.filters.Blur({ blur: blur / 1000 })];
        currentImage.applyFilters();
        fabricCanvas.renderAll();
    }
    const url = fabricCanvas.toDataURL({ format: 'png', quality: 1 });
    window.open(url, '_blank');
}

// ---------- GENERAR ----------
async function generatePreview() {
    const url = document.getElementById('urlInput')?.value?.trim();
    if (!url) return alert('Ingresa URL');

    try {
        const r = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!r.ok) throw new Error(`Extract ${r.status}`);

        const data = await r.json();
        if (data.error) throw new Error(data.error);

        currentNewsData = data;

        let imgUrl = localImageDataURL;
        if (!imgUrl) {
            const gr = await fetch('/api/generate-base', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!gr.ok) throw new Error(`Generate ${gr.status}`);
            const { image_base64 } = await gr.json();
            imgUrl = `data:image/png;base64,${image_base64}`;
            currentImageDataURL = imgUrl;
        }

        fabric.Image.fromURL(imgUrl, img => {
            currentImage = img;
            darknessOverlay = new fabric.Rect({
                left: 0, top: 0, width: 1080, height: 1080,
                fill: 'black', opacity: parseFloat(document.getElementById('opacityRange')?.value || 0),
                selectable: false, evented: false
            });

            currentImage.filters = [];
            updateImageFX();

            fabricCanvas.add(currentImage);
            fabricCanvas.add(darknessOverlay);
            currentImage.sendToBack();

            adjustImageToCanvas();
            addTextAndLogoToCanvas(data, 1080, 1080);

            bringAllToFront();
            fabricCanvas.renderAll();
            updateExportButtonPosition();
        }, { crossOrigin: 'anonymous' });
    } catch (e) {
        alert('Error: ' + e.message);
    }
}

// ---------- TEXTO + LOGO ----------
function addTextAndLogoToCanvas(data, w, h) {
    // Reset
    fabricCanvas.viewportTransform = [1,0,0,1,0,0];

    // Categoría
    const catText = (data.categoria || 'NOTICIAS').replace(/_/g, ' ')
        .split(' ').map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const cat = createTextWithRect(catText, {
        id: 'categoria',
        left: w / 2,
        top: h * 0.08,
        fontFamily: 'Economica',
        fontSize: 100,
        textAlign: 'center',
        width: 900,
        originX: 'center',
        originY: 'top'
    }, document.getElementById('categoriaBgColor')?.value || '#a6ce39',
       document.getElementById('categoriaBgOpacity')?.value || '0.7',
       document.getElementById('categoriaTextColor')?.value || '#ffffff');

    categoriaTextbox = cat.textbox;
    categoriaRect = cat.rect;

    // Título
    const tit = createTextWithRect(data.titulo || 'SIN TÍTULO', {
        id: 'titulo',
        left: w / 2,
        top: h * 0.45,
        width: w * 0.9,
        fontFamily: 'Bebas Neue',
        fontSize: 120,
        textAlign: 'center',
        originX: 'center',
        originY: 'center'
    }, document.getElementById('tituloBgColor')?.value || '#8fb82d',
       document.getElementById('tituloBgOpacity')?.value || '0.7',
       document.getElementById('tituloTextColor')?.value || '#ffffff');

    tituloTextbox = tit.textbox;
    tituloRect = tit.rect;

    // Logo
    fabric.Image.fromURL(`${baseURL}/static/logo.png`, logo => {
        if (logo) {
            logo.set({
                left: w / 2,
                top: h * 0.92,
                scaleX: 400 / logo.width,
                scaleY: 100 / logo.height,
                selectable: true,
                originX: 'center',
                originY: 'center'
            });
            fabricCanvas.add(logo);
            logoObj = logo;
            logo.bringToFront();
        }
        bringAllToFront();
        fabricCanvas.renderAll();
    }, { crossOrigin: 'anonymous' });

    bringAllToFront();
    fabricCanvas.renderAll();
}

// (exportImage, changeSize, updateImageFX, adjustImageToCanvas, syncRectToText, toggleColorPicker, handle... permanecen como en tu versión anterior)
