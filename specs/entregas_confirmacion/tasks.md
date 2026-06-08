# Tasks — entregas_confirmacion

> Lista ordenada para el `implementer`. Seguir en orden estricto.
> Marcar `[x]` al completar cada task. No marcar `done` en `feature_list.json`
> hasta que el `reviewer` lo apruebe.

---

## Backend

- [x] T1. Verificar el schema Prisma: confirmar que `Envio.evidenciaFoto`,
  `Envio.firma`, `Envio.fechaReprogramacion`, `Incidencia.foto`, `Incidencia.nota`
  y los enums `EstadoEnvio` (`ENTREGADO`, `FALLIDO`) y `TipoIncidencia`
  (`ENTREGA_FALLIDA`) ya existen en `backend/prisma/schema.prisma` (deben
  estar — ver `design.md` sección 2). **No se ejecuta migración nueva**: si
  algún campo faltara, detener y reportar la discrepancia antes de continuar
  (no improvisar cambios de schema fuera de spec).

- [x] T2. Crear `backend/src/lib/uploadConfig.ts` con:
  - Constantes `SCREAMING_SNAKE_CASE`: `MAX_FILE_SIZE_MB = 5` y
    `MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024`.
  - Constante `ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const`.
  - Configuración de `multer` con `memoryStorage()`, `limits: { fileSize: MAX_FILE_SIZE_BYTES }`
    y `fileFilter` que invoca `cb(new AppError('INVALID_FILE_TYPE', ..., 422))`
    si `file.mimetype` no está en `ALLOWED_MIME_TYPES`.
  - Exportar dos middlewares listos para usar en las rutas: `uploadConfirmacion = upload.fields([{ name: 'foto', maxCount: 1 }, { name: 'firma', maxCount: 1 }])`
    y `uploadFallo = upload.single('foto')`.
  - Función auxiliar `guardarArchivo(envioId: string, tipo: 'foto' | 'firma', file: Express.Multer.File): Promise<string>`
    que escribe el buffer a `backend/uploads/entregas/<envioId>/<tipo>-<timestamp>.<ext>`
    (creando los directorios necesarios) y devuelve la ruta relativa pública
    `/uploads/entregas/<envioId>/<tipo>-<timestamp>.<ext>`.

- [x] T3. Registrar el middleware de error de `multer` en `backend/src/middlewares/errorHandler.ts`
  (o donde corresponda según el patrón existente): capturar `MulterError` con
  código `LIMIT_FILE_SIZE` y traducirlo a `AppError('FILE_TOO_LARGE', 'El archivo excede el tamaño máximo permitido (5MB)', 422)`,
  preservando el flujo `next(error)` ya establecido para el resto de errores.

- [x] T4. Servir la carpeta `backend/uploads/` como contenido estático: añadir
  `app.use('/uploads', express.static(path.join(__dirname, '../uploads')))` en
  el archivo de bootstrap de Express (`backend/src/app.ts` o `index.ts`,
  verificar nombre real), después de `helmet()`/`cors()`. Añadir `uploads/` a
  `.gitignore` del backend (no versionar archivos subidos).

- [x] T5. Crear `backend/src/types/entregaTypes.ts` con las interfaces:
  `EntregaListItemDto`, `EntregasAgrupadasDto`, `ConfirmarEntregaResponseDto`,
  `RegistrarFalloResponseDto`, y los DTOs de entrada `ConfirmarEntregaInput`
  (`{ fotoBuffer, fotoMimetype, firmaBuffer, firmaMimetype }` o equivalente
  tipado a partir de `Express.Multer.File`) y `RegistrarFalloInput`
  (`{ nota: string, foto?: Express.Multer.File }`) — exactamente como se
  describen en `design.md` sección 1.

- [x] T6. Crear `backend/src/validators/entregaValidator.ts` con:
  - `listarEntregasSchema` (Zod): `{ repartidorId: z.literal('me', { errorMap: () => ({ message: 'Solo se admite repartidorId=me' }) }) }`. Exportar `ListarEntregasInput = z.infer<typeof listarEntregasSchema>`.
  - `registrarFalloSchema` (Zod): `{ nota: z.string().min(1, 'La nota es requerida') }`. Exportar `RegistrarFalloBodyInput = z.infer<typeof registrarFalloSchema>`.

