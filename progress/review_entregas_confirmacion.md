# Review — entregas_confirmacion — APROBADO

> Reviewer: subagente `reviewer`. Validación de trazabilidad R1–R32, tasks T1–T30,
> arquitectura, seguridad y convenciones. No se re-ejecutan test/lint/build
> (ya verificados independientemente por el leader: backend 174/174, frontend 73/73,
> lint y build limpios en ambos paquetes).

---

## Trazabilidad R<n> → Test → Veredicto

| R | Test (`it`) | Archivo:línea | Veredicto |
|---|---|---|---|
| R1 | `R1 - debe listar entregas pendientes y completadas del repartidor autenticado` | `backend/src/tests/entregasListar.test.ts:55` | ✅ Cubierto — verifica 200, `message: "Entregas obtenidas"`, `status: 200`, agrupación `pendientes`/`completadas` y que el servicio se invoca con el `usuarioId` del token. |
| R2 | `R2 - debe clasificar correctamente los envíos por estado en pendientes/completadas` | `backend/src/tests/entregasListar.test.ts:74` | ✅ Cubierto — fija los 4 estados pendientes (`PENDIENTE`,`EN_PREPARACION`,`EN_TRANSITO`,`EN_RUTA`) y los 2 completados (`ENTREGADO`,`FALLIDO`) y comprueba la clasificación devuelta. La clasificación real vive en `entregaService.listarMisEntregas` (`ESTADOS_PENDIENTES`/`ESTADOS_COMPLETADOS`, `entregaService.ts:16-23,95-105`), excluyendo `CANCELADO` de ambos grupos tal como exige R2 (implícitamente, al no listarlo en ninguno). |
| R3 | `R3 - debe rechazar la petición sin token` | `backend/src/tests/entregasListar.test.ts:102` | ✅ Cubierto — petición sin `Authorization`, espera 401 (vía `authMiddleware` real). |
| R4 | `R4 - debe rechazar la petición de un usuario sin rol REPARTIDOR` | `backend/src/tests/entregasListar.test.ts:107` | ✅ Cubierto — prueba con token `OPERADOR` y `CLIENTE`, espera 403 y `error: "FORBIDDEN"`. |
| R5 | `R5 - debe devolver 404 si el usuario REPARTIDOR no tiene perfil de repartidor asociado` | `backend/src/tests/entregasListar.test.ts:120` | ✅ Cubierto — mockea `AppError('REPARTIDOR_NOT_FOUND', ..., 404)` desde el servicio y verifica 404 + `error: "REPARTIDOR_NOT_FOUND"`. |
| R6 | `R6 - debe rechazar repartidorId distinto de "me"` | `backend/src/tests/entregasListar.test.ts:134` | ✅ Cubierto — `repartidorId=otro-valor` → 422, y confirma que el servicio nunca se invoca (validación Zod corta antes). |
| R7 | `R7 - debe confirmar la entrega, actualizar estado a ENTREGADO, persistir foto/firma y crear EventoEnvio` | `backend/src/tests/entregaConfirmar.test.ts:84` | ✅ Cubierto — adjunta `foto`/`firma` reales vía `.attach()`, espera 200, `message: "Entrega confirmada"`, `estado: "ENTREGADO"`, `evidenciaFoto`/`firma`/`fechaEntrega` presentes, y que el servicio recibe `(envioId, usuarioId, { foto, firma })`. La creación real de `EventoEnvio` está en `entregaRepository.confirmarEntrega` (transacción Prisma, `entregaRepository.ts:55-77`). |
| R8 | `R8 - debe crear una Notificacion para el cliente al confirmar la entrega` | `backend/src/tests/entregaConfirmar.test.ts:224` | ✅ Cubierto — test a nivel de servicio real (repos mockeados vía `loadServiceWithMockedRepos`), verifica que `entregaRepo.crearNotificacion` se llama con `usuarioId` del cliente dueño del envío y mensaje que contiene "entregado". |
| R9 | `R9 - debe rechazar la petición si falta el archivo foto o firma` | `backend/src/tests/entregaConfirmar.test.ts:106` | ✅ Cubierto — adjunta solo `foto`, espera 422 + `error: "MISSING_FILE"`, y que el servicio nunca se invoca. |
| R10 | `R10 - debe devolver 404 si el envío no existe` | `backend/src/tests/entregaConfirmar.test.ts:117` | ✅ Cubierto — mockea `AppError('ENVIO_NOT_FOUND', ..., 404)`, espera 404 + `error`. |
| R11 | `R11 - debe devolver 403 si el envío no está asignado a una ruta del repartidor autenticado` | `backend/src/tests/entregaConfirmar.test.ts:133` | ✅ Cubierto — mockea `AppError('FORBIDDEN', ..., 403)`, espera 403 + `error: "FORBIDDEN"`. |
| R12 | `R12 - debe devolver 409 si el envío ya está en estado ENTREGADO/CANCELADO/FALLIDO sin modificarlo` | `backend/src/tests/entregaConfirmar.test.ts:149` | ✅ Cubierto — mockea `AppError('INVALID_STATE_TRANSITION', ..., 409)`, espera 409 + `error`. La garantía de "sin modificar" se sostiene porque la validación de estado ocurre **antes** de cualquier escritura en `obtenerEnvioModificable` (`entregaService.ts:78-84`, lanza antes de llamar a `guardarArchivo`/`entregaRepository.confirmarEntrega`). |
| R13 | `R13 - debe rechazar la petición sin token` | `backend/src/tests/entregaConfirmar.test.ts:165` | ✅ Cubierto — sin `Authorization`, espera 401. |
| R14 | `R14 - debe rechazar la petición de un usuario sin rol REPARTIDOR` | `backend/src/tests/entregaConfirmar.test.ts:174` | ✅ Cubierto — token `OPERADOR`, espera 403 + `error: "FORBIDDEN"`. |
| R15 | `R15 - debe registrar el fallo, actualizar estado a FALLIDO, crear EventoEnvio e Incidencia ENTREGA_FALLIDA con nota y foto` | `backend/src/tests/entregaFallo.test.ts:61` (HTTP) y `:283` (servicio real) | ✅ Cubierto — el test HTTP (`:61`) adjunta `nota`+`foto`, espera 200, `message`, `estado: "FALLIDO"`, `incidenciaId`. El test de servicio (`:283`) usa repos reales mockeados y verifica `result.estado === 'FALLIDO'`, `result.incidenciaId`, y que `entregaRepo.registrarFallo` recibe `{ nota, foto }`. La creación real de `EventoEnvio`+`Incidencia` (`tipo: 'ENTREGA_FALLIDA'`, `nota`, `foto`) vive en `entregaRepository.registrarFallo` (transacción Prisma, `entregaRepository.ts:83-111`). |
| R16 | `R16 - debe crear una Notificacion para el cliente al registrar el fallo` | `backend/src/tests/entregaFallo.test.ts:321` | ✅ Cubierto — verifica `entregaRepo.crearNotificacion` con `usuarioId`/`envioId`/mensaje que contiene "No fue posible entregar". |
| R17 | `R17 - debe rechazar la petición sin nota o con nota vacía` | `backend/src/tests/entregaFallo.test.ts:84` | ✅ Cubierto — dos sub-casos (`nota` ausente y `nota: ''`), ambos esperan 422 y que el servicio no se invoque. |
| R18 | `R18 - debe devolver 404 si el envío no existe` | `backend/src/tests/entregaFallo.test.ts:101` | ✅ Cubierto — `AppError('ENVIO_NOT_FOUND', ..., 404)` mockeado, 404 + `error`. |
| R19 | `R19 - debe devolver 403 si el envío no está asignado a una ruta del repartidor autenticado` | `backend/src/tests/entregaFallo.test.ts:116` | ✅ Cubierto — `AppError('FORBIDDEN', ..., 403)`, 403 + `error`. |
| R20 | `R20 - debe devolver 409 si el envío ya está en estado ENTREGADO/CANCELADO/FALLIDO sin modificarlo` | `backend/src/tests/entregaFallo.test.ts:131` | ✅ Cubierto — `AppError('INVALID_STATE_TRANSITION', ..., 409)`, 409 + `error`. Misma garantía de "sin modificar" que R12 (validación de estado antes de escritura, código compartido `obtenerEnvioModificable`). |
| R21 | `R21 - debe rechazar la petición sin token` | `backend/src/tests/entregaFallo.test.ts:146` | ✅ Cubierto — sin `Authorization`, 401. |
| R22 | `R22 - debe rechazar la petición de un usuario sin rol REPARTIDOR` | `backend/src/tests/entregaFallo.test.ts:154` | ✅ Cubierto — token `OPERADOR`, 403 + `error`. |
| R23 | `R23 - ... (confirmar)` y `R23 - ... (fallo)` | `backend/src/tests/entregaArchivos.test.ts:64` y `:79` | ✅ Cubierto — adjunta `application/pdf` e `image/gif` respectivamente, espera 422 + `error: "INVALID_FILE_TYPE"` y que el servicio correspondiente nunca se invoque (sin persistencia). El `fileFilter` real está en `uploadConfig.ts:17-33`. |
| R24 | `R24 - ... (confirmar)` y `R24 - ... (fallo)` | `backend/src/tests/entregaArchivos.test.ts:94` y `:106` | ✅ Cubierto — usa `OVERSIZED_BUFFER = MAX_FILE_SIZE_BYTES + 1` (real, importado de `uploadConfig`), espera 422 + `error: "FILE_TOO_LARGE"` (vía traducción de `MulterError LIMIT_FILE_SIZE` en `errorHandler.ts:25-33`) y servicio no invocado. |
| R25 | tres `it` — descartar campo no esperado en confirmar/fallo y aceptar cuando solo llegan los campos esperados | `backend/src/tests/entregaArchivos.test.ts:118`, `:132`, `:146` | ✅ Cubierto — los dos primeros casos confirman 422 (multer `LIMIT_UNEXPECTED_FILE`) y que el servicio no es invocado cuando llega un campo de archivo extra (`documento`/`adjuntoArbitrario`); el tercero confirma el camino feliz (200) cuando solo llegan `foto`/`firma`. Esto prueba el efecto observable de "descartar" (rechazo de la petición antes de tocar el servicio/disco), coherente con la configuración real `upload.fields([{name:'foto'},{name:'firma'}])` / `upload.single('foto')` (`uploadConfig.ts:45-54`). |
| R26 | `debe renderizar las pestañas con el conteo y las entregas pendientes` / `debe mostrar las entregas completadas al cambiar de pestaña` (describe `R26 — VistaRepartidor...`) | `frontend/.../VistaRepartidor.test.tsx:71` y `:85` | ✅ Cubierto — verifica heading "Mis Entregas", tabs "Pendientes (1)"/"Completadas" con conteo dinámico, contenido agrupado correcto al cambiar de pestaña (código/dirección). |
| R27 | `debe renderizar código, cliente, control de foto, área de firma y botón CONFIRMAR ENTREGA` | `frontend/.../ConfirmacionEntrega.test.tsx:115` | ✅ Cubierto — verifica código, "Cliente: María López", `getByLabelText('Foto evidencia')`, `getByLabelText('Área de firma del receptor')`, botón "CONFIRMAR ENTREGA" y botón/link "Reportar incidencia" — coincide 1:1 con `docs/wireframe-reference.md` sección "Confirmación de Entrega (mobile)". |
| R28 | `debe llamar a la mutación de confirmar y navegar a Vista Repartidor` | `frontend/.../ConfirmacionEntrega.test.tsx:132` | ✅ Cubierto — adjunta foto, dibuja firma (vía stubs de canvas), hace click en "CONFIRMAR ENTREGA", verifica `mutateAsync` invocado con `{ envioId, foto: expect.any(File) }` (nota: `expect.any(File)` es un *matcher* de Vitest/Jest, no el tipo `any` de TS — no constituye una violación de la regla "no `any` explícito") y `navigate('/repartidor/entregas')`. |
| R29 | `debe llamar a la mutación de fallo y navegar en éxito` | `frontend/.../ConfirmacionEntrega.test.tsx:159` | ✅ Cubierto — abre "Reportar incidencia", llena `nota`, hace click en "Registrar fallo", verifica `mutateAsync` con `{ envioId, nota }` y navegación a `/repartidor/entregas`. |
| R30 | `debe mostrar el mensaje de error del backend y permanecer en la pantalla` | `frontend/.../ConfirmacionEntrega.test.tsx:187` | ✅ Cubierto — mockea rechazo con `{ response: { data: { message: '...' } } }`, espera `getByRole('alert')` con el mensaje del backend (vía `extraerMensajeError` + componente `Toast` con `role="alert"`), y `mockNavigate` **no** invocado. |
| R31 | (meta-requisito: cobertura backend agregada) | Cubierto transversalmente por `entregasListar.test.ts`, `entregaConfirmar.test.ts`, `entregaFallo.test.ts`, `entregaArchivos.test.ts` | ✅ Cubierto — los 11 sub-requisitos enumerados en R31 (R1, R4, R7, R9–R12, R15, R17, R23, R24) tienen test propio verificado arriba. |
| R32 | (meta-requisito: cobertura frontend agregada) | `VistaRepartidor.test.tsx` (render + navegación) y `ConfirmacionEntrega.test.tsx` (render + envío + "Reportar incidencia") | ✅ Cubierto — render de `VistaRepartidor` con pestañas (`:71`), render de `ConfirmacionEntrega` (`:115`), envío del formulario de confirmación (`:132`/`:159`) y uso del link "Reportar incidencia" (`:159`) están todos presentes y son tests reales (no stubs). |

