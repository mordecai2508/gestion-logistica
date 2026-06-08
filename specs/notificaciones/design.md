# Design — notificaciones

> Describe el "cómo". Referencia directa al stack y convenciones de
> `docs/architecture.md` y `docs/conventions.md`.

---

## 0. Estado actual relevante (verificado en el repo antes de diseñar)

- **Modelo `Notificacion` ya existe** en `schema.prisma` (líneas 169-178):
  `{ id, mensaje, leida (Boolean @default(false)), usuarioId, envioId?,
  createdAt, usuario, envio }`. **Aún no tiene columna `tipo`** ni `leidaAt`
  — la columna `tipo TipoNotificacion` se agrega como parte de **esta**
  feature mediante una migración aprobada por el humano (Decisión 5.3,
  revisada): el spec ya no depende de derivar el tipo por heurística.
- **Ya se persisten notificaciones** (sin emitir Socket.IO ni correo) desde
  `entregaService.confirmarEntrega` y `entregaService.registrarFallo`, vía
  `entregaRepository.crearNotificacion({ usuarioId, envioId, mensaje })`
  (`backend/src/services/entregaService.ts:129,161`). Mensajes actuales:
  `"Tu envío {codigo} fue entregado"` / `"No fue posible entregar tu envío
  {codigo}: {nota}"`.
- **`envioService.crear` NO crea notificación ni envía correo** pese a que la
  descripción de la feature `envios_crear` dice "notifica al cliente"
  (verificado: no hay `crearNotificacion`/`sendMail`/`notificacion` en
  `envioService.ts`). Es una **brecha preexistente** que esta feature debe
  cerrar (ver R7 y sección 3).
- **Socket.IO existe** (`backend/src/sockets/tracking.ts`, registrado en
  `index.ts`) pero **sin ningún middleware de autenticación de socket**
  (`io.use`). Las salas actuales (`tracking:${envioId}`) son públicas: el
  cliente se une enviando un `envioId` arbitrario, sin verificar identidad.
  **No existe ningún mecanismo para "el canal del usuario"** — esta feature
  debe crearlo (ver sección 3 y Decisión técnica 5.1).
- **`mailer.ts` solo expone `sendPasswordResetEmail`**; no hay una función
  genérica de envío de correo de notificación. En modo test, `sendMail` no
  se invoca (`if (NODE_ENV === 'test') return`) — patrón que se debe
  replicar para no requerir SMTP real en los tests (Mailpit se usa solo en
  verificación manual, según `CLAUDE.md`).
- **No existe `routes/notificaciones.ts`, `notificacionController.ts`,
  `notificacionService.ts`, `notificacionRepository.ts`,
  `notificacionValidator.ts` ni `notificacionTypes.ts`** — se confirmó su
  ausencia. Tampoco existe `frontend/src/features/notificaciones/*` (la
  carpeta solo contiene `.gitkeep`, ya prevista en `docs/architecture.md`).
- El frontend ya tiene `lib/socket.ts` (cliente `socket.io-client` con
  `autoConnect: false`) y el hook `useTrackingSocket.ts` como patrón de
  referencia para suscripción/limpieza de eventos.

---

## 1. Endpoints

| # | Método | Ruta | Auth | Rol | Body / Query (entrada) | Respuesta exitosa | Código |
|---|--------|------|------|-----|------------------------|-------------------|--------|
| 1 | GET | `/api/v1/notificaciones?page&limit` | Bearer token (authMiddleware) | CLIENTE, OPERADOR, REPARTIDOR (cualquier usuario autenticado) | Query: `?page=<int positivo, default 1>&limit=<int positivo, default 20>` | `{ data: NotificacionDto[], meta: { total, page, limit, totalPages }, message: "Notificaciones obtenidas", status: 200 }` | 200 |
| 2 | PATCH | `/api/v1/notificaciones/:id/leer` | Bearer token (authMiddleware) | CLIENTE, OPERADOR, REPARTIDOR (cualquier usuario autenticado) | Sin body (parámetro de ruta `id`) | `{ data: NotificacionDto, message: "Notificación marcada como leída", status: 200 }` (con `leida: true`) | 200 |

**Alcance de escritura ampliado por decisión del humano (5.2, revisada)**:
se agrega exactamente **un** endpoint de escritura — marcar una notificación
individual como leída. **No se agrega** un endpoint de "marcar todas como
leídas": ningún criterio de aceptación ni historia de usuario (HU35-HU39) lo
pide explícitamente, y el humano solo amplió el alcance para cubrir "marcar
como leída" (caso individual). Agregar el caso masivo ahora sería
sobre-ingeniería no solicitada; puede incorporarse en una iteración futura
si surge esa necesidad. Ver Decisión técnica 5.2 (reescrita) para el
detalle de esta decisión de diseño.

**DTOs** (interfaces en `backend/src/types/notificacionTypes.ts`):

```typescript
// Tipo de notificación — ahora persistido como columna `tipo` en BD
// (enum Prisma `TipoNotificacion`, ver sección 2 y Decisión técnica 5.3,
// revisada). Ya NO se deriva ni se infiere: viaja intacto desde la
// creación hasta la proyección de salida.
type TipoNotificacion =
  | 'ENVIO_CREADO'
  | 'CAMBIO_ESTADO'
  | 'ENTREGA_REALIZADA'
  | 'RUTA_ASIGNADA'
  | 'INCIDENCIA_REPORTADA';

interface NotificacionDto {
  id: string;
  tipo: TipoNotificacion;
  mensaje: string;
  leida: boolean;
  envioId: string | null;
  createdAt: string; // ISO 8601 UTC
}

interface PaginatedNotificacionesResponse {
  data: NotificacionDto[];
  meta: PaginationMeta; // { total, page, limit, totalPages } — ya definido en envioTypes.ts, se reutiliza
}

// Payload del evento Socket.IO `notification:new` — mismo shape que NotificacionDto
// para que el frontend pueda insertar el item directamente en la lista cacheada.
type NotificationNewPayload = NotificacionDto;
```

