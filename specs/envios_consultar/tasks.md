# Tasks — envios_consultar

> Feature id: 5 | Sprint 2
> El implementer ejecuta estas tasks en orden. Marcar cada una `[x]` al completarla.
> Trazabilidad: cada Rn de requirements.md debe estar cubierta por al menos un test.

---

## Backend

- [x] T1. Ampliar `backend/src/validators/envioValidator.ts`
  - Añadir `listarEnviosSchema` (Zod): `page` (int positivo, default 1), `limit` (int positivo, default 20), `estado` (enum `EstadoEnvio`, opcional), `cliente` (string, opcional), `codigo` (string, opcional).
  - Añadir `editarEnvioSchema` (Zod): todos los campos opcionales (`remitente`, `destinatario`, `direccionDestino`, `peso` (>0), `dimensiones` (regex WxHxD), `descripcion` (string nullable)); añadir `.refine` que exige al menos un campo presente.
  - Exportar tipos inferidos `ListarEnviosInput = z.infer<typeof listarEnviosSchema>` y `EditarEnvioInput = z.infer<typeof editarEnvioSchema>`.

- [x] T2. Ampliar `backend/src/types/envioTypes.ts`
  - Añadir interfaz `EnvioListItemDto`: `id`, `codigoSeguimiento`, `estado`, `remitente`, `destinatario`, `clienteId`, `clienteNombre`, `createdAt`.
  - Añadir interfaz `EventoEnvioDto`: `id`, `estado`, `descripcion`, `lat`, `lng`, `timestamp`.
  - Añadir interfaz `EnvioDetalleDto`: todos los campos de `EnvioResponseDto` más `rutaId`, `updatedAt`, `eventos: EventoEnvioDto[]`.
  - Añadir interfaz `EditarEnvioDto`: todos los campos editables como opcionales.
  - Añadir interfaz `PaginationMeta`: `total`, `page`, `limit`, `totalPages`.
  - Añadir interfaz `PaginatedEnviosResponse`: `data: EnvioListItemDto[]`, `meta: PaginationMeta`.
  - Añadir interfaz `CancelarEnvioResponseDto`: `id`, `codigoSeguimiento`, `estado`.

- [x] T3. Ampliar `backend/src/repositories/envioRepository.ts`
  - Añadir método `findMany(where: Prisma.EnvioWhereInput, skip: number, take: number): Promise<EnvioConCliente[]>`:
    - `prisma.envio.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: { cliente: { include: { usuario: true } } } })`.
  - Añadir método `count(where: Prisma.EnvioWhereInput): Promise<number>`:
    - `prisma.envio.count({ where })`.
  - Añadir método `findById(id: string): Promise<EnvioConDetalle | null>`:
    - `prisma.envio.findUnique({ where: { id }, include: { eventos: { orderBy: { timestamp: 'asc' } }, cliente: { include: { usuario: true } } } })`.
  - Añadir método `update(id: string, data: EditarEnvioDto): Promise<Envio>`:
    - `prisma.envio.update({ where: { id }, data })`.
  - Añadir método `cancelar(id: string): Promise<Envio>`:
    - Usa `prisma.$transaction` para: (a) `prisma.envio.update({ where: { id }, data: { estado: 'CANCELADO' } })`; (b) `prisma.eventoEnvio.create({ data: { envioId: id, estado: 'CANCELADO', descripcion: 'Envío cancelado por operador' } })`.
    - Devuelve el envío actualizado.

