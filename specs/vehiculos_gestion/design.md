# Design — vehiculos_gestion

---

## 1. Endpoints

| Método | Ruta | Auth | Rol | Payload de entrada | Payload de salida | HTTP Code |
|--------|------|------|-----|--------------------|-------------------|-----------|
| POST | `/api/v1/vehiculos` | JWT | OPERADOR | `{ placa: string, modelo: string, capacidad: number }` | `{ data: Vehiculo, message, status }` | 201 |
| GET | `/api/v1/vehiculos` | JWT | OPERADOR | Query: `?estado=DISPONIBLE\|EN_RUTA\|MANTENIMIENTO\|FUERA_SERVICIO` (opcional) | `{ data: Vehiculo[], message, status }` | 200 |
| PATCH | `/api/v1/vehiculos/:id` | JWT | OPERADOR | `{ estado: 'DISPONIBLE' \| 'EN_RUTA' \| 'MANTENIMIENTO' \| 'FUERA_SERVICIO' }` | `{ data: Vehiculo, message, status }` | 200 |

### Detalles de respuesta de error (todos los endpoints)

```
401 → sin token o token inválido
403 → rol no autorizado (no OPERADOR)
404 → vehículo no encontrado (solo PATCH)
409 → placa duplicada (solo POST)
422 → payload inválido (Zod) o regla de negocio violada (estado no permitido dado el estado actual)
500 → error interno
```

### Estructura de `Vehiculo` (payload de salida)

```
{
  id: string,
  placa: string,
  modelo: string,
  capacidad: number,
  estado: 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO' | 'FUERA_SERVICIO',
  createdAt: string (ISO 8601),
  updatedAt: string (ISO 8601)
}
```

No se incluye el listado de rutas asociadas en la respuesta del listado ni del registro: el alcance de esta feature es CRUD básico de vehículos + estado, no el detalle de asignaciones (eso pertenece a `rutas_gestion`).

### Notas sobre `GET /api/v1/vehiculos` para consumidores externos (p.ej. `rutas_gestion`)

`rutas_gestion` (id 7, ya `done`) dejó los selectores de vehículo en `GestionRutas.tsx` y `RutaDetalle.tsx` con arreglos vacíos, documentados con comentarios "NOTA DE ALCANCE", a la espera de este endpoint. `GET /api/v1/vehiculos?estado=DISPONIBLE` es el contrato que esa feature puede consumir en una iteración futura para poblar el selector "Vehículo" — no requiere parámetros adicionales ni un endpoint dedicado de "vehículos disponibles". Esta spec **no modifica** `rutas_gestion`; deja constancia del contrato para que una iteración posterior conecte ambos selectores.

---

## 2. Schema Prisma — Modelos afectados

### Modelo `Vehiculo` (ya existe — sin cambios, sin migración)

```prisma
model Vehiculo {
  id        String         @id @default(cuid())
  placa     String         @unique
  modelo    String
  capacidad Float
  estado    EstadoVehiculo @default(DISPONIBLE)
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt
  rutas     Ruta[]
}

enum EstadoVehiculo {
  DISPONIBLE
  EN_RUTA
  MANTENIMIENTO
  FUERA_SERVICIO
}
```

El modelo `Vehiculo` y el enum `EstadoVehiculo` ya están definidos en `backend/prisma/schema.prisma` (líneas 34-39 y 134-143) con exactamente los campos requeridos por `feature_list.json` (`placa` único, `modelo`, `capacidad`, `estado`). **No se requiere ninguna migración Prisma para esta feature.** El campo `rutas Ruta[]` ya conecta este modelo con `rutas_gestion`.

---

## 3. Lógica de negocio

### 3.1 Registro de vehículo (`vehiculoService.crear`)

Pasos en orden:
1. Verificar que no exista ya un vehículo con la misma `placa` (consulta por unicidad). Si existe, lanzar error de conflicto (409).
2. Crear el registro `Vehiculo` con `estado = DISPONIBLE` (valor por defecto del schema; no se acepta `estado` en el payload de creación — un vehículo siempre se registra como disponible).
3. Devolver el vehículo creado.

La validación de unicidad se hace explícitamente en el servicio (no solo confiando en la restricción `@unique` de la base de datos) para poder devolver un 409 con un mensaje de negocio claro (`"La placa ya está registrada"`) en lugar de propagar un error crudo de Prisma (`P2002`) al cliente.

### 3.2 Listado y filtro (`vehiculoService.listar`)

1. Si se recibe el query param `estado`, ya validado por Zod contra los 4 valores del enum `EstadoVehiculo`, pasar el filtro al repositorio.
2. Si no se recibe `estado`, devolver todos los vehículos.
3. Ordenar por `placa` ascendente para una presentación consistente en la tabla.

No se pagina este listado: el volumen esperado de vehículos de una flota logística (decenas, no miles) hace innecesaria la paginación y simplifica el consumo desde `rutas_gestion` (que necesita la lista completa de disponibles para poblar un selector).

