// ==========================================================================
// feed.js — Lógica del Home, renderizado de tarjetas e interacción
// Migración desde React (Home + TarjetaPin) → renderizado con DOM
// ==========================================================================

// Pines de respaldo (mismo contenido que los mock de React) hasta que el
// feed consuma directamente la API de PHP (vista_feed_publicaciones).
const PINS_FALLBACK = [
  { id: "p1", artistId: "a1", title: "Sombra y Fantasía", description: "Una exploración de la dualidad entre luz y oscuridad. Dos figuras orgánicas emergen entrelazadas, esculpidas con texturas que evocan corrientes de energía contenida. Creada en digital con Procreate.", palette: ["#4a7a8a","#c45a30","#e8ddd0","#1a2a30","#8ab0b8"], software: "Procreate, Photoshop", resources: [{name:"Pinceles Fantasía.zip"}], publishedAt: "12 mar 2025", type: "2D", tags: ["fantasía","personaje","oscuro"], imgUrl: "https://images.unsplash.com/photo-1704426882813-8acfff020487?w=400&h=600&fit=crop&auto=format", imgH: 600, likes: 1240, saves: 834 },
  { id: "p2", artistId: "a2", title: "Esfera Azul — Render", description: "Experimento de materiales procedurales en Blender. La superficie combina reflejos metálicos con subsuperficie translúcida, iluminada con un HDRI de estudio minimalista para resaltar cada arista y curva del objeto.", palette: ["#1a4a7a","#4a9ad4","#d0e8f4","#0a1a28","#6ab0e0"], software: "Blender, Cycles", publishedAt: "3 ene 2025", type: "3D", tags: ["abstracto","render","3d"], imgUrl: "https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=400&h=280&fit=crop&auto=format", imgH: 280, likes: 3210, saves: 2100 },
  { id: "p3", artistId: "a3", title: "Retrato en Penumbra", description: "Sesión nocturna con luz única de ventana. Busqué capturar la introspección del sujeto en un momento de quietud absoluta. Procesado en Lightroom conservando los tonos fríos y el grano natural del ISO elevado.", palette: ["#1a1a20","#3a3848","#8880a0","#c8c0d8","#4a4858"], exif: { camara: "Sony α7 IV", apertura: "f/1.8", velocidad: "1/200s", iso: "ISO 3200", focal: "85mm" }, publishedAt: "18 feb 2025", type: "Fotografía", tags: ["retrato","moody","portrait"], imgUrl: "https://images.unsplash.com/photo-1634733049839-0292be607569?w=400&h=520&fit=crop&auto=format", imgH: 520, likes: 890, saves: 640 },
  { id: "p4", artistId: "a1", title: "Paisaje Montañoso", description: "Pintura digital inspirada en los maestros del paisajismo romántico. Capas de gouache digital con texturas de pincel en seco para simular la rugosidad de la roca y la suavidad etérea de las nubes a contraluz.", palette: ["#3a5a7a","#6a8a9a","#c8d8e4","#8aaa9a","#1a3040"], software: "Procreate, Gouache Digital", resources: [{name:"Pinceles Paisaje.brushset"}], publishedAt: "5 abr 2025", type: "2D", tags: ["paisaje","naturaleza","pintura"], imgUrl: "https://images.unsplash.com/photo-1711319551836-f7ca9764a898?w=400&h=240&fit=crop&auto=format", imgH: 240, likes: 560, saves: 310 },
  { id: "p5", artistId: "a2", title: "Pájaro Metálico", description: "Escultura digital en ZBrush llevada a render final en Blender con Cycles. El material imita latón pulido oxidado, con imperfecciones generadas proceduralmente. La pose busca transmitir movimiento suspendido en el tiempo.", palette: ["#8a7040","#c0a060","#e8d8a0","#3a2810","#d0b870"], software: "ZBrush, Blender, Cycles", publishedAt: "20 jun 2025", type: "3D", tags: ["animal","metal","escultura"], imgUrl: "https://images.unsplash.com/photo-1637404230552-5ac6d76cb3a0?w=400&h=530&fit=crop&auto=format", imgH: 530, likes: 1870, saves: 1440 },
  { id: "p6", artistId: "a3", title: "Mirada Clara", description: "Editorial de moda en estudio con fondo neutro. La composición centra toda la atención en los ojos del sujeto, utilizando una sola fuente de luz suave lateral para moldear el rostro sin perder el detalle en las sombras.", palette: ["#c09878","#e8c8a8","#f0e8d8","#7a5840","#a07858"], exif: { camara: "Canon R5", apertura: "f/2.0", velocidad: "1/125s", iso: "ISO 800", focal: "135mm" }, publishedAt: "9 jul 2025", type: "Fotografía", tags: ["portrait","editorial","luz"], imgUrl: "https://images.unsplash.com/photo-1516117525866-d85459db7457?w=400&h=560&fit=crop&auto=format", imgH: 560, likes: 720, saves: 490 },
  { id: "p7", artistId: "a4", title: "Medusas en la Oscuridad", description: "Composición fotográfica editada en Photoshop. Las medusas originales fueron recortadas y reintegradas en un entorno creado con texturas de tinta en agua. El resultado evoca la bioluminiscencia de los fondos marinos abisales.", palette: ["#0a1828","#1a4868","#40a0c8","#80d8f0","#0a2838"], software: "Photoshop, Lightroom", resources: [{name:"Preset Marina.xmp"}], publishedAt: "14 ago 2025", type: "Edición", tags: ["edición","marina","atmósfera"], imgUrl: "https://images.unsplash.com/photo-1670509624628-bbe8efe126a1?w=400&h=300&fit=crop&auto=format", imgH: 300, likes: 4430, saves: 3210 },
  { id: "p8", artistId: "a1", title: "Doncella Fantástica", description: "Personaje de fantasía original inspirado en mitologías del mediterráneo. El proceso comenzó con bocetos a lápiz, digitalizados y pintados con técnica de renderizado de capas en Procreate. Cada detalle del atuendo tiene su propia paleta de texturas.", palette: ["#6a3050","#c06880","#f0c0a0","#2a1020","#984868"], software: "Procreate", publishedAt: "1 sep 2025", type: "2D", tags: ["fantasía","personaje","ilustración"], imgUrl: "https://images.unsplash.com/photo-1617275528041-696c1e3d1872?w=400&h=480&fit=crop&auto=format", imgH: 480, likes: 2100, saves: 1560 },
  { id: "p9", artistId: "a2", title: "Estructura Rosa-Azul", description: "Exploración geométrica abstracta modelada en Cinema 4D. Los colores complementarios rosa y azul se eligieron para generar tensión visual mientras las formas orgánicas crean un contrapunto con la precisión matemática de la estructura.", palette: ["#d060a0","#4060c0","#f0b8d8","#2030a0","#e890c0"], software: "Cinema 4D, Redshift", publishedAt: "22 oct 2024", type: "3D", tags: ["abstracto","color","render"], imgUrl: "https://images.unsplash.com/photo-1633783156075-a01661455344?w=400&h=250&fit=crop&auto=format", imgH: 250, likes: 1650, saves: 1020 },
  { id: "p10", artistId: "a3", title: "Velo Oscuro", description: "Retrato conceptual sobre identidad y cultura. El velo se convierte en metáfora visual de capas de significado. Iluminación dramática lateral con un solo flash a baja potencia para preservar la textura del tejido.", palette: ["#101018","#282830","#604848","#906858","#1a1820"], exif: { camara: "Nikon Z7 II", apertura: "f/2.8", velocidad: "1/60s", iso: "ISO 1600", focal: "50mm" }, publishedAt: "7 nov 2024", type: "Fotografía", tags: ["velo","cultura","retrato"], imgUrl: "https://images.unsplash.com/photo-1675726205553-4e348f24da2c?w=400&h=580&fit=crop&auto=format", imgH: 580, likes: 980, saves: 750 },
  { id: "p11", artistId: "a4", title: "Baraja de la Muerte", description: "Ilustración oscura con estética de tarot moderno. El cráneo central está construido con geometría vectorial y texturizado con Photoshop. El fondo fue pintado con técnica de aguada digital para simular papel envejecido.", palette: ["#c89840","#f0d870","#2a1808","#e8c050","#8a6020"], software: "Illustrator, Photoshop", resources: [{name:"Vectores Tarot.ai"}], publishedAt: "30 dic 2024", type: "2D", tags: ["dark","cráneo","fantasía"], imgUrl: "https://images.unsplash.com/photo-1647337844509-3da06f493872?w=400&h=360&fit=crop&auto=format", imgH: 360, likes: 3890, saves: 2950 },
  { id: "p12", artistId: "a4", title: "Forma Flotante", description: "Objeto 3D minimalista en Blender con shader de gradiente personalizado. El fondo negro absoluto y la única fuente de luz puntual superior buscan crear la ilusión de levitación y ausencia de contexto espacial.", palette: ["#0a0818","#2040a0","#4080e0","#80c0f8","#102060"], software: "Blender, EEVEE", publishedAt: "15 ene 2025", type: "3D", tags: ["abstracto","minimalista","azul"], imgUrl: "https://images.unsplash.com/photo-1647791753411-4cc21f9c85da?w=400&h=290&fit=crop&auto=format", imgH: 290, likes: 2270, saves: 1780 },
  { id: "p13", artistId: "a3", title: "Introspección", description: "Autorretrato fotográfico en blanco y negro. Expuesto con intención de subexposición para que los medios tonos desaparezcan y solo queden las luces más altas del rostro. Sin retoque digital, tal como salió de cámara.", palette: ["#101010","#303030","#606060","#a0a0a0","#d8d8d8"], exif: { camara: "Leica M11", apertura: "f/4.0", velocidad: "1/30s", iso: "ISO 6400", focal: "28mm" }, publishedAt: "28 feb 2025", type: "Fotografía", tags: ["editorial","moody","b&w"], imgUrl: "https://images.unsplash.com/photo-1525547843489-d0aab95e5ce1?w=400&h=400&fit=crop&auto=format", imgH: 400, likes: 1340, saves: 870 },
  { id: "p14", artistId: "a4", title: "Retrato Grayscale", description: "Edición dramática de retrato masculino. El proceso incluyó dodge & burn intensivo para esculpir la piel, seguido de una conversión a escala de grises con canal rojo elevado para maximizar el contraste en la textura facial.", palette: ["#181818","#484848","#787878","#b8b8b8","#e8e8e8"], software: "Capture One, Photoshop", resources: [{name:"Look Dramatic.cube"},{name:"Acciones PS.atn"}], publishedAt: "11 mar 2025", type: "Edición", tags: ["b&w","edición","dramatic"], imgUrl: "https://images.unsplash.com/photo-1555816687-434033d6739a?w=400&h=560&fit=crop&auto=format", imgH: 560, likes: 2980, saves: 2110 },
  { id: "p15", artistId: "a2", title: "Arcos Geométricos", description: "Serie de arcos concatenados generados con geometría paramétrica en Houdini. Cada arco hereda el ángulo de torsión del anterior, creando una curva helicoidal emergente que no fue diseñada manualmente sino calculada por el sistema.", palette: ["#e0d0c0","#c0a890","#806040","#f0e8d8","#a08060"], software: "Houdini, Mantra", publishedAt: "2 may 2025", type: "3D", tags: ["geometría","render","espacio"], imgUrl: "https://images.unsplash.com/photo-1627037558426-c2d07beda3af?w=400&h=260&fit=crop&auto=format", imgH: 260, likes: 1120, saves: 810 },
];

