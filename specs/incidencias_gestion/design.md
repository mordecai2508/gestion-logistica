# Design — incidencias_gestion

> Describe el "cómo". Referencia directa al stack y convenciones de
> `docs/architecture.md` y `docs/conventions.md`.

---

## 1. Endpoints

| # | Método | Ruta | Auth | Rol | Body / Query (entrada) | Respuesta exitosa | Código |
|---|--------|------|------|-----|------------------------|-------------------|--------|
| 1 | POST | `/api/v1/incidencias` | Bearer token (authMiddleware) | REPARTIDOR | JSON body: `{ envioId: string (cuid), tipo: TipoIncidencia, descripcion: string (min 1) }` | `{ data: IncidenciaDto, message: "Incidencia registrada", status: 201 }` | 201 |
| 2 | GET | `/api/v1/incidencias?tipo&estado&page&limit` | Bearer token (authMiddleware) | OPERADOR | Query: `?tipo=<TipoIncidencia>&estado=<EstadoIncidencia>&page=<int>&limit=<int>` (todos opcionales) | `{ data: IncidenciaListItemDto[], meta: { total, page, limit, totalPages }, message: "Incidencias obtenidas", status: 200 }` | 200 |
| 3 | PATCH | `/api/v1/incidencias/:id` | Bearer token (authMiddleware) | OPERADOR | JSON body: `{ estado: EstadoIncidencia }` (`ABIERTA` \| `EN_PROCESO` \| `RESUELTA`) | `{ data: IncidenciaDto, message: "Estado de incidencia actualizado", status: 200 }` | 200 |
| 4 | POST | `/api/v1/envios/:id/reprogramar` | Bearer token (authMiddleware) | OPERADOR | JSON body: `{ fechaReprogramacion: string (ISO 8601, fecha futura) }` | `{ data: ReprogramarEnvioResponseDto, message: "Entrega reprogramada", status: 200 }` | 200 |

**DTOs** (interfaces en `backend/src/types/incidenciaTypes.ts`, salvo el de
reprogramación que se añade a `backend/src/types/envioTypes.ts` por pertenecer
al recurso `Envio`):

```typescript
interface IncidenciaDto {
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  foto: string | null;
  nota: string | null;
  envioId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IncidenciaListItemDto {
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  estado: EstadoIncidencia;
  envioId: string;
  envioCodigoSeguimiento: string;
  createdAt: Date;
}

interface CrearIncidenciaDto {
  envioId: string;
  tipo: TipoIncidencia;
  descripcion: string;
}

interface ActualizarEstadoIncidenciaDto {
  estado: EstadoIncidencia;
}

interface PaginatedIncidenciasResponse {
  data: IncidenciaListItemDto[];
  meta: PaginationMeta; // { total, page, limit, totalPages } — ya definido en envioTypes.ts, se reutiliza/replica
}
```

```typescript
// backend/src/types/envioTypes.ts (se agrega)
interface ReprogramarEnvioDto {
  fechaReprogramacion: Date;
}

interface ReprogramarEnvioResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;             // estado del envío, sin cambios por la reprogramación
  fechaReprogramacion: string; // ISO 8601 UTC
}
```

**Códigos de error:**

| Situación | Código HTTP | `error` |
|---|---|---|
| Sin token / token inválido | 401 | `MISSING_TOKEN` / `INVALID_TOKEN` / `EXPIRED_TOKEN` |
| Rol incorrecto (crear incidencia con rol ≠ REPARTIDOR; listar/cambiar estado/reprogramar con rol ≠ OPERADOR) | 403 | `FORBIDDEN` |
| Envío no encontrado (crear incidencia, reprogramar) | 404 | `ENVIO_NOT_FOUND` |
| Incidencia no encontrada (cambio de estado) | 404 | `INCIDENCIA_NOT_FOUND` |
| Transición de estado de incidencia inválida (mismo estado, o `RESUELTA` → otro) | 409 | `INVALID_STATE_TRANSITION` |
| Reprogramación sobre envío en estado terminal (`ENTREGADO`/`CANCELADO`) | 409 | `INVALID_STATE_TRANSITION` |
| Validación Zod fallida (body/query: `tipo`/`estado` fuera de enum, `descripcion` vacía, `envioId` no-cuid, `fechaReprogramacion` ausente/inválida/no futura, paginación inválida) | 422 | detalle de campos |

