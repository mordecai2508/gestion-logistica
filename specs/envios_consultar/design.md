# Design — envios_consultar

> Feature id: 5 | Sprint 2
> Este documento describe el "cómo" técnico. Los requisitos están en requirements.md.

---

## 1. Endpoints

| # | Método | Ruta | Auth | Rol requerido | Payload entrada | Respuesta éxito | Códigos HTTP |
|---|--------|------|------|---------------|-----------------|-----------------|--------------|
| 1 | GET | `/api/v1/envios` | Bearer JWT | OPERADOR | Query params (ver abajo) | `{ data: EnvioListItemDto[], meta: PaginationMeta, message, status: 200 }` | 200, 401, 403, 422 |
| 2 | GET | `/api/v1/envios/:id` | Bearer JWT | OPERADOR | — | `{ data: EnvioDetalleDto, message, status: 200 }` | 200, 401, 403, 404 |
| 3 | PATCH | `/api/v1/envios/:id` | Bearer JWT | OPERADOR | `EditarEnvioDto` (ver abajo) | `{ data: EnvioResponseDto, message, status: 200 }` | 200, 401, 403, 404, 422 |
| 4 | DELETE | `/api/v1/envios/:id` | Bearer JWT | OPERADOR | — | `{ data: { id, codigoSeguimiento, estado }, message, status: 200 }` | 200, 401, 403, 404, 409 |

### Query params — `GET /api/v1/envios`

| Parámetro | Tipo | Por defecto | Descripción |
|-----------|------|-------------|-------------|
| `page` | integer > 0 | `1` | Página a retornar |
| `limit` | integer > 0 | `20` | Resultados por página |
| `estado` | `EstadoEnvio` enum | — | Filtro exacto por estado |
| `cliente` | string | — | Filtro parcial, case-insensitive, sobre `Cliente.usuario.nombre` |
| `codigo` | string | — | Filtro parcial, case-insensitive, sobre `codigoSeguimiento` |

### Payload de entrada — `EditarEnvioDto`

```json
{
  "remitente":        "string, opcional",
  "destinatario":     "string, opcional",
  "direccionDestino": "string, opcional",
  "peso":             "number > 0, opcional",
  "dimensiones":      "string formato WxHxD, opcional",
  "descripcion":      "string | null, opcional"
}
```

Al menos un campo debe estar presente (validado en Zod con `.refine`).

### Payload de respuesta — `EnvioListItemDto`

```json
{
  "id":               "cuid",
  "codigoSeguimiento":"TRK-YYYYMMDD-XXXXXXXX",
  "estado":           "EstadoEnvio",
  "remitente":        "string",
  "destinatario":     "string",
  "clienteId":        "string",
  "clienteNombre":    "string",
  "createdAt":        "ISO 8601 UTC"
}
```

### Payload de respuesta — `EnvioDetalleDto`

```json
{
  "id":               "cuid",
  "codigoSeguimiento":"TRK-YYYYMMDD-XXXXXXXX",
  "estado":           "EstadoEnvio",
  "remitente":        "string",
  "destinatario":     "string",
  "direccionDestino": "string",
  "peso":             "number",
  "dimensiones":      "string",
  "descripcion":      "string | null",
  "clienteId":        "string",
  "rutaId":           "string | null",
  "createdAt":        "ISO 8601 UTC",
  "updatedAt":        "ISO 8601 UTC",
  "eventos": [
    {
      "id":          "cuid",
      "estado":      "EstadoEnvio",
      "descripcion": "string",
      "lat":         "number | null",
      "lng":         "number | null",
      "timestamp":   "ISO 8601 UTC"
    }
  ]
}
```

### Respuesta de error

```json
{ "error": "ERROR_CODE", "message": "descripción", "statusCode": number }
```

| Situación | Código | `error` |
|-----------|--------|---------|
| Sin token | 401 | `MISSING_TOKEN` |
| Token inválido/expirado | 401 | `INVALID_TOKEN` / `EXPIRED_TOKEN` |
| Rol distinto a OPERADOR | 403 | `FORBIDDEN` |
| `id` de envío no existe | 404 | `ENVIO_NOT_FOUND` |
| Campos de paginación/filtro inválidos | 422 | `VALIDATION_ERROR` |
| Body de PATCH sin campos editables o con valores inválidos | 422 | `VALIDATION_ERROR` |
| Cancelar envío que no está PENDIENTE | 409 | `INVALID_STATE_TRANSITION` |