```typescript
// Input interno (no expuesto por API pública): usado por otros servicios
// (envioService, rutaService, incidenciaService, entregaService) para pedir
// la creación + emisión + correo de una notificación de forma uniforme.
interface CrearNotificacionInput {
  usuarioId: string;
  envioId?: string;
  mensaje: string;
  tipo: TipoNotificacion;
}
```

**Códigos de error:**

| Situación | Endpoint(s) | Código HTTP | `error` |
|---|---|---|---|
| Sin token / token inválido | 1, 2 | 401 | `MISSING_TOKEN` / `INVALID_TOKEN` / `EXPIRED_TOKEN` |
| Validación Zod fallida (paginación: `page`/`limit` no enteros positivos) | 1 | 422 | detalle de campos |
| La notificación no existe, o existe pero pertenece a otro usuario | 2 | 404 | `NOTIFICACION_NOT_FOUND` |

El listado (endpoint 1) no tiene condiciones 403/404 propias: siempre
filtra por `usuarioId = req.user.id`, por lo que no expone datos de otros
usuarios ni depende de un identificador de recurso externo.

El endpoint 2 (`PATCH /:id/leer`) sí depende de un identificador de recurso
externo (`:id` en la URL), por lo que **debe** verificar pertenencia: el
servicio busca la notificación por `id` y exige `notificacion.usuarioId ===
req.user.id`; si no existe **o** pertenece a otro usuario, responde **404**
(nunca 403) — el mismo principio de "no confirmar la existencia de un
recurso ajeno" que ya aplica en el resto del sistema (p.ej.
`entregaService.obtenerEnvioModificable` no distingue entre "no existe" y
"no te pertenece" cuando el filtro de pertenencia es la única barrera de
seguridad real). Es **CRÍTICO** que ningún usuario pueda marcar como leída
—ni descubrir la existencia de— una notificación de otro usuario.

---

## 2. Schema Prisma

**Se requiere una migración** (APROBADA por el humano — Decisión 5.3,
revisada): se agrega un nuevo enum `TipoNotificacion` y una columna `tipo
TipoNotificacion` (no nula, sin `@default`) al modelo `Notificacion`.

```prisma
enum TipoNotificacion {
  ENVIO_CREADO
  CAMBIO_ESTADO
  ENTREGA_REALIZADA
  RUTA_ASIGNADA
  INCIDENCIA_REPORTADA
}

model Notificacion {
  id        String           @id @default(cuid())
  mensaje   String
  tipo      TipoNotificacion
  leida     Boolean          @default(false)
  usuarioId String
  envioId   String?
  createdAt DateTime         @default(now())
  usuario   Usuario          @relation(fields: [usuarioId], references: [id])
  envio     Envio?           @relation(fields: [envioId], references: [id])
}
```

**Comando sugerido para el implementer** (T1):

```
npx prisma migrate dev --name add_tipo_notificacion
```

| Campo | Tipo | Uso en esta feature |
|---|---|---|
| `id` | `String @id @default(cuid())` | Identificador (`NotificacionDto.id`). |
| `mensaje` | `String` | Texto de la notificación (R1, R4, R11). |
| `tipo` | `TipoNotificacion` (**nuevo**, enum Prisma con los 5 valores `ENVIO_CREADO`, `CAMBIO_ESTADO`, `ENTREGA_REALIZADA`, `RUTA_ASIGNADA`, `INCIDENCIA_REPORTADA`) | Clasificación persistida de la notificación; se proyecta directamente a `NotificacionDto.tipo` sin heurísticas (R1, R4, R11, R15, R16). |
| `leida` | `Boolean @default(false)` | Estado leído/no leído (R4, R11). Se persiste en `false` al crear; se actualiza a `true` exclusivamente vía `PATCH /notificaciones/:id/leer` (R20-R23, ver sección 1). |
| `usuarioId` | `String` (FK a `Usuario`) | Destinatario; filtra el listado por `req.user.id` (R5, R11) y la verificación de pertenencia de `PATCH /:id/leer` (R22). |
| `envioId` | `String?` (FK opcional a `Envio`) | Referencia opcional al envío relacionado (R4, R11). |
| `createdAt` | `DateTime @default(now())` | Timestamp de creación; base del "tiempo relativo" en la UI (R15) y del orden `desc` (R11). |

**Migración de datos existentes**: como `tipo` es una columna nueva no nula
sin `@default`, Prisma pedirá un valor para las filas existentes (las
notificaciones ya creadas por `entregaService.confirmarEntrega`/
`registrarFallo` antes de esta feature, si las hay en datos de
desarrollo/seed). El implementer debe resolver el prompt interactivo de
`prisma migrate dev` asignando un valor por defecto razonable para las filas
preexistentes (p.ej. `CAMBIO_ESTADO`, el tipo más genérico) o, si el entorno
de desarrollo no tiene datos persistidos relevantes, optar por reiniciar la
base de datos de desarrollo (`prisma migrate reset`, **nunca** en datos que
importe conservar). Esto **no** afecta a producción (el proyecto no tiene
despliegue productivo aún, según `docs/architecture.md`).

**Impacto en features ya cerradas**: este cambio modifica un modelo de
`infra_base` (feature ya cerrada) y es consumido por `entregas_confirmacion`
(también cerrada, vía `entregaRepository.crearNotificacion`). El humano ya
aprobó explícitamente este cambio retroactivo (Decisión 5.3); el T10 de esta
feature reemplaza esas llamadas por `notificacionService.notificar(...)`
(que sí provee `tipo`), eliminando el único punto de creación que quedaría
incompleto tras la migración.

---

## 3. Lógica de negocio

### 3.1 Punto único de creación: `notificacionService.notificar(input)`

Para cumplir R1-R10 sin duplicar lógica de "crear + emitir + correo" en cada
servicio de dominio (`envioService`, `rutaService`, `incidenciaService`,
`entregaService`), se centraliza en una función orquestadora:

