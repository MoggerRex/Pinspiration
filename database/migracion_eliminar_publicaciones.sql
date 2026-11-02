USE pinspiration;

DROP PROCEDURE IF EXISTS sp_eliminar_publicacion;

DELIMITER $$

CREATE PROCEDURE sp_eliminar_publicacion(
  IN p_publicacion_id BIGINT UNSIGNED,
  IN p_usuario_id BIGINT UNSIGNED
)
BEGIN
  DECLARE v_autor_id BIGINT UNSIGNED DEFAULT NULL;

  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    RESIGNAL;
  END;

  START TRANSACTION;

  SELECT usuario_id
  INTO v_autor_id
  FROM publicaciones
  WHERE id = p_publicacion_id
  FOR UPDATE;

  IF v_autor_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PUBLICACION_NO_ENCONTRADA';
  END IF;

  IF v_autor_id <> p_usuario_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'PUBLICACION_NO_AUTORIZADA';
  END IF;

  DELETE FROM publicaciones WHERE id = p_publicacion_id;

  COMMIT;
END$$

DELIMITER ;