---

## 2. Schema Prisma

**No se requiere ninguna migración nueva.** Todos los campos y relaciones
necesarios ya existen en `schema.prisma`:

| Modelo / Enum | Campo | Estado | Uso en esta feature |
|---|---|---|---|
| `Incidencia` | `id`, `tipo`, `descripcion`, `estado` (`@default(ABIERTA)`), `foto`, `nota`, `envioId`, `envio`, `createdAt`, `updatedAt` | Ya existe (creado en migración de `entregas_confirmacion`) | Se crea una fila al reportar (`POST /incidencias`); se lee para listar/filtrar y para `PATCH /:id`; `foto`/`nota` quedan `null` para incidencias creadas por esta vía (son específicos del flujo de fallo de entrega del repartidor — `entregaService.registrarFallo`). |
| `TipoIncidencia` (enum) | `ENTREGA_FALLIDA`, `CLIENTE_AUSENTE`, `DANIO`, `DIRECCION_INCORRECTA`, `OTRO` | Ya existe | **Nota de nombres**: el `feature_list.json`/wireframe usan "DAÑO", pero el enum Prisma define el valor como `DANIO` (sin diacrítico, por restricción de identificadores en enums SQL). El validator y el frontend deben usar `DANIO` como valor de transmisión, mostrando "Daño" solo como etiqueta visual. |
| `EstadoIncidencia` (enum) | `ABIERTA`, `EN_PROCESO`, `RESUELTA` | Ya existe | Estado de la incidencia; transición gestionada por `PATCH /incidencias/:id`. |
| `Envio` | `fechaReprogramacion DateTime?` | Ya existe (campo presente en `schema.prisma` y ya proyectado en DTOs/tests de `envios_consultar`/`entregas_confirmacion`, pero **sin endpoint que lo escriba**) | Se escribe en `POST /envios/:id/reprogramar`. |
| `Envio` | `incidencias Incidencia[]`, `eventos EventoEnvio[]`, `estado EstadoEnvio` | Ya existe | Relación usada para vincular la incidencia al envío y para registrar el evento de reprogramación; `estado` se valida pero no se modifica por la reprogramación (criterio de aceptación: "registra nueva fecha de entrega", no un cambio de estado del envío). |
| `EventoEnvio` | `descripcion`, `estado`, `timestamp`, `envioId` | Ya existe | Se crea un registro documentando la reprogramación, conservando el `estado` actual del envío y describiendo la nueva fecha. |

No se agregan campos ni tablas; **solo se agregan los archivos de código de las
capas service/repository/controller/route/validator/types** (no existen
todavía `incidenciaService.ts`, `incidenciaRepository.ts`,
`incidenciaController.ts`, `incidenciaValidator.ts`, `incidenciaTypes.ts` ni
`routes/incidencias.ts` — se confirmó su ausencia en `backend/src/{services,
repositories,controllers,validators,types,routes}`).

---

## 3. Lógica de negocio

### POST /incidencias — Reportar incidencia (R1–R5)

1. `authMiddleware` + `roleMiddleware('REPARTIDOR')`.
2. `crearIncidenciaSchema` (Zod) valida `{ envioId: cuid, tipo: enum TipoIncidencia, descripcion: string().min(1) }` (R3).
3. `incidenciaService.crear(dto)`:
   a. Verifica que el envío exista vía `envioRepository.findById(envioId)`
      (repositorio ya existente, se reutiliza — no se duplica acceso a Prisma).
      Si `null`: `AppError('ENVIO_NOT_FOUND', ..., 404)` (R2).
   b. Llama a `incidenciaRepository.crear({ envioId, tipo, descripcion })`, que
      persiste con `estado` por defecto `ABIERTA` (valor `@default` del schema;
      no se fuerza explícitamente desde el servicio).
   c. Proyecta y devuelve `IncidenciaDto` (R1).
