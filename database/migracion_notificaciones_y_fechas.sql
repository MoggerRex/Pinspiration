DROP VIEW IF EXISTS vista_notificaciones_usuario;
DROP FUNCTION IF EXISTS fn_hace_cuanto;
DROP FUNCTION IF EXISTS fn_sigue_a;

DELIMITER $$

CREATE FUNCTION fn_hace_cuanto(p_fecha DATETIME)
RETURNS VARCHAR(30)
NOT DETERMINISTIC
NO SQL
BEGIN
  DECLARE v_seg BIGINT;
  SET v_seg = TIMESTAMPDIFF(SECOND, p_fecha, NOW());

  RETURN CASE
    WHEN p_fecha IS NULL THEN ''
    WHEN v_seg < 60 THEN 'hace un momento'
    WHEN v_seg < 3600 THEN CONCAT('hace ', FLOOR(v_seg / 60), ' min')
    WHEN v_seg < 86400 THEN CONCAT('hace ', FLOOR(v_seg / 3600), ' h')
    WHEN v_seg < 2592000 THEN CONCAT('hace ', FLOOR(v_seg / 86400), ' d')
    ELSE DATE_FORMAT(p_fecha, '%d/%m/%Y')
  END;
END$$

CREATE FUNCTION fn_sigue_a(p_seguidor BIGINT UNSIGNED, p_seguido BIGINT UNSIGNED)
RETURNS TINYINT(1)
READS SQL DATA
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM seguimientos
    WHERE seguidor_id = p_seguidor AND seguido_id = p_seguido
  );
END$$

DELIMITER ;