- [x] T4. Ampliar `backend/src/services/envioService.ts`
  - Añadir método `listar(query: ListarEnviosInput): Promise<PaginatedEnviosResponse>`:
    - Construir `where` dinámicamente según filtros presentes.
    - Ejecutar `findMany` y `count` en paralelo (`Promise.all`).
    - Mapear resultados a `EnvioListItemDto` extrayendo `clienteNombre` de `cliente.usuario.nombre`.
    - Devolver `{ data, meta: { total, page, limit, totalPages } }`.
  - Añadir método `obtenerDetalle(id: string): Promise<EnvioDetalleDto>`:
    - Llamar `envioRepository.findById(id)`; si `null` → `AppError('ENVIO_NOT_FOUND', 404)`.
    - Mapear a `EnvioDetalleDto` incluyendo array `eventos`.
  - Añadir método `editar(id: string, dto: EditarEnvioDto): Promise<EnvioResponseDto>`:
    - Verificar existencia con `envioRepository.findById(id)`; si `null` → `AppError('ENVIO_NOT_FOUND', 404)`.
    - Llamar `envioRepository.update(id, dto)`.
    - Mapear resultado a `EnvioResponseDto` y devolver.
  - Añadir método `cancelar(id: string): Promise<CancelarEnvioResponseDto>`:
    - Verificar existencia: `envioRepository.findById(id)`; si `null` → `AppError('ENVIO_NOT_FOUND', 404)`.
    - Verificar estado: si `estado !== 'PENDIENTE'` → `AppError('INVALID_STATE_TRANSITION', 'Solo se pueden cancelar envíos en estado PENDIENTE', 409)`.
    - Llamar `envioRepository.cancelar(id)`.
    - Devolver `{ id, codigoSeguimiento, estado: 'CANCELADO' }`.

- [x] T5. Ampliar `backend/src/controllers/envioController.ts`
  - Añadir `listarEnviosHandler(req, res, next)`:
    - Parsear query con `listarEnviosSchema.parse(req.query)`.
    - Llamar `envioService.listar(query)`.
    - Responder `res.status(200).json({ ...result, message: 'Envíos obtenidos exitosamente', status: 200 })`.
  - Añadir `obtenerDetalleHandler(req, res, next)`:
    - Extraer `req.params.id`.
    - Llamar `envioService.obtenerDetalle(id)`.
    - Responder `res.status(200).json({ data: envio, message: 'Envío obtenido exitosamente', status: 200 })`.
  - Añadir `editarEnvioHandler(req, res, next)`:
    - Extraer `req.params.id`.
    - Parsear body con `editarEnvioSchema.parse(req.body)`.
    - Llamar `envioService.editar(id, dto)`.
    - Responder `res.status(200).json({ data: envio, message: 'Envío actualizado exitosamente', status: 200 })`.
  - Añadir `cancelarEnvioHandler(req, res, next)`:
    - Extraer `req.params.id`.
    - Llamar `envioService.cancelar(id)`.
    - Responder `res.status(200).json({ data: result, message: 'Envío cancelado exitosamente', status: 200 })`.

- [x] T6. Ampliar `backend/src/routes/envios.ts`
  - `router.get('/', authMiddleware, roleMiddleware('OPERADOR'), listarEnviosHandler)`.
  - `router.get('/:id', authMiddleware, roleMiddleware('OPERADOR'), obtenerDetalleHandler)`.
  - `router.patch('/:id', authMiddleware, roleMiddleware('OPERADOR'), editarEnvioHandler)`.
  - `router.delete('/:id', authMiddleware, roleMiddleware('OPERADOR'), cancelarEnvioHandler)`.
  - Verificar que el router ya está registrado en `app.use('/api/v1/envios', enviosRouter)` desde `envios_crear`; no duplicar el registro.

- [x] T7. Escribir tests backend en `backend/src/tests/envios.test.ts` (Jest + Supertest)
  - En el mismo archivo de tests creado en `envios_crear`, añadir un bloque `describe('envios_consultar')` con los siguientes casos:
  - `R1/R34 — debe rechazar GET /envios sin token con 401`
  - `R2/R34 — debe rechazar GET /envios con token de CLIENTE con 403`
  - `R3/R35 — debe devolver lista paginada con meta correcto sin filtros`
  - `R4/R35 — debe usar page=1 y limit=20 por defecto cuando no se pasan query params`
  - `R5/R36 — debe devolver 422 cuando page=0`
  - `R6/R37 — debe filtrar por estado=PENDIENTE y devolver solo envíos PENDIENTE`
  - `R7/R38 — debe filtrar por cliente (nombre parcial, case-insensitive)`
  - `R8/R39 — debe filtrar por codigo (parcial, case-insensitive)`
  - `R9/R40 — debe aplicar filtros estado y codigo simultáneamente (AND)`
  - `R10/R41 — debe devolver 422 cuando estado tiene un valor no válido`
  - `R11/R42 — debe devolver detalle completo con array eventos ordenado por timestamp`
  - `R12/R43 — debe devolver 404 cuando id no existe en GET /:id`
  - `R13/R44 — debe actualizar campos editables y devolver 200 con registro actualizado`
  - `R14/R45 — no debe modificar estado aunque se incluya en el body del PATCH`
  - `R15/R46 — debe devolver 422 cuando body de PATCH no contiene campos editables`
  - `R16/R47 — debe devolver 422 cuando peso es negativo en PATCH`
  - `R17 — debe devolver 404 cuando id no existe en PATCH /:id`
  - `R18/R48 — debe cambiar estado a CANCELADO y devolver 200 para envío PENDIENTE`
  - `R19/R49 — debe devolver 409 al cancelar envío que no está en PENDIENTE`
  - `R20/R50 — debe devolver 404 cuando id no existe en DELETE /:id`
  - `R21/R48 — debe crear EventoEnvio con estado CANCELADO al cancelar el envío`

