# Design — rutas_gestion

---

## 1. Endpoints

| Método | Ruta | Auth | Rol | Payload de entrada | Payload de salida | HTTP Code |
|--------|------|------|-----|--------------------|-------------------|-----------|
| POST | `/api/v1/rutas` | JWT | OPERADOR | `{ enviosIds: string[], vehiculoId: string, repartidorId: string }` | `{ data: Ruta, message, status }` | 201 |
| GET | `/api/v1/rutas` | JWT | OPERADOR, REPARTIDOR | Query: `?page&limit&repartidorId=me` | `{ data: Ruta[], meta: { total, page, limit, totalPages }, message, status }` | 200 |
| GET | `/api/v1/rutas/:id` | JWT | OPERADOR, REPARTIDOR | — | `{ data: RutaDetalle, message, status }` | 200 |
| PATCH | `/api/v1/rutas/:id` | JWT | OPERADOR | `{ repartidorId?: string, vehiculoId?: string }` | `{ data: Ruta, message, status }` | 200 |
| GET | `/api/v1/rutas/:id/optima` | JWT | OPERADOR | — | `{ data: { paradas: EnvioOrdenado[], advertencia?: string }, message, status }` | 200 |

### Detalles de respuesta de error (todos los endpoints)

```
400 → payload malformado (fuera de rango Zod)
401 → sin token o token inválido
403 → rol no autorizado
404 → ruta, vehículo o repartidor no encontrado
422 → regla de negocio violada (vehículo no disponible, envío ya asignado, etc.)
500 → error interno
```

### Estructura de `RutaDetalle`

```
{
  id, codigo, estado, createdAt, updatedAt,
  vehiculo: { id, placa, modelo, capacidad, estado },
  repartidor: { id, usuario: { nombre, correo }, licencia, disponible },
  envios: [{ id, codigoSeguimiento, estado, direccionDestino, lat?, lng? }]
}
```

### Estructura de `EnvioOrdenado`

```
{
  orden: number,
  envioId: string,
  codigoSeguimiento: string,
  direccionDestino: string,
  lat?: number,
  lng?: number
}
```

---

## 2. Schema Prisma — Modelos afectados

### Modelo `Ruta` (nuevo campo `codigo`, estado enum)

```
model Ruta {
  id            String        @id @default(cuid())
  codigo        String        @unique           // formato: RUTA-YYYYMMDD-XXXX
  estado        EstadoRuta    @default(PENDIENTE)
  repartidorId  String
  vehiculoId    String
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  repartidor    Repartidor    @relation(fields: [repartidorId], references: [id])
  vehiculo      Vehiculo      @relation(fields: [vehiculoId], references: [id])
  envios        Envio[]
}

enum EstadoRuta {
  PENDIENTE
  EN_PROGRESO
  COMPLETADA
  CANCELADA
}
```

### Modelo `Envio` — campo `rutaId` (ya existente como opcional)

El campo `rutaId String?` ya existe en el schema base. Al crear una ruta, se actualiza en cada envío asignado.

### Modelo `Vehiculo` — verificar campo `estado` (ya existente)

```
enum EstadoVehiculo {
  DISPONIBLE
  EN_RUTA
  MANTENIMIENTO
  FUERA_SERVICIO
}
```

### Modelo `Repartidor` — verificar campo `disponible` (ya existente)

El campo `disponible Boolean @default(true)` ya existe en el schema base.

### Relación `RutaEnvio` (no se requiere tabla intermedia explícita)

La relación es directa: `Envio.rutaId → Ruta.id` (1 ruta tiene muchos envíos). No se necesita tabla pivot dado que un envío pertenece a como máximo una ruta activa.

---

## 3. Lógica de negocio

### 3.1 Creación de ruta (`rutaService.crear`)

Pasos en orden:
1. Validar que todos los `enviosIds` corresponden a envíos existentes con `estado = PENDIENTE` y `rutaId = null`.
2. Validar que el `vehiculoId` existe y tiene `estado = DISPONIBLE`.
3. Validar que el `repartidorId` existe y tiene `disponible = true`.
4. Generar código único de ruta con formato `RUTA-YYYYMMDD-XXXX` (4 chars alfanuméricos, uppercase). Reintentar hasta 3 veces en caso de colisión; si persiste, lanzar error 500.
5. Crear el registro `Ruta` en una transacción de base de datos junto con:
   - Actualizar `Envio.rutaId` y `Envio.estado = EN_RUTA` para cada envío asignado.
   - Actualizar `Vehiculo.estado = EN_RUTA`.
6. Devolver la ruta creada con sus relaciones.

### 3.2 Reasignación (`rutaService.reasignar`)

1. Verificar que la ruta existe y su estado no es `COMPLETADA` ni `CANCELADA`.
2. Si se cambia `repartidorId`: verificar disponibilidad del nuevo repartidor.
3. Si se cambia `vehiculoId`: verificar que el nuevo vehículo está en `DISPONIBLE`; revertir el vehículo anterior a `DISPONIBLE`; marcar el nuevo vehículo como `EN_RUTA`.
4. Actualizar la ruta. Todo en una transacción.