**Conclusión trazabilidad: 32/32 requisitos con al menos un test real que prueba el comportamiento descrito (no solo la existencia de la función). 0 requisitos sin cobertura.**

---

## Verificación de tasks T1–T30

Revisé el código fuente correspondiente a cada task (no solo el checkbox):

- **T1** — Schema verificado: `evidenciaFoto`, `firma`, `fechaReprogramacion` (`Envio`, líneas 108-110), `ENTREGADO`/`FALLIDO` (enum `EstadoEnvio`), `ENTREGA_FALLIDA` (enum `TipoIncidencia`) confirmados en `backend/prisma/schema.prisma`. No se generó migración nueva. ✅
- **T2** — `backend/src/lib/uploadConfig.ts`: `MAX_FILE_SIZE_MB`/`MAX_FILE_SIZE_BYTES`/`ALLOWED_MIME_TYPES` en `SCREAMING_SNAKE_CASE`, `multer.memoryStorage()`, `fileFilter` que lanza `AppError('INVALID_FILE_TYPE', ..., 422)`, `uploadConfirmacion`/`uploadFallo` exportados, `guardarArchivo` escribe a `uploads/entregas/<envioId>/<tipo>-<timestamp>.<ext>` y devuelve ruta pública relativa. Coincide exactamente con design.md. ✅
- **T3** — `errorHandler.ts:25-40` captura `MulterError` con `code === 'LIMIT_FILE_SIZE'` → `{ error: 'FILE_TOO_LARGE', statusCode: 422 }`, preservando `next`/flujo existente para otros errores (incluye un branch genérico `INVALID_FILE_UPLOAD` para otros códigos de `MulterError`, p. ej. `LIMIT_UNEXPECTED_FILE` usado en R25). ✅
- **T4** — `index.ts:30` registra `app.use('/uploads', express.static(...))` después de `helmet()`/`cors()`; `.gitignore` raíz (no `backend/.gitignore` como dice el informe — ver "Problemas menores" más abajo) añade `backend/uploads/`/`uploads/`. ✅ (con observación menor de redundancia)
- **T5** — `backend/src/types/entregaTypes.ts` contiene exactamente los 4 DTOs de respuesta más `ConfirmarEntregaInput`/`RegistrarFalloInput` tipados sobre `Express.Multer.File`. ✅
- **T6** — `entregaValidator.ts`: `listarEntregasSchema` con `z.literal('me', ...)` y `registrarFalloSchema` con `z.string().min(1, ...)`, ambos con sus tipos inferidos exportados. ✅
- **T7** — `entregaRepository.ts`: los 5 métodos existen con las firmas/comportamiento especificados (incluye `findEnvioConRutaYCliente` — nombre ligeramente distinto al boceto `findEnvioConRuta` de design.md, pero el propio design.md sección 3 ya usa `findEnvioConRutaYCliente`, así que es consistente con la intención real). Ambas mutaciones (`confirmarEntrega`/`registrarFallo`) usan `prisma.$transaction`. Sin lógica de negocio (solo Prisma). ✅
- **T8** — `entregaService.ts` implementa `listarMisEntregas`/`confirmarEntrega`/`registrarFallo` reutilizando `rutaRepository.findRepartidorByUsuarioId` vía un helper local `resolverRepartidorPorUsuario` (documentada la decisión de no extraer a módulo compartido, tal como pedía la task). Toda la lógica de negocio (resolución de repartidor, pertenencia, transición de estado, persistencia de archivos, notificación) vive aquí. ✅
- **T9** — `entregaController.ts`: los 3 handlers solo parsean/extraen la petición (Zod, `req.files`/`req.file`, validación de presencia `MISSING_FILE`) y delegan al servicio; responden con el formato `{ data, message, status }`. Sin lógica de negocio. ✅
- **T10** — `entregas.ts` define `GET /` con `authMiddleware`+`roleMiddleware('REPARTIDOR')`+`listarMisEntregas`; registrado como `app.use('/api/v1/entregas', entregasRouter)` en `index.ts:47`. ✅
- **T11** — `envios.ts:26-39` añade `POST /:id/confirmar` y `POST /:id/fallo` con la cadena de middlewares correcta (`authMiddleware`, `roleMiddleware('REPARTIDOR')`, `uploadConfirmacion`/`uploadFallo`, controlador). No colisiona con rutas OPERADOR existentes (`/`, `/:id`, etc., todas declaradas antes). ✅
- **T12–T15** — Los 4 archivos de test backend existen, son reales (montan `app`, usan JWT/Supertest, `.attach()`/`.field()` reales) y cubren exactamente los `it` enumerados en cada task (ver tabla de trazabilidad arriba). ✅
- **T16** — `frontend/src/types/entregaTypes.ts` replica los 4 DTOs sin importar `@prisma/client` (enum `EstadoEnvio` como unión de strings), siguiendo el patrón de `userTypes.ts`. ✅
- **T17** — `frontend/src/services/entregaService.ts`: `listarMisEntregas`/`confirmar`/`registrarFallo` con `FormData` y llamadas correctas vía `api` (axios) — sin `fetch` directo. ✅
- **T18–T20** — Los 3 hooks (`useEntregas`, `useConfirmarEntrega`, `useRegistrarFallo`) usan `useQuery`/`useMutation` con `queryKey: ['entregas','me']` e invalidación en éxito, exactamente como especifica design.md. ✅
- **T21** — `VistaRepartidor.tsx`: pestañas Shadcn-style (`Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` de `components/ui/tabs.tsx`, creado porque no existía), tarjetas con código/dirección/rango horario/flecha de navegación, barra inferior Rutas|Entregas|Mapa|Perfil, estados de carga (`isLoading`)/error (`isError`, `role="alert"`)/vacío manejados sin `alert()`. ✅
- **T22** — `ConfirmacionEntrega.tsx`: lee `id` con `useParams`, muestra código y "Cliente: <nombre>", input de foto con `accept="image/jpeg,image/png" capture="environment"`, canvas de firma con eventos `onPointer*` que exporta a `Blob image/png` vía `canvas.toBlob`, botón "CONFIRMAR ENTREGA" con `useConfirmarEntrega` (éxito → toast + `navigate`; error → toast con mensaje del backend sin navegar — R30), modal "Reportar incidencia" con `nota` (textarea requerida) + `foto` opcional usando `useRegistrarFallo`. ✅
- **T23** — `router/index.tsx:60-64` añade ambas rutas bajo `<ProtectedRoute allowedRoles={['REPARTIDOR']}>`, antes del catch-all `/repartidor/*` (orden correcto, evita que el catch-all capture las rutas específicas). ✅
- **T24–T25** — Los 2 archivos de test frontend existen, montan los componentes reales con `QueryClientProvider`/`MemoryRouter`, mockean hooks/router de forma estándar, y cubren exactamente los `it` enumerados (ver trazabilidad R26–R30). Tests reales con asserts de comportamiento (no smoke tests vacíos). ✅
- **T26–T30** — Resultados de verificación reportados por el implementer (`npx prisma generate`, 174/174 backend, 73/73 frontend, lint y build limpios) coinciden con la verificación independiente ya realizada por el leader. ✅
- **T31** — Correctamente dejada sin marcar, con nota explicando que es un paso manual interactivo (servidor + Mailpit) y que su equivalente automatizado está cubierto por R8/R16/R23–R25. Esto es coherente y aceptable: no bloquea la aprobación (es responsabilidad del humano/leader ejecutarlo antes de producción, no del implementer).

