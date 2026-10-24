<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$stmt = $pdo->prepare('SELECT * FROM vista_historial_vista WHERE usuario_id = ? ORDER BY visto_at DESC LIMIT 50');
$stmt->execute([$usuarioId]);
$historial = $stmt->fetchAll();

echo json_encode($historial, JSON_UNESCAPED_UNICODE);