### 3.3 Actualización de estado (`vehiculoService.actualizarEstado`)

Pasos en orden:
1. Buscar el vehículo por `id`. Si no existe, lanzar error 404.
2. Validar la transición de estado:
   - Si el vehículo está actualmente `EN_RUTA` (es decir, asignado a una ruta activa) y el nuevo estado solicitado es `MANTENIMIENTO` o `FUERA_SERVICIO`, rechazar con 422 indicando que primero debe desvincularse de su ruta activa (a través de `rutas_gestion`, p.ej. reasignando el vehículo de la ruta).
   - Cualquier otra transición entre los 4 estados es válida (incluyendo `DISPONIBLE → MANTENIMIENTO`, `MANTENIMIENTO → DISPONIBLE`, `FUERA_SERVICIO → DISPONIBLE`, etc.).
3. Actualizar `Vehiculo.estado` con el nuevo valor.
4. Devolver el vehículo actualizado.

Esta regla evita que un operador saque de circulación (mantenimiento/fuera de servicio) un vehículo que `rutas_gestion` considera actualmente asignado a una ruta en curso, lo cual dejaría esa ruta en un estado inconsistente. La transición inversa (`EN_RUTA → DISPONIBLE`) **no** se bloquea aquí: es responsabilidad de `rutas_gestion` (reasignación o cierre de ruta) cambiar el estado del vehículo de vuelta a `DISPONIBLE`; este servicio solo impide que un operador "salte" directamente de `EN_RUTA` a un estado de indisponibilidad permanente sin pasar por ese flujo.

---

## 4. Frontend — Pantallas, componentes, hooks, servicios

### Pantalla: `GestionVehiculos` (`frontend/src/features/vehiculos/GestionVehiculos.tsx`)

Basada en el wireframe "Gestión de Vehículos" (`docs/wireframe-reference.md`, sección "Gestión de Vehículos"):
- Título "Vehículos".
- Tabla con columnas: Placa | Modelo | Capacidad | Estado (badge de color: Disponible = verde, En ruta/Ocupado = naranja, Mantenimiento = rojo/gris, Fuera de servicio = gris).
- Control de filtro por estado sobre la tabla (dropdown con las 4 opciones + "Todos").
- Botón "+ Registrar Vehículo" en el footer de la tabla: abre el formulario de registro (`VehiculoForm`).
- Acción "Actualizar Estado" por fila (o seleccionable desde el footer): abre el selector de cambio de estado (`ActualizarEstadoVehiculo`).

Nota: el wireframe textual también menciona un botón "Asignar Vehículo" en el footer de la tabla; esa acción corresponde al flujo de asignación de vehículo a una ruta, que pertenece a `rutas_gestion` (ya `done`, con sus propios selectores) — no se implementa aquí para evitar solapamiento de responsabilidades entre features.

### Componentes internos

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `VehiculoForm` | `features/vehiculos/VehiculoForm.tsx` | Formulario de registro de vehículo (placa, modelo, capacidad); validación inline con React Hook Form + Zod |
| `VehiculoTable` | `features/vehiculos/VehiculoTable.tsx` | Tabla de vehículos con badges de estado y acción de actualización por fila |
| `ActualizarEstadoVehiculo` | `features/vehiculos/ActualizarEstadoVehiculo.tsx` | Selector/diálogo para cambiar el estado de un vehículo existente |

### Hooks (`frontend/src/hooks/`)

| Hook | Descripción |
|------|-------------|
| `useVehiculos(filters)` | `useQuery(['vehiculos', filters], () => vehiculoService.listar(filters))` — lista de vehículos, opcionalmente filtrada por `estado` |
| `useCrearVehiculo()` | `useMutation` — POST `/api/v1/vehiculos`; invalida `['vehiculos']` en `onSuccess` |
| `useActualizarEstadoVehiculo()` | `useMutation` — PATCH `/api/v1/vehiculos/:id`; invalida `['vehiculos']` en `onSuccess` |

### Servicios (`frontend/src/services/vehiculoService.ts`)

Funciones: `listar(filters?: { estado?: EstadoVehiculo })`, `crear(dto: CrearVehiculoDto)`, `actualizarEstado(id: string, estado: EstadoVehiculo)`. Todas usan la instancia axios configurada (`api`) y devuelven `res.data.data`, siguiendo el patrón de `rutaService.ts`.

### Tipos (`frontend/src/types/vehiculoTypes.ts`)

```typescript
export type EstadoVehiculo = 'DISPONIBLE' | 'EN_RUTA' | 'MANTENIMIENTO' | 'FUERA_SERVICIO';

export interface VehiculoDto {
  id: string;
  placa: string;
  modelo: string;
  capacidad: number;
  estado: EstadoVehiculo;
  createdAt: string;
  updatedAt: string;
}

export interface CrearVehiculoDto {
  placa: string;
  modelo: string;
  capacidad: number;
}

export interface VehiculoFiltros {
  estado?: EstadoVehiculo;
}
```

