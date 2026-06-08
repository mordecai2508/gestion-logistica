# Design — entregas_confirmacion

> Describe el "cómo". Referencia directa al stack y convenciones de
> `docs/architecture.md` y `docs/conventions.md`.

---

## 1. Endpoints

| # | Método | Ruta | Auth | Rol | Body / Query (entrada) | Respuesta exitosa | Código |
|---|--------|------|------|-----|------------------------|-------------------|--------|
| 1 | GET | `/api/v1/entregas?repartidorId=me` | Bearer token (authMiddleware) | REPARTIDOR | Query: `?repartidorId=me` (único valor soportado) | `{ data: { pendientes: EntregaListItemDto[], completadas: EntregaListItemDto[] }, message: "Entregas obtenidas", status: 200 }` | 200 |
| 2 | POST | `/api/v1/envios/:id/confirmar` | Bearer token (authMiddleware) | REPARTIDOR | `multipart/form-data`: campo `foto` (file, `image/jpeg`/`image/png`, ≤5MB), campo `firma` (file, `image/jpeg`/`image/png`, ≤5MB) | `{ data: ConfirmarEntregaResponseDto, message: "Entrega confirmada", status: 200 }` | 200 |
| 3 | POST | `/api/v1/envios/:id/fallo` | Bearer token (authMiddleware) | REPARTIDOR | `multipart/form-data`: campo `nota` (string, requerido, min 1), campo `foto` (file opcional, `image/jpeg`/`image/png`, ≤5MB) | `{ data: RegistrarFalloResponseDto, message: "Fallo de entrega registrado", status: 200 }` | 200 |

**DTOs** (interfaces en `backend/src/types/entregaTypes.ts`):

```typescript
interface EntregaListItemDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio;
  destinatario: string;
  direccionDestino: string;
  rutaId: string | null;
  updatedAt: string;       // ISO 8601 UTC — usado como referencia de "rango horario" en el wireframe
}

interface EntregasAgrupadasDto {
  pendientes: EntregaListItemDto[];
  completadas: EntregaListItemDto[];
}

interface ConfirmarEntregaResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio;        // "ENTREGADO"
  evidenciaFoto: string;      // ruta/URL relativa del archivo persistido
  firma: string;              // ruta/URL relativa del archivo persistido
  fechaEntrega: string;       // ISO 8601 UTC — timestamp del EventoEnvio creado
}

interface RegistrarFalloResponseDto {
  id: string;
  codigoSeguimiento: string;
  estado: EstadoEnvio;        // "FALLIDO"
  incidenciaId: string;
}
```

**Códigos de error:**

| Situación | Código HTTP | `error` |
|---|---|---|
| Sin token / token inválido | 401 | `MISSING_TOKEN` / `INVALID_TOKEN` / `EXPIRED_TOKEN` |
| Rol distinto de REPARTIDOR | 403 | `FORBIDDEN` |
| Envío no asignado al repartidor autenticado | 403 | `FORBIDDEN` |
| Repartidor sin perfil asociado | 404 | `REPARTIDOR_NOT_FOUND` |
| Envío no encontrado | 404 | `ENVIO_NOT_FOUND` |
| Transición de estado inválida (ya `ENTREGADO`/`CANCELADO`/`FALLIDO`) | 409 | `INVALID_STATE_TRANSITION` |
| Validación Zod fallida (`repartidorId` ≠ `me`, `nota` faltante) | 422 | detalle de campos |
| Falta `foto` o `firma` en confirmación | 422 | `MISSING_FILE` |
| Tipo MIME no soportado (`foto`/`firma`) | 422 | `INVALID_FILE_TYPE` |
| Archivo mayor a 5 MB (`foto`/`firma`) | 422 | `FILE_TOO_LARGE` |

---

## 2. Schema Prisma

**No se requiere ninguna migración nueva.** Todos los campos necesarios ya existen en `schema.prisma`:

