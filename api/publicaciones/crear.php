<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$body = json_decode(file_get_contents('php://input'), true);

$usuarioId = $body['usuario_id'] ?? null;
$titulo = $body['titulo'] ?? $body['title'] ?? null;

if (!$usuarioId || !$titulo) {
    http_response_code(400);
    echo json_encode(['error' => 'Usuario y título son requeridos'], JSON_UNESCAPED_UNICODE);
    exit;
}

$pinData = $body['pin'] ?? [];
$descripcion = $body['descripcion'] ?? $pinData['description'] ?? null;
$categoria = $body['categoria'] ?? $pinData['type'] ?? '3D';
$software = $body['software'] ?? $pinData['software'] ?? null;
$estado = $body['estado'] ?? 'publicada';
$publishedAt = $body['published_at'] ?? null;
$imgUrl = $pinData['imgUrl'] ?? $pinData['img_url'] ?? $body['imgUrl'] ?? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600';

$codigoExterno = $body['codigo_externo'] ?? ('pin_' . time());
$pinId = $body['pin_id'] ?? $codigoExterno;

$publicacionId = asegurarPublicacion($pdo, $pinId, [
    'title' => $titulo,
    'type' => $categoria,
    'artistId' => (string) $usuarioId,
    'imgUrl' => $imgUrl,
    'descripcion' => $descripcion,
    'software' => $software,
    'estado' => $estado,
    'published_at' => $publishedAt,
    'palette' => $pinData['palette'] ?? null,
]);

if ($publicacionId === null) {
    http_response_code(500);
    echo json_encode(['error' => 'Error al crear la publicación'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode([
    'id' => $publicacionId,
    'usuario_id' => $usuarioId,
    'titulo' => $titulo,
], JSON_UNESCAPED_UNICODE);
