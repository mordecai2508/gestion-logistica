# Design — gestion_usuarios

> Feature ID: 20 | Sprint 6

---

## 1. Endpoints

| Método | Ruta | Auth | Query / Body | Respuesta exitosa | HTTP |
|--------|------|------|--------------|-------------------|------|
| GET | `/api/v1/usuarios` | authMiddleware + roleMiddleware('OPERADOR') | `?page=1&limit=20&rol=CLIENTE\|OPERADOR\|REPARTIDOR` | `{ data: UsuarioDto[], meta: { total, page, limit, totalPages }, message, status }` | 200 |
| GET | `/api/v1/usuarios/:id` | authMiddleware + roleMiddleware('OPERADOR') | — | `{ data: UsuarioDto, message, status }` | 200 |
| PATCH | `/api/v1/usuarios/:id/estado` | authMiddleware + roleMiddleware('OPERADOR') | `{ activo: boolean }` | `{ data: UsuarioDto, message, status }` | 200 |

### Cambios a endpoints existentes

| Método | Ruta | Cambio |
|--------|------|--------|
| POST | `/api/v1/auth/login` | Tras validar credenciales (`bcrypt.compare`) y antes de emitir tokens, verifica `usuario.activo`. Si es `false`, lanza error `USER_INACTIVE` (403) sin crear `RefreshToken` ni firmar `accessToken`. |

### Códigos de error

| Código | Escenario |
|--------|-----------|
| 401 | Sin JWT o JWT inválido/expirado (`GET /usuarios`, `GET /usuarios/:id`, `PATCH /usuarios/:id/estado`) |
| 403 | Rol diferente a OPERADOR en los 3 endpoints de `/usuarios` |
| 403 `USER_INACTIVE` | `POST /api/v1/auth/login` con credenciales válidas pero `usuario.activo === false` |
| 404 | Usuario con `:id` no encontrado (`GET /usuarios/:id`, `PATCH /usuarios/:id/estado`) |
| 409 `CANNOT_DEACTIVATE_SELF` | `PATCH /usuarios/:id/estado` donde `:id === req.user.id` |
| 422 | `?rol` inválido en `GET /usuarios`, o body de `PATCH /usuarios/:id/estado` sin `activo: boolean` |

---

## 2. Schema Prisma

Se agrega un campo al modelo `Usuario` existente (`backend/prisma/schema.prisma`, líneas 63-78). No se crean tablas nuevas ni relaciones nuevas.

```prisma
model Usuario {
  id                  String               @id @default(cuid())
  nombre              String
  correo              String               @unique
  password            String
  telefono            String?
  rol                 Rol
  activo              Boolean              @default(true)   // NUEVO
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt
  cliente             Cliente?
  operador            Operador?
  repartidor          Repartidor?
  notificaciones      Notificacion[]
  passwordResetTokens PasswordResetToken[]
  refreshTokens       RefreshToken[]
}
```

### Migración

Crear con `npx prisma migrate dev --name add_usuario_activo` desde `backend/`. Sigue la convención de carpeta de migraciones existente (p.ej. `backend/prisma/migrations/20260608210524_add_tipo_notificacion/`). El SQL generado añade la columna `activo` con `DEFAULT true` y `NOT NULL`, por lo que las filas existentes se migran automáticamente sin requerir backfill manual:

```sql
-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;
```

---

## 3. DTOs (backend — `backend/src/types/usuarioTypes.ts`)

```typescript
import type { Rol } from '@prisma/client';

export interface UsuarioDto {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  telefono: string | null;
  activo: boolean;
  createdAt: string; // ISO 8601
}

export interface ListaUsuariosResponse {
  data: UsuarioDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ListarUsuariosInput {
  page: number;
  limit: number;
  rol?: Rol;
}

export interface ActualizarEstadoUsuarioDto {
  activo: boolean;
}
```

`UsuarioDto` NUNCA incluye `password`, `refreshTokens` ni `passwordResetTokens`. La consulta Prisma usa `select` explícito (no `include` de relaciones completas) para garantizarlo.

---

## 4. Lógica de negocio (service)

### `usuarioService.listar(query)`

1. Recibir `{ page, limit, rol? }` del controller.
2. Calcular `skip = (page - 1) * limit`.
3. Delegar a `usuarioRepository.findAll({ rol }, skip, limit)` — usa `select` explícito (sin `password`).
4. Devolver `{ data: usuarios, meta }` con `meta` calculado igual que en `repartidorService.listar`.

No hay lógica no trivial en listado.

### `usuarioService.obtenerPorId(id)`

1. Llamar a `usuarioRepository.findById(id)`.
2. Si el resultado es `null`, lanzar `AppError('NOT_FOUND', 'Usuario no encontrado', 404)`.
3. Devolver el `UsuarioDto`.