### 3.3 Algoritmo de ruta óptima (`rutaService.calcularOptima`)

Algoritmo: **Nearest Neighbor Heuristic** (vecino más cercano).

Entrada: lista de envíos con coordenadas `(lat, lng)`.

Pasos:
1. Si algún envío no tiene `lat`/`lng`, devolver los envíos en orden de inserción más un campo `advertencia`.
2. Elegir como punto de partida el primer envío de la lista (o una ubicación base del operador si se añade en futuro).
3. En cada iteración, seleccionar el envío no visitado más cercano al punto actual usando la fórmula de distancia euclidiana (suficiente para el alcance del sprint; Haversine se considera en la decisión técnica más abajo).
4. Repetir hasta visitar todos los envíos.
5. Retornar el array ordenado con campo `orden` (1-based).

Complejidad: O(n²), aceptable dado que una ruta no supera ~50 paradas.

### 3.4 Cierre automático de ruta

En el servicio de envíos (o en un evento post-actualización de estado), al marcar un envío como `ENTREGADO` o `CANCELADO`, verificar si todos los envíos de su ruta han llegado a un estado terminal. Si es así, actualizar `Ruta.estado = COMPLETADA` y `Vehiculo.estado = DISPONIBLE`.

---

## 4. Frontend — Pantallas, componentes, hooks, servicios

### Pantalla: `GestionRutas` (`frontend/src/features/rutas/GestionRutas.tsx`)

Basada en el wireframe "Gestión de Rutas":
- Campo "Ruta ID" (readonly, auto-generado o mostrado tras guardado).
- Lista de envíos disponibles con checkboxes para selección múltiple.
- Dropdown "Vehículo" con envíos filtrados a estado DISPONIBLE.
- Dropdown "Repartidor" con repartidores filtrados a `disponible = true`.
- Botón "GENERAR RUTA ÓPTIMA": llama al endpoint de ruta óptima y reordena la lista de envíos seleccionados.
- Botón "Guardar Ruta": envía el formulario de creación.

### Componentes internos

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `RutaForm` | `features/rutas/RutaForm.tsx` | Formulario de creación/edición de ruta |
| `EnvioCheckboxList` | `features/rutas/EnvioCheckboxList.tsx` | Lista de envíos seleccionables con checkbox |
| `RutaCard` | `features/rutas/RutaCard.tsx` | Tarjeta resumen de una ruta (para listas) |
| `RutaDetalle` | `features/rutas/RutaDetalle.tsx` | Vista detallada de una ruta |
| `ParadasOrdenadas` | `features/rutas/ParadasOrdenadas.tsx` | Muestra el resultado del orden óptimo |

### Hooks (`frontend/src/hooks/`)

| Hook | Descripción |
|------|-------------|
| `useRutas(filters)` | `useQuery` — lista paginada de rutas |
| `useRutaDetalle(id)` | `useQuery` — detalle de una ruta |
| `useCrearRuta()` | `useMutation` — POST /api/v1/rutas |
| `useReasignarRuta(id)` | `useMutation` — PATCH /api/v1/rutas/:id |
| `useRutaOptima(id)` | `useQuery` (lazy / enabled manual) — GET /api/v1/rutas/:id/optima |

### Servicios (`frontend/src/services/rutaService.ts`)

Funciones: `listar(filters)`, `obtenerDetalle(id)`, `crear(dto)`, `reasignar(id, dto)`, `obtenerOptima(id)`.

---

## 5. Decisión técnica

### Algoritmo de ruta óptima

**Opción elegida: Nearest Neighbor Heuristic con distancia euclidiana.**

Justificación: El sistema gestiona rutas de reparto urbano con un máximo estimado de 50 paradas por ruta. La heurística del vecino más cercano produce resultados entre un 15-25 % del óptimo global en la práctica, es comprensible para el equipo, y se implementa en O(n²) sin dependencias externas. Es directamente testeable con coordenadas fijas.

**Opción descartada: Integración con Google Maps Routes API / OpenRouteService.**

Motivo del descarte: Requiere credenciales externas, introduce latencia de red en el cálculo, añade costo operativo y complejidad de mocking en tests. Queda como mejora futura (sprint 6+) si la precisión geográfica se vuelve crítica.

---

## 6. Seguridad

| Control | Detalle |
|---------|---------|
| Autenticación | Todos los endpoints requieren `authMiddleware` (JWT válido). |
| Autorización por rol | `POST`, `PATCH`, `GET /optima`, `GET` (lista general) requieren `roleMiddleware('OPERADOR')`. `GET ?repartidorId=me` permite `OPERADOR` y `REPARTIDOR`; el REPARTIDOR solo ve sus propias rutas (el servicio filtra por `repartidorId = req.user.id`). |
| Validación de entrada | Schema Zod en backend para cada endpoint; validación de tipos, IDs como `cuid`, arrays no vacíos. |
| Prevención de asignación cruzada | El servicio verifica a nivel de base de datos (en transacción) que los envíos no estén ya asignados, evitando condiciones de carrera. |
| Paginación | `limit` máximo 100 para evitar consultas masivas. |
