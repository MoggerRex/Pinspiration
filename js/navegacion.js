// ==========================================================================
// navegacion.js — Manejo de vistas, drawers y modales (migración desde React)
// ==========================================================================

// ─── Estado global de la aplicación ─────────────────────────────────────────

const PINAPP = {
  user: null,
  view: "feed",
  search: "",
  activeType: "Todos",
  profileId: null,
  savePin: null,
  savedNotif: null,
  drawerOpen: false,
  history: [],
  boards: [],
  userPins: [],
  artists: [],
  pins: null,
  pinStack: [],
  prevView: "feed",
  feedOption: "Para ti",
  feedMenuOpen: false,
  boardModalCreating: false,
  boardModalName: "",
  selectedBoardId: null,
};

const TIPOS = ["Todos", "2D", "3D", "Fotografía", "Edición"];
const CATEGORIAS = ["2D", "3D", "Fotografía", "Edición"];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNum(n) {
  n = Number(n) || 0;
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : n.toString();
}

function tagClass(type) {
  switch (type) {
    case "2D": return "tag-badge tag-2d";
    case "3D": return "tag-badge tag-3d";
    case "Fotografía": return "tag-badge tag-photo";
    case "Edición": return "tag-badge tag-edit";
  }
  return "tag-badge";
}

// ─── Artistas (fallback + mapa combinado) ────────────────────────────────────

const ARTISTS_FALLBACK = [
  { id: "a1", name: "Valeria Mora", handle: "valeria.art", avatar: "https://images.unsplash.com/photo-1516117525866-d85459db7457?w=80&h=80&fit=crop&auto=format", bio: "Ilustradora 2D | Personajes y mundos de fantasía oscura", followers: 4820, following: 312, headerBg: "linear-gradient(0deg, #13191d 5%, #00385a 100%)" },
  { id: "a2", name: "Marcos Selin32", handle: "m.selin3d", avatar: "https://images.unsplash.com/photo-1637059880830-59a90102de77?w=80&h=80&fit=crop&auto=format", bio: "Artista 3D | Esculturas digitales y renders cinemáticos", followers: 9140, following: 210, headerBg: "linear-gradient(0deg, #13191d 5%, #00385a 100%)" },
  { id: "a3", name: "Lucia Tavares", handle: "lucia.lens", avatar: "https://images.unsplash.com/photo-1675726205553-4e348f24da2c?w=80&h=80&fit=crop&auto=format", bio: "Fotógrafa | Retratos moodys y editorial oscuro", followers: 3560, following: 430, headerBg: "linear-gradient(0deg, #13191d 5%, #00385a 100%)" },
  { id: "a4", name: "Dani Reyes", handle: "danireyes.edit", avatar: "https://images.unsplash.com/photo-1555816687-434033d6739a?w=80&h=80&fit=crop&auto=format", bio: "Editor & Fotógrafo | Manipulación digital y moodboards", followers: 6200, following: 180, headerBg: "linear-gradient(0deg, #13191d 5%, #00385a 100%)" },
];

function getArtistMap() {
  const map = {};
  (PINAPP.artists || []).forEach((a) => {
    if (!a) return;
    map[a.id] = a;
    map[String(a.id)] = a;
  });
  (ARTISTS_FALLBACK || []).forEach((a) => {
    if (!map[a.id]) map[a.id] = a;
    map[String(a.id)] = a;
  });
  return map;
}

function getCategoryClass(type) {
  switch (type) {
    case "2D": return "cat-2d";
    case "3D": return "cat-3d";
    case "Fotografía": return "cat-fotografia";
    case "Edición": return "cat-edicion";
    default: return "";
  }
}

// ─── Utilidades de usuario/artista ──────────────────────────────────────────

function obtenerAvatarUsuario(usuario) {
  return (
    usuario?.avatar ||
    usuario?.avatar_url ||
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200"
  );
}

function obtenerNombreUsuario(usuario) {
  return usuario?.nombre || usuario?.name || "Usuario";
}

function obtenerHandleUsuario(usuario) {
  const handle = usuario?.handle || "";
  return handle.startsWith("@") ? handle : "@" + (handle || "usuario");
}

function obtenerHeaderBgUsuario(usuario) {
  return usuario?.headerBg || usuario?.header_bg || "linear-gradient(0deg, #13191d 5%, #00385a 100%)";
}

// ─── Sesión / usuario ────────────────────────────────────────────────────────

function getUser() {
  return PINAPP.user;
}

function setUser(user) {
  PINAPP.user = user;
  localStorage.setItem("pinspiration_user", JSON.stringify(user));
  render();
}

function handleLogout() {
  localStorage.removeItem("pinspiration_user");
  PINAPP.user = null;
  PINAPP.view = "feed";
  PINAPP.pinStack = [];
  PINAPP.boards = [];
  PINAPP.history = [];
  PINAPP.userPins = [];
  PINAPP.profileId = null;
  PINAPP.drawerOpen = false;
  PINAPP.savePin = null;
  render();
}

// ─── Navegación entre vistas ─────────────────────────────────────────────────

function navigate(view) {
  PINAPP.view = view;
  PINAPP.pinStack = [];
  PINAPP.search = "";
  if (view === "profile") {
    PINAPP.profileId = PINAPP.user?.id || "a1";
  }
  if (view !== "pin") {
    PINAPP.prevView = PINAPP.view;
  }
  if (view === "feed") {
    PINAPP.activeType = "Todos";
  }
  document.getElementById("root")?.scrollTo?.({ top: 0, behavior: "smooth" });
  render();
}

function navigateFromDrawer(view) {
  PINAPP.drawerOpen = false;
  navigate(view);
}

function cambiarTipo(tipo) {
  PINAPP.activeType = tipo;
  if (PINAPP.view !== "feed") {
    navigate("feed");
    return;
  }
  document.getElementById("root")?.scrollTo?.({ top: 0, behavior: "smooth" });
  render();
}

function actualizarBusqueda(valor) {
  PINAPP.search = valor;
  if (PINAPP.view !== "feed") {
    navigate("feed");
    return;
  }
  render();
}

function alternarFeedDropdown() {
  PINAPP.feedMenuOpen = !PINAPP.feedMenuOpen;
  const dropdown = document.getElementById("feed-dropdown");
  if (dropdown) dropdown.style.display = PINAPP.feedMenuOpen ? "flex" : "none";
}

function elegirFeed(opcion) {
  PINAPP.feedOption = opcion;
  PINAPP.feedMenuOpen = false;
  const dropdown = document.getElementById("feed-dropdown");
  if (dropdown) dropdown.style.display = "none";
  if (PINAPP.view !== "feed") navigate("feed");
}

// ─── Pila de navegación de publicaciones ────────────────────────────────────

