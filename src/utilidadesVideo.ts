const MAX_VIDEO_DURATION_SECONDS = 60;
const MAX_VIDEO_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_PREVIEW_VIDEOS = 3;

interface VideoPreview {
  element: HTMLVideoElement;
  visible: boolean;
  hovered: boolean;
  order: number;
}

const videoPreviews = new Map<HTMLVideoElement, VideoPreview>();
let previewOrder = 0;

export function esVideoMedia(value: string | File): boolean {
  if (value instanceof File) {
    return value.type === "video/mp4" || /\.mp4$/i.test(value.name);
  }
  try {
    return /\.mp4$/i.test(new URL(value, window.location.href).pathname);
  } catch {
    return /\.mp4(?:$|[?#])/i.test(value);
  }
}

export function obtenerDuracionVideo(file: File): Promise<number> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "metadata";
  video.src = url;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
    };
    video.onloadedmetadata = () => {
      const duration = video.duration;
      cleanup();
      if (!Number.isFinite(duration) || duration <= 0) {
        reject(new Error("No se pudo determinar la duración del video."));
      } else if (duration > MAX_VIDEO_DURATION_SECONDS) {
        reject(new Error("Los videos no pueden durar más de 1 minuto."));
      } else {
        resolve(duration);
      }
    };
    video.onerror = () => {
      cleanup();
      reject(new Error("No se pudo leer el video. Usa un archivo MP4 válido."));
    };
    video.load();
  });
}

export async function extraerFotogramasVideo(file: File, maxFrames = 60): Promise<Blob[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.preload = "auto";
  video.muted = true;
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("No se pudo leer el video para analizarlo."));
      video.load();
    });

    const duration = video.duration;
    if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_VIDEO_DURATION_SECONDS) {
      throw new Error("La duración del video no es válida o supera 1 minuto.");
    }

    const canvas = document.createElement("canvas");
    const columnas = 4;
    const filas = 4;
    const anchoFotograma = 320;
    const altoFotograma = 180;
    canvas.width = columnas * anchoFotograma;
    canvas.height = filas * altoFotograma;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudieron preparar fotogramas para moderar el video.");

    const frameCount = Math.min(maxFrames, Math.max(1, Math.ceil(duration)));
    const hojas: Blob[] = [];
    for (let index = 0; index < frameCount; index += 1) {
      const timestamp = Math.min(duration - 0.05, index + 0.5);
      await new Promise<void>((resolve, reject) => {
        const target = Math.max(0, timestamp);
        if (Math.abs(video.currentTime - target) < 0.01) {
          resolve();
          return;
        }
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("No se pudo leer un fotograma del video."));
        video.currentTime = target;
      });
      const columna = index % columnas;
      const fila = Math.floor((index % (columnas * filas)) / columnas);
      const x = columna * anchoFotograma;
      const y = fila * altoFotograma;
      const scale = Math.min(anchoFotograma / video.videoWidth, altoFotograma / video.videoHeight);
      const width = Math.round(video.videoWidth * scale);
      const height = Math.round(video.videoHeight * scale);
      context.fillStyle = "#101820";
      context.fillRect(x, y, anchoFotograma, altoFotograma);
      context.drawImage(video, x + (anchoFotograma - width) / 2, y + (altoFotograma - height) / 2, width, height);
      context.fillStyle = "rgba(0, 0, 0, 0.7)";
      context.fillRect(x, y, 52, 18);
      context.fillStyle = "#ffffff";
      context.font = "12px sans-serif";
      context.fillText(`${index + 1}s`, x + 5, y + 13);

      const finHoja = (index + 1) % (columnas * filas) === 0 || index === frameCount - 1;
      if (finHoja) {
        const sheet = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("No se pudo preparar una hoja de fotogramas.")),
            "image/jpeg",
            0.8,
          );
        });
        hojas.push(sheet);
        context.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    return hojas;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

function actualizarReproduccionPrevia() {
  const candidatos = [...videoPreviews.entries()]
    .filter(([, state]) => state.visible)
    .sort(([, first], [, second]) =>
      Number(second.hovered) - Number(first.hovered) || second.order - first.order
    )
    .slice(0, MAX_PREVIEW_VIDEOS);
  const seleccionados = new Set(candidatos.map(([element]) => element));

  for (const [element, state] of videoPreviews) {
    if (seleccionados.has(element)) {
      element.muted = true;
      void element.play().catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "NotAllowedError")) {
          console.error("No se pudo reproducir la vista previa del video:", error);
        }
      });
    } else {
      element.pause();
      if (!state.visible) element.currentTime = 0;
    }
  }
}

export function actualizarVideoPrevia(element: HTMLVideoElement, visible: boolean, hovered: boolean) {
  videoPreviews.set(element, { element, visible, hovered, order: ++previewOrder });
  actualizarReproduccionPrevia();
}

export function quitarVideoPrevio(element: HTMLVideoElement) {
  videoPreviews.delete(element);
  element.pause();
  actualizarReproduccionPrevia();
}

export function validarArchivoVideo(file: File): string | null {
  if (file.type !== "video/mp4" || !/\.mp4$/i.test(file.name)) {
    return "Solo se aceptan videos MP4.";
  }
  if (file.size === 0 || file.size > MAX_VIDEO_SIZE_BYTES) {
    return "Cada video debe pesar más de 0 y hasta 100 MB.";
  }
  return null;
}
