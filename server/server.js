import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(path.join(UPLOADS_DIR, 'avatares'), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_DIR, 'publicaciones'), { recursive: true });

const app = express();

// Middlewares
app.use(cors());
// Límite alto porque las imágenes llegan como data URL (base64) desde el frontend
app.use(express.json({ limit: '100mb' }));
// Imágenes subidas (avatares y publicaciones)
app.use('/uploads', express.static(UPLOADS_DIR));

// Configuración de la conexión a MySQL Workbench
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root', // <-- Cambia por tu contraseña de MySQL si es distinta
  database: 'pinspiration',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: '¡API de Pinspiration conectada con éxito a MySQL!' });
});

// Endpoint para obtener todos los usuarios de la base de datos
app.get('/api/usuarios', (req, res) => {
  db.query('SELECT id, nombre, handle, email, avatar_url AS avatar, bio, header_bg FROM usuarios', (err, results) => {
    if (err) {
      console.error('Error al consultar usuarios:', err);
      return res.status(500).json({ error: 'Error al consultar usuarios' });
    }
    res.json(results);
  });
});

// Endpoint para Iniciar Sesión buscando por Correo y Contraseña
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Faltan credenciales' });
  }

  const query = 'SELECT id, nombre, handle, email, avatar_url AS avatar, bio, header_bg FROM usuarios WHERE email = ? AND password_hash = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Error en login:', err);
      return res.status(500).json({ error: 'Error interno en la base de datos' });
    }

    if (results.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos' });
    }

    res.json(results[0]);
  });
});

// Endpoint del Feed de publicaciones desde tu vista
app.get('/api/feed', (req, res) => {
  db.query('SELECT * FROM vista_feed_publicaciones', (err, results) => {
    if (err) {
      console.error('Error al consultar el feed:', err);
      return res.status(500).json({ error: 'Error al consultar feed' });
    }
    res.json(results);
  });
});


// FUNCIÓN AUXILIAR: Asegurar que el Pin exista en MySQL
const ensurePublication = (pubId, pinData, callback) => {
  const externalId = String(pubId);
  const numericId = /^\d+$/.test(externalId) ? Number(externalId) : null;
  const lookup = numericId
    ? 'SELECT id FROM publicaciones WHERE id = ?'
    : 'SELECT id FROM publicaciones WHERE codigo_externo = ?';
  const lookupValue = numericId || externalId;

  db.query(lookup, [lookupValue], (err, results) => {
    if (err) return callback(err);

    if (results.length > 0) {
      return callback(null, results[0].id);
    }

    const titulo = pinData?.title || `Pin ${externalId}`;
    const categoria = pinData?.type || '3D';
    const artistIdMatch = /^a(\d+)$/.exec(String(pinData?.artistId || ''));
    const parsedArtistId = artistIdMatch
      ? Number(artistIdMatch[1])
      : Number.parseInt(pinData?.artistId, 10);
    const artistaId = Number.isInteger(parsedArtistId) ? parsedArtistId : 1;
    const imgUrl = pinData?.imgUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600';

    const insertPub = 'INSERT INTO publicaciones (codigo_externo, usuario_id, titulo, categoria, estado, published_at) VALUES (?, ?, ?, ?, "publicada", NOW())';
    db.query(insertPub, [numericId ? null : externalId, artistaId, titulo, categoria], (errIns, result) => {
      if (errIns) return callback(errIns);

      const publicationId = result.insertId;
      const insertMedio = 'INSERT INTO medios_publicacion (publicacion_id, url_archivo, orden) VALUES (?, ?, 0)';
      db.query(insertMedio, [publicationId, imgUrl], (errMedia) => {
        if (errMedia) return callback(errMedia);
        callback(null, publicationId);
      });
    });
  });
};


// RUTAS DE TABLEROS Y PINES GUARDADOS

