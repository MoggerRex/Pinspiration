// ==========================================================================
// tableros.js — Vista de Tableros (migración desde React)
// ==========================================================================

let tablerosSelected = null;

function renderTableros() {
  const boards = PINAPP.boards || [];

  // Vista de un tablero individual abierto
  if (tablerosSelected && boards) {
    const board = boards.find((b) => b.id === tablerosSelected);
    if (board) {
      return `
        <div style="min-height:100vh; width:100%; padding:30px 24px 60px; boxSizing:border-box;">
          <button onclick="setTablerosSelected(null)" style="background:#1a2228; border:1px solid #242f38; borderRadius:12px; padding:8px 14px; color:#7a909f; cursor:pointer; fontFamily:'DM Sans',sans-serif; fontSize:14px; display:flex; alignItems:center; gap:6px; marginBottom:24px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Mis tableros
          </button>
          <h2 style="font-family:'Playfair Display', serif; fontSize:28px; marginBottom:24px; color:#e8eef2;">${escapeHtml(board.name)}</h2>
          ${board.pins && board.pins.length === 0 ? `
            <div style="text-align:center; padding:80px 0; color:#7a909f;">
              <p style="fontSize:16;">Este tablero está vacío. ¡Empieza a guardar pines!</p>
            </div>
          ` : `
            <div class="masonry-grid">
              ${(board.pins || []).map((pin) => renderTarjetaPin(pin)).join("")}
            </div>
          `}
        </div>
      `;
    }
  }

  // Vista principal de todos los tableros
  const boardsHtml = boards.map((b) => {
    const pins = b.pins || [];
    const preview = pins.slice(0, 4).map((p) => `
      <img src="${p.imgUrl}" alt="${escapeHtml(p.title)}" style="width:100%; height:60px; objectFit:cover;" />
    `).join("");

    return `
      <div onclick="setTablerosSelected('${escapeHtml(b.id)}')" style="background:#1a2228; border:1.5px solid #242f38; borderRadius:16px; overflow:hidden; cursor:pointer; transition:border-color 0.15s, transform 0.15s;" onmouseenter="this.style.borderColor='#00385a'; this.style.transform='translateY(-2px)';" onmouseleave="this.style.borderColor='#242f38'; this.style.transform='translateY(0)';">
        <div style="height:120px; background:#13191d; display:grid; grid-template-columns:1fr 1fr; gap:2px;">
          ${preview}
          ${pins.length === 0 ? `
            <div style="grid-column:1/-1; display:flex; align-items:center; justify-content:center; color:#242f38;">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            </div>
          ` : ""}
        </div>
        <div style="padding:12px 14px;">
          <p style="margin:0 0 4px; fontWeight:600; fontSize:14px; color:#e8eef2;">${escapeHtml(b.name)}</p>
          <p style="margin:0; fontSize:12px; color:#7a909f;">${pins.length} pines</p>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div style="min-height:100vh; background:#13191d; width:100%;">
      <div style="background:linear-gradient(0deg, #13191d 5%, #00385a 100%); padding-top:32px; padding-bottom:24px; padding-left:24px; padding-right:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <h1 style="margin:0 0 4px; fontFamily:'Playfair Display', serif; fontSize:32px; fontWeight:700; color:#e8eef2;">Mis Tableros</h1>
            <p style="margin:0; color:#7a909f; fontSize:14;">${boards.length} tableros guardados</p>
          </div>
          <button onclick="navigate('feed')" class="cat-pill" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Volver</span>
          </button>
        </div>
        <div style="height:1px; background:#242f38; marginTop:8;"></div>
      </div>

      <div style="width:100%; padding:24px 24px 60px; boxSizing:border-box;">
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:16px;">
          ${boardsHtml}
        </div>
      </div>
    </div>
  `;
}

function setTablerosSelected(id) {
  tablerosSelected = id;
  render();
}