CREATE TABLE IF NOT EXISTS notificaciones (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id BIGINT UNSIGNED NOT NULL,
  actor_id BIGINT UNSIGNED NOT NULL,
  publicacion_id BIGINT UNSIGNED NULL,
  tipo ENUM('me_gusta', 'seguidor', 'comentario', 'nueva_publicacion', 'guardado') NOT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notificaciones_usuario (usuario_id, leida, created_at),
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_notificaciones_actor FOREIGN KEY (actor_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_notificaciones_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones (id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE notificaciones
  MODIFY COLUMN publicacion_id BIGINT UNSIGNED NULL,
  MODIFY COLUMN tipo ENUM('me_gusta', 'seguidor', 'comentario', 'nueva_publicacion', 'guardado') NOT NULL;

INSERT IGNORE INTO tableros (usuario_id, nombre)
SELECT id, 'Mis guardados' FROM usuarios;

DROP TRIGGER IF EXISTS trg_usuario_tablero_inicial;
DROP TRIGGER IF EXISTS trg_me_gusta_notifica;
DROP TRIGGER IF EXISTS trg_seguimiento_notifica;
DROP TRIGGER IF EXISTS trg_comentario_notifica;
DROP TRIGGER IF EXISTS trg_publicacion_notifica_seguidores;
DROP TRIGGER IF EXISTS trg_publicacion_publicada_notifica_seguidores;
DROP TRIGGER IF EXISTS trg_guardado_notifica;

DELIMITER $$

CREATE TRIGGER trg_usuario_tablero_inicial
AFTER INSERT ON usuarios
FOR EACH ROW
BEGIN
  INSERT INTO tableros (usuario_id, nombre)
  VALUES (NEW.id, 'Mis guardados');
END$$

CREATE TRIGGER trg_me_gusta_notifica
AFTER INSERT ON me_gusta
FOR EACH ROW
BEGIN
  DECLARE v_autor BIGINT UNSIGNED;

  SELECT usuario_id INTO v_autor
  FROM publicaciones
  WHERE id = NEW.publicacion_id;

  IF v_autor <> NEW.usuario_id THEN
    INSERT INTO notificaciones (usuario_id, actor_id, publicacion_id, tipo)
    VALUES (v_autor, NEW.usuario_id, NEW.publicacion_id, 'me_gusta');
  END IF;
END$$

CREATE TRIGGER trg_seguimiento_notifica
AFTER INSERT ON seguimientos
FOR EACH ROW
BEGIN
  INSERT INTO notificaciones (usuario_id, actor_id, tipo)
  VALUES (NEW.seguido_id, NEW.seguidor_id, 'seguidor');
END$$

CREATE TRIGGER trg_comentario_notifica
AFTER INSERT ON comentarios
FOR EACH ROW
BEGIN
  DECLARE v_autor BIGINT UNSIGNED;

  SELECT usuario_id INTO v_autor
  FROM publicaciones
  WHERE id = NEW.publicacion_id;

  IF v_autor <> NEW.usuario_id THEN
    INSERT INTO notificaciones (usuario_id, actor_id, publicacion_id, tipo)
    VALUES (v_autor, NEW.usuario_id, NEW.publicacion_id, 'comentario');
  END IF;
END$$

CREATE TRIGGER trg_publicacion_notifica_seguidores
AFTER INSERT ON publicaciones
FOR EACH ROW
BEGIN
  IF NEW.estado = 'publicada' THEN
    INSERT INTO notificaciones (usuario_id, actor_id, publicacion_id, tipo)
    SELECT seguidor_id, NEW.usuario_id, NEW.id, 'nueva_publicacion'
    FROM seguimientos
    WHERE seguido_id = NEW.usuario_id;
  END IF;
END$$

CREATE TRIGGER trg_publicacion_publicada_notifica_seguidores
AFTER UPDATE ON publicaciones
FOR EACH ROW
BEGIN
  IF OLD.estado <> 'publicada' AND NEW.estado = 'publicada' THEN
    INSERT INTO notificaciones (usuario_id, actor_id, publicacion_id, tipo)
    SELECT seguidor_id, NEW.usuario_id, NEW.id, 'nueva_publicacion'
    FROM seguimientos
    WHERE seguido_id = NEW.usuario_id;
  END IF;
END$$

CREATE TRIGGER trg_guardado_notifica
AFTER INSERT ON tablero_publicacion
FOR EACH ROW
BEGIN
  DECLARE v_usuario_id BIGINT UNSIGNED;
  DECLARE v_autor_id BIGINT UNSIGNED;

  SELECT t.usuario_id, p.usuario_id
  INTO v_usuario_id, v_autor_id
  FROM tableros t
  JOIN publicaciones p ON p.id = NEW.publicacion_id
  WHERE t.id = NEW.tablero_id;

  IF v_usuario_id <> v_autor_id THEN
    INSERT INTO notificaciones (usuario_id, actor_id, publicacion_id, tipo)
    VALUES (v_autor_id, v_usuario_id, NEW.publicacion_id, 'guardado');
  END IF;
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vista_notificaciones_usuario AS
SELECT
  n.id AS notificacion_id,
  n.usuario_id,
  n.tipo,
  n.leida,
  n.created_at,
  fn_hace_cuanto(n.created_at) AS hace_cuanto,
  a.id AS actor_id,
  a.nombre AS actor_nombre,
  a.handle AS actor_handle,
  a.avatar_url AS actor_avatar,
  COALESCE(p.codigo_externo, CAST(p.id AS CHAR)) AS publicacion_id,
  p.titulo AS publicacion_titulo,
  portada.url_archivo AS publicacion_img,
  CASE n.tipo
    WHEN 'me_gusta' THEN CONCAT(a.nombre, ' le dio me gusta a "', p.titulo, '"')
    WHEN 'seguidor' THEN CONCAT(a.nombre, ' comenzó a seguirte')
    WHEN 'comentario' THEN CONCAT(a.nombre, ' comentó tu publicación "', p.titulo, '"')
    WHEN 'nueva_publicacion' THEN CONCAT(a.nombre, ' publicó "', p.titulo, '"')
    WHEN 'guardado' THEN CONCAT(a.nombre, ' guardó tu publicación "', p.titulo, '" en un tablero')
  END AS mensaje
FROM notificaciones n
JOIN usuarios a ON a.id = n.actor_id
LEFT JOIN publicaciones p ON p.id = n.publicacion_id
LEFT JOIN medios_publicacion portada
  ON portada.publicacion_id = p.id AND portada.orden = 0;