| Modelo | Campo | Uso en esta feature |
|---|---|---|
| `Envio` | `evidenciaFoto String?` | Ruta/URL del archivo de foto de evidencia, escrita al confirmar la entrega. |
| `Envio` | `firma String?` | Ruta/URL del archivo de imagen de la firma del receptor, escrita al confirmar la entrega. |
| `Envio` | `estado EstadoEnvio` | Transiciona a `ENTREGADO` (confirmación) o `FALLIDO` (fallo). |
| `EventoEnvio` | `descripcion`, `estado`, `timestamp` | Se crea un registro nuevo en cada confirmación o fallo, documentando el cambio de estado (`ENTREGADO`/`FALLIDO`) con su descripción y marca de tiempo. |
| `Incidencia` | `tipo TipoIncidencia` (`ENTREGA_FALLIDA`), `descripcion`, `nota`, `foto`, `estado` (`ABIERTA` por defecto), `envioId` | Se crea una `Incidencia` nueva al registrar un fallo de entrega, asociada al `Envio`. El campo `foto` guarda la ruta/URL de la evidencia (opcional); `nota` guarda el texto del repartidor. |
| `Notificacion` | `mensaje`, `usuarioId`, `envioId`, `leida` | Se crea una notificación para el `Usuario` del `Cliente` dueño del envío, tanto en confirmación (mensaje de entrega realizada) como en fallo (mensaje de intento fallido). |
| `Repartidor` | `usuarioId`, `rutas` | Se usa para resolver el perfil de repartidor del usuario autenticado y para verificar que el envío pertenece a una de sus rutas. |

Los modelos `Envio`, `EventoEnvio`, `Incidencia`, `Notificacion` y `Repartidor` ya
contienen todas las relaciones necesarias (`Envio.eventos`, `Envio.incidencias`,
`Envio.notificaciones`, `Envio.ruta`, `Ruta.repartidor`). No se agregan campos ni
tablas.

---

## 3. Lógica de negocio

### Resolución de repartidor (reutilización de patrón existente)

Igual que en `rutaService.ts` (`resolverRepartidorPorUsuario`), `entregaService`
resuelve el perfil `Repartidor` asociado a `req.user.id` mediante
`rutaRepository.findRepartidorByUsuarioId(usuarioId)` (repositorio ya existente
y reutilizable; no se duplica el acceso a Prisma). Si no existe perfil de
repartidor: `AppError('REPARTIDOR_NOT_FOUND', ..., 404)`.

### GET /entregas?repartidorId=me

1. `authMiddleware` + `roleMiddleware('REPARTIDOR')`.
2. `listarEntregasSchema` (Zod) valida que `repartidorId` sea exactamente la
   cadena `me` (cualquier otro valor → 422).
3. `entregaService.listarMisEntregas(usuarioId)`:
   a. Resuelve el `Repartidor` del usuario autenticado.
   b. Llama a `entregaRepository.findEnviosByRepartidorId(repartidorId)`, que
      consulta los `Envio` cuyo `rutaId` pertenece a una `Ruta` con
      `repartidorId` igual al del repartidor (`prisma.envio.findMany({ where: { ruta: { repartidorId } }, include: { ruta: true } })`).
   c. El servicio agrupa el resultado: `pendientes` = envíos con `estado` en
      `[PENDIENTE, EN_PREPARACION, EN_TRANSITO, EN_RUTA]`; `completadas` =
      envíos con `estado` en `[ENTREGADO, FALLIDO]`. Los `CANCELADO` se excluyen
      de ambos grupos (no son responsabilidad activa del repartidor).
   d. Proyecta cada envío a `EntregaListItemDto`.
4. El controlador responde `200` con `{ data: { pendientes, completadas }, message: "Entregas obtenidas", status: 200 }`.

### POST /envios/:id/confirmar

1. `authMiddleware` + `roleMiddleware('REPARTIDOR')`.
2. Middleware `multer` (memoryStorage) procesa `multipart/form-data` con campos
   `foto` y `firma` (`upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'firma', maxCount: 1 }])`),
   aplicando `limits: { fileSize: MAX_FILE_SIZE_BYTES }` y un `fileFilter` que
   rechaza MIME types fuera de `['image/jpeg', 'image/png']` y campos con
   nombre distinto de `foto`/`firma` (R23, R24, R25).
3. El controlador verifica que `req.files` contenga tanto `foto` como `firma`;
   si falta alguno, lanza `AppError('MISSING_FILE', ..., 422)` (R9) — esta
   comprobación es de presencia, no de contenido, por lo que vive en el
   controlador como parte de la extracción/validación de la petición, igual
   que la validación Zod del body en otros controladores.