**Conclusión tasks: T1–T30 corresponden a trabajo real y verificable; T31 queda correctamente documentada como pendiente de verificación manual.**

---

## Arquitectura: ✅

- Controladores (`entregaController.ts`) **sin lógica de negocio**: solo parseo Zod, extracción de `req.files`/`req.file`/`req.params`/`req.user`, validación de presencia de archivos (`MISSING_FILE`, justificada en design.md como parte de "extracción/validación de la petición") y delegación al servicio.
- Repositorio (`entregaRepository.ts`) **sin validaciones**: solo operaciones Prisma (`findMany`, `findUnique`, `update`, `create`, `$transaction`). Toda decisión (pertenencia, transición de estado, agrupación, mensajes de notificación) vive en `entregaService`.
- **Sin `fetch` directo en componentes React** — todo pasa por `entregaService` (axios) vía hooks TanStack Query.
- **Sin estado de servidor duplicado en Zustand** — no se usa Zustand para datos de entregas; todo vive en TanStack Query (`useEntregas`, mutaciones con invalidación).
- **Sin `any` explícito** — confirmado el spot-check (0 ocurrencias de `: any`/`as any`/`<any>` en los archivos nuevos/modificados de esta feature). El único hit de `expect.any(File)` en `ConfirmacionEntrega.test.tsx:149` es un matcher de Vitest (función `expect.any`), no el tipo `any` de TypeScript.
- **Sin `console.log`/`alert()`** — confirmado en spot-check independiente sobre los archivos nuevos.

