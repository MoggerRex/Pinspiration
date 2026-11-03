const MAX_SOURCE_SIZE = 50 * 1024 * 1024;
const MAX_OUTPUT_SIZE = 15 * 1024 * 1024;
const MAX_PIXELS = 40_000_000;

export async function optimizarImagen(file: File, maxDimension: number): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido.");
  }
  if (file.size > MAX_SOURCE_SIZE) {
    throw new Error("La imagen original no puede superar 50 MB.");
  }

  const image = await createImageBitmap(file).catch(() => {
    throw new Error("No se pudo leer la imagen seleccionada.");
  });

  try {
    if (image.width * image.height > MAX_PIXELS) {
      throw new Error("La imagen tiene demasiados píxeles para procesarla.");
    }

    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No se pudo procesar la imagen.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => result ? resolve(result) : reject(new Error("No se pudo comprimir la imagen.")),
        "image/webp",
        0.84,
      );
    });

    if (blob.size > MAX_OUTPUT_SIZE) {
      throw new Error("La imagen optimizada supera el límite de 15 MB.");
    }
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  } finally {
    image.close();
  }
}