- [x] T7. Crear `backend/src/repositories/entregaRepository.ts` (solo acceso a
  Prisma, sin lógica de negocio) con los métodos:
  - `findEnviosByRepartidorId(repartidorId: string)` — `prisma.envio.findMany({ where: { ruta: { repartidorId } }, include: { ruta: true }, orderBy: { updatedAt: 'desc' } })`.
  - `findEnvioConRutaYCliente(envioId: string)` — `prisma.envio.findUnique({ where: { id: envioId }, include: { ruta: true, cliente: { include: { usuario: true } } } })`.
  - `confirmarEntrega(envioId: string, data: { evidenciaFoto: string; firma: string; descripcionEvento: string })` — ejecuta en `prisma.$transaction`: `envio.update({ where: { id: envioId }, data: { estado: 'ENTREGADO', evidenciaFoto, firma } })` y `eventoEnvio.create({ data: { envioId, estado: 'ENTREGADO', descripcion: descripcionEvento } })`; devuelve el envío actualizado junto con el evento creado.
  - `registrarFallo(envioId: string, data: { nota: string; foto: string | null })` — ejecuta en `prisma.$transaction`: `envio.update({ where: { id: envioId }, data: { estado: 'FALLIDO' } })`, `eventoEnvio.create({ data: { envioId, estado: 'FALLIDO', descripcion: nota } })` e `incidencia.create({ data: { envioId, tipo: 'ENTREGA_FALLIDA', descripcion: 'Intento de entrega fallido', nota, foto, estado: 'ABIERTA' } })`; devuelve el envío actualizado junto con la incidencia creada.
  - `crearNotificacion(data: { usuarioId: string; envioId: string; mensaje: string })` — `prisma.notificacion.create({ data })`.

- [x] T8. Crear `backend/src/services/entregaService.ts` reutilizando
  `rutaRepository.findRepartidorByUsuarioId` para resolver el perfil de
  repartidor (mismo patrón que `resolverRepartidorPorUsuario` en
  `rutaService.ts`; extraer a un helper compartido si se considera apropiado,
  o duplicar la función local — decisión del implementer, documentar la
  elección elegida en un comentario). Implementar:
  - `listarMisEntregas(usuarioId: string): Promise<EntregasAgrupadasDto>` — resuelve repartidor (404 si no existe), llama a `entregaRepository.findEnviosByRepartidorId`, agrupa en `pendientes`/`completadas` según `design.md` sección 3, proyecta a `EntregaListItemDto[]`.
  - `confirmarEntrega(envioId: string, usuarioId: string, archivos: { foto: Express.Multer.File; firma: Express.Multer.File }): Promise<ConfirmarEntregaResponseDto>` — resuelve repartidor; busca envío (404 si no existe); valida pertenencia a ruta del repartidor (403 `FORBIDDEN` si no coincide); valida estado distinto de `ENTREGADO`/`CANCELADO`/`FALLIDO` (409 `INVALID_STATE_TRANSITION`); persiste ambos archivos vía `guardarArchivo`; llama a `entregaRepository.confirmarEntrega`; crea notificación al cliente vía `entregaRepository.crearNotificacion`; proyecta y devuelve `ConfirmarEntregaResponseDto`.
  - `registrarFallo(envioId: string, usuarioId: string, dto: { nota: string; foto?: Express.Multer.File }): Promise<RegistrarFalloResponseDto>` — mismas validaciones de repartidor/envío/pertenencia/estado; persiste `foto` si está presente (o `null`); llama a `entregaRepository.registrarFallo`; crea notificación al cliente; proyecta y devuelve `RegistrarFalloResponseDto`.

- [x] T9. Crear `backend/src/controllers/entregaController.ts` (sin lógica de
  negocio, solo extracción/validación de la petición y delegación al servicio):
  - `listarMisEntregas(req, res, next)` — parsea `req.query` con `listarEntregasSchema.parse`; llama a `entregaService.listarMisEntregas(req.user!.id)`; responde `200` con `{ data, message: 'Entregas obtenidas', status: 200 }`.
  - `confirmarEntrega(req, res, next)` — extrae `req.files` (tipado como `{ [fieldname: string]: Express.Multer.File[] }`); si falta `foto` o `firma`, lanza `AppError('MISSING_FILE', 'Se requieren los archivos foto y firma', 422)`; llama a `entregaService.confirmarEntrega(req.params.id, req.user!.id, { foto: files.foto[0], firma: files.firma[0] })`; responde `200` con `{ data, message: 'Entrega confirmada', status: 200 }`.
  - `registrarFallo(req, res, next)` — parsea `req.body` con `registrarFalloSchema.parse`; extrae `req.file` (opcional); llama a `entregaService.registrarFallo(req.params.id, req.user!.id, { nota: dto.nota, foto: req.file })`; responde `200` con `{ data, message: 'Fallo de entrega registrado', status: 200 }`.

- [x] T10. Crear `backend/src/routes/entregas.ts`:
  - `GET /` → `authMiddleware`, `roleMiddleware('REPARTIDOR')`, `listarMisEntregas`.
  - Registrar como `app.use('/api/v1/entregas', entregasRouter)` en el archivo principal de rutas (`backend/src/routes/index.ts` o equivalente — seguir el patrón de `users.ts`/`vehiculos.ts`).