### `PaginationMeta`

```json
{
  "total":      "number — total de registros que coinciden con los filtros",
  "page":       "number — página actual",
  "limit":      "number — resultados por página",
  "totalPages": "number — ceil(total / limit)"
}
```

---

## 2. Schema Prisma

No se requieren migraciones nuevas. Los modelos `Envio` y `EventoEnvio` ya existen desde `envios_crear`. A continuación los campos relevantes para esta feature:

### Modelo `Envio` (campos usados en listar / editar / cancelar)

| Campo | Tipo Prisma | Notas |
|-------|-------------|-------|
| `id` | `String @id @default(cuid())` | Clave primaria |
| `codigoSeguimiento` | `String @unique` | Filtro parcial en listar |
| `estado` | `EstadoEnvio` | Filtro exacto en listar; actualizado en cancelar |
| `remitente` | `String` | Editable |
| `destinatario` | `String` | Editable |
| `direccionDestino` | `String` | Editable |
| `peso` | `Float` | Editable |
| `dimensiones` | `String` | Editable |
| `descripcion` | `String?` | Editable |
| `clienteId` | `String` | FK a `Cliente.id`; usado para filtro por nombre de cliente |
| `rutaId` | `String?` | FK a `Ruta.id`; incluido en detalle |
| `createdAt` | `DateTime @default(now())` | Incluido en respuesta |
| `updatedAt` | `DateTime @updatedAt` | Incluido en respuesta de detalle |

### Relación con `Cliente` (para filtro por nombre y proyección)

```
Envio → clienteId → Cliente → usuarioId → Usuario.nombre
```

El repositorio usa `include: { cliente: { include: { usuario: true } } }` para obtener el nombre del cliente.

### Modelo `EventoEnvio` (campos incluidos en detalle y creados en cancelación)

| Campo | Tipo Prisma | Valor en cancelación |
|-------|-------------|----------------------|
| `id` | `String @id @default(cuid())` | auto |
| `envioId` | `String` | FK al `Envio.id` |
| `estado` | `EstadoEnvio` | `CANCELADO` |
| `descripcion` | `String` | `"Envío cancelado por operador"` |
| `lat` | `Float?` | `null` |
| `lng` | `Float?` | `null` |
| `timestamp` | `DateTime @default(now())` | auto |

---

## 3. Lógica de negocio

### 3.1 Listar con paginación y filtros

```
envioService.listar(query: ListarEnviosQuery):
  1. Extraer { page=1, limit=20, estado?, cliente?, codigo? } del query validado.
  2. Construir objeto `where` para Prisma:
     - Si `estado` presente: where.estado = estado
     - Si `codigo` presente: where.codigoSeguimiento = { contains: codigo, mode: 'insensitive' }
     - Si `cliente` presente: where.cliente = { usuario: { nombre: { contains: cliente, mode: 'insensitive' } } }
  3. Ejecutar en paralelo:
     a. prisma.envio.findMany({ where, skip: (page-1)*limit, take: limit, orderBy: { createdAt: 'desc' }, include: { cliente: { include: { usuario: true } } } })
     b. prisma.envio.count({ where })
  4. Mapear cada Envio a EnvioListItemDto (extraer clienteNombre de cliente.usuario.nombre).
  5. Devolver { data: items, meta: { total, page, limit, totalPages: ceil(total/limit) } }.
```

### 3.2 Obtener detalle

```
envioService.obtenerDetalle(id: string):
  1. envioRepository.findById(id) con include de EventoEnvio ordenado por timestamp ASC
     y Cliente (para nombre).
  2. Si null → lanzar AppError('ENVIO_NOT_FOUND', 404).
  3. Mapear a EnvioDetalleDto e incluir array eventos.
  4. Devolver EnvioDetalleDto.
```

### 3.3 Editar envío

```
envioService.editar(id: string, dto: EditarEnvioDto):
  1. Verificar existencia: envioRepository.findById(id); si null → AppError('ENVIO_NOT_FOUND', 404).
  2. Actualizar: envioRepository.update(id, camposEditables(dto)).
     - Nunca se pasa estado, codigoSeguimiento, clienteId, rutaId al update.
  3. Devolver el registro actualizado mapeado a EnvioResponseDto.
```