### `usuarioService.actualizarEstado(id, dto, operadorId)`

1. IF `id === operadorId` THEN lanzar `AppError('CANNOT_DEACTIVATE_SELF', 'No puedes desactivar tu propia cuenta', 409)` — **antes** de tocar la base de datos. Esta verificación aplica tanto si `dto.activo` es `true` como `false` (regla simple: un operador no puede cambiar el estado de su propia cuenta vía este endpoint), pero el criterio de aceptación se centra en el caso de desactivación.
2. Llamar a `usuarioRepository.findById(id)` — si `null`, lanzar `AppError('NOT_FOUND', 'Usuario no encontrado', 404)`.
3. Llamar a `usuarioRepository.actualizarEstado(id, dto.activo)`.
4. Devolver el `UsuarioDto` actualizado.

### `authService.login` — verificación `activo` (modificación)

En `backend/src/services/authService.ts`, dentro de `login(dto)`:

1. `findByCorreo` (sin cambios).
2. `bcrypt.compare` (sin cambios) — si falla, `INVALID_CREDENTIALS` 401 (sin cambios).
3. **Nuevo paso**, inmediatamente después del `bcrypt.compare` exitoso y antes de firmar el `accessToken`:
   ```typescript
   if (!usuario.activo) {
     throw createAuthError('USER_INACTIVE', 'La cuenta está desactivada. Contacta al administrador.', 403);
   }
   ```
4. Continuar con la emisión de `accessToken` + `refreshToken` (sin cambios).

`authRepository.findByCorreo` debe seguir devolviendo el campo `activo` del usuario (Prisma lo incluye automáticamente al añadirse al modelo; no requiere cambios en el repositorio si ya usa `findUnique` sin `select` restringido — verificar y, si usa `select`, añadir `activo`).

---

## 5. Frontend

### Ruta modificada

- `frontend/src/router/index.tsx` línea 63: reemplazar
  ```tsx
  <Route path="/usuarios" element={<PlaceholderPage title="Usuarios" />} />
  ```
  por
  ```tsx
  <Route path="/usuarios" element={<GestionUsuarios />} />
  ```
  con el import correspondiente, dentro del bloque `ProtectedRoute allowedRoles={['OPERADOR']}` + `OperadorLayout` (sin cambios de estructura de rutas).

### Componentes (`frontend/src/features/usuarios/`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `GestionUsuarios.tsx` | Página principal: filtro por rol + tabla + paginación + panel de detalle + manejo de toasts |
| `UsuarioTable.tsx` | Tabla con columnas Nombre / Correo / Rol / Estado (badge Activo/Inactivo) / Acciones (Ver, Activar/Desactivar) |
| `UsuarioDetalle.tsx` | Vista de solo lectura del detalle de un usuario (panel inline, igual patrón que `RepartidorDetalle`) |

No se crea un componente de edición/formulario: la única acción de escritura es el toggle de `activo`, manejado directamente desde `UsuarioTable` vía `useActualizarEstadoUsuario`.

### Servicio (`frontend/src/services/usuarioService.ts`)

| Función | Descripción |
|---------|-------------|
| `listar(params)` | GET `/usuarios` con query `page`, `limit`, `rol` |
| `obtenerPorId(id)` | GET `/usuarios/:id` |
| `actualizarEstado(id, dto)` | PATCH `/usuarios/:id/estado` con `{ activo: boolean }` |

### Hook (`frontend/src/hooks/useUsuarios.ts`)

| Hook | Query key | Función |
|------|-----------|---------|
| `useUsuarios(filtros)` | `['usuarios', filtros]` | Listar con paginación y filtro por rol |
| `useUsuario(id)` | `['usuarios', id]` | Detalle por id (habilitado solo si `id !== null`) |
| `useActualizarEstadoUsuario()` | — | Mutation PATCH `/usuarios/:id/estado`; en `onSuccess` invalida `['usuarios']` y muestra toast de éxito; en `onError` muestra toast de error con el mensaje de la API (cubre R28, p.ej. 409 al auto-desactivarse) |

### DTOs frontend (`frontend/src/types/usuarioTypes.ts`)

Espeja los DTOs del backend, sin importar de `@prisma/client`. El tipo `Rol` se redefine localmente como union type (mismo patrón que otros DTOs frontend del proyecto):

```typescript
export type Rol = 'CLIENTE' | 'OPERADOR' | 'REPARTIDOR';

export interface UsuarioDto {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  telefono: string | null;
  activo: boolean;
  createdAt: string;
}

export interface UsuarioMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListaUsuariosDto {
  data: UsuarioDto[];
  meta: UsuarioMeta;
}

export interface ListarUsuariosFiltros {
  page?: number;
  limit?: number;
  rol?: Rol;
}

export interface ActualizarEstadoUsuarioInput {
  activo: boolean;
}
```

