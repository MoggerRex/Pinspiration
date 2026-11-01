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

-- ==========================================
-- STORED PROCEDURE: registrar un usuario
-- ==========================================
-- En una base ya creada, ejecuta solo este bloque (no hace falta recrear las tablas).
-- Normaliza el handle (le antepone @) y el correo (minúsculas), rechaza correos
-- y handles repetidos y devuelve la fila del usuario recién creado.
-- Las validaciones usan SQLSTATE 45000: Express las convierte en respuestas 400.
-- Uso desde Express: CALL sp_registrar_usuario(?, ?, ?, ?, ?, ?, ?);
DROP PROCEDURE IF EXISTS sp_registrar_usuario;

DELIMITER $$

CREATE PROCEDURE sp_registrar_usuario(
  IN p_nombre VARCHAR(100),
  IN p_handle VARCHAR(50),
  IN p_email VARCHAR(254),
  IN p_password VARCHAR(255),
  IN p_avatar_url VARCHAR(2048),
  IN p_bio TEXT,
  IN p_header_bg VARCHAR(512)
)
BEGIN
  DECLARE v_handle VARCHAR(50);
  DECLARE v_email VARCHAR(254);
  DECLARE v_avatar VARCHAR(2048);
  DECLARE v_bio TEXT;
  DECLARE v_header VARCHAR(512);
  DECLARE v_usuario_id BIGINT UNSIGNED;

  IF TRIM(IFNULL(p_nombre, '')) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre es obligatorio';
  END IF;

  IF CHAR_LENGTH(TRIM(p_nombre)) > 100 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El nombre no puede superar 100 caracteres';
  END IF;

  SET v_handle = TRIM(IFNULL(p_handle, ''));
  IF v_handle = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El handle es obligatorio';
  END IF;

  IF LEFT(v_handle, 1) <> '@' THEN
    SET v_handle = CONCAT('@', v_handle);
  END IF;

  IF CHAR_LENGTH(v_handle) < 3 OR CHAR_LENGTH(v_handle) > 50 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El handle debe tener entre 2 y 49 caracteres';
  END IF;

  SET v_email = LOWER(TRIM(IFNULL(p_email, '')));
  IF v_email = '' OR v_email NOT LIKE '%_@_%._%' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El correo electrónico no es válido';
  END IF;

  IF p_password IS NULL OR CHAR_LENGTH(p_password) < 3 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La contraseña debe tener al menos 3 caracteres';
  END IF;

  IF EXISTS (SELECT 1 FROM usuarios WHERE email = v_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese correo ya está registrado';
  END IF;

  IF EXISTS (SELECT 1 FROM usuarios WHERE handle = v_handle) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ese handle ya está en uso';
  END IF;

  SET v_avatar = NULLIF(TRIM(IFNULL(p_avatar_url, '')), '');
  SET v_bio = NULLIF(TRIM(IFNULL(p_bio, '')), '');
  SET v_header = NULLIF(TRIM(IFNULL(p_header_bg, '')), '');
  IF v_header IS NULL THEN
    SET v_header = 'linear-gradient(0deg, #13191d 5%, #00385a 100%)';
  END IF;

  INSERT INTO usuarios (nombre, handle, email, password_hash, avatar_url, bio, header_bg)
  VALUES (TRIM(p_nombre), v_handle, v_email, p_password, v_avatar, v_bio, v_header);

  SET v_usuario_id = LAST_INSERT_ID();

  SELECT id, nombre, handle, email, avatar_url, bio, header_bg
  FROM usuarios
  WHERE id = v_usuario_id;
END$$

DELIMITER ;

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
-- publicacion_pk es el id numérico: sirve para ordenar de forma estable
-- (publicacion_id mezcla códigos externos como "p4" con ids numéricos).
CREATE VIEW vista_feed_publicaciones AS
SELECT
  COALESCE(p.codigo_externo, CAST(p.id AS CHAR)) AS publicacion_id,
  p.id AS publicacion_pk,
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
   WHERE seg.seguidor_id = u.id) AS artista_siguiendo,
  (SELECT COUNT(*)
   FROM publicaciones pa
   WHERE pa.usuario_id = u.id AND pa.estado = 'publicada') AS artista_publicaciones
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

