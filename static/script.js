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

    // Carga de fuentes con nombres EXACTOS del repositorio
    try {
        await Promise.all([
            loadFont('Bebas Neue', '/static/fonts/BebasNeue-Regular.ttf'),
            loadFont('Economica', '/static/fonts/Economica-Regular.ttf'),
            loadFont('Montserrat', '/static/fonts/Montserrat-Regular.ttf')
        ]);
        console.log("Fuentes cargadas correctamente");
    } catch (err) {
        console.warn("Algunas fuentes no cargaron → usando Arial", err);
    }

    // Eventos (con protección contra null)
    document.getElementById('blurRange')?.addEventListener('input', () => {
        document.getElementById('blurValue') && (document.getElementById('blurValue').textContent = document.getElementById('blurRange').value);
        updateImageFX();
    });

    document.getElementById('opacityRange')?.addEventListener('input', () => {
        document.getElementById('opacityValue') && (document.getElementById('opacityValue').textContent = document.getElementById('opacityRange').value);
        updateImageFX();
    });

    document.getElementById('categoriaTextColor')?.addEventListener('change', handleCategoriaTextColorChange);
    document.getElementById('categoriaBgColor')?.addEventListener('change', handleCategoriaBgColorChange);
    document.getElementById('categoriaBgOpacity')?.addEventListener('input', () => {
        document.getElementById('categoriaBgOpacityValue') && (document.getElementById('categoriaBgOpacityValue').textContent = document.getElementById('categoriaBgOpacity').value);
        updateCategoryStyle();
    });

    document.getElementById('tituloTextColor')?.addEventListener('change', handleTituloTextColorChange);
    document.getElementById('tituloBgColor')?.addEventListener('change', handleTituloBgColorChange);
    document.getElementById('tituloBgOpacity')?.addEventListener('input', () => {
        document.getElementById('tituloBgOpacityValue') && (document.getElementById('tituloBgOpacityValue').textContent = document.getElementById('tituloBgOpacity').value);
        updateTitleStyle();
    });

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

// ---------- AUXILIARES ----------
function bringAllToFront() {
    if (darknessOverlay) darknessOverlay.bringToFront();
    if (categoriaRect) categoriaRect.bringToFront();
    if (categoriaTextbox) categoriaTextbox.bringToFront();
    if (tituloRect) tituloRect.bringToFront();
    if (tituloTextbox) tituloTextbox.bringToFront();
    if (logoObj) logoObj.bringToFront();
    fabricCanvas.renderAll();
}

// ---------- LIMPIAR FORMULARIO ----------
function clearForm() {
    document.getElementById('urlInput') && (document.getElementById('urlInput').value = '');
    document.getElementById('imageUpload') && (document.getElementById('imageUpload').value = '');
    document.getElementById('sizeSelect') && (document.getElementById('sizeSelect').value = '1080x1080');
    document.getElementById('blurRange') && (document.getElementById('blurRange').value = '0');
    document.getElementById('blurValue') && (document.getElementById('blurValue').textContent = '0');
    document.getElementById('opacityRange') && (document.getElementById('opacityRange').value = '0');
    document.getElementById('opacityValue') && (document.getElementById('opacityValue').textContent = '0');
    document.getElementById('categoriaTextColor') && (document.getElementById('categoriaTextColor').value = '#ffffff');
    document.getElementById('categoriaBgColor') && (document.getElementById('categoriaBgColor').value = '#a6ce39');
    document.getElementById('categoriaBgOpacity') && (document.getElementById('categoriaBgOpacity').value = '0.5');
    document.getElementById('categoriaBgOpacityValue') && (document.getElementById('categoriaBgOpacityValue').textContent = '0.5');
    document.getElementById('tituloTextColor') && (document.getElementById('tituloTextColor').value = '#ffffff');
    document.getElementById('tituloBgColor') && (document.getElementById('tituloBgColor').value = '#8fb82d');
    document.getElementById('tituloBgOpacity') && (document.getElementById('tituloBgOpacity').value = '0.5');
    document.getElementById('tituloBgOpacityValue') && (document.getElementById('tituloBgOpacityValue').textContent = '0.5');

    ['categoriaTextColorPicker', 'categoriaBgColorPicker', 'tituloTextColorPicker', 'tituloBgColorPicker'].forEach(id => {
        document.getElementById(id) && (document.getElementById(id).style.display = 'none');
    });

    fabricCanvas.clear();
    currentImage = tituloTextbox = categoriaTextbox = tituloRect = categoriaRect = logoObj = 
    currentNewsData = darknessOverlay = currentImageDataURL = localImageDataURL = null;

    fabricCanvas.setDimensions({ width: 1080, height: 1080 });
    if (canvasContainer) {
        canvasContainer.style.width = '1080px';
        canvasContainer.style.height = '1080px';
    }

    updateExportButtonPosition();
    fabricCanvas.renderAll();
}

