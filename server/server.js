import express from 'express';
import mysql from 'mysql2';
import cors from 'cors';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Configuración de la conexión a MySQL Workbench
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root', // <-- Cambia por tu contraseña de MySQL si es distinta
  database: 'pinspiration',
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

// ==========================================
// FUNCIÓN AUXILIAR: Asegurar que el Pin exista en MySQL
// ==========================================
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

// ==========================================
// RUTAS DE TABLEROS Y PINES GUARDADOS
// ==========================================

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

// ==========================================
// RUTAS DE HISTORIAL
// ==========================================

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

// Iniciar servidor
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});