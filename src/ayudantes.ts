import type { PinType } from "./tipos";

export function tagClass(type: PinType) {
  switch (type) {
    case "2D": return "tag-badge tag-2d";
    case "3D": return "tag-badge tag-3d";
    case "Fotografía": return "tag-badge tag-photo";
    case "Edición": return "tag-badge tag-edit";
  }
}

export function formatNum(n: number) {
  return n >= 1000 ? (n / 1000).toFixed(1) + "k" : n.toString();
}
