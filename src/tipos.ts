// ─── Tipos compartidos de la app ───────────────────────────────────────────
// Figma no generó esto: estaba todo mezclado como `type`/`interface` sueltos
// dentro de App.tsx. Los junto aquí porque los usan casi todos los componentes.

export type PinType = "2D" | "3D" | "Fotografía" | "Edición";

export interface Pin {
  id: string;
  artistId: string;
  title: string;
  description?: string;
  palette?: string[];
  software?: string;
  exif?: Record<string, string>;
  media?: string[]; // <-- Agregar esta línea
  resources?: { name: string; url?: string }[];
  model3d?: { name: string; url: string };
  type: PinType;
  tags: string[];
  imgUrl: string;
  imgH: number;
  publishedAt?: string;
  publishedAtISO?: string; // fecha original de la BD, para ordenar el feed
  likes: number;
  saves: number;
}

export interface Artist {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  publications?: number; // publicaciones publicadas (vista_detalle_publicacion)
  headerBg?: string; // ← Añade esta línea
}

export interface Board {
  id: string;
  name: string;
  pins: Pin[];
}

// Controla qué pantalla muestra App.tsx
export type View = "feed" | "profile" | "boards" | "historial" | "sobre" | "crear" | "pin";
