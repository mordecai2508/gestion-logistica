# docs/architecture.md — Arquitectura del Sistema

> Leer este archivo antes de implementar cualquier feature. Define qué significa
> "buen trabajo" en este proyecto.

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TypeScript + TanStack Query + Zustand + Shadcn/UI + Leaflet |
| Backend | Node.js + Express + TypeScript + Prisma ORM |
| Base de datos | PostgreSQL |
| Auth | JWT (accessToken 15 min + refreshToken 7 días httpOnly cookie) |
| Real-time | Socket.IO |
| Validación | Zod (backend y frontend) |
| Tests backend | Jest + Supertest |
| Tests frontend | Vitest + Testing Library |

---

## Estructura de capas (backend)

```
backend/src/
├── routes/          → define endpoints, aplica middlewares
├── middlewares/     → authMiddleware, roleMiddleware, rateLimiter, validación Zod
├── controllers/     → extrae params, llama al servicio, devuelve respuesta HTTP
├── services/        → lógica de negocio, orquesta repositorios
├── repositories/    → acceso a Prisma, CERO lógica de negocio
├── sockets/         → manejadores Socket.IO (location:update, notification:new)
├── types/           → interfaces y DTOs compartidos
└── validators/      → schemas Zod
```

**Regla crítica:** Los controladores no contienen lógica de negocio.
Los repositorios no contienen validaciones. Violarlo es un error de arquitectura.

---

## Estructura de capas (frontend)

```
frontend/src/
├── services/        → llamadas HTTP (fetch/axios); NINGÚN componente llama directamente a la API
├── hooks/           → TanStack Query (useQuery, useMutation); estado del servidor aquí y solo aquí
├── store/           → Zustand para estado del cliente (auth, UI)
├── components/
│   ├── ui/          → extensiones de Shadcn/UI; no re-estilar primitivos directamente
│   └── shared/      → componentes reutilizables entre features
├── features/
│   ├── auth/        → Login, Registro, Perfil
│   ├── envios/      → Crear, Consultar, Detalle
│   ├── tracking/    → RastrearPaquete (mapa Leaflet)
│   ├── rutas/       → GestionRutas
│   ├── vehiculos/   → GestionVehiculos
│   ├── repartidor/  → VistaRepartidor, ConfirmacionEntrega
│   ├── incidencias/ → GestionIncidencias
│   └── notificaciones/ → Notificaciones
└── router/          → React Router con ProtectedRoute por rol
```

---

## Autenticación y roles

- Login devuelve `accessToken` (15 min, body) + `refreshToken` (7 días, httpOnly cookie).
- `authMiddleware` verifica el JWT en `Authorization: Bearer <token>`.
- `roleMiddleware(rol)` restringe endpoints por rol (`CLIENTE`, `OPERADOR`, `REPARTIDOR`).
- Refresh: `POST /api/v1/auth/refresh` rota el refreshToken y emite nuevo accessToken.
- El frontend implementa `ProtectedRoute` que lee el rol del token decodificado.

| Rol | Rutas frontend permitidas |
|---|---|
| CLIENTE | `/tracking`, `/mis-envios`, `/notificaciones`, `/perfil` |
| OPERADOR | `/dashboard`, `/envios/*`, `/rutas/*`, `/vehiculos/*`, `/incidencias`, `/reportes`, `/notificaciones`, `/perfil` |
| REPARTIDOR | `/repartidor/*`, `/entregas/*`, `/notificaciones`, `/perfil` |

---

## Tracking en tiempo real (Socket.IO)

1. El repartidor emite `location:update` con `{ envioId, lat, lng }`.
2. El backend recibe el evento en `sockets/tracking.ts` y hace rebroadcast a la sala `tracking:${envioId}`.
3. El frontend (cliente/operador) se une a esa sala al abrir la pantalla de rastreo y actualiza el marcador en Leaflet.

---

## Código de seguimiento

Formato: `TRK-YYYYMMDD-XXXXXXXX` (8 chars alfanuméricos aleatorios, uppercase).
Generado en el servicio de envíos. Verificar unicidad contra DB antes de persistir.
Si hay colisión, reintentar hasta 3 veces, luego lanzar error 500.

---

## Modelo de datos (Prisma)

```
Usuario (base)
  ├── Cliente        (1:1 con Usuario, rol = CLIENTE)
  ├── Operador       (1:1 con Usuario, rol = OPERADOR)
  └── Repartidor     (1:1 con Usuario, rol = REPARTIDOR; agrega licencia, disponible)

Envio
  ├── pertenece a Cliente
  ├── asignado a Ruta (opcional)
  ├── tiene muchos EventoEnvio   (historial de estados con timestamp + lat/lng)
  ├── tiene muchas Incidencia
  └── tiene muchas Notificacion

Ruta
  ├── asignada a un Repartidor
  ├── asignada a un Vehiculo
  └── contiene muchos Envio

Vehiculo (estado: DISPONIBLE | EN_RUTA | MANTENIMIENTO | FUERA_SERVICIO)
Incidencia (tipo: ENTREGA_FALLIDA | CLIENTE_AUSENTE | DAÑO | DIRECCION_INCORRECTA | OTRO)
           (estado: ABIERTA | EN_PROCESO | RESUELTA)
EventoEnvio → registra cada cambio de estado de Envio (timestamp + lat/lng + descripción)
Notificacion → mensaje persistido + leído/no leído por usuario
```

---

## Convenciones de API REST

- Prefijo: `/api/v1/` para todos los endpoints.
- Respuesta exitosa: `{ data: <payload>, message: string, status: number }`.
- Respuesta de error: `{ error: string, message: string, statusCode: number }`.
- Paginación: `?page=1&limit=20` → respuesta incluye `{ data: [], meta: { total, page, limit, totalPages } }`.
- Fechas en ISO 8601 (UTC).

---

## Seguridad (no omitir)

- `helmet()` y `cors({ origin: FRONTEND_URL, credentials: true })` configurados en Express.
- Rate limiting con `express-rate-limit` en `/api/v1/auth/*` (máx 10 req/min por IP).
- Inputs sanitizados con Zod antes de llegar a Prisma. Nunca concatenar strings para queries.
- Archivos subidos (fotos de incidencias, firmas): validar MIME type (`image/jpeg`, `image/png`) y tamaño máximo 5 MB.
- Passwords hasheados con bcrypt (rounds = 12).
- Variables de entorno nunca en git; usar `.env.example` como plantilla.