function getArtistForPin(pin) {
  const map = getArtistMap();
  return map[String(pin.artistId)] || map[pin.artistId] || (PINAPP.artists || [])[0] || null;
}

function getAllPins() {
  const apiPins = PINAPP.pins;
  const base = apiPins && apiPins.length > 0 ? apiPins : PINS_FALLBACK;
  return [...(PINAPP.userPins || []), ...base];
}

function getFilteredPins() {
  let pins = getAllPins();
  if (PINAPP.activeType && PINAPP.activeType !== "Todos") {
    pins = pins.filter((p) => p.type === PINAPP.activeType);
  }
  if (PINAPP.search && PINAPP.search.trim()) {
    const q = PINAPP.search.toLowerCase();
    pins = pins.filter((p) => {
      const artist = getArtistForPin(p);
      return (
        (p.title || "").toLowerCase().includes(q) ||
        (p.type || "").toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q)) ||
        (artist?.name || "").toLowerCase().includes(q) ||
        (artist?.handle || "").toLowerCase().includes(q)
      );
    });
  }
  return pins;
}

// Convierte una fila de la vista SQL vista_feed_publicaciones al shape de Pin usado por la app
function mapPinDesdeApi(fila) {
  const artistaIdNum = parseInt(String(fila.artista_id || "").replace(/\D/g, ""), 10) || 0;
  const artistKey = artistaIdNum > 0 ? "a" + artistaIdNum : String(fila.artista_id || "a1");
  const imgUrl = fila.img_url || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600";
  return {
    id: String(fila.publicacion_id || ""),
    artistId: artistKey,
    title: fila.titulo || "Sin título",
    description: null,
    palette: null,
    software: null,
    resources: [],
    type: fila.categoria || "2D",
    tags: [],
    imgUrl,
    imgH: 400,
    publishedAt: fila.published_at || undefined,
    likes: Number(fila.total_me_gusta) || 0,
    saves: Number(fila.total_guardados) || 0,
  };
}