---

## Frontend

- [x] T8. Ampliar `frontend/src/types/envioTypes.ts`
  - Añadir interfaces: `EnvioListItemDto`, `EventoEnvioDto`, `EnvioDetalleDto`, `EditarEnvioDto`, `EnvioFilters`, `CancelarEnvioResponseDto`, `PaginationMeta`, `PaginatedResponse<T>`.

- [x] T9. Ampliar `frontend/src/services/envioService.ts`
  - Añadir método `listar(filters: EnvioFilters): Promise<PaginatedResponse<EnvioListItemDto>>` → `GET /api/v1/envios` con query params construidos desde `filters`.
  - Añadir método `obtenerDetalle(id: string): Promise<EnvioDetalleDto>` → `GET /api/v1/envios/${id}`.
  - Añadir método `editar(id: string, dto: EditarEnvioDto): Promise<EnvioResponseDto>` → `PATCH /api/v1/envios/${id}`.
  - Añadir método `cancelar(id: string): Promise<CancelarEnvioResponseDto>` → `DELETE /api/v1/envios/${id}`.

- [x] T10. Crear `frontend/src/hooks/useEnvios.ts`
  - Hook `useEnvios(filters: EnvioFilters)` usando `useQuery` con `queryKey: ['envios', filters]` y `queryFn: () => envioService.listar(filters)`.
  - Exponer `{ data, isLoading, isError, error }`.

- [x] T11. Crear `frontend/src/hooks/useEnvioDetalle.ts`
  - Hook `useEnvioDetalle(id: string)` usando `useQuery` con `queryKey: ['envios', id]` y `queryFn: () => envioService.obtenerDetalle(id)`.
  - Habilitar la query solo cuando `id` no es vacío (`enabled: !!id`).

- [x] T12. Crear `frontend/src/hooks/useEditarEnvio.ts`
  - Hook `useEditarEnvio(id: string)` usando `useMutation` con `mutationFn: (dto: EditarEnvioDto) => envioService.editar(id, dto)`.
  - `onSuccess`: invalidar `queryClient.invalidateQueries({ queryKey: ['envios'] })`.

- [x] T13. Crear `frontend/src/hooks/useCancelarEnvio.ts`
  - Hook `useCancelarEnvio()` usando `useMutation` con `mutationFn: (id: string) => envioService.cancelar(id)`.
  - `onSuccess`: invalidar `queryClient.invalidateQueries({ queryKey: ['envios'] })`.

- [x] T14. Crear `frontend/src/features/envios/ConsultarEnvios.tsx`
  - Barra de búsqueda (input + botón lupa) que actualiza el estado `searchTerm` local; al enviar el formulario o presionar Enter actualiza los `filters` pasados a `useEnvios`.
  - Tabla con columnas: Código, Cliente, Estado (badge de color: PENDIENTE=naranja, EN_RUTA=azul, ENTREGADO=verde, CANCELADO=rojo), Acciones (ver, editar, eliminar).
  - Acción "ver": `navigate(\`/envios/${id}\`)`.
  - Acción "editar": abre `<EditarEnvioModal envioId={id} />`.
  - Acción "eliminar": abre `<AlertDialog>` de confirmación; al confirmar llama `useCancelarEnvio`.
  - Controles de paginación en el footer usando `meta.page`, `meta.totalPages` del resultado de `useEnvios`.
  - Botón "+ Nuevo Envío" → `navigate('/envios/crear')`.
  - Layout y estilos coinciden con el wireframe (sección "Consultar Envíos").