function openPin(pin) {
  PINAPP.history = [pin].concat((PINAPP.history || []).filter((p) => p.id !== pin.id)).slice(0, 50);
  if (PINAPP.view !== "pin") {
    PINAPP.prevView = PINAPP.view;
  }
  PINAPP.pinStack = [...(PINAPP.pinStack || []), pin];
  PINAPP.view = "pin";
  document.getElementById("root")?.scrollTo?.({ top: 0, behavior: "smooth" });

  if (PINAPP.user?.id && pin.id) {
    apiFetch("/historial", {
      method: "POST",
      body: JSON.stringify({
        usuario_id: PINAPP.user.id,
        publicacion_id: pin.id,
        pin: pin,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Error guardando historial");
      })
      .catch((err) => console.error("Error guardando en historial:", err));
  }

  render();
}

function abrirPinPorId(id) {
  const pin = (PINAPP.history || []).find((p) => p.id === id) || (PINAPP.boards || []).flatMap((b) => b.pins || []).find((p) => p.id === id);
  if (pin) openPin(pin);
}

function handleBackFromPin() {
  if ((PINAPP.pinStack || []).length > 1) {
    PINAPP.pinStack = PINAPP.pinStack.slice(0, -1);
  } else {
    PINAPP.pinStack = [];
    PINAPP.view = PINAPP.prevView || "feed";
  }
  document.getElementById("root")?.scrollTo?.({ top: 0, behavior: "smooth" });
  render();
}

// ─── Tableros / guardado ────────────────────────────────────────────────────

function handleCreateBoard(name) {
  const userId = PINAPP.user?.id;
  if (!userId) return;
  apiFetch("/tableros", {
    method: "POST",
    body: JSON.stringify({ usuario_id: userId, nombre: name }),
  })
    .then((res) => res.json())
    .then((newBoard) => {
      if (newBoard.error) throw new Error(newBoard.error);
      PINAPP.boards = [
        ...(PINAPP.boards || []),
        { id: String(newBoard.id), name: newBoard.nombre, pins: [] },
      ];
      render();
    })
    .catch((err) => console.error("Error creando tablero:", err));
}

function handleSaveToBoard(boardId) {
  const savePin = PINAPP.savePin;
  const userId = PINAPP.user?.id;
  if (!savePin || !userId) return;

  const boardName = (PINAPP.boards || []).find((b) => b.id === boardId)?.name;

  apiFetch("/tableros/guardar", {
    method: "POST",
    body: JSON.stringify({
      tablero_id: boardId,
      usuario_id: userId,
      publicacion_id: savePin.id,
      pin: savePin,
    }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Error al guardar el pin");
      return res.json();
    })
    .then(() => {
      PINAPP.boards = (PINAPP.boards || []).map((b) => {
        if (b.id !== boardId) return b;
        const exists = (b.pins || []).some((p) => p.id === savePin.id);
        return { ...b, pins: exists ? b.pins : [...(b.pins || []), savePin] };
      });
      PINAPP.savePin = null;
      PINAPP.savedNotif = `Guardado en "${boardName}"`;
      setTimeout(() => {
        PINAPP.savedNotif = null;
        render();
      }, 2500);
    })
    .catch((err) => console.error("Error guardando en tablero:", err));
}

function handleGuardarEnTablero(boardId) {
  handleSaveToBoard(boardId);
}

function setBoardModalCreating(valor) {
  PINAPP.boardModalCreating = valor;
  if (valor) PINAPP.boardModalName = "";
  render();
}

function submitCrearTablero(event) {
  event.preventDefault();
  const input = document.getElementById("board-create-input");
  const name = (input?.value || "").trim();
  if (name) {
    handleCreateBoard(name);
  }
  PINAPP.boardModalCreating = false;
  render();
}

function abrirModalGuardarPorPin(pin) {
  PINAPP.savePin = pin;
  render();
}

function abrirModalGuardarPorPinId(id) {
  const pin = (PINAPP.history || []).find((p) => p.id === id) || (PINAPP.boards || []).flatMap((b) => b.pins || []).find((p) => p.id === id);
  if (pin) {
    PINAPP.savePin = pin;
    render();
  }
}

// ─── Perfil / artista ────────────────────────────────────────────────────────

function handleArtist(id) {
  PINAPP.profileId = id;
  PINAPP.view = "profile";
  document.getElementById("root")?.scrollTo?.({ top: 0, behavior: "smooth" });
  render();
}

function handleUpdateUser(updatedData) {
  PINAPP.user = { ...PINAPP.user, ...updatedData };
  localStorage.setItem("pinspiration_user", JSON.stringify(PINAPP.user));
  render();
}

// ─── Render: orquestación principal ─────────────────────────────────────────

function render() {
  const root = document.getElementById("root");
  if (!root) return;

  // Bloqueo de scroll del fondo cuando un modal del detalle está abierto
  const pinActual = PINAPP.view === "pin" ? (PINAPP.pinStack[PINAPP.pinStack.length - 1] || null) : null;
  const modalAbierto = pinActual ? (DETALLE.lightbox || DETALLE.descModalOpen || DETALLE.commentsModalOpen) : false;
  const scrollLock = modalAbierto ? "hidden" : "";
  document.documentElement.style.overflow = scrollLock;
  document.body.style.overflow = scrollLock;

  if (!PINAPP.user) {
    root.innerHTML = renderLogin();
    return;
  }

  let html = "";

  if (PINAPP.savedNotif) {
    html += `<div style="position:fixed; bottom:28px; left:50%; transform:translateX(-50%); background:#00385a; color:#fff; border-radius:30px; padding:10px 24px; font-family:'DM Sans',sans-serif; font-weight:600; font-size:14px; z-index:200; box-shadow:0 4px 24px rgba(0,56,90,0.5); animation:slideUp 0.2s ease; width:max-content; max-width:90vw; text-align:center;">${escapeHtml(PINAPP.savedNotif)}</div>`;
  }

  if (PINAPP.savePin) {
    html += renderModalGuardarPin();
  }

  if (PINAPP.drawerOpen) {
    html += renderMenuHamburguesa();
  }

  html += renderBarraNavegacion();

  switch (PINAPP.view) {
    case "feed":
      html += renderFeed();
      break;
    case "pin":
      html += renderDetalleObra(PINAPP.pinStack[PINAPP.pinStack.length - 1] || null);
      break;
    case "profile":
      html += renderPerfil();
      break;
    case "boards":
      html += renderTableros();
      break;
    case "historial":
      html += renderHistorial();
      break;
    case "sobre":
      html += renderSobreNosotros();
      break;
    case "crear":
      html += renderCrear();
      break;
    default:
      html += renderFeed();
  }

  root.innerHTML = normalizarEstilosHtml(html);
}

// Convierte propiedades CSS camelCase (React) a kebab-case (CSS nativo) dentro de los style="..." del HTML generado
function normalizarEstilosHtml(html) {
  if (typeof html !== "string") return html;
  return html.replace(/style="([^"]*)"/g, function (match, styleStr) {
    const parts = styleStr.split(";").map(function (s) { return s.trim(); }).filter(Boolean).map(function (part) {
      const ci = part.indexOf(":");
      if (ci < 0) return part;
      const prop = part.slice(0, ci).trim();
      const val = part.slice(ci + 1).trim();
      const kebab = prop.replace(/([A-Z])/g, function (ch, offset) {
        return offset === 0 ? ch.toLowerCase() : "-" + ch.toLowerCase();
      });
      return kebab + ":" + val;
    });
    return 'style="' + parts.join(";") + '"';
  });
}

// ─── Barra de navegación ─────────────────────────────────────────────────────

function renderBarraNavegacion() {
  const view = PINAPP.view;
  const activeType = PINAPP.activeType;
  const feedLabel = PINAPP.feedOption || "Para ti";

  const categoryButtons = TIPOS.map((t) => {
    return `<button class="cat-pill${t === activeType ? " active" : ""}" data-type="${t}" onclick="cambiarTipo('${t}')">${t}</button>`;
  }).join("");

  return `
    <header class="barra-navegacion">
      <div class="nav-row-1">
        <button class="boton-nav nav-item-hamburger" id="nav-hamburger" onclick="abrirMenuHamburguesa()" aria-label="Menú principal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="nav-logo nav-item-logo" onclick="navigate('feed')">
          <div class="nav-logo-icon">P</div>
          <span class="nav-logo-text font-display">Pinspiration</span>
        </div>
        <button class="boton-nav nav-item-perfil ${view === "profile" ? "active" : ""}" onclick="navigate('profile')" aria-label="Perfil">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="nav-text-label">Perfil</span>
        </button>
      </div>

      <div class="nav-row-2">
        <div class="search-container nav-item-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" id="nav-search-input" placeholder="Busca arte, artistas, etiquetas..." value="${escapeHtml(PINAPP.search)}" oninput="actualizarBusqueda(this.value)" />
        </div>
      </div>

      <div class="nav-row-3">
        <div class="nav-feed-wrapper nav-item-feed">
          <button class="boton-nav" id="nav-feed-toggle" onclick="alternarFeedDropdown()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PINAPP.feedMenuOpen ? '<polyline points="6 9 12 15 18 9"/>' : '<polyline points="9 18 15 12 9 6"/>'}</svg>
            <span>${escapeHtml(feedLabel)}</span>
          </button>
          <div class="feed-dropdown" id="feed-dropdown" style="display:none">
            <button class="dropdown-item ${PINAPP.feedOption === "Para ti" ? "active" : ""}" onclick="elegirFeed('Para ti')">Para ti</button>
            <button class="dropdown-item ${PINAPP.feedOption === "Siguiendo" ? "active" : ""}" onclick="elegirFeed('Siguiendo')">Siguiendo</button>
          </div>
        </div>

        <div class="nav-categorias nav-item-categorias">${categoryButtons}</div>

        <button class="boton-nav nav-item-tableros ${view === "boards" ? "active" : ""}" onclick="navigate('boards')" aria-label="Tableros">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          <span class="nav-text-label">Tableros</span>
        </button>
      </div>
    </header>
  `;
}

