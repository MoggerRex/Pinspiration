-- Pinspiration: esquema inicial para MySQL 8.0.16+
-- Ejecutar en una base nueva. La API de Express debe validar limites de
-- cantidad de imagenes, permisos y transiciones de moderacion.

CREATE DATABASE IF NOT EXISTS pinspiration
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE pinspiration;

CREATE TABLE usuarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  handle VARCHAR(50) NOT NULL,
  email VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(2048) NULL,
  bio TEXT NULL,
  header_bg VARCHAR(512) NOT NULL DEFAULT 'linear-gradient(0deg, #13191d 5%, #00385a 100%)',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_handle (handle),
  UNIQUE KEY uq_usuarios_email (email)
) ENGINE=InnoDB;

-- ==========================================
-- INSERTAR LOS 5 USUARIOS (Contraseña: 123)
-- ==========================================

INSERT INTO usuarios (nombre, handle, email, password_hash, avatar_url, bio) VALUES
('Leo Olivares', '@leo.olivares', 'leo@pinspiration.com', '123', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200', 'Desarrollador Full-Stack y creador de Pinspiration.'),
('Abyssmo', '@abyssmo', 'abyssmo@pinspiration.com', '123', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', 'Amante del diseño 3D, las sombras y la fantasía oscura.'),
('Wawa', '@wawa', 'wawa@pinspiration.com', '123', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', 'Entusiasta de los motores gráficos y la animación digital.'),
('Chuya', '@chuya', 'chuya@pinspiration.com', '123', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', 'Fotógrafa profesional y exploradora visual.'),
('Arely', '@arely', 'arely@pinspiration.com', '123', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200', 'Diseñadora UI/UX apasionada por el arte minimalista.');

-- En una base ya creada, aplicar una sola vez:
-- ALTER TABLE publicaciones ADD COLUMN codigo_externo VARCHAR(100) NULL,
--   ADD UNIQUE KEY uq_publicaciones_codigo_externo (codigo_externo);
CREATE TABLE publicaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo_externo VARCHAR(100) NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  titulo VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  categoria ENUM('2D', '3D', 'Fotografía', 'Edición') NOT NULL,
  software VARCHAR(255) NULL,
  exif_camara VARCHAR(150) NULL,
  exif_lente VARCHAR(150) NULL,
  exif_apertura VARCHAR(50) NULL,
  exif_velocidad VARCHAR(50) NULL,
  exif_iso VARCHAR(50) NULL,
  exif_focal VARCHAR(50) NULL,
  estado ENUM('borrador', 'pendiente', 'publicada', 'rechazada') NOT NULL DEFAULT 'pendiente',
  moderacion_razon VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  published_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_publicaciones_codigo_externo (codigo_externo),
  KEY idx_publicaciones_feed (estado, published_at, id),
  KEY idx_publicaciones_categoria (estado, categoria, published_at, id),
  KEY idx_publicaciones_artista (usuario_id, estado, published_at, id),
  CONSTRAINT fk_publicaciones_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE medios_publicacion (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  publicacion_id BIGINT UNSIGNED NOT NULL,
  url_archivo VARCHAR(2048) NOT NULL,
  tipo_mime VARCHAR(100) NULL,
  orden SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  paleta_colores JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_medios_publicacion_orden (publicacion_id, orden),
  CONSTRAINT chk_medios_orden CHECK (orden >= 0),
  CONSTRAINT fk_medios_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE etiquetas (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_etiquetas_nombre (nombre)
) ENGINE=InnoDB;

CREATE TABLE publicacion_etiqueta (
  publicacion_id BIGINT UNSIGNED NOT NULL,
  etiqueta_id BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (publicacion_id, etiqueta_id),
  KEY idx_publicacion_etiqueta_etiqueta (etiqueta_id, publicacion_id),
  CONSTRAINT fk_publicacion_etiqueta_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE,
  CONSTRAINT fk_publicacion_etiqueta_etiqueta
    FOREIGN KEY (etiqueta_id) REFERENCES etiquetas (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tableros (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_tableros_usuario_nombre (usuario_id, nombre),
  KEY idx_tableros_usuario (usuario_id, created_at, id),
  CONSTRAINT fk_tableros_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE tablero_publicacion (
  tablero_id BIGINT UNSIGNED NOT NULL,
  publicacion_id BIGINT UNSIGNED NOT NULL,
  added_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (tablero_id, publicacion_id),
  KEY idx_tablero_publicacion_publicacion (publicacion_id, tablero_id),
  CONSTRAINT fk_tablero_publicacion_tablero
    FOREIGN KEY (tablero_id) REFERENCES tableros (id) ON DELETE CASCADE,
  CONSTRAINT fk_tablero_publicacion_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE recursos (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  publicacion_id BIGINT UNSIGNED NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  url_archivo VARCHAR(2048) NOT NULL,
  tipo_mime VARCHAR(100) NULL,
  tamano_bytes BIGINT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_recursos_publicacion (publicacion_id, id),
  CONSTRAINT fk_recursos_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE me_gusta (
  usuario_id BIGINT UNSIGNED NOT NULL,
  publicacion_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, publicacion_id),
  KEY idx_me_gusta_publicacion (publicacion_id, usuario_id),
  CONSTRAINT fk_me_gusta_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_me_gusta_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE seguimientos (
  seguidor_id BIGINT UNSIGNED NOT NULL,
  seguido_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (seguidor_id, seguido_id),
  KEY idx_seguimientos_seguido (seguido_id, seguidor_id),
  CONSTRAINT chk_seguimientos_no_autoseguimiento CHECK (seguidor_id <> seguido_id),
  CONSTRAINT fk_seguimientos_seguidor
    FOREIGN KEY (seguidor_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_seguimientos_seguido
    FOREIGN KEY (seguido_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE comentarios (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  publicacion_id BIGINT UNSIGNED NOT NULL,
  usuario_id BIGINT UNSIGNED NOT NULL,
  contenido TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comentarios_publicacion_fecha (publicacion_id, created_at, id),
  KEY idx_comentarios_usuario (usuario_id, created_at),
  CONSTRAINT fk_comentarios_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE,
  CONSTRAINT fk_comentarios_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE historial_visualizacion (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  publicacion_id BIGINT UNSIGNED NOT NULL,
  visto_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_historial_usuario_publicacion (usuario_id, publicacion_id),
  KEY idx_historial_usuario_fecha (usuario_id, visto_at, id),
  KEY idx_historial_publicacion (publicacion_id),
  CONSTRAINT fk_historial_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_historial_publicacion
    FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Feed: una fila por publicacion publicada; orden y paginacion van en el SELECT consumidor.
CREATE VIEW vista_feed_publicaciones AS
SELECT
  COALESCE(p.codigo_externo, CAST(p.id AS CHAR)) AS publicacion_id,
  p.titulo,
  p.categoria,
  p.created_at,
  p.published_at,
  u.id AS artista_id,
  u.nombre AS artista_nombre,
  u.handle AS artista_handle,
  u.avatar_url AS artista_avatar,
  portada.url_archivo AS img_url,
  (SELECT COUNT(*)
   FROM me_gusta mg
   WHERE mg.publicacion_id = p.id) AS total_me_gusta,
  (SELECT COUNT(DISTINCT t.usuario_id)
   FROM tablero_publicacion tp
   JOIN tableros t ON t.id = tp.tablero_id
   WHERE tp.publicacion_id = p.id) AS total_guardados
FROM publicaciones p
JOIN usuarios u ON u.id = p.usuario_id
LEFT JOIN medios_publicacion portada
  ON portada.publicacion_id = p.id AND portada.orden = 0
WHERE p.estado = 'publicada';

-- Detalle: una fila por publicacion. Colecciones hijas se consultan por separado.
CREATE VIEW vista_detalle_publicacion AS
SELECT
  p.id AS publicacion_id,
  p.titulo,
  p.descripcion,
  p.categoria,
  p.software,
  p.exif_camara,
  p.exif_lente,
  p.exif_apertura,
  p.exif_velocidad,
  p.exif_iso,
  p.exif_focal,
  p.created_at,
  p.published_at,
  portada.url_archivo AS portada_url,
  portada.paleta_colores AS paleta_portada,
  u.id AS artista_id,
  u.nombre AS artista_nombre,
  u.handle AS artista_handle,
  u.avatar_url AS artista_avatar,
  u.bio AS artista_bio,
  (SELECT COUNT(*)
   FROM me_gusta mg
   WHERE mg.publicacion_id = p.id) AS total_me_gusta,
  (SELECT COUNT(DISTINCT t.usuario_id)
   FROM tablero_publicacion tp
   JOIN tableros t ON t.id = tp.tablero_id
   WHERE tp.publicacion_id = p.id) AS total_guardados,
  (SELECT COUNT(*)
   FROM comentarios c
   WHERE c.publicacion_id = p.id) AS total_comentarios,
  (SELECT COUNT(*)
   FROM seguimientos seg
   WHERE seg.seguido_id = u.id) AS artista_seguidores,
  (SELECT COUNT(*)
   FROM seguimientos seg
   WHERE seg.seguidor_id = u.id) AS artista_siguiendo
FROM publicaciones p
JOIN usuarios u ON u.id = p.usuario_id
LEFT JOIN medios_publicacion portada
  ON portada.publicacion_id = p.id AND portada.orden = 0
WHERE p.estado = 'publicada';

-- Tableros del usuario; filtrar por usuario_id desde Express.
-- Reemplazar la vista de tableros para incluir información útil si se requiere
DROP VIEW IF EXISTS vista_tableros_guardados;

CREATE VIEW vista_tableros_guardados AS
SELECT
  t.id AS tablero_id,
  t.usuario_id,
  t.nombre AS tablero_nombre,
  t.created_at,
  COUNT(tp.publicacion_id) AS total_pines
FROM tableros t
LEFT JOIN tablero_publicacion tp ON tp.tablero_id = t.id
GROUP BY t.id, t.usuario_id, t.nombre, t.created_at;

-- Historial: upsert por usuario/publicacion para mover la visita reciente al inicio.
-- INSERT INTO historial_visualizacion (usuario_id, publicacion_id)
-- VALUES (?, ?)
-- ON DUPLICATE KEY UPDATE visto_at = CURRENT_TIMESTAMP;
CREATE VIEW vista_historial_vista AS
SELECT
  h.id AS historial_id,
  h.usuario_id,
  h.visto_at,
  p.id AS publicacion_id,
  p.titulo,
  p.categoria,
  portada.url_archivo AS img_url,
  u.id AS artista_id,
  u.nombre AS artista_nombre
FROM historial_visualizacion h
JOIN publicaciones p ON p.id = h.publicacion_id
JOIN usuarios u ON u.id = p.usuario_id
LEFT JOIN medios_publicacion portada
  ON portada.publicacion_id = p.id AND portada.orden = 0
WHERE p.estado = 'publicada';

-- Consultas complementarias para GET /api/publicaciones/:id:
-- SELECT id, url_archivo, tipo_mime, orden, paleta_colores
-- FROM medios_publicacion WHERE publicacion_id = ? ORDER BY orden;
-- SELECT e.id, e.nombre FROM etiquetas e
-- JOIN publicacion_etiqueta pe ON pe.etiqueta_id = e.id
-- WHERE pe.publicacion_id = ? ORDER BY e.nombre;
-- SELECT id, nombre, url_archivo, tipo_mime, tamano_bytes
-- FROM recursos WHERE publicacion_id = ? ORDER BY id;
-- SELECT EXISTS(SELECT 1 FROM me_gusta WHERE usuario_id = ? AND publicacion_id = ?) AS me_gusta;
-- SELECT EXISTS(SELECT 1 FROM tablero_publicacion tp
--   JOIN tableros t ON t.id = tp.tablero_id
--   WHERE t.usuario_id = ? AND tp.publicacion_id = ?) AS guardado;

USE pinspiration;

-- La API hace el upsert del historial y el insert en tablero_publicacion.
-- No se necesitan triggers: visto_at ya tiene DEFAULT y la relacion de guardados
-- queda persistida directamente en tablero_publicacion.
DROP TRIGGER IF EXISTS trg_historial_visualizacion_ins;
DROP TRIGGER IF EXISTS trg_valida_tablero_publicacion;

-- ==========================================
-- PRUEBAS DE VISTAS (SELECT para cada vista)
-- ==========================================

-- 1. Vista del Feed Principal
SELECT * FROM vista_feed_publicaciones;

-- 2. Vista del Detalle de Publicación
SELECT * FROM vista_detalle_publicacion;

-- 3. Vista de Tableros Guardados
SELECT * FROM vista_tableros_guardados;

-- 4. Vista de Historial de Visualización
SELECT * FROM vista_historial_vista;


-- ==========================================
-- PRUEBAS DE TABLAS (SELECT * para cada tabla)
-- ==========================================

SELECT * FROM usuarios;
SELECT * FROM publicaciones;
SELECT * FROM medios_publicacion;
SELECT * FROM etiquetas;
SELECT * FROM publicacion_etiqueta;
SELECT * FROM tableros;
SELECT * FROM tablero_publicacion;
SELECT * FROM recursos;
SELECT * FROM me_gusta;
SELECT * FROM seguimientos;
SELECT * FROM comentarios;
SELECT * FROM historial_visualizacion;

