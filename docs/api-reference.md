# API Reference — Sistema de Gestión de Logística y Envíos

> Generado a partir del código fuente (`backend/src`), `docs/architecture.md` y
> `docs/conventions.md`. Para la especificación máquina-legible (importable en
> Postman/Insomnia/Swagger UI), ver [`docs/openapi.yaml`](./openapi.yaml).
>
> Estado: backlog completo (sprints 1-6, 21 features, todas `done`).

## Tabla de contenidos

1. [Convenciones generales](#1-convenciones-generales)
2. [Autenticación y autorización](#2-autenticación-y-autorización)
3. [Manejo de errores](#3-manejo-de-errores)
4. [Modelo de datos](#4-modelo-de-datos)
5. [Catálogo de endpoints](#5-catálogo-de-endpoints)
   - 5.1 Autenticación — `/api/v1/auth`
   - 5.2 Perfil propio — `/api/v1/users/me`
   - 5.3 Gestión de usuarios — `/api/v1/usuarios`
   - 5.4 Envíos — `/api/v1/envios`
   - 5.5 Clientes — `/api/v1/clientes`
   - 5.6 Tracking público — `/api/v1/tracking/:codigo`
   - 5.7 Rutas — `/api/v1/rutas`
   - 5.8 Vehículos — `/api/v1/vehiculos`
   - 5.9 Repartidores (gestión) — `/api/v1/repartidores`
   - 5.10 Entregas (self-service repartidor)
   - 5.11 Incidencias — `/api/v1/incidencias`
   - 5.12 Notificaciones — `/api/v1/notificaciones`
   - 5.13 Dashboard — `/api/v1/dashboard`
   - 5.14 Reportes — `/api/v1/reportes`
6. [Tiempo real (Socket.IO)](#6-tiempo-real-socketio)
7. [Flujos clave end-to-end](#7-flujos-clave-end-to-end)
8. [Apéndice: Tipos / DTOs](#8-apéndice-tipos--dtos)

---

## 1. Convenciones generales

- **Base URL:** todas las rutas se montan bajo el prefijo `/api/v1` (p. ej. `http://localhost:3001/api/v1/envios`). El puerto del backend se controla con `PORT` en `.env` (default `3001`).
- **Formato de respuesta exitosa:**

  ```json
  { "data": "<payload>", "message": "string", "status": 200 }
  ```

- **Formato de respuesta de error:**

  ```json
  { "error": "CODE", "message": "string", "statusCode": 422 }
  ```

  Los errores de validación Zod añaden además `details: ZodIssue[]`.
- **Paginación:** parámetros de query `page` (default 1) y `limit` (default varía por endpoint, normalmente 10-20). Respuesta:

  ```json
  { "data": [], "meta": { "total": 0, "page": 1, "limit": 20, "totalPages": 0 } }
  ```

- **Fechas:** siempre en ISO 8601 UTC (ej. `2026-06-11T00:00:00.000Z`).
- **Content-Type:** `application/json` por defecto. `multipart/form-data` para subida de evidencias de entrega/incidencias (máx. 5 MB por archivo, solo `image/jpeg` o `image/png`). `text/csv` para la exportación de reportes.
- **CORS / seguridad:** `helmet()` y `cors({ origin: FRONTEND_URL, credentials: true })` activos en toda la API.

---

## 2. Autenticación y autorización

- **Esquema:** JWT Bearer. El cliente envía `Authorization: Bearer <accessToken>` en cada request protegida.
- **Access token:** vigencia 15 minutos, payload `{ id, correo, rol }`, firmado con `JWT_SECRET`.
- **Refresh token:** vigencia 7 días, almacenado en cookie `httpOnly` (`secure` en producción, `sameSite: strict`), con rotación en cada uso (`POST /api/v1/auth/refresh`) y revocación explícita en `POST /api/v1/auth/logout`.
- **Roles:** `CLIENTE`, `OPERADOR`, `REPARTIDOR` (enum `Rol` de Prisma). Cada usuario tiene exactamente un rol y un perfil asociado (`Cliente`, `Operador` o `Repartidor`).
- **Middlewares:**
  - `authMiddleware` — valida el access token; rechaza con `MISSING_TOKEN` (401) si falta el header, `INVALID_TOKEN` (401) si la firma/formato es inválido, `EXPIRED_TOKEN` (401) si expiró.
  - `roleMiddleware(rol | rol[])` — verifica `req.user.rol`; rechaza con `FORBIDDEN` (403, mensaje `"Acceso denegado: se requiere rol <roles>"`).
- **Rate limiting:** `/api/v1/auth/*` está limitado a 10 solicitudes/minuto por IP (`express-rate-limit`); deshabilitado cuando `NODE_ENV=test`.

### Resumen de acceso por módulo

| Módulo | CLIENTE | OPERADOR | REPARTIDOR |
|---|---|---|---|
| `/api/v1/auth/*` | público | público | público |
| `/api/v1/users/me` | ✅ | ✅ | ✅ |
| `/api/v1/usuarios` | ❌ | ✅ | ❌ |
| `/api/v1/envios` (CRUD) | ❌ | ✅ | ❌ |
| `/api/v1/envios/:id/{confirmar,fallo}` | ❌ | ❌ | ✅ |
| `/api/v1/envios/:id/reprogramar` | ❌ | ✅ | ❌ |
| `/api/v1/clientes` (búsqueda) | ❌ | ✅ | ❌ |
| `/api/v1/clientes/me/envios` | ✅ | ❌ | ❌ |
| `/api/v1/tracking/:codigo` | público | público | público |
| `/api/v1/rutas` | ❌ | ✅ (CRUD) | ✅ (solo lectura, propias) |
| `/api/v1/vehiculos` | ❌ | ✅ | ❌ |
| `/api/v1/repartidores` | ❌ | ✅ | ❌ |
| `/api/v1/entregas`, `/api/v1/repartidor/entregas` | ❌ | ❌ | ✅ |
| `/api/v1/incidencias` (POST) | ❌ | ❌ | ✅ |
| `/api/v1/incidencias` (GET, PATCH) | ❌ | ✅ | ❌ |
| `/api/v1/notificaciones` | ✅ (propias) | ✅ (propias) | ✅ (propias) |
| `/api/v1/dashboard` | ❌ | ✅ | ❌ |
| `/api/v1/reportes` | ❌ | ✅ | ❌ |

---

## 3. Manejo de errores

### 3.1 Manejador global (`backend/src/middlewares/errorHandler.ts`)

Todo error no capturado por un controller llega a este middleware vía `next(error)`:

| Tipo de error | HTTP | Cuerpo de respuesta |
|---|---|---|
| `ZodError` (validación de body/query/params) | 422 | `{ error: "VALIDATION_ERROR", message: "<issues unidos por coma>", statusCode: 422, details: ZodIssue[] }` |
| `MulterError` con `code === 'LIMIT_FILE_SIZE'` | 422 | `{ error: "FILE_TOO_LARGE", message: "El archivo excede el tamaño máximo permitido (5MB)", statusCode: 422 }` |
| `MulterError` (otro código) | 422 | `{ error: "INVALID_FILE_UPLOAD", message: "<err.message>", statusCode: 422 }` |
| Cualquier otro `Error` (incl. `AppError` / `createAuthError` / `createServiceError`) | `err.statusCode ?? 500` | `{ error: err.name ?? "Error", message: err.message, statusCode }` |

`AppError(code, message, statusCode)` (`backend/src/lib/appError.ts`) es la clase usada por la mayoría de los servicios. `authService.ts` y `userService.ts` definen helpers locales equivalentes (`createAuthError` / `createServiceError`) que producen `Error & { name: code, statusCode }`, consumidos de la misma forma por el manejador global.

### 3.2 Errores transversales

| code | HTTP | mensaje | origen |
|---|---|---|---|
| MISSING_TOKEN | 401 | Token de acceso requerido | `authMiddleware.ts` — falta header `Authorization` |
| INVALID_TOKEN | 401 | Token inválido | `authMiddleware.ts` — JWT mal formado o firma inválida |
| EXPIRED_TOKEN | 401 | Token expirado | `authMiddleware.ts` — `accessToken` vencido (>15 min) |
| FORBIDDEN | 403 | Acceso denegado: se requiere rol `<rol(es)>` | `roleMiddleware.ts` — rol del usuario no autorizado para el endpoint |
| VALIDATION_ERROR | 422 | (mensajes de Zod concatenados) | `errorHandler.ts` — body/query/params no pasan el schema Zod |
| FILE_TOO_LARGE | 422 | El archivo excede el tamaño máximo permitido (5MB) | `errorHandler.ts` / `multer` — código `LIMIT_FILE_SIZE` |
| INVALID_FILE_UPLOAD | 422 | (mensaje de Multer) | `errorHandler.ts` / `multer` — error de subida distinto a tamaño |
| INVALID_FILE_TYPE | 422 | Tipo de archivo no soportado: solo se admiten image/jpeg e image/png | `lib/uploadConfig.ts` — `fileFilter` rechaza el MIME type |

### 3.3 Catálogo de errores por módulo

#### Auth, perfil y usuarios (`/api/v1/auth`, `/api/v1/users`, `/api/v1/usuarios`)

| code | HTTP | mensaje | origen (archivo:línea) | endpoints |
|---|---|---|---|---|
| EMAIL_ALREADY_EXISTS | 409 | El correo ya está registrado | authService.ts:138-145 | POST /auth/register |
| INVALID_CREDENTIALS | 401 | Credenciales inválidas | authService.ts:37,42 (createAuthError) | POST /auth/login |
| USER_INACTIVE | 403 | La cuenta está desactivada. Contacta al administrador. | authService.ts:46-50 (createAuthError) | POST /auth/login |
| MISSING_REFRESH_TOKEN | 401 | Refresh token ausente | authController.ts:42-45 | POST /auth/refresh |
| INVALID_REFRESH_TOKEN | 401 | Token inválido | authService.ts:89 (createAuthError) | POST /auth/refresh |
| EXPIRED_REFRESH_TOKEN | 401 | Sesión expirada, inicia sesión de nuevo | authService.ts:93-97 (createAuthError) | POST /auth/refresh |
| NOT_FOUND | 404 | Usuario no encontrado | userService.ts:32 (createServiceError) | GET /users/me |
| INVALID_RESET_TOKEN | 400 | Token inválido o expirado | userService.ts:64-68 (createServiceError) | POST /auth/reset-password |
| NOT_FOUND | 404 | Usuario no encontrado | usuarioService.ts:40,60 (AppError) | GET /usuarios/:id, PATCH /usuarios/:id/estado |
| CANNOT_DEACTIVATE_SELF | 409 | No puedes desactivar tu propia cuenta | usuarioService.ts:51-55 (AppError) | PATCH /usuarios/:id/estado |

#### Envíos, clientes, tracking (`/api/v1/envios`, `/api/v1/clientes`, `/api/v1/tracking`)

| code | HTTP | mensaje | origen (archivo:línea) | endpoints |
|---|---|---|---|---|
| CLIENTE_NOT_FOUND | 404 | Cliente no encontrado | envioService.ts:45 | POST /envios |
| CODIGO_GENERATION_FAILED | 500 | No se pudo generar un código de seguimiento único | envioService.ts:34 | POST /envios |
| ENVIO_NOT_FOUND | 404 | Envío no encontrado | envioService.ts:119,150,173,242; trackingService.ts:10; entregaService.ts:68 | GET/PATCH/DELETE /envios/:id, POST /envios/:id/reprogramar, GET /tracking/:codigo, POST /envios/:id/{confirmar,fallo} |
| INVALID_STATE_TRANSITION | 409 | Solo se pueden cancelar envíos en estado PENDIENTE | envioService.ts:176 | DELETE /envios/:id |
| INVALID_STATE_TRANSITION | 409 | No se puede reprogramar un envío en estado terminal | envioService.ts:246 | POST /envios/:id/reprogramar |
| INVALID_STATE_TRANSITION | 409 | No se puede modificar un envío en estado `<estado>` | entregaService.ts:80 | POST /envios/:id/{confirmar,fallo} |
| CLIENTE_NOT_FOUND | 404 | No existe perfil de cliente para este usuario | envioService.ts:203 | GET /clientes/me/envios |
| VALIDATION_ERROR | 400 | Se requiere al menos un campo editable | envioValidator.ts:58 (refine de `editarEnvioSchema`) | PATCH /envios/:id |
| MISSING_FILE | 422 | Se requieren los archivos foto y firma | entregaController.ts:57 | POST /envios/:id/confirmar |
| INVALID_FILE_TYPE | 422 | Tipo de archivo no soportado: solo se admiten image/jpeg e image/png | uploadConfig.ts:24 | POST /envios/:id/{confirmar,fallo} |
| FORBIDDEN | 403 | El envío no está asignado a una ruta del repartidor | entregaService.ts:72 | POST /envios/:id/{confirmar,fallo} |
| REPARTIDOR_NOT_FOUND | 404 | Repartidor no encontrado | entregaService.ts:39 | POST /envios/:id/{confirmar,fallo} |

#### Rutas, vehículos, repartidores (`/api/v1/rutas`, `/api/v1/vehiculos`, `/api/v1/repartidores`)

| code | HTTP | mensaje | origen (archivo:línea) | endpoints |
|---|---|---|---|---|
| CODIGO_GENERATION_FAILED | 500 | No se pudo generar un código de ruta único | rutaService.ts:29 | POST /rutas |
| REPARTIDOR_NOT_FOUND | 404 | Repartidor no encontrado | rutaService.ts:85,138,239 | POST /rutas, PATCH /rutas/:id, GET /rutas |
| ENVIO_NOT_FOUND | 404 | Envíos no encontrados | rutaService.ts:98 | POST /rutas |
| ENVIO_INVALID_STATE | 422 | El envío no está en estado PENDIENTE | rutaService.ts:107 | POST /rutas |
| ENVIO_ALREADY_ASSIGNED | 422 | El envío ya está asignado a otra ruta | rutaService.ts:114 | POST /rutas |
| VEHICULO_NOT_FOUND | 404 | Vehículo no encontrado | rutaService.ts:125,254 | POST /rutas, PATCH /rutas/:id |
| VEHICULO_NOT_AVAILABLE | 422 | El vehículo no está disponible | rutaService.ts:128,257 | POST /rutas, PATCH /rutas/:id |
| REPARTIDOR_NOT_AVAILABLE | 422 | El repartidor no está disponible | rutaService.ts:141,242 | POST /rutas, PATCH /rutas/:id |
| RUTA_NOT_FOUND | 404 | Ruta no encontrada | rutaService.ts:208,225,290 | GET /rutas/:id, PATCH /rutas/:id, GET /rutas/:id/optima |
| FORBIDDEN | 403 | No tienes acceso a esta ruta | rutaService.ts:214 | GET /rutas/:id |
| RUTA_INVALID_STATE | 422 | No se puede reasignar una ruta completada o cancelada | rutaService.ts:228 | PATCH /rutas/:id |
| PLACA_DUPLICADA | 409 | La placa ya está registrada | vehiculoService.ts:32 | POST /vehiculos |
| VEHICULO_EN_RUTA_ACTIVA | 422 | El vehículo está asignado a una ruta activa | vehiculoService.ts:60 | PATCH /vehiculos/:id |
| NOT_FOUND | 404 | Repartidor no encontrado | repartidorService.ts:47,55 | GET /repartidores/:id, PATCH /repartidores/:id |

#### Entregas, incidencias, notificaciones, reportes

| code | HTTP | mensaje | origen (archivo:línea) | endpoints |
|---|---|---|---|---|
| REPARTIDOR_NOT_FOUND | 404 | Repartidor no encontrado | entregaService.ts:39 | GET /entregas, GET /repartidor/entregas, POST /envios/:id/{confirmar,fallo} |
| ENVIO_NOT_FOUND | 404 | Envío no encontrado | entregaService.ts:68; incidenciaService.ts:42 | POST /envios/:id/{confirmar,fallo}, POST /incidencias |
| FORBIDDEN | 403 | El envío no está asignado a una ruta del repartidor | entregaService.ts:72-76 | POST /envios/:id/{confirmar,fallo} |
| INVALID_STATE_TRANSITION | 409 | No se puede modificar un envío en estado `<estado>` | entregaService.ts:80-84 | POST /envios/:id/{confirmar,fallo} |
| MISSING_FILE | 422 | Se requieren los archivos foto y firma | entregaController.ts:57-61 | POST /envios/:id/confirmar |
| INCIDENCIA_NOT_FOUND | 404 | Incidencia no encontrada | incidenciaService.ts:98 | PATCH /incidencias/:id |
| INVALID_STATE_TRANSITION | 409 | La incidencia ya se encuentra en ese estado | incidenciaService.ts:102-106 | PATCH /incidencias/:id |
| INVALID_STATE_TRANSITION | 409 | No se puede reabrir una incidencia resuelta | incidenciaService.ts:110-114 | PATCH /incidencias/:id |
| NOTIFICACION_NOT_FOUND | 404 | Notificación no encontrada | notificacionService.ts:105 | PATCH /notificaciones/:id/leer |
| VALIDATION_ERROR | 422 | desde debe ser anterior o igual a hasta | reportesService.ts:27,59 | GET /reportes/envios, GET /reportes/envios/export |

---

## 4. Modelo de datos

Resumen del esquema Prisma (`backend/prisma/schema.prisma`):

```
Usuario (1) ──┬── (1) Cliente ────< Envio
              ├── (1) Operador
              └── (1) Repartidor ──< Ruta >── Vehiculo
                                       └──< Envio (rutaId opcional)

Envio ──< EventoEnvio   (historial de estados, timestamp + lat/lng)
Envio ──< Incidencia    (tipo + estado)
Envio ──< Notificacion  (opcional, vía envioId)
Usuario ──< Notificacion
Usuario ──< PasswordResetToken
Usuario ──< RefreshToken
```

### Enums

| Enum | Valores |
|---|---|
| `Rol` | `CLIENTE`, `OPERADOR`, `REPARTIDOR` |
| `EstadoEnvio` | `PENDIENTE`, `EN_PREPARACION`, `EN_TRANSITO`, `EN_RUTA`, `ENTREGADO`, `CANCELADO`, `FALLIDO` |
| `EstadoRuta` | `PENDIENTE`, `EN_CURSO`, `EN_PROGRESO`, `COMPLETADA`, `CANCELADA` |
| `EstadoVehiculo` | `DISPONIBLE`, `EN_RUTA`, `MANTENIMIENTO`, `FUERA_SERVICIO` |
| `TipoNotificacion` | `ENVIO_CREADO`, `CAMBIO_ESTADO`, `ENTREGA_REALIZADA`, `RUTA_ASIGNADA`, `INCIDENCIA_REPORTADA` |
| `TipoIncidencia` | `ENTREGA_FALLIDA`, `CLIENTE_AUSENTE`, `DANIO`, `DIRECCION_INCORRECTA`, `OTRO` |
| `EstadoIncidencia` | `ABIERTA`, `EN_PROCESO`, `RESUELTA` |

### Modelos principales

| Modelo | Campos clave | Relaciones |
|---|---|---|
| `Usuario` | id, nombre, correo (único), password (bcrypt cost 12), telefono?, rol, activo, createdAt, updatedAt | 1:1 con `Cliente`/`Operador`/`Repartidor`; 1:N con `Notificacion`, `PasswordResetToken`, `RefreshToken` |
| `Cliente` | id, usuarioId (único) | 1:N con `Envio` |
| `Operador` | id, usuarioId (único) | — |
| `Repartidor` | id, usuarioId (único), licencia?, disponible | 1:N con `Ruta` |
| `Envio` | id, codigoSeguimiento (único, `TRK-YYYYMMDD-XXXXXXXX`), remitente, destinatario, direccionDestino, peso, dimensiones, descripcion?, estado, lat?, lng?, clienteId, rutaId?, evidenciaFoto?, firma?, fechaReprogramacion? | N:1 con `Cliente`, `Ruta?`; 1:N con `EventoEnvio`, `Incidencia`, `Notificacion` |
| `Ruta` | id, codigo (único), nombre?, estado, repartidorId, vehiculoId | N:1 con `Repartidor`, `Vehiculo`; 1:N con `Envio` |
| `Vehiculo` | id, placa (único), modelo, capacidad, estado | 1:N con `Ruta` |
| `EventoEnvio` | id, descripcion, estado, lat?, lng?, timestamp, envioId | N:1 con `Envio` — historial de cambios de estado/ubicación |
| `Incidencia` | id, tipo, descripcion, estado, foto?, nota?, envioId | N:1 con `Envio` |
| `Notificacion` | id, mensaje, tipo, leida, usuarioId, envioId? | N:1 con `Usuario`, `Envio?` |
| `PasswordResetToken` | id, token (único), usuarioId, expiresAt, usado | recuperación de contraseña (expira 1h) |
| `RefreshToken` | id, token (único), usuarioId, expiresAt, revocado | rotación de sesión (expira 7d) |

### Código de seguimiento

Formato `TRK-YYYYMMDD-XXXXXXXX`: fecha de creación (`YYYYMMDD`) + 8 caracteres alfanuméricos en mayúscula generados con `crypto.randomBytes`. Se verifica unicidad contra la base de datos antes de persistir; si hay colisión se reintenta hasta 3 veces y, si persiste, se lanza `CODIGO_GENERATION_FAILED` (500). El mismo esquema de generación/reintento se usa para `Ruta.codigo`.

## 5. Catálogo de endpoints

### 5.1 Autenticación — `/api/v1/auth`

> **Nota general:** todas las rutas bajo `/api/v1/auth` están protegidas por un
> rate limiter (`express-rate-limit`): máximo 10 solicitudes por minuto por IP
> (`windowMs: 60_000`, `max: 10`). El limiter se desactiva cuando
> `NODE_ENV === 'test'`.

#### POST /api/v1/auth/register

- **Auth:** Ninguna
- **Rol:** N/A
- **Implementación:** `controllers/authController.ts` función `registerHandler` (línea 62)
- **Descripción:** Registrar un nuevo usuario (cliente, operador o repartidor) y crear su perfil asociado según el rol.
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| nombre | string | sí | min 1 | Nombre del usuario |
| correo | string | sí | formato email válido | Correo electrónico |
| password | string | sí | min 8 caracteres | Contraseña |
| confirmPassword | string | sí | min 1; debe coincidir con `password` (refine, error en path `confirmPassword`) | Confirmación de contraseña |
| telefono | string | sí | min 1 | Teléfono del usuario |
| rol | enum | sí | uno de `CLIENTE`, `OPERADOR`, `REPARTIDOR` | Rol asignado al usuario |

- **Respuesta éxito (201):** `data: { id, correo, rol }`
- **Errores:** EMAIL_ALREADY_EXISTS (409)
- **Notas:** Hashea la contraseña con bcrypt (cost 12). Crea, dentro de una transacción, el registro en `Usuario` y el perfil correspondiente según `rol`: `Cliente`, `Operador` o `Repartidor` (este último con `disponible: true`).

#### POST /api/v1/auth/login

- **Auth:** Ninguna
- **Rol:** N/A
- **Implementación:** `controllers/authController.ts` función `loginHandler` (línea 12)
- **Descripción:** Autenticar usuario por correo y contraseña; devuelve access token y setea cookie de refresh token.
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| correo | string | sí | formato email válido | Correo electrónico |
| password | string | sí | min 1 | Contraseña |

- **Respuesta éxito (200):** `data: { accessToken, user: { id, nombre, correo, rol } }`
- **Errores:** INVALID_CREDENTIALS (401), USER_INACTIVE (403)
- **Notas:** Genera un JWT de acceso firmado con `JWT_SECRET` (expira en 15m). Genera un refresh token aleatorio (64 bytes hex), lo persiste con expiración a 7 días y lo envía en cookie httpOnly `refreshToken` (`secure` en producción, `sameSite: strict`, `maxAge` 7 días).

#### POST /api/v1/auth/refresh

- **Auth:** Ninguna (usa cookie `refreshToken`)
- **Rol:** N/A
- **Implementación:** `controllers/authController.ts` función `refreshHandler` (línea 33)
- **Descripción:** Renovar el access token a partir del refresh token almacenado en cookie.
- **Request body:** Ninguno (lee `req.cookies.refreshToken`)
- **Respuesta éxito (200):** `data: { accessToken }`
- **Errores:** MISSING_REFRESH_TOKEN (401, generado en el controller si la cookie está ausente), INVALID_REFRESH_TOKEN (401), EXPIRED_REFRESH_TOKEN (401)
- **Notas:** Revoca el refresh token usado y emite uno nuevo (rotación), persistido con expiración a 7 días, devuelto en la misma cookie httpOnly `refreshToken`.

#### POST /api/v1/auth/logout

- **Auth:** Ninguna (usa cookie `refreshToken`, opcional)
- **Rol:** N/A
- **Implementación:** `controllers/authController.ts` función `logoutHandler` (línea 80)
- **Descripción:** Cerrar sesión revocando el refresh token y limpiando la cookie.
- **Request body:** Ninguno (lee `req.cookies.refreshToken`, opcional)
- **Respuesta éxito (200):** `data: null`
- **Errores:** Ninguno propio (si no hay cookie o el token ya está revocado, no falla)
- **Notas:** Si existe un refresh token válido y no revocado, lo marca como revocado. Limpia la cookie `refreshToken`.

#### POST /api/v1/auth/forgot-password

- **Auth:** Ninguna
- **Rol:** N/A
- **Implementación:** `controllers/userController.ts` función `forgotPassword` (línea 32)
- **Descripción:** Solicitar el envío de un correo de recuperación de contraseña.
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| correo | string | sí | formato email válido | Correo del usuario que solicita el reseteo |

- **Respuesta éxito (200):** `data: null`, `message: "Si el correo existe recibirás un enlace de recuperación"`
- **Errores:** Ninguno propio (no revela si el correo existe o no)
- **Notas:** Si el correo no existe, no hace nada (mismo mensaje, sin error). Si existe, genera un token aleatorio (32 bytes hex), lo persiste con expiración de 1 hora y envía un email con `sendPasswordResetEmail` (enlace `${FRONTEND_URL}/reset-password?token=...`). En `NODE_ENV === 'test'` el envío de correo se omite. Para probar este flujo localmente sin SMTP real, ver Mailpit en `docker-compose.mail.yml`.

#### POST /api/v1/auth/reset-password

- **Auth:** Ninguna
- **Rol:** N/A
- **Implementación:** `controllers/userController.ts` función `resetPassword` (línea 50)
- **Descripción:** Restablecer la contraseña usando el token recibido por correo.
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| token | string | sí | min 1 | Token de recuperación recibido por correo |
| newPassword | string | sí | min 8 caracteres | Nueva contraseña |

- **Respuesta éxito (200):** `data: null`, `message: "Contraseña actualizada correctamente"`
- **Errores:** INVALID_RESET_TOKEN (400)
- **Notas:** Valida que el token exista, no esté usado y no haya expirado. Hashea la nueva contraseña con bcrypt (cost 12), actualiza la contraseña del usuario y marca el token como usado.

---

### 5.2 Perfil propio — `/api/v1/users/me`

> El router `users.ts` define la ruta `/` y se monta en `/api/v1/users/me`, por lo que la ruta final es `/api/v1/users/me`.

#### GET /api/v1/users/me

- **Auth:** Bearer token (authMiddleware)
- **Rol:** todos los roles autenticados
- **Implementación:** `controllers/userController.ts` función `getMe` (línea 5)
- **Descripción:** Obtener el perfil del usuario autenticado.
- **Respuesta éxito (200):** `data: PerfilDto`
- **Errores:** NOT_FOUND (404)

#### PATCH /api/v1/users/me

- **Auth:** Bearer token (authMiddleware)
- **Rol:** todos los roles autenticados
- **Implementación:** `controllers/userController.ts` función `updateMe` (línea 18)
- **Descripción:** Actualizar nombre y/o teléfono del usuario autenticado.
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| nombre | string | no | min 1 si se provee | Nuevo nombre |
| telefono | string | no | min 1 si se provee | Nuevo teléfono |

> Validación adicional (refine): debe proporcionarse al menos uno de `nombre` o `telefono`.

- **Respuesta éxito (200):** `data: PerfilDto`
- **Errores:** Ninguno propio de negocio (errores de validación Zod manejados por el `errorHandler` global)

---

### 5.3 Gestión de usuarios — `/api/v1/usuarios`

> Solo accesible para usuarios con rol OPERADOR (`roleMiddleware('OPERADOR')`).

#### GET /api/v1/usuarios

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/usuarioController.ts` función `listarUsuarios` (línea 8)
- **Descripción:** Listar usuarios del sistema con paginación y filtro opcional por rol.
- **Query params:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| page | number | no | entero positivo, default 1 | Número de página |
| limit | number | no | entero entre 1 y 100, default 20 | Tamaño de página |
| rol | enum | no | uno de `CLIENTE`, `OPERADOR`, `REPARTIDOR` | Filtrar por rol |

- **Respuesta éxito (200):** `data: UsuarioDto[]`, `meta: {total, page, limit, totalPages}`
- **Errores:** Ninguno propio

#### GET /api/v1/usuarios/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/usuarioController.ts` función `obtenerUsuario` (línea 27)
- **Descripción:** Obtener el detalle de un usuario por su ID.
- **Path params:** `id` (string, cuid del usuario)
- **Respuesta éxito (200):** `data: UsuarioDto`
- **Errores:** NOT_FOUND (404)

#### PATCH /api/v1/usuarios/:id/estado

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/usuarioController.ts` función `actualizarEstadoUsuario` (línea 45)
- **Descripción:** Activar o desactivar la cuenta de un usuario.
- **Path params:** `id` (string, cuid del usuario)
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| activo | boolean | sí | `.strict()` (no admite campos adicionales) | Nuevo estado de la cuenta |

- **Respuesta éxito (200):** `data: UsuarioDto`
- **Errores:** CANNOT_DEACTIVATE_SELF (409), NOT_FOUND (404)
- **Notas:** Un operador no puede desactivar su propia cuenta (`id === operadorId` extraído de `req.user`).

---

### 5.4 Envíos — `/api/v1/envios`

#### POST /api/v1/envios

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/envioController.ts` función `crearEnvioHandler` (línea 10)
- **Descripción:** Registrar un nuevo envío para un cliente existente.
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| remitente | string | sí | min 1 | Nombre del remitente |
| destinatario | string | sí | min 1 | Nombre del destinatario |
| direccionDestino | string | sí | min 1 | Dirección de entrega |
| peso | number | sí | > 0 | Peso del paquete |
| dimensiones | string | sí | regex `^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$` (formato `WxHxD`, ej. `30x20x15`) | Dimensiones del paquete |
| clienteId | string | sí | cuid válido | ID del cliente destinatario del envío |
| descripcion | string | no | — | Descripción opcional del contenido |

- **Respuesta éxito (201):** `data: EnvioResponseDto`
- **Errores:** CLIENTE_NOT_FOUND (404), CODIGO_GENERATION_FAILED (500)
- **Notas:** Genera `codigoSeguimiento` único (ver sección 4). Envía notificación al usuario del cliente con tipo `ENVIO_CREADO`.

#### GET /api/v1/envios

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/envioController.ts` función `listarEnviosHandler` (línea 28)
- **Descripción:** Listar envíos con paginación y filtros.
- **Query params:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| page | number | no | entero positivo, transform desde string, default 1 | Página solicitada |
| limit | number | no | entero positivo, transform desde string, default 20 | Tamaño de página |
| estado | EstadoEnvio | no | enum válido | Filtrar por estado del envío |
| cliente | string | no | — | Filtrar por nombre de cliente (contiene, insensible a mayúsculas) |
| codigo | string | no | — | Filtrar por código de seguimiento (contiene, insensible a mayúsculas) |

- **Respuesta éxito (200):** `data: EnvioListItemDto[]`, `meta: {total, page, limit, totalPages}`
- **Errores:** Ninguno específico
- **Notas:** Filtro `cliente` busca por `cliente.usuario.nombre`; filtro `codigo` busca por `codigoSeguimiento`.

#### GET /api/v1/envios/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/envioController.ts` función `obtenerDetalleHandler` (línea 46)
- **Descripción:** Obtener el detalle de un envío, incluyendo su historial de eventos.
- **Path params:** `id` (string, cuid del envío)
- **Respuesta éxito (200):** `data: EnvioDetalleDto`
- **Errores:** ENVIO_NOT_FOUND (404)
- **Notas:** Incluye `eventos` (historial de `EventoEnvio`) ordenados, cada uno con `lat`/`lng` opcionales (usados para tracking).

#### PATCH /api/v1/envios/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/envioController.ts` función `editarEnvioHandler` (línea 64)
- **Descripción:** Editar datos de un envío existente.
- **Path params:** `id` (string, cuid del envío)
- **Request body** (al menos un campo requerido, validado con `.refine`):

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| remitente | string | no | min 1 si se envía | Nombre del remitente |
| destinatario | string | no | min 1 si se envía | Nombre del destinatario |
| direccionDestino | string | no | min 1 si se envía | Dirección de entrega |
| peso | number | no | > 0 si se envía | Peso del paquete |
| dimensiones | string | no | regex `WxHxD` si se envía | Dimensiones del paquete |
| descripcion | string \| null | no | — | Descripción del contenido (acepta `null` para limpiar) |

- **Respuesta éxito (200):** `data: EnvioResponseDto`
- **Errores:** ENVIO_NOT_FOUND (404), VALIDATION_ERROR (400) si no se envía ningún campo editable

#### DELETE /api/v1/envios/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/envioController.ts` función `cancelarEnvioHandler` (línea 83)
- **Descripción:** Cancelar un envío en estado `PENDIENTE`.
- **Path params:** `id` (string, cuid del envío)
- **Respuesta éxito (200):** `data: CancelarEnvioResponseDto`
- **Errores:** ENVIO_NOT_FOUND (404), INVALID_STATE_TRANSITION (409)
- **Notas:** Solo permite cancelar envíos en estado `PENDIENTE`. Si el envío pertenecía a una ruta (`rutaId` no nulo), invoca `rutaService.verificarCierreRuta(rutaId)` para evaluar el cierre automático de la ruta.

#### POST /api/v1/envios/:id/reprogramar

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/envioController.ts` función `reprogramarEnvio` (línea 101)
- **Descripción:** Reprogramar la fecha de entrega de un envío (gestión de incidencias).
- **Path params:** `id` (string, cuid del envío)
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| fechaReprogramacion | Date (coerce) | sí | fecha válida y estrictamente futura (`> Date.now()`) | Nueva fecha programada para la entrega |

- **Respuesta éxito (200):** `data: ReprogramarEnvioResponseDto {id, codigoSeguimiento, estado, fechaReprogramacion}`
- **Errores:** ENVIO_NOT_FOUND (404), INVALID_STATE_TRANSITION (409) si el envío está `ENTREGADO` o `CANCELADO`
- **Notas:** Crea un evento de historial `Entrega reprogramada para <fechaIso>`. La respuesta devuelve `fechaReprogramacion` como ISO string.

#### POST /api/v1/envios/:id/confirmar y POST /api/v1/envios/:id/fallo

> Estos dos endpoints están definidos en `routes/envios.ts` pero implementados con
> `entregaController`/`entregaService` (módulo de entregas). Se documentan en
> detalle en **[5.10 Entregas (self-service repartidor)](#510-entregas-self-service-repartidor)**.

---

### 5.5 Clientes — `/api/v1/clientes`

#### GET /api/v1/clientes

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/clienteController.ts` función `searchClientesHandler` (línea 6)
- **Descripción:** Buscar clientes por nombre o correo (autocompletar para creación de envíos).
- **Query params:**

| campo | tipo | requerido | validación | descripción |
|---|---|---|---|---|
| search | string | no | se castea a string; default `''` | Texto de búsqueda contra `nombre` o `correo` del usuario asociado (contiene, insensible a mayúsculas) |

- **Respuesta éxito (200):** `data: ClienteSearchItemDto[]` (sin paginación, máx. 10 resultados)
- **Errores:** Ninguno específico
- **Notas:** No usa un validator Zod dedicado; el query param se convierte con `String(req.query.search ?? '')`. Resultado limitado con `take: 10`.

#### GET /api/v1/clientes/me/envios

- **Auth:** Bearer token (authMiddleware)
- **Rol:** CLIENTE
- **Implementación:** `controllers/clienteController.ts` función `misEnviosClienteHandler` (línea 16)
- **Descripción:** Listar los envíos propios del cliente autenticado, con paginación y filtro por estado.
- **Query params:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| page | number | no | entero positivo, transform desde string, default 1 | Página solicitada |
| limit | number | no | entero positivo, transform desde string, default 10 | Tamaño de página |
| estado | EstadoEnvio | no | enum válido | Filtrar por estado del envío |

- **Respuesta éxito (200):** `data: MisEnviosItemDto[]`, `meta: {total, page, limit, totalPages}`
- **Errores:** CLIENTE_NOT_FOUND (404) si el usuario autenticado no tiene perfil de cliente asociado
- **Notas:** Resuelve el `Cliente` a partir de `req.user!.id` vía `clienteRepository.findByUsuarioId`.

---

### 5.6 Tracking público — `/api/v1/tracking/:codigo`

#### GET /api/v1/tracking/:codigo

- **Auth:** Ninguna
- **Rol:** Público (sin restricción de rol)
- **Implementación:** `controllers/trackingController.ts` función `getTrackingByCodigo` (línea 5)
- **Descripción:** Consultar el estado y el historial de eventos de un envío a partir de su código de seguimiento (uso público, sin autenticación).
- **Path params:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| codigo | string | sí | regex `^TRK-\d{8}-[A-Z0-9]{8}$` | Código de seguimiento del envío |

- **Respuesta éxito (200):** `data: TrackingResponseDto`
- **Errores:** ENVIO_NOT_FOUND (404)
- **Notas:** Endpoint público (no usa `authMiddleware`). `ultimaActualizacion` corresponde al timestamp del último evento o, si no hay eventos, a `updatedAt` del envío.

### 5.7 Rutas — `/api/v1/rutas`

#### POST /api/v1/rutas

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/rutaController.ts` función `crearRuta` (línea 5)
- **Descripción:** Crear una nueva ruta asignando envíos, vehículo y repartidor.
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| enviosIds | string[] | sí | array de cuid válidos, min 1 | IDs de envíos |
| vehiculoId | string | sí | cuid válido | ID del vehículo |
| repartidorId | string | sí | cuid válido | ID del repartidor |

- **Respuesta éxito (201):** `data: RutaResponseDto`
- **Errores:** ENVIO_NOT_FOUND (404), ENVIO_INVALID_STATE (422), ENVIO_ALREADY_ASSIGNED (422), VEHICULO_NOT_FOUND (404), VEHICULO_NOT_AVAILABLE (422), REPARTIDOR_NOT_FOUND (404), REPARTIDOR_NOT_AVAILABLE (422), CODIGO_GENERATION_FAILED (500)
- **Notas:** Dentro de una transacción: envíos → `EN_RUTA`, vehículo → `EN_RUTA`, repartidor → `disponible: false`. Envía notificación `RUTA_ASIGNADA` al repartidor.

#### GET /api/v1/rutas

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR | REPARTIDOR
- **Implementación:** `controllers/rutaController.ts` función `listarRutas` (línea 23)
- **Descripción:** Listar rutas con paginación.
- **Query params:** `page`, `limit`, `repartidorId` (opcional)
- **Respuesta éxito (200):** `data: RutaResponseDto[]`, `meta: {total, page, limit, totalPages}`
- **Errores:** REPARTIDOR_NOT_FOUND (404)
- **Notas:** Un usuario con rol REPARTIDOR ve solo sus propias rutas.

#### GET /api/v1/rutas/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR | REPARTIDOR
- **Implementación:** `controllers/rutaController.ts` función `obtenerRuta` (línea 45)
- **Descripción:** Obtener el detalle de una ruta.
- **Respuesta éxito (200):** `data: RutaResponseDto`
- **Errores:** RUTA_NOT_FOUND (404), FORBIDDEN (403)

#### PATCH /api/v1/rutas/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/rutaController.ts` función `reasignarRuta` (línea 63)
- **Descripción:** Reasignar repartidor y/o vehículo de una ruta.
- **Request body:** `repartidorId` (opcional), `vehiculoId` (opcional)
- **Respuesta éxito (200):** `data: RutaResponseDto`
- **Errores:** RUTA_NOT_FOUND (404), RUTA_INVALID_STATE (422), REPARTIDOR_NOT_FOUND (404), REPARTIDOR_NOT_AVAILABLE (422), VEHICULO_NOT_FOUND (404), VEHICULO_NOT_AVAILABLE (422)

#### GET /api/v1/rutas/:id/optima

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/rutaController.ts` función `obtenerRutaOptima` (línea 82)
- **Descripción:** Calcular el orden óptimo de paradas de la ruta.
- **Respuesta éxito (200):** `data: RutaOptimaResponseDto`
- **Errores:** RUTA_NOT_FOUND (404)

---

### 5.8 Vehículos — `/api/v1/vehiculos`

#### POST /api/v1/vehiculos

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/vehiculoController.ts` función `crearVehiculo` (línea 9)
- **Descripción:** Registrar un nuevo vehículo.
- **Request body:** `placa`, `modelo`, `capacidad` (number)
- **Respuesta éxito (201):** `data: VehiculoResponseDto`
- **Errores:** PLACA_DUPLICADA (409)

#### GET /api/v1/vehiculos

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/vehiculoController.ts` función `listarVehiculos` (línea 27)
- **Descripción:** Listar vehículos.
- **Query params:** `estado` (opcional)
- **Respuesta éxito (200):** `data: VehiculoResponseDto[]`

#### PATCH /api/v1/vehiculos/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/vehiculoController.ts` función `actualizarEstadoVehiculo` (línea 45)
- **Descripción:** Actualizar el estado de un vehículo.
- **Request body:** `estado` (enum `EstadoVehiculo`)
- **Respuesta éxito (200):** `data: VehiculoResponseDto`
- **Errores:** VEHICULO_NOT_FOUND (404), VEHICULO_EN_RUTA_ACTIVA (422)

---

### 5.9 Repartidores (gestión) — `/api/v1/repartidores`

> Distinto de `/api/v1/repartidor` (self-service para el propio repartidor, ver 5.10).

#### GET /api/v1/repartidores

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/repartidorController.ts` función `listarRepartidores` (línea 8)
- **Descripción:** Listar repartidores.
- **Query params:** `page`, `limit`, `disponible` (opcional)
- **Respuesta éxito (200):** `data: RepartidorDto[]`, `meta: {total, page, limit, totalPages}`

#### GET /api/v1/repartidores/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/repartidorController.ts` función `obtenerRepartidor` (línea 27)
- **Descripción:** Obtener el detalle de un repartidor.
- **Respuesta éxito (200):** `data: RepartidorDetalleDto`
- **Errores:** NOT_FOUND (404)

#### PATCH /api/v1/repartidores/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/repartidorController.ts` función `actualizarRepartidor` (línea 45)
- **Descripción:** Actualizar disponibilidad y/o licencia de un repartidor.
- **Request body:** `disponible` (opcional), `licencia` (opcional)
- **Respuesta éxito (200):** `data: RepartidorDetalleDto`

---

### 5.10 Entregas (self-service repartidor)

Endpoints usados por la app/vista del REPARTIDOR para ver sus entregas asignadas y
registrar el resultado (entrega exitosa o fallida). Implementados en
`entregaController.ts` / `entregaService.ts`, montados en tres routers distintos
(`/api/v1/entregas`, `/api/v1/repartidor`, `/api/v1/envios`).

#### GET /api/v1/entregas

- **Auth:** Bearer token (authMiddleware)
- **Rol:** REPARTIDOR
- **Implementación:** `controllers/entregaController.ts` función `listarMisEntregas` (línea 9)
- **Descripción:** Listar las entregas (envíos) asignadas al repartidor autenticado, agrupadas en pendientes y completadas.
- **Query params:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| repartidorId | string | sí | literal `'me'` | Solo se admite el valor `me` |

- **Respuesta éxito (200):** `data: EntregasAgrupadasDto {pendientes: EntregaListItemDto[], completadas: EntregaListItemDto[]}`
- **Errores:** REPARTIDOR_NOT_FOUND (404)
- **Notas:** Pendientes = envíos en estado `PENDIENTE`/`EN_PREPARACION`/`EN_TRANSITO`/`EN_RUTA`; completadas = `ENTREGADO`/`FALLIDO`; `CANCELADO` se excluye de ambos grupos.

#### GET /api/v1/repartidor/entregas

- **Auth:** Bearer token (authMiddleware)
- **Rol:** REPARTIDOR
- **Implementación:** `controllers/entregaController.ts` función `listarMisEntregasRepartidor` (línea 27)
- **Descripción:** Endpoint self-service equivalente a `GET /entregas` (sin requerir el query param `repartidorId=me`).
- **Respuesta éxito (200):** `data: EntregasAgrupadasDto {pendientes, completadas}`
- **Errores:** REPARTIDOR_NOT_FOUND (404)
- **Notas:** Llama a la misma función de servicio `entregaService.listarMisEntregas`.

#### POST /api/v1/envios/:id/confirmar

- **Auth:** Bearer token (authMiddleware)
- **Rol:** REPARTIDOR
- **Implementación:** `controllers/entregaController.ts` función `confirmarEntrega` (línea 44)
- **Descripción:** Confirmar la entrega de un envío asignado al repartidor autenticado, adjuntando evidencia fotográfica y firma.
- **Path params:** `id` (string, cuid del envío)
- **Request body:** `multipart/form-data` (middleware `uploadConfirmacion`, multer memoryStorage)

| campo | tipo | requerido | validación | descripción |
|---|---|---|---|---|
| foto | file (image/jpeg \| image/png) | sí | máx. 5 MB, mimetype permitido | Evidencia fotográfica de la entrega |
| firma | file (image/jpeg \| image/png) | sí | máx. 5 MB, mimetype permitido | Firma del receptor |

- **Respuesta éxito (200):** `data: ConfirmarEntregaResponseDto {id, codigoSeguimiento, estado: "ENTREGADO", evidenciaFoto, firma, fechaEntrega}`
- **Errores:** MISSING_FILE (422) si faltan `foto` o `firma`, INVALID_FILE_TYPE (422), REPARTIDOR_NOT_FOUND (404), ENVIO_NOT_FOUND (404), FORBIDDEN (403) si el envío no pertenece a una ruta del repartidor, INVALID_STATE_TRANSITION (409) si el envío está en un estado terminal
- **Notas:** Guarda los archivos en `uploads/entregas/<envioId>/` y expone rutas públicas `/uploads/entregas/<envioId>/<archivo>`. Crea un `EventoEnvio` y cambia el estado del envío a `ENTREGADO`. Envía notificación al cliente con tipo `ENTREGA_REALIZADA` (incluye email).

#### POST /api/v1/envios/:id/fallo

- **Auth:** Bearer token (authMiddleware)
- **Rol:** REPARTIDOR
- **Implementación:** `controllers/entregaController.ts` función `registrarFallo` (línea 79)
- **Descripción:** Registrar un fallo en la entrega de un envío asignado al repartidor autenticado.
- **Path params:** `id` (string, cuid del envío)
- **Request body:** `multipart/form-data` (middleware `uploadFallo`, campo único `foto`)

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| nota | string | sí | min 1 | Motivo/observación del fallo de entrega |
| foto | file (image/jpeg \| image/png) | no | máx. 5 MB, mimetype permitido | Evidencia fotográfica opcional del fallo |

- **Respuesta éxito (200):** `data: RegistrarFalloResponseDto {id, codigoSeguimiento, estado: "FALLIDO", incidenciaId}`
- **Errores:** INVALID_FILE_TYPE (422), REPARTIDOR_NOT_FOUND (404), ENVIO_NOT_FOUND (404), FORBIDDEN (403) si el envío no pertenece a una ruta del repartidor, INVALID_STATE_TRANSITION (409) si el envío está en un estado terminal
- **Notas:** Si se adjunta `foto`, se guarda en `uploads/entregas/<envioId>/`. Cambia el estado del envío a `FALLIDO` y crea una `Incidencia` de tipo `ENTREGA_FALLIDA` (`incidenciaId`). Envía dos notificaciones al cliente: tipo `CAMBIO_ESTADO` (mensaje de fallo) y tipo `INCIDENCIA_REPORTADA` (con email).

> Ambos endpoints comparten la validación `obtenerEnvioModificable`: el envío debe
> pertenecer a una ruta del repartidor autenticado (`FORBIDDEN` 403 si no) y no
> estar en un estado terminal (`ENTREGADO`, `CANCELADO`, `FALLIDO`)
> (`INVALID_STATE_TRANSITION` 409 si lo está).

### 5.11 Incidencias — `/api/v1/incidencias`

#### POST /api/v1/incidencias

- **Auth:** Bearer token (authMiddleware)
- **Rol:** REPARTIDOR
- **Implementación:** `controllers/incidenciaController.ts` función `crearIncidencia` (línea 9)
- **Descripción:** Registrar una incidencia sobre un envío.
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| envioId | string | sí | cuid válido | ID del envío afectado |
| tipo | enum `TipoIncidencia` | sí | uno de los valores del enum Prisma | Tipo de incidencia |
| descripcion | string | sí | min 1 | Descripción de la incidencia |

- **Respuesta éxito (201):** `data: IncidenciaDto {id, tipo, descripcion, estado, foto, nota, envioId, createdAt, updatedAt}`
- **Errores:** ENVIO_NOT_FOUND (404)
- **Notas:** Crea notificación al cliente dueño del envío (tipo `INCIDENCIA_REPORTADA`), que dispara push por socket y, según el tipo, correo electrónico.

#### GET /api/v1/incidencias

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/incidenciaController.ts` función `listarIncidencias` (línea 27)
- **Descripción:** Listar incidencias con paginación y filtros opcionales.
- **Query params:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| page | number | no | string → int positivo, default 1 | Página solicitada |
| limit | number | no | string → int positivo, default 20 | Tamaño de página |
| tipo | enum `TipoIncidencia` | no | uno de los valores del enum Prisma | Filtrar por tipo |
| estado | enum `EstadoIncidencia` | no | uno de los valores del enum Prisma | Filtrar por estado |

- **Respuesta éxito (200):** `data: IncidenciaListItemDto[]`, `meta: PaginationMeta {total, page, limit, totalPages}`
- **Errores:** Ninguno propio
- **Notas:** Cada item incluye `envioCodigoSeguimiento` (proyección desde la relación `envio`).

#### PATCH /api/v1/incidencias/:id

- **Auth:** Bearer token (authMiddleware)
- **Rol:** OPERADOR
- **Implementación:** `controllers/incidenciaController.ts` función `actualizarEstadoIncidencia` (línea 45)
- **Descripción:** Actualizar el estado de una incidencia.
- **Path params:** `id` (string, ID de la incidencia)
- **Request body:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| estado | enum `EstadoIncidencia` | sí | uno de los valores del enum Prisma | Nuevo estado de la incidencia |

- **Respuesta éxito (200):** `data: IncidenciaDto`
- **Errores:** INCIDENCIA_NOT_FOUND (404), INVALID_STATE_TRANSITION (409)
- **Notas:** Si `estado=RESUELTA` y la incidencia es de tipo `ENTREGA_FALLIDA` y el envío asociado está en estado `FALLIDO`, se ejecuta una **reactivación**: el envío vuelve a `EN_RUTA` (transacción en `incidenciaRepository.resolverConReactivacionEnvio`, que también registra un `EventoEnvio`) y se notifica al cliente (tipo `CAMBIO_ESTADO`). No se permite reabrir una incidencia ya `RESUELTA`, ni transicionar al mismo estado actual (ver flujo 7.3).

---

### 5.12 Notificaciones — `/api/v1/notificaciones`

#### GET /api/v1/notificaciones

- **Auth:** Bearer token (authMiddleware)
- **Rol:** cualquier usuario autenticado (sin `roleMiddleware`)
- **Implementación:** `controllers/notificacionController.ts` función `listarNotificaciones` (línea 5)
- **Descripción:** Listar notificaciones del usuario autenticado, paginadas.
- **Query params:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| page | number | no | string → int positivo, default 1 | Página solicitada |
| limit | number | no | string → int positivo, default 20 | Tamaño de página |

- **Respuesta éxito (200):** `data: NotificacionDto[]`, `meta: PaginationMeta {total, page, limit, totalPages}`
- **Errores:** Ninguno propio
- **Notas:** Filtra siempre por `usuarioId` del token (cada usuario ve solo sus notificaciones).

#### PATCH /api/v1/notificaciones/:id/leer

- **Auth:** Bearer token (authMiddleware)
- **Rol:** cualquier usuario autenticado (sin `roleMiddleware`)
- **Implementación:** `controllers/notificacionController.ts` función `marcarNotificacionComoLeida` (línea 24)
- **Descripción:** Marcar una notificación propia como leída.
- **Path params:** `id` (string, ID de la notificación)
- **Respuesta éxito (200):** `data: NotificacionDto`
- **Errores:** NOTIFICACION_NOT_FOUND (404)
- **Notas:** Si la notificación pertenece a otro usuario, también devuelve `NOTIFICACION_NOT_FOUND` (no revela existencia). Si ya estaba leída, devuelve el DTO sin volver a actualizar.

---

### 5.13 Dashboard — `/api/v1/dashboard`

> Todos los endpoints requieren rol OPERADOR.

#### GET /api/v1/dashboard/metrics

- **Implementación:** `controllers/dashboardController.ts` función `getMetricsHandler` (línea 4)
- **Descripción:** Obtener métricas agregadas generales del sistema.
- **Respuesta éxito (200):** `data: DashboardMetricsDto {totalEnvios, enRuta, entregados, incidenciasAbiertas}`
- **Notas:** Datos agregados vía `dashboardRepository.getMetrics()` (conteos de envíos por estado e incidencias abiertas).

#### GET /api/v1/dashboard/envios-recientes

- **Implementación:** `controllers/dashboardController.ts` función `getEnviosRecientesHandler` (línea 17)
- **Descripción:** Obtener los envíos más recientes del sistema.
- **Respuesta éxito (200):** `data: EnvioRecienteDto[] {codigoSeguimiento, clienteNombre, estado, createdAt}`
- **Notas:** `clienteNombre` se proyecta desde `envio.cliente.usuario.nombre`.

#### GET /api/v1/dashboard/rutas-pendientes

- **Implementación:** `controllers/dashboardController.ts` función `getRutasPendientesHandler` (línea 30)
- **Descripción:** Obtener rutas pendientes de iniciar/asignar.
- **Respuesta éxito (200):** `data: RutaPendienteDto[] {id, codigo, nombre, createdAt}`

#### GET /api/v1/dashboard/vehiculos-disponibles

- **Implementación:** `controllers/dashboardController.ts` función `getVehiculosDisponiblesHandler` (línea 43)
- **Descripción:** Obtener vehículos actualmente disponibles.
- **Respuesta éxito (200):** `data: VehiculoDisponibleDto[] {id, placa, modelo, estado}`

---

### 5.14 Reportes — `/api/v1/reportes`

> Todos los endpoints requieren rol OPERADOR.

#### GET /api/v1/reportes/envios/export

- **Implementación:** `controllers/reportesController.ts` función `exportEnviosCSVHandler` (línea 19)
- **Descripción:** Exportar el reporte de envíos en un rango de fechas como archivo CSV descargable.
- **Query params:**

| campo | tipo | requerido | validación (Zod) | descripción |
|---|---|---|---|---|
| desde | string | sí | min 1 (refine: `desde <= hasta`) | Fecha de inicio del rango (`YYYY-MM-DD`) |
| hasta | string | sí | min 1 | Fecha de fin del rango (`YYYY-MM-DD`) |

- **Respuesta éxito (200):** Archivo CSV (no JSON). `Content-Type: text/csv`, `Content-Disposition: attachment; filename="envios-<desde>-<hasta>.csv"`. Cabecera: `codigoSeguimiento,estado,remitente,destinatario,direccionDestino,createdAt`, una línea por envío en el rango.
- **Errores:** VALIDATION_ERROR (422) si `desde > hasta`
- **Notas:** **Importante** — esta ruta está registrada ANTES de `/envios/:id`-like routes para que Express no interprete `export` como un parámetro `:id`. `desde` se interpreta como `T00:00:00.000Z` y `hasta` como `T23:59:59.999Z` (rango inclusivo). Los campos se escapan con comillas dobles si contienen comas, comillas o saltos de línea.

#### GET /api/v1/reportes/envios

- **Implementación:** `controllers/reportesController.ts` función `getEnviosReportHandler` (línea 5)
- **Descripción:** Obtener reporte estadístico de envíos en un rango de fechas (totales por estado y por día).
- **Query params:** igual que `/reportes/envios/export` (`desde`, `hasta`)
- **Respuesta éxito (200):** `data: ReporteEnviosDto {porEstado: {estado, total}[], porDia: {fecha, total}[], totalPeriodo}`
- **Errores:** VALIDATION_ERROR (422) si `desde > hasta`
- **Notas:** `porDia` agrupa por `createdAt` truncado a `YYYY-MM-DD`, ordenado ascendentemente. `totalPeriodo` es la suma de `porEstado[].total`.

#### GET /api/v1/reportes/repartidores

- **Implementación:** `controllers/reportesController.ts` función `getRepartidoresRankingHandler` (línea 38)
- **Descripción:** Obtener ranking de repartidores por entregas completadas y fallidas.
- **Respuesta éxito (200):** `data: RepartidorRankingDto[] {id, nombre, totalEntregados, totalFallidos}`
- **Notas:** Para cada repartidor se recorren sus rutas y los envíos de cada ruta: `ENTREGADO` suma a `totalEntregados`; `FALLIDO` o `CANCELADO` suma a `totalFallidos`. Resultado ordenado descendentemente por `totalEntregados`.

## 6. Tiempo real (Socket.IO)

El servidor Socket.IO se inicializa en `backend/src/index.ts` sobre el mismo
servidor HTTP de Express, con CORS configurado igual que la API REST.

### 6.1 Autenticación de sockets

Toda conexión pasa por un middleware global `io.use(...)` (`index.ts`, líneas 83-100) que:

1. Lee el token JWT desde `socket.handshake.auth.token`.
2. Si no hay token, rechaza la conexión con `Error('UNAUTHORIZED')`.
3. Verifica el token con `jwt.verify(token, JWT_SECRET)`.
4. Si es válido, guarda `socket.data.userId = payload.id` y permite la conexión.
5. Si el token es inválido o expiró (`TokenExpiredError` / `JsonWebTokenError`), rechaza con `Error('UNAUTHORIZED')`.

### 6.2 Tracking (`backend/src/sockets/tracking.ts`)

Registrado vía `registerTrackingHandlers(io, socket)` para cada conexión.

#### Evento `location:update` (cliente → servidor)

- **Payload esperado:** `{ envioId: string (cuid), lat: number, lng: number }` (validado con `locationUpdateSchema`).
- **Flujo:**
  1. Si el payload no pasa la validación Zod, emite `tracking:error` con `{ message: 'Payload inválido' }` al socket emisor y termina.
  2. Busca el envío por `envioId` (`envioRepository.findById`); si no existe, emite `tracking:error` con `{ message: 'Envío no encontrado' }` y termina.
  3. Crea un `EventoEnvio` de ubicación (`trackingRepository.createEventoUbicacion`) con el `estado` actual del envío, `descripcion: 'Actualización de ubicación'`, `lat`, `lng`.
  4. Emite `tracking:location` con `{ envioId, lat, lng, timestamp }` a la sala `tracking:${envioId}` (todos los sockets unidos a esa sala — clientes/operadores viendo el tracking de ese envío).

#### Evento `tracking:join` (cliente → servidor)

- **Payload esperado:** `{ envioId: string }`.
- **Efecto:** el socket se une a la sala `tracking:${envioId}` (`socket.join`).

#### Evento `tracking:leave` (cliente → servidor)

- **Payload esperado:** `{ envioId: string }`.
- **Efecto:** el socket abandona la sala `tracking:${envioId}` (`socket.leave`).

#### Eventos emitidos por el servidor

- `tracking:error` → `{ message: string }` (al socket emisor, ante payload inválido o envío inexistente).
- `tracking:location` → `{ envioId, lat, lng, timestamp }` (a toda la sala `tracking:${envioId}`).

### 6.3 Notificaciones (`backend/src/sockets/notificaciones.ts`)

- **Namespace:** raíz (`/`), mismo servidor Socket.IO compartido.
- **Sala (room):** al conectar, `registerNotificacionHandlers(io, socket)` une al socket a la sala `user:<userId>` (vía `socket.join`), usando el `userId` extraído del JWT.
- **Evento emitido:** `notification:new` — emitido por `notificacionService.notificar()` (`notificacionService.ts:58`) hacia la sala `user:<usuarioId>`: `io.to(\`user:${input.usuarioId}\`).emit('notification:new', dto)`.
- **Payload del evento `notification:new`:** `NotificationNewPayload` (alias de `NotificacionDto`): `{id, tipo: TipoNotificacion, mensaje, leida, envioId: string | null, createdAt}`.
- **Disparadores de `notificacionService.notificar()`:**
  - `envioService.crear` → tipo `ENVIO_CREADO` (también envía email)
  - `rutaService.crear` → tipo `RUTA_ASIGNADA` (al repartidor)
  - `entregaService.confirmarEntrega` → tipo `ENTREGA_REALIZADA` (también envía email)
  - `entregaService.registrarFallo` → tipo `CAMBIO_ESTADO` y tipo `INCIDENCIA_REPORTADA` (esta última también envía email)
  - `incidenciaService.crear` → tipo `INCIDENCIA_REPORTADA` (también envía email)
  - `incidenciaService.actualizarEstado` (reactivación de envío) → tipo `CAMBIO_ESTADO`
- **Notas:** El envío de correo (`sendNotificationEmail`) es best-effort — los errores se capturan y loguean sin propagar, para no afectar la respuesta HTTP/socket. Tipos de notificación que disparan email: `ENVIO_CREADO`, `ENTREGA_REALIZADA`, `INCIDENCIA_REPORTADA` (`EMAIL_TIPOS`).

---

## 7. Flujos clave end-to-end

### 7.1 Registro, login y sesión

1. `POST /api/v1/auth/register` (sin auth) — crea `Usuario` + perfil (`Cliente`/`Operador`/`Repartidor`) según `rol`.
2. `POST /api/v1/auth/login` — devuelve `accessToken` (15 min) en el body y setea cookie httpOnly `refreshToken` (7 días).
3. El frontend guarda `accessToken` en memoria/Zustand y lo envía como `Authorization: Bearer <token>` en cada request.
4. Cuando el `accessToken` expira (`EXPIRED_TOKEN` 401), el frontend llama `POST /api/v1/auth/refresh` (usa la cookie automáticamente) para obtener un nuevo `accessToken`; el refresh token se rota.
5. `POST /api/v1/auth/logout` revoca el refresh token y limpia la cookie.

**Recuperación de contraseña** (independiente, sin sesión):
`POST /api/v1/auth/forgot-password` → email con enlace `${FRONTEND_URL}/reset-password?token=...` (vía Mailpit en desarrollo, ver `docker-compose.mail.yml`) → `POST /api/v1/auth/reset-password` con `token` + `newPassword`.

### 7.2 Ciclo de vida de un envío: crear → asignar ruta → tracking → entrega

1. **OPERADOR** crea el envío: `POST /api/v1/envios` → `EstadoEnvio.PENDIENTE`, se genera `codigoSeguimiento` único, se notifica al cliente (`ENVIO_CREADO`).
2. **CLIENTE** puede consultar su envío en `GET /api/v1/clientes/me/envios` o públicamente vía `GET /api/v1/tracking/:codigo` (sin auth).
3. **OPERADOR** agrupa uno o más envíos `PENDIENTE` en una ruta: `POST /api/v1/rutas` con `enviosIds`, `vehiculoId`, `repartidorId`. Efectos en transacción: envíos → `EN_RUTA`, vehículo → `EN_RUTA`, repartidor → `disponible: false`. Se notifica al repartidor (`RUTA_ASIGNADA`).
4. **REPARTIDOR** ve sus rutas (`GET /api/v1/rutas?repartidorId=me` o `GET /api/v1/rutas/:id/optima` para el orden óptimo de paradas) y sus entregas (`GET /api/v1/repartidor/entregas`).
5. Mientras se desplaza, el cliente móvil del repartidor emite por socket `location:update` `{envioId, lat, lng}` → el backend crea un `EventoEnvio` y rebroadcast `tracking:location` a la sala `tracking:${envioId}`, donde el CLIENTE/OPERADOR están unidos vía `tracking:join` para ver el mapa Leaflet en vivo.
6. Al llegar al destino, el repartidor:
   - **Éxito:** `POST /api/v1/envios/:id/confirmar` (multipart, `foto` + `firma`) → envío → `ENTREGADO`, se guarda evidencia, se notifica al cliente (`ENTREGA_REALIZADA`, con email).
   - **Fallo:** `POST /api/v1/envios/:id/fallo` (multipart, `nota` + `foto` opcional) → envío → `FALLIDO`, se crea automáticamente una `Incidencia` tipo `ENTREGA_FALLIDA`, se notifica al cliente dos veces (`CAMBIO_ESTADO` y `INCIDENCIA_REPORTADA`, con email) → continúa en el flujo 7.3.
7. Si todos los envíos de la ruta llegan a un estado terminal (`ENTREGADO`/`FALLIDO`/`CANCELADO`), `rutaService.verificarCierreRuta` cierra la ruta automáticamente.

### 7.3 Gestión de incidencias y reactivación de entregas fallidas

1. Una incidencia se crea de dos formas: automáticamente al registrar un fallo de entrega (`POST /api/v1/envios/:id/fallo`, tipo `ENTREGA_FALLIDA`) o manualmente por el REPARTIDOR (`POST /api/v1/incidencias`, cualquier `TipoIncidencia`).
2. **OPERADOR** lista incidencias (`GET /api/v1/incidencias`, filtrable por `tipo`/`estado`) y actualiza su estado (`PATCH /api/v1/incidencias/:id`): `ABIERTA → EN_PROCESO → RESUELTA` (no se permite reabrir una `RESUELTA` ni transicionar al mismo estado).
3. **Caso especial — reactivación:** si la incidencia es `ENTREGA_FALLIDA`, su envío asociado está en `FALLIDO`, y el operador la marca `RESUELTA`, el sistema ejecuta `incidenciaRepository.resolverConReactivacionEnvio` en una única transacción: la incidencia → `RESUELTA`, el envío → `EN_RUTA` (vuelve a estar disponible para entrega), y se registra un `EventoEnvio` con descripción "Entrega reactivada tras resolución de incidencia". Se notifica al cliente (`CAMBIO_ESTADO`) mencionando el `codigoSeguimiento`.
4. El envío reactivado vuelve a aparecer en `GET /api/v1/entregas` / `GET /api/v1/repartidor/entregas` dentro del grupo `pendientes`, y el repartidor puede confirmarlo o reportar un nuevo fallo (flujo 7.2, paso 6) normalmente.

### 7.4 Notificaciones en tiempo real

1. Cualquier acción que llame a `notificacionService.notificar({usuarioId, tipo, mensaje, envioId?})` (ver disparadores en 6.3) persiste una `Notificacion` y emite `notification:new` por socket a la sala `user:<usuarioId>`.
2. El frontend, conectado al socket con su JWT, escucha `notification:new` y actualiza la campana de notificaciones en tiempo real (sin necesidad de poll).
3. El usuario consulta su historial paginado con `GET /api/v1/notificaciones` y marca una como leída con `PATCH /api/v1/notificaciones/:id/leer`.
4. Si el `tipo` está en `EMAIL_TIPOS` (`ENVIO_CREADO`, `ENTREGA_REALIZADA`, `INCIDENCIA_REPORTADA`), además se envía un correo best-effort (`sendNotificationEmail`).

### 7.5 Dashboard y reportes operativos (OPERADOR)

1. `GET /api/v1/dashboard/metrics` — vista general (`totalEnvios`, `enRuta`, `entregados`, `incidenciasAbiertas`).
2. `GET /api/v1/dashboard/envios-recientes`, `GET /api/v1/dashboard/rutas-pendientes`, `GET /api/v1/dashboard/vehiculos-disponibles` — widgets de apoyo para la operación diaria.
3. Para análisis por rango de fechas: `GET /api/v1/reportes/envios?desde=...&hasta=...` (totales por estado y por día) y `GET /api/v1/reportes/envios/export?desde=...&hasta=...` (mismo rango, descarga CSV).
4. `GET /api/v1/reportes/repartidores` — ranking de repartidores por entregas completadas vs. fallidas, útil para evaluar desempeño.

## 8. Apéndice: Tipos / DTOs

### Paginación común

- `PaginationMeta`: `{total: number, page: number, limit: number, totalPages: number}`

### Auth, perfil y usuarios

- `AuthUserPayload`: `{id, nombre, correo, rol}` (usuario embebido en la respuesta de login)
- `LoginResult`: `{accessToken, user: AuthUserPayload, refreshTokenValue}` (`refreshTokenValue` se envía solo vía cookie, no en el body)
- `RefreshResult`: `{accessToken, newRefreshTokenValue}` (`newRefreshTokenValue` se envía solo vía cookie)
- `RegisterResult`: `{id, correo, rol}`
- `PerfilDto`: `{id, nombre, correo, telefono: string | null, rol, createdAt, updatedAt}`
- `UpdatePerfilInput`: `{nombre?, telefono?}`
- `UsuarioDto`: `{id, nombre, correo, rol, telefono: string | null, activo, createdAt}`
- `ListaUsuariosResponse`: `{data: UsuarioDto[], meta: PaginationMeta}`
- `ListarUsuariosInput`: `{page, limit, rol?}`
- `ActualizarEstadoUsuarioDto`: `{activo: boolean}`

### Envíos, clientes, tracking

- `EnvioResponseDto`: `{id, codigoSeguimiento, estado, remitente, destinatario, direccionDestino, peso, dimensiones, descripcion, clienteId, createdAt}`
- `EnvioListItemDto`: `{id, codigoSeguimiento, estado, remitente, destinatario, clienteId, clienteNombre, createdAt}`
- `EnvioDetalleDto`: `{id, codigoSeguimiento, estado, remitente, destinatario, direccionDestino, peso, dimensiones, descripcion, clienteId, rutaId, createdAt, updatedAt, eventos: EventoEnvioDto[]}`
- `EventoEnvioDto`: `{id, estado, descripcion, lat, lng, timestamp}`
- `CancelarEnvioResponseDto`: `{id, codigoSeguimiento, estado}`
- `ReprogramarEnvioResponseDto`: `{id, codigoSeguimiento, estado, fechaReprogramacion}`
- `MisEnviosItemDto`: `{id, codigoSeguimiento, estado, destinatario, createdAt}`
- `PaginatedEnviosResponse`: `{data: EnvioListItemDto[], meta: PaginationMeta}`
- `ClienteSearchItemDto`: `{id, usuario: {nombre, correo}}`
- `TrackingResponseDto`: `{envioId, codigoSeguimiento, estado, remitente, destinatario, direccionDestino, ultimaActualizacion, eventos: TrackingEventoDto[]}`
- `TrackingEventoDto`: `{id, estado, descripcion, lat, lng, timestamp}`

### Rutas, vehículos, repartidores

- `RutaResponseDto`: `{id, codigo, estado, createdAt, updatedAt, vehiculo, repartidor, envios}`
- `VehiculoResponseDto`: `{id, placa, modelo, capacidad, estado, createdAt, updatedAt}`
- `VehiculoDisponibleDto`: `{id, placa, modelo, estado: EstadoVehiculo}`
- `RepartidorDto` / `RepartidorDetalleDto`: `{id, licencia: string | null, disponible, usuario: {id, nombre, correo, telefono: string | null}}`
- `RutaOptimaResponseDto`: `{paradas: EnvioOrdenadoDto[], advertencia}`
- `EnvioOrdenadoDto`: `{orden, envioId, codigoSeguimiento, direccionDestino, lat, lng}`
- `RutaPendienteDto`: `{id, codigo, nombre: string | null, createdAt}`

### Entregas, incidencias, notificaciones

- `EntregaListItemDto`: `{id, codigoSeguimiento, estado: EstadoEnvio, destinatario, direccionDestino, rutaId: string | null, updatedAt}`
- `EntregasAgrupadasDto`: `{pendientes: EntregaListItemDto[], completadas: EntregaListItemDto[]}`
- `ConfirmarEntregaResponseDto`: `{id, codigoSeguimiento, estado: "ENTREGADO", evidenciaFoto, firma, fechaEntrega}`
- `RegistrarFalloResponseDto`: `{id, codigoSeguimiento, estado: "FALLIDO", incidenciaId}`
- `IncidenciaDto`: `{id, tipo: TipoIncidencia, descripcion, estado: EstadoIncidencia, foto: string | null, nota: string | null, envioId, createdAt, updatedAt}`
- `IncidenciaListItemDto`: `{id, tipo: TipoIncidencia, descripcion, estado: EstadoIncidencia, envioId, envioCodigoSeguimiento, createdAt}`
- `PaginatedIncidenciasResponse`: `{data: IncidenciaListItemDto[], meta: PaginationMeta}`
- `NotificacionDto`: `{id, tipo: TipoNotificacion, mensaje, leida: boolean, envioId: string | null, createdAt}`
- `PaginatedNotificacionesResponse`: `{data: NotificacionDto[], meta: PaginationMeta}`

### Dashboard y reportes

- `DashboardMetricsDto`: `{totalEnvios, enRuta, entregados, incidenciasAbiertas}`
- `EnvioRecienteDto`: `{codigoSeguimiento, clienteNombre, estado: EstadoEnvio, createdAt}`
- `ReporteEnviosFiltroDto`: `{desde: string, hasta: string}`
- `ReporteEnviosDto`: `{porEstado: {estado, total}[], porDia: {fecha, total}[], totalPeriodo}`
- `RepartidorRankingDto`: `{id, nombre, totalEntregados, totalFallidos}`