// ─── Drawer: Menú Hamburguesa ────────────────────────────────────────────────

function renderMenuHamburguesa() {
  const user = PINAPP.user;
  const menuItems = [
    { view: "crear", label: "Crear Pin", sub: "Publica tu obra de arte", highlight: true },
    { view: "profile", label: "Mi perfil", sub: "Tu cuenta y publicaciones", highlight: false },
    { view: "artists", label: "Artistas", sub: "Explora perfiles de artistas", highlight: false },
    { view: "boards", label: "Mis tableros", sub: `${(PINAPP.boards || []).length} tableros guardados`, highlight: false },
    { view: "historial", label: "Historial", sub: `${(PINAPP.history || []).length} pines visitados`, highlight: false },
    { view: "sobre", label: "Sobre nosotros", sub: "Conoce nuestra misión", highlight: false },
    { view: "sobre", label: "Modo Claro/Oscuro", sub: "Cambiar entre modos", highlight: false },
  ];

  const itemsHtml = menuItems
    .map((item) => {
      const icon =
        item.view === "crear"
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 0 0 3 16.3"/></svg>'
          : item.view === "profile"
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
          : item.view === "artists"
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
          : item.view === "boards"
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>'
          : item.view === "historial"
          ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 0 0 0.49-4.95"/></svg>'
          : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

      return `
        <button class="drawer-item" data-drawer-view="${item.view}" onclick="navegarDrawer('${item.view}')" style="width:100%; background:${item.highlight ? "linear-gradient(135deg,#00385a,#0a5a8a)" : "none"}; border:none; border-radius:12px; padding:12px 14px; cursor:pointer; display:flex; align-items:center; gap:14px; text-align:left; transition:background 0.15s, opacity 0.15s; margin-bottom:4px; opacity:${item.highlight ? 1 : 0.92}">
          <span style="color:${item.highlight ? "#fff" : "#00385a"}; flex-shrink:0;">${icon}</span>
          <div>
            <p style="margin:0; font-weight:600; font-size:14px; color:${item.highlight ? "#fff" : "#e8eef2"};">${escapeHtml(item.label)}</p>
            <p style="margin:0; font-size:12px; color:${item.highlight ? "#a0d0f0" : "#7a909f"};">${escapeHtml(item.sub)}</p>
          </div>
          <span style="margin-left:auto; color:${item.highlight ? "#a0d0f0" : "#4a5e6a"}; font-size:18;">›</span>
        </button>`;
    })
    .join("");

  const userAvatar = obtenerAvatarUsuario(user);
  const userName = obtenerNombreUsuario(user);
  const userHandle = obtenerHandleUsuario(user);

  return `
    <div id="drawer-backdrop" onclick="cerrarMenuHamburguesa()" style="position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(3px); z-index:1000; opacity:1; pointer-events:all; transition:opacity 0.3s ease;"></div>
    <div style="position:fixed; top:0; left:0; bottom:0; width:300px; max-width:90vw; background:#1a2228; border-right:1px solid #242f38; z-index:1001; transform:translateX(0); transition:transform 0.32s cubic-bezier(0.4,0,0.2,1); display:flex; flex-direction:column; box-shadow:8px 0 40px rgba(0,0,0,0.5);">
      <div style="display:flex; align-items:center; justify-content:space-between; padding:20px 20px 16px; border-bottom:1px solid #242f38; flex-shrink:0;">
        <div style="display:flex; align-items:center; gap:8px;">
          <div style="width:28px; height:28px; border-radius:8px; background:linear-gradient(135deg, #00385a 0%, #1a7abf 100%); display:flex; align-items:center; justify-content:center; font-size:15px; font-weight:900; color:#fff; font-family:'Playfair Display', serif;">P</div>
          <span style="font-family:'Playfair Display', serif; font-weight:700; font-size:18px; color:#00385a;">Pinspiration</span>
        </div>
        <button onclick="cerrarMenuHamburguesa()" style="background:none; border:none; cursor:pointer; color:#7a909f; padding:4px;" onmouseenter="this.style.color='#e8eef2'" onmouseleave="this.style.color='#7a909f'">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div style="display:flex; align-items:center; gap:12px; padding:16px 20px; border-bottom:1px solid #242f38;">
        <img src="${userAvatar}" alt="${userName}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid #00385a;" />
        <div>
          <p style="margin:0; font-weight:600; font-size:15px; color:#e8eef2;">${userName}</p>
          <p style="margin:0; font-size:12px; color:#7a909f;">${userHandle}</p>
        </div>
      </div>

      <nav style="padding:12px; flex:1; overflow-y:auto;">${itemsHtml}</nav>

      <div style="padding:12px 16px 20px; border-top:1px solid #242f38; flex-shrink:0;">
        <button onclick="handleLogout()" style="width:100%; background:rgba(224,90,90,0.1); border:1.5px solid rgba(224,90,90,0.3); border-radius:12px; padding:12px 14px; cursor:pointer; display:flex; align-items:center; gap:14px; text-align:left; color:#ff8080; font-weight:600; font-size:14px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </div>
  `;
}

function abrirMenuHamburguesa() {
  PINAPP.drawerOpen = true;
  render();
}

function cerrarMenuHamburguesa() {
  PINAPP.drawerOpen = false;
  render();
}

function navegarDrawer(view) {
  PINAPP.drawerOpen = false;
  if (view === "artists") {
    PINAPP.profileId = null;
    PINAPP.view = "profile";
    document.getElementById("root")?.scrollTo?.({ top: 0, behavior: "smooth" });
    render();
    return;
  }
  navigate(view);
}

// ─── Modal: Guardar pin en tablero ────────────────────────────────────────────

function renderModalGuardarPin() {
  const pin = PINAPP.savePin;
  const boards = PINAPP.boards || [];

  let optionsHtml = "";
  boards.forEach((b) => {
    optionsHtml += `
      <button class="modal-board-btn" data-board-id="${escapeHtml(b.id)}" onclick="handleGuardarEnTablero('${escapeHtml(b.id)}')" style="background:#13191d; border:1.5px solid #242f38; border-radius:12px; padding:10px 14px; color:#e8eef2; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500; cursor:pointer; text-align:left; display:flex; align-items:center; gap:10px; transition:border-color 0.15s;" onmouseenter="this.style.borderColor='#00385a'" onmouseleave="this.style.borderColor='#242f38'">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        ${escapeHtml(b.name)}
      </button>
    `;
  });

  const creating = PINAPP.boardModalCreating;

  const createFormHtml = creating
    ? `<form id="board-create-form" onsubmit="submitCrearTablero(event)" style="margin-top:16px; display:flex; gap:8px;">
        <input id="board-create-input" class="search-bar" placeholder="Nombre del tablero..." value="${escapeHtml(PINAPP.boardModalName)}" style="flex:1; padding:8px 14px; font-size:14px;" />
        <button type="submit" style="background:#00385a; border:none; border-radius:12px; padding:8px 16px; color:#fff; font-family:'DM Sans',sans-serif; font-weight:600; cursor:pointer; font-size:14px;">Crear</button>
      </form>`
    : "";

  const createBtnHtml = creating
    ? ""
    : `<button onclick="setBoardModalCreating(true)" style="margin-top:14px; background:none; border:1.5px dashed #242f38; border-radius:12px; padding:10px 14px; color:#7a909f; font-family:'DM Sans',sans-serif; font-size:14px; font-weight:500; cursor:pointer; width:100%; display:flex; align-items:center; gap:8px; transition:border-color 0.15s, color 0.15s;" onmouseenter="this.style.borderColor='#00385a'; this.style.color='#e8eef2'" onmouseleave="this.style.borderColor='#242f38'; this.style.color='#7a909f'">Crear nuevo tablero</button>`;

  return `
    <div class="modal-backdrop" id="modal-guardar-backdrop" onclick="cerrarModalGuardar()">
      <div class="modal-box" style="width:360px; padding:28px; max-width:92vw" onclick="event.stopPropagation()">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
          <h2 style="margin:0; font-size:20px; font-weight:700; font-family:'Playfair Display', serif;">Guardar pin</h2>
          <button onclick="cerrarModalGuardar()" style="background:none; border:none; cursor:pointer; color:#7a909f; padding:4px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div style="display:flex; gap:12px; margin-bottom:20px; align-items:center;">
          <img src="${pin.imgUrl}" alt="${escapeHtml(pin.title)}" style="width:60px; height:60px; border-radius:10px; object-fit:cover; flex-shrink:0;" />
          <div>
            <p style="margin:0; font-weight:600; font-size:14px; color:#e8eef2;">${escapeHtml(pin.title)}</p>
            <span class="${tagClass(pin.type)}" style="margin-top:4px; display:inline-block;">${escapeHtml(pin.type)}</span>
          </div>
        </div>
        <p style="margin:0 0 12px; font-size:13px; color:#7a909f; font-weight:500;">Elige un tablero</p>
        <div style="display:flex; flex-direction:column; gap:8px; max-height:200px; overflowY:auto;">
          ${optionsHtml}
          ${createFormHtml}
        </div>
        ${createBtnHtml}
      </div>
    </div>
  `;
}

