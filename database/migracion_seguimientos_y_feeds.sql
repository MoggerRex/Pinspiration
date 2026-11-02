USE pinspiration;

CREATE TABLE IF NOT EXISTS preferencias_usuario (
  usuario_id BIGINT UNSIGNED NOT NULL,
  tipo ENUM('categoria', 'etiqueta') NOT NULL,
  valor VARCHAR(50) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, tipo, valor),
  KEY idx_preferencias_usuario_tipo_valor (tipo, valor),
  CONSTRAINT fk_preferencias_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE OR REPLACE VIEW vista_feed_publicaciones AS
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
FROM publicaciones p
JOIN usuarios u ON u.id = p.usuario_id
LEFT JOIN medios_publicacion portada
  ON portada.publicacion_id = p.id AND portada.orden = 0
WHERE p.estado = 'publicada';

CREATE OR REPLACE VIEW vista_seguidores_usuario AS
SELECT
  s.seguido_id AS usuario_id,
  u.id AS artista_id,
  u.nombre,
  u.handle,
  u.avatar_url AS avatar,
  u.bio,
  u.header_bg,
  (SELECT COUNT(*) FROM seguimientos sx WHERE sx.seguido_id = u.id) AS seguidores,
  (SELECT COUNT(*) FROM seguimientos sx WHERE sx.seguidor_id = u.id) AS siguiendo,
  (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id AND p.estado = 'publicada') AS publicaciones
FROM seguimientos s
JOIN usuarios u ON u.id = s.seguidor_id;

CREATE OR REPLACE VIEW vista_seguidos_usuario AS
SELECT
  s.seguidor_id AS usuario_id,
  u.id AS artista_id,
  u.nombre,
  u.handle,
  u.avatar_url AS avatar,
  u.bio,
  u.header_bg,
  (SELECT COUNT(*) FROM seguimientos sx WHERE sx.seguido_id = u.id) AS seguidores,
  (SELECT COUNT(*) FROM seguimientos sx WHERE sx.seguidor_id = u.id) AS siguiendo,
  (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id AND p.estado = 'publicada') AS publicaciones
FROM seguimientos s
JOIN usuarios u ON u.id = s.seguido_id;