`rutas_gestion` ya define su propio `VehiculoDto` (parcial, sin `createdAt`/`updatedAt`) en `frontend/src/types/rutaTypes.ts`. Esta spec define el tipo completo y autoritativo en `vehiculoTypes.ts`; la unificación de ambos tipos (p.ej. que `rutaTypes.ts` reexporte desde `vehiculoTypes.ts`) queda como decisión de una iteración futura para no modificar `rutas_gestion` ahora.

### Ruta React

Registrar `/vehiculos` dentro de `ProtectedRoute` con rol `OPERADOR` en `frontend/src/router/index.tsx`, junto a las demás rutas del operador (`/dashboard`, `/envios`, `/rutas`, etc., según `docs/architecture.md`).

---

## 5. Decisión técnica

### Reutilización del modelo `Vehiculo` existente vs. nuevo modelo/migración

**Opción elegida: reutilizar el modelo `Vehiculo` y el enum `EstadoVehiculo` ya definidos en `backend/prisma/schema.prisma` (creados durante `rutas_gestion`), sin ninguna migración Prisma adicional.**

Justificación: el modelo ya contiene exactamente los campos pedidos por `feature_list.json` (`placa` único, `modelo`, `capacidad`, `estado` con los 4 valores DISPONIBLE | EN_RUTA | MANTENIMIENTO | FUERA_SERVICIO, más `createdAt`/`updatedAt` y la relación `rutas Ruta[]`). Crear un modelo paralelo o renombrar el existente introduciría duplicación de datos y rompería la relación que `Ruta` ya mantiene con `Vehiculo`. Esta feature es, en esencia, la capa de API + UI que faltaba sobre un modelo de datos que ya existe y ya está en uso por `rutas_gestion`.

**Opción descartada: crear un nuevo modelo `VehiculoRegistro` o ampliar el enum con valores adicionales (p.ej. `OCUPADO` para alinear con el wireframe que usa "Ocupado" como etiqueta visual).**

Motivo del descarte: el wireframe usa "Ocupado" como *etiqueta de presentación* del badge, no como un valor de estado distinto en el dominio — el valor de dominio correspondiente es `EN_RUTA` (así lo define explícitamente `feature_list.json` y `docs/architecture.md`). Mapear `EN_RUTA → "Ocupado"` es una decisión de presentación en el componente de badge del frontend, no un cambio de schema. Modificar el enum implicaría una migración de `DROP VALUE`/recreación de tipo en PostgreSQL (alto riesgo, ver precedente documentado en `progress/impl_rutas_gestion.md`, T23) para un beneficio puramente cosmético.

### Validación de placa duplicada: comprobación explícita en el servicio vs. depender solo de la restricción `@unique`

**Opción elegida: comprobar explícitamente la existencia de la placa en `vehiculoService.crear` antes de invocar `prisma.vehiculo.create`, y devolver un error de dominio 409 con mensaje claro.**

Justificación: permite controlar el código y mensaje de error que llega al cliente (`409 PLACA_DUPLICADA`) de forma consistente con el resto del sistema (p.ej. `auth_registro` hace lo mismo para correos duplicados, devolviendo 409). Depender únicamente de capturar la excepción `P2002` de Prisma acoplaría el manejo de errores de negocio a detalles del ORM y dificultaría las pruebas (habría que simular errores de Prisma en lugar de simplemente verificar una consulta `findUnique`).

**Opción descartada: dejar que la restricción `@unique` de la base de datos sea la única línea de defensa, capturando `PrismaClientKnownRequestError` con código `P2002` en el controlador o en el error handler global.**

Motivo del descarte: mezclaría detalles de infraestructura (códigos de error de Prisma) con la lógica de negocio expresada en el servicio, y produciría mensajes de error menos específicos para el cliente. Se mantiene la restricción `@unique` en el schema como red de seguridad ante condiciones de carrera, pero la ruta principal de validación es explícita en el servicio.

---

## 6. Seguridad

| Control | Detalle |
|---------|---------|
| Autenticación | Los tres endpoints requieren `authMiddleware` (JWT válido). |
| Autorización por rol | `POST`, `GET`, `PATCH` requieren `roleMiddleware('OPERADOR')`. Ningún otro rol (CLIENTE, REPARTIDOR) tiene acceso a la gestión de vehículos, conforme a la tabla de rutas permitidas por rol de `docs/architecture.md`. |
| Validación de entrada | Schema Zod en backend para cada endpoint: `crearVehiculoSchema` (placa no vacía, modelo no vacío, capacidad numérica > 0), `listarVehiculosSchema` (`estado` opcional, debe ser uno de los 4 valores del enum), `actualizarEstadoVehiculoSchema` (`estado` requerido, uno de los 4 valores del enum). Los inputs llegan saneados a la capa de repositorio; nunca se concatenan strings para construir consultas. |
| IDs | El parámetro `:id` se valida como `cuid` antes de consultar la base de datos. |
| Mensajes de error | No se exponen detalles internos de Prisma ni trazas de pila al cliente; el error handler global traduce excepciones a `{ error, message, statusCode }`. |