// ---------- CENTRADO ----------
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
    const isCenteredH = Math.abs(c.x - cx) < thr;
    const isCenteredV = Math.abs(c.y - cy) < thr;

    if (isCenteredH && isCenteredV) {
        if (!centerLines.v || !centerLines.h) drawCenterLines();
    } else if (isCenteredH) {
        if (!centerLines.v) drawCenterLines();
        if (centerLines.h) { fabricCanvas.remove(centerLines.h); centerLines.h = null; }
    } else if (isCenteredV) {
        if (!centerLines.h) drawCenterLines();
        if (centerLines.v) { fabricCanvas.remove(centerLines.v); centerLines.v = null; }
    } else {
        removeCenterLines();
    }
}

// ---------- OBJETOS ----------
function syncRectToText(rect, textbox) {
    if (!rect || !textbox) return;
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
        originY: textbox.originY
    });
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
        padding: 24, // más espacio para que se vea bien
        fontFamily: opts.fontFamily || 'Arial',
        fontSize: opts.fontSize || 90, // más grande para visibilidad inmediata
        lineHeight: 1.1,
        splitByGrapheme: true // mejor manejo de texto largo
    });

    fabricCanvas.add(rect);
    fabricCanvas.add(textbox);
    textbox.bringToFront();
    rect.sendToBack(); // fondo detrás del texto
    syncRectToText(rect, textbox);

    ['moving', 'scaling', 'changed', 'rotated'].forEach(ev => {
        textbox.on(ev, () => syncRectToText(rect, textbox));
    });

    fabricCanvas.renderAll();
    return { textbox, rect };
}

// ---------- EFECTOS ----------
function updateImageFX() {
    if (!currentImage) return;
    const blurAmount = parseFloat(document.getElementById('blurRange')?.value || 0);
    const darknessOpacity = parseFloat(document.getElementById('opacityRange')?.value || 0);
    currentImage.filters = [];
    if (blurAmount > 0) {
        currentImage.filters.push(new fabric.Image.filters.Blur({ blur: blurAmount / 1000 }));
    }
    currentImage.applyFilters();

    if (darknessOverlay) darknessOverlay.set({ opacity: darknessOpacity });
    fabricCanvas.renderAll();
}