app.get('/api/tableros/:usuarioId', (req, res) => {
  const { usuarioId } = req.params;

  const queryTableros = 'SELECT * FROM vista_tableros_guardados WHERE usuario_id = ? ORDER BY created_at DESC';

  db.query(queryTableros, [usuarioId], (err, tableros) => {
    if (err) {
      console.error('Error al consultar tableros:', err);
      return res.status(500).json({ error: 'Error al consultar tableros' });
    }

    if (tableros.length === 0) {
      return res.json([]);
    }

    const queryPines = `
      SELECT 
        tp.tablero_id,
        COALESCE(p.codigo_externo, CAST(p.id AS CHAR)) AS publicacion_id,
        p.titulo,
        p.categoria,
        portada.url_archivo AS img_url,
        u.id AS artista_id
      FROM tablero_publicacion tp
      JOIN publicaciones p ON p.id = tp.publicacion_id
      JOIN usuarios u ON u.id = p.usuario_id
      LEFT JOIN medios_publicacion portada ON portada.publicacion_id = p.id AND portada.orden = 0
      JOIN tableros t ON t.id = tp.tablero_id
      WHERE t.usuario_id = ?
    `;

    db.query(queryPines, [usuarioId], (errPines, pines) => {
      if (errPines) {
        console.error('Error al consultar pines de tableros:', errPines);
        return res.status(500).json({ error: 'Error al consultar pines de tableros' });
      }

      const tablerosConPines = tableros.map((t) => {
        const pinesDelTablero = pines
          .filter((p) => String(p.tablero_id) === String(t.tablero_id))
          .map((p) => ({
            id: String(p.publicacion_id),
            title: p.titulo,
            type: p.categoria,
            imgUrl: p.img_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
            imgH: 300,
            artistId: String(p.artista_id),
            likes: 0,
            saves: 0,
            tags: []
          }));

        return {
          tablero_id: t.tablero_id,
          tablero_nombre: t.tablero_nombre,
          pines: pinesDelTablero
        };
      });

      res.json(tablerosConPines);
    });
  });
});

app.post('/api/tableros', (req, res) => {
  const { usuario_id, nombre } = req.body;

  if (!usuario_id || !nombre) {
    return res.status(400).json({ error: 'Usuario y nombre son requeridos' });
  }

  const query = 'INSERT INTO tableros (usuario_id, nombre) VALUES (?, ?)';
  db.query(query, [usuario_id, nombre], (err, result) => {
    if (err) {
      console.error('Error al crear tablero:', err);
      return res.status(500).json({ error: 'Error al crear tablero' });
    }
    res.json({ id: result.insertId, usuario_id, nombre, total_pines: 0 });
  });
});

app.post('/api/tableros/guardar', (req, res) => {
  const { tablero_id, publicacion_id, pin, usuario_id } = req.body;

  if (!tablero_id || !publicacion_id || !usuario_id) {
    return res.status(400).json({ error: 'Parámetros incompletos' });
  }

  db.query('SELECT id FROM tableros WHERE id = ? AND usuario_id = ?', [tablero_id, usuario_id], (errBoard, boards) => {
    if (errBoard) {
      console.error('Error verificando propietario del tablero:', errBoard);
      return res.status(500).json({ error: 'Error al verificar el tablero' });
    }
    if (boards.length === 0) {
      return res.status(404).json({ error: 'Tablero no encontrado para este usuario' });
    }

    ensurePublication(publicacion_id, pin, (err, validPubId) => {
      if (err) {
        console.error('Error asegurando publicación:', err);
        return res.status(500).json({ error: 'Error interno' });
      }

      const query = 'INSERT IGNORE INTO tablero_publicacion (tablero_id, publicacion_id) VALUES (?, ?)';
      db.query(query, [tablero_id, validPubId], (errSave) => {
        if (errSave) {
          console.error('Error al guardar en tablero:', errSave);
          return res.status(500).json({ error: 'Error al guardar en tablero' });
        }
        res.json({ mensaje: 'Publicación guardada exitosamente' });
      });
    });
  });
});


// RUTAS DE HISTORIAL
app.get('/api/historial/:usuarioId', (req, res) => {
  const { usuarioId } = req.params;
  const query = 'SELECT * FROM vista_historial_vista WHERE usuario_id = ? ORDER BY visto_at DESC LIMIT 50';

  db.query(query, [usuarioId], (err, results) => {
    if (err) {
      console.error('Error al consultar historial:', err);
      return res.status(500).json({ error: 'Error al consultar historial' });
    }
    res.json(results);
  });
});

app.post('/api/historial', (req, res) => {
  const { usuario_id, publicacion_id, pin } = req.body;

  if (!usuario_id || !publicacion_id) {
    return res.status(400).json({ error: 'Parámetros incompletos' });
  }

  ensurePublication(publicacion_id, pin, (err, validPubId) => {
    if (err) {
      console.error('Error asegurando publicación:', err);
      return res.status(500).json({ error: 'Error interno' });
    }

    const query = `
      INSERT INTO historial_visualizacion (usuario_id, publicacion_id)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE visto_at = CURRENT_TIMESTAMP
    `;

    db.query(query, [usuario_id, validPubId], (errHist) => {
      if (errHist) {
        console.error('Error al registrar en historial:', errHist);
        return res.status(500).json({ error: 'Error al registrar historial' });
      }
      res.json({ mensaje: 'Historial actualizado' });
    });
  });
});


// ═══════════════════════════════════════════════════════════════
// PERFIL DE USUARIO Y PUBLICACIONES
// ═══════════════════════════════════════════════════════════════
const dbp = db.promise();

const CATEGORIAS = ['2D', '3D', 'Fotografía', 'Edición'];
const EXT_POR_MIME = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

