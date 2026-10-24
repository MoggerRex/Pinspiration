<?php
declare(strict_types=1);

/**
 * Front controller de la API de Pinspiration.
 *
 * Reemplaza el enrutado central de Express (server/server.js). Toda petición
 * bajo /api/* es enrutada aquí según el método HTTP y la ruta.
 */

header('Content-Type: application/json; charset=utf-8');

$path = parse_url($_SERVER['REQUEST_URI'] ?? '/api', PHP_URL_PATH);
$path = rtrim($path, '/');
if ($path === '') {
    $path = '/';
}

// Si la petición pide un archivo estático (css, js, imagenes), se deja al servidor web.
if (strpos($path, '/api/') !== 0 && $path !== '/api') {
    $staticFile = $_SERVER['DOCUMENT_ROOT'] . $path;
    if (file_exists($staticFile) && !is_dir($staticFile)) {
        return false;
    }
}

$usuarioId = null;

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/api/usuarios') {
    include __DIR__ . '/usuarios/index.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path === '/api/login') {
    include __DIR__ . '/auth/login.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $path === '/api/feed') {
    include __DIR__ . '/publicaciones/feed.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path === '/api/publicaciones') {
    include __DIR__ . '/publicaciones/crear.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && preg_match('#^/api/tableros/(\d+)$#', $path, $m)) {
    $usuarioId = (int) $m[1];
    include __DIR__ . '/tableros/index.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path === '/api/tableros') {
    include __DIR__ . '/tableros/crear.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path === '/api/tableros/guardar') {
    include __DIR__ . '/tableros/guardar.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET' && preg_match('#^/api/historial/(\d+)$#', $path, $m)) {
    $usuarioId = (int) $m[1];
    include __DIR__ . '/historial/index.php';
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $path === '/api/historial') {
    include __DIR__ . '/historial/agregar.php';
    exit;
}

http_response_code(404);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['error' => 'Endpoint no encontrado']);