4. El controlador responde `201`.

> **Nota de diseño**: a diferencia de `POST /envios/:id/fallo` (que crea una
> incidencia automáticamente como parte del flujo de confirmación de entrega,
> con `tipo: ENTREGA_FALLIDA` fijo y archivo de evidencia), este endpoint es el
> reporte **manual** del repartidor descrito en HU32: permite elegir cualquiera
> de los 5 tipos y no requiere archivo. Ambos flujos coexisten y usan el mismo
> modelo `Incidencia`.

### GET /incidencias — Listar con filtros (R6–R12)

1. `authMiddleware` + `roleMiddleware('OPERADOR')`.
2. `listarIncidenciasSchema` (Zod) valida query `{ tipo?: enum TipoIncidencia,
   estado?: enum EstadoIncidencia, page?: int positivo (default 1), limit?: int
   positivo (default 20) }` (R10), siguiendo el mismo patrón de
   `listarEnviosSchema` (transform de string a number con `.pipe`).
3. `incidenciaService.listar(query)`:
   a. Construye `where: Prisma.IncidenciaWhereInput` añadiendo `tipo`/`estado`
      solo si vienen definidos (R7, R8, R9 — combinables).
   b. Llama en paralelo a `incidenciaRepository.findMany(where, skip, limit)`
      (con `include: { envio: { select: { codigoSeguimiento: true } } }` y
      `orderBy: { createdAt: 'desc' }`, R6) y `incidenciaRepository.count(where)`.
   c. Proyecta cada fila a `IncidenciaListItemDto` (incluye
      `envioCodigoSeguimiento` desde la relación incluida).
   d. Devuelve `{ data, meta: { total, page, limit, totalPages } }`, igual
      patrón que `envioService.listar`.
4. El controlador responde `200`.

### PATCH /incidencias/:id — Cambiar estado (R13–R18)

1. `authMiddleware` + `roleMiddleware('OPERADOR')`.
2. `actualizarEstadoIncidenciaSchema` (Zod) valida `{ estado: enum
   EstadoIncidencia }` (R16).
3. `incidenciaService.actualizarEstado(id, nuevoEstado)`:
   a. Busca la incidencia vía `incidenciaRepository.findById(id)`. Si `null`:
      `AppError('INCIDENCIA_NOT_FOUND', ..., 404)` (R14).
   b. Valida la transición (R15):
      - Si `nuevoEstado === incidencia.estado` → `AppError('INVALID_STATE_TRANSITION', 'La incidencia ya se encuentra en ese estado', 409)`.
      - Si `incidencia.estado === 'RESUELTA'` y `nuevoEstado !== 'RESUELTA'` →
        `AppError('INVALID_STATE_TRANSITION', 'No se puede reabrir una incidencia resuelta', 409)`
        (estado terminal; ver sección 5 para la justificación de esta regla).
      - Cualquier otra combinación entre `{ABIERTA, EN_PROCESO, RESUELTA}` es
        válida (incluye retroceder de `EN_PROCESO` a `ABIERTA`, deliberadamente
        permitido para que el operador pueda corregir un cambio accidental
        mientras la incidencia siga abierta).
   c. Llama a `incidenciaRepository.actualizarEstado(id, nuevoEstado)`.
   d. Proyecta y devuelve `IncidenciaDto` (R13).
4. El controlador responde `200`.

### POST /envios/:id/reprogramar — Reprogramar entrega (R19–R24)

