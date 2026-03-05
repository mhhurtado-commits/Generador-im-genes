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
    // Forzamos a que el navegador registre las fuentes antes de usarlas
    await document.fonts.ready;

    const canvasEl = document.getElementById('canvas');
    fabricCanvas = new fabric.Canvas(canvasEl, {
        width: 1080,
        height: 1080,
        preserveObjectStacking: true,
        selection: true,
        backgroundColor: '#f5f9e8' // Usamos el color directo en vez de var
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
});

// --- EVENTOS (Tu lógica original completa) ---
function setupEventListeners() {
    document.getElementById('urlInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') extractData();
    });

    document.getElementById('generateButton').addEventListener('click', extractData);
    document.getElementById('imageInput').addEventListener('change', handleLocalImage);
    document.getElementById('downloadButton').addEventListener('click', downloadImage);
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);

    document.getElementById('clearButton').addEventListener('click', () => {
        if(confirm('¿Limpiar todo el diseño?')) {
            fabricCanvas.clear();
            fabricCanvas.setBackgroundColor('#f5f9e8', fabricCanvas.renderAll.bind(fabricCanvas));
        }
    });

    // Sincronización de estilos en tiempo real
    ['tituloBgColor', 'tituloTextColor', 'categoriaBgColor', 'categoriaTextColor', 'tituloBgOpacity'].forEach(id => {
        document.getElementById(id).addEventListener('input', updateStyles);
    });
}

// ---------- EXTRACCIÓN CON PROXY (Vital para Render) ----------
async function extractData() {
    const url = document.getElementById('urlInput').value;
    if (!url) return alert('Ingresa una URL de Mediamendoza');

    const btn = document.getElementById('generateButton');
    btn.innerText = 'Procesando...';
    
    try {
        const response = await fetch('/api/extract', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });
        const data = await response.json();
        
        // Proxy para la imagen para evitar bloqueo de seguridad
        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(data.imagen_url)}`;
        const imgResp = await fetch(proxyUrl);
        const blob = await imgResp.blob();
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
        alert('Error al extraer datos: ' + err.message);
    } finally {
        btn.innerText = 'Generar Preview';
    }
}

// ---------- RENDERIZADO Y FUENTES ----------
function renderCanvas(base64Image, data) {
    fabricCanvas.clear();

    fabric.Image.fromURL('data:image/jpeg;base64,' + base64Image, img => {
        img.set({ selectable: false, evented: false });
        fabricCanvas.add(img);
        fabricCanvas.sendToBack(img);
        
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
    
    // Categoría con nombre de fuente exacto
    const cat = createTextWithRect(data.categoria.toUpperCase(), {
        left: width / 2,
        top: 120,
        fontFamily: 'Montserrat-Bold', 
        fontSize: 42,
        originX: 'center',
        charSpacing: 100
    }, document.getElementById('categoriaBgColor').value, 1, document.getElementById('categoriaTextColor').value);
    
    categoriaTextbox = cat.textbox;
    categoriaRect = cat.rect;

    // Título con nombre de fuente exacto
    const tit = createTextWithRect(data.titulo, {
        left: width / 2,
        top: 540,
        width: 900,
        fontFamily: 'BebasNeue-Regular',
        fontSize: 90,
        textAlign: 'center',
        originX: 'center',
        originY: 'center'
    }, document.getElementById('tituloBgColor').value, document.getElementById('tituloBgOpacity').value, document.getElementById('tituloTextColor').value);
    
    tituloTextbox = tit.textbox;
    tituloRect = tit.rect;

    // Logo (Ruta corregida para Static)
    const logoFile = document.getElementById('logoSelect').value;
    fabric.Image.fromURL(`/static/${logoFile}`, logo => {
        logo.set({
            left: width / 2,
            top: 950,
            originX: 'center',
            selectable: true
        });
        logo.scaleToWidth(380);
        fabricCanvas.add(logo);
    });
}

function createTextWithRect(text, textOpts, bgColor, bgOpacity, textColor) {
    const textbox = new fabric.Textbox(text, {
        ...textOpts,
        fill: textColor,
        padding: 20
    });

    const rect = new fabric.Rect({
        fill: bgColor,
        opacity: parseFloat(bgOpacity),
        selectable: false,
        evented: false
    });

    fabricCanvas.add(rect);
    fabricCanvas.add(textbox);

    const sync = () => {
        // Esta es la lógica que centra el fondo negro tras el texto
        const bound = textbox.getBoundingRect();
        rect.set({
            left: bound.left - 10,
            top: bound.top - 5,
            width: bound.width + 20,
            height: bound.height + 10,
            angle: textbox.angle
        });
        fabricCanvas.renderAll();
    };

    textbox.on('moving', sync);
    textbox.on('scaling', sync);
    textbox.on('changed', sync);
    sync(); // Sincronización inicial

    return { textbox, rect };
}

// ---------- MODO OSCURO Y EXPORTACIÓN ----------
function toggleDarkMode() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    document.getElementById('darkModeToggle').innerText = isDark ? 'Modo Claro' : 'Modo Oscuro';
}

function downloadImage() {
    // Esto genera la imagen y la abre en una nueva pestaña como pediste
    const dataURL = fabricCanvas.toDataURL({
        format: 'png',
        quality: 1.0,
        multiplier: 1
    });
    
    const win = window.open();
    win.document.write('<iframe src="' + dataURL  + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
}

function updateStyles() {
    if (tituloRect) tituloRect.set('fill', document.getElementById('tituloBgColor').value);
    if (tituloTextbox) tituloTextbox.set('fill', document.getElementById('tituloTextColor').value);
    if (categoriaRect) categoriaRect.set('fill', document.getElementById('categoriaBgColor').value);
    if (categoriaTextbox) categoriaTextbox.set('fill', document.getElementById('categoriaTextColor').value);
    if (tituloRect) tituloRect.set('opacity', parseFloat(document.getElementById('tituloBgOpacity').value));
    fabricCanvas.renderAll();
}