function cerrarModalGuardar() {
  PINAPP.savePin = null;
  PINAPP.boardModalCreating = false;
  PINAPP.boardModalName = "";
  render();
}

// ─── Vistas simples: Historial ───────────────────────────────────────────────

function renderHistorial() {
  const history = PINAPP.history || [];

  let itemsHtml = "";
  history.forEach((pin) => {
    itemsHtml += `
      <div class="historial-item" onclick="abrirPinPorId('${escapeHtml(pin.id)}')" style="display:flex; gap:12px; align-items:center; background:#1a2228; border-radius:12px; padding:10px; cursor:pointer; border:1px solid #242f38; transition:border-color 0.15s;" onmouseenter="this.style.borderColor='#00385a'" onmouseleave="this.style.borderColor='#242f38'">
        <img src="${pin.imgUrl}" alt="${escapeHtml(pin.title)}" style="width:52px; height:52px; border-radius:8px; object-fit:cover; flex-shrink:0;" />
        <div style="flex:1; min-width:0;">
          <p style="margin:0 0 4px; font-weight:600; font-size:13px; color:#e8eef2; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(pin.title)}</p>
          <span class="${tagClass(pin.type)}" style="font-size:10px;">${escapeHtml(pin.type)}</span>
        </div>
        <button onclick="event.stopPropagation(); abrirModalGuardarPorPinId('${escapeHtml(pin.id)}')" style="background:#00385a; border:none; border-radius:8px; padding:6px 12px; color:#fff; font-size:12px; font-family:'DM Sans',sans-serif; font-weight:600; cursor:pointer; flex-shrink:0;">Guardar</button>
      </div>
    `;
  });

  const content = history.length === 0
    ? `<div style="text-align:center; padding:80px 0; color:#7a909f;"><p style="margin-top:12px; font-size:15px;">Aún no has abierto ningún pin.</p></div>`
    : `<div style="display:flex; flex-direction:column; gap:12px;">${itemsHtml}</div>`;

  return `
    <div style="min-height:100vh; background:#13191d; width:100%;">
      <div style="background:linear-gradient(0deg, #13191d 5%, #00385a 100%); padding-top:32px; padding-bottom:24px; padding-left:24px; padding-right:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <h1 style="margin:0 0 4px; font-family:'Playfair Display', serif; font-size:32px; font-weight:700; color:#e8eef2;">Historial</h1>
            <p style="margin:0; color:#7a909f; font-size:14px;">Pines que abriste recientemente</p>
          </div>
          <button onclick="navigate('feed')" class="cat-pill" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg><span>Volver</span></button>
        </div>
        <div style="height:1px; background:#242f38; margin-top:8px;"></div>
      </div>
      <div style="width:100%; padding:24px 24px 60px; box-sizing:border-box;">${content}</div>
    </div>
  `;
}

// ─── Vistas simples: Sobre Nosotros ──────────────────────────────────────────

function renderSobreNosotros() {
  const cards = [
    ["Feed masonry curado", "Descubre obras de arte organizadas en un feed visual dinámico."],
    ["Tableros personalizados", "Colecciona y organiza los pines que te inspiran en tus propios tableros."],
    ["Perfiles de artista", "Cada artista tiene su espacio para mostrar toda su obra al mundo."],
    ["Categorías especializadas", "Arte 2D, 3D, Fotografía y Edición — sin contenido fuera de lugar."],
  ];
  const valores = [
    ["Inspiración", "Fomentamos la creatividad continua al conectar artistas con obras que despiertan nuevas ideas."],
    ["Arte", "Valoramos la expresión visual en todas sus formas: 2D, 3D, fotografía y edición digital."],
    ["Comunidad", "Construimos un entorno de respeto y colaboración enfocado en apoyar a los creadores."],
    ["Creatividad", "Impulsamos la exploración de nuevas técnicas y estilos artísticos sin límites ni restricciones."],
    ["Diversidad visual", "Aceptamos la variedad de disciplinas artísticas dando a cada una su propio lugar."],
    ["Autenticidad", "Promovemos el trabajo original y genuino de cada artista dentro de la plataforma."],
  ];

  const cardsHtml = cards
    .map(([title, desc]) => `
      <div style="text-align:center; display:flex; flex-direction:column; align-items:center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1a7abf" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:#1a7abf; margin-bottom:12px;"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
        <p style="margin:0 0 8px; font-weight:600; font-size:15px; color:#e8eef2;">${title}</p>
        <p style="margin:0; font-size:13px; color:#7a909f; line-height:1.5;">${desc}</p>
      </div>
    `)
    .join("");

  const valoresHtml = valores
    .map(([title, desc]) => `
      <div style="padding:18px 20px; background:#1a2228; border-radius:14px; border:1px solid #242f38;">
        <p style="margin:0 0 6px; font-weight:600; font-family:'Playfair Display', serif; font-size:16px; color:#1a7abf;">${title}</p>
        <p style="margin:0; font-size:13px; color:#7a909f; line-height:1.5;">${desc}</p>
      </div>
    `)
    .join("");

  return `
    <div style="min-height:100vh; background:#13191d; width:100%;">
      <div style="background:linear-gradient(0deg, #13191d 5%, #00385a 100%); padding-top:32px; padding-bottom:24px; padding-left:24px; padding-right:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <h1 style="margin:0 0 4px; font-family:'Playfair Display', serif; font-size:32px; font-weight:700; color:#e8eef2;">Sobre Nosotros</h1>
            <p style="margin:0; color:#7a909f; font-size:14px;">Conoce más sobre la historia y misión de Pinspiration</p>
          </div>
          <button onclick="navigate('feed')" class="cat-pill" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg><span>Volver</span></button>
        </div>
        <div style="height:1px; background:#242f38; margin-top:8px;"></div>
      </div>
      <div style="width:100%; padding:32px 24px 60px; box-sizing:border-box;">
        <div style="margin-bottom:40px;">
          <h3 style="text-align:center; margin:0 0 14px; font-family:'Playfair Display', serif; font-size:22px; color:#e8eef2;">Nuestra misión y que ofrecemos</h3>
          <p style="text-align:center; margin:0; font-size:15px; color:#b0c8d8; line-height:1.8;">Pinspiration nació para dar a los artistas un espacio propio — un lugar donde el arte 2D, el 3D y la fotografía sean los protagonistas, sin ruido ni distracción. Creemos que la inspiración visual merece una plataforma hecha exclusivamente para quienes la crean.</p>
        </div>
        <div style="margin-bottom:40px;">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:24px;">
            ${cardsHtml}
          </div>
        </div>
        <div style="height:1px; background:#242f38; margin:40px 0;"></div>
        <div style="margin-bottom:40px;">
          <h3 style="text-align:center; margin:0 0 20px; font-family:'Playfair Display', serif; font-size:22px; color:#e8eef2;">Nuestros valores</h3>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:20px;">
            ${valoresHtml}
          </div>
        </div>
        <div style="height:1px; background:#242f38; margin:40px 0;"></div>
        <div style="margin-top:40px; padding:24px 20px; background:#1a2228; border-radius:16px; border:1px solid #242f38; text-align:center;">
          <p style="margin:0 0 16px; font-size:14px; font-weight:600; color:#e8eef2;">¿Tienes preguntas o quieres colaborar?</p>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px;">
            <a href="mailto:contacto@pinspiration.art" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 14px; background:#13191d; border-radius:10px; color:#b0c8d8; text-decoration:none; font-size:13px; border:1px solid #242f38;">✉️ contacto@pinspiration.art</a>
            <a href="#" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 14px; background:#13191d; border-radius:10px; color:#b0c8d8; text-decoration:none; font-size:13px; border:1px solid #242f38;">Instagram</a>
            <a href="#" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 14px; background:#13191d; border-radius:10px; color:#b0c8d8; text-decoration:none; font-size:13px; border:1px solid #242f38;">Twitter</a>
            <a href="#" style="display:flex; align-items:center; justify-content:center; gap:8px; padding:10px 14px; background:#13191d; border-radius:10px; color:#b0c8d8; text-decoration:none; font-size:13px; border:1px solid #242f38;">LinkedIn</a>
          </div>
        </div>
        <div style="height:1px; background:#242f38; margin:36px 0 20px;"></div>
        <footer style="text-align:center;"><p style="margin:0; font-size:12px; color:#7a909f;">© 2026 Pinspiration · Todos los derechos reservados</p></footer>
      </div>
    </div>
  `;
}