4. `entregaService.confirmarEntrega(envioId, usuarioId, { foto, firma })`:
   a. Resuelve el `Repartidor` del usuario autenticado.
   b. Busca el envío vía `entregaRepository.findEnvioConRuta(envioId)`
      (incluye `ruta`). Si `null`: `AppError('ENVIO_NOT_FOUND', ..., 404)`.
   c. Verifica que `envio.ruta?.repartidorId === repartidor.id`; si no:
      `AppError('FORBIDDEN', ..., 403)`.
   d. Verifica que `envio.estado` no sea `ENTREGADO`, `CANCELADO` ni `FALLIDO`;
      si lo es: `AppError('INVALID_STATE_TRANSITION', ..., 409)`.
   e. Persiste los dos archivos (ver sección 5 — Decisión técnica) y obtiene
      las rutas/URLs relativas `evidenciaFotoPath` y `firmaPath`.
   f. Llama a `entregaRepository.confirmarEntrega(envioId, { evidenciaFoto: evidenciaFotoPath, firma: firmaPath })`,
      que en una sola transacción Prisma (`prisma.$transaction`):
      - Actualiza `Envio`: `estado = ENTREGADO`, `evidenciaFoto`, `firma`.
      - Crea `EventoEnvio`: `{ envioId, estado: 'ENTREGADO', descripcion: 'Entrega confirmada por el repartidor', timestamp: now }`.
   g. Crea la `Notificacion` para el usuario del cliente dueño del envío:
      `entregaRepository.crearNotificacion({ usuarioId: envio.cliente.usuarioId, envioId, mensaje: 'Tu envío <código> fue entregado' })`.
   h. Proyecta y devuelve `ConfirmarEntregaResponseDto`.
5. El controlador responde `200`.

### POST /envios/:id/fallo

1. `authMiddleware` + `roleMiddleware('REPARTIDOR')`.
2. Middleware `multer` (memoryStorage) procesa `multipart/form-data` con
   `upload.single('foto')` para el archivo opcional, y Zod valida el campo de
   texto `nota` (`registrarFalloSchema`: `{ nota: string().min(1) }`) sobre
   `req.body` (multer deja los campos no-archivo en `req.body` como strings).
3. `entregaService.registrarFallo(envioId, usuarioId, { nota, foto })`:
   a. Resuelve el `Repartidor` del usuario autenticado.
   b. Busca el envío vía `entregaRepository.findEnvioConRuta(envioId)`. Si
      `null`: `AppError('ENVIO_NOT_FOUND', ..., 404)`.
   c. Verifica pertenencia a una ruta del repartidor (igual que en confirmar);
      si no: `AppError('FORBIDDEN', ..., 403)`.
   d. Verifica que `envio.estado` no sea `ENTREGADO`, `CANCELADO` ni `FALLIDO`;
      si lo es: `AppError('INVALID_STATE_TRANSITION', ..., 409)`.
   e. Si se recibió `foto`, la persiste (mismo mecanismo que en confirmar) y
      obtiene `fotoPath`; si no se recibió, `fotoPath = null`.
   f. Llama a `entregaRepository.registrarFallo(envioId, { nota, fotoPath })`,
      que en una sola transacción Prisma:
      - Actualiza `Envio`: `estado = FALLIDO`.
      - Crea `EventoEnvio`: `{ envioId, estado: 'FALLIDO', descripcion: nota, timestamp: now }`.
      - Crea `Incidencia`: `{ envioId, tipo: 'ENTREGA_FALLIDA', descripcion: 'Intento de entrega fallido', nota, foto: fotoPath, estado: 'ABIERTA' }`.
   g. Crea la `Notificacion` para el usuario del cliente dueño del envío:
      `entregaRepository.crearNotificacion({ usuarioId: envio.cliente.usuarioId, envioId, mensaje: 'No fue posible entregar tu envío <código>: <nota>' })`.
   h. Proyecta y devuelve `RegistrarFalloResponseDto` (incluye `incidenciaId`).
4. El controlador responde `200`.

---

## 4. Frontend

### Pantallas nuevas en `frontend/src/features/repartidor/`

#### `VistaRepartidor.tsx`
- Ruta: `/repartidor/entregas` (protegida, rol `REPARTIDOR`).
- Barra superior con nombre de la app e ícono de notificaciones (reutiliza
  componente compartido si existe; si no, placeholder simple).
- Título "Mis Entregas".
- Pestañas (Shadcn `Tabs`): "Pendientes (N)" | "Completadas", donde N es
  `pendientes.length`.
- Tarjetas de entrega (`EntregaCard` en `components/shared/` o local al
  feature): ícono según estado, código, dirección, rango horario (derivado de
  `updatedAt`), flecha de navegación hacia `ConfirmacionEntrega`.
