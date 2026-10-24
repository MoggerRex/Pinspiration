<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$body = json_decode(file_get_contents('php://input'), true);

$usuarioId = $body['usuario_id'] ?? null;
$publicacionId = $body['publicacion_id'] ?? null;
$pin = $body['pin'] ?? [];

if (!$usuarioId || !$publicacionId) {
    http_response_code(400);
    echo json_encode(['error' => 'Parámetros incompletos'], JSON_UNESCAPED_UNICODE);
    exit;
}

$validPubId = asegurarPublicacion($pdo, $publicacionId, $pin);

if ($validPubId === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Error interno'], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $pdo->prepare('
    INSERT INTO historial_visualizacion (usuario_id, publicacion_id)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE visto_at = CURRENT_TIMESTAMP
');
$stmt->execute([$usuarioId, $validPubId]);

echo json_encode(['mensaje' => 'Historial actualizado'], JSON_UNESCAPED_UNICODE);
