import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_DURATION_SECONDS = 60;

const ejecutarArchivo = promisify(execFile);
const FILTRO_ESCALADO = "scale=w='min(if(gte(iw,ih),1920,1080),iw)':h='min(if(gte(iw,ih),1080,1920),ih)':force_original_aspect_ratio=decrease:force_divisible_by=2";

export async function verificarDuracionVideo(ruta) {
  const buffer = await fs.promises.readFile(ruta);

  const buscarDuracion = (inicio, fin) => {
    let offset = inicio;
    while (offset + 8 <= fin) {
      const tamano32 = buffer.readUInt32BE(offset);
      const tipo = buffer.toString('ascii', offset + 4, offset + 8);
      let encabezado = 8;
      let tamano = tamano32;
      if (tamano32 === 1) {
        if (offset + 16 > fin) return null;
        const tamano64 = buffer.readBigUInt64BE(offset + 8);
        if (tamano64 > BigInt(Number.MAX_SAFE_INTEGER)) return null;
        tamano = Number(tamano64);
        encabezado = 16;
      } else if (tamano32 === 0) {
        tamano = fin - offset;
      }
      if (tamano < encabezado || offset + tamano > fin) return null;

      const contenido = offset + encabezado;
      const finalCaja = offset + tamano;
      if (tipo === 'mvhd') {
        if (buffer[contenido] !== 0 && buffer[contenido] !== 1) return null;
        if (contenido + 20 > finalCaja) return null;
        const version = buffer[contenido];
        const escalaOffset = contenido + (version === 1 ? 20 : 12);
        const duracionOffset = escalaOffset + 4;
        if (duracionOffset + (version === 1 ? 8 : 4) > finalCaja) return null;
        const escala = buffer.readUInt32BE(escalaOffset);
        const ticks = version === 1
          ? Number(buffer.readBigUInt64BE(duracionOffset))
          : buffer.readUInt32BE(duracionOffset);
        return escala > 0 ? ticks / escala : null;
      }
      if (tipo === 'moov') {
        const duracion = buscarDuracion(contenido, finalCaja);
        if (duracion !== null) return duracion;
      }
      offset = finalCaja;
    }
    return null;
  };

  const duracion = buscarDuracion(0, buffer.length);
  if (!Number.isFinite(duracion) || duracion <= 0) {
    throw new Error('El video no contiene una duración válida.');
  }
  if (duracion > MAX_VIDEO_DURATION_SECONDS) {
    throw new Error('Los videos no pueden durar más de 1 minuto.');
  }
  return duracion;
}

async function codificarVideo(entrada, salida, reducirFotogramasYAudio) {
  const filtro = reducirFotogramasYAudio
    ? `${FILTRO_ESCALADO},fps=30`
    : FILTRO_ESCALADO;
  const argumentos = [
    '-hide_banner',
    '-loglevel', 'error',
    '-nostats',
    '-y',
    '-i', entrada,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-vf', filtro,
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '24',
    '-pix_fmt', 'yuv420p',
    '-fps_mode', 'passthrough',
    '-c:a', reducirFotogramasYAudio ? 'aac' : 'copy',
    ...(reducirFotogramasYAudio ? ['-b:a', '128k'] : []),
    '-movflags', '+faststart',
    '-f', 'mp4',
    salida,
  ];

  try {
    await ejecutarArchivo(ffmpegPath, argumentos, {
      windowsHide: true,
      maxBuffer: 1024 * 1024,
    });
  } catch (error) {
    const detalle = error.stderr?.trim();
    throw new Error(
      detalle
        ? `No se pudo optimizar el video con FFmpeg: ${detalle}`
        : 'No se pudo optimizar el video con FFmpeg.',
    );
  }
}

export async function optimizarVideo(entrada, destino) {
  if (!ffmpegPath) {
    throw new Error('FFmpeg no está disponible para optimizar videos en este servidor.');
  }

  const temporal = `${destino}.${crypto.randomBytes(8).toString('hex')}.tmp.mp4`;
  try {
    await codificarVideo(entrada, temporal, false);
    let { size } = await fs.promises.stat(temporal);

    if (size > MAX_VIDEO_BYTES) {
      await fs.promises.unlink(temporal);
      await codificarVideo(entrada, temporal, true);
      size = (await fs.promises.stat(temporal)).size;
    }

    if (size > MAX_VIDEO_BYTES) {
      throw new Error('El video optimizado sigue superando el límite de 100 MB.');
    }

    await fs.promises.rename(temporal, destino);
  } finally {
    await fs.promises.unlink(temporal).catch((error) => {
      if (error.code !== 'ENOENT') {
        console.error('No se pudo limpiar un video temporal optimizado:', error);
      }
    });
  }
}
