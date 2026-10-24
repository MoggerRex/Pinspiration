<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$stmt = $pdo->query(
    'SELECT id, nombre, handle, email, avatar_url AS avatar, bio, header_bg FROM usuarios'
);
$usuarios = $stmt->fetchAll();

echo json_encode($usuarios, JSON_UNESCAPED_UNICODE);
