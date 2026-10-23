// ─── Helpers usados solo por CrearPublicacion.tsx (wizard de subir pin) ────

export function extractColors(imgEl: HTMLImageElement): string[] {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 80; canvas.height = 80;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    ctx.drawImage(imgEl, 0, 0, 80, 80);
    const data = ctx.getImageData(0, 0, 80, 80).data;
    const buckets: Record<string, number> = {};
    for (let i = 0; i < data.length; i += 16) {
      const r = Math.round(data[i] / 32) * 32;
      const g = Math.round(data[i+1] / 32) * 32;
      const b = Math.round(data[i+2] / 32) * 32;
      const key = `${r},${g},${b}`;
      buckets[key] = (buckets[key] || 0) + 1;
    }
    return Object.entries(buckets)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k]) => {
        const [r, g, b] = k.split(",").map(Number);
        return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
      });
  } catch { return ["#1a3a50","#2a5a7a","#0d2030","#3a7aaa","#0a1520"]; }
}

export function mockExif() {
  return { camara: "Sony α7 IV", apertura: "f/1.8", velocidad: "1/200s", iso: "ISO 400", focal: "85mm" };
}
