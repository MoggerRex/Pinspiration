// ==========================================================================
// login.js — Autenticación e inicio de sesión (migración desde React)
// ==========================================================================

const LOGIN = {
  activeView: "login",
  step: "credentials",
  loginEmail: "",
  loginPassword: "",
  nombre: "",
  handle: "",
  email: "",
  password: "",
  avatar: "",
  error: "",
  tempUser: null,
  isMobile: false,
};

function initLogin() {
  const mobileQuery = "(max-width: 768px), (max-width: 1024px) and (max-height: 600px)";
  LOGIN.isMobile = window.matchMedia(mobileQuery).matches;
  window.matchMedia(mobileQuery).addEventListener("change", (e) => {
    LOGIN.isMobile = e.matches;
  });
}

function setLoginError(message) {
  LOGIN.error = message;
}

function toggleLoginView() {
  LOGIN.activeView = LOGIN.activeView === "login" ? "register" : "login";
  LOGIN.error = "";
  render();
}

function setLoginAvatar(value) {
  LOGIN.avatar = value;
  render();
}

function setLoginField(field, value) {
  if (field === "loginEmail") LOGIN.loginEmail = value;
  else if (field === "loginPassword") LOGIN.loginPassword = value;
  else if (field === "nombre") LOGIN.nombre = value;
  else if (field === "handle") LOGIN.handle = value;
  else if (field === "email") LOGIN.email = value;
  else if (field === "password") LOGIN.password = value;
}

function handleAvatarFile(event) {
  const file = event?.target?.files?.[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      LOGIN.avatar = ev.target?.result;
      render();
    };
    reader.readAsDataURL(file);
  }
}

function handleLoginSubmit(event) {
  event?.preventDefault?.();
  if (!LOGIN.loginEmail || !LOGIN.loginPassword) {
    setLoginError("Por favor, completa todos los campos.");
    render();
    return;
  }
  setLoginError("");
  iniciarSesion(LOGIN.loginEmail, LOGIN.loginPassword)
    .then((user) => {
      handleLoginExitoso(user);
    })
    .catch((err) => {
      console.error("Error al conectar con el servidor:", err);
      setLoginError("No se pudo conectar con el servidor. Revisa que backend esté corriendo.");
      render();
    });
}

function handleDemoLogin() {
  setLoginError("");
  return iniciarSesion("leo@pinspiration.com", "123")
    .then((user) => {
      handleLoginExitoso(user);
    })
    .catch((err) => {
      console.error("Error al iniciar sesión de demostración:", err);
      setLoginError("No se pudo iniciar la sesión de demostración.");
      render();
    });
}

function handleRegisterSubmit(event) {
  event?.preventDefault?.();
  if (!LOGIN.nombre || !LOGIN.handle || !LOGIN.email || !LOGIN.password) {
    setLoginError("Por favor, completa todos los campos requeridos.");
    render();
    return;
  }
  const cleanHandle = LOGIN.handle.startsWith("@") ? LOGIN.handle : "@" + LOGIN.handle;
  LOGIN.tempUser = {
    id: "u-" + Date.now(),
    nombre: LOGIN.nombre,
    handle: cleanHandle,
    email: LOGIN.email,
    bio: "Entusiasta del arte y la creatividad visual.",
    headerBg: "linear-gradient(0deg, #13191d 5%, #00385a 100%)",
    avatar: "",
  };
  LOGIN.step = "avatar";
  render();
}

function handleFinishRegister(avatarUrl) {
  const defaultAvatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200";
  const finalUser = Object.assign({}, LOGIN.tempUser || {}, { avatar: avatarUrl || defaultAvatar });
  handleLoginExitoso(finalUser);
  LOGIN.step = "credentials";
}

function handleLoginExitoso(user) {
  setUser(user);
}

// ─── Render del login ────────────────────────────────────────────────────────