- [x] T15. Crear `frontend/src/features/envios/EditarEnvioModal.tsx`
  - Modal (Dialog de Shadcn/UI) con formulario React Hook Form + Zod (`editarEnvioSchemaFrontend`).
  - Pre-poblar campos al abrir: usar `useEnvioDetalle(id)` o recibir los datos actuales como props.
  - Campos editables: Remitente, Destinatario, Dirección destino, Peso (kg), Dimensiones (cm), Descripción.
  - Botón "GUARDAR CAMBIOS" (deshabilitado mientras `isPending`).
  - Botón "Cancelar" cierra el modal sin persistir.
  - Toast de éxito al recibir 200; Toast de error al recibir cualquier error de API.
  - Integra hook `useEditarEnvio(id)`.

- [x] T16. Crear `frontend/src/features/envios/DetalleEnvio.tsx`
  - Pantalla en `/envios/:id` que muestra todos los campos de `EnvioDetalleDto`.
  - Muestra badge de estado con color.
  - Muestra historial de `EventoEnvio` como línea de tiempo: icono + timestamp formateado + estado + descripción.
  - Integra hook `useEnvioDetalle(id)` extrayendo `id` de `useParams()`.
  - Botón "Volver" → `navigate('/envios')`.

- [x] T17. Actualizar el router en `frontend/src/router/`
  - Añadir ruta protegida `/envios` → `<ConsultarEnvios />` (ProtectedRoute roles: `['OPERADOR']`).
  - Añadir ruta protegida `/envios/:id` → `<DetalleEnvio />` (ProtectedRoute roles: `['OPERADOR']`).
  - Verificar que `/envios/crear` del router de `envios_crear` sigue funcionando (no debe ser solapada por `/envios/:id`; usar orden correcto de rutas: `/envios/crear` antes de `/envios/:id`).

- [x] T18. Escribir tests frontend en `frontend/src/features/envios/ConsultarEnvios.test.tsx` (Vitest + Testing Library)
  - `R22/R23/R25/R26 — debe renderizar la barra de búsqueda, la tabla, la paginación y el botón Nuevo Envío`
  - `R24 — debe mostrar badges de color para cada estado`
  - `R27 — debe filtrar la tabla cuando el usuario escribe en la barra de búsqueda y presiona Enter`
  - `R28 — debe navegar a /envios/:id al hacer clic en la acción ver`
  - `R29/R30 — debe abrir el modal de edición con los campos pre-poblados al hacer clic en editar`
  - `R31 — debe mostrar AlertDialog de confirmación al hacer clic en eliminar`
  - `R32 — debe llamar a envioService.cancelar y mostrar Toast de éxito al confirmar cancelación`
  - `R33 — debe mostrar Toast de error cuando DELETE devuelve 409`

- [x] T19. Escribir tests frontend en `frontend/src/features/envios/EditarEnvioModal.test.tsx` (Vitest + Testing Library)
  - `debe renderizar todos los campos editables pre-poblados`
  - `debe mostrar errores de validación al enviar con peso negativo`
  - `R30 — debe llamar a envioService.editar con los datos correctos al enviar`
  - `debe mostrar Toast de éxito y cerrar el modal al recibir 200`
  - `debe mostrar Toast de error cuando la API devuelve un error`

- [x] T20. Escribir tests frontend en `frontend/src/features/envios/DetalleEnvio.test.tsx` (Vitest + Testing Library)
  - `R11 — debe renderizar todos los campos del EnvioDetalleDto`
  - `debe renderizar el historial de EventoEnvio en orden cronológico`
  - `debe navegar a /envios al hacer clic en el botón Volver`

---

## Verificación final

- [x] T21. Ejecutar `npm run lint` en `backend/` y `frontend/` — sin errores.
- [x] T22. Ejecutar `npm run test` en `backend/` — todos los tests del bloque `envios_consultar` en verde.
- [x] T23. Ejecutar `npm run test` en `frontend/` — todos los tests de `ConsultarEnvios.test.tsx`, `EditarEnvioModal.test.tsx` y `DetalleEnvio.test.tsx` en verde.
- [x] T24. Ejecutar `npm run build` en `backend/` y `frontend/` — sin errores de TypeScript.