-- La API hace el upsert del historial y el insert en tablero_publicacion.
-- No se necesitan triggers: visto_at ya tiene DEFAULT y la relacion de guardados
-- queda persistida directamente en tablero_publicacion.
DROP TRIGGER IF EXISTS trg_historial_visualizacion_ins;
DROP TRIGGER IF EXISTS trg_valida_tablero_publicacion;

-- Pinspiration: perfil de usuario y creación de publicaciones
-- Se puede ejecutar sobre una base ya creada (no borra datos) y repetirse sin problema.
-- También pégalo en pinspiration_mysql.sql, antes de la sección "PRUEBAS DE VISTAS".

-- ==========================================
-- VISTA: perfil del usuario + sus publicaciones
-- ==========================================
-- Una fila por publicación publicada del usuario, con los datos del usuario repetidos.
-- Si el usuario no tiene publicaciones, devuelve una sola fila con las columnas de
-- publicación en NULL (por eso es LEFT JOIN y el filtro de estado va en el ON).
-- Uso desde Express: SELECT * FROM vista_perfil_usuario WHERE usuario_id = ?
CREATE OR REPLACE VIEW vista_perfil_usuario AS
SELECT
  u.id AS usuario_id,
  u.nombre,
  u.handle,
  u.email,
  u.avatar_url,
  u.bio,
  u.header_bg,
  (SELECT COUNT(*)
   FROM seguimientos s
   WHERE s.seguido_id = u.id) AS seguidores,
  (SELECT COUNT(*)
   FROM seguimientos s
   WHERE s.seguidor_id = u.id) AS siguiendo,
  (SELECT COUNT(*)
   FROM publicaciones pc
   WHERE pc.usuario_id = u.id AND pc.estado = 'publicada') AS total_publicaciones,
  p.id AS publicacion_pk,
  COALESCE(p.codigo_externo, CAST(p.id AS CHAR)) AS publicacion_id,
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
  p.published_at,
  portada.url_archivo AS img_url,
  portada.paleta_colores,
  (SELECT GROUP_CONCAT(e.nombre ORDER BY e.nombre SEPARATOR ',')
   FROM publicacion_etiqueta pe
   JOIN etiquetas e ON e.id = pe.etiqueta_id
   WHERE pe.publicacion_id = p.id) AS etiquetas,
  (SELECT COUNT(*)
   FROM me_gusta mg
   WHERE mg.publicacion_id = p.id) AS total_me_gusta,
  (SELECT COUNT(DISTINCT t.usuario_id)
   FROM tablero_publicacion tp
   JOIN tableros t ON t.id = tp.tablero_id
   WHERE tp.publicacion_id = p.id) AS total_guardados
FROM usuarios u
LEFT JOIN publicaciones p
  ON p.usuario_id = u.id AND p.estado = 'publicada'
LEFT JOIN medios_publicacion portada
  ON portada.publicacion_id = p.id AND portada.orden = 0;


-- ==========================================
-- STORED PROCEDURE: crear una publicación completa
-- ==========================================
-- Inserta en una sola transacción: publicaciones, medios_publicacion (en orden),
-- etiquetas y publicacion_etiqueta. Si algo falla, se hace ROLLBACK y no queda nada a medias.
--   p_medios    JSON: ["/uploads/publicaciones/a.jpg", "/uploads/publicaciones/b.jpg"]
--   p_paleta    JSON: ["#aabbcc", "#112233"]  (se guarda en la portada, orden 0)
--   p_etiquetas JSON: ["dragon", "fantasia"]
-- Devuelve un SELECT con el id de la nueva publicación (publicacion_id).
DROP PROCEDURE IF EXISTS sp_crear_publicacion;

DELIMITER $$

