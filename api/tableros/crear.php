<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$body = json_decode(file_get_contents('php://input'), true);

$usuarioId = $body['usuario_id'] ?? null;
$nombre = $body['nombre'] ?? null;

if (!$usuarioId || !$nombre) {
    http_response_code(400);
    echo json_encode(['error' => 'Usuario y nombre son requeridos'], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $pdo->prepare('INSERT INTO tableros (usuario_id, nombre) VALUES (?, ?)');
$stmt->execute([$usuarioId, $nombre]);
$id = (int) $stmt->lastInsertId();

echo json_encode([
    'id' => $id,
    'usuario_id' => $usuarioId,
    'nombre' => $nombre,
    'total_pines' => 0,
], JSON_UNESCAPED_UNICODE);
