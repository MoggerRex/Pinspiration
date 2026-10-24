# Pinspiration

Plataforma de inspiración visual para artistas. Migra de **React + Vite + Express/Node** hacia una arquitectura **clásica: HTML + CSS + JavaScript (vanilla) + PHP (backend) + MySQL**.

## 🗂️ Nueva estructura de archivos

```
/Pinspiration
├── /api
│   ├── index.php                  ← Front controller (enrutado de la API)
│   ├── config/
│   │   └── conexion.php           ← Conexión PDO a MySQL
│   ├── auth/
│   │   └── login.php              ← POST /api/login
│   ├── usuarios/
│   │   └── index.php              ← GET /api/usuarios
│   ├── publicaciones/
│   │   ├── feed.php               ← GET /api/feed
│   │   └── crear.php              ← POST /api/publicaciones
│   ├── tableros/
│   │   ├── index.php              ← GET /api/tableros/{usuario_id}
│   │   ├── crear.php              ← POST /api/tableros
│   │   └── guardar.php            ← POST /api/tableros/guardar
│   └── historial/
│       ├── index.php              ← GET /api/historial/{usuario_id}
│       └── agregar.php            ← POST /api/historial
├── /css
│   ├── global.css
│   ├── barra-navegacion.css
│   ├── tarjeta-pin.css
│   ├── ventanas-flotantes.css
│   ├── detalle-obra.css
│   └── login.css
├── /js
│   ├── api.js                      ← Funciones fetch hacia los endpoints PHP
│   ├── navegacion.js               ← Vistas, drawers y modales
│   ├── feed.js                      ← Home, renderizado de tarjetas e interacción
│   ├── perfil.js                    ← Perfil de usuario y edición
│   ├── crear-pin.js                 ← Subida de archivos, validación Gemini y formulario
│   ├── tableros.js                  ← Tableros guardados
│   └── login.js                     ← Autenticación e inicio de sesión
├── /database
│   └── pinspiration_mysql.sql     ← Esquema y vistas de MySQL
├── index.html                      ← Shell principal (SPA vanilla)
├── login.html                      ← Shell de inicio de sesión
└── api/
    └── index.php                   ← Front controller
```

## ⚙️ Backend (PHP + MySQL)

- Conexión a MySQL Workbench (`pinspiration`) mediante **PDO** — `api/config/conexion.php`.
- Endpoints PHP que devuelven **JSON** (`header('Content-Type: application/json')`).
- Rutas virtuales (`/api/*`) atendidas por el front controller `api/index.php`
  (con `.htaccess` para Apache o con el router del servidor embebido de PHP).

### Endpoints disponibles

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| GET | `/api/usuarios` | Lista de usuarios (artistas) |
| POST | `/api/login` | Inicio de sesión (email + password) |
| GET | `/api/feed` | Feed desde la vista `vista_feed_publicaciones` |
| POST | `/api/publicaciones` | Creación de publicaciones y medios |
| GET | `/api/tableros/{usuario_id}` | Tableros guardados del usuario |
| POST | `/api/tableros` | Creación de tablero |
| POST | `/api/tableros/guardar` | Guardar pin en tablero |
| GET | `/api/historial/{usuario_id}` | Historial de visualización |
| POST | `/api/historial` | Registrar visualización |

## 🚀 Cómo ejecutar el backend

1. Importar el esquema en MySQL Workbench (base `pinspiration`).
2. Levantar PHP:

```bash
php -S localhost:8000 -t . api/index.php
```

3. El backend quedará disponible en `http://localhost:8000/api/...`.

## 🔄 Estado de la migración

- [x] Estructura de carpetas y backend PHP (conexión PDO + endpoints)
- [ ] Frontend vanilla (HTML/CSS/JS) — en proceso
