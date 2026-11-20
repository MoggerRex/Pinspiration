import { execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

const ejecutarArchivo = promisify(execFile);
const FILTRO_ESCALADO = "scale=w='min(if(gte(iw,ih),1920,1080),iw)':h='min(if(gte(iw,ih),1080,1920),ih)':force_original_aspect_ratio=decrease:force_divisible_by=2";

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