- Barra inferior de navegación: Rutas | Entregas | Mapa | Perfil (reutiliza
  layout/navegación existente del shell de repartidor si ya existe; si no,
  componente simple de navegación con `NavLink`).
- Datos desde `useEntregas()` (TanStack Query).

#### `ConfirmacionEntrega.tsx`
- Ruta: `/repartidor/entregas/:id/confirmar` (protegida, rol `REPARTIDOR`).
- Header "Confirmar Entrega" con ícono de notificación.
- Info: código `ENVxxx` (codigoSeguimiento) y "Cliente: <nombre>".
- Zona "Foto evidencia" con botón de cámara (`<input type="file" accept="image/jpeg,image/png" capture="environment">` envuelto en un control Shadcn).
- Zona "Firma receptor" con área de captura de firma (canvas de trazo; al
  finalizar se exporta como blob `image/png`).
- Botón "CONFIRMAR ENTREGA" (primario, ancho completo) — dispara
  `useConfirmarEntrega` (`useMutation`) enviando `FormData` con `foto` y
  `firma`.
- Link "Reportar incidencia" — abre un formulario/modal con campo `nota`
  (textarea, requerido) y `foto` opcional; dispara `useRegistrarFallo`
  (`useMutation`) enviando `FormData` con `nota` y `foto`.
- En éxito de cualquiera de las dos mutaciones: toast de confirmación y
  `navigate('/repartidor/entregas')`.
- En error: toast con el mensaje de error devuelto por el backend (sin
  navegar), usando los componentes Toast de Shadcn/UI (nunca `alert()`).

### Hooks nuevos en `frontend/src/hooks/`

- `useEntregas.ts` — `useQuery({ queryKey: ['entregas', 'me'], queryFn: entregaService.listarMisEntregas })`, devuelve `{ pendientes, completadas }`.
- `useConfirmarEntrega.ts` — `useMutation({ mutationFn: ({ envioId, foto, firma }) => entregaService.confirmar(envioId, foto, firma), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entregas', 'me'] }) })`.
- `useRegistrarFallo.ts` — `useMutation({ mutationFn: ({ envioId, nota, foto }) => entregaService.registrarFallo(envioId, nota, foto), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entregas', 'me'] }) })`.

### Servicios frontend en `frontend/src/services/`

- `entregaService.ts`:
  - `listarMisEntregas(): Promise<EntregasAgrupadasDto>` — `GET /api/v1/entregas?repartidorId=me`.
  - `confirmar(envioId: string, foto: File, firma: Blob): Promise<ConfirmarEntregaResponseDto>` — construye `FormData` (`foto`, `firma`) y hace `POST /api/v1/envios/:id/confirmar` con `Content-Type: multipart/form-data` (la instancia axios configurada detecta `FormData` automáticamente).
  - `registrarFallo(envioId: string, nota: string, foto?: File): Promise<RegistrarFalloResponseDto>` — construye `FormData` (`nota`, `foto` opcional) y hace `POST /api/v1/envios/:id/fallo`.

### Router

Añadir en `frontend/src/router/`:
- `/repartidor/entregas` → `<ProtectedRoute roles={['REPARTIDOR']}>` → `<VistaRepartidor />`.
- `/repartidor/entregas/:id/confirmar` → `<ProtectedRoute roles={['REPARTIDOR']}>` → `<ConfirmacionEntrega />`.

### Tipos frontend

`frontend/src/types/entregaTypes.ts` — re-exporta/replica `EntregaListItemDto`,
`EntregasAgrupadasDto`, `ConfirmarEntregaResponseDto`, `RegistrarFalloResponseDto`
del backend (siguiendo el patrón de `userTypes.ts`: interfaces compartidas, sin
importar `@prisma/client` directamente).

---

## 5. Decisión técnica — Almacenamiento de archivos subidos

**Opción elegida: filesystem local del servidor**, recibido vía `multer` con
`memoryStorage` y escrito a disco por el propio servicio (no por el
middleware), bajo `backend/uploads/entregas/<envioId>/<tipo>-<timestamp>.<ext>`,
exponiendo esa carpeta como estática en `/uploads` (Express `express.static`).
`Envio.evidenciaFoto` y `Envio.firma` (e `Incidencia.foto`) almacenan la ruta
relativa (`/uploads/entregas/<envioId>/foto-....jpg`), no el binario.

