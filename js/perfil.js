// ==========================================================================
// perfil.js — Vista de Perfil / Artistas (migración desde React)
// ==========================================================================

// Estado del modal de edición de perfil
let isEditing = false;
let editName = "";
let editBio = "";
let editAvatar = "";
let editHeaderBg = "";
let colorSelectionMode = "presets";
let customColor = "#00385a";

function setEditField(field, value) {
  if (field === "editName") editName = value;
  else if (field === "editBio") editBio = value;
  else if (field === "editAvatar") editAvatar = value;
  else if (field === "editHeaderBg") editHeaderBg = value;
  else if (field === "customColor") customColor = value;
  render();
}

function applyCustomColor(hex) {
  customColor = hex;
  const bgGradient = `linear-gradient(0deg, #13191d 5%, ${hex} 100%)`;
  editHeaderBg = bgGradient;
  render();
}

function handleOpenEdit() {
  const artist = getArtistaActual();
  editName = artist?.name || "";
  editBio = artist?.bio || "";
  editAvatar = artist?.avatar || "";
  editHeaderBg = artist?.headerBg || "linear-gradient(0deg, #13191d 5%, #00385a 100%)";
  colorSelectionMode = "presets";
  setIsEditing(true);
}

function setIsEditing(valor) {
  isEditing = valor;
  render();
}

function getArtistaActual() {
  const currentUser = PINAPP.user;
  const isOwn = String(PINAPP.profileId) === String(currentUser?.id);
  if (isOwn) {
    return {
      id: currentUser.id,
      name: currentUser.nombre || currentUser.name || "Usuario",
      handle: currentUser.handle?.startsWith("@") ? currentUser.handle : `@${currentUser.handle || "usuario"}`,
      email: currentUser.email,
      avatar: currentUser.avatar || currentUser.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
      bio: currentUser.bio || "Sin descripción aún.",
      followers: 0,
      following: 0,
      headerBg: currentUser.headerBg || currentUser.header_bg || "linear-gradient(0deg, #13191d 5%, #00385a 100%)",
    };
  }
  const map = getArtistMap();
  return map[String(PINAPP.profileId)] || map[PINAPP.profileId] || null;
}

function handleSaveEdit(e) {
  if (e && e.preventDefault) e.preventDefault();
  const artist = getArtistaActual();
  const currentUser = PINAPP.user;
  const updated = {
    ...currentUser,
    nombre: editName,
    name: editName,
    bio: editBio,
    avatar: editAvatar,
    headerBg: editHeaderBg,
  };
  handleUpdateUser(updated);
  setIsEditing(false);
}

function handleAvatarFile(e) {
  const file = e?.target?.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      setEditField("editAvatar", ev.target?.result);
    };
    reader.readAsDataURL(file);
  }
}

const PRESET_COLOR_GRID = [
  [
    { label: "Transparente", value: "transparent" },
    { label: "Pinspiration", value: "linear-gradient(0deg, #13191d 5%, #00385a 100%)" },
    { label: "Rojo", value: "linear-gradient(0deg, #13191d 5%, #8b0000 100%)" },
    { label: "Verde", value: "linear-gradient(0deg, #13191d 5%, #006400 100%)" },
  ],
  [
    { label: "Morado", value: "linear-gradient(0deg, #13191d 5%, #4b0082 100%)" },
    { label: "Dorado", value: "linear-gradient(0deg, #13191d 5%, #b8860b 100%)" },
    { label: "Negro", value: "#000000" },
    { label: "Blanco", value: "#ffffff" },
  ],
];

// ─── Render: Perfil ─────────────────────────────────────────────────────────

