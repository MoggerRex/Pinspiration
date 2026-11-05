import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import multer from 'multer';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const UPLOAD_TEMP_DIR = path.join(os.tmpdir(), 'pinspiration-upload-tmp');
fs.mkdirSync(path.join(UPLOADS_DIR, 'avatares'), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_DIR, 'publicaciones'), { recursive: true });
fs.mkdirSync(path.join(UPLOADS_DIR, 'recursos'), { recursive: true });
fs.mkdirSync(UPLOAD_TEMP_DIR, { recursive: true });
fs.promises.readdir(UPLOAD_TEMP_DIR, { withFileTypes: true })
  .then((archivos) => Promise.allSettled(archivos
    .filter((archivo) => archivo.isFile())
    .map(async (archivo) => {
      const ruta = path.join(UPLOAD_TEMP_DIR, archivo.name);
      const estado = await fs.promises.stat(ruta);
      if (Date.now() - estado.mtimeMs > 24 * 60 * 60 * 1000) await fs.promises.unlink(ruta);
    })))
  .then((resultados) => {
    const errores = resultados.filter(
      (resultado) => resultado.status === 'rejected' && resultado.reason?.code !== 'ENOENT'
    );
    if (errores.length) console.error(`No se pudieron limpiar ${errores.length} carga(s) temporal(es) antigua(s)`);
  })
  .catch((err) => console.error('No se pudieron revisar las cargas temporales antiguas:', err));

const app = express();

// Middlewares
app.use(cors());
// Se conserva el límite para compatibilidad con solicitudes JSON existentes.
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
  const query = `
    SELECT
      u.id, u.nombre, u.handle, u.email,
      u.avatar_url AS avatar, u.bio, u.header_bg,
      (SELECT COUNT(*) FROM seguimientos s WHERE s.seguido_id = u.id) AS seguidores,
      (SELECT COUNT(*) FROM seguimientos s WHERE s.seguidor_id = u.id) AS siguiendo,
      (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id AND p.estado = 'publicada') AS publicaciones
    FROM usuarios u
  `;

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al consultar usuarios:', err);
      return res.status(500).json({ error: 'Error al consultar usuarios' });
    }
    res.json(results);
  });
});

