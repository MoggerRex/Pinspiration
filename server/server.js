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
fs.mkdirSync(path.join(UPLOADS_DIR, 'recursos'), { recursive: true });

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

// Endpoint del Feed: publicaciones publicadas de la vista vista_feed_publicaciones,
// de la más reciente a la más antigua (el orden se aplica aquí, no en la vista:
// MySQL no garantiza el orden interno de una vista al consumirla).
app.get('/api/feed', async (req, res) => {
  try {
    const [rows] = await dbp.query(`
      SELECT * FROM vista_feed_publicaciones
      ORDER BY COALESCE(published_at, created_at) DESC, publicacion_pk DESC
    `);

    res.json(
      rows.map((r) => {
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
          tags: [],
          likes: Number(r.total_me_gusta) || 0,
          saves: Number(r.total_guardados) || 0,
        };
      })
    );
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
    tipoMime: coincidencia[1] || 'application/octet-stream',
    tamano: contenido.length,
  };
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
app.post('/api/registro', async (req, res) => {
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

  try {
    if (avatar.startsWith('data:')) {
      avatar = await guardarImagenDataUrl(avatar, 'avatares');
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
      return res.status(500).json({ error: 'No se pudo crear el usuario' });
    }

    res.status(201).json(mapUsuarioSesion(creado));
  } catch (err) {
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
        resources: recursos.map((x) => ({ name: x.nombre, url: `/api/recursos/${x.id}` })),
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

app.get('/api/recursos/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de recurso inválido' });
  }

  try {
    const [rows] = await dbp.query('SELECT nombre, url_archivo FROM recursos WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0 || !String(rows[0].url_archivo).startsWith('/uploads/recursos/')) {
      return res.status(404).json({ error: 'Recurso no encontrado' });
    }

    const recurso = rows[0];
    const ruta = path.join(UPLOADS_DIR, 'recursos', path.basename(recurso.url_archivo));
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
  const { usuario_id, titulo, descripcion, categoria, software, exif, medios, paleta, etiquetas, recurso } = req.body;

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
  const archivosSubidos = [];
  let publicacionId;
  let recursoGuardado;
  try {
    for (const m of medios) {
      const ruta = await guardarImagenDataUrl(m, 'publicaciones');
      rutas.push(ruta);
      archivosSubidos.push(ruta);
    }

    if (recurso) {
      const archivoRecurso = await guardarRecursoDataUrl(recurso.data, recurso.nombre);
      archivosSubidos.push(archivoRecurso.url);
      recursoGuardado = {
        nombre: textoOpcional(recurso.nombre, 150) || 'Recurso',
        ...archivoRecurso,
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

    res.status(201).json({
      id: String(publicacionId),
      medios: rutas,
      resources: recursoGuardado
        ? [{ name: recursoGuardado.nombre, url: `/api/recursos/${recursoGuardado.id}` }]
        : [],
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
    borrarArchivosSubidos(archivosSubidos);

    if (err.sqlState === '45000') {
      return res.status(400).json({ error: err.sqlMessage });
    }
    if (err.errno === 1452) {
      return res.status(400).json({ error: 'El usuario no existe' });
    }
    const esArchivo = /imagen|archivo|recurso|formato|pesa/i.test(err.message || '');
    res.status(esArchivo ? 400 : 500).json({ error: esArchivo ? err.message : 'Error al crear la publicación' });
  }
});

// Iniciar servidor
const PORT = Number(process.env.PORT) || 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});