// Carga el feed desde la API de PHP (vista_feed_publicaciones) y re-renderiza
function cargarFeed() {
  return obtenerFeed()
    .then((data) => {
      const pins = Array.isArray(data) ? data.map(mapPinDesdeApi) : [];
      PINAPP.pins = pins.length > 0 ? pins : null;
      render();
    })
    .catch((err) => {
      console.error("Error al obtener el feed:", err);
      PINAPP.pins = null;
    });
}

function renderFeed() {
  const pins = getFilteredPins();
  let html = `<main style="padding:24px 20px 60px;">`;
  if (pins.length === 0) {
    html += `<div style="text-align:center; padding:100px 0; color:#7a909f;">
      <p style="font-size:18px; font-family:'Playfair Display', serif; marginBottom:8px;">Sin resultados para "${escapeHtml(PINAPP.search)}"</p>
      <p style="font-size:14px;">Intenta con otro término o categoría.</p>
    </div>`;
  } else {
    html += `<div class="masonry-grid">${pins.map((pin) => renderTarjetaPin(pin)).join("")}</div>`;
  }
  html += `</main>`;
  return html;
}

function renderTarjetaPin(pin) {
  const artist = getArtistForPin(pin);
  return `
    <div class="masonry-item">
      <div class="pin-card" data-pin-id="${escapeHtml(pin.id)}" onclick="abrirPinPorId('${escapeHtml(pin.id)}')">
        <img src="${pin.imgUrl}" alt="${escapeHtml(pin.title)}" style="width:100%; display:block; border-radius:16px;" loading="lazy" />
        <div class="overlay">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
            <span class="${tagClass(pin.type)}">${escapeHtml(pin.type)}</span>
            <button class="save-btn" onclick="event.stopPropagation(); abrirModalGuardarPorPinId('${escapeHtml(pin.id)}')" aria-label="Guardar" style="background:#00385a; color:#fff; border:none; border-radius:20px; padding:8px 18px; font-family:'DM Sans',sans-serif; font-weight:600; font-size:14px; cursor:pointer; transition:background 0.15s ease;">
              <span class="save-label">Guardar</span>
              <svg class="save-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
            </button>
          </div>
          <div class="pin-info">
            <p style="margin:0 0 6px; font-weight:600; font-size:13px; color:#e8eef2; lineHeight:1.3;">${escapeHtml(pin.title)}</p>
            <button onclick="event.stopPropagation(); handleArtist('${escapeHtml(pin.artistId)}')" style="background:none; border:none; cursor:pointer; display:flex; align-items:center; gap:6px; padding:0;">
              <img src="${artist?.avatar || pin.imgUrl}" alt="${artist?.name || 'Artista'}" style="width:22px; height:22px; border-radius:50%; objectFit:cover;" />
              <span style="font-size:12px; color:#b0c8d8; font-weight:500;">${escapeHtml(artist?.name || '')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