```typescript
// notificacionService.notificar(input: CrearNotificacionInput): Promise<NotificacionDto>
```

Pasos:
1. Persiste el registro vía `notificacionRepository.crear({ usuarioId,
   envioId, mensaje, tipo })` — **el campo `tipo` ahora SÍ se persiste**
   directamente en la columna `tipo` (enum `TipoNotificacion`, ver sección 2
   y Decisión técnica 5.3, revisada). La columna `leida` queda en su default
   `false`.
2. Proyecta el registro creado a `NotificacionDto`, leyendo `tipo`
   directamente del registro persistido (ya no es necesario "recordarlo" del
   input — el dato vive en BD desde el primer momento, sin riesgo de
   divergencia entre lo emitido por socket/correo y lo almacenado).
3. Emite `notification:new` a la sala `user:${usuarioId}` con el
   `NotificationNewPayload` (R5). Ver sección 3.2 para el mecanismo de
   salas por usuario.
4. SI `tipo` está en el subconjunto que dispara correo
   (`ENVIO_CREADO`, `ENTREGA_REALIZADA`, `INCIDENCIA_REPORTADA` — mapeo
   exacto de R7-R9, ver tabla más abajo) Y el usuario tiene `correo`
   (siempre lo tiene — campo obligatorio en `Usuario`), llama a
   `sendNotificationEmail(correo, asunto, cuerpo)` de `lib/mailer.ts` (R7,
   R8, R9).
5. El envío de correo se ejecuta dentro de un `try/catch` que **no
   propaga** el error: si `sendNotificationEmail` rechaza, se captura,
   se registra con `console.error` (único uso permitido de `console.error`
   según `docs/conventions.md`, en el error handler global o equivalente
   de logging) y la función `notificar` continúa devolviendo la
   `NotificacionDto` con éxito (R10). La persistencia (paso 1) y la
   emisión Socket.IO (paso 3) **deben completarse antes** del intento de
   envío de correo, para que un fallo de SMTP nunca impida que la
   notificación quede registrada y visible en tiempo real.
6. Devuelve la `NotificacionDto`.

**Tabla de disparo de correo (R7, R8, R9)** — mapeo `tipo` → envío de email:

| `tipo` | ¿Envía correo? | Asunto sugerido |
|---|---|---|
| `ENVIO_CREADO` | Sí (R7) | "Tu envío {codigo} fue registrado" |
| `CAMBIO_ESTADO` | No | — |
| `ENTREGA_REALIZADA` | Sí (R8 — disparado específicamente cuando el nuevo estado es `ENTREGADO`) | "Tu envío {codigo} fue entregado" |
| `RUTA_ASIGNADA` | No | — |
| `INCIDENCIA_REPORTADA` | Sí (R9) | "Se reportó una incidencia en tu envío {codigo}" |

> Nota: el criterio de aceptación dice literalmente "estado entregado", no
> "cualquier cambio de estado" — por eso `CAMBIO_ESTADO` (genérico) no
> dispara correo, solo el caso específico `ENTREGA_REALIZADA`. Esto evita
> saturar al cliente con un correo por cada transición intermedia
> (`PENDIENTE → EN_PREPARACION → EN_TRANSITO → ...`), que generaría ruido no
> solicitado por ningún criterio.

### 3.2 Salas Socket.IO por usuario — "canal del usuario" (R5)

El criterio de aceptación pide emitir `notification:new` "al canal del
usuario correspondiente". Como **no existe today ningún mecanismo de
identidad en los sockets**, se introduce:

1. **Middleware de autenticación de socket** `io.use((socket, next) => ...)`
   en `backend/src/index.ts` (o extraído a `sockets/auth.ts` si crece):
   lee el JWT desde `socket.handshake.auth.token` (el cliente lo envía al
   conectar — ver sección 4), lo verifica con la misma lógica de
   `authMiddleware` (reutilizar `jwt.verify` + `jwtSecret`; **no duplicar**
   la función de verificación — extraerla a `lib/jwt.ts` si
   `authMiddleware.ts` no la expone ya como función reutilizable, o
   replicar el `try/catch` mínimo si extraerla implica tocar un archivo de
   una feature ya cerrada de forma más invasiva de lo razonable — decisión
   a confirmar por el implementer con el humano si el costo no es trivial).
   Si el token es válido, adjunta `socket.data.userId = payload.id` y llama
   `next()`; si no, llama `next(new Error('UNAUTHORIZED'))` y la conexión se
   rechaza.
2. **Auto-join a la sala personal**: inmediatamente tras una conexión
   autenticada exitosa, el servidor une el socket a la sala
   `user:${socket.data.userId}` (en `io.on('connection', ...)`, antes o
   junto a `registerTrackingHandlers`). El cliente **no** solicita unirse
   explícitamente (a diferencia de `tracking:join`): la sala se asigna en
   el servidor a partir de la identidad verificada del token, evitando que
   un usuario pueda suscribirse al canal de otro enviando un `usuarioId`
   arbitrario (mismo principio de seguridad que ya aplica a
   `GET /notificaciones`, que filtra por `req.user.id` y no por un parámetro
   de la URL).
3. `notificacionService.notificar` emite con
   `io.to(`user:${usuarioId}`).emit('notification:new', payload)`.

Esto se documenta en un nuevo archivo `backend/src/sockets/notificaciones.ts`
que exporta `registerNotificacionHandlers(io, socket)` (de momento sin
listeners entrantes — el flujo es servidor→cliente únicamente, R5/R6 no
piden eventos entrantes) **y/o** la función de auto-join, según cómo el
implementer organice el `io.on('connection', ...)` para mantener paridad de
estilo con `registerTrackingHandlers`.

### 3.3 Puntos de integración — quién llama a `notificacionService.notificar`