CREATE PROCEDURE sp_crear_publicacion(
  IN p_usuario_id BIGINT UNSIGNED,
  IN p_titulo VARCHAR(150),
  IN p_descripcion TEXT,
  IN p_categoria VARCHAR(20),
  IN p_software VARCHAR(255),
  IN p_exif_camara VARCHAR(150),
  IN p_exif_lente VARCHAR(150),
  IN p_exif_apertura VARCHAR(50),
  IN p_exif_velocidad VARCHAR(50),
  IN p_exif_iso VARCHAR(50),
  IN p_exif_focal VARCHAR(50),
  IN p_medios JSON,
  IN p_paleta JSON,
  IN p_etiquetas JSON
)
BEGIN
  DECLARE v_publicacion_id BIGINT UNSIGNED;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  -- Validaciones (el SQLSTATE 45000 lo traduce Express a un error 400)
  IF TRIM(IFNULL(p_titulo, '')) = '' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El título es obligatorio';
  END IF;

  IF p_categoria IS NULL OR p_categoria NOT IN ('2D', '3D', 'Fotografía', 'Edición') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Categoría inválida';
  END IF;

  IF p_medios IS NULL
     OR JSON_TYPE(p_medios) <> 'ARRAY'
     OR JSON_LENGTH(p_medios) NOT BETWEEN 1 AND 20 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Debes subir entre 1 y 20 imágenes';
  END IF;

  START TRANSACTION;

  INSERT INTO publicaciones (
    usuario_id, titulo, descripcion, categoria, software,
    exif_camara, exif_lente, exif_apertura, exif_velocidad, exif_iso, exif_focal,
    estado, published_at
  ) VALUES (
    p_usuario_id, TRIM(p_titulo), p_descripcion, p_categoria, p_software,
    p_exif_camara, p_exif_lente, p_exif_apertura, p_exif_velocidad, p_exif_iso, p_exif_focal,
    'publicada', NOW()
  );

  SET v_publicacion_id = LAST_INSERT_ID();

  -- Imágenes: la primera (orden 0) es la portada
  INSERT INTO medios_publicacion (publicacion_id, url_archivo, orden)
  SELECT v_publicacion_id, jt.url, jt.idx - 1
  FROM JSON_TABLE(
    p_medios, '$[*]' COLUMNS (idx FOR ORDINALITY, url VARCHAR(2048) PATH '$')
  ) AS jt;

  IF p_paleta IS NOT NULL THEN
    UPDATE medios_publicacion
    SET paleta_colores = p_paleta
    WHERE publicacion_id = v_publicacion_id AND orden = 0;
  END IF;

  -- Etiquetas: se crean las que no existan y se relacionan con la publicación
  IF p_etiquetas IS NOT NULL AND JSON_LENGTH(p_etiquetas) > 0 THEN
    INSERT IGNORE INTO etiquetas (nombre)
    SELECT DISTINCT TRIM(jt.nombre)
    FROM JSON_TABLE(
      p_etiquetas, '$[*]' COLUMNS (nombre VARCHAR(50) PATH '$')
    ) AS jt
    WHERE TRIM(jt.nombre) <> '';

    INSERT IGNORE INTO publicacion_etiqueta (publicacion_id, etiqueta_id)
    SELECT DISTINCT v_publicacion_id, e.id
    FROM JSON_TABLE(
      p_etiquetas, '$[*]' COLUMNS (nombre VARCHAR(50) PATH '$')
    ) AS jt
    JOIN etiquetas e
      ON e.nombre = TRIM(jt.nombre) COLLATE utf8mb4_0900_ai_ci;
  END IF;

  COMMIT;

  SELECT v_publicacion_id AS publicacion_id;
END$$

DELIMITER ;


-- ==========================================
-- PRUEBAS RÁPIDAS (opcional)
-- ==========================================
-- Perfil con sus publicaciones:
-- SELECT * FROM vista_perfil_usuario WHERE usuario_id = 1;
--
-- Crear una publicación de prueba:
-- CALL sp_crear_publicacion(
--   1, 'Prueba', 'Descripción', '3D', 'Blender',
--   NULL, NULL, NULL, NULL, NULL, NULL,
--   JSON_ARRAY('/uploads/publicaciones/prueba.jpg'),
--   JSON_ARRAY('#00385a', '#13191d'),
--   JSON_ARRAY('prueba', 'blender')
-- );

-- ==========================================
-- PRUEBAS DE VISTAS (SELECT para cada vista)
-- ==========================================

-- 1. Vista del Feed Principal
-- El orden se aplica al consumir la vista: más recientes primero.
SELECT * FROM vista_feed_publicaciones
ORDER BY COALESCE(published_at, created_at) DESC, publicacion_pk DESC;

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