### 3.4 Cancelar envío (cambio de estado con EventoEnvio atómico)

```
envioService.cancelar(id: string):
  1. Verificar existencia y estado: envioRepository.findById(id);
     - Si null → AppError('ENVIO_NOT_FOUND', 404).
     - Si estado !== 'PENDIENTE' → AppError('INVALID_STATE_TRANSITION', 409).
  2. Ejecutar prisma.$transaction:
     a. prisma.envio.update({ where: { id }, data: { estado: 'CANCELADO' } })
     b. prisma.eventoEnvio.create({ data: { envioId: id, estado: 'CANCELADO', descripcion: 'Envío cancelado por operador' } })
  3. Devolver { id, codigoSeguimiento, estado: 'CANCELADO' }.
```

La transacción garantiza que si la creación del `EventoEnvio` falla, el estado del `Envio` no queda modificado (rollback total), manteniendo la integridad del historial.

---

## 4. Frontend

### Componente: `frontend/src/features/envios/ConsultarEnvios.tsx`

- Pantalla principal del operador para gestión de envíos.
- Contiene la barra de búsqueda (input de texto + botón lupa) según wireframe.
- Renderiza la tabla usando el componente `DataTable` de Shadcn/UI con columnas: Código, Cliente, Estado (badge de color), Acciones.
- Acciones por fila: botón "ver" (`Eye` icon) → navega a `/envios/:id`; botón "editar" (`Pencil` icon) → abre modal/drawer de edición; botón "eliminar" (`Trash` icon) → abre `AlertDialog` de confirmación.
- Paginación con controles `< n >` en el footer de la tabla.
- Botón "+ Nuevo Envío" que navega a `/envios/crear`.
- Integra hook `useEnvios(filters)`.

### Componente: `frontend/src/features/envios/DetalleEnvio.tsx`

- Pantalla de detalle accesible en `/envios/:id`.
- Muestra todos los campos del `EnvioDetalleDto`.
- Muestra historial de `EventoEnvio` como línea de tiempo (fecha + estado + descripción).
- Integra hook `useEnvioDetalle(id)`.

### Componente: `frontend/src/features/envios/EditarEnvioModal.tsx`

- Modal o drawer con formulario pre-poblado con los campos editables del envío seleccionado.
- Usa React Hook Form + Zod (schema `editarEnvioSchemaFrontend`).
- Campos: Remitente, Destinatario, Dirección destino, Peso (kg), Dimensiones (cm), Descripción.
- Botón "GUARDAR CAMBIOS" (deshabilitado mientras `isPending`).
- Botón "Cancelar" cierra el modal sin persistir.
- Toast de éxito o error según resultado de la mutación.
- Integra hook `useEditarEnvio(id)`.

### Hooks

| Hook | Archivo | Descripción |
|------|---------|-------------|
| `useEnvios` | `frontend/src/hooks/useEnvios.ts` | `useQuery` que llama `envioService.listar(filters)` con `queryKey: ['envios', filters]` |
| `useEnvioDetalle` | `frontend/src/hooks/useEnvioDetalle.ts` | `useQuery` que llama `envioService.obtenerDetalle(id)` con `queryKey: ['envios', id]` |
| `useEditarEnvio` | `frontend/src/hooks/useEditarEnvio.ts` | `useMutation` que llama `envioService.editar(id, dto)`; en `onSuccess` invalida `['envios']` |
| `useCancelarEnvio` | `frontend/src/hooks/useCancelarEnvio.ts` | `useMutation` que llama `envioService.cancelar(id)`; en `onSuccess` invalida `['envios']` |

### Servicios frontend

Ampliar `frontend/src/services/envioService.ts` (ya creado en `envios_crear`) con los métodos:

| Método | Descripción |
|--------|-------------|
| `listar(filters: EnvioFilters): Promise<PaginatedResponse<EnvioListItemDto>>` | `GET /api/v1/envios` con query params |
| `obtenerDetalle(id: string): Promise<EnvioDetalleDto>` | `GET /api/v1/envios/:id` |
| `editar(id: string, dto: EditarEnvioDto): Promise<EnvioResponseDto>` | `PATCH /api/v1/envios/:id` |
| `cancelar(id: string): Promise<CancelarEnvioResponseDto>` | `DELETE /api/v1/envios/:id` |