1. `authMiddleware` + `roleMiddleware('OPERADOR')`.
2. `reprogramarEnvioSchema` (Zod) valida `{ fechaReprogramacion: string ISO
   8601 → coerce a Date, refinada con `> new Date()` ("debe ser una fecha
   futura") }` (R21). Se usa `z.coerce.date().refine(...)` siguiendo el patrón
   de transformación-y-validación ya usado en `listarEnviosSchema`
   (`.transform(...).pipe(...)`), adaptado a fechas.
3. `envioService.reprogramar(id, dto)` (se agrega al `envioService` existente,
   junto a `crear`/`listar`/`editar`/`cancelar`, pues opera sobre el agregado
   `Envio` — no sobre `Incidencia`):
   a. Busca el envío vía `envioRepository.findById(id)`. Si `null`:
      `AppError('ENVIO_NOT_FOUND', ..., 404)` (R20).
   b. Verifica que `envio.estado` no sea `ENTREGADO` ni `CANCELADO`; si lo es:
      `AppError('INVALID_STATE_TRANSITION', 'No se puede reprogramar un envío en estado terminal', 409)` (R22).
   c. Llama a `envioRepository.reprogramar(id, { fechaReprogramacion, descripcionEvento })`,
      que en una sola transacción Prisma (`prisma.$transaction`, mismo patrón
      que `entregaRepository.confirmarEntrega`/`registrarFallo`):
      - Actualiza `Envio.fechaReprogramacion = fechaReprogramacion`
        (sin tocar `Envio.estado`, conforme al criterio de aceptación
        "registra nueva fecha de entrega").
      - Crea `EventoEnvio`: `{ envioId, estado: envio.estado, descripcion:
        'Entrega reprogramada para <fechaReprogramacion ISO>', timestamp: now }`
        — documenta el cambio en el historial sin alterar el estado del envío
        (R19).
   d. Proyecta y devuelve `ReprogramarEnvioResponseDto`.
4. El controlador responde `200`.

---

## 4. Frontend

### Pantalla nueva en `frontend/src/features/incidencias/`

#### `GestionIncidencias.tsx`
- Ruta: `/incidencias` (protegida, rol `OPERADOR`; ya listada en
  `docs/architecture.md` como ruta permitida para OPERADOR).
- Header con título "Incidencias" y botón "+ Nueva Incidencia" (alineado al
  wireframe; abre un modal/formulario de creación — ver nota más abajo sobre
  alcance de creación desde esta pantalla).
- Barra de filtros: dos `Select` (Shadcn) — "Tipo" (`TipoIncidencia` + opción
  "Todos") y "Estado" (`EstadoIncidencia` + opción "Todos") — que alimentan
  `useIncidencias({ tipo, estado, page })` (R26).
- Tabla (Shadcn `Table`): columnas Código (id corto o `envioCodigoSeguimiento`),
  Tipo, Descripción, Estado (badge con color por estado), Acciones (botones
  "Ver" y "Editar") — replica exactamente el wireframe (R25).
- Paginación inferior (componente compartido `Pagination` si existe en
  `components/shared/`, o control simple anterior/siguiente con `meta`) (R27).
- Acción "Editar" abre `CambiarEstadoIncidenciaModal` (Shadcn `Dialog`) con un
  `Select` limitado a `{ABIERTA, EN_PROCESO, RESUELTA}` y botón "Guardar" que
  dispara `useActualizarEstadoIncidencia` (`useMutation`) (R28).
- Acción "Ver" navega a o expande el detalle de la incidencia (datos ya
  presentes en la fila — descripción completa, fechas, envío vinculado);
  reutiliza el mismo `Dialog`/componente de detalle si resulta más simple que
  una ruta nueva.
- En éxito de la mutación de cambio de estado: toast de confirmación e
  invalidación de la query de listado. En error: toast con el mensaje devuelto
  por el backend (Shadcn Toast, nunca `alert()`).