// Guarda una imagen en formato data URL en /uploads/<carpeta> y devuelve su ruta relativa.
// En la BD se guarda solo la ruta (/uploads/...) para no depender de la IP o el host del servidor.
const guardarImagenDataUrl = async (dataUrl, carpeta) => {
  if (typeof dataUrl !== 'string') throw new Error('Imagen inválida');
  const coma = dataUrl.indexOf(',');
  const cabecera = /^data:(image\/[a-z0-9.+-]+);base64$/i.exec(dataUrl.slice(0, coma));
  const ext = cabecera && EXT_POR_MIME[cabecera[1].toLowerCase()];
  if (!ext) throw new Error('Formato de imagen no permitido (usa JPG, PNG, WEBP o GIF)');

  const nombre = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.promises.writeFile(
    path.join(UPLOADS_DIR, carpeta, nombre),
    Buffer.from(dataUrl.slice(coma + 1), 'base64')
  );
  return `/uploads/${carpeta}/${nombre}`;
};

const borrarArchivosSubidos = (rutas) =>
  rutas.forEach((r) => fs.promises.unlink(path.join(__dirname, r)).catch(() => {}));

const parseJson = (v) => {
  if (v == null) return null;
  if (typeof v !== 'string') return v;
  try { return JSON.parse(v); } catch { return null; }
};

const textoOpcional = (v, max) => {
  const t = String(v ?? '').trim();
  return t ? t.slice(0, max) : null;
};

const mapUsuarioPerfil = (r) => ({
  id: r.usuario_id,
  nombre: r.nombre,
  handle: r.handle,
  email: r.email,
  avatar: r.avatar_url,
  bio: r.bio,
  headerBg: r.header_bg,
  seguidores: Number(r.seguidores) || 0,
  siguiendo: Number(r.siguiendo) || 0,
});

const armarExif = (r) => {
  const exif = {};
  if (r.exif_camara) exif['Cámara'] = r.exif_camara;
  if (r.exif_lente) exif['Lente'] = r.exif_lente;
  if (r.exif_apertura) exif['Apertura'] = r.exif_apertura;
  if (r.exif_velocidad) exif['Velocidad'] = r.exif_velocidad;
  if (r.exif_iso) exif['ISO'] = r.exif_iso;
  if (r.exif_focal) exif['Focal'] = r.exif_focal;
  return Object.keys(exif).length ? exif : undefined;
};