// ─── Detalle de Obra (DetalleObra) ──────────────────────────────────────────

const DETALLE = {
  lightbox: false,
  descModalOpen: false,
  commentsModalOpen: false,
  comments: [],
  commentInput: "",
  commentsCount: 85,
  mediaList: [],
  activeMediaIdx: 0,
  currentPalette: [],
  isSaved: false,
  savesCount: 342,
  isLiked: false,
  likesCount: 0,
  resourcesOpen: false,
};

let detallePinId = null;
let detallePinActual = null;
let detallePaletteUrl = null;
let detallePalettePinId = null;
let detallePaletteIdx = null;

function fallbackDetallePalette(pin, idx) {
  if (pin && pin.palette && pin.palette.length > 0) {
    if (String(idx) === "0") return pin.palette;
    const shifted = (pin.palette || []).map(function (color, i) {
      const num = parseInt(String(color || "").replace("#", ""), 16);
      if (isNaN(num)) return color;
      const shift = (Number(idx) * 0x2b4c6e + i * 0x1d3f5a) % 0xffffff;
      const newNum = (num ^ shift) & 0xffffff;
      return "#" + newNum.toString(16).padStart(6, "0");
    });
    return shifted;
  }
  return ["#1a2228", "#00385a", "#5db8e8", "#b0c8d8", "#e8eef2"];
}

function calcularPaletaDetalle(url, pin, idx, callback) {
  const img = new Image();
  img.crossOrigin = "Anonymous";
  img.src = url;
  img.onload = function () {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (ctx) {
        canvas.width = 40;
        canvas.height = 40;
        ctx.drawImage(img, 0, 0, 40, 40);
        const data = ctx.getImageData(0, 0, 40, 40).data;
        const colors = [];
        const samples = [[10, 10], [30, 10], [20, 20], [10, 30], [30, 30]];
        for (let s = 0; s < samples.length; s++) {
          const i = (samples[s][1] * 40 + samples[s][0]) * 4;
          const hex = "#" + (((1 << 24) + (data[i] << 16) + (data[i + 1] << 8) + data[i + 2]).toString(16)).slice(1);
          if (colors.indexOf(hex) === -1) colors.push(hex);
        }
        if (colors.length > 0) {
          while (colors.length < 5 && pin && pin.palette && pin.palette[colors.length]) colors.push(pin.palette[colors.length]);
          callback(colors.slice(0, 5));
          return;
        }
      }
      callback(fallbackDetallePalette(pin, idx));
    } catch (err) {
      callback(fallbackDetallePalette(pin, idx));
    }
  };
  img.onerror = function () {
    callback(fallbackDetallePalette(pin, idx));
  };
}

function resetDetalleState(pin) {
  if (pin) {
    const mediaListInicial = (pin.media && pin.media.length > 0) ? pin.media : [pin.imgUrl];
    DETALLE.mediaList = mediaListInicial;
    DETALLE.activeMediaIdx = 0;
    DETALLE.isSaved = false;
    DETALLE.savesCount = pin.saves || 342;
    DETALLE.isLiked = false;
    DETALLE.likesCount = pin.likes || 0;
    DETALLE.lightbox = false;
    DETALLE.descModalOpen = false;
    DETALLE.commentsModalOpen = false;
    DETALLE.commentInput = "";
    DETALLE.currentPalette = [];
  }
  detallePinId = pin ? String(pin.id) : null;
}

function commentsHtml() {
  let itemsHtml = "";
  DETALLE.comments.forEach(function (c) {
    itemsHtml += `
      <div style="display:flex; gap:14px; align-items:flex-start; padding-bottom:14px; border-bottom:1px solid rgba(36,47,56,0.5);">
        <img src="${c.avatar || ""}" alt="${escapeHtml(c.name)}" onclick="handleCommentUserClick('${escapeHtml(String(c.artistId || ""))}')" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1.5px solid #00385a; flex-shrink:0; cursor:pointer;" />
        <div style="flex:1; min-width:0;">
          <div style="display:flex; align-items:baseline; gap:8px; margin-bottom:4px;">
            <span onclick="handleCommentUserClick('${escapeHtml(String(c.artistId || ""))}')" style="font-weight:600; font-size:14px; color:#e8eef2; cursor:pointer;">${escapeHtml(c.name)}</span>
            <span style="font-size:12px; color:#7a909f;">@${escapeHtml(c.handle)}</span>
            <span style="font-size:11px; color:#4a5e6a; margin-left:auto;">${escapeHtml(c.date)}</span>
          </div>
          <p style="margin:0; font-size:14px; color:#c3d6e4; line-height:1.5; word-break:break-word;">${escapeHtml(c.text)}</p>
        </div>
      </div>
    `;
  });
  const emptyHtml = `<div style="text-align:center; padding:40px 0; color:#7a909f;"><p style="margin:0; font-size:14px;">Aún no hay comentarios. ¡Sé el primero en comentar!</p></div>`;
  return `<div style="flex:1; overflow-y:auto; padding:20px 28px; display:flex; flex-direction:column; gap:16px;">${DETALLE.comments.length === 0 ? emptyHtml : itemsHtml}</div>`;
}

function obtenerImagenGrande(url) {
  const base = String(url || "").split("?")[0];
  const params = String(url || "").split("?")[1];
  const parts = (params || "").split("&").filter(function (p) { return p && !/^w=/.test(p) && !/^h=/.test(p) && !/^fit=/.test(p); });
  return base + (parts.length ? "&" : "?") + "w=1200" + (parts.length ? "&" + parts.join("&") : "");
}

