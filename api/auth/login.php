<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$body = json_decode(file_get_contents('php://input'), true);
$email = $body['email'] ?? null;
$password = $body['password'] ?? null;

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Faltan credenciales'], JSON_UNESCAPED_UNICODE);
    exit;
}

$stmt = $pdo->prepare(
    'SELECT id, nombre, handle, email, avatar_url AS avatar, bio, header_bg FROM usuarios WHERE email = ? AND password_hash = ?'
);
$stmt->execute([$email, $password]);
$usuario = $stmt->fetch();

if ($usuario === false) {
    http_response_code(401);
    echo json_encode(['error' => 'Correo o contraseña incorrectos'], JSON_UNESCAPED_UNICODE);
    exit;
}

echo json_encode($usuario, JSON_UNESCAPED_UNICODE);