// ---------- ESTILOS ----------
function updateCategoryStyle() {
    if (categoriaRect && categoriaTextbox) {
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
}

function updateTitleStyle() {
    if (tituloRect && tituloTextbox) {
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
    const cw = fabricCanvas.width;
    const ch = fabricCanvas.height;
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

// ---------- REDIMENSIONAR ----------
function resizeAllObjects(newWidth, newHeight) {
    fabricCanvas.setDimensions({ width: newWidth, height: newHeight });
    if (canvasContainer) {
        canvasContainer.style.width = `${newWidth}px`;
        canvasContainer.style.height = `${newHeight}px`;
    }
    if (darknessOverlay) darknessOverlay.set({ width: newWidth, height: newHeight });
    if (currentImage) adjustImageToCanvas();
    if (currentNewsData) {
        [categoriaRect, categoriaTextbox, tituloRect, tituloTextbox, logoObj]
            .forEach(obj => obj && fabricCanvas.remove(obj));
        addTextAndLogoToCanvas(currentNewsData, newWidth, newHeight);
    }
    fabricCanvas.renderAll();
}

// ---------- BOTÓN EXPORTAR ----------
function updateExportButtonPosition() {
    const wrapper = document.getElementById('canvas-wrapper');
    if (wrapper) wrapper.style.height = (fabricCanvas.height * 0.5) + 'px';
}

// ---------- GENERAR PREVIEW ----------
async function generatePreview() {
    const url = document.getElementById('urlInput')?.value?.trim();
    if (!url) {
        alert('Ingresa un URL válido');
        return;
    }

    try {
        console.log("Solicitando extracción...");
        const extractRes = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        console.log("Status extract:", extractRes.status);

        if (!extractRes.ok) {
            const text = await extractRes.text();
            console.error("Error extract:", text);
            alert(`Error ${extractRes.status}`);
            return;
        }

        const datos = await extractRes.json();
        console.log("Datos recibidos:", datos);

        currentNewsData = datos;

        let imageDataURL = localImageDataURL;
        if (!imageDataURL) {
            console.log("Solicitando imagen base...");
            const genRes = await fetch('/api/generate-base', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            console.log("Status generate-base:", genRes.status);

            if (!genRes.ok) {
                const text = await genRes.text();
                console.error("Error generate-base:", text);
                alert(`Error procesando imagen`);
                return;
            }

            const { image_base64 } = await genRes.json();
            imageDataURL = `data:image/png;base64,${image_base64}`;
            currentImageDataURL = imageDataURL;
        }

        fabric.Image.fromURL(imageDataURL, img => {
            console.log("Imagen cargada");
            currentImage = img;

            darknessOverlay = new fabric.Rect({
                left: 0,
                top: 0,
                width: fabricCanvas.width,
                height: fabricCanvas.height,
                fill: 'black',
                opacity: parseFloat(document.getElementById('opacityRange')?.value || 0),
                selectable: false,
                evented: false
            });

            currentImage.filters = [];
            updateImageFX();

            fabricCanvas.add(currentImage);
            fabricCanvas.add(darknessOverlay);
            currentImage.sendToBack();

            adjustImageToCanvas();
            addTextAndLogoToCanvas(datos, fabricCanvas.width, fabricCanvas.height);

            bringAllToFront();
            fabricCanvas.renderAll();
            updateExportButtonPosition();
            console.log("Preview generada");
        }, { crossOrigin: 'anonymous' });

    } catch (err) {
        console.error("Error preview:", err);
        alert("Error: " + err.message);
    }
}

// ---------- TEXTO Y LOGO ----------
function addTextAndLogoToCanvas(data, width, height) {
    console.log("Agregando textos y logo...");

    // Categoría
    const catText = (data.categoria || 'NOTICIAS').replace(/_/g, ' ')
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

    const cat = createTextWithRect(catText, {
        id: 'categoria',
        left: width / 2,
        top: height * 0.08,
        fontFamily: 'Economica',
        fontSize: 90,
        textAlign: 'center',
        width: 800,
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
        left: width / 2,
        top: height * 0.45,
        width: width * 0.9,
        fontFamily: 'Bebas Neue',
        fontSize: 110,
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
            console.log("Logo cargado");
            logo.set({
                left: width / 2,
                top: height * 0.92,
                scaleX: 400 / logo.width,
                scaleY: 100 / logo.height,
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
        } else {
            console.warn("No se encontró logo.png");
        }
        bringAllToFront();
        fabricCanvas.renderAll();
    }, { crossOrigin: 'anonymous' });

    bringAllToFront();
    fabricCanvas.renderAll();
}

// ---------- EXPORTAR ----------
function exportImage() {
    const blurAmount = parseFloat(document.getElementById('blurRange')?.value || 0);
    if (blurAmount > 0) {
        currentImage.filters = [new fabric.Image.filters.Blur({ blur: blurAmount / 1000 })];
        currentImage.applyFilters();
        fabricCanvas.renderAll();
    }
    const dataURL = fabricCanvas.toDataURL({ format: 'png', quality: 1 });
    window.open(dataURL, '_blank');
}

// ---------- CAMBIAR TAMAÑO ----------
function changeSize() {
    const [w, h] = document.getElementById('sizeSelect')?.value.split('x').map(Number) || [1080, 1080];
    resizeAllObjects(w, h);
}