- [x] T11. Añadir las rutas de confirmación/fallo al router de envíos existente
  (`backend/src/routes/envios.ts`):
  - `POST /:id/confirmar` → `authMiddleware`, `roleMiddleware('REPARTIDOR')`, `uploadConfirmacion`, `confirmarEntrega`.
  - `POST /:id/fallo` → `authMiddleware`, `roleMiddleware('REPARTIDOR')`, `uploadFallo`, `registrarFallo`.
  - Verificar que el orden de middlewares no choque con rutas existentes (`/:id`, `/:id/cancelar`, etc.).

- [x] T12. Escribir tests backend en `backend/src/tests/entregasListar.test.ts`
  (Jest + Supertest, base de datos de test, transacciones con rollback):
  - `R1 - debe listar entregas pendientes y completadas del repartidor autenticado`.
  - `R2 - debe clasificar correctamente los envíos por estado en pendientes/completadas`.
  - `R3 - debe rechazar la petición sin token` → 401.
  - `R4 - debe rechazar la petición de un usuario sin rol REPARTIDOR` → 403.
  - `R5 - debe devolver 404 si el usuario REPARTIDOR no tiene perfil de repartidor asociado`.
  - `R6 - debe rechazar repartidorId distinto de "me"` → 422.

- [x] T13. Escribir tests backend en `backend/src/tests/entregaConfirmar.test.ts`:
  - `R7 - debe confirmar la entrega, actualizar estado a ENTREGADO, persistir foto/firma y crear EventoEnvio` (adjuntar archivos válidos `image/jpeg`/`image/png` con Supertest `.attach()`).
  - `R8 - debe crear una Notificacion para el cliente al confirmar la entrega`.
  - `R9 - debe rechazar la petición si falta el archivo foto o firma` → 422.
  - `R10 - debe devolver 404 si el envío no existe`.
  - `R11 - debe devolver 403 si el envío no está asignado a una ruta del repartidor autenticado`.
  - `R12 - debe devolver 409 si el envío ya está en estado ENTREGADO/CANCELADO/FALLIDO sin modificarlo`.
  - `R13 - debe rechazar la petición sin token` → 401.
  - `R14 - debe rechazar la petición de un usuario sin rol REPARTIDOR` → 403.

- [x] T14. Escribir tests backend en `backend/src/tests/entregaFallo.test.ts`:
  - `R15 - debe registrar el fallo, actualizar estado a FALLIDO, crear EventoEnvio e Incidencia ENTREGA_FALLIDA con nota y foto`.
  - `R16 - debe crear una Notificacion para el cliente al registrar el fallo`.
  - `R17 - debe rechazar la petición sin nota o con nota vacía` → 422.
  - `R18 - debe devolver 404 si el envío no existe`.
  - `R19 - debe devolver 403 si el envío no está asignado a una ruta del repartidor autenticado`.
  - `R20 - debe devolver 409 si el envío ya está en estado ENTREGADO/CANCELADO/FALLIDO sin modificarlo`.
  - `R21 - debe rechazar la petición sin token` → 401.
  - `R22 - debe rechazar la petición de un usuario sin rol REPARTIDOR` → 403.

- [x] T15. Escribir tests backend en `backend/src/tests/entregaArchivos.test.ts`
  (validación de archivos, cubre ambos endpoints de subida):
  - `R23 - debe rechazar archivos con MIME type distinto de image/jpeg o image/png` → 422 `INVALID_FILE_TYPE`, sin modificar el envío.
  - `R24 - debe rechazar archivos que excedan 5MB` → 422 `FILE_TOO_LARGE`, sin modificar el envío.
  - `R25 - debe descartar archivos enviados con un nombre de campo distinto de foto/firma`.

---

## Frontend

- [x] T16. Crear `frontend/src/types/entregaTypes.ts` con las interfaces
  `EntregaListItemDto`, `EntregasAgrupadasDto`, `ConfirmarEntregaResponseDto`,
  `RegistrarFalloResponseDto` (réplica de los DTOs del backend, sin importar
  `@prisma/client`, siguiendo el patrón de `userTypes.ts`).

- [x] T17. Crear `frontend/src/services/entregaService.ts`:
  - `listarMisEntregas(): Promise<EntregasAgrupadasDto>` — `GET /api/v1/entregas?repartidorId=me`.
  - `confirmar(envioId: string, foto: File, firma: Blob): Promise<ConfirmarEntregaResponseDto>` — construye `FormData` con `foto` y `firma`, `POST /api/v1/envios/:id/confirmar`.
  - `registrarFallo(envioId: string, nota: string, foto?: File): Promise<RegistrarFalloResponseDto>` — construye `FormData` con `nota` y `foto` opcional, `POST /api/v1/envios/:id/fallo`.

- [x] T18. Crear `frontend/src/hooks/useEntregas.ts`:
  - `useQuery({ queryKey: ['entregas', 'me'], queryFn: entregaService.listarMisEntregas })`.