### Identificación del usuario propio (R28 / botón "Desactivar" deshabilitado opcional)

El frontend obtiene el `id` del operador autenticado desde el authStore (Zustand, decodificado del JWT — mismo mecanismo que usa `ProtectedRoute`/`ProfileMenu`). `UsuarioTable` recibe ese `id` como prop `currentUserId` para, opcionalmente, marcar visualmente la fila propia; el bloqueo real (409) lo aplica el backend, por lo que el frontend no necesita deshabilitar el botón para que R28 se cumpla — basta con mostrar el toast de error que devuelve la API.

---

## 6. Decisión técnica

**Endpoint dedicado `PATCH /usuarios/:id/estado` vs. `PATCH /usuarios/:id` genérico**

Opción elegida: endpoint dedicado `/estado` que solo acepta `{ activo: boolean }`.

Alternativa descartada: un `PATCH /usuarios/:id` genérico (como `actualizarRepartidorSchema`, que acepta múltiples campos opcionales). Se descarta porque el criterio de aceptación define explícitamente la ruta `/usuarios/:id/estado` y porque el alcance de esta feature es solo activar/desactivar — un PATCH genérico abriría la puerta a editar `correo`/`rol`/`password` sin requisitos ni validaciones definidas para esos casos.

**Verificación de auto-desactivación: en el service vs. en el controller**

Opción elegida: la comparación `req.user.id === :id` se resuelve en `usuarioService.actualizarEstado(id, dto, operadorId)`, recibiendo `operadorId` como parámetro explícito desde el controller (`req.user!.id`).

Alternativa descartada: resolverlo en el controller antes de llamar al servicio. Se descarta para mantener toda la lógica de negocio (incluida la regla de autorización de dominio "no auto-desactivarse") en la capa de servicio, consistente con la regla arquitectónica "los controladores no contienen lógica de negocio".

**Verificación `activo` en login: antes vs. después de `bcrypt.compare`**

Opción elegida: después de `bcrypt.compare` exitoso (R21), igual que indica el criterio de aceptación.

Alternativa descartada: verificar `activo` antes del `bcrypt.compare` (ahorraría el hash compute para cuentas inactivas). Se descarta porque revelaría, mediante diferencia de respuesta/tiempo, si una cuenta inactiva existe con ese correo — riesgo de enumeración de usuarios. Verificar después de validar la contraseña evita esa fuga.

**Reutilización de `RepartidorConUsuario` pattern vs. nuevo tipo `UsuarioConRelaciones`**

Opción elegida: el repositorio de usuarios consulta directamente el modelo `Usuario` con `select` explícito (sin `include` de `cliente`/`operador`/`repartidor`/`refreshTokens`), devolviendo un tipo `Prisma.UsuarioGetPayload<{ select: {...} }>` o un objeto ya mapeado a `UsuarioDto`.

Alternativa descartada: incluir las relaciones (`cliente`, `operador`, `repartidor`) como hace `repartidorRepository` con `usuario`. Se descarta porque el criterio de aceptación de `gestion_usuarios` no requiere datos específicos de esas tablas (licencia, disponibilidad, etc.) — solo los campos base de `Usuario`. Mantener el `select` mínimo también refuerza R7/R12 (nunca exponer `password`).

---

## 7. Seguridad

- `authMiddleware` valida JWT Bearer en los 3 endpoints de `/usuarios`.
- `roleMiddleware('OPERADOR')` bloquea con 403 cualquier otro rol (CLIENTE, REPARTIDOR).
- El repositorio de usuarios usa `select` explícito que **excluye** `password`, `refreshTokens`, `passwordResetTokens` en todas las consultas — nunca se delega a un DTO posterior la responsabilidad de "no incluir password".
- El validador Zod de `GET /usuarios` restringe `?rol` al enum `['CLIENTE', 'OPERADOR', 'REPARTIDOR']` (422 si no coincide).
- El validador Zod de `PATCH /usuarios/:id/estado` exige `activo: boolean` exacto (rechaza strings, números, campos extra).
- La regla de auto-desactivación (`409 CANNOT_DEACTIVATE_SELF`) se evalúa con el `id` del JWT (`req.user.id`), nunca con datos del body, para que no pueda eludirse.
- El mensaje de error `USER_INACTIVE` en login no debe filtrar si la cuenta existe vs. está inactiva de forma distinguible de `INVALID_CREDENTIALS` en cuanto a *timing*; se acepta la diferencia de mensaje porque el criterio de aceptación la requiere explícitamente (403 vs 401), priorizando la UX del operador sobre la enumeración total.
- Los `id` de ruta son strings CUID; Prisma devuelve `null` (no error) si no existe, el servicio lo convierte en 404 controlado.
