<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/conexion.php';

$pdo = obtenerPDO();

$stmt = $pdo->prepare('SELECT * FROM vista_tableros_guardados WHERE usuario_id = ? ORDER BY created_at DESC');
$stmt->execute([$usuarioId]);
$tableros = $stmt->fetchAll();

if (empty($tableros)) {
    echo json_encode([]);
    exit;
}

$stmtPines = $pdo->prepare('
    SELECT
        tp.tablero_id,
        COALESCE(p.codigo_externo, CAST(p.id AS CHAR)) AS publicacion_id,
        p.titulo,
        p.categoria,
        portada.url_archivo AS img_url,
        u.id AS artista_id
    FROM tablero_publicacion tp
    JOIN publicaciones p ON p.id = tp.publicacion_id
    JOIN usuarios u ON u.id = p.usuario_id
    LEFT JOIN medios_publicacion portada
        ON portada.publicacion_id = p.id AND portada.orden = 0
    JOIN tableros t ON t.id = tp.tablero_id
    WHERE t.usuario_id = ?
');
$stmtPines->execute([$usuarioId]);

$pines = $stmtPines->fetchAll();

$tablerosConPines = [];
foreach ($tableros as $t) {
    $pinesDelTablero = [];
    foreach ($pines as $p) {
        if ((string) $p['tablero_id'] !== (string) $t['tablero_id']) {
            continue;
        }
        $pinesDelTablero[] = [
            'id' => (string) $p['publicacion_id'],
            'title' => $p['titulo'],
            'type' => $p['categoria'],
            'imgUrl' => $p['img_url']
                || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600',
            'imgH' => 300,
            'artistId' => (string) $p['artista_id'],
            'likes' => 0,
            'saves' => 0,
            'tags' => [],
        ];
    }

    $tablerosConPines[] = [
        'tablero_id' => (string) $t['tablero_id'],
        'tablero_nombre' => $t['tablero_nombre'],
        'pines' => $pinesDelTablero,
    ];
}

echo json_encode($tablerosConPines, JSON_UNESCAPED_UNICODE);
