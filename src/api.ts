// URL base del backend: usa el mismo host desde el que se abrió la página,
// así funciona tanto en la PC (localhost) como en el celular (192.168.x.x).
export const API = `http://${window.location.hostname}:5000`;

// Las rutas internas del backend son relativas para no depender de la IP del servidor.
// Esta función las convierte en URLs completas; las externas quedan igual.
export const fullUrl = (u?: string | null): string =>
  u && (u.startsWith("/uploads") || u.startsWith("/api/")) ? `${API}${u}` : u || "";