> **Nota de alcance — creación de incidencias**: el criterio de aceptación
> de la pantalla habla de la tabla código/tipo/descripción/estado y el
> wireframe muestra un botón "+ Nueva Incidencia" en la vista del OPERADOR;
> sin embargo, `POST /api/v1/incidencias` está restringido a rol REPARTIDOR
> (R4, alineado con la descripción de la feature: "El repartidor reporta
> incidencias. El operador las consulta, cambia su estado..."). El botón
> "+ Nueva Incidencia" se incluye en la UI por fidelidad al wireframe, pero
> al activarse con sesión OPERADOR el backend respondería 403; por tanto el
> formulario que abre **no** debe enviar la creación vía
> `POST /incidencias` (rol incorrecto). Esta inconsistencia entre wireframe y
> reglas de rol del `feature_list.json`/`docs/architecture.md` debe resolverse
> con el humano antes de implementar: se sugiere implementar el botón como
> deshabilitado/oculto para OPERADOR con un tooltip explicativo, o redirigir a
> un flujo de "ver/filtrar" — **no** construir un formulario de creación que
> nunca podrá completarse con éxito. (Ver sección 5 para la decisión técnica
> tomada al respecto.)

### Componente nuevo en `frontend/src/features/repartidor/` (o `components/shared/`)

#### `ReportarIncidencia` (formulario/modal)
- Punto de entrada: extiende el flujo ya existente de
  `ConfirmacionEntrega.tsx` (que ya tiene el link "Reportar incidencia" para
  el flujo de fallo de entrega vía `POST /envios/:id/fallo`) **o** una entrada
  nueva accesible desde `VistaRepartidor.tsx` para reportar una incidencia
  fuera del flujo de confirmación (p.ej. "Cliente ausente" antes de llegar al
  destino). Campos: `Select` de `tipo` (`TipoIncidencia`), `Textarea` de
  `descripcion` (requerida). Dispara `useCrearIncidencia` (`useMutation`)
  enviando `{ envioId, tipo, descripcion }`.
- En éxito: toast de confirmación, invalidación de queries relacionadas
  (`['entregas', 'me']` si aplica) y cierre del formulario. En error: toast
  con el mensaje del backend.

### Componente nuevo en `frontend/src/features/envios/` (o `components/shared/`)

#### `ReprogramarEntregaModal`
- Accesible desde el detalle de un envío (pantalla "Consultar Envíos" /
  detalle, ya existente en `features/envios/`) para el rol OPERADOR.
- `DatePicker`/`Input type="datetime-local"` (Shadcn) para la nueva fecha de
  entrega, con validación cliente (fecha futura) espejo de la del backend.
  Botón "Reprogramar" dispara `useReprogramarEnvio` (`useMutation`) con
  `{ envioId, fechaReprogramacion }`.
- En éxito: toast, invalidación de `['envios', 'detalle', envioId]` y cierre
  del modal. En error: toast con el mensaje del backend.

### Hooks nuevos en `frontend/src/hooks/`

- `useIncidencias.ts` — `useQuery({ queryKey: ['incidencias', filters], queryFn: () => incidenciaService.listar(filters) })`, devuelve `PaginatedIncidenciasResponse`.
- `useCrearIncidencia.ts` — `useMutation({ mutationFn: incidenciaService.crear, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidencias'] }) })`.
- `useActualizarEstadoIncidencia.ts` — `useMutation({ mutationFn: ({ id, estado }) => incidenciaService.actualizarEstado(id, estado), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['incidencias'] }) })`.
- `useReprogramarEnvio.ts` — `useMutation({ mutationFn: ({ envioId, fechaReprogramacion }) => envioService.reprogramar(envioId, fechaReprogramacion), onSuccess: (_, { envioId }) => queryClient.invalidateQueries({ queryKey: ['envios', 'detalle', envioId] }) })`.

### Servicios frontend en `frontend/src/services/`

- `incidenciaService.ts`:
  - `listar(filters: IncidenciaFilters): Promise<PaginatedIncidenciasResponse>` — `GET /api/v1/incidencias` con query `?tipo&estado&page&limit`.
  - `crear(dto: CrearIncidenciaDto): Promise<IncidenciaDto>` — `POST /api/v1/incidencias`.
  - `actualizarEstado(id: string, estado: EstadoIncidencia): Promise<IncidenciaDto>` — `PATCH /api/v1/incidencias/:id`.
- `envioService.ts` (se extiende, ya existe):
  - `reprogramar(envioId: string, fechaReprogramacion: string): Promise<ReprogramarEnvioResponseDto>` — `POST /api/v1/envios/:id/reprogramar`.

### Router

Añadir/confirmar en `frontend/src/router/`:
- `/incidencias` → `<ProtectedRoute roles={['OPERADOR']}>` → `<GestionIncidencias />`.

### Tipos frontend

`frontend/src/types/incidenciaTypes.ts` — replica `IncidenciaDto`,
`IncidenciaListItemDto`, `CrearIncidenciaDto`, `PaginatedIncidenciasResponse` y
los enums `TipoIncidencia`/`EstadoIncidencia` (importados de `@prisma/client`
únicamente en el backend; en el frontend se redefinen como `type` unión de
literales, igual patrón que `EstadoEnvio` en `entregaTypes.ts` del frontend —
revisar si ya existe ese patrón y reutilizarlo). `ReprogramarEnvioDto`/
`ReprogramarEnvioResponseDto` se agregan a `frontend/src/types/envioTypes.ts`.

---

## 5. Decisión técnica clave

### Decisión: la reprogramación NO cambia `Envio.estado`

**Opción elegida**: `POST /envios/:id/reprogramar` actualiza únicamente
`Envio.fechaReprogramacion` y agrega un `EventoEnvio` descriptivo, dejando
`Envio.estado` intacto.

**Alternativa descartada**: hacer que la reprogramación transicione el envío a
un estado intermedio (p.ej. `EN_PREPARACION` o de vuelta a `PENDIENTE`) para
"reiniciar" su ciclo de entrega.

**Justificación**: el criterio de aceptación es explícito — "registra nueva
fecha de entrega" — y no menciona cambio de estado. `docs/architecture.md`
documenta `EstadoEnvio` como una máquina de estados con semántica de progreso
logístico (`PENDIENTE → EN_PREPARACION → EN_TRANSITO/EN_RUTA → ENTREGADO`, con
`CANCELADO`/`FALLIDO` como ramas terminales/alternas); forzar una transición no
prevista introduciría ambigüedad sobre cómo continúa el flujo (¿requeriría
nueva asignación de ruta? ¿el repartidor lo ve de nuevo como pendiente?) que
está fuera del alcance descrito por esta feature y generaría efectos
colaterales sobre `rutaService` no solicitados. Mantener `estado` intacto y
usar `fechaReprogramacion` + `EventoEnvio` (ambos campos/relaciones ya
existentes y sin uso) es la opción mínima, trazable y reversible: dado que el
campo `fechaReprogramacion` ya está en el schema desde una migración anterior
(visto en DTOs y fixtures de test de `envios_consultar`/`entregas_confirmacion`
sin que ningún endpoint lo escriba todavía), todo apunta a que fue diseñado
exactamente para este propósito.

### Decisión secundaria: `RESUELTA` es un estado terminal para `Incidencia`

**Opción elegida**: `PATCH /incidencias/:id` rechaza con 409 cualquier
transición que parta de `RESUELTA` hacia otro estado (R15), pero permite
libremente moverse entre `ABIERTA` ⇄ `EN_PROCESO` ⇄ `RESUELTA` mientras no se
haya llegado a `RESUELTA`.

**Alternativa descartada**: permitir cualquier transición arbitraria entre los
3 estados en cualquier momento (máquina de estados "plana" sin restricciones).

**Justificación**: el criterio de aceptación solo exige "actualiza estado
(ABIERTA | EN_PROCESO | RESUELTA)" sin detallar una máquina de transiciones, lo
que deja a este spec definir la regla mínima razonable. Tratar `RESUELTA` como
terminal sigue el mismo patrón ya aplicado a `EstadoEnvio` en
`envios_consultar`/`entregas_confirmacion` (`ENTREGADO`/`CANCELADO`/`FALLIDO`
no admiten retransición — `INVALID_STATE_TRANSITION` 409) y evita que una
incidencia cerrada se reabra silenciosamente, lo cual rompería la trazabilidad
operativa (reportes, métricas de tiempo de resolución). Si el negocio
necesitara reabrir incidencias resueltas, sería una decisión de producto
explícita que ameritaría su propio criterio de aceptación — no algo que deba
inferirse implícitamente al implementar el PATCH.

---

## 6. Seguridad

- **Separación de roles por flujo** (alineada con la descripción de la
  feature: "El repartidor reporta incidencias... El operador las consulta,
  cambia su estado y puede reprogramar"):
  - `roleMiddleware('REPARTIDOR')` en `POST /incidencias` — solo el repartidor
    puede reportar incidencias; ningún operador o cliente puede crearlas por
    esta vía (R4).
  - `roleMiddleware('OPERADOR')` en `GET /incidencias`, `PATCH /incidencias/:id`
    y `POST /envios/:id/reprogramar` — solo el operador consulta, cambia
    estados y reprograma entregas (R11, R17, R23).
- **authMiddleware** aplicado a los 4 endpoints — ninguno es accesible sin
  token válido (R5, R12, R18, R24).
- **Validación de existencia antes de mutar**: tanto la creación de
  incidencias como la reprogramación verifican que el `Envio` referenciado
  exista (`ENVIO_NOT_FOUND` 404) antes de cualquier escritura; el cambio de
  estado de incidencia verifica que la `Incidencia` exista
  (`INCIDENCIA_NOT_FOUND` 404) — replica el patrón ya usado en
  `envioService.editar`/`cancelar` y `entregaService`.
- **Transiciones de estado controladas**: tanto `Incidencia.estado`
  (`ABIERTA`/`EN_PROCESO`/`RESUELTA`, terminal en `RESUELTA`) como la
  reprogramación de `Envio` (rechazada si `estado` es `ENTREGADO`/`CANCELADO`)
  validan la transición antes de escribir, devolviendo `409
  INVALID_STATE_TRANSITION` — mismo código y patrón que
  `envioService.cancelar`/`entregaService.confirmarEntrega`.
- **Validación de fecha de reprogramación**: `reprogramarEnvioSchema` exige
  una fecha parseable y estrictamente futura (`> new Date()`), rechazando con
  422 fechas pasadas, presentes o mal formadas — evita reprogramar entregas
  "al pasado" o con valores no interpretables (R21).
- **Inputs sanitizados con Zod**: todos los bodies/queries (incluyendo los
  filtros `tipo`/`estado` de `GET /incidencias`, restringidos a los valores de
  los enums `TipoIncidencia`/`EstadoIncidencia`) se validan con Zod antes de
  construir el `where` de Prisma — nunca se concatenan strings ni se pasa
  input crudo a `prisma` (alineado con `docs/architecture.md`, sección
  Seguridad).
- **Persistencia atómica de la reprogramación**: la actualización de
  `Envio.fechaReprogramacion` y la creación del `EventoEnvio` ocurren en una
  sola transacción Prisma (`prisma.$transaction`), igual patrón que
  `entregaRepository.confirmarEntrega`/`registrarFallo`, evitando un evento de
  historial huérfano si la actualización del envío falla (o viceversa).
- **Sin lógica de negocio en controladores/repositorios**: la verificación de
  existencia, las reglas de transición de estado y la validación de fecha
  futura viven en `incidenciaService`/`envioService`; `incidenciaRepository` y
  las extensiones de `envioRepository` solo ejecutan operaciones Prisma
  (regla crítica de `docs/architecture.md`).