## Seguridad: ✅

- `authMiddleware` + `roleMiddleware('REPARTIDOR')` en los 3 endpoints (`entregas.ts:8-13`, `envios.ts:26-39`).
- Verificación de pertenencia (`envio.ruta?.repartidorId === repartidor.id`) antes de cualquier modificación, con `FORBIDDEN` 403 (`entregaService.ts:70-76`).
- Inputs validados con Zod (`listarEntregasSchema`, `registrarFalloSchema`).
- Subida de archivos: MIME validado por `fileFilter` (`ALLOWED_MIME_TYPES = ['image/jpeg','image/png']`) y tamaño por `limits.fileSize` + traducción de `MulterError LIMIT_FILE_SIZE` → `FILE_TOO_LARGE`; nombres de campo controlados (`upload.fields`/`upload.single`) — campos inesperados son rechazados por multer (verificado en R25).
- Transiciones de estado controladas (`ESTADOS_TERMINALES`) evitando sobrescritura de evidencia — verificado que la validación ocurre **antes** de cualquier escritura (R12/R20 garantizan "sin modificar").
- Persistencia atómica vía `prisma.$transaction` en ambas mutaciones.
- Carpeta `/uploads` servida como estática de solo lectura (`express.static`), `Content-Type` derivado de la extensión validada (vía `EXTENSION_POR_MIME`), nunca del valor declarado por el cliente.

