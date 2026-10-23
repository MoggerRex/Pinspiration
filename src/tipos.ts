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
  resources?: { name: string }[];
  type: PinType;
  tags: string[];
  imgUrl: string;
  imgH: number;
  publishedAt?: string;
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
  headerBg?: string; // ← Añade esta línea
}

// El usuario actual (ME) tiene más campos que un artista normal
export interface Me extends Artist {
  cover: string;
  totalLikes: number;
  totalSaves: number;
}

export interface Board {
  id: string;
  name: string;
  pins: Pin[];
}

// Controla qué pantalla muestra App.tsx
export type View = "feed" | "profile" | "boards" | "historial" | "sobre" | "crear" | "pin";