function renderPerfil() {
  const currentUser = PINAPP.user;

  // Vista de exploración de artistas
  if (!PINAPP.profileId) {
    let artistsHtml = "";
    const artistsList = PINAPP.artists && PINAPP.artists.length > 0 ? PINAPP.artists : ARTISTS_FALLBACK;
    artistsList.forEach((a) => {
      artistsHtml += `
        <div onclick="handleArtist('${escapeHtml(String(a.id))}')" style="background:#1a2228; border:1.5px solid #242f38; border-radius:16px; padding:20px; cursor:pointer; transition:border-color 0.15s, transform 0.15s;" onmouseenter="this.style.borderColor='#00385a'" onmouseleave="this.style.borderColor='#242f38'; this.style.transform='translateY(0)';">
          <img src="${a.avatar}" alt="${escapeHtml(a.name)}" style="width:56px; height:56px; border-radius:50%; object-fit:cover; border:2px solid #00385a; margin-bottom:12px;" />
          <p style="margin:0 0 2px; font-weight:600; font-size:16px; color:#e8eef2;">${escapeHtml(a.name)}</p>
          <p style="margin:0 0 8px; font-size:12px; color:#7a909f;">@${escapeHtml(a.handle)}</p>
          <p style="margin:0 0 12px; font-size:13px; color:#b0c8d8; lineHeight:1.4;">${escapeHtml(a.bio)}</p>
          <span style="font-size:13px; color:#7a909f;"><strong style="color:#e8eef2;">${formatNum(a.followers)}</strong> seguidores</span>
        </div>`;
    });

    return `
      <div style="width:100%; padding:32px 24px; boxSizing:border-box;">
        <h2 style="font-family:'Playfair Display', serif; font-size:28px; marginBottom:24px; color:#e8eef2;">Artistas en Pinspiration</h2>
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:16px;">
          ${artistsHtml}
        </div>
      </div>
    `;
  }

  const artist = getArtistaActual();
  const isOwnProfile = String(PINAPP.profileId) === String(currentUser?.id);
  const pins = getAllPins().filter((p) => String(p.artistId) === String(isOwnProfile ? currentUser?.id : PINAPP.profileId));
  const artistMap = getArtistMap();

  const headerBg = artist?.headerBg || "linear-gradient(0deg, #13191d 5%, #00385a 100%)";
  const isWhiteHeader = headerBg === "#ffffff" || headerBg.toLowerCase().includes("#fff");

  const headerColor = isWhiteHeader ? "#111111" : "#e8eef2";
  const mutedColor = isWhiteHeader ? "#555555" : "#7a909f";
  const bioColor = isWhiteHeader ? "#333333" : "#b0c8d8";
  const emailColor = isWhiteHeader ? "#004080" : "#5db8e8";

  let pinsHtml = "";
  if (pins.length === 0) {
    pinsHtml = `<p style="color:#7a909f; text-align:center; padding:60px 0;">No hay pines aún.</p>`;
  } else {
    pinsHtml = `<div class="masonry-grid">${pins.map((pin) => renderTarjetaPin(pin)).join("")}</div>`;
  }

  let editModalHtml = "";
  if (isEditing) {
    editModalHtml = renderModalEditarPerfil();
  }

  return `
    <div style="minHeight:100vh; background:#13191d;">
      <div style="background:${headerBg}; paddingTop:24px; paddingBottom:24px; paddingLeft:20px; paddingRight:20px; transition:background 0.3s ease;">
        <div style="display:flex; align-items:center; gap:16px; marginBottom:12px;">
          <img src="${artist?.avatar}" alt="${escapeHtml(artist?.name)}" style="width:84px; height:84px; borderRadius:50%; objectFit:cover; border:3px solid #00385a; flexShrink:0;" />
          <div style="flex:1; display:flex; flexDirection:column; gap:8px;">
            <h1 style="margin:0; fontFamily:'Playfair Display', serif; fontSize:22px; fontWeight:700; color:${headerColor};">${escapeHtml(artist?.name)}</h1>
            <div style="display:flex; gap:16px; fontSize:13;">
              <div>
                <strong style="display:block; color:${headerColor}; fontSize:14;">${pins.length}</strong>
                <span style="color:${mutedColor}; fontSize:11;">pines</span>
              </div>
              <div>
                <strong style="display:block; color:${headerColor}; fontSize:14;">${formatNum(artist?.followers)}</strong>
                <span style="color:${mutedColor}; fontSize:11;">seguidores</span>
              </div>
              <div>
                <strong style="display:block; color:${headerColor}; fontSize:14;">${formatNum(artist?.following)}</strong>
                <span style="color:${mutedColor}; fontSize:11;">siguiendo</span>
              </div>
            </div>
          </div>
        </div>

        <p style="margin:0 0 4px; fontSize:13px; color:${isWhiteHeader ? "#444444" : "#7a909f"}; fontWeight:500;">
          ${escapeHtml(artist?.handle?.startsWith("@") ? artist?.handle : `@${artist?.handle || "usuario"}`)}
        </p>

        ${isOwnProfile && currentUser?.email ? `<p style="margin:0 0 10px; color:${emailColor}; fontSize:13;">${escapeHtml(currentUser.email)}</p>` : ""}

        <p style="margin:0 0 16px; fontSize:14px; color:${bioColor}; lineHeight:1.4;">${escapeHtml(artist?.bio)}</p>

        ${isOwnProfile ? `
          <button onclick="handleOpenEdit()" class="cat-pill" style="display:inline-flex; align-items:center; gap:8px; padding:8px 16px; fontSize:13px; fontWeight:500; cursor:pointer;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span>Editar perfil</span>
          </button>
        ` : `
          <button class="cat-pill" style="display:inline-flex; align-items:center; gap:6px; padding:8px 16px; fontSize:13px; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M4 21c0-5 4-7 8-7s8 2 8 7"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span>Seguir</span>
          </button>
        `}

        <div style="height:1px; background:#242f38; marginTop:16;"></div>
      </div>

      <div style="width:100%; padding:16px 20px 60px; boxSizing:border-box;">
        <div style="display:flex; align-items:center; justify-content:space-between; marginBottom:20;">
          <h3 style="margin:0; fontFamily:'Playfair Display', serif; fontSize:20px; color:#e8eef2; fontWeight:600;">Publicaciones</h3>
          <button onclick="navigate('feed')" class="cat-pill" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Volver</span>
          </button>
        </div>

        ${pinsHtml}
      </div>

      ${editModalHtml}
    </div>
  `;
}