Para cubrir R1-R3 sin "inventar" disparadores no descritos, se listan
exactamente los eventos mencionados en la descripción de la feature
("cambios de estado de envíos, asignación de rutas, incidencias y
confirmaciones de entrega") y en los criterios de aceptación:

| Evento disparador | Servicio que integra la llamada | `tipo` | Mensaje sugerido | Estado actual |
|---|---|---|---|---|
| Envío creado | `envioService.crear` | `ENVIO_CREADO` | `"Tu envío {codigo} fue registrado"` | **Nuevo** — `envioService.crear` hoy no notifica (brecha preexistente, ver sección 0). Esta feature lo agrega para cumplir R1+R7. |
| Cambio de estado de envío (genérico, vía `PATCH /envios/:id`, reprogramación, etc.) | `envioService.editar` y cualquier otro punto que mute `Envio.estado` y aún no notifique | `CAMBIO_ESTADO` | `"Tu envío {codigo} cambió de estado a {estado}"` | A confirmar si `envioService.editar` cambia `estado` (revisar al implementar; si no lo hace, este disparador puede no aplicar a ese método). |
| Confirmación de entrega (`estado → ENTREGADO`) | `entregaService.confirmarEntrega` | `ENTREGA_REALIZADA` | `"Tu envío {codigo} fue entregado"` | **Ya existe** la persistencia vía `entregaRepository.crearNotificacion` — esta feature la **reemplaza** por una llamada a `notificacionService.notificar(..., tipo: 'ENTREGA_REALIZADA')` para que también emita Socket.IO y dispare correo (R5, R8), sin duplicar el registro en BD. |
| Fallo de entrega | `entregaService.registrarFallo` | `CAMBIO_ESTADO` | `"No fue posible entregar tu envío {codigo}: {nota}"` | **Ya existe** la persistencia — se migra al punto único igual que el anterior, para que también emita Socket.IO (R5). No dispara correo (no está en la tabla de R7-R9). |
| Ruta creada / repartidor o vehículo (re)asignado | `rutaService.crear` y `rutaService.actualizar` (o el método de reasignación, según exista) | `RUTA_ASIGNADA` | `"Se te asignó la ruta {id/código} con {n} envíos"` | **Nuevo** — verificar al implementar si `rutas_gestion` ya notifica (no se encontró evidencia; si existe, migrar al punto único). Destinatario: el `usuarioId` del `Repartidor` asignado (resolver `repartidor.usuarioId`, mismo patrón que `entregaService` resuelve `cliente.usuarioId`). |
| Incidencia reportada | `incidenciaService.crear` (la creación manual del repartidor, `POST /incidencias`) y el flujo de `entregaService.registrarFallo` que crea una incidencia automática | `INCIDENCIA_REPORTADA` | `"Se reportó una incidencia en tu envío {codigo}: {tipo}"` | **Nuevo** — disparado hacia el `usuarioId` del cliente del envío referenciado (resolver `envio.cliente.usuarioId`). Dispara correo (R9). |

> **Importante para el implementer**: antes de tocar `rutaService` y
> `incidenciaService`, releer sus archivos para confirmar si ya existe
> alguna llamada a `crearNotificacion`/`notificacionRepository` (no se
> encontró ninguna en la búsqueda realizada para este spec, pero el código
> pudo cambiar). Si existe, **migrarla** al punto único
> `notificacionService.notificar` en lugar de duplicar.

### 3.4 GET /notificaciones — Listado paginado (R11-R14)

1. `authMiddleware` (cualquier rol autenticado — no hay `roleMiddleware`,
   ya que cada usuario solo ve sus propias notificaciones).
2. `listarNotificacionesSchema` (Zod) valida query `{ page?: int positivo
   (default 1), limit?: int positivo (default 20) }` (R13), mismo patrón
   `.transform(...).pipe(...)` que `listarEnviosSchema`/
   `listarIncidenciasSchema`.
3. `notificacionService.listar(usuarioId, { page, limit })`:
   a. Llama en paralelo a `notificacionRepository.findManyByUsuario(usuarioId,
      skip, limit)` (con `orderBy: { createdAt: 'desc' }`, R11) y
      `notificacionRepository.countByUsuario(usuarioId)`.
   b. Proyecta cada fila a `NotificacionDto`. **El campo `tipo` ahora se lee
      directamente de la columna `tipo` persistida en BD** (ver sección 2 y
      Decisión técnica 5.3, revisada) — sin heurísticas, sin adivinar a
      partir del texto de `mensaje`. La proyección es una asignación directa
      `tipo: row.tipo`, igual de simple y robusta que el resto de los campos
      (`mensaje`, `leida`, `envioId`, `createdAt`).
   c. Devuelve `{ data, meta: { total, page, limit, totalPages } }`, mismo
      patrón que `envioService.listar`/`incidenciaService.listar`.
4. El controlador responde `200`.

### 3.5 PATCH /notificaciones/:id/leer — Marcar como leída (R20-R23)

1. `authMiddleware` (cualquier rol autenticado, igual que el listado — no
   hay `roleMiddleware`: la única barrera de seguridad real es la
   pertenencia, no el rol).
2. `notificacionController.marcarComoLeida` extrae `:id` de los parámetros
   de ruta (sin payload de body — no hay nada que validar con Zod más allá
   del parámetro de ruta, que Prisma valida implícitamente al buscar por
   `id` con formato `cuid`).
3. `notificacionService.marcarComoLeida(id, usuarioId)`:
   a. Busca la notificación por `id` vía
      `notificacionRepository.findById(id)`.
   b. **Si no existe, o existe pero `notificacion.usuarioId !== usuarioId`**,
      lanza `AppError('NOTIFICACION_NOT_FOUND', 'Notificación no encontrada',
      404)` — **es CRÍTICO no distinguir entre "no existe" y "pertenece a
      otro usuario"**: ambas situaciones devuelven exactamente el mismo 404,
      de modo que un usuario no pueda usar este endpoint para enumerar o
      confirmar la existencia de notificaciones ajenas (mismo principio que
      `entregaService.obtenerEnvioModificable`, que valida pertenencia antes
      de revelar cualquier dato del recurso).
   c. Si la notificación ya tiene `leida: true`, el servicio **no** lanza
      error (no es un estado inválido ni una condición de carrera relevante
      — marcar como leída una notificación ya leída es una operación
      idempotente y inofensiva): simplemente devuelve la `NotificacionDto`
      actual proyectada, sin necesidad de un nuevo `UPDATE` en BD. Esto evita
      tratar como "error" un doble clic o una recarga del cliente.
   d. En caso contrario, llama a
      `notificacionRepository.marcarComoLeida(id)` (un `UPDATE ... SET
      leida = true WHERE id = :id`, sin lógica de negocio en el repository)
      y proyecta el resultado a `NotificacionDto` (con `leida: true`).
4. El controlador responde `200` con `{ data: NotificacionDto, message:
   "Notificación marcada como leída", status: 200 }`.

**Nota de diseño — sin emisión de evento Socket.IO**: a diferencia de
`notificar` (que emite `notification:new` porque crea un recurso para *otro*
usuario potencialmente conectado en otro dispositivo), `marcarComoLeida` es
una mutación que el propio usuario autenticado realiza sobre su propio dato,
en respuesta directa a su propia acción en la UI — el cliente que originó la
petición ya actualiza su estado local con la respuesta HTTP (200 +
`NotificacionDto` actualizado), sin necesidad de un evento adicional. Emitir
`notification:read` (o similar) sería razonable únicamente si se quisiera
sincronizar el estado "leída" entre **múltiples sesiones simultáneas** del
mismo usuario (p.ej. móvil + escritorio) — un caso de uso **no mencionado**
en ningún criterio de aceptación ni HU (HU35-HU39 solo hablan de recibir
notificaciones nuevas en tiempo real, R5/R18). Añadirlo ahora sería
sobre-ingeniería; se documenta esta decisión para que quede explícita y
pueda revisitarse si el humano identifica esa necesidad de sincronización
multi-sesión en el futuro.

---

## 4. Frontend

### Pantalla nueva en `frontend/src/features/notificaciones/`

#### `Notificaciones.tsx`
- Ruta: `/notificaciones` (protegida, accesible para los 3 roles — ya
  listada para CLIENTE en la tabla de `docs/architecture.md`; OPERADOR y
  REPARTIDOR también reciben notificaciones según R2/R3, por lo que la ruta
  debe estar disponible para los 3 — confirmar/ajustar la tabla de rutas
  permitidas si el humano lo considera necesario, ver Decisión técnica 5.4).
- Lista de notificaciones (Shadcn `Card`/`ul`): cada item muestra ícono según
  `tipo` (mapeo `TipoNotificacion` → ícono `lucide-react`, p.ej.
  `PackageCheck` para `ENTREGA_REALIZADA`, `Truck` para `RUTA_ASIGNADA`,
  `AlertTriangle` para `INCIDENCIA_REPORTADA`, `PackagePlus` para
  `ENVIO_CREADO`, `RefreshCw` para `CAMBIO_ESTADO`), mensaje en negrita,
  descripción (se reutiliza `mensaje` como única fuente de texto — el
  wireframe distingue "mensaje en negrita" de "descripción" pero el modelo
  solo persiste un `mensaje`; ver Decisión técnica 5.5) y tiempo relativo
  (R15).
- Borde izquierdo coloreado según `tipo` (clases Tailwind condicionales,
  p.ej. `border-l-4 border-l-{color}`) (R16).
- Paginación inferior cuando `meta.totalPages > 1` (mismo patrón que
  `ConsultarEnvios.tsx`/`GestionIncidencias.tsx`) (R17).
- Estado vacío: mensaje "No tienes notificaciones" cuando `data.length === 0`
  (R19).
- Suscripción en tiempo real vía `useNotificacionesSocket` (R18): al recibir
  `notification:new`, antepone el nuevo item a la query cacheada de la
  primera página (`queryClient.setQueryData`) o invalida `['notificaciones']`
  — preferir `setQueryData` con inserción optimista para que aparezca sin
  parpadeo, replicando el espíritu de actualización en vivo de
  `useTrackingSocket`, adaptado de "actualizar marcador" a "anteponer item".
- Control "marcar como leída" (R20-R23, ampliación de alcance aprobada —
  Decisión 5.2, revisada): cada item de la lista que tenga `leida: false`
  muestra un control simple (botón/ícono, p.ej. `Check`/`MailOpen` de
  `lucide-react`, con `aria-label="Marcar como leída"`) que invoca
  `useMarcarNotificacionLeida().mutate(id)`. Mientras la mutación está en
  curso, el control se deshabilita (evita doble clic / doble request); al
  resolver con éxito, el item refleja visualmente el nuevo estado `leida:
  true` (p.ej. deja de mostrarse en negrita / pierde un indicador de "no
  leída", según el lenguaje visual que el implementer decida siguiendo el
  wireframe — el wireframe no especifica este control en detalle porque no
  estaba en el alcance original; el implementer tiene libertad de estilo
  siempre que el estado quede claramente reflejado). Las notificaciones ya
  `leida: true` no muestran el control (no hay acción que ofrecer).

### Componente nuevo en `frontend/src/components/shared/` (o dentro de la feature)

#### `formatTiempoRelativo(iso: string): string`
- Utilidad pura (no hay `date-fns`/`dayjs` en `frontend/package.json` — se
  confirmó al revisar dependencias) que calcula la diferencia entre
  `new Date(iso)` y `Date.now()` y devuelve cadenas tipo "hace 5 minutos",
  "hace 2 horas", "hace 3 días", siguiendo el idioma `es` ya usado en
  `EventoTimeline.tsx` (`Intl.DateTimeFormat('es-CO', ...)`). Si el
  implementer prefiere una librería, debe primero confirmarlo con el humano
  (agregar una dependencia nueva no es una decisión trivial — ver Decisión
  técnica 5.6).

### Hook nuevo en `frontend/src/hooks/`

- `useNotificaciones.ts` — `useQuery({ queryKey: ['notificaciones', { page,
  limit }], queryFn: () => notificacionService.listar({ page, limit }) })`,
  devuelve `PaginatedNotificacionesResponse`.
- `useNotificacionesSocket.ts` — efecto que conecta `socket` (si no está
  conectado), emite el `auth.token` al conectar (ver más abajo), escucha
  `notification:new` y aplica `queryClient.setQueryData` /
  `invalidateQueries(['notificaciones'])`; limpia el listener al
  desmontar — mismo patrón de cleanup que `useTrackingSocket`.
- `useMarcarNotificacionLeida.ts` (**nuevo** — cubre R20-R23, ampliación de
  alcance aprobada, Decisión 5.2 revisada): `useMutation({ mutationFn: (id:
  string) => notificacionService.marcarComoLeida(id) })`, mismo patrón
  `useMutation` + invalidación/actualización de caché que otros hooks de
  escritura del proyecto (p.ej. `useActualizarEstadoIncidencia` o
  equivalente en `incidencias`). En `onSuccess`, actualiza la query cacheada
  `['notificaciones', { page, limit }]` reemplazando el item afectado por la
  `NotificacionDto` devuelta (`leida: true`) vía `queryClient.setQueryData`
  — evita un refetch completo y refleja el cambio al instante en la UI.

> **Cambio requerido en `frontend/src/lib/socket.ts`**: la instancia `socket`
> se crea hoy con `io(SOCKET_URL, { autoConnect: false, transports:
> ['websocket'] })`, **sin `auth`**. Para que el middleware `io.use` del
> backend (sección 3.2) pueda autenticar la conexión, el cliente debe enviar
> el `accessToken` vigente en `socket.handshake.auth.token`. Dos opciones:
> (a) pasar `auth: (cb) => cb({ token: useAuthStore.getState().accessToken })`
> al construir el socket (re-evaluado en cada intento de conexión/reconexión,
> recomendado), o (b) llamar `socket.auth = { token }` y `socket.connect()`
> justo antes de conectar desde el hook. Ver Decisión técnica 5.1 para la
> opción elegida.

### Servicio frontend en `frontend/src/services/`

- `notificacionService.ts`:
  - `listar(filters: { page?: number; limit?: number }):
    Promise<PaginatedNotificacionesResponse>` — `GET /api/v1/notificaciones`
    con query `?page&limit`.
  - `marcarComoLeida(id: string): Promise<NotificacionDto>` (**nuevo** — R20)
    — `PATCH /api/v1/notificaciones/:id/leer`, sin body; devuelve la
    `NotificacionDto` actualizada (`leida: true`).

### Router

Añadir/confirmar en `frontend/src/router/`:
- `/notificaciones` → `<ProtectedRoute roles={['CLIENTE', 'OPERADOR',
  'REPARTIDOR']}>` → `<Notificaciones />` (ver Decisión técnica 5.4 sobre
  por qué se incluyen los 3 roles).

### Tipos frontend

`frontend/src/types/notificacionTypes.ts` — replica `NotificacionDto`,
`PaginatedNotificacionesResponse`, `NotificationNewPayload` y la unión de
literales `TipoNotificacion` (sin importar `@prisma/client`, mismo patrón de
`incidenciaTypes.ts`/`entregaTypes.ts` del frontend).

---

## 5. Decisiones técnicas clave

### 5.1 Autenticación de sockets: JWT en `handshake.auth` + sala `user:${id}` server-side

**Opción elegida**: middleware `io.use` que verifica el `accessToken` JWT
enviado en `socket.handshake.auth.token` al conectar, y auto-join
server-side a la sala `user:${userId}` derivada del token verificado (sin
que el cliente la solicite).

**Alternativa descartada**: replicar el patrón de `tracking:join` —
permitir que el cliente emita algo como `notification:join({ usuarioId })`
y el servidor lo una a esa sala sin verificación.

**Justificación**: `tracking:${envioId}` es deliberadamente público (un
cliente anónimo puede rastrear con solo el código de seguimiento — HU14-17,
sin auth requerida según R del spec de `rastreo_paquete`). El canal de
notificaciones, en cambio, es **inherentemente privado por usuario** — el
criterio de aceptación dice explícitamente "al canal del usuario
correspondiente". Permitir que el cliente declare su propio `usuarioId` sin
verificación permitiría a cualquier socket suscribirse a las notificaciones
de cualquier otro usuario (fuga de información — incidencias, estados de
envío de terceros). Verificar el JWT en el handshake es el único enfoque
consistente con cómo ya se protege `GET /notificaciones` (filtra por
`req.user.id`, nunca por un parámetro de la URL) y con la sección
"Seguridad" de `docs/architecture.md` ("inputs sanitizados... nunca
confiar en el cliente para autorización").

### 5.2 [DECISIÓN FINAL — APROBADA] Se amplía el alcance: endpoint para marcar como leída (caso individual)

**Decisión del humano**: en la puerta de aprobación, el humano **amplió el
alcance original** de este spec para incluir la capacidad de marcar
notificaciones como leídas — la disyuntiva original (sección "Opción
elegida vs alternativa descartada" de la primera versión de este documento)
se resuelve a favor de **sí agregar** el mecanismo de escritura.

**Opción final elegida**: se agrega **un solo** endpoint nuevo, `PATCH
/api/v1/notificaciones/:id/leer`, que marca **una notificación individual**
como leída (ver sección 1, endpoint 2, y sección 3.5 para el detalle de la
lógica). **No se agrega** un endpoint de "marcar todas como leídas" (p.ej.
`PATCH /notificaciones/leer-todas`).

**Alternativa descartada (parcialmente)**: agregar también el caso masivo
("marcar todas como leídas").

**Justificación de incluir el caso individual**: el humano lo solicitó
explícitamente como parte de la ampliación de alcance, y el modelo
`Notificacion` ya contaba con la columna `leida` (sugiriendo que el mecanismo
de escritura era una omisión, no una decisión deliberada de excluirlo —
exactamente la inconsistencia que la primera versión de esta sección señalaba
al humano).

**Justificación de excluir el caso masivo**: ni los criterios de aceptación
originales (HU35-HU39) ni la instrucción de ampliación del humano mencionan
"marcar todas como leídas" — agregarlo ahora sería **inventar un requisito
no solicitado** (sobre-ingeniería), violando la misma regla de
`spec_author`/`docs/specs.md` que motivó originalmente no incluir ningún
mecanismo de escritura. El caso individual cubre la necesidad expresada
("marcar como leída") de la forma más simple y consistente con el resto del
sistema (mismo patrón `PATCH /:id` que `PATCH /incidencias/:id`). Si en el
futuro se requiere el caso masivo, puede añadirse como una ampliación
incremental (un nuevo endpoint reutilizando `notificacionRepository` y
`notificacionService` ya existentes) sin romper nada de lo aquí diseñado.

**Diseño elegido para el endpoint individual**: `PATCH
/notificaciones/:id/leer` (verbo en la URL, sin body) en lugar de `PATCH
/notificaciones/:id` con un body `{ leida: true }`. Se prefiere la primera
forma porque (a) es la única transición de estado válida para este recurso
desde la API pública (no existe ni se planea un caso "marcar como no leída",
así que un body genérico `{ leida: boolean }` expondría una capacidad no
solicitada y no verificable contra ningún requisito), y (b) sigue el
precedente más cercano del propio dominio de la app
(`PATCH /incidencias/:id` recibe el nuevo estado completo porque la
incidencia tiene una máquina de estados con varias transiciones válidas;
`Notificacion.leida` en cambio es un *flag* binario con una sola transición
con sentido — `false → true` — lo cual encaja mejor con un sub-recurso de
acción del estilo `/:id/leer`, similar en espíritu a patrones REST de
"acciones" sobre un recurso).

### 5.3 [DECISIÓN FINAL — APROBADA] El `tipo` de notificación SÍ se persiste en BD vía migración

**Decisión del humano**: el humano **aprobó la migración Prisma** que la
primera versión de este documento recomendaba como "la opción técnicamente
correcta" — la disyuntiva queda **cerrada** a favor de persistir `tipo`.

**Opción final elegida**: se agrega un nuevo enum `TipoNotificacion` (con
los 5 valores `ENVIO_CREADO`, `CAMBIO_ESTADO`, `ENTREGA_REALIZADA`,
`RUTA_ASIGNADA`, `INCIDENCIA_REPORTADA`) y una columna `tipo
TipoNotificacion` (no nula) al modelo `Notificacion`, vía
`npx prisma migrate dev --name add_tipo_notificacion` (ver sección 2 para
el detalle completo del cambio de schema y la migración de datos
existentes). El `tipo` se persiste en el momento de la creación
(`notificacionRepository.crear`, sección 3.1) y se proyecta directamente
desde BD en el listado (sección 3.4) — **sin heurísticas, sin adivinanzas
por texto**.

**Alternativa descartada**: la heurística de derivación por substring del
`mensaje` (documentada en la primera versión de esta sección como "opción de
respaldo" si el humano prefería no migrar) — descartada por ser
estructuralmente frágil (cualquier cambio de redacción de mensajes rompe el
mapeo) y por ya no ser necesaria, dado que la opción correcta fue aprobada.

**Justificación**: persistir `tipo` directamente es la única forma de que el
dato sea **estable, explícito y verificable** — un campo de BD con tipo enum
no puede "desalinearse" de su valor real de la forma en que una heurística de
texto sí puede. Esto también simplifica el código (asignación directa
`tipo: row.tipo` en la proyección, sin una función de mapeo de 5 ramas que
mantener) y elimina por completo la deuda técnica que la primera versión de
este documento señalaba como motivo de preocupación. El **impacto en
features cerradas** (`infra_base`, `entregas_confirmacion`) que motivó la
cautela original fue evaluado y aceptado explícitamente por el humano al
aprobar la migración — T10 ya contemplaba reemplazar las llamadas a
`entregaRepository.crearNotificacion` por `notificacionService.notificar`
(que ahora sí puede proveer `tipo` de forma completa, ya que se persiste).

### 5.4 [DECISIÓN FINAL — APROBADA] La pantalla "Notificaciones" se habilita para los 3 roles

**Decisión del humano**: el humano **aprobó** la opción propuesta en la
primera versión de este documento — la disyuntiva queda **cerrada**: la ruta
`/notificaciones` se habilita para los 3 roles, tal como se diseñó.

**Opción final elegida (confirmada, sin cambios respecto a la primera
versión)**: la ruta `/notificaciones` se protege con `<ProtectedRoute
roles={['CLIENTE', 'OPERADOR', 'REPARTIDOR']}>` (ver sección 4, "Router").

**Justificación (reiterada)**: R2 y R3 generan notificaciones también para
`REPARTIDOR` (asignación de ruta) — restringir la pantalla solo a `CLIENTE`
dejaría al repartidor sin forma de ver notificaciones que el sistema sí le
genera y emite por Socket.IO, una inconsistencia entre backend y frontend
que el humano decidió evitar habilitando los 3 roles.

**Acción derivada (nueva — agregada a `tasks.md`)**: dado que la tabla
"Rutas frontend permitidas" de `docs/architecture.md` actualmente solo lista
`/notificaciones` bajo `CLIENTE` (líneas 74-78), se agrega una task
dedicada para actualizar esa tabla y reflejar los 3 roles aprobados —
documentación que debe mantenerse sincronizada con el comportamiento real
del sistema (ver T19 en `tasks.md`, renumerada).

### 5.5 `mensaje` único cubre "mensaje en negrita" + "descripción" del wireframe

**Opción elegida**: el único campo de texto persistido (`mensaje`) se
muestra tanto como el "mensaje en negrita" como la "descripción" mencionados
en `docs/wireframe-reference.md` ("ícono de tipo + mensaje en negrita +
descripción + tiempo relativo") — en la práctica, se renderiza una sola
línea de texto en negrita (sin una segunda línea de descripción separada), o
se reutiliza el mismo string para ambas posiciones visuales si el diseño de
componente exige dos nodos.

**Alternativa descartada**: dividir `mensaje` en dos partes (p.ej. primera
oración = "mensaje", resto = "descripción") con un parseo de texto.

**Justificación**: el modelo `Notificacion` solo expone `mensaje: String`
(un único campo). Inventar un parseo de "primera oración / resto" sería
frágil y dependería de la puntuación exacta de cada mensaje generado en
sección 3.3 (algunos terminan en `:` seguido de una nota libre, otros no).
Mantener un solo texto es la opción mínima fiel a los datos disponibles; si
el humano considera importante distinguir visualmente "título" y
"descripción", la opción correcta sería **also agregar un segundo campo al
modelo** (de nuevo, requeriría migración) — se deja como posible ampliación
futura, no como parte de este spec.

### 5.6 Tiempo relativo: utilidad propia, sin nueva dependencia

**Opción elegida**: implementar `formatTiempoRelativo` como función pura con
`Intl`/aritmética de fechas nativa de JS, sin agregar `date-fns`/`dayjs`.

**Alternativa descartada**: agregar `date-fns` (o similar) a
`frontend/package.json` para usar `formatDistanceToNow`.

**Justificación**: se confirmó que `frontend/package.json` no tiene
ninguna librería de fechas, y `EventoTimeline.tsx` ya resuelve formato de
fechas con `Intl.DateTimeFormat` nativo (sin dependencias). Agregar una
dependencia nueva al monorepo es una decisión que afecta el bundle y el
mantenimiento a largo plazo — no es una decisión "de una sola feature".
Una función de \~15 líneas (diffs en minutos/horas/días con `Intl.RelativeTimeFormat('es', { numeric: 'auto' })`,
disponible nativamente en navegadores modernos) cubre el requisito (R15)
sin ese costo. Si el humano prefiere estandarizar con una librería de
fechas para todo el frontend, debería ser una decisión transversal —no
algo que esta feature decida unilateralmente.

---

## 6. Seguridad

- **`authMiddleware`** aplicado a `GET /notificaciones` y a `PATCH
  /notificaciones/:id/leer` — ninguno de los dos accesible sin token válido
  (R14, R23).
- **Sin `roleMiddleware`** en ninguno de los dos endpoints: son accesibles
  para cualquier rol autenticado, porque el filtro de seguridad real es por
  identidad (`usuarioId = req.user.id`), no por rol — ningún usuario puede
  solicitar ni mutar las notificaciones de otro.
- **Verificación de pertenencia en `PATCH /:id/leer` — CRÍTICA** (R21, R22,
  sección 3.5): a diferencia del listado (que filtra desde el origen por
  `usuarioId = req.user.id` y por tanto nunca expone IDs ajenos), este
  endpoint recibe un identificador de recurso en la URL (`:id`) que el
  cliente controla. El servicio **debe** cargar la notificación y comparar
  `notificacion.usuarioId === req.user.id` **antes** de mutar cualquier
  dato, y responder **404** (nunca 403, nunca 200) tanto si el recurso no
  existe como si pertenece a otro usuario — un único código de error que no
  filtra si el `id` corresponde a un recurso real ajeno (evita que un
  atacante use respuestas diferenciadas para enumerar IDs válidos de
  notificaciones de terceros). Es el mismo principio de "ocultar la
  existencia de recursos ajenos tras un 404 uniforme" que ya aplica, por
  ejemplo, en `entregaService.obtenerEnvioModificable`.
- **Autenticación de sockets obligatoria** (sección 3.2, Decisión 5.1): el
  middleware `io.use` rechaza conexiones sin un JWT válido, evitando que
  sockets anónimos se unan a salas `user:${id}` arbitrarias.
- **Sala derivada server-side, nunca declarada por el cliente**: el
  `usuarioId` de la sala de notificación proviene del JWT verificado
  (`socket.data.userId`), no de un payload enviado por el cliente — mismo
  principio de "no confiar en el cliente para autorización" que ya aplica
  al filtro `usuarioId = req.user.id` del listado HTTP.
- **Fallos de correo no bloquean ni exponen información sensible** (R10): un
  error de SMTP se captura y registra internamente (`console.error`), nunca
  se traduce en un error HTTP hacia el cliente que disparó la operación
  original (creación de envío, confirmación de entrega, etc.) — evita que un
  problema de infraestructura de correo (p.ej. Mailpit caído en desarrollo)
  rompa flujos de negocio no relacionados.
- **Reutilización del modo test de `mailer.ts`**: igual que
  `sendPasswordResetEmail`, la nueva función de envío de correo de
  notificación debe retornar inmediatamente cuando `NODE_ENV === 'test'`
  (sin invocar `transporter.sendMail`), para que la suite de Jest no
  dependa de un servidor SMTP real — los tests verifican el envío con un
  mock/spy sobre la función exportada de `lib/mailer.ts` (criterio de
  aceptación: "envío de correo (mock)").
- **Validación de paginación con Zod**: `page`/`limit` se validan como
  enteros positivos antes de construir la consulta Prisma (R13), mismo
  patrón que `listarEnviosSchema`/`listarIncidenciasSchema` — nunca se pasa
  input crudo de query string a `skip`/`take`.
- **Sin lógica de negocio en controladores/repositorios**: la decisión de
  qué `tipo` dispara correo, la resolución del destinatario
  (`cliente.usuarioId` / `repartidor.usuarioId`) y la composición de
  mensajes viven en los servicios (`notificacionService` y los servicios de
  dominio que lo invocan); `notificacionRepository` solo ejecuta
  operaciones Prisma (regla crítica de `docs/architecture.md`).