// Endpoint para Iniciar Sesión buscando por Correo y Contraseña
app.post('/api/login', (req, res) => {
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');

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

const mapFeedPin = (r) => {
  const fecha = r.published_at || r.created_at;
  return {
    id: String(r.publicacion_id),
    artistId: String(r.artista_id),
    title: r.titulo,
    type: r.categoria,
    imgUrl: r.img_url || '',
    media: r.img_url ? [r.img_url] : [],
    imgH: 400,
    publishedAt: fecha
      ? new Date(fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
      : undefined,
    publishedAtISO: fecha ? new Date(fecha).toISOString() : undefined,
    tags: r.etiquetas ? r.etiquetas.split(',').filter(Boolean) : [],
    likes: Number(r.total_me_gusta) || 0,
    saves: Number(r.total_guardados) || 0,
  };
};

// Endpoint del Feed: publicaciones publicadas de la vista vista_feed_publicaciones,
// de la más reciente a la más antigua (el orden se aplica aquí, no en la vista:
// MySQL no garantiza el orden interno de una vista al consumirla).
app.get('/api/feed', async (req, res) => {
  try {
    const [rows] = await dbp.query(`
      SELECT * FROM vista_feed_publicaciones
      ORDER BY COALESCE(published_at, created_at) DESC, publicacion_pk DESC
    `);

    res.json(rows.map(mapFeedPin));
  } catch (err) {
    console.error('Error al consultar el feed:', err);
    res.status(500).json({ error: 'Error al consultar feed' });
  }
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
        db.query(
          `SELECT COUNT(DISTINCT t.usuario_id) AS total_guardados
           FROM tablero_publicacion tp
           JOIN tableros t ON t.id = tp.tablero_id
           WHERE tp.publicacion_id = ?`,
          [validPubId],
          (errCount, countRows) => {
            if (errCount) {
              console.error('Error al consultar el contador de guardados:', errCount);
              return res.status(500).json({ error: 'El pin se guardó, pero no se pudo actualizar su contador' });
            }
            res.json({
              mensaje: 'Publicación guardada exitosamente',
              savesCount: Number(countRows[0].total_guardados) || 0,
            });
          }
        );
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
const MAX_UPLOAD_IMAGE_BYTES = 15 * 1024 * 1024;
const MAX_UPLOAD_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_UPLOAD_RESOURCE_BYTES = 50 * 1024 * 1024;
const MAX_UPLOAD_MODEL_BYTES = 50 * 1024 * 1024;

const uploadStorage = {
  _handleFile: (req, file, callback) => {
    const nombre = crypto.randomBytes(16).toString('hex');
    const destino = path.join(UPLOAD_TEMP_DIR, nombre);
    const maxBytes = ['recurso', 'modelo3d'].includes(file.fieldname)
      ? MAX_UPLOAD_RESOURCE_BYTES
      : file.fieldname === 'medios' && file.mimetype === 'video/mp4'
        ? MAX_UPLOAD_VIDEO_BYTES
      : MAX_UPLOAD_IMAGE_BYTES;
    const archivo = fs.createWriteStream(destino, { flags: 'wx' });
    let tamano = 0;
    let fallo = false;

    file.stream.on('data', (chunk) => {
      tamano += chunk.length;
      if (tamano > maxBytes && !fallo) {
        fallo = true;
        file.stream.unpipe(archivo);
        file.stream.resume();
        archivo.once('close', () => {
          fs.promises.unlink(destino).catch((err) => {
            if (err.code !== 'ENOENT') console.error('No se pudo limpiar un archivo temporal excedido:', err);
          }).finally(() => callback(new multer.MulterError('LIMIT_FILE_SIZE', file.fieldname)));
        });
        archivo.destroy();
      }
    });
    archivo.on('error', (err) => {
      if (fallo) return;
      fallo = true;
      fs.promises.unlink(destino).catch((cleanupError) => {
        if (cleanupError.code !== 'ENOENT') console.error('No se pudo limpiar un archivo temporal fallido:', cleanupError);
      }).finally(() => callback(err));
    });
    archivo.on('finish', () => {
      if (!fallo) callback(null, { destination: UPLOAD_TEMP_DIR, filename: nombre, path: destino, size: tamano });
    });
    file.stream.pipe(archivo);
  },
  _removeFile: (_req, file, callback) => {
    fs.unlink(file.path, callback);
  },
};
const upload = multer({
  storage: uploadStorage,
  limits: {
    fileSize: MAX_UPLOAD_VIDEO_BYTES,
    files: 22,
    fields: 30,
    fieldSize: 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!['medios', 'avatar', 'recurso', 'modelo3d'].includes(file.fieldname)) {
      return callback(new Error('Campo de archivo no permitido'));
    }
    if (file.fieldname === 'modelo3d') {
      if (path.extname(file.originalname).toLowerCase() !== '.glb') {
        return callback(new Error('Formato de modelo 3D no permitido (usa .glb)'));
      }
      return callback(null, true);
    }
    if (file.fieldname === 'recurso') return callback(null, true);
    if (file.fieldname === 'medios' && file.mimetype === 'video/mp4') {
      if (path.extname(file.originalname).toLowerCase() !== '.mp4') {
        return callback(new Error('Formato de video no permitido (usa MP4)'));
      }
      return callback(null, true);
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)) {
      return callback(new Error('Formato de imagen no permitido (usa JPG, PNG, WEBP o GIF)'));
    }
    callback(null, true);
  },
});

const limpiarTemporalesCarga = (req, res, next) => {
  res.on('finish', () => {
    const archivos = [
      ...(req.file ? [req.file] : []),
      ...Object.values(req.files || {}).flat(),
    ];
    Promise.allSettled(archivos.map((archivo) => fs.promises.unlink(archivo.path)))
      .then((resultados) => {
        const errores = resultados.filter(
          (resultado) => resultado.status === 'rejected' && resultado.reason?.code !== 'ENOENT'
        );
        if (errores.length) console.error(`No se pudieron eliminar ${errores.length} archivo(s) temporal(es) de carga`);
      });
  });
  next();
};

const parseUsuarioId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

app.get('/api/usuarios/:usuarioId/seguidores', async (req, res) => {
  const usuarioId = parseUsuarioId(req.params.usuarioId);
  if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

  try {
    const [rows] = await dbp.query(
      'SELECT * FROM vista_seguidores_usuario WHERE usuario_id = ? ORDER BY nombre',
      [usuarioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al consultar seguidores:', err);
    res.status(500).json({ error: 'Error al consultar seguidores' });
  }
});

app.get('/api/usuarios/:usuarioId/seguidos', async (req, res) => {
  const usuarioId = parseUsuarioId(req.params.usuarioId);
  if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

  try {
    const [rows] = await dbp.query(
      'SELECT * FROM vista_seguidos_usuario WHERE usuario_id = ? ORDER BY nombre',
      [usuarioId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error al consultar artistas seguidos:', err);
    res.status(500).json({ error: 'Error al consultar artistas seguidos' });
  }
});

app.get('/api/seguimientos/:seguidorId/:seguidoId', async (req, res) => {
  const seguidorId = parseUsuarioId(req.params.seguidorId);
  const seguidoId = parseUsuarioId(req.params.seguidoId);
  if (!seguidorId || !seguidoId) return res.status(400).json({ error: 'ID de usuario inválido' });

  try {
    const [[row]] = await dbp.query(
      'SELECT EXISTS(SELECT 1 FROM seguimientos WHERE seguidor_id = ? AND seguido_id = ?) AS siguiendo',
      [seguidorId, seguidoId]
    );
    res.json({ following: Boolean(row.siguiendo) });
  } catch (err) {
    console.error('Error al consultar seguimiento:', err);
    res.status(500).json({ error: 'Error al consultar seguimiento' });
  }
});

app.put('/api/seguimientos/:seguidorId/:seguidoId', async (req, res) => {
  const seguidorId = parseUsuarioId(req.params.seguidorId);
  const seguidoId = parseUsuarioId(req.params.seguidoId);
  const following = req.body.following;
  if (!seguidorId || !seguidoId || typeof following !== 'boolean') {
    return res.status(400).json({ error: 'Usuario o estado de seguimiento inválido' });
  }
  if (seguidorId === seguidoId) {
    return res.status(400).json({ error: 'No puedes seguirte a ti mismo' });
  }

  try {
    const [users] = await dbp.query(
      'SELECT id FROM usuarios WHERE id IN (?, ?)',
      [seguidorId, seguidoId]
    );
    if (users.length !== 2) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (following) {
      await dbp.query(
        'INSERT IGNORE INTO seguimientos (seguidor_id, seguido_id) VALUES (?, ?)',
        [seguidorId, seguidoId]
      );
    } else {
      await dbp.query(
        'DELETE FROM seguimientos WHERE seguidor_id = ? AND seguido_id = ?',
        [seguidorId, seguidoId]
      );
    }

    const [[counts]] = await dbp.query(
      `SELECT
         (SELECT COUNT(*) FROM seguimientos WHERE seguido_id = ?) AS followersCount,
         (SELECT COUNT(*) FROM seguimientos WHERE seguidor_id = ?) AS followingCount`,
      [seguidoId, seguidorId]
    );
    res.json({
      following,
      followersCount: Number(counts.followersCount) || 0,
      followingCount: Number(counts.followingCount) || 0,
    });
  } catch (err) {
    console.error('Error al actualizar seguimiento:', err);
    res.status(500).json({ error: 'Error al actualizar seguimiento' });
  }
});

app.get('/api/intereses/opciones', async (req, res) => {
  try {
    const [rows] = await dbp.query(
      `SELECT e.nombre
       FROM etiquetas e
       JOIN publicacion_etiqueta pe ON pe.etiqueta_id = e.id
       JOIN publicaciones p ON p.id = pe.publicacion_id AND p.estado = 'publicada'
       GROUP BY e.id, e.nombre
       ORDER BY COUNT(DISTINCT p.id) DESC, e.nombre
       LIMIT 30`
    );
    res.json({ categorias: CATEGORIAS, etiquetas: rows.map((row) => row.nombre) });
  } catch (err) {
    console.error('Error al consultar opciones de intereses:', err);
    res.status(500).json({ error: 'Error al consultar opciones de intereses' });
  }
});

app.put('/api/usuarios/:usuarioId/intereses', async (req, res) => {
  const usuarioId = parseUsuarioId(req.params.usuarioId);
  if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

  if (!Array.isArray(req.body.categorias) || !Array.isArray(req.body.etiquetas)) {
    return res.status(400).json({ error: 'Las categorías y etiquetas deben ser listas' });
  }
  const categorias = req.body.categorias;
  const etiquetas = req.body.etiquetas;
  if (categorias.some((value) => !CATEGORIAS.includes(value)) || categorias.length > CATEGORIAS.length) {
    return res.status(400).json({ error: 'Hay una categoría de interés inválida' });
  }
  if (etiquetas.length > 20 || etiquetas.some((value) => typeof value !== 'string' || !value.trim() || value.trim().length > 50)) {
    return res.status(400).json({ error: 'Las etiquetas de interés deben tener entre 1 y 50 caracteres (máximo 20)' });
  }

  const categoriasUnicas = [...new Set(categorias.map((value) => String(value)))];
  const intereses = categoriasUnicas.map((valor) => ({ tipo: 'categoria', valor }));
  const etiquetasUnicas = [...new Map(
    etiquetas.map((value) => [value.trim().toLocaleLowerCase(), value.trim()])
  ).values()];
  intereses.push(...etiquetasUnicas.map((valor) => ({ tipo: 'etiqueta', valor })));

  let connection;
  try {
    const [users] = await dbp.query('SELECT id FROM usuarios WHERE id = ?', [usuarioId]);
    if (users.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

    connection = await dbp.getConnection();
    await connection.beginTransaction();
    await connection.query('DELETE FROM preferencias_usuario WHERE usuario_id = ?', [usuarioId]);
    if (intereses.length > 0) {
      await connection.query(
        'INSERT INTO preferencias_usuario (usuario_id, tipo, valor) VALUES ?',
        [intereses.map(({ tipo, valor }) => [usuarioId, tipo, valor])]
      );
    }
    await connection.commit();
    res.json({ categorias, etiquetas: etiquetasUnicas });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error al guardar intereses:', err);
    const usuarioInexistente = err.errno === 1452;
    res.status(usuarioInexistente ? 404 : 500).json({
      error: usuarioInexistente ? 'Usuario no encontrado' : 'Error al guardar intereses',
    });
  } finally {
    connection?.release();
  }
});

app.get('/api/feed/siguiendo/:usuarioId', async (req, res) => {
  const usuarioId = parseUsuarioId(req.params.usuarioId);
  if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

  try {
    const [rows] = await dbp.query(
      `SELECT f.*
       FROM vista_feed_publicaciones f
       JOIN seguimientos s ON s.seguido_id = f.artista_id
       WHERE s.seguidor_id = ?
       ORDER BY COALESCE(f.published_at, f.created_at) DESC, f.publicacion_pk DESC`,
      [usuarioId]
    );
    res.json(rows.map(mapFeedPin));
  } catch (err) {
    console.error('Error al consultar el feed de seguidos:', err);
    res.status(500).json({ error: 'Error al consultar el feed de seguidos' });
  }
});

app.get('/api/feed/para-ti/:usuarioId', async (req, res) => {
  const usuarioId = parseUsuarioId(req.params.usuarioId);
  if (!usuarioId) return res.status(400).json({ error: 'ID de usuario inválido' });

  try {
    const [rows] = await dbp.query(
        `WITH senales AS (
           SELECT publicacion_id, 3 AS peso FROM me_gusta WHERE usuario_id = ?
           UNION ALL
           SELECT tp.publicacion_id, 4 AS peso
           FROM tablero_publicacion tp
           JOIN tableros t ON t.id = tp.tablero_id
           WHERE t.usuario_id = ?
           UNION ALL
           SELECT publicacion_id, 1 AS peso FROM historial_visualizacion WHERE usuario_id = ?
         ),
         afinidad_categoria AS (
           SELECT p.categoria, SUM(s.peso) AS puntuacion
           FROM senales s
           JOIN publicaciones p ON p.id = s.publicacion_id
           WHERE p.estado = 'publicada'
           GROUP BY p.categoria
         ),
         afinidad_etiqueta AS (
           SELECT e.id AS etiqueta_id, SUM(s.peso) AS puntuacion
           FROM senales s
           JOIN publicaciones p ON p.id = s.publicacion_id
           JOIN publicacion_etiqueta pe ON pe.publicacion_id = p.id
           JOIN etiquetas e ON e.id = pe.etiqueta_id
           WHERE p.estado = 'publicada'
           GROUP BY e.id
         ),
         afinidad_artista AS (
           SELECT p.usuario_id, SUM(s.peso) AS puntuacion
           FROM senales s
           JOIN publicaciones p ON p.id = s.publicacion_id
           WHERE p.estado = 'publicada'
           GROUP BY p.usuario_id
         ),
         preferencias AS (
           SELECT tipo, valor FROM preferencias_usuario WHERE usuario_id = ?
         )
         SELECT f.*,
           (
             COALESCE((SELECT ac.puntuacion FROM afinidad_categoria ac WHERE ac.categoria = f.categoria), 0)
             + COALESCE((
                 SELECT SUM(ae.puntuacion)
                 FROM afinidad_etiqueta ae
                 JOIN publicacion_etiqueta pe ON pe.etiqueta_id = ae.etiqueta_id
                 WHERE pe.publicacion_id = f.publicacion_pk
               ), 0)
             + COALESCE((
                 SELECT SUM(CASE WHEN pr.valor = f.categoria THEN 5 ELSE 0 END)
                 FROM preferencias pr WHERE pr.tipo = 'categoria'
               ), 0)
             + COALESCE((
                 SELECT SUM(3)
                 FROM preferencias pr
                 JOIN etiquetas e ON LOWER(e.nombre) = LOWER(pr.valor)
                 JOIN publicacion_etiqueta pe ON pe.etiqueta_id = e.id
                 WHERE pr.tipo = 'etiqueta' AND pe.publicacion_id = f.publicacion_pk
               ), 0)
             + CASE WHEN EXISTS (
                 SELECT 1 FROM seguimientos s
                 WHERE s.seguidor_id = ? AND s.seguido_id = f.artista_id
               ) THEN 8 ELSE 0 END
             + COALESCE((
                 SELECT aa.puntuacion * 0.5 FROM afinidad_artista aa
                 WHERE aa.usuario_id = f.artista_id
               ), 0)
             + LEAST(5, LOG(1 + f.total_me_gusta + (f.total_guardados * 2)))
             + GREATEST(
                 0,
                 3 - DATEDIFF(CURRENT_DATE, DATE(COALESCE(f.published_at, f.created_at))) / 14
               )
             - CASE WHEN EXISTS (
                 SELECT 1 FROM historial_visualizacion h
                 WHERE h.usuario_id = ? AND h.publicacion_id = f.publicacion_pk
               ) THEN 1 ELSE 0 END
           ) AS puntuacion
         FROM vista_feed_publicaciones f
         ORDER BY puntuacion + (RAND() * 2) DESC, puntuacion DESC`,
        [usuarioId, usuarioId, usuarioId, usuarioId, usuarioId, usuarioId]
      );

    res.json(rows.map(mapFeedPin));
  } catch (err) {
    console.error('Error al consultar el feed Para ti:', err);
    res.status(500).json({ error: 'Error al consultar el feed Para ti' });
  }
});

const resolverPublicacionId = async (id) => {
  const texto = String(id ?? '').trim();
  if (!texto) return null;

  const consulta = /^\d+$/.test(texto)
    ? 'SELECT id FROM publicaciones WHERE id = ? LIMIT 1'
    : 'SELECT id FROM publicaciones WHERE codigo_externo = ? LIMIT 1';
  const [rows] = await dbp.query(consulta, [/^\d+$/.test(texto) ? Number(texto) : texto]);
  return rows[0]?.id ?? null;
};

const cargarContadoresInteraccion = async (publicacionId) => {
  const [rows] = await dbp.query(
    `SELECT total_me_gusta, total_guardados, total_comentarios
     FROM vista_detalle_publicacion WHERE publicacion_id = ? LIMIT 1`,
    [publicacionId]
  );
  return rows[0];
};

const mapComentario = (comentario) => ({
  id: String(comentario.id),
  artistId: String(comentario.usuario_id),
  name: comentario.nombre,
  handle: String(comentario.handle || '').replace(/^@/, ''),
  avatar: comentario.avatar || '',
  text: comentario.contenido,
  date: new Date(comentario.created_at).toLocaleString('es-MX', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }),
});

const guardarImagenProcesada = async (entrada, carpeta, maxDimension) => {
  const nombre = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  const destino = path.join(UPLOADS_DIR, carpeta, nombre);
  try {
    await sharp(entrada, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 5 })
      .toFile(destino);
    const { size } = await fs.promises.stat(destino);
    if (size > MAX_UPLOAD_IMAGE_BYTES) {
      throw new Error('La imagen optimizada supera el límite de 15 MB');
    }
    return `/uploads/${carpeta}/${nombre}`;
  } catch (err) {
    await fs.promises.unlink(destino).catch((cleanupError) => {
      if (cleanupError.code !== 'ENOENT') console.error('No se pudo limpiar una imagen no válida:', cleanupError);
    });
    if (/supera el límite/.test(err.message || '')) throw err;
    throw new Error('La imagen no es válida o no se pudo optimizar');
  }
};

const guardarImagenArchivo = (archivo, carpeta, maxDimension) =>
  guardarImagenProcesada(archivo.path, carpeta, maxDimension);

const obtenerDuracionMp4 = async (ruta) => {
  const buffer = await fs.promises.readFile(ruta);
  if (buffer.indexOf('ftyp', 0, 'ascii') < 0) {
    throw new Error('El archivo no contiene un encabezado MP4 válido.');
  }

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
    throw new Error('El MP4 no contiene una duración válida.');
  }
  if (duracion > 60) {
    throw new Error('Los videos no pueden durar más de 1 minuto.');
  }
  return duracion;
};

const guardarVideoArchivo = async (archivo, carpeta) => {
  await obtenerDuracionMp4(archivo.path);
  const nombre = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.mp4`;
  const destino = path.join(UPLOADS_DIR, carpeta, nombre);
  await fs.promises.copyFile(archivo.path, destino);
  return `/uploads/${carpeta}/${nombre}`;
};

const guardarImagenDataUrl = async (dataUrl, carpeta, maxDimension) => {
  const coincidencia = /^data:image\/(?:jpeg|png|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl || '');
  if (!coincidencia) throw new Error('Formato de imagen no permitido (usa JPG, PNG, WEBP o GIF)');
  const contenido = Buffer.from(coincidencia[1], 'base64');
  if (contenido.length === 0 || contenido.length > MAX_UPLOAD_IMAGE_BYTES) {
    throw new Error('La imagen debe pesar menos de 15 MB');
  }
  return guardarImagenProcesada(contenido, carpeta, maxDimension);
};

const guardarRecursoDataUrl = async (dataUrl, nombreOriginal) => {
  const coincidencia = /^data:([^;,]+)?;base64,([A-Za-z0-9+/]+={0,2})$/.exec(dataUrl || '');
  if (!coincidencia) throw new Error('Archivo de recurso inválido');

  const contenido = Buffer.from(coincidencia[2], 'base64');
  if (contenido.length === 0 || contenido.length > 50 * 1024 * 1024) {
    throw new Error('El recurso debe pesar menos de 50 MB');
  }

  const extensionOriginal = path.extname(String(nombreOriginal || '')).toLowerCase();
  const extension = /^\.[a-z0-9]{1,10}$/.test(extensionOriginal) ? extensionOriginal : '.bin';
  const nombre = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  await fs.promises.writeFile(path.join(UPLOADS_DIR, 'recursos', nombre), contenido);

  return {
    url: `/uploads/recursos/${nombre}`,
    tipoMime: coincidencia[1] === 'model/gltf-binary'
      ? 'application/octet-stream'
      : coincidencia[1] || 'application/octet-stream',
    tamano: contenido.length,
  };
};

const guardarRecursoArchivo = async (archivo, nombreOriginal) => {
  if (archivo.size <= 0 || archivo.size > MAX_UPLOAD_RESOURCE_BYTES) {
    throw new Error('El recurso debe pesar menos de 50 MB');
  }
  const extensionOriginal = path.extname(String(nombreOriginal || archivo.originalname || '')).toLowerCase();
  const extension = /^\.[a-z0-9]{1,10}$/.test(extensionOriginal) ? extensionOriginal : '.bin';
  const nombre = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`;
  const destino = path.join(UPLOADS_DIR, 'recursos', nombre);
  try {
    await fs.promises.copyFile(archivo.path, destino);
  } catch (err) {
    await fs.promises.unlink(destino).catch((cleanupError) => {
      if (cleanupError.code !== 'ENOENT') console.error('No se pudo limpiar un recurso incompleto:', cleanupError);
    });
    throw err;
  }
  return {
    url: `/uploads/recursos/${nombre}`,
    tipoMime: archivo.mimetype === 'model/gltf-binary'
      ? 'application/octet-stream'
      : archivo.mimetype || 'application/octet-stream',
    tamano: archivo.size,
  };
};

const guardarModelo3dArchivo = async (archivo) => {
  if (!archivo || archivo.size <= 0 || archivo.size > MAX_UPLOAD_MODEL_BYTES) {
    throw new Error('El modelo 3D debe pesar hasta 50 MB');
  }

  const cabecera = Buffer.alloc(20);
  const archivoTemporal = await fs.promises.open(archivo.path, 'r');
  try {
    const { bytesRead } = await archivoTemporal.read(cabecera, 0, cabecera.length, 0);
    const longitudJson = bytesRead === cabecera.length ? cabecera.readUInt32LE(12) : 0;
    if (
      bytesRead !== cabecera.length
      || cabecera.toString('ascii', 0, 4) !== 'glTF'
      || cabecera.readUInt32LE(4) !== 2
      || cabecera.readUInt32LE(8) !== archivo.size
      || cabecera.readUInt32LE(16) !== 0x4e4f534a
      || longitudJson < 2
      || 20 + longitudJson > archivo.size
    ) {
      throw new Error('Formato de modelo 3D inválido: el archivo no es un GLB 2.0 válido');
    }

    const jsonChunk = Buffer.alloc(longitudJson);
    const lecturaJson = await archivoTemporal.read(jsonChunk, 0, longitudJson, 20);
    if (lecturaJson.bytesRead !== longitudJson) {
      throw new Error('Formato de modelo 3D inválido: el archivo GLB está incompleto');
    }

    let gltf;
    try {
      gltf = JSON.parse(jsonChunk.toString('utf8').trimEnd());
    } catch {
      throw new Error('Formato de modelo 3D inválido: el contenido GLB está dañado');
    }
    if (gltf?.asset?.version !== '2.0') {
      throw new Error('Formato de modelo 3D inválido: se requiere glTF 2.0');
    }
    const pendientes = [gltf];
    while (pendientes.length > 0) {
      const valor = pendientes.pop();
      if (!valor || typeof valor !== 'object') continue;
      for (const [clave, contenido] of Object.entries(valor)) {
        if (clave === 'uri' && typeof contenido === 'string' && !/^data:/i.test(contenido)) {
          throw new Error('Formato de modelo 3D inválido: el GLB debe incluir sus recursos');
        }
        if (contenido && typeof contenido === 'object') pendientes.push(contenido);
      }
    }
  } finally {
    await archivoTemporal.close();
  }

  const guardado = await guardarRecursoArchivo(archivo, archivo.originalname);
  return { ...guardado, tipoMime: 'model/gltf-binary' };
};

const borrarArchivosSubidos = async (rutas) => {
  const resultados = await Promise.allSettled(rutas.map((url) => {
    const ruta = rutaArchivoPublicacion(url) || rutaArchivoAvatar(url);
    return ruta ? fs.promises.unlink(ruta) : Promise.resolve();
  }));
  const errores = resultados.filter(
    (resultado) => resultado.status === 'rejected' && resultado.reason?.code !== 'ENOENT'
  );
  if (errores.length) {
    console.error(`No se pudieron eliminar ${errores.length} archivo(s) subido(s)`);
  }
};

const rutaArchivoPublicacion = (url) => {
  const coincidencia = /^\/uploads\/(publicaciones|recursos)\/([^/\\]+)$/.exec(String(url || ''));
  if (!coincidencia || coincidencia[2] === '.' || coincidencia[2] === '..') return null;
  return path.join(UPLOADS_DIR, coincidencia[1], coincidencia[2]);
};

const rutaArchivoAvatar = (url) => {
  const texto = String(url || '');
  const ruta = /^https?:\/\/[^/]+(\/uploads\/avatares\/[^/\\]+)$/i.exec(texto)?.[1] ||
    (/^\/uploads\/avatares\/[^/\\]+$/.test(texto) ? texto : null);
  return ruta ? path.join(UPLOADS_DIR, 'avatares', path.basename(ruta)) : null;
};

const borrarAvatarSiNoReferenciado = async (url) => {
  const ruta = rutaArchivoAvatar(url);
  if (!ruta) return;
  const rutaRelativa = `/uploads/avatares/${path.basename(ruta)}`;
  const [[{ cantidad }]] = await dbp.query(
    'SELECT COUNT(*) AS cantidad FROM usuarios WHERE avatar_url = ? OR avatar_url = ?',
    [rutaRelativa, String(url || '')]
  );
  if (Number(cantidad) === 0) {
    await fs.promises.unlink(ruta).catch((err) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }
};

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

// Datos de sesión: mismo formato que devuelve /api/login
const mapUsuarioSesion = (r) => ({
  id: r.id,
  nombre: r.nombre,
  handle: r.handle,
  email: r.email,
  avatar: r.avatar_url,
  bio: r.bio,
  header_bg: r.header_bg,
  headerBg: r.header_bg,
});

// POST registro: crea la cuenta con el stored procedure sp_registrar_usuario
app.post('/api/registro', upload.single('avatar'), limpiarTemporalesCarga, async (req, res) => {
  const nombre = String(req.body.nombre ?? '').trim();
  const handle = String(req.body.handle ?? '').trim();
  const email = String(req.body.email ?? '').trim().toLowerCase();
  const password = String(req.body.password ?? '');
  let avatar = String(req.body.avatar ?? '').trim();

  if (!nombre || !handle || !email || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }
  if (nombre.length > 100) {
    return res.status(400).json({ error: 'El nombre no puede superar 100 caracteres' });
  }
  if (!/^@?[A-Za-z0-9._]+$/.test(handle)) {
    return res.status(400).json({ error: 'El handle solo admite letras, números, puntos y guiones bajos' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(400).json({ error: 'El correo electrónico no es válido' });
  }
  if (password.length < 3 || password.length > 255) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 3 caracteres' });
  }

  let avatarNuevo;
  try {
    if (req.file) {
      avatar = await guardarImagenArchivo(req.file, 'avatares', 512);
      avatarNuevo = avatar;
    } else if (avatar.startsWith('data:')) {
      avatar = await guardarImagenDataUrl(avatar, 'avatares', 512);
      avatarNuevo = avatar;
    } else if (avatar) {
      const propia = /^https?:\/\/[^/]+(\/uploads\/.+)$/i.exec(avatar);
      if (propia) avatar = propia[1];
      if (!/^(https?:\/\/|\/uploads\/)/i.test(avatar)) {
        return res.status(400).json({ error: 'La URL de la foto no es válida' });
      }
      if (avatar.length > 2048) {
        return res.status(400).json({ error: 'La URL de la foto es demasiado larga' });
      }
    }

    const [resultSets] = await dbp.query('CALL sp_registrar_usuario(?, ?, ?, ?, ?, ?, ?)', [
      nombre,
      handle,
      email,
      password,
      avatar || null,
      textoOpcional(req.body.bio, 1000),
      textoOpcional(req.body.headerBg, 512),
    ]);

    // resultSets[0] = fila del SELECT final del procedure
    const creado = resultSets[0] && resultSets[0][0];
    if (!creado) {
      if (avatarNuevo) await borrarArchivosSubidos([avatarNuevo]);
      return res.status(500).json({ error: 'No se pudo crear el usuario' });
    }

    res.status(201).json(mapUsuarioSesion(creado));
  } catch (err) {
    if (avatarNuevo) await borrarArchivosSubidos([avatarNuevo]);
    // Errores de validación lanzados con SIGNAL SQLSTATE '45000' en el procedure
    if (err.sqlState === '45000') {
      return res.status(400).json({ error: err.sqlMessage });
    }
    if (err.errno === 1062) {
      return res.status(409).json({ error: 'Ese correo o handle ya está registrado' });
    }

    console.error('Error al registrar usuario:', err);
    const esImagen = /imagen|formato/i.test(err.message || '');
    res.status(esImagen ? 400 : 500).json({
      error: esImagen ? err.message : 'Error al registrar el usuario',
    });
  }
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

app.get('/api/publicaciones/:id/interacciones', async (req, res) => {
  const usuarioId = Number(req.query.usuario_id);
  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return res.status(400).json({ error: 'Usuario inválido' });
  }

  try {
    const publicacionId = await resolverPublicacionId(req.params.id);
    if (!publicacionId) return res.status(404).json({ error: 'Publicación no encontrada' });

    const contadores = await cargarContadoresInteraccion(publicacionId);
    if (!contadores) return res.status(404).json({ error: 'Publicación no encontrada' });

    const [[likeRows], [saveRows], [comentarios]] = await Promise.all([
      dbp.query(
        'SELECT EXISTS(SELECT 1 FROM me_gusta WHERE usuario_id = ? AND publicacion_id = ?) AS activo',
        [usuarioId, publicacionId]
      ),
      dbp.query(
        `SELECT EXISTS(
           SELECT 1 FROM tablero_publicacion tp
           JOIN tableros t ON t.id = tp.tablero_id
           WHERE t.usuario_id = ? AND tp.publicacion_id = ?
         ) AS activo`,
        [usuarioId, publicacionId]
      ),
      dbp.query(
        `SELECT c.id, c.usuario_id, c.contenido, c.created_at,
                u.nombre, u.handle, u.avatar_url AS avatar
         FROM comentarios c
         JOIN usuarios u ON u.id = c.usuario_id
         WHERE c.publicacion_id = ?
         ORDER BY c.created_at DESC, c.id DESC
         LIMIT 100`,
        [publicacionId]
      ),
    ]);

    res.json({
      liked: Boolean(likeRows[0].activo),
      saved: Boolean(saveRows[0].activo),
      likesCount: Number(contadores.total_me_gusta) || 0,
      savesCount: Number(contadores.total_guardados) || 0,
      commentsCount: Number(contadores.total_comentarios) || 0,
      comments: comentarios.map(mapComentario),
    });
  } catch (err) {
    console.error('Error al consultar interacciones de la publicación:', err);
    res.status(500).json({ error: 'Error al consultar las interacciones' });
  }
});

app.put('/api/publicaciones/:id/like', async (req, res) => {
  const usuarioId = Number(req.body.usuario_id);
  const liked = req.body.liked;
  if (!Number.isInteger(usuarioId) || usuarioId <= 0 || typeof liked !== 'boolean') {
    return res.status(400).json({ error: 'Usuario o estado de me gusta inválido' });
  }

  try {
    const publicacionId = await resolverPublicacionId(req.params.id);
    if (!publicacionId) return res.status(404).json({ error: 'Publicación no encontrada' });
    if (!(await cargarContadoresInteraccion(publicacionId))) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    if (liked) {
      await dbp.query(
        'INSERT IGNORE INTO me_gusta (usuario_id, publicacion_id) VALUES (?, ?)',
        [usuarioId, publicacionId]
      );
    } else {
      await dbp.query(
        'DELETE FROM me_gusta WHERE usuario_id = ? AND publicacion_id = ?',
        [usuarioId, publicacionId]
      );
    }

    const contadores = await cargarContadoresInteraccion(publicacionId);
    res.json({ liked, likesCount: Number(contadores.total_me_gusta) || 0 });
  } catch (err) {
    console.error('Error al actualizar me gusta:', err);
    const usuarioInexistente = err.errno === 1452;
    res.status(usuarioInexistente ? 400 : 500).json({
      error: usuarioInexistente ? 'El usuario no existe' : 'Error al actualizar me gusta',
    });
  }
});

app.put('/api/publicaciones/:id/guardar', async (req, res) => {
  const usuarioId = Number(req.body.usuario_id);
  const saved = req.body.saved;
  if (!Number.isInteger(usuarioId) || usuarioId <= 0 || typeof saved !== 'boolean') {
    return res.status(400).json({ error: 'Usuario o estado de guardado inválido' });
  }

  let connection;
  let tableroId = null;
  try {
    const publicacionId = await resolverPublicacionId(req.params.id);
    if (!publicacionId) return res.status(404).json({ error: 'Publicación no encontrada' });
    if (!(await cargarContadoresInteraccion(publicacionId))) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    connection = await dbp.getConnection();
    await connection.beginTransaction();
    if (saved) {
      const [tablero] = await connection.query(
        `INSERT INTO tableros (usuario_id, nombre) VALUES (?, 'Guardados')
         ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
        [usuarioId]
      );
      tableroId = tablero.insertId;
      await connection.query(
        'INSERT IGNORE INTO tablero_publicacion (tablero_id, publicacion_id) VALUES (?, ?)',
        [tablero.insertId, publicacionId]
      );
    } else {
      await connection.query(
        `DELETE tp FROM tablero_publicacion tp
         JOIN tableros t ON t.id = tp.tablero_id
         WHERE t.usuario_id = ? AND tp.publicacion_id = ?`,
        [usuarioId, publicacionId]
      );
    }
    await connection.commit();

    const contadores = await cargarContadoresInteraccion(publicacionId);
    res.json({ saved, savesCount: Number(contadores.total_guardados) || 0, boardId: tableroId });
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error al actualizar guardado:', err);
    const usuarioInexistente = err.errno === 1452;
    res.status(usuarioInexistente ? 400 : 500).json({
      error: usuarioInexistente ? 'El usuario no existe' : 'Error al actualizar el guardado',
    });
  } finally {
    connection?.release();
  }
});

app.post('/api/publicaciones/:id/comentarios', async (req, res) => {
  const usuarioId = Number(req.body.usuario_id);
  const contenido = String(req.body.contenido ?? '').trim();
  if (!Number.isInteger(usuarioId) || usuarioId <= 0 || !contenido || contenido.length > 2000) {
    return res.status(400).json({ error: 'El comentario debe tener entre 1 y 2000 caracteres y un usuario válido' });
  }

  try {
    const publicacionId = await resolverPublicacionId(req.params.id);
    if (!publicacionId) return res.status(404).json({ error: 'Publicación no encontrada' });
    if (!(await cargarContadoresInteraccion(publicacionId))) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const [insertado] = await dbp.query(
      'INSERT INTO comentarios (publicacion_id, usuario_id, contenido) VALUES (?, ?, ?)',
      [publicacionId, usuarioId, contenido]
    );
    const [rows] = await dbp.query(
      `SELECT c.id, c.usuario_id, c.contenido, c.created_at,
              u.nombre, u.handle, u.avatar_url AS avatar
       FROM comentarios c
       JOIN usuarios u ON u.id = c.usuario_id
       WHERE c.id = ?`,
      [insertado.insertId]
    );
    const contadores = await cargarContadoresInteraccion(publicacionId);
    res.status(201).json({
      comment: mapComentario(rows[0]),
      commentsCount: Number(contadores.total_comentarios) || 0,
    });
  } catch (err) {
    console.error('Error al crear comentario:', err);
    const usuarioInexistente = err.errno === 1452;
    res.status(usuarioInexistente ? 400 : 500).json({
      error: usuarioInexistente ? 'El usuario no existe' : 'Error al crear el comentario',
    });
  }
});

// GET detalle: datos de la publicación desde la vista vista_detalle_publicacion.
// Acepta el id numérico o el código externo de la semilla (por ejemplo "p4").
// Devuelve también los contadores del autor (seguidores, siguiendo y publicaciones).
app.get('/api/publicaciones/:id', async (req, res) => {
  const idParam = String(req.params.id ?? '').trim();
  if (!idParam) {
    return res.status(400).json({ error: 'ID de publicación inválido' });
  }

  try {
    let rows;
    if (/^\d+$/.test(idParam)) {
      [rows] = await dbp.query(
        'SELECT * FROM vista_detalle_publicacion WHERE publicacion_id = ?',
        [Number(idParam)]
      );
    } else {
      [rows] = await dbp.query(
        `SELECT * FROM vista_detalle_publicacion
         WHERE publicacion_id = (SELECT id FROM publicaciones WHERE codigo_externo = ?)`,
        [idParam]
      );
    }

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const r = rows[0];

    // Colecciones hijas: la vista solo trae la portada
    const [medios] = await dbp.query(
      'SELECT url_archivo, tipo_mime, orden, paleta_colores FROM medios_publicacion WHERE publicacion_id = ? ORDER BY orden',
      [r.publicacion_id]
    );
    const [etiquetas] = await dbp.query(
      `SELECT e.nombre
       FROM etiquetas e
       JOIN publicacion_etiqueta pe ON pe.etiqueta_id = e.id
       WHERE pe.publicacion_id = ?
       ORDER BY e.nombre`,
      [r.publicacion_id]
    );
    const [recursos] = await dbp.query(
      'SELECT id, nombre, url_archivo, tipo_mime, tamano_bytes FROM recursos WHERE publicacion_id = ? ORDER BY id',
      [r.publicacion_id]
    );

    const media = medios.map((m) => m.url_archivo);

    const modelo3d = recursos.find((recurso) => recurso.tipo_mime === 'model/gltf-binary');
    res.json({
      publicacion: {
        id: String(r.publicacion_id),
        artistId: String(r.artista_id),
        title: r.titulo,
        description: r.descripcion || undefined,
        type: r.categoria,
        software: r.software || undefined,
        exif: armarExif(r),
        palette: parseJson(r.paleta_portada) || undefined,
        media,
        imgUrl: media[0] || r.portada_url || '',
        tags: etiquetas.map((e) => e.nombre),
        resources: recursos
          .filter((recurso) => recurso.tipo_mime !== 'model/gltf-binary')
          .map((x) => ({
            name: x.nombre,
            url: `/api/recursos/${x.id}`,
            extension: path.extname(x.url_archivo).toLowerCase(),
            tipoMime: x.tipo_mime,
          })),
        model3d: modelo3d
          ? { name: modelo3d.nombre, url: `/api/recursos/${modelo3d.id}?preview=1` }
          : undefined,
        publishedAt: r.published_at
          ? new Date(r.published_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
          : undefined,
        likes: Number(r.total_me_gusta) || 0,
        saves: Number(r.total_guardados) || 0,
        comments: Number(r.total_comentarios) || 0,
      },
      artista: {
        id: r.artista_id,
        nombre: r.artista_nombre,
        handle: r.artista_handle,
        avatar: r.artista_avatar,
        bio: r.artista_bio,
        seguidores: Number(r.artista_seguidores) || 0,
        siguiendo: Number(r.artista_siguiendo) || 0,
        publicaciones: Number(r.artista_publicaciones) || 0,
      },
    });
  } catch (err) {
    console.error('Error al consultar el detalle de la publicación:', err);
    res.status(500).json({ error: 'Error al consultar la publicación' });
  }
});

app.delete('/api/publicaciones/:id', async (req, res) => {
  const idParam = String(req.params.id ?? '').trim();
  const usuarioId = parseUsuarioId(req.body?.usuario_id);
  if (!idParam || !usuarioId) {
    return res.status(400).json({ error: 'ID de publicación o usuario inválido' });
  }

  try {
    const consultaId = /^\d+$/.test(idParam)
      ? ['SELECT id FROM publicaciones WHERE id = ?', idParam]
      : ['SELECT id FROM publicaciones WHERE codigo_externo = ?', idParam];
    const [[publicacion]] = await dbp.query(consultaId[0], [consultaId[1]]);
    if (!publicacion) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const [medios] = await dbp.query(
      'SELECT url_archivo FROM medios_publicacion WHERE publicacion_id = ?',
      [publicacion.id]
    );
    const [recursos] = await dbp.query(
      'SELECT url_archivo FROM recursos WHERE publicacion_id = ?',
      [publicacion.id]
    );

    await dbp.query('CALL sp_eliminar_publicacion(?, ?)', [publicacion.id, usuarioId]);

    const rutas = [...medios, ...recursos]
      .map((archivo) => rutaArchivoPublicacion(archivo.url_archivo))
      .filter(Boolean);
    const resultados = await Promise.allSettled(rutas.map((ruta) => fs.promises.unlink(ruta)));
    const erroresLimpieza = resultados.filter(
      (resultado) => resultado.status === 'rejected' && resultado.reason?.code !== 'ENOENT'
    );
    if (erroresLimpieza.length > 0) {
      console.error(`No se pudieron eliminar ${erroresLimpieza.length} archivo(s) de la publicación ${publicacion.id}`);
    }

    res.json({
      message: 'Publicación eliminada',
      archivosPendientes: erroresLimpieza.length,
    });
  } catch (err) {
    const mensaje = String(err.sqlMessage || err.message || '');
    if (mensaje.includes('PUBLICACION_NO_AUTORIZADA')) {
      return res.status(403).json({ error: 'Solo el autor puede eliminar esta publicación' });
    }
    if (mensaje.includes('PUBLICACION_NO_ENCONTRADA')) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    console.error('Error al eliminar publicación:', err);
    res.status(500).json({ error: 'Error al eliminar la publicación' });
  }
});

app.get('/api/recursos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de recurso inválido' });
  }

  try {
    const [rows] = await dbp.query(
      'SELECT nombre, url_archivo, tipo_mime FROM recursos WHERE id = ? LIMIT 1',
      [id]
    );
    if (rows.length === 0 || !String(rows[0].url_archivo).startsWith('/uploads/recursos/')) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    const recurso = rows[0];
    const ruta = path.join(UPLOADS_DIR, 'recursos', path.basename(recurso.url_archivo));
    if (req.query.preview === '1') {
      if (recurso.tipo_mime !== 'model/gltf-binary') {
        return res.status(400).json({ error: 'El recurso no es un modelo 3D compatible' });
      }
      res.setHeader('Content-Type', 'model/gltf-binary');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return res.sendFile(ruta, (err) => {
        if (err) {
          console.error('Error al mostrar el modelo 3D:', err);
          if (!res.headersSent) res.status(500).json({ error: 'Error al mostrar el modelo 3D' });
        }
      });
    }
    res.download(ruta, recurso.nombre, (err) => {
      if (err) {
        console.error('Error al descargar recurso:', err);
        if (!res.headersSent) res.status(500).json({ error: 'Error al descargar el recurso' });
      }
    });
  } catch (err) {
    console.error('Error al consultar el recurso:', err);
    res.status(500).json({ error: 'Error al consultar el recurso' });
  }
});

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
app.put('/api/perfil/:usuarioId', upload.single('avatar'), limpiarTemporalesCarga, async (req, res) => {
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

  let avatarNuevo;
  let avatarPersistido = false;
  try {
    const [[usuarioAnterior]] = await dbp.query(
      'SELECT avatar_url FROM usuarios WHERE id = ?',
      [id]
    );
    if (!usuarioAnterior) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (req.file) {
      avatar = await guardarImagenArchivo(req.file, 'avatares', 512);
      avatarNuevo = avatar;
    } else if (avatar.startsWith('data:')) {
      avatar = await guardarImagenDataUrl(avatar, 'avatares', 512);
      avatarNuevo = avatar;
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
    avatarPersistido = true;

    try {
      await borrarAvatarSiNoReferenciado(usuarioAnterior.avatar_url);
    } catch (cleanupError) {
      console.error('No se pudo limpiar el avatar anterior:', cleanupError);
    }

    const [rows] = await dbp.query('SELECT * FROM vista_perfil_usuario WHERE usuario_id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json(mapUsuarioPerfil(rows[0]));
  } catch (err) {
    if (avatarNuevo && !avatarPersistido) await borrarArchivosSubidos([avatarNuevo]);
    console.error('Error al actualizar perfil:', err);
    const esImagen = /imagen|formato/i.test(err.message || '');
    res.status(esImagen ? 400 : 500).json({ error: esImagen ? err.message : 'Error al guardar el perfil' });
  }
});

// POST publicación: guarda imágenes y videos en disco y llama al stored procedure
app.post('/api/publicaciones', upload.fields([
  { name: 'medios', maxCount: 20 },
  { name: 'recurso', maxCount: 1 },
  { name: 'modelo3d', maxCount: 1 },
]), limpiarTemporalesCarga, async (req, res) => {
  const { usuario_id, titulo, descripcion, categoria, software } = req.body;
  const exif = parseJson(req.body.exif);
  const paleta = parseJson(req.body.paleta);
  const etiquetas = parseJson(req.body.etiquetas);
  const recurso = parseJson(req.body.recurso);
  const medios = parseJson(req.body.medios) || req.body.medios;
  const archivosMedios = req.files?.medios || [];
  const archivoRecurso = req.files?.recurso?.[0];
  const archivoModelo3d = req.files?.modelo3d?.[0];

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
  if (archivoModelo3d && categoria !== '3D') {
    return res.status(400).json({ error: 'Solo las publicaciones 3D pueden incluir un modelo GLB' });
  }
  const cantidadMedios = archivosMedios.length || (Array.isArray(medios) ? medios.length : 0);
  if (cantidadMedios < 1 || cantidadMedios > 20) {
    return res.status(400).json({ error: 'Debes subir entre 1 y 20 imágenes o videos' });
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
  const archivosSubidos = [];
  let publicacionId;
  let recursoGuardado;
  let modelo3dGuardado;
  try {
    const archivos = archivosMedios.length ? archivosMedios : medios;
    for (const archivo of archivos) {
      const ruta = archivo.path
        ? archivo.mimetype === 'video/mp4'
          ? await guardarVideoArchivo(archivo, 'publicaciones')
          : await guardarImagenArchivo(archivo, 'publicaciones', 2560)
        : await guardarImagenDataUrl(archivo, 'publicaciones', 2560);
      rutas.push(ruta);
      archivosSubidos.push(ruta);
    }

    if (archivoRecurso || recurso) {
      const recursoGuardadoInfo = archivoRecurso
        ? await guardarRecursoArchivo(archivoRecurso, archivoRecurso.originalname)
        : await guardarRecursoDataUrl(recurso.data, recurso.nombre);
      archivosSubidos.push(recursoGuardadoInfo.url);
      recursoGuardado = {
        nombre: textoOpcional(req.body.recurso_nombre || recurso?.nombre, 150) || 'Recurso',
        ...recursoGuardadoInfo,
      };
    }
    if (archivoModelo3d) {
      const modelo3dGuardadoInfo = await guardarModelo3dArchivo(archivoModelo3d);
      archivosSubidos.push(modelo3dGuardadoInfo.url);
      modelo3dGuardado = {
        nombre: textoOpcional(archivoModelo3d.originalname, 150) || 'Modelo 3D.glb',
        ...modelo3dGuardadoInfo,
      };
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
    publicacionId = resultSets[0][0].publicacion_id;
    if (recursoGuardado) {
      const [insercionRecurso] = await dbp.query(
        'INSERT INTO recursos (publicacion_id, nombre, url_archivo, tipo_mime, tamano_bytes) VALUES (?, ?, ?, ?, ?)',
        [
          publicacionId,
          recursoGuardado.nombre,
          recursoGuardado.url,
          recursoGuardado.tipoMime,
          recursoGuardado.tamano,
        ]
      );
      recursoGuardado.id = insercionRecurso.insertId;
    }
    if (modelo3dGuardado) {
      const [insercionModelo] = await dbp.query(
        'INSERT INTO recursos (publicacion_id, nombre, url_archivo, tipo_mime, tamano_bytes) VALUES (?, ?, ?, ?, ?)',
        [
          publicacionId,
          modelo3dGuardado.nombre,
          modelo3dGuardado.url,
          modelo3dGuardado.tipoMime,
          modelo3dGuardado.tamano,
        ]
      );
      modelo3dGuardado.id = insercionModelo.insertId;
    }

    res.status(201).json({
      id: String(publicacionId),
      medios: rutas,
      resources: recursoGuardado
        ? [{
            name: recursoGuardado.nombre,
            url: `/api/recursos/${recursoGuardado.id}`,
            extension: path.extname(recursoGuardado.url).toLowerCase(),
            tipoMime: recursoGuardado.tipoMime,
          }]
        : [],
      model3d: modelo3dGuardado
        ? { name: modelo3dGuardado.nombre, url: `/api/recursos/${modelo3dGuardado.id}?preview=1` }
        : undefined,
    });
  } catch (err) {
    console.error('Error al crear publicación:', err);
    if (publicacionId) {
      try {
        await dbp.query('DELETE FROM publicaciones WHERE id = ?', [publicacionId]);
      } catch (cleanupError) {
        console.error('Error al revertir la publicación incompleta:', cleanupError);
      }
    }
    await borrarArchivosSubidos(archivosSubidos);

    if (err.sqlState === '45000') {
      return res.status(400).json({ error: err.sqlMessage });
    }
    if (err.errno === 1452) {
      return res.status(400).json({ error: 'El usuario no existe' });
    }
    const esArchivo = /imagen|video|archivo|recurso|formato|pesa|mp4/i.test(err.message || '');
    res.status(esArchivo ? 400 : 500).json({ error: esArchivo ? err.message : 'Error al crear la publicación' });
  }
});

app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof multer.MulterError) {
    const error = err.code === 'LIMIT_FILE_SIZE'
      ? 'El archivo supera el límite permitido (15 MB para imágenes, 100 MB para videos y 50 MB para recursos)'
      : 'La carga excede los límites permitidos';
    return res.status(400).json({ error });
  }
  if (/^Formato de imagen|^Formato de video|^Formato de modelo|^Formato de recurso|^Campo de archivo/.test(err.message || '')) {
    return res.status(400).json({ error: err.message });
  }
  console.error('Error al procesar la carga:', err);
  res.status(500).json({ error: 'Error al procesar la carga de archivos' });
});

// Iniciar servidor
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});