**Razones:**
- El proyecto no tiene configurado ningún proveedor de almacenamiento externo
  (no hay variables `S3_*`, `CLOUDINARY_*`, etc. en `.env.example`), y
  `docs/architecture.md` no menciona integración con servicios de almacenamiento
  en la nube; introducir uno sería una decisión de infraestructura fuera del
  alcance de esta feature.
- `multer` ya está en `package.json` (`backend/package.json` línea 34,
  `@types/multer` línea 24) — es la dependencia prevista para esta clase de
  features y no requiere instalación adicional.
- `memoryStorage` permite que el `fileFilter`/validación de tamaño y MIME ocurra
  antes de tocar disco, y que el servicio (no el middleware) decida la ruta
  final — manteniendo la regla de capas: el middleware solo extrae/valida la
  petición, el servicio contiene la lógica de negocio (incluida dónde y cómo
  persistir el archivo resultante).
- Coherente con `evidenciaFoto`/`firma`/`Incidencia.foto` ya tipados como
  `String?` en `schema.prisma` — campos pensados para guardar una ruta/URL, no
  un binario (`Bytes`).

**Opción descartada: servicio externo de almacenamiento (S3/Cloudinary/etc.).**
Añadiría una dependencia de infraestructura, credenciales y configuración de
entorno (`.env`) no contempladas en `docs/architecture.md` ni en
`.env.example`, y un punto de fallo de red adicional para una funcionalidad que
el wireframe y los criterios de aceptación describen como simple captura y
adjunto de evidencia. Si el proyecto migra a un entorno multi-instancia sin
disco compartido, esta decisión deberá revisarse — pero no es el caso actual
(`docker-compose.mail.yml` y el resto de la infraestructura documentada operan
sobre un único host de desarrollo/producción).

---

## 6. Seguridad

- **authMiddleware** aplicado en los 3 endpoints; **roleMiddleware('REPARTIDOR')**
  aplicado en los 3 endpoints — ningún otro rol puede listar ni confirmar/fallar
  entregas.
- **Verificación de pertenencia**: el servicio comprueba que el `Envio`
  referenciado esté asignado a una `Ruta` cuyo `repartidorId` coincide con el
  perfil de repartidor del usuario autenticado, antes de permitir cualquier
  modificación (`FORBIDDEN` 403 en caso contrario) — un repartidor no puede
  confirmar ni fallar entregas ajenas.
- **Validación de archivos (MIME + tamaño)**: middleware `multer` configurado
  con `fileFilter` que solo acepta `image/jpeg` e `image/png`, y
  `limits: { fileSize: MAX_FILE_SIZE_BYTES }` con `MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024` y `MAX_FILE_SIZE_MB = 5` (constante `SCREAMING_SNAKE_CASE` en `backend/src/lib/uploadConfig.ts` o equivalente, según convención de nombres de constantes). Cualquier archivo que falle estas reglas es
  rechazado con 422 antes de llegar al servicio o tocar disco.
- **Nombres de campo controlados**: `multer` se configura para aceptar
  únicamente los campos `foto`/`firma` (confirmar) o `foto` (fallo); cualquier
  otro campo de archivo es descartado (R25), evitando subir archivos arbitrarios
  bajo nombres no esperados.
- **Transiciones de estado controladas**: solo se permite confirmar/fallar
  envíos que no estén ya en un estado terminal (`ENTREGADO`, `CANCELADO`,
  `FALLIDO`), evitando sobrescritura de evidencia o duplicidad de eventos
  (`INVALID_STATE_TRANSITION` 409).
- **Persistencia atómica**: la actualización de `Envio.estado` y la creación de
  `EventoEnvio` (y, en el caso de fallo, `Incidencia`) ocurren en una sola
  transacción Prisma (`prisma.$transaction`), evitando estados inconsistentes
  si una de las escrituras falla.
- **Rutas estáticas de archivos**: la carpeta `backend/uploads/` se sirve como
  contenido estático de solo lectura; el servidor nunca ejecuta ni interpreta
  los archivos subidos (se sirven con `Content-Type` derivado de la extensión
  validada, nunca del valor declarado por el cliente).
- **Sin lógica de negocio en controladores/repositorios**: la verificación de
  pertenencia, transición de estado, generación de notificación y persistencia
  de archivos vive en `entregaService`; `entregaRepository` solo ejecuta
  operaciones Prisma.
