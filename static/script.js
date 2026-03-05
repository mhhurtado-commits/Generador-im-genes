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
        backgroundColor: '#f5f9e8' // Reemplazado var(--verde-cl) por el color real
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
        transparentCorners: false
    });

    setupEventListeners();
    setupColorPickers();
});

// --- (Mantenemos todas tus funciones originales de eventos) ---
function setupEventListeners() {
    document.getElementById('urlInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') extractData();
    });

    document.getElementById('generateButton').addEventListener('click', extractData);
    
    document.getElementById('imageInput').addEventListener('change', handleLocalImage);

    document.getElementById('downloadButton').addEventListener('click', downloadImage);

    document.getElementById('clearButton').addEventListener('click', () => {
        if(confirm('¿Limpiar canvas?')) {
            fabricCanvas.clear();
            fabricCanvas.setBackgroundColor('#f5f9e8', fabricCanvas.renderAll.bind(fabricCanvas));
        }
    });

    // Controles de Estilo en tiempo real
    document.getElementById('tituloBgOpacity').addEventListener('input', (e) => {
        const val = e.target.value;
        document.getElementById('tituloBgOpacityValue').innerText = val;
        if (tituloRect) {
            tituloRect.set('opacity', parseFloat(val));
            fabricCanvas.renderAll();
        }
    });

    // Escuchar cambios en los selectores de color
    ['tituloBgColor', 'tituloTextColor', 'categoriaBgColor', 'categoriaTextColor'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateStyles);
    });

    // Guías de centrado
    fabricCanvas.on('object:moving', (e) => {
        const obj = e.target;
        const center = fabricCanvas.getCenter();
        const threshold = 10;

        if (Math.abs(obj.left - center.left) < threshold) {
            obj.set({ left: center.left }).setCoords();
        }
        if (Math.abs(obj.top - center.top) < threshold) {
            obj.set({ top: center.top }).setCoords();
        }
    });
}