function renderDetalleObra(pin) {
  if (!pin) {
    return `<div style="min-height:100vh; background:#13191d;"></div>`;
  }

  const pinId = String(pin.id || "");
  if (detallePinId !== pinId) {
    resetDetalleState(pin);
  }
  detallePinActual = pin;

  const allPins = getAllPins();
  const artistMap = getArtistMap();
  const artist = artistMap[String(pin.artistId)] || artistMap[pin.artistId] || (PINAPP.artists || [])[0] || null;

  const mediaList = (DETAILE.mediaList && DETALLE.mediaList.length > 0) ? DETALLE.mediaList : [pin.imgUrl];
  const activeMediaIdx = Math.min(Number(DETAILE.activeMediaIdx) || 0, Math.max(0, mediaList.length - 1));
  const currentMediaUrl = mediaList[activeMediaIdx] || pin.imgUrl;

  if (detallePaletteUrl !== currentMediaUrl || detallePalettePinId !== pinId || detallePaletteIdx !== String(activeMediaIdx)) {
    detallePaletteUrl = currentMediaUrl;
    detallePalettePinId = pinId;
    detallePaletteIdx = String(activeMediaIdx);
    calcularPaletaDetalle(currentMediaUrl, pin, activeMediaIdx, function (paleta) {
      DETALLE.currentPalette = paleta;
      render();
    });
  }

  const currentPalette = DETALLE.currentPalette || [];
  const isSaved = DETALLE.isSaved;
  const savesCount = DETALLE.savesCount;
  const isLiked = DETALLE.isLiked;
  const likesCount = DETALLE.likesCount;

  const MAX_TAG_CHARS = 40;
  let used = 0;
  const visibleTags = (pin.tags || []).slice(0, 5).filter(function (t) {
    const cost = t.length + 1;
    if (used + cost <= MAX_TAG_CHARS) { used += cost; return true; }
    return false;
  });

  const resources = (pin.resources || []).filter(function (r) { return r && typeof r === "object"; });
  const hasResource = resources.length > 0;

  const related = allPins.filter(function (p) {
    return String(p.id) !== String(pin.id) && (p.type === pin.type || (p.tags || []).some(function (t) { return (pin.tags || []).includes(t); }));
  }).slice(0, 12);
  const others = allPins.filter(function (p) {
    return String(p.id) !== String(pin.id) && !related.some(function (r) { return String(r.id) === String(p.id); });
  }).slice(0, 8);
  const moreGrid = related.concat(others).slice(0, 15);

  let moreHtml = "";
  moreGrid.forEach(function (p) { moreHtml += renderTarjetaPin(p); });

  const artistName = artist?.name || "Artista";
  const artistHandle = artist?.handle || "";
  const artistBio = artist?.bio || "";
  const artistFollowers = artist?.followers || 0;
  const artistFollowing = artist?.following || 0;

  const mediaNavPrev = activeMediaIdx > 0
    ? `<button class="pin-detail-nav-btn" onclick="handleDetalleNav(-1)" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); background:rgba(19,25,29,0.85); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.15); border-radius:50%; width:40px; height:40px; color:#e8eef2; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; transition:all 0.2s ease;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>`
    : "";
  const mediaNavNext = activeMediaIdx < mediaList.length - 1
    ? `<button class="pin-detail-nav-btn" onclick="handleDetalleNav(1)" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); background:rgba(19,25,29,0.85); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.15); border-radius:50%; width:40px; height:40px; color:#e8eef2; display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:10; transition:all 0.2s ease;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>`
    : "";
  const mediaNav = mediaNavPrev + mediaNavNext;

  let tagsHtml = "";
  visibleTags.forEach(function (t) {
    tagsHtml += `<button class="tag-pill-btn" onclick="handleSelectTag('${escapeHtml(t)}')" title="Buscar publicaciones con #${escapeHtml(t)}">#${escapeHtml(t)}</button>`;
  });

  let resourcesHtml = "";
  if (hasResource) {
    resourcesHtml = `
      <div style="position:relative; display:inline-block;">
        <button class="tag-pill-btn" onclick="toggleDetalleResources()" style="background:#0a2030; color:#5db8e8; border:1px solid #00385a60;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          ${resources.length} recurso${resources.length > 1 ? "s" : ""}
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="transform:${DETAILE.resourcesOpen ? "rotate(180deg)" : "rotate(0deg)"}; transition:transform 0.2s;"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        ${DETAILE.resourcesOpen ? `
          <div style="position:absolute; top:calc(100% + 6px); left:0; z-index:30; background:#1a2228; border:1px solid #00385a60; border-radius:12px; padding:8px 6px; min-width:240px; max-width:calc(100vw - 24px); box-shadow:0 8px 24px rgba(0,0,0,0.5); animation:slideUp 0.15s ease;">
            ${resources.map(function (r) {
              const rName = (r && r.name) ? r.name : String(r);
              return `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:6px 10px; border-radius:8px; transition:background 0.1s;">
                  <span style="font-size:13px; color:#b0c8d8; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(rName)}">${escapeHtml(rName)}</span>
                  <button onclick="handleDetalleResourceDescarga('${escapeHtml(rName)}')" style="flex-shrink:0; background:#00385a; border:none; border-radius:8px; padding:4px 10px; color:#fff; font-size:11px; font-weight:600; cursor:pointer; display:inline-flex; align-items:center; gap:4px;">Descargar</button>
                </div>`;
            }).join("")}
          </div>
        ` : ""}
      </div>
    `;
  } else {
    resourcesHtml = `<span style="font-size:12px; color:#4a5e6a; background:#13191d; border:1px solid #1f2a32; border-radius:20px; padding:3px 12px; display:inline-flex; align-items:center; gap:5px; white-space:nowrap;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>Sin recurso</span>`;
  }

  const tagsRow = `
    <div class="detalle-obra-tags-row" style="display:flex; gap:8px; flex-wrap:wrap; align-items:center; overflow:visible;">
      <button class="category-pill-btn ${getCategoryClass(pin.type)}" onclick="handleSelectCategoria('${escapeHtml(String(pin.type || ""))}')" title="Ver publicaciones de ${escapeHtml(String(pin.type || ""))}">${escapeHtml(String(pin.type || ""))}</button>
      ${tagsHtml}
      <div style="width:1px; height:22px; background:#242f38; border-radius:1px; flex-shrink:0;"></div>
      <div style="flex-shrink:0;">
        ${resourcesHtml}
      </div>
    </div>
  `;

  let datosRow = "";
  if (pin.type !== "Fotografía" && pin.software) {
    datosRow += `<div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:5px; padding:10px 14px; background:#1a2228; border-radius:14px; border:1px solid #242f38;"><p style="margin:0; font-size:10px; color:#7a909f; text-transform:uppercase; letter-spacing:0.7px; font-weight:600; white-space:nowrap;">Software / Técnica</p><p style="margin:0; font-size:13px; color:#b0c8d8; font-weight:500; white-space:nowrap;">${escapeHtml(pin.software)}</p></div>`;
  }
  if (pin.type === "Fotografía" && pin.exif) {
    const entries = Object.keys(pin.exif || {});
    const row1 = entries.slice(0, 2);
    const row2 = entries.slice(2);
    const chips = function (arr) {
      return arr.map(function (k) {
        return `<span style="font-size:11px; color:#7a909f; background:#13191d; border-radius:6px; padding:2px 7px; border:1px solid #1f2a32; white-space:nowrap;"><span style="color:#4a6a7a;">${escapeHtml(k)}:</span> <strong style="color:#b0c8d8;">${escapeHtml(String(pin.exif[k]))}</strong></span>`;
      }).join("");
    };
    datosRow += `<div style="flex:1; display:flex; flex-direction:column; justify-content:center; gap:5px; padding:10px 14px; background:#1a2228; border-radius:14px; border:1px solid #242f38;"><p style="margin:0; font-size:10px; color:#7a909f; text-transform:uppercase; letter-spacing:0.7px; font-weight:600;">Datos EXIF</p><div style="display:flex; gap:6px;">${chips(row1)}</div><div style="display:flex; gap:6px;">${chips(row2)}</div></div>`;
  }
  if (currentPalette && currentPalette.length > 0) {
    let swatches = "";
    currentPalette.forEach(function (hex, idx) {
      swatches += `<button class="color-swatch-btn" onclick="navigator.clipboard?.writeText('${escapeHtml(hex)}')" title="Copiar ${escapeHtml(hex)}"><div class="color-swatch-box" style="background:${escapeHtml(hex)}"></div><span style="font-size:8px; color:#7a909f; font-family:'monospace';">${escapeHtml(hex)}</span></button>`;
    });
    datosRow += `<div style="flex:1; display:flex; flex-direction:column; justify-content:center; padding:12px 14px; background:#1a2228; border-radius:14px; border:1px solid #242f38;"><p style="margin:0 0 8px; font-size:10px; color:#7a909f; text-transform:uppercase; letter-spacing:0.7px; font-weight:600; white-space:nowrap;">Paleta dominante ${mediaList.length > 1 ? "(Foto " + (activeMediaIdx + 1) + ")" : ""}</p><div style="display:flex; gap:8px; align-items:center;">${swatches}</div></div>`;
  }

  const recomendado = `
    <div style="padding:32px 20px 80px;">
      <div style="display:flex; align-items:baseline; gap:12px; margin-bottom:24px;">
        <h2 style="margin:0; font-family:'Playfair Display', serif; font-size:24px; color:#e8eef2;">Más que te puede inspirar</h2>
        <span class="${tagClass(pin.type)}" style="font-size:12px;">${escapeHtml(String(pin.type || ""))}</span>
      </div>
      <div class="masonry-grid">${moreHtml}</div>
    </div>
  `;

  const lightboxModal = DETALLE.lightbox ? `
    <div onclick="closeLightbox()" style="position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.88); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; animation:fadeIn 0.2s ease;">
      <button onclick="closeLightbox()" style="position:fixed; top:20px; right:20px; width:44px; height:44px; border-radius:50%; background:rgba(26,34,40,0.95); border:1px solid #242f38; color:#e8eef2; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:202; transition:background 0.15s;" onmouseenter="this.style.background='#242f38'" onmouseleave="this.style.background='rgba(26,34,40,0.95)'">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      ${mediaList.length > 1 ? `<div style="position:fixed; top:24px; left:24px; background:rgba(19,25,29,0.85); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:6px 14px; font-size:13px; font-weight:600; color:#e8eef2; z-index:202; pointer-events:none;">${activeMediaIdx + 1} / ${mediaList.length}</div>` : ""}
      ${mediaNavPrev}
      ${mediaNavNext}
      <img src="${obtenerImagenGrande(currentMediaUrl)}" alt="${escapeHtml(pin.title)}" onclick="closeLightbox()" style="max-width:90vw; max-height:90vh; object-fit:contain; border-radius:16px; box-shadow:0 24px 80px rgba(0,0,0,0.8);" />
    </div>
  ` : "";

  const descModal = DETALLE.descModalOpen ? `
    <div onclick="closeDescModal()" style="position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease;">
      <div onclick="event.stopPropagation()" style="position:relative; width:80vw; max-width:850px; max-height:85vh; background:#1a2228; border:1px solid #242f38; border-radius:24px; padding:36px 40px; overflow-y:auto; box-shadow:0 24px 80px rgba(0,0,0,0.8); display:flex; flex-direction:column; gap:24px; box-sizing:border-box;">
        <button onclick="closeDescModal()" style="position:absolute; top:20px; right:20px; width:44px; height:44px; border-radius:50%; background:rgba(26,34,40,0.95); border:1px solid #242f38; color:#e8eef2; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:201; transition:background 0.15s, border-color 0.15s;" onmouseenter="this.style.background='#242f38'" onmouseleave="this.style.background='rgba(26,34,40,0.95)'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        <h2 style="margin:0; font-family:'Playfair Display', serif; font-size:32px; font-weight:700; color:#e8eef2; line-height:1.3; padding-right:40px; word-break:break-word; overflow-wrap:break-word;">${escapeHtml(pin.title)}</h2>
        <div style="display:flex; align-items:center; gap:12px; padding-bottom:16px; border-bottom:1px solid #242f38;">
          <img src="${artist?.avatar || ""}" alt="${escapeHtml(artistName)}" style="width:44px; height:44px; border-radius:50%; object-fit:cover; border:2px solid #00385a;" />
          <div><p style="margin:0; font-weight:600; font-size:15px; color:#e8eef2;">${escapeHtml(artistName)}</p><span style="font-size:12px; color:#7a909f;">@${escapeHtml(artistHandle)}</span></div>
        </div>
        <div style="flex:1;">
          <p style="margin:0; font-size:16px; color:#c3d6e4; line-height:1.8; white-space:pre-line; word-break:break-word;">${escapeHtml(pin.description || "Sin descripción disponible.")}</p>
        </div>
        ${pin.publishedAt ? `<div style="padding-top:16px; border-top:1px solid #242f38;"><span style="font-size:13px; color:#7a909f; font-weight:500;">Publicado el ${escapeHtml(String(pin.publishedAt))}</span></div>` : ""}
      </div>
    </div>
  ` : "";

  const commentsModal = DETALLE.commentsModalOpen ? `
    <div onclick="closeCommentsModal()" style="position:fixed; inset:0; z-index:200; background:rgba(0,0,0,0.85); backdrop-filter:blur(8px); display:flex; align-items:center; justify-content:center; padding:20px; animation:fadeIn 0.2s ease;">
      <div onclick="event.stopPropagation()" style="position:relative; width:80vw; max-width:650px; height:80vh; max-height:700px; background:#1a2228; border:1px solid #242f38; border-radius:24px; display:flex; flex-direction:column; box-shadow:0 24px 80px rgba(0,0,0,0.8); overflow:hidden; box-sizing:border-box;">
        <div style="display:flex; align-items:center; justify-content:space-between; padding:24px 28px; border-bottom:1px solid #242f38; flex-shrink:0;">
          <div><h3 style="margin:0; font-family:'Playfair Display', serif; font-size:22px; color:#e8eef2;">Comentarios</h3><p style="margin:2px 0 0; font-size:13px; color:#7a909f;">${formatNum(DETAILE.commentsCount)} comentarios en esta publicación</p></div>
          <button onclick="closeCommentsModal()" style="width:38px; height:38px; border-radius:50%; background:#13191d; border:1px solid #242f38; color:#e8eef2; cursor:pointer; display:flex; align-items:center; justify-content:center;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div style="flex:1; overflow-y:auto; padding:20px 28px; display:flex; flex-direction:column; gap:16px;">${commentsHtml()}</div>
        <form onsubmit="handleAddComment(event)" style="padding:16px 28px 24px; border-top:1px solid #242f38; background:#1a2228; display:flex; gap:12px; align-items:center; flex-shrink:0;">
          <img src="${PINAPP.user?.avatar || ""}" alt="Tú" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1.5px solid #00385a; flex-shrink:0;" />
          <input type="text" id="detalle-comment-input" placeholder="Escribe un comentario..." value="${escapeHtml(DETALLE.commentInput)}" oninput="handleDetalleCommentInput(this.value)" style="flex:1; background:#13191d; border:1.5px solid #242f38; border-radius:22px; padding:11px 18px; color:#e8eef2; font-size:14px; outline:none;" />
          <button type="submit" disabled="${!DETALLE.commentInput.trim()}" style="background:${DETALLE.commentInput.trim() ? "#00385a" : "#1f2a32"}; color:${DETALLE.commentInput.trim() ? "#ffffff" : "#7a909f"}; border:none; border-radius:20px; padding:11px 22px; font-weight:600; font-size:14px; cursor:${DETALLE.commentInput.trim() ? "pointer" : "default"}; flex-shrink:0;">Publicar</button>
        </form>
      </div>
    </div>
  ` : "";

  const titleRow = `
    <div style="display:flex; align-items:flex-start; gap:14px;">
      <h1 onclick="openDescModal()" style="margin:0; font-family:'Playfair Display', serif; font-size:36px; font-weight:700; line-height:1.2; flex:1; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word; cursor:pointer; transition:opacity 0.15s; opacity:1;" title="Haz clic para ver el título y descripción completos">${escapeHtml(pin.title)}</h1>
      <button onclick="handleBackFromPin()" style="flex-shrink:0; background:#1a2228; border:1px solid #242f38; border-radius:12px; padding:8px 14px; color:#7a909f; cursor:pointer; font-family:'DM Sans',sans-serif; font-size:14px; display:flex; align-items:center; gap:6px; transition:color 0.15s, border-color 0.15s; margin-top:4px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg><span>Volver</span></button>
    </div>
  `;

  const artistCard = `
    <div style="padding:16px 18px; background:#1a2228; border-radius:16px; border:1px solid #242f38; cursor:pointer;" onclick="handleArtist('${escapeHtml(String(artist?.id || pin.artistId))}')">
      <div style="display:flex; align-items:center; gap:14px; margin-bottom:12px;">
        <img src="${artist?.avatar || ""}" alt="${escapeHtml(artistName)}" style="width:48px; height:48px; border-radius:50%; object-fit:cover; border:2px solid #00385a; flex-shrink:0;" />
        <div style="flex:1; min-width:0;">
          <p style="margin:0 0 2px; font-weight:600; font-size:15px; color:#e8eef2;">${escapeHtml(artistName)}</p>
          <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
            <span style="font-size:12px; color:#7a909f;">@${escapeHtml(artistHandle)}</span>
            <span style="font-size:12px; color:#7a909f;">·</span>
            <span style="font-size:12px;"><strong style="color:#e8eef2;">${formatNum(artistFollowers)}</strong><span style="color:#7a909f;"> seg</span></span>
            <span style="font-size:12px;"><strong style="color:#e8eef2;">${formatNum(artistFollowing)}</strong><span style="color:#7a909f;"> sig</span></span>
          </div>
        </div>
        <button class="cat-pill" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; white-space:nowrap; cursor:pointer;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          <span>Seguir</span>
        </button>
      </div>
      <p style="margin:0; font-size:13px; color:#b0c8d8; line-height:1.6; padding-left:62px;">${escapeHtml(artistBio)}</p>
    </div>
  `;

  const actionsHtml = `
    <div style="display:flex; gap:10px;">
      <button onclick="handleSaveDetalle('${escapeHtml(String(pin.id))}')" style="flex:1; background:#1a2228; border:1px solid ${isSaved ? "#00385a" : "#242f38"}; border-radius:16px; padding:14px 12px; color:#e8eef2; font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s ease;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        <span>${isSaved ? "Guardado" : "Guardar"} (${formatNum(savesCount)})</span>
      </button>
      <button onclick="handleLikeDetalle()" style="flex:1; background:#1a2228; border:1px solid ${isLiked ? "#771f2f" : "#242f38"}; border-radius:16px; padding:14px 12px; color:#e8eef2; font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s ease;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
        <span>Me gusta (${formatNum(likesCount)})</span>
      </button>
      <button onclick="openCommentsModal()" style="flex:1; background:#1a2228; border:1px solid #242f38; border-radius:16px; padding:14px 12px; color:#e8eef2; font-family:'DM Sans',sans-serif; font-weight:700; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:all 0.2s ease;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.65 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.65 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        <span>Comentar (${formatNum(DETAILE.commentsCount)})</span>
      </button>
    </div>
  `;

  const descButtonHtml = (pin.description || pin.publishedAt) ? `
    <button onclick="openDescModal()" style="width:100%; text-align:left; padding:18px 20px; background:#1a2228; border-radius:16px; border:1px solid #242f38; cursor:pointer; transition:all 0.2s ease; display:flex; flex-direction:column; gap:10px; outline:none; font-family:inherit;">
      <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
        <span style="font-size:11px; color:#7a909f; text-transform:uppercase; letter-spacing:0.7px; font-weight:600;">Sobre esta publicación</span>
        <span style="font-size:12px; color:#5db8e8; display:flex; align-items:center; gap:5px; font-weight:500;">Lectura enfocada</span>
      </div>
      ${pin.description ? `<p style="margin:0; font-size:14px; color:#b0c8d8; line-height:1.6; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; word-break:break-word;">${escapeHtml(pin.description)}</p>` : ""}
      ${pin.publishedAt ? `<span style="font-size:11px; color:#5d7382; margin-top:2px;">Publicado el ${escapeHtml(String(pin.publishedAt))}</span>` : ""}
    </button>
  ` : "";

  const visualHtml = `
    <div style="position:sticky; top:88px; display:flex; justify-content:center; align-items:flex-start;">
      <div class="pin-detail-img-wrap" style="border-radius:24px; overflow:hidden; background:#1a2228; display:inline-flex; position:relative; cursor:zoom-in;" onclick="openLightbox()">
        <img src="${obtenerImagenGrande(currentMediaUrl)}" alt="${escapeHtml(pin.title)}" style="display:block; width:auto; height:auto; max-width:100%; max-height:calc(100vh - 112px); object-fit:contain;" />
        ${mediaList.length > 1 ? `<div style="position:absolute; top:14px; right:14px; background:rgba(19,25,29,0.85); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:4px 10px; font-size:12px; font-weight:600; color:#e8eef2; z-index:10; pointer-events:none;">${activeMediaIdx + 1} / ${mediaList.length}</div>` : ""}
        ${mediaNav}
        <div class="pin-detail-expand-btn" style="position:absolute; bottom:14px; right:14px; background:rgba(19,25,29,0.88); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.12); border-radius:20px; padding:7px 14px; color:#e8eef2; font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; display:flex; align-items:center; gap:6px; opacity:0; transition:opacity 0.2s ease; pointer-events:none;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          Ampliar imagen
        </div>
      </div>
    </div>
  `;

  return `
    <div style="min-height:100vh; background:#13191d;">
      <div style="padding:32px 20px 0;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:start;">
          <div>${visualHtml}</div>
          <div style="display:flex; flex-direction:column; gap:20px; padding-top:8px;">
            ${tagsRow}
            ${titleRow}
            ${artistCard}
            ${actionsHtml}
            ${descButtonHtml}
            <div style="display:flex; gap:16px; align-items:stretch; flex-wrap:wrap;">
              ${datosRow}
            </div>
          </div>
        </div>
      </div>
      ${recomendado}
      ${lightboxModal}
      ${descModal}
      ${commentsModal}
    </div>
  `;
}


