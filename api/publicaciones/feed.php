<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$stmt = $pdo->query('SELECT * FROM vista_feed_publicaciones');
$feed = $stmt->fetchAll();

echo json_encode($feed, JSON_UNESCAPED_UNICODE);