// ---------- EXTRACCIÓN Y PROCESAMIENTO ----------
async function extractData() {
    const url = document.getElementById('urlInput').value;
    if (!url) return alert('Por favor ingresa una URL');

    const btn = document.getElementById('generateButton');
    btn.innerText = 'Cargando...';
    btn.disabled = true;

    try {
        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error);

        currentNewsData = data;
        
        // CORRECCIÓN PARA WEB: Usamos el proxy para la imagen
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(data.imagen_url)}`;
        const imgResponse = await fetch(proxyUrl);
        const blob = await imgResponse.blob();
        
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64data = reader.result;
            const res = await fetch('/api/process-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64data })
            });
            const processed = await res.json();
            renderCanvas(processed.image_base64, data);
        };
        reader.readAsDataURL(blob);

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btn.innerText = 'Generar Preview';
        btn.disabled = false;
    }
}

// ---------- RENDERIZADO ----------
function renderCanvas(base64Image, data) {
    fabricCanvas.clear();

    fabric.Image.fromURL('data:image/jpeg;base64,' + base64Image, img => {
        img.set({
            selectable: false,
            evented: false,
            originX: 'left',
            originY: 'top'
        });
        fabricCanvas.add(img);
        fabricCanvas.sendToBack(img);
        currentImage = img;

        darknessOverlay = new fabric.Rect({
            left: 0, top: 0, width: 1080, height: 1080,
            fill: 'black', opacity: 0.3, selectable: false, evented: false
        });
        fabricCanvas.add(darknessOverlay);

        addTextElements(data);
    });
}

function addTextElements(data) {
    const width = 1080;
    const height = 1080;

    // Categoría
    const catColor = getSelectedColor('categoriaBgColor', 'categoriaBgColorPicker');
    const catTextColor = getSelectedColor('categoriaTextColor', 'categoriaTextColorPicker');

    const cat = createTextWithRect(data.categoria, {
        id: 'categoria',
        left: width / 2,
        top: height * 0.12,
        fontFamily: 'Montserrat-Bold', // Asegurado nombre de fuente
        fontSize: 38,
        originX: 'center',
        charSpacing: 100
    }, catColor, 1, catTextColor);
    
    categoriaTextbox = cat.textbox;
    categoriaRect = cat.rect;
    syncRectToText(categoriaRect, categoriaTextbox);

    // Título
    const titColor = getSelectedColor('tituloBgColor', 'tituloBgColorPicker');
    const titTextColor = getSelectedColor('tituloTextColor', 'tituloTextColorPicker');
    const titOpacity = document.getElementById('tituloBgOpacity').value;

    const tit = createTextWithRect(data.titulo, {
        id: 'titulo',
        left: width / 2,
        top: height / 2,
        width: width * 0.8,
        fontFamily: 'BebasNeue-Regular', // Asegurado nombre de fuente
        fontSize: 85,
        textAlign: 'center',
        originX: 'center',
        originY: 'center',
        lineHeight: 1
    }, titColor, titOpacity, titTextColor);
    
    tituloTextbox = tit.textbox;
    tituloRect = tit.rect;
    syncRectToText(tituloRect, tituloTextbox);

    // LOGO - CORRECCIÓN DE RUTA PARA STATIC
    const logoPath = document.getElementById('logoSelect').value;
    fabric.Image.fromURL(`/static/${logoPath}`, logo => {
        if (logo) {
            logo.set({
                left: width / 2,
                top: height * 0.9,
                originX: 'center',
                originY: 'center',
                selectable: true
            });
            logo.scaleToWidth(350);
            fabricCanvas.add(logo);
            logoObj = logo;
        }
    });

    fabricCanvas.renderAll();
}

// --- (Aquí siguen todas tus otras funciones: createTextWithRect, syncRectToText, handleLocalImage, etc.) ---
// ... RECOMIENDO MANTENER EL RESTO DE TUS FUNCIONES TAL CUAL ESTABAN ...
// Pero asegurando que cualquier llamada a fabric.Image.fromURL use `/static/`

function createTextWithRect(text, textOpts, bgColor, bgOpacity, textColor) {
    const textbox = new fabric.Textbox(text, {
        ...textOpts,
        fill: textColor,
        padding: 20,
        splitByGrapheme: false
    });

    const rect = new fabric.Rect({
        fill: bgColor,
        opacity: parseFloat(bgOpacity),
        selectable: false,
        evented: false
    });

    fabricCanvas.add(rect);
    fabricCanvas.add(textbox);

    textbox.on('moving', () => syncRectToText(rect, textbox));
    textbox.on('scaling', () => syncRectToText(rect, textbox));
    textbox.on('changed', () => syncRectToText(rect, textbox));

    return { textbox, rect };
}

function syncRectToText(rect, text) {
    const padding = 20;
    rect.set({
        left: text.left - (text.width * text.originX === 'center' ? text.width/2 : 0) - padding,
        top: text.top - (text.height * text.originY === 'center' ? text.height/2 : 0) - padding/2,
        width: text.width + (padding * 2),
        height: text.height + padding,
        angle: text.angle,
        scaleX: text.scaleX,
        scaleY: text.scaleY
    });
    rect.setCoords();
}

function getSelectedColor(selectId, pickerId) {
    const sel = document.getElementById(selectId);
    return sel.value === 'custom' ? document.getElementById(pickerId).value : sel.value;
}

function updateStyles() {
    if (tituloRect) {
        tituloRect.set('fill', getSelectedColor('tituloBgColor', 'tituloBgColorPicker'));
    }
    if (tituloTextbox) {
        tituloTextbox.set('fill', getSelectedColor('tituloTextColor', 'tituloTextColorPicker'));
    }
    if (categoriaRect) {
        categoriaRect.set('fill', getSelectedColor('categoriaBgColor', 'categoriaBgColorPicker'));
    }
    if (categoriaTextbox) {
        categoriaTextbox.set('fill', getSelectedColor('categoriaTextColor', 'categoriaTextColorPicker'));
    }
    fabricCanvas.renderAll();
}

function setupColorPickers() {
    const pairs = [
        {s: 'tituloBgColor', p: 'tituloBgColorPicker'},
        {s: 'tituloTextColor', p: 'tituloTextColorPicker'},
        {s: 'categoriaBgColor', p: 'categoriaBgColorPicker'},
        {s: 'categoriaTextColor', p: 'categoriaTextColorPicker'}
    ];
    pairs.forEach(pair => {
        const select = document.getElementById(pair.s);
        const picker = document.getElementById(pair.p);
        select.addEventListener('change', () => {
            picker.style.display = select.value === 'custom' ? 'inline-block' : 'none';
            updateStyles();
        });
        picker.addEventListener('input', updateStyles);
    });
}

function downloadImage() {
    const dataURL = fabricCanvas.toDataURL({
        format: 'jpeg',
        quality: 0.9,
        multiplier: 1
    });
    const link = document.createElement('a');
    link.download = `placa-mediamendoza-${Date.now()}.jpg`;
    link.href = dataURL;
    link.click();
}

function handleLocalImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
        const data = f.target.result;
        fabric.Image.fromURL(data, (img) => {
            img.scaleToWidth(fabricCanvas.width);
            fabricCanvas.add(img);
            fabricCanvas.setActiveObject(img);
        });
    };
    reader.readAsDataURL(file);
}
