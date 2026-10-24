// ==========================================================================
// crear-pin.js — Wizard de creación de publicaciones (migración desde React)
// ==========================================================================

const CREAR = {
  step: "upload",
  mediaList: [],
  activeMediaIdx: 0,
  colors: [],
  exif: null,
  draggedIdx: null,
  dragOverIdx: null,
  title: "",
  desc: "",
  tags: "",
  category: "",
  software: "",
  hasResource: false,
  resourceName: "",
  resourceFile: null,
  resourceFileUrl: null,
  aiProgress: 0,
  aiResult: null,
  aiError: null,
  exifCamera: "",
  exifLens: "",
  exifAperture: "",
  exifShutterSpeed: "",
  exifIso: "",
  exifFocalLength: "",
  aiStarted: false,
};

const STEPS = ["upload", "processing", "ai", "form", "recursos", "publishing", "done"];
const STEP_LABELS = ["Imagen", "Análisis", "IA", "Detalles", "Recursos", "Publicar", "¡Listo!"];
const STEP_ICONS = ["img", "scan", "sparkle", "edit", "download", "rocket", "check"];

function setStep(step) {
  CREAR.step = step;
  if (step !== "ai") CREAR.aiStarted = false;
  render();
}

function setMediaList(next) {
  CREAR.mediaList = next;
  if (CREAR.mediaList.length > 0) {
    if (CREAR.activeMediaIdx >= CREAR.mediaList.length) CREAR.activeMediaIdx = CREAR.mediaList.length - 1;
  } else {
    CREAR.activeMediaIdx = 0;
  }
  render();
}

function setActiveMediaIdx(i) {
  CREAR.activeMediaIdx = i;
  render();
}

function setColors(c) {
  CREAR.colors = c;
  render();
}

function setExif(k, v) {
  CREAR.exif = Object.assign({}, CREAR.exif || {}, { [k]: v });
  render();
}

function setDraggedIdx(i) { CREAR.draggedIdx = i; }
function setDragOverIdx(i) { CREAR.dragOverIdx = i; }

function handleFiles(files) {
  const fileArr = Array.from(files || []);
  const availableSlots = 20 - CREAR.mediaList.length;
  if (availableSlots <= 0) return;

  const filesToProcess = fileArr.slice(0, availableSlots);
  const newMedia = [...CREAR.mediaList];
  let exifToSet = null;

  filesToProcess.forEach(function (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const url = e.target?.result;
      const isFirst = newMedia.length === 0;
      newMedia.push(url);
      if (isFirst && file.type === "image/jpeg") exifToSet = "mockExif";
      if (newMedia.length === filesToProcess.length) {
        setMediaList(newMedia);
        if (exifToSet) setExif("mock", "mock");
      }
    };
    reader.readAsDataURL(file);
  });
}

function handleDrop(e) {
  e.preventDefault();
  if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    handleFiles(e.dataTransfer.files);
  }
}

function removeMedia(index) {
  const next = CREAR.mediaList.filter(function (_, i) { return i !== index; });
  if (next.length === 0) {
    setMediaList([]);
    setStep("upload");
    return;
  }
  setMediaList(next);
  if (CREAR.activeMediaIdx >= next.length) setActiveMediaIdx(next.length - 1);
}

function handleReorder(fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0) return;
  const updated = [...CREAR.mediaList];
  const moved = updated.splice(fromIndex, 1)[0];
  updated.splice(toIndex, 0, moved);
  setMediaList(updated);
  setActiveMediaIdx(function (prev) {
    if (prev === fromIndex) return toIndex;
    if (prev > fromIndex && prev <= toIndex) return prev - 1;
    if (prev < fromIndex && prev >= toIndex) return prev + 1;
    return prev;
  });
}

function startProcessing() {
  setStep("processing");
  setTimeout(function () { setStep("ai"); }, 1800);
}

const GEMINI_API_KEY = (window.PINSPOSITION && window.PINSPOSITION.GEMINI_API_KEY) || "";
const GEMINI_MODEL = "gemini-3.5-flash-lite";