function renderLogin() {
  if (LOGIN.step === "avatar") {
    return renderLoginAvatarStep();
  }

  const activeView = LOGIN.activeView;
  const isRegister = activeView === "register";

  // Posición + animación (Framer Motion → CSS transition en transform)
  const panelStyle = (cls, isActive) => {
    const view = isRegister ? "register" : "login";
    let left;
    if (view === "register") {
      left = cls === "hero" ? "0%" : "50%";
    } else {
      left = cls === "hero" ? "50%" : "0%";
    }
    const transform = isActive ? "translateX(0)" : "translateX(100%)";
    return `position:absolute; top:0; left:${left}; width:50%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; padding:40px; box-sizing:border-box; transform:${transform}; transition:transform 0.45s cubic-bezier(0.22,1,0.36,1);`;
  };

  const heroClass = `hero ${activeView} ${isRegister ? "active" : ""}`;
  const heroContent = `
    <div class="hero-content">
      <div class="stagger-item"><div class="brand-header"><div class="brand-logo-icon">P</div><span class="brand-title">Pinspiration</span></div></div>
      <div class="stagger-item"><h2>${isRegister ? "¡Bienvenido de nuevo!" : "¡Hola, creador!"}</h2></div>
      <div class="stagger-item"><p>${isRegister ? "¿Ya tienes cuenta? ¡Inicia sesión e inspírate!" : "¿Aún no tienes cuenta? ¡Regístrate e inspírate!"}</p></div>
      <div class="stagger-item"><button type="button" onclick="toggleLoginView()" style="padding:12px 36px; border-radius:32px; letter-spacing:1px; font-family:'DM Sans',sans-serif; font-weight:600; font-size:13px; color:#fff; border:1.5px solid #fff; background:transparent; transition:color 0.3s ease, background 0.3s ease; cursor:pointer;">${isRegister ? "INICIAR SESIÓN" : "REGISTRARSE"}</button></div>
    </div>
  `;

  const formClass = `form ${isRegister ? "register" : "login"} ${isRegister ? "active" : ""}`;
  const formContent = `
    <div class="form-content">
      <div class="stagger-item"><div class="brand-header"><div class="brand-logo-icon">P</div><span class="brand-title">Pinspiration</span></div></div>
      <div class="stagger-item"><h2>${isRegister ? "Crear cuenta" : "Iniciar sesión"}</h2></div>
      <div class="stagger-item"><div class="sso-buttons"><button type="button" class="sso-btn">G</button><button type="button" class="sso-btn">F</button><button type="button" class="sso-btn">in</button></div></div>
      ${LOGIN.error && isRegister ? `<div class="login-error">${escapeHtml(LOGIN.error)}</div>` : ""}
      ${isRegister ? `
        <div class="stagger-item"><form onsubmit="handleRegisterSubmit(event)" style="display:flex; flex-direction:column; gap:12px; width:100%;">
          <input type="text" placeholder="Nombre de creador" value="${escapeHtml(LOGIN.nombre)}" oninput="setLoginField('nombre', this.value)" />
          <input type="text" placeholder="Handle (@usuario)" value="${escapeHtml(LOGIN.handle)}" oninput="setLoginField('handle', this.value)" />
          <input type="email" placeholder="Correo electrónico" value="${escapeHtml(LOGIN.email)}" oninput="setLoginField('email', this.value)" />
          <input type="password" placeholder="Contraseña" value="${escapeHtml(LOGIN.password)}" oninput="setLoginField('password', this.value)" />
          <button type="submit">REGISTRARSE</button>
        </form></div>
      ` : `
        <div class="stagger-item"><form onsubmit="handleLoginSubmit(event)" style="display:flex; flex-direction:column; gap:12px; width:100%;">
          <input type="email" placeholder="Correo electrónico" value="${escapeHtml(LOGIN.loginEmail)}" oninput="setLoginField('loginEmail', this.value)" />
          <input type="password" placeholder="Contraseña" value="${escapeHtml(LOGIN.loginPassword)}" oninput="setLoginField('loginPassword', this.value)" />
          <button type="submit">INICIAR SESIÓN</button>
        </form></div>
        <div class="stagger-item"><button type="button" onclick="handleDemoLogin()" style="margin-top:8px; padding:8px; font-size:11px; cursor:pointer; background:transparent; border:1px solid #242f38; color:#7a909f; border-radius:10px; font-weight:500;">Entrar rápido como invitado (Valeria Mora)</button></div>
      `}
    </div>
  `;

  const heroPanel = `
    <div class="${heroClass}" style="${panelStyle("hero", isRegister)}">
      ${heroContent}
    </div>
  `;
  const formPanel = `
    <div class="${formClass}" style="${panelStyle("form", isRegister)}">
      ${formContent}
    </div>
  `;

  return `
    <div class="login-container">
      <div class="card">
        <div class="card-bg ${activeView}"></div>
        ${heroPanel}
        ${formPanel}
      </div>
    </div>
  `;
}