// ─── Modal: Editar Perfil ───────────────────────────────────────────────────

function renderModalEditarPerfil() {
  if (colorSelectionMode === "presets") {
    return `
      <div style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdropFilter:blur(4px); display:flex; align-items:center; justify-content:center; zIndex:1000; padding:20px;">
        <div style="background:#1a2228; border:1px solid #242f38; borderRadius:20px; padding:28px; width:100%; maxWidth:480px; boxShadow:0 16px 40px rgba(0,0,0,0.6); position:relative;">
          <div style="display:flex; justifyContent:space-between; alignItems:center; marginBottom:20px;">
            <h3 style="margin:0; fontFamily:'Playfair Display', serif; fontSize:22px; color:#e8eef2;">Editar Perfil</h3>
            <button onclick="setIsEditing(false)" style="background:none; border:none; color:#7a909f; cursor:pointer; padding:4px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form onsubmit="handleSaveEdit(event)" style="display:flex; flexDirection:column; gap:16px;">
            <label style="fontSize:13px; color:#7a909f; fontWeight:500;">
              Nombre
              <input class="search-bar" value="${escapeHtml(editName)}" oninput="setEditField('editName', this.value)" style="display:block; width:100%; marginTop:4px; padding:8px 12px; fontSize:13;" />
            </label>

            <label style="fontSize:13px; color:#7a909f; fontWeight:500;">
              Descripción / Bio
              <textarea id="edit-bio" rows="3" oninput="setEditField('editBio', this.value)" style="display:block; width:100%; marginTop:4px; padding:8px 12px; background:#13191d; border:1.5px solid #242f38; border-radius:12px; color:#e8eef2; fontSize:13; fontFamily:'DM Sans', sans-serif; resize:vertical; outline:none;" >${escapeHtml(editBio)}</textarea>
            </label>

            <div style="display:flex; flexDirection:column; gap:6px;">
              <span style="fontSize:13px; color:#7a909f; fontWeight:500;">Foto de perfil</span>
              <div style="display:flex; gap:12px; align-items:center;">
                <img src="${editAvatar}" alt="preview" style="width:48px; height:48px; borderRadius:50%; objectFit:cover; border:2px solid #00385a;" />
                <label class="btn-secondary" style="display:inline-flex; align-items:center; gap:6px; fontSize:12px; padding:6px 12px; cursor:pointer;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Subir imagen</span>
                  <input type="file" accept="image/*" onchange="handleAvatarFile(event)" style="display:none;" />
                </label>
              </div>
              <input class="search-bar" value="${escapeHtml(editAvatar)}" oninput="setEditField('editAvatar', this.value)" placeholder="O pega una URL de imagen..." style="width:100%; marginTop:4px; padding:6px 12px; fontSize:12;" />
            </div>

            <div style="display:flex; flexDirection:column; gap:10;">
              <span style="fontSize:13px; color:#7a909f; fontWeight:500;">Color del fondo del encabezado</span>
              <div style="display:flex; gap:8;">
                <button type="button" onclick="setColorSelectionMode('presets')" class="btn-secondary" style="flex:1; padding:6px 12px; fontSize:12px; background:#00385a; color:#fff; borderColor:#00385a;">Predefinidos</button>
                <button type="button" onclick="setColorSelectionMode('picker')" class="btn-secondary" style="flex:1; padding:6px 12px; fontSize:12px; background:#13191d; color:#7a909f; borderColor:#242f38;">Cuadrado cromático</button>
              </div>

              <div style="display:flex; flexDirection:column; gap:8; marginTop:4;">
                ${PRESET_COLOR_GRID.map((row, rIdx) => `
                  <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
                    ${row.map((opt) => `
                      <button type="button" onclick="setEditField('editHeaderBg', '${opt.value}')" style="padding:8px 4px; border-radius:10px; border:${editHeaderBg === opt.value ? "2px solid #5db8e8" : "1px solid #242f38"}; background:${opt.value === "transparent" ? "#13191d" : opt.value}; color:${opt.value === "#ffffff" ? "#000" : "#fff"}; fontSize:11px; fontWeight:600; cursor:pointer; textAlign:center; whiteSpace:nowrap; overflow:hidden; textOverflow:ellipsis;">
                        ${escapeHtml(opt.label)}
                      </button>
                    `).join("")}
                  </div>
                `).join("")}
              </div>
            </div>

            <div style="display:flex; gap:10; marginTop:12px;">
              <button type="button" onclick="setIsEditing(false)" class="btn-secondary" style="flex:1;">Cancelar</button>
              <button type="submit" class="btn-primary" style="flex:1;">Guardar cambios</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  // Modo: selector de color (cuadrado cromático)
  return `
    <div style="position:fixed; inset:0; background:rgba(0,0,0,0.75); backdropFilter:blur(4px); display:flex; align-items:center; justify-content:center; zIndex:1000; padding:20px;">
      <div style="background:#1a2228; border:1px solid #242f38; borderRadius:20px; padding:28px; width:100%; maxWidth:480px; boxShadow:0 16px 40px rgba(0,0,0,0.6); position:relative;">
        <div style="display:flex; align-items:center; justifyContent:space-between; marginBottom:20px;">
          <button type="button" onclick="setColorSelectionMode('presets')" class="cat-pill" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Volver</span>
          </button>
          <h4 style="margin:0; fontFamily:'Playfair Display', serif; fontSize:18px; color:#e8eef2;">Seleccionar Color</h4>
        </div>

        <div style="display:flex; flexDirection:column; align-items:center; gap:16px; padding:16px; background:#13191d; borderRadius:16px; border:1px solid #242f38;">
          <div style="width:100%; display:flex; justifyContent:center;">
            <input type="color" value="${customColor}" oninput="applyCustomColor(this.value)" style="width:100%; height:180px; border-radius:12px; border:1px solid #242f38; background:#13191d; padding:0; cursor:pointer; display:block;" />
          </div>
          <div style="display:flex; align-items:center; gap:12px; width:100%;">
            <div style="flex:1;">
              <label style="fontSize:12px; color:#7a909f; display:block; marginBottom:4;">Código Hexadecimal</label>
              <input type="text" class="search-bar" value="${customColor}" oninput="applyCustomColor(this.value)" placeholder="#00385a" style="width:100%; padding:8px 12px; fontSize:14px; fontFamily:'monospace'" />
            </div>
            <div style="textAlign:center;">
              <span style="fontSize:12px; color:#7a909f; display:block; marginBottom:4;">Muestra</span>
              <div style="width:48px; height:38px; borderRadius:10px; background:${customColor}; border:2px solid #242f38; boxShadow:'0 2px 8px rgba(0,0,0,0.4)'"></div>
            </div>
          </div>
        </div>

        <div style="display:flex; gap:10; marginTop:16px;">
          <button type="button" onclick="setColorSelectionMode('presets')" class="btn-secondary" style="flex:1;">Cancelar</button>
          <button type="button" onclick="handleSaveEdit()" class="btn-primary" style="flex:1;">Guardar cambios</button>
        </div>
      </div>
    </div>
  `;
}

function setColorSelectionMode(valor) {
  colorSelectionMode = valor;
  render();
}