function iniciarValidacionIA() {
  const mainImg = CREAR.mediaList[CREAR.activeMediaIdx] || CREAR.mediaList[0];
  if (CREAR.step !== "ai" || !mainImg) return;

  CREAR.aiProgress = 0;
  CREAR.aiResult = null;
  CREAR.aiError = null;

  let p = 0;
  const iv = setInterval(function () {
    p += Math.random() * 10;
    if (p >= 90) p = 90;
    CREAR.aiProgress = p;
    render();
  }, 200);

  async function validarImagen() {
    try {
      const base64Data = mainImg.split(",")[1];
      const mimeType = mainImg.split(";")[0].split(":")[1];

      const prompt = [
        "Actúa como un estricto moderador de contenido para \"Pinspiration\", una plataforma profesional para artistas visuales.",
        "Analiza cuidadosamente la imagen adjunta.",
        "ESTÁNDARES PERMITIDOS:",
        "- Fotografía normal o profesional.",
        "- Edición fotográfica profesional.",
        "- Arte 2D (ilustraciones, dibujos, pintura digital y arte tradicional).",
        "- Arte 3D (renders, modelado, landscapes, unreal).",
        "CONTENIDO ESTRICTAMENTE PROHIBIDO (RECHAZO INMEDIATO):",
        "- Memes o \"shitposting\".",
        "- Capturas de pantalla de texto, código o chats.",
        "- Contenido racista, discursos de odio o símbolos de odio.",
        "- Violencia gráfica explícita, gore o autolesiones.",
        "- Contenido sexualmente explícito o pornografía.",
        "Responde ÚNICAMENTE con un objeto JSON válido con la siguiente estructura, sin texto adicional ni formato markdown:",
        "{",
        "  \"aprobado\": true o false,",
        "  \"categoria\": \"2D\" | \"3D\" | \"Fotografía\" | \"Edición\" | \"Rechazado\",",
        "  \"razon\": \"Una breve explicación de máximo 15 palabras del por qué fue aprobado o rechazado\"",
        "}",
      ].join("\n");

      const url = "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + GEMINI_API_KEY;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ inlineData: { data: base64Data, mimeType: mimeType } }, { text: prompt }] }],
        }),
      });
      const json = await res.json();
      const responseText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
      const analisis = JSON.parse(cleanJson);

      clearInterval(iv);
      CREAR.aiProgress = 100;
      CREAR.aiResult = analisis;
      render();

      if (analisis.aprobado) {
        CREAR.category = analisis.categoria !== "Rechazado" ? analisis.categoria : "2D";
      }
    } catch (error) {
      console.error("Error exacto de Gemini:", error);
      clearInterval(iv);
      CREAR.aiError = "Hubo un problema de conexión con los servidores de validación.";
      render();
    }
  }

  validarImagen();
}

// ─── Render: el wizard completo ─────────────────────────────────────────────

