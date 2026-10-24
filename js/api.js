// ==========================================================================
// api.js — Funciones fetch para consumir los endpoints PHP de Pinspiration.
// Migración desde React → fetch nativo con la API en PHP.
// ==========================================================================

// URL base del backend PHP (ejecutar con: php -S localhost:8000 -t . api/index.php)
const API_BASE = "http://localhost:8000/api";

// API key de Google Gemini (la misma que usaba VITE_GEMINI_API_KEY en React)
const GEMINI_API_KEY = "AQ.Ab8RN6J_5TMHUf_tIfUf392pETXPuVkFln84RIGPlqJx80K7ww";

async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return response;
}

async function obtenerFeed() {
  const response = await apiFetch("/feed");
  if (!response.ok) throw new Error("Error al obtener el feed");
  return response.json();
}

async function obtenerUsuarios() {
  const response = await apiFetch("/usuarios");
  if (!response.ok) throw new Error("Error al obtener los usuarios");
  return response.json();
}

async function iniciarSesion(email, password) {
  const response = await apiFetch("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Credenciales incorrectas");
  return data;
}

// Expuestos para los demás modulos del frontend
window.PINSPOSITION = {
  API_BASE,
  apiFetch,
  obtenerFeed,
  obtenerUsuarios,
  iniciarSesion,
  GEMINI_API_KEY,
};
