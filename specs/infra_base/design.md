# Design — infra_base

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js 20 + Express 4 + TypeScript 5 + Prisma 5 + PostgreSQL |
| Frontend | Vite 5 + React 18 + TypeScript 5 + TanStack Query v5 + Zustand + Shadcn/UI + Leaflet |
| Tests backend | Jest + Supertest + ts-jest |
| Tests frontend | Vitest + @testing-library/react |

---

## Backend — Estructura de directorios

```
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── index.ts           ← Entry point: Express + Socket.IO
│   ├── routes/            ← Registro de routers (vacío en esta feature)
│   ├── middlewares/
│   │   └── errorHandler.ts
│   ├── controllers/       ← Vacío en esta feature
│   ├── services/          ← Vacío en esta feature
│   ├── repositories/      ← Vacío en esta feature
│   ├── sockets/           ← Vacío en esta feature
│   ├── types/             ← Vacío en esta feature
│   └── validators/        ← Vacío en esta feature
├── .env.example
├── .eslintrc.json
├── jest.config.ts
├── package.json
└── tsconfig.json
```

## Backend — Dependencias

**Producción:**
- express, @types/express
- prisma, @prisma/client
- dotenv
- zod
- bcrypt, @types/bcrypt
- jsonwebtoken, @types/jsonwebtoken
- cors, @types/cors
- helmet
- express-rate-limit
- socket.io
- nodemailer, @types/nodemailer
- multer, @types/multer

**Dev:**
- typescript, ts-node, ts-node-dev
- eslint, @typescript-eslint/eslint-plugin, @typescript-eslint/parser
- jest, ts-jest, @types/jest
- supertest, @types/supertest

## Backend — package.json scripts

```json
{
  "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "lint": "eslint src --ext .ts",
  "test": "jest --runInBand"
}
```

## Backend — tsconfig.json

strict: true, target: ES2020, module: commonjs, outDir: dist, rootDir: src

## Backend — src/index.ts

