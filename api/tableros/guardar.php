<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$body = json_decode(file_get_contents('php://input'), true);

$tableroId = $body['tablero_id'] ?? null;
$publicacionId = $body['publicacion_id'] ?? null;
$usuarioId = $body['usuario_id'] ?? null;
$pin = $body['pin'] ?? [];

if (!$tableroId || !$publicacionId || !$usuarioId) {
    http_response_code(400);
    echo json_encode(['error' => 'Parámetros incompletos'], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM tableros WHERE id = ? AND usuario_id = ?');
$stmt->execute([$tableroId, $usuarioId]);
$tablero = $stmt->fetch();

if ($tablero === false) {
    http_response_code(404);
    echo json_encode(['error' => 'Tablero no encontrado para este usuario'], JSON_UNESCAPED_UNICODE);
    exit;
}

$validPubId = asegurarPublicacion($pdo, $publicacionId, $pin);

if ($validPubId === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno'], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $pdo->prepare('INSERT IGNORE INTO tablero_publicacion (tablero_id, publicacion_id) VALUES (?, ?)');
$stmt->execute([$tableroId, $validPubId]);

echo json_encode(['mensaje' => 'Publicación guardada exitosamente'], JSON_UNESCAPED_UNICODE);