### Tipos frontend

Ampliar `frontend/src/types/envioTypes.ts` con:
- `EnvioListItemDto`, `EnvioDetalleDto`, `EventoEnvioDto`, `EditarEnvioDto`, `EnvioFilters`, `CancelarEnvioResponseDto`, `PaginationMeta`, `PaginatedResponse<T>`.

### Router

- `/envios` → `<ConsultarEnvios />` (ProtectedRoute roles: `['OPERADOR']`)
- `/envios/:id` → `<DetalleEnvio />` (ProtectedRoute roles: `['OPERADOR']`)

---

## 5. Decisión técnica clave

### 5.1 Filtrado en la BD vs. en memoria

**Opción A (elegida): aplicar todos los filtros directamente en la query Prisma (`where` clause), con paginación a nivel de BD (`skip` / `take`).**

Justificación: la tabla de envíos puede crecer a miles de registros. Traer todos los registros a la aplicación para filtrar en memoria sería inviable en producción. Los índices de Prisma/PostgreSQL gestionan eficientemente los filtros de igualdad (`estado`) y los `LIKE` case-insensitive (`contains` + `mode: 'insensitive'`).

**Opción B (descartada): traer todos los registros y filtrar en el servicio.**

Descartada por razones de escalabilidad y consumo de memoria.

### 5.2 Cancelación con DELETE vs. PATCH

**Opción A (elegida): `DELETE /api/v1/envios/:id` para cancelar (semánticamente "eliminar" el envío del flujo activo).**

La feature_list.json especifica explícitamente `DELETE`. La operación es un cambio de estado irreversible a `CANCELADO` (soft delete), no una eliminación física. Esto es coherente con los criterios de aceptación del proyecto.

**Opción B (descartada): `PATCH /api/v1/envios/:id` con `{ estado: "CANCELADO" }` en el body.**

Descartada porque: (a) la feature_list.json especifica `DELETE`; (b) mezclar la cancelación con la edición general en el mismo endpoint PATCH complicaría la validación (R14 prohíbe editar `estado` vía PATCH).

### 5.3 Modal vs. página separada para edición

**Opción A (elegida): edición en un Modal/Drawer sobre la misma pantalla `ConsultarEnvios`.**

Justificación: el wireframe de "Consultar Envíos" muestra la tabla con acciones inline (ver, editar, eliminar) sin indicar una pantalla separada para edición. Un modal mantiene al operador en contexto y reduce la navegación.

**Opción B (descartada): página separada `/envios/:id/editar`.**

Descartada porque el wireframe no muestra esa pantalla y añadiría una ruta innecesaria.

---

## 6. Seguridad

| Capa | Medida |
|------|--------|
| Auth | `authMiddleware` verifica JWT firmado con `JWT_SECRET`; rechaza requests sin token o con token expirado/inválido (R1) |
| Autorización | `roleMiddleware('OPERADOR')` aplicado en todas las rutas antes del controlador; devuelve 403 si `req.user.rol !== 'OPERADOR'` (R2) |
| Validación de query params | `listarEnviosSchema` (Zod) valida `page`, `limit` como enteros positivos y `estado` como valor del enum `EstadoEnvio`; los filtros de texto se pasan directamente como strings sin construcción manual de SQL (R5, R10) |
| Validación de body PATCH | `editarEnvioSchema` (Zod) valida tipos y rangos; se aplica `.strip()` para descartar campos no esperados; nunca se pasa `estado` ni `codigoSeguimiento` a Prisma desde este endpoint (R14, R16) |
| Transición de estado | La verificación de `estado === PENDIENTE` ocurre en el servicio antes de la transacción; sin lógica de negocio en el controlador ni en el repositorio (R19) |
| Inyección | Todos los filtros pasan por Zod y se usan como argumentos tipados de Prisma ORM (queries parametrizadas); nunca se construyen strings de SQL manual |
| Secrets | `JWT_SECRET` y `DATABASE_URL` en variables de entorno, nunca en código fuente |
