// URL base del backend: usa el mismo host desde el que se abrió la página,
// así funciona tanto en la PC (localhost) como en el celular (192.168.x.x).
export const API = `http://${window.location.hostname}:5000`;

// En la BD las imágenes subidas se guardan como ruta relativa (/uploads/...).
// Esta función las convierte en URL completa; las URLs externas quedan igual.
export const fullUrl = (u?: string | null): string =>
  u && u.startsWith("/uploads") ? `${API}${u}` : u || "";