// GET perfil: datos del usuario + sus publicaciones (vista_perfil_usuario)
app.get('/api/perfil/:usuarioId', async (req, res) => {
  const id = Number(req.params.usuarioId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  try {
    const [rows] = await dbp.query(
      'SELECT * FROM vista_perfil_usuario WHERE usuario_id = ? ORDER BY published_at DESC, publicacion_pk DESC',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Todas las imágenes de cada publicación (la vista solo trae la portada)
    const pks = rows.filter((r) => r.publicacion_pk).map((r) => r.publicacion_pk);
    const mediosPorPub = {};
    if (pks.length > 0) {
      const [medios] = await dbp.query(
        'SELECT publicacion_id, url_archivo FROM medios_publicacion WHERE publicacion_id IN (?) ORDER BY publicacion_id, orden',
        [pks]
      );
      medios.forEach((m) => {
        (mediosPorPub[m.publicacion_id] ||= []).push(m.url_archivo);
      });
    }

    const publicaciones = rows
      .filter((r) => r.publicacion_pk)
      .map((r) => {
        const media = mediosPorPub[r.publicacion_pk] || (r.img_url ? [r.img_url] : []);
        return {
          id: String(r.publicacion_id),
          artistId: String(r.usuario_id),
          title: r.titulo,
          description: r.descripcion || undefined,
          type: r.categoria,
          software: r.software || undefined,
          exif: r.categoria === 'Fotografía' ? armarExif(r) : undefined,
          palette: parseJson(r.paleta_colores) || undefined,
          publishedAt: r.published_at
            ? new Date(r.published_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
            : undefined,
          tags: r.etiquetas ? r.etiquetas.split(',') : [],
          imgUrl: media[0] || '',
          media,
          imgH: 400,
          likes: Number(r.total_me_gusta) || 0,
          saves: Number(r.total_guardados) || 0,
        };
      });

    res.json({ usuario: mapUsuarioPerfil(rows[0]), publicaciones });
  } catch (err) {
    console.error('Error al consultar perfil:', err);
    res.status(500).json({ error: 'Error al consultar el perfil' });
  }
});

// PUT perfil: guarda la personalización (nombre, bio, foto y color del encabezado)
app.put('/api/perfil/:usuarioId', async (req, res) => {
  const id = Number(req.params.usuarioId);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de usuario inválido' });
  }

  const nombre = String(req.body.nombre ?? '').trim();
  const bio = String(req.body.bio ?? '').trim();
  const headerBg = String(req.body.headerBg ?? '').trim();
  let avatar = String(req.body.avatar ?? '').trim();

  if (!nombre || nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre es obligatorio (máximo 100 caracteres)' });
  }
  if (bio.length > 1000) {
    return res.status(400).json({ error: 'La descripción no puede superar 1000 caracteres' });
  }
  // Solo colores simples o degradados (se usa como `background` en el encabezado)
  if (!/^(transparent|#[0-9a-f]{3,8}|linear-gradient\([#0-9a-z%.,() -]+\))$/i.test(headerBg) || headerBg.length > 512) {
    return res.status(400).json({ error: 'Color de encabezado inválido' });
  }

  try {
    if (avatar.startsWith('data:')) {
      avatar = await guardarImagenDataUrl(avatar, 'avatares');
    } else {
      // Si llega una URL absoluta de nuestro propio /uploads, se guarda solo la ruta relativa
      const propia = /^https?:\/\/[^/]+(\/uploads\/.+)$/i.exec(avatar);
      if (propia) avatar = propia[1];
      if (avatar.length > 2048) {
        return res.status(400).json({ error: 'La URL de la foto es demasiado larga' });
      }
    }

    await dbp.query(
      'UPDATE usuarios SET nombre = ?, bio = ?, avatar_url = ?, header_bg = ? WHERE id = ?',
      [nombre, bio || null, avatar || null, headerBg, id]
    );

    const [rows] = await dbp.query('SELECT * FROM vista_perfil_usuario WHERE usuario_id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(mapUsuarioPerfil(rows[0]));
  } catch (err) {
    console.error('Error al actualizar perfil:', err);
    const esImagen = /imagen|formato/i.test(err.message || '');
    res.status(esImagen ? 400 : 500).json({ error: esImagen ? err.message : 'Error al guardar el perfil' });
  }
});

// POST publicación: guarda las imágenes en disco y llama al stored procedure
app.post('/api/publicaciones', async (req, res) => {
  const { usuario_id, titulo, descripcion, categoria, software, exif, medios, paleta, etiquetas } = req.body;

  const usuarioId = Number(usuario_id);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ error: 'Usuario inválido' });
  }
  if (!String(titulo ?? '').trim()) {
    return res.status(400).json({ error: 'El título es obligatorio' });
  }
  if (!CATEGORIAS.includes(categoria)) {
    return res.status(400).json({ error: 'Categoría inválida' });
  }
  if (!Array.isArray(medios) || medios.length < 1 || medios.length > 20) {
    return res.status(400).json({ error: 'Debes subir entre 1 y 20 imágenes' });
  }

  const tags = [];
  (Array.isArray(etiquetas) ? etiquetas : []).forEach((t) => {
    const limpio = String(t ?? '').trim().slice(0, 50);
    if (limpio && !tags.some((x) => x.toLowerCase() === limpio.toLowerCase())) tags.push(limpio);
  });
  const colores = (Array.isArray(paleta) ? paleta : [])
    .filter((c) => typeof c === 'string' && c.length <= 30)
    .slice(0, 10);
  const e = categoria === 'Fotografía' && exif ? exif : {};

  const rutas = [];
  try {
    for (const m of medios) {
      rutas.push(await guardarImagenDataUrl(m, 'publicaciones'));
    }

    const [resultSets] = await dbp.query(
      'CALL sp_crear_publicacion(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        usuarioId,
        String(titulo).trim().slice(0, 150),
        textoOpcional(descripcion, 5000),
        categoria,
        textoOpcional(software, 255),
        textoOpcional(e.camara, 150),
        textoOpcional(e.lente, 150),
        textoOpcional(e.apertura, 50),
        textoOpcional(e.velocidad, 50),
        textoOpcional(e.iso, 50),
        textoOpcional(e.focal, 50),
        JSON.stringify(rutas),
        colores.length ? JSON.stringify(colores) : null,
        JSON.stringify(tags),
      ]
    );

    // resultSets[0] = filas del SELECT final del procedure
    const publicacionId = resultSets[0][0].publicacion_id;
    res.status(201).json({ id: String(publicacionId), medios: rutas });
  } catch (err) {
    console.error('Error al crear publicación:', err);
    borrarArchivosSubidos(rutas);

    if (err.sqlState === '45000') {
      return res.status(400).json({ error: err.sqlMessage });
    }
    if (err.errno === 1452) {
      return res.status(400).json({ error: 'El usuario no existe' });
    }
    const esImagen = /imagen|formato/i.test(err.message || '');
    res.status(esImagen ? 400 : 500).json({ error: esImagen ? err.message : 'Error al crear la publicación' });
  }
});

// Iniciar servidor
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});