// ─── Detalle: handlers (modales, likes, guardados, tags, categorías) ─────────

function openLightbox() { DETALLE.lightbox = true; render(); }
function closeLightbox() { DETALLE.lightbox = false; render(); }
function openDescModal() { DETALLE.descModalOpen = true; render(); }
function closeDescModal() { DETALLE.descModalOpen = false; render(); }
function openCommentsModal() { DETALLE.commentsModalOpen = true; render(); }
function closeCommentsModal() { DETALLE.commentsModalOpen = false; render(); }

function handleDetalleNav(delta) {
  const mediaList = (DETAILE.mediaList && DETALLE.mediaList.length > 0) ? DETALLE.mediaList : [];
  const idx = Math.min(Number(DETAILE.activeMediaIdx) || 0, Math.max(0, mediaList.length - 1));
  if (delta === -1 && idx <= 0) return;
  if (delta === 1 && idx >= mediaList.length - 1) return;
  DETALLE.activeMediaIdx = idx + delta;
  render();
}

function toggleDetalleResources() { DETALLE.resourcesOpen = !DETAILE.resourcesOpen; render(); }
function handleDetalleResourceDescarga(name) { alert("Iniciando descarga de " + name + "..."); }

function handleDetalleCommentInput(value) { DETALLE.commentInput = value; render(); }