## Convenios: ✅

- Rutas bajo `/api/v1/entregas` y `/api/v1/envios/:id/{confirmar,fallo}`.
- Respuestas de éxito `{ data, message, status }` (`entregaController.ts`); respuestas de error `{ error, message, statusCode }` (`AppError` + `errorHandler.ts`), incluyendo el branch nuevo de `MulterError`.
- Pantallas coinciden con `docs/wireframe-reference.md` secciones "Vista Repartidor (mobile)" y "Confirmación de Entrega (mobile)" — verificado punto por punto (barra superior, título "Mis Entregas", pestañas con conteo, tarjetas código+dirección+rango horario+flecha, barra inferior Rutas|Entregas|Mapa|Perfil; header "Confirmar Entrega", código+cliente, foto, firma, botón "CONFIRMAR ENTREGA", link "Reportar incidencia").
- Nombres de archivos/variables siguen el patrón existente (`entregaService.ts`, `entregaRepository.ts`, `entregaController.ts`, `entregaValidator.ts`, `entregaTypes.ts` — paralelos a `ruta*`/`vehiculo*`); constantes en `SCREAMING_SNAKE_CASE` (`MAX_FILE_SIZE_MB`, `MAX_FILE_SIZE_BYTES`, `ALLOWED_MIME_TYPES`).