function renderLoginAvatarStep() {
  return `
    <div class="login-container">
      <div class="login-card-avatar">
        <div class="avatar-step">
          <h3>¿Quieres añadir una foto de perfil?</h3>
          <p class="avatar-sub">Puedes subir una imagen ahora o configurarla después.</p>
          <div class="avatar-preview-box">
            ${LOGIN.avatar ? `<img src="${LOGIN.avatar}" alt="Preview" class="avatar-preview-img" />` : `<div class="avatar-placeholder">${(LOGIN.tempUser?.nombre || "P").charAt(0).toUpperCase()}</div>`}
          </div>
          <div style="margin-bottom:16px;">
            <label style="fontSize:13px; color:#7a909f; fontWeight:500;">Sube una imagen</label>
            <input type="file" accept="image/*" onchange="handleAvatarFile(event)" style="margin-top:4px; color:#e8eef2; fontSize:13px; width:100%;" />
          </div>
          <div style="marginBottom:20px;">
            <label style="fontSize:13px; color:#7a909f; fontWeight:500;">O pega la URL de una imagen</label>
            <input type="text" value="${escapeHtml(LOGIN.avatar)}" oninput="setLoginAvatar(this.value)" placeholder="https://..." style="width:100%; padding:10px 14px; background:#13191d; border:1.5px solid #242f38; borderRadius:12px; color:#e8eef2; fontSize:14px; outline:none; boxSizing:border-box; marginTop:4px;" />
          </div>
          <div style="display:flex; gap:10px;">
            <button onclick="handleFinishRegister('')" style="flex:1; padding:10px; borderRadius:12px; cursor:pointer; background:#13191d; border:1px solid #242f38; color:#e8eef2; fontWeight:600;">Omitir</button>
            <button onclick="handleFinishRegister('${escapeHtml(LOGIN.avatar)}')" style="flex:1; padding:10px; borderRadius:12px; cursor:pointer; background:#00385a; border:none; color:#fff; fontWeight:600;">Guardar y Entrar</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Inicialización ──────────────────────────────────────────────────────────

function initApp() {
  const saved = localStorage.getItem("pinspiration_user");
  PINAPP.user = saved ? JSON.parse(saved) : null;
  initLogin();

  obtenerUsuarios()
    .then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        PINAPP.artists = data.map((u) => ({
          id: String(u.id),
          name: u.nombre,
          handle: u.handle ? (u.handle.startsWith("@") ? u.handle.slice(1) : u.handle) : "usuario",
          avatar: u.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200",
          bio: u.bio || "Sin descripción aún.",
          followers: 0,
          following: 0,
          headerBg: u.header_bg,
        }));
      }
    })
    .catch((err) => console.error("Error al obtener usuarios:", err));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (PINAPP.drawerOpen) cerrarMenuHamburguesa();
    }
  });
}

function init() {
  initApp();
  render();
}

init();
