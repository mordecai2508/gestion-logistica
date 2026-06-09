# Design — gestion_repartidores

> Feature ID: 17 | Sprint 5

---

## 1. Endpoints

| Método | Ruta | Auth | Query / Body | Respuesta exitosa | HTTP |
|--------|------|------|--------------|-------------------|------|
| GET | `/api/v1/repartidores` | authMiddleware + roleMiddleware('OPERADOR') | `?page=1&limit=20&disponible=true\|false` | `{ data: RepartidorDto[], meta: { total, page, limit, totalPages } }` | 200 |
| GET | `/api/v1/repartidores/:id` | authMiddleware + roleMiddleware('OPERADOR') | — | `{ data: RepartidorDetalleDto, message, status }` | 200 |
| PATCH | `/api/v1/repartidores/:id` | authMiddleware + roleMiddleware('OPERADOR') | `{ disponible?: boolean, licencia?: string }` | `{ data: RepartidorDetalleDto, message, status }` | 200 |

### Códigos de error

| Código | Escenario |
|--------|-----------|
| 401 | Sin JWT o JWT inválido/expirado |
| 403 | Rol diferente a OPERADOR |
| 404 | Repartidor con `:id` no encontrado |
| 422 | Body PATCH no contiene ningún campo válido, o `licencia` vacía |

---

## 2. Schema Prisma

No se requieren cambios al schema. El modelo `Repartidor` ya existe con todos los campos necesarios:

```
model Repartidor {
  id         String  @id @default(cuid())
  usuarioId  String  @unique
  licencia   String?
  disponible Boolean @default(true)
  usuario    Usuario @relation(...)
  rutas      Ruta[]
}
```

Los campos requeridos por la feature (`licencia`, `disponible`) y la relación con `Usuario` (`nombre`, `correo`, `telefono`) ya están definidos.

---

## 3. DTOs (backend — `backend/src/types/repartidorTypes.ts`)

```
interface RepartidorDto {
  id: string;
  licencia: string | null;
  disponible: boolean;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    telefono: string | null;
  };
}

// Alias — lista y detalle comparten la misma forma
type RepartidorDetalleDto = RepartidorDto;

interface ListaRepartidoresResponse {
  data: RepartidorDto[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ActualizarRepartidorDto {
  disponible?: boolean;
  licencia?: string;
}
```

---

## 4. Lógica de negocio (service)

### `repartidorService.listar(query)`

1. Recibir `{ page, limit, disponible? }` del controller.
2. Calcular `skip = (page - 1) * limit`.
3. Delegar a `repartidorRepository.findAll({ disponible }, skip, limit)`.
4. Devolver `{ repartidores, total }` formateado con `meta`.

No hay lógica no trivial en listado/detalle.

### `repartidorService.obtenerPorId(id)`

1. Llamar a `repartidorRepository.findById(id)`.
2. Si el resultado es `null`, lanzar error con código `NOT_FOUND` (capturado por el error handler global con status 404).
3. Devolver el objeto repartidor con datos de usuario incluidos.

### `repartidorService.actualizar(id, dto)`

1. Llamar a `repartidorRepository.findById(id)` — lanzar 404 si no existe.
2. Construir el objeto de actualización con solo los campos presentes en el dto.
3. Llamar a `repartidorRepository.update(id, camposActualizar)`.
4. Devolver el repartidor actualizado con datos de usuario.

No se requieren transacciones ni efectos secundarios (cambio de disponibilidad no afecta otros modelos).

---

## 5. Frontend

### Ruta nueva

- `/repartidores` dentro del bloque `ProtectedRoute allowedRoles={['OPERADOR']}` con `OperadorLayout`.

### Componentes (`frontend/src/features/repartidores/`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `GestionRepartidores.tsx` | Página principal: filtro + tabla + modales |
| `RepartidorTable.tsx` | Tabla con columnas Nombre / Correo / Teléfono / Licencia / Disponibilidad / Acciones |
| `RepartidorDetalle.tsx` | Vista de solo lectura del detalle de un repartidor (modal o panel lateral) |
| `EditarRepartidor.tsx` | Formulario de edición inline/modal para `disponible` y `licencia` |

### Servicio (`frontend/src/services/repartidorService.ts`)

| Función | Descripción |
|---------|-------------|
| `listar(params)` | GET `/repartidores` con query `page`, `limit`, `disponible` |
| `obtenerPorId(id)` | GET `/repartidores/:id` |
| `actualizar(id, dto)` | PATCH `/repartidores/:id` |

### Hook (`frontend/src/hooks/useRepartidores.ts`)

| Hook | Query key | Función |
|------|-----------|---------|
| `useRepartidores(filtros)` | `['repartidores', filtros]` | Listar con paginación y filtro |
| `useRepartidor(id)` | `['repartidores', id]` | Detalle por id |
| `useActualizarRepartidor()` | — | Mutation PATCH; invalida `['repartidores']` on success |

### DTOs frontend (`frontend/src/types/repartidorTypes.ts`)

Espeja los DTOs del backend, sin importar de `@prisma/client`:

```
interface RepartidorDto { id, licencia, disponible, usuario: { id, nombre, correo, telefono } }
interface ActualizarRepartidorInput { disponible?: boolean; licencia?: string }
interface RepartidorMeta { total, page, limit, totalPages }
interface ListaRepartidoresDto { data: RepartidorDto[]; meta: RepartidorMeta }
```

---

## 6. Decisión técnica

**Paginación en listado de repartidores vs. sin paginación**

Opción elegida: paginación con `page` + `limit` (igual que `/api/v1/rutas`).

Alternativa descartada: devolver todos sin paginar (como `/api/v1/vehiculos`). Se descarta porque el número de repartidores puede crecer ilimitadamente, y el criterio de aceptación lo exige explícitamente.

**Modal vs. página de detalle para edición**

Opción elegida: modal/panel inline en la misma página `GestionRepartidores`, igual al patrón de `ActualizarEstadoVehiculo.tsx`.

Alternativa descartada: ruta dedicada `/repartidores/:id/editar`. Se descarta para mantener coherencia con los demás patrones de gestión del operador y evitar una ruta nueva innecesaria.

---

## 7. Seguridad

- `authMiddleware` valida JWT Bearer en todos los endpoints.
- `roleMiddleware('OPERADOR')` bloquea con 403 cualquier otro rol (CLIENTE, REPARTIDOR).
- El validador Zod del PATCH rechaza campos extra no declarados (`strict` o `strip`) y valida tipos antes de llegar al servicio.
- No se expone el campo `password` del modelo `Usuario` en ningún DTO — la consulta Prisma selecciona campos explícitos o incluye solo los campos permitidos.
- `licencia` se limita a string de máximo 50 caracteres en el validator para prevenir entradas excesivamente largas.
- Los `id` de ruta son strings CUID; Prisma devuelve `null` (no error) si no existe, el servicio lo convierte en 404 controlado.