function handleAddComment(e) {
  if (e && e.preventDefault) e.preventDefault();
  const text = (DETAILE.commentInput || "").trim();
  if (!text) return;
  const newComment = {
    id: "c_" + Date.now(),
    artistId: PINAPP.user?.id || "me",
    name: obtenerNombreUsuario(PINAPP.user),
    handle: obtenerHandleUsuario(PINAPP.user).replace("@", ""),
    avatar: obtenerAvatarUsuario(PINAPP.user),
    text: text,
    date: "Justo ahora",
  };
  DETALLE.comments = [newComment].concat(DETAILE.comments);
  DETALLE.commentsCount += 1;
  DETALLE.commentInput = "";
  render();
}

function handleCommentUserClick(artistId) {
  if (DETALLE.commentsModalOpen) closeCommentsModal();
  const artistKey = String(artistId || "");
  const map = getArtistMap();
  const artist = map[artistKey] || map[String(artistId)] || null;
  if (artist) {
    handleArtist(String(artist.id));
  } else {
    handleArtist(String(PINAPP.user?.id || (PINAPP.userPins && PINAPP.userPins[0]?.artistId) || "a1"));
  }
}

function handleSaveDetalle(pin) {
  const pinId = String((pin && pin.id) || (detallePinActual && detallePinActual.id) || "");
  const found = (PINAPP.boards || []).flatMap((b) => b.pins || []).find((p) => String(p.id) === pinId) || null;
  const targetPin = pin || found;
  if (DETAILE.isSaved) {
    DETALLE.isSaved = false;
    DETALLE.savesCount -= 1;
  } else {
    DETALLE.isSaved = true;
    DETALLE.savesCount += 1;
  }
  if (PINAPP.user?.id && targetPin) {
    apiFetch("/tableros/guardar", {
      method: "POST",
      body: JSON.stringify({
        tablero_id: (PINAPP.boards || [])[0]?.id || "ninguno",
        usuario_id: PINAPP.user.id,
        publicacion_id: targetPin.id,
        pin: targetPin,
      }),
    }).catch(() => {});
  }
  abrirModalGuardarPorPin(targetPin);
}

function handleLikeDetalle() {
  if (DETAILE.isLiked) { DETALLE.isLiked = false; DETALLE.likesCount -= 1; } else { DETALLE.isLiked = true; DETALLE.likesCount += 1; }
}

function handleSelectCategoria(cat) {
  cambiarTipo(cat);
}

function handleSelectTag(tag) {
  actualizarBusqueda(tag);
}