function renderCrear() {
  const step = CREAR.step;
  const stepIdx = STEPS.indexOf(step);

  const header = `
    <div style="min-height:100vh; background:#13191d; width:100%;">
      <div style="background:linear-gradient(0deg, #13191d 5%, #00385a 100%); padding-top:32px; padding-bottom:24px; padding-left:24px; padding-right:24px;">
        <div style="display:flex; align-items:center; justify-content:space-between;">
          <div>
            <h1 style="margin:0 0 4px; font-family:'Playfair Display', serif; font-size:32px; font-weight:700; color:#e8eef2;">Crear Pin</h1>
            <p style="margin:0; color:#7a909f; font-size:14px;">Comparte tu obra con Pinspiration.</p>
          </div>
          <button onclick="navigate('feed')" class="cat-pill" style="display:inline-flex; align-items:center; gap:6px; cursor:pointer;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            <span>Volver</span>
          </button>
        </div>
        <div style="height:1px; background:#242f38; margin-top:8px;"></div>
      </div>

      <style>
        .btn-primary { background-color:#00385a; color:#ffffff; border:none; border-radius:14px; padding:12px; font-family:'DM Sans', sans-serif; font-weight:600; font-size:14px; cursor:pointer; transition:all 0.2s ease-in-out; }
        .btn-primary:hover:not(:disabled) { background-color:#004d7a; box-shadow:0 4px 12px rgba(0,56,90,0.4); transform:translateY(-1px); }
        .btn-primary:active:not(:disabled) { transform:translateY(0); box-shadow:none; }
        .btn-primary:disabled { background-color:#1f2a32; color:#4a5e6a; cursor:not-allowed; transform:none; box-shadow:none; }
        .btn-secondary { background:transparent; border:1.5px solid #242f38; border-radius:14px; padding:12px; color:#7a909f; font-family:'DM Sans', sans-serif; font-weight:600; font-size:14px; cursor:pointer; transition:all 0.2s ease-in-out; }
        .btn-secondary:hover { background:#242f38; color:#e8eef2; border-color:#384754; }
        @keyframes bounce { from { opacity:0.3; transform:translateY(0); } to { opacity:1; transform:translateY(-6px); } }
      </style>

      <div style="max-width:1000px; margin:32px auto 36px; padding:0 20px;">
        <div style="display:flex; align-items:center; gap:0;">
          ${STEP_LABELS.map(function (label, i) {
            const done = i < stepIdx;
            const active = i === stepIdx;
            const isLast = i === STEP_LABELS.length - 1;
            const circleBg = done ? "#00385a" : (active ? "#00385a" : "#1a2228");
            const circleBorder = done || active ? "2px solid #00385a" : "2px solid #242f38";
            const circleColor = done || active ? "#ffffff" : "#4a5e6a";
            const labelColor = active ? "#e8eef2" : (done ? "#00385a" : "#4a5e6a");
            const connectorBg = done ? "#00385a" : "#242f38";
            return `
              <div style="display:flex; align-items:center; flex:${isLast ? "none" : 1};">
                <div style="display:flex; flex-direction:column; align-items:center; gap:4px;">
                  <div style="width:26px; height:26px; border-radius:50%; background:${circleBg}; border:${circleBorder}; display:flex; align-items:center; justify-content:center; transition:all 0.3s;">
                    ${done ? '<span style="color:#fff; display:flex; align-items:center; justify-content:center;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>' : `<span style="font-size:10px; font-weight:700; color:${circleColor};">${i + 1}</span>`}
                  </div>
                  <span style="font-size:10px; color:${labelColor}; font-weight:${active ? 600 : 400}; white-space:nowrap;">${label}</span>
                </div>
                ${i < STEP_LABELS.length - 1 ? `<div style="flex:1; height:2px; background:${connectorBg}; margin:0 4px; margin-bottom:18; transition:background 0.4s;"></div>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </div>

      <div style="max-width:1000px; margin:0 auto 40px; padding:0 20px;">
        ${stepContent()}
      </div>
    </div>
  `;
}

function stepContent() {
  switch (CREAR.step) {
    case "upload": return renderStepUpload();
    case "processing": return renderStepProcessing();
    case "ai": return renderStepAI();
    case "form": return renderStepForm();
    case "recursos": return renderStepRecursos();
    case "publishing": return renderStepPublishing();
    case "done": return renderStepDone();
    default: return renderStepUpload();
  }
}

function renderStepUpload() {
  return `
    <div style="background:#1a2228; border-radius:20px; border:1px solid #242f38; padding:24px;">
      <h2 style="font-family:'Playfair Display', serif; font-size:18px; margin:0 0 6px;">Selecciona tu imagen</h2>
      <p style="color:#7a909f; font-size:13px; margin:0 0 20px;">Sube las imágenes o archivos multimedia de tu obra (hasta 20 elementos).</p>
      ${CREAR.mediaList.length === 0 ? renderEmptyUpload() : renderMediaCarousel(false)}
      <button onclick="startProcessing()" disabled="${CREAR.mediaList.length === 0 ? "disabled" : ""}" class="btn-primary" style="margin-top:20px; width:100%;">Continuar →</button>
    </div>
  `;
}

function renderEmptyUpload() {
  return `
        <label style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; border:1.5px dashed #242f38; border-radius:16px; padding:48px 20px; cursor:pointer; transition:border-color 0.2s; background:#13191d; min-height:220px;"
          ondragover="event.preventDefault(); this.style.borderColor='#00385a';"
          ondragleave="event.preventDefault(); this.style.borderColor='#242f38';"
          ondrop="event.preventDefault(); this.style.borderColor='#242f38'; handleDrop(event);">
          <input type="file" multiple accept="image/*" style="display:none;" onchange="handleFiles(event.target.files)" />
          <span style="color:#4a5e6a;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </span>
          <span style="font-size:13px; color:#7a909f; text-align:center;">Arrastra tus archivos aquí o haz clic para subir<br /><span style="font-size:11px; color:#4a5e6a;">PNG, JPG, WEBP (Hasta 20 imágenes)</span></span>
        </label>
  `;
}

function renderMediaCarousel(isFormStep) {
  if (CREAR.mediaList.length === 0) return null;
  const currentUrl = CREAR.mediaList[CREAR.activeMediaIdx] || CREAR.mediaList[0];

  let prevBtn = "";
  if (CREAR.activeMediaIdx > 0) {
    prevBtn = `<button onclick="setActiveMediaIdx(${CREAR.activeMediaIdx - 1})" style="position:absolute; left:10px; top:50%; transform:translateY(-50%); background:rgba(19,25,29,0.85); border:1px solid rgba(255,255,255,0.15); border-radius:50%; width:36px; height:36px; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg></button>`;
  }
  let nextBtn = "";
  if (CREAR.activeMediaIdx < CREAR.mediaList.length - 1) {
    nextBtn = `<button onclick="setActiveMediaIdx(${CREAR.activeMediaIdx + 1})" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:rgba(19,25,29,0.85); border:1px solid rgba(255,255,255,0.15); border-radius:50%; width:36px; height:36px; color:#fff; display:flex; align-items:center; justify-content:center; cursor:pointer;"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></button>`;
  }

  const thumbs = CREAR.mediaList.map(function (url, i) {
    const isActive = CREAR.activeMediaIdx === i;
    const isOver = CREAR.dragOverIdx === i;
    const isDragged = CREAR.draggedIdx === i;
    const border = isOver ? "2px solid #5db8e8" : (isActive ? "2px solid #00385a" : "1.5px solid #242f38");
    const opacity = isDragged ? 0.4 : (isActive ? 1 : 0.65);
    const transform = isOver ? "scale(1.06)" : "scale(1)";
    return `
          <div draggable="false" onclick="setActiveMediaIdx(${i})" style="position:relative; flex-shrink:0; width:64px; height:64px; border-radius:12px; overflow:hidden; cursor:pointer; border:${border}; opacity:${opacity}; transform:${transform}; transition:all 0.2s ease; background:#13191d;">
            <img src="${url}" alt="thumb-${i}" style="width:100%; height:100%; object-fit:cover;" />
          </div>
        `;
  }).join("");

  let addBtn = "";
  if (CREAR.mediaList.length < 20) {
    addBtn = `
          <label style="flex-shrink:0; width:64px; height:64px; border-radius:12px; border:1.5px dashed #00385a; background:#13191d; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; color:#5db8e8; transition:background 0.2s;">
            <input type="file" multiple accept="image/*" style="display:none;" onchange="handleFiles(event.target.files)" />
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </label>
        `;
  }

  return `
    <div style="display:flex; flex-direction:column; gap:14px;">
      <div style="position:relative; width:100%; height:${isFormStep ? 220 : 360}px; background:#13191d; border-radius:16px; border:1px solid #242f38; overflow:hidden; display:flex; align-items:center; justify-content:center;">
        <img src="${currentUrl}" alt="Media ${CREAR.activeMediaIdx + 1}" style="max-width:100%; max-height:100%; object-fit:contain;" />
        <div style="position:absolute; top:12px; right:12px; background:rgba(19,25,29,0.85); border:1px solid rgba(255,255,255,0.12); border-radius:10px; padding:4px 10px; font-size:12px; font-weight:600; color:#e8eef2; z-index:10;">
          ${CREAR.activeMediaIdx + 1} / ${CREAR.mediaList.length}
        </div>
        <button onclick="removeMedia(${CREAR.activeMediaIdx})" title="Eliminar esta imagen" style="position:absolute; top:12px; left:12px; background:rgba(224,90,90,0.85); border:none; border-radius:10px; padding:6px; color:#fff; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:10;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
        </button>
        ${prevBtn}
        ${nextBtn}
      </div>
      <div style="display:flex; gap:10px; align-items:center; overflow-x:auto; padding-bottom:6px;">
        ${thumbs}
        ${addBtn}
      </div>
    </div>
  `;
}

function renderStepProcessing() {
  return `
    <div style="background:#1a2228; border-radius:20px; border:1px solid #242f38; padding:32px; text-align:center;">
      <div style="margin-bottom:20px;">
        <img src="${CREAR.mediaList[0]}" alt="preview" style="max-height:180px; max-width:100%; border-radius:14px; object-fit:contain; display:block; margin:0 auto;" />
      </div>
      <h2 style="font-family:'Playfair Display', serif; font-size:18px; margin:0 0 8px;">Analizando imagen...</h2>
      <p style="color:#7a909f; font-size:13px; margin:0 0 20px;">Extrayendo paleta de colores y datos técnicos</p>
      <div style="display:flex; justify-content:center; gap:8px; margin-bottom:16px;">
        <div style="width:8px; height:8px; border-radius:50%; background:#00385a; animation:bounce 0.9s 0s infinite alternate;"></div>
        <div style="width:8px; height:8px; border-radius:50%; background:#00385a; animation:bounce 0.9s 0.2s infinite alternate;"></div>
        <div style="width:8px; height:8px; border-radius:50%; background:#00385a; animation:bounce 0.9s 0.4s infinite alternate;"></div>
      </div>
      <style>@keyframes bounce { from { opacity:0.3; transform:translateY(0); } to { opacity:1; transform:translateY(-6px); } }</style>
      <div style="display:flex; justify-content:center; gap:6px;">
        ${CREAR.colors.map(function (c) { return `<div title="${c}" style="width:24px; height:24px; border-radius:6px; background:${c}; border:2px solid #242f38;"></div>`; }).join("")}
      </div>
    </div>
  `;
}

function renderStepAI() {
  const aprobado = CREAR.aiResult ? CREAR.aiResult.aprobado : null;
  const aprobadoColor = aprobado === false ? "#e05a5a" : "#1a7abf";
  const estadoTexto = (CREAR.aiProgress || 0) < 100
    ? "Analizando... " + Math.round(CREAR.aiProgress || 0) + "%"
    : (CREAR.aiResult && CREAR.aiResult.aprobado ? "✓ Contenido aprobado" : "✗ Contenido rechazado");

  return `
    <div style="background:#1a2228; border-radius:20px; border:1px solid #242f38; padding:32px; text-align:center;">
      <div style="width:56px; height:56px; border-radius:50%; background:#13191d; border:2px solid rgba(0,56,90,0.25); display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
        <span style="color:${aprobadoColor};">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </span>
      </div>
      <h2 style="font-family:'Playfair Display', serif; font-size:18px; margin:0 0 6px;">Validación con IA</h2>
      <p style="color:#7a909f; font-size:13px; margin:0 0 20px;">Verificando que tu contenido cumple las pautas de Pinspiration</p>
      <div style="background:#13191d; border-radius:10px; height:8px; overflow:hidden; margin-bottom:10px;">
        <div style="height:100%; width:${CREAR.aiProgress || 0}%; background:${aprobado === false ? "#e05a5a" : "linear-gradient(90deg,#00385a,#1a7abf)"}; transition:width 0.3s ease; border-radius:10px;"></div>
      </div>
      <p style="color:#7a909f; font-size:12px;">${estadoTexto}</p>
      ${CREAR.aiResult && CREAR.aiResult.aprobado ? `
        <div style="margin-top:20px; padding:16px; background:#0d2a1a; border:1px solid #1a6a3a; border-radius:14px; font-size:13px; color:#5ddf9a; display:flex; flex-direction:column; gap:14px; align-items:center;">
          <div>✓ <strong>${escapeHtml(CREAR.aiResult.razon)}</strong> — Categoría detectada: <strong>${escapeHtml(CREAR.aiResult.categoria)}</strong></div>
          <button onclick="setStep('form')" class="btn-primary" style="width:100%;">Continuar →</button>
        </div>
      ` : ""}
      ${CREAR.aiResult && CREAR.aiResult.aprobado === false ? `
        <div style="margin-top:16px; padding:12px 16px; background:#3a1212; border:1px solid #7a2020; border-radius:10px; font-size:13px; color:#ff8080;">
          <strong>Publicación bloqueada:</strong> ${escapeHtml(CREAR.aiResult.razon)}
          <button onclick="setStep('upload')" style="display:block; width:100%; margin-top:12px; background:transparent; border:1px solid #ff8080; color:#ff8080; padding:6px; border-radius:8px; cursor:pointer;">Subir otra imagen</button>
        </div>
      ` : ""}
      ${CREAR.aiError ? `<div style="margin-top:16px; color:#e05a5a; font-size:13px;">${escapeHtml(CREAR.aiError)}</div>` : ""}
    </div>
  `;
}

function renderStepForm() {
  const MAX = 2500;
  const descLen = (CREAR.desc || "").length;
  const remaining = MAX - descLen;
  const counterColor = remaining < 0 ? "#e05a5a" : (remaining < 200 ? "#e8a030" : "#7a909f");
  const counterText = (remaining < 0 ? "-" : "") + Math.abs(remaining) + " / " + MAX;
  const requiresSoftware = CREAR.category === "2D" || CREAR.category === "3D" || CREAR.category === "Edición";
  const isValid = (CREAR.title || "").trim() !== "" && CREAR.category !== "" && (!requiresSoftware || (CREAR.software || "").trim() !== "");

  const softwarePlaceholder = CREAR.category === "3D" ? "Blender, ZBrush, Unreal Engine 5..." : (CREAR.category === "Edición" ? "Photoshop, Lightroom, Premiere..." : "Photoshop, Procreate, Acrílico...");

  return `
    <div style="background:#1a2228; border-radius:20px; border:1px solid #242f38; padding:24px;">
      <div style="display:flex; gap:20px; margin-bottom:20px; flex-wrap:wrap;">
        <div style="flex:0 0 auto; width:220px;">
          ${renderMediaCarousel(true)}
          <div style="display:flex; gap:4px; margin-top:8px; flex-wrap:wrap;">
            ${CREAR.colors.map(function (c) { return `<div title="${c}" style="flex:1; height:14px; border-radius:4px; background:${c}; min-width:16px;"></div>`; }).join("")}
          </div>
        </div>
        <div style="flex:1; display:flex; flex-direction:column; gap:12px;">
          <label style="font-size:13px; color:#7a909f; font-weight:500;">
            Título <span style="color:#e05a5a;">*</span>
            <input class="search-bar" value="${escapeHtml(CREAR.title)}" oninput="CREAR.title = this.value; render();" placeholder="Nombre de tu obra" style="display:block; width:100%; margin-top:5px; padding:8px 12px; font-size:13px;" />
          </label>
          <label style="font-size:13px; color:#7a909f; font-weight:500;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:5px;">
              <span>Descripción</span>
              <span style="font-size:11px; color:${counterColor}; font-variant-numeric:tabular-nums;">${counterText}</span>
            </div>
            <textarea oninput="CREAR.desc = this.value; render();" placeholder="Cuéntanos sobre esta pieza..." style="display:block; width:100%; background:#13191d; border:1.5px solid #242f38; border-radius:12px; padding:8px 12px; color:#e8eef2; font-family:'DM Sans', sans-serif; font-size:13; resize:vertical; min-height:60px; outline:none;">${escapeHtml(CREAR.desc || "")}</textarea>
          </label>
          <label style="font-size:13px; color:#7a909f; font-weight:500;">
            <span>Tags <span style="font-size:11px;">(separados por coma)</span></span>
            <input class="search-bar" value="${escapeHtml(CREAR.tags)}" oninput="CREAR.tags = this.value; render();" placeholder="fantasía, personaje, oscuro..." style="display:block; width:100%; margin-top:5px; padding:8px 12px; font-size:13px;" />
          </label>
        </div>
      </div>

      <div style="margin-bottom:16px;">
        <p style="font-size:13px; color:#7a909f; font-weight:500; margin:0 0 8px;">Categoría <span style="color:#e05a5a;">*</span></p>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          ${["2D", "3D", "Fotografía", "Edición"].map(function (cat) {
            return `<button onclick="setCategoria('${cat}')" class="cat-pill${CREAR.category === cat ? " active" : ""}" style="font-size:13px; padding:6px 14px;">${cat}</button>`;
          }).join("")}
        </div>
      </div>

      ${requiresSoftware ? `
        <label style="font-size:13px; color:#7a909f; font-weight:500; display:block; margin-bottom:16px;">
          ${CREAR.category === "3D" ? "Software de modelado / motor" : (CREAR.category === "Edición" ? "Software de edición" : "Software o técnica")} <span style="color:#e05a5a;">*</span>
          <input class="search-bar" value="${escapeHtml(CREAR.software)}" oninput="CREAR.software = this.value; render();" placeholder="${softwarePlaceholder}" style="display:block; width:100%; margin-top:5px; padding:8px 12px; font-size:13px;" />
        </label>
      ` : ""}

      ${CREAR.category === "Fotografía" ? `
        <div style="background:#13191d; border-radius:14px; padding:16px; border:1px solid #242f38; margin-bottom:16px;">
          <p style="font-size:13px; color:#e8eef2; font-weight:600; margin:0 0 12px;">Datos EXIF de la fotografía</p>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
            <label style="font-size:12px; color:#7a909f;">Cámara
              <input class="search-bar" value="${escapeHtml(CREAR.exifCamera)}" oninput="setExif('Cámara', this.value); render();" placeholder="Ej: Sony A7 IV" style="width:100%; margin-top:4px; padding:6px 10px; font-size:12px;" />
            </label>
            <label style="font-size:12px; color:#7a909f;">Lente
              <input class="search-bar" value="${escapeHtml(CREAR.exifLens)}" oninput="setExif('Lente', this.value); render();" placeholder="Ej: 50mm f/1.4" style="width:100%; margin-top:4px; padding:6px 10px; font-size:12px;" />
            </label>
            <label style="font-size:12px; color:#7a909f;">Apertura (f/)
              <input class="search-bar" value="${escapeHtml(CREAR.exifAperture)}" oninput="setExif('Apertura', this.value); render();" placeholder="Ej: f/2.8" style="width:100%; margin-top:4px; padding:6px 10px; font-size:12px;" />
            </label>
            <label style="font-size:12px; color:#7a909f;">Velocidad
              <input class="search-bar" value="${escapeHtml(CREAR.exifShutterSpeed)}" oninput="setExif('Velocidad', this.value); render();" placeholder="Ej: 1/500s" style="width:100%; margin-top:4px; padding:6px 10px; font-size:12px;" />
            </label>
            <label style="font-size:12px; color:#7a909f;">ISO
              <input class="search-bar" value="${escapeHtml(CREAR.exifIso)}" oninput="setExif('ISO', this.value); render();" placeholder="Ej: 100" style="width:100%; margin-top:4px; padding:6px 10px; font-size:12px;" />
            </label>
            <label style="font-size:12px; color:#7a909f;">Distancia Focal
              <input class="search-bar" value="${escapeHtml(CREAR.exifFocalLength)}" oninput="setExif('Distancia Focal', this.value); render();" placeholder="Ej: 85mm" style="width:100%; margin-top:4px; padding:6px 10px; font-size:12px;" />
            </label>
          </div>
        </div>
      ` : ""}

      <button onclick="setStep('recursos')" disabled="${isValid ? "" : "disabled"}" class="btn-primary" style="width:100%;">Siguiente →</button>
    </div>
  `;
}

function renderStepRecursos() {
  return `
    <div style="background:#1a2228; border-radius:20px; border:1px solid #242f38; padding:24px;">
      <h2 style="font-family:'Playfair Display', serif; font-size:18px; margin:0 0 6px;">Recursos para la comunidad</h2>
      <p style="color:#7a909f; font-size:13px; margin:0 0 20px;">Puedes compartir archivos complementarios (.zip, .obj, pinceles, etc.) para que otros artistas los descarguen.</p>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:12px 14px; background:#13191d; border-radius:12px; border:1.5px solid ${CREAR.hasResource ? "#00385a" : "#242f38"};">
          <input type="checkbox" ${CREAR.hasResource ? "checked" : ""} onchange="toggleResource(event)" style="width:16px; height:16px; accent-color:#00385a;" />
          <span style="font-size:13px; color:#e8eef2;">Quiero adjuntar un archivo de recursos</span>
        </label>
        ${CREAR.hasResource ? `
          <div style="padding:16px; background:#13191d; border-radius:12px; border:1px solid #242f38; display:flex; flex-direction:column; gap:14px;">
            <label style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; border:1.5px dashed #242f38; border-radius:12px; padding:24px 16px; cursor:pointer; background:#1a2228; transition:border-color 0.2s;" ondragover="event.preventDefault(); this.style.borderColor='#00385a';" ondragleave="event.preventDefault(); this.style.borderColor='#242f38';" ondrop="event.preventDefault(); this.style.borderColor='#242f38'; const file = event.dataTransfer.files[0]; if (file) { CREAR.resourceFile = file; CREAR.resourceFileUrl = URL.createObjectURL(file); if (!CREAR.resourceName) CREAR.resourceName = file.name; }">
              <input type="file" style="display:none;" onchange="const file = event.target.files[0]; if (file) { CREAR.resourceFile = file; CREAR.resourceFileUrl = URL.createObjectURL(file); if (!CREAR.resourceName) CREAR.resourceName = file.name; }" />
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4a5e6a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span style="font-size:13px; color:#7a909f; text-align:center;">Haz clic o arrastra aquí tu archivo de recursos<br /><span style="font-size:11px; color:#4a5e6a;">ZIP, OBJ, PSD, BRUSHSET, PDF, etc.</span></span>
            </label>
            <label style="font-size:13px; color:#7a909f; font-weight:500; display:block;">
              Nombre de la descarga
              <input class="search-bar" value="${escapeHtml(CREAR.resourceName)}" oninput="CREAR.resourceName = this.value; render();" placeholder="Pinceles de texturas — Procreate.zip" style="display:block; width:100%; margin-top:5px; padding:8px 12px; font-size:13px;" />
            </label>
          </div>
        ` : ""}
      </div>
      <div style="display:flex; gap:10px; margin-top:20px;">
        <button onclick="setStep('form')" class="btn-secondary" style="flex:1;">← Atrás</button>
        <button onclick="handlePublish" class="btn-primary" style="flex:2;">Publicar pin</button>
      </div>
    </div>
  `;
}

function toggleResource(e) {
  CREAR.hasResource = e.target.checked;
  if (!CREAR.hasResource) {
    CREAR.resourceFile = null;
    CREAR.resourceFileUrl = null;
    CREAR.resourceName = "";
  }
  render();
}

function renderStepPublishing() {
  return `
    <div style="background:#1a2228; border-radius:20px; border:1px solid #242f38; padding:32px; text-align:center;">
      ${CREAR.mediaList[0] ? `<img src="${CREAR.mediaList[0]}" alt="preview" style="max-height:160px; max-width:100%; border-radius:14px; object-fit:contain; margin-bottom:20px; opacity:0.7; display:block; margin:0 auto;" />` : ""}
      <h2 style="font-family:'Playfair Display', serif; font-size:18px; margin:0 0 8px;">Publicando tu pin...</h2>
      <p style="color:#7a909f; font-size:13px; margin:0 0 20px;">Guardando imágenes y estructurando los datos</p>
    </div>
  `;
}

function renderStepDone() {
  return `
    <div style="background:#1a2228; border-radius:20px; border:1px solid #1a6a3a; padding:32px; text-align:center;">
      <div style="width:56px; height:56px; border-radius:50%; background:#0d2a1a; border:1px solid #1a6a3a; display:flex; align-items:center; justify-content:center; margin:0 auto 16px;">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#5ddf9a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2 style="font-family:'Playfair Display', serif; font-size:22px; margin:0 0 8px;">¡Pin publicado!</h2>
      <p style="color:#7a909f; font-size:13px; margin:0 0 20px;">Tu obra ya está activa en el feed de Pinspiration</p>
      <button onclick="navigate('feed')" class="btn-primary" style="width:100%;">Ver en el feed</button>
    </div>
  `;
}

function handlePublish() {
  setStep("publishing");
  setTimeout(function () {
    const exifData = {};
    if (CREAR.exifCamera) exifData["Cámara"] = CREAR.exifCamera;
    if (CREAR.exifLens) exifData["Lente"] = CREAR.exifLens;
    if (CREAR.exifAperture) exifData["Apertura"] = CREAR.exifAperture;
    if (CREAR.exifShutterSpeed) exifData["Velocidad"] = CREAR.exifShutterSpeed;
    if (CREAR.exifIso) exifData["ISO"] = CREAR.exifIso;
    if (CREAR.exifFocalLength) exifData["Distancia Focal"] = CREAR.exifFocalLength;

    const finalResourceName = CREAR.resourceName || (CREAR.resourceFile ? CREAR.resourceFile.name : null);
    const resourceData = finalResourceName ? [{ name: finalResourceName, url: CREAR.resourceFileUrl || undefined }] : undefined;

    const newPin = {
      id: "user-" + Date.now(),
      artistId: "a1",
      title: (CREAR.title || "").trim() || "Mi obra",
      description: (CREAR.desc || "").trim() || undefined,
      palette: CREAR.colors.length ? CREAR.colors : undefined,
      software: (CREAR.software || "").trim() || undefined,
      exif: CREAR.category === "Fotografía" && Object.keys(exifData).length > 0 ? exifData : undefined,
      resources: resourceData,
      publishedAt: new Date().toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" }),
      type: CREAR.category || "2D",
      tags: (CREAR.tags || "").split(",").map(function (t) { return t.trim(); }).filter(Boolean),
      imgUrl: CREAR.mediaList[0] || "",
      media: CREAR.mediaList,
      imgH: 400,
      likes: 0,
      saves: 0,
    };

    const payload = {
      usuario_id: PINAPP.user?.id,
      titulo: newPin.title,
      pin: {
        description: newPin.description,
        type: newPin.type,
        artistId: newPin.artistId,
        imgUrl: newPin.imgUrl,
        software: newPin.software,
        palette: newPin.palette,
        exif: newPin.exif,
        resources: newPin.resources,
        estado: "publicada",
        published_at: newPin.publishedAt,
      },
    };

    apiFetch("/publicaciones", {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then(function (res) { return res.json(); })
      .then(function () {
        PINAPP.userPins = [newPin].concat(PINAPP.userPins || []);
        setTimeout(function () { navigate("feed"); }, 800);
        setStep("done");
      })
      .catch(function (err) {
        console.error("Error al publicar el pin:", err);
        setStep("done");
      });
  }, 2200);
}

function setCategoria(cat) {
  CREAR.category = cat;
  render();
}