## Verificación: ✅ (174/174 backend + 73/73 frontend, lint limpio, build exitoso — verificado independientemente por el leader; no se re-ejecuta por instrucción explícita)

---

## Problemas encontrados (no bloqueantes)

1. **Inexactitud menor en `progress/impl_entregas_confirmacion.md`**: el informe dice que se modificó `backend/.gitignore`, pero el archivo realmente modificado (y el único `.gitignore` relevante para esta feature) es el **`.gitignore` de la raíz del repo** — no existe `backend/.gitignore`. El cambio real (`git diff -- .gitignore`) añade correctamente `backend/uploads/` y `uploads/` bajo un nuevo bloque "# Uploaded files (evidencia de entregas: fotos y firmas)". El efecto deseado (no versionar `uploads/`) **se cumple**.
2. **Entradas duplicadas en `.gitignore`**: el archivo raíz ya contenía, desde el commit inicial (`e8b1c6a`), un bloque "# Uploads (photos, signatures - never in git)" con `backend/uploads/` (líneas ~50-51). El nuevo bloque del implementer (líneas ~22-24: `backend/uploads/` + `uploads/`) es funcionalmente redundante con el existente. No causa ningún problema funcional (gitignore tolera duplicados), es solo una limpieza cosmética opcional para una futura feature — no amerita rechazar esta.

Ninguno de los dos puntos afecta la funcionalidad, los tests, la seguridad ni la trazabilidad. Se documentan para que el leader los tenga en cuenta (p. ej. al revisar futuros informes del implementer o al hacer una limpieza de `.gitignore` en otra ocasión).

---

**Decisión: APROBADO. El leader debe hacer el commit y luego marcar la feature como done.**