- [x] T19. Crear `frontend/src/hooks/useConfirmarEntrega.ts`:
  - `useMutation({ mutationFn: ({ envioId, foto, firma }) => entregaService.confirmar(envioId, foto, firma), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entregas', 'me'] }) })`.

- [x] T20. Crear `frontend/src/hooks/useRegistrarFallo.ts`:
  - `useMutation({ mutationFn: ({ envioId, nota, foto }) => entregaService.registrarFallo(envioId, nota, foto), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['entregas', 'me'] }) })`.

- [x] T21. Crear `frontend/src/features/repartidor/VistaRepartidor.tsx`:
  - Pestañas Shadcn `Tabs` "Pendientes (N)" / "Completadas" alimentadas por `useEntregas`.
  - Tarjetas de entrega con ícono, código, dirección, rango horario y flecha de
    navegación a `/repartidor/entregas/:id/confirmar`.
  - Barra de navegación inferior (Rutas | Entregas | Mapa | Perfil).
  - Estados de carga/vacío manejados sin `alert()` (Shadcn componentes/Toast).

- [x] T22. Crear `frontend/src/features/repartidor/ConfirmacionEntrega.tsx`:
  - Lee `id` de `useParams()`.
  - Muestra código (`codigoSeguimiento`) y nombre del cliente.
  - Control de captura de foto (`input[type=file][accept="image/jpeg,image/png"]`).
  - Área de firma (canvas de trazo) que exporta a `Blob` `image/png` al confirmar.
  - Botón "CONFIRMAR ENTREGA" — usa `useConfirmarEntrega`; en éxito: toast +
    `navigate('/repartidor/entregas')`; en error: toast con el mensaje del
    backend, sin navegar (R30).
  - Link "Reportar incidencia" — abre formulario/modal con `nota` (requerida) y
    `foto` opcional; usa `useRegistrarFallo`; mismo manejo de éxito/error.

- [x] T23. Actualizar `frontend/src/router/` para añadir:
  - `/repartidor/entregas` → `<ProtectedRoute roles={['REPARTIDOR']}>` → `<VistaRepartidor />`.
  - `/repartidor/entregas/:id/confirmar` → `<ProtectedRoute roles={['REPARTIDOR']}>` → `<ConfirmacionEntrega />`.

- [x] T24. Escribir tests frontend en
  `frontend/src/features/repartidor/__tests__/VistaRepartidor.test.tsx`
  (Vitest + Testing Library):
  - `R26 - debe renderizar las pestañas Pendientes/Completadas con las entregas agrupadas`.
  - `R32 - debe navegar a la pantalla de confirmación al seleccionar una entrega pendiente`.

- [x] T25. Escribir tests frontend en
  `frontend/src/features/repartidor/__tests__/ConfirmacionEntrega.test.tsx`:
  - `R27 - debe renderizar código, cliente, control de foto, área de firma y botón CONFIRMAR ENTREGA`.
  - `R28 - debe llamar a la mutación de confirmar y navegar a Vista Repartidor en éxito`.
  - `R29 - debe llamar a la mutación de fallo desde el link "Reportar incidencia" y navegar en éxito`.
  - `R30 - debe mostrar el mensaje de error y permanecer en la pantalla si la mutación falla`.

---

## Verificación final

- [x] T26. Ejecutar `npx prisma generate` en `backend/` si fuese necesario tras
  T1 (sin migración nueva, solo para confirmar que el cliente Prisma refleja el
  schema actual).
- [x] T27. Ejecutar `npm run test` en `backend/` — todos los tests en verde,
  incluyendo R1–R25.
- [x] T28. Ejecutar `npm run test` en `frontend/` — todos los tests en verde,
  incluyendo R26–R30.
- [x] T29. Ejecutar `npm run lint` en `backend/` y `frontend/` — sin errores ni
  advertencias.
- [x] T30. Ejecutar `npm run build` en `backend/` y `frontend/` — sin errores de
  TypeScript.
- [ ] T31. Verificación manual: con Mailpit/servidor local, confirmar una
  entrega y un fallo desde la "Vista Repartidor" → "Confirmación de Entrega",
  comprobando que el archivo subido aparece accesible vía `/uploads/...` y que
  la `Notificacion` queda creada para el cliente.
  > NOTA (implementer): paso manual interactivo que requiere servidor en vivo +
  > Mailpit; queda pendiente de ejecución por humano/reviewer. El equivalente
  > automatizado (persistencia de archivo vía `guardarArchivo` y creación de
  > `Notificacion` al confirmar/fallar) está cubierto por R8/R16 en
  > `entregaConfirmar.test.ts` / `entregaFallo.test.ts` y R23-R25 en
  > `entregaArchivos.test.ts`, todos en verde.