- Carga dotenv
- Crea Express app
- Aplica helmet(), cors({ origin: process.env.FRONTEND_URL, credentials: true })
- Monta rate-limiter en /api/v1/auth/* (10 req/min)
- Monta errorHandler global al final
- Arranca http.Server + Socket.IO
- Escucha en process.env.PORT o 3001

## Backend — .env.example

```
DATABASE_URL="postgresql://user:password@localhost:5432/logistica_dev"
TEST_DATABASE_URL="postgresql://user:password@localhost:5432/logistica_test"
JWT_SECRET="supersecretkey"
JWT_REFRESH_SECRET="refreshsecretkey"
PORT=3001
FRONTEND_URL="http://localhost:5173"
SMTP_HOST="smtp.example.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
```

---

## Prisma Schema — Modelos

### Enums

```prisma
enum Rol { CLIENTE  OPERADOR  REPARTIDOR }
enum EstadoEnvio { PENDIENTE  EN_PREPARACION  EN_TRANSITO  ENTREGADO  CANCELADO  FALLIDO }
enum EstadoRuta { PENDIENTE  EN_CURSO  COMPLETADA  CANCELADA }
enum EstadoVehiculo { DISPONIBLE  EN_RUTA  MANTENIMIENTO  FUERA_SERVICIO }
enum TipoIncidencia { ENTREGA_FALLIDA  CLIENTE_AUSENTE  DANIO  DIRECCION_INCORRECTA  OTRO }
enum EstadoIncidencia { ABIERTA  EN_PROCESO  RESUELTA }
```

### Modelos

- **Usuario**: id, nombre, correo (unique), password, telefono?, rol, createdAt, updatedAt → relaciones: cliente?, operador?, repartidor?, notificaciones[], passwordResetTokens[]
- **Cliente**: id, usuarioId (unique) → relaciones: usuario, envios[]
- **Operador**: id, usuarioId (unique) → relaciones: usuario
- **Repartidor**: id, usuarioId (unique), licencia?, disponible (default true) → relaciones: usuario, rutas[]
- **Envio**: id, codigoSeguimiento (unique), remitente, destinatario, direccionDestino, peso (Float), dimensiones, descripcion?, estado (EstadoEnvio, default PENDIENTE), clienteId, rutaId?, evidenciaFoto?, firma?, fechaReprogramacion?, createdAt, updatedAt → relaciones: cliente, ruta?, eventos[], incidencias[], notificaciones[]
- **Ruta**: id, nombre?, estado (EstadoRuta, default PENDIENTE), repartidorId, vehiculoId, createdAt, updatedAt → relaciones: repartidor, vehiculo, envios[]
- **Vehiculo**: id, placa (unique), modelo, capacidad (Float), estado (EstadoVehiculo, default DISPONIBLE), createdAt, updatedAt → relaciones: rutas[]
- **EventoEnvio**: id, descripcion, estado (EstadoEnvio), lat?, lng?, timestamp (default now()) → relaciones: envio
- **Incidencia**: id, tipo (TipoIncidencia), descripcion, estado (EstadoIncidencia, default ABIERTA), foto?, nota?, createdAt, updatedAt → relaciones: envio
- **Notificacion**: id, mensaje, leida (default false), usuarioId, envioId?, createdAt → relaciones: usuario, envio?
- **PasswordResetToken**: id, token (unique), usuarioId, expiresAt, usado (default false), createdAt → relaciones: usuario

---

## Frontend — Estructura de directorios

```
frontend/
├── src/
│   ├── main.tsx
│   ├── App.tsx            ← Router principal
│   ├── services/          ← api.ts (axios instance)
│   ├── hooks/             ← Vacío en esta feature
│   ├── store/
│   │   └── authStore.ts   ← Zustand: { user, token, setAuth, clearAuth }
│   ├── components/
│   │   ├── ui/            ← Shadcn/UI components (populated by CLI)
│   │   └── shared/        ← Vacío en esta feature
│   ├── features/
│   │   ├── auth/          ← Vacío en esta feature
│   │   ├── envios/
│   │   ├── tracking/
│   │   ├── rutas/
│   │   ├── vehiculos/
│   │   ├── repartidor/
│   │   ├── incidencias/
│   │   └── notificaciones/
│   ├── router/
│   │   └── index.tsx      ← React Router con rutas placeholder
│   └── types/             ← DTOs compartidos
├── .env.example
├── .eslintrc.json
├── vite.config.ts
├── package.json
└── tsconfig.json
```

## Frontend — Dependencias adicionales (post-Vite)

- react-router-dom
- @tanstack/react-query
- zustand
- axios
- zod
- react-hook-form, @hookform/resolvers
- leaflet, @types/leaflet, react-leaflet
- socket.io-client
- @shadcn/ui (setup via CLI)
- lucide-react (peer de shadcn)

**Dev:**
- vitest, @vitest/ui, @testing-library/react, @testing-library/jest-dom, jsdom

## Frontend — .env.example

```
VITE_API_URL="http://localhost:3001/api/v1"
VITE_SOCKET_URL="http://localhost:3001"
```

## Frontend — services/api.ts

Instancia axios con baseURL = VITE_API_URL, credentials: true.
Interceptor de request: agrega `Authorization: Bearer <token>` desde authStore.
Interceptor de response: si 401, intentar refresh; si falla, clearAuth y redirect /login.

---

## Decisión técnica clave

Se crea el scaffold completo (directorios, configs, entry points, schema Prisma) sin
implementar ningún endpoint ni componente de features específicas. El objetivo es
que `npm run dev` arranque en ambos workspaces y que el schema esté migrado.
Los directorios de features se crean vacíos (con `.gitkeep` o index barrel) para
que las features posteriores puedan ubicar sus archivos sin ambigüedad.
