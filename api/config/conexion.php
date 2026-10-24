<?php
declare(strict_types=1);

/**
 * Configuración de la conexión a la base de datos MySQL (MySQL Workbench).
 * Base de datos: pinspiration
 */

function obtenerPDO(): PDO {
    $host = 'localhost';
    $dbname = 'pinspiration';
    $user = 'root';
    $password = 'root'; // <-- Cambia por la contraseña real de tu MySQL Workbench si es distinta

    $dsn = "mysql:host=$host;dbname=$dbname;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];

    try {
        return new PDO($dsn, $user, $password, $options);
    } catch (PDOException $e) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => 'Error al conectar con la base de datos: ' . $e->getMessage()]);
        exit;
    }
}

/**
 * Asegura que exista una publicación en la tabla `publicaciones` a partir de
 * un Pin (identificador externo tipo "p1" o numérico) y devuelve su id.
 * Si la publicación ya existe, la reutiliza en lugar de duplicarla.
 */
function asegurarPublicacion(PDO $pdo, $pinId, array $pinData = []): ?int {
    $externalId = (string) $pinId;
    $numericId = preg_match('/^\d+$/', $externalId) ? (int) $externalId : null;
    $lookupValue = $numericId ?? $externalId;

    $lookup = $numericId !== null
        ? 'SELECT id FROM publicaciones WHERE id = ?'
        : 'SELECT id FROM publicaciones WHERE codigo_externo = ?';

    $stmt = $pdo->prepare($lookup);
    $stmt->execute([$lookupValue]);
    $row = $stmt->fetch();
    if ($row) {
        return (int) $row['id'];
    }

    $titulo = $pinData['title'] ?? $pinData['titulo'] ?? ('Pin ' . $externalId);
    $categoria = $pinData['type'] ?? $pinData['categoria'] ?? '3D';
    $descripcion = $pinData['descripcion'] ?? null;
    $software = $pinData['software'] ?? null;
    $estado = $pinData['estado'] ?? 'publicada';
    $publishedAt = $pinData['published_at'] ?? null;

    $artistId = 'a1';
    if (isset($pinData['artistId'])) {
        $artistId = (string) $pinData['artistId'];
        if (preg_match('/^a(\d+)$/', $artistId, $m)) {
            $artistId = 'a' . $m[1];
        }
    }
    $artistaIdNum = (int) substr($artistId, 1);
    if ($artistaIdNum <= 0) {
        $artistaIdNum = 1;
    }
    $imgUrl = $pinData['imgUrl'] ?? $pinData['img_url'] ?? 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600';

    $insertPub = 'INSERT INTO publicaciones (codigo_externo, usuario_id, titulo, descripcion, categoria, software, estado, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
    $stmt = $pdo->prepare($insertPub);
    $stmt->execute([
        $numericId !== null ? null : $externalId,
        $artistaIdNum,
        $titulo,
        $descripcion,
        $categoria,
        $software,
        $estado,
        $publishedAt ?: null,
    ]);
    $publicacionId = (int) $stmt->lastInsertId();

    $insertMedio = 'INSERT INTO medios_publicacion (publicacion_id, url_archivo, orden, paleta_colores) VALUES (?, ?, ?, ?)';
    $stmt = $pdo->prepare($insertMedio);
    $stmt->execute([
        $publicacionId,
        $imgUrl,
        0,
        $pinData['palette'] ? json_encode($pinData['palette']) : null,
    ]);

    return $publicacionId;
}
