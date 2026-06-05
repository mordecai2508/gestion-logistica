# Tasks — rastreo_paquete

> Feature id: 6 | Sprint 3
> El implementer ejecuta estas tasks en orden. Marcar cada una `[x]` al completarla.
> Trazabilidad: cada Rn de requirements.md debe estar cubierta por al menos un test (T9).

---

## Backend

- [ ] T1. Crear `backend/src/validators/trackingValidator.ts`
  - Exportar `trackingCodigoSchema` (Zod): `codigo` como string con regex `/^TRK-\d{8}-[A-Z0-9]{8}$/`.
  - Exportar `locationUpdateSchema` (Zod): `{ envioId: z.string().cuid(), lat: z.number(), lng: z.number() }`.
  - Exportar los tipos inferidos `TrackingCodigoInput` y `LocationUpdateInput`.

- [ ] T2. Crear `backend/src/types/trackingTypes.ts`
  - Interfaz `TrackingEventoDto`: `{ id, estado, descripcion, lat: number | null, lng: number | null, timestamp: Date }`.
  - Interfaz `TrackingResponseDto`: `{ codigoSeguimiento, estado, remitente, destinatario, direccionDestino, ultimaActualizacion: Date, eventos: TrackingEventoDto[] }`.
  - Interfaz `CreateEventoUbicacionDto`: `{ envioId, estado, descripcion, lat: number, lng: number }`.

- [ ] T3. Crear `backend/src/repositories/trackingRepository.ts`
  - Importar la instancia singleton de `PrismaClient`.
  - Método `findByCodigo(codigo: string)`: `prisma.envio.findUnique({ where: { codigoSeguimiento: codigo }, include: { eventos: { orderBy: { timestamp: 'asc' } } } })`.
  - Método `createEventoUbicacion(data: CreateEventoUbicacionDto): Promise<EventoEnvio>`: `prisma.eventoEnvio.create({ data })`.

- [ ] T4. Crear `backend/src/services/trackingService.ts`
  - Importar `trackingRepository`.
  - Exportar `trackingService` con método `getByCodigoSeguimiento(codigo: string): Promise<TrackingResponseDto>`:
    1. Llamar `trackingRepository.findByCodigo(codigo)`.
    2. Si `null` → lanzar `AppError('ENVIO_NOT_FOUND', 'Envío no encontrado', 404)`.
    3. Calcular `ultimaActualizacion`: si `eventos.length > 0` usar `eventos[eventos.length - 1].timestamp`, si no usar `envio.updatedAt`.
    4. Mapear a `TrackingResponseDto` (sin incluir `id` interno del Envio) y devolver.

- [ ] T5. Crear `backend/src/controllers/trackingController.ts`
  - Exportar `getTrackingByCodigo(req: Request, res: Response, next: NextFunction)`:
    - Parsear `req.params.codigo` con `trackingCodigoSchema.parse({ codigo: req.params.codigo })` → 422 si falla.
    - Llamar `trackingService.getByCodigoSeguimiento(codigo)`.
    - Responder `res.status(200).json({ data: result, message: 'Envío encontrado', status: 200 })`.
    - Pasar cualquier error a `next(error)`.

- [ ] T6. Crear `backend/src/routes/tracking.ts` y registrar en `index.ts`
  - Definir router Express.
  - `router.get('/:codigo', getTrackingByCodigo)` — sin `authMiddleware` (endpoint público).
  - En `backend/src/index.ts`, agregar: `import { trackingRouter } from './routes/tracking'` y `app.use('/api/v1/tracking', trackingRouter)`.

- [ ] T7. Crear `backend/src/sockets/tracking.ts`
  - Exportar función `registerTrackingHandlers(io: Server, socket: Socket): void`.
  - Handler `location:update`:
    1. Parsear payload con `locationUpdateSchema.safeParse(payload)` → si falla, `socket.emit('tracking:error', { message: 'Payload inválido' })`; return.
    2. Buscar `Envio` por `envioId` usando `envioRepository.findById(envioId)`.
    3. Si no existe → `socket.emit('tracking:error', { message: 'Envío no encontrado' })`; return.
    4. Llamar `trackingRepository.createEventoUbicacion({ envioId, estado: envio.estado, descripcion: 'Actualización de ubicación', lat, lng })`.
    5. `io.to(`tracking:${envioId}`).emit('tracking:location', { envioId, lat, lng, timestamp: new Date().toISOString() })`.
  - Handler `tracking:join`:
    - Extraer `envioId` del payload → `socket.join(`tracking:${envioId}`)`.
  - Handler `tracking:leave`:
    - Extraer `envioId` del payload → `socket.leave(`tracking:${envioId}`)`.

- [ ] T8. Actualizar `backend/src/index.ts`
  - Dentro del bloque `io.on('connection', (socket) => { ... })`, llamar `registerTrackingHandlers(io, socket)`.
  - Asegurarse de importar `registerTrackingHandlers` desde `./sockets/tracking`.

- [ ] T9. Escribir tests en `backend/src/tests/tracking.test.ts` (Jest + Supertest + socket.io-client)
  - `R1/R2/R3 — debe retornar HTTP 200 con TrackingResponseDto y eventos ordenados por timestamp ASC`
  - `R4 — debe retornar HTTP 404 cuando el código no existe en la BD`
  - `R5 — debe retornar HTTP 200 sin header Authorization`
  - `R6 — debe retornar HTTP 422 cuando el código no tiene formato TRK-YYYYMMDD-XXXXXXXX`
  - `R8 — debe emitir tracking:location a la sala tracking:${envioId} al recibir location:update válido`
  - `R9 — debe crear un EventoEnvio con lat, lng y descripcion "Actualización de ubicación" al recibir location:update válido`
  - `R10 — debe emitir tracking:error al socket emisor cuando envioId no existe`
  - `R11 — debe emitir tracking:error al socket emisor cuando el payload carece del campo lat`

---

## Frontend

- [ ] T10. Crear `frontend/src/types/trackingTypes.ts`
  - Interfaces `EventoEnvioTrackingDto`, `TrackingResponseDto`, y `TrackingLocationPayload` según el diseño (sección 4.7 de design.md).

- [ ] T11. Crear `frontend/src/services/trackingService.ts`
  - Exportar `trackingService` con método `getByCodigo(codigo: string): Promise<TrackingResponseDto>` usando la instancia `api` de Axios (`GET /tracking/:codigo`).
  - No adjuntar header de autenticación para esta llamada (el endpoint es público).

- [ ] T12. Crear `frontend/src/hooks/useTracking.ts`
  - Hook `useTracking(codigo: string | null)` usando `useQuery` de TanStack Query.
  - `queryKey: ['tracking', codigo]`.
  - `enabled: !!codigo`.
  - `queryFn`: llama `trackingService.getByCodigo(codigo!)`.

- [ ] T13. Crear `frontend/src/hooks/useTrackingSocket.ts`
  - Hook `useTrackingSocket(envioId: string | null, onLocation: (p: TrackingLocationPayload) => void)`.
  - En `useEffect`: si `envioId` existe, emitir `tracking:join`, suscribirse a `tracking:location`.
  - En cleanup: emitir `tracking:leave`, desuscribirse del evento.
  - Dependencia del efecto: `[envioId]`.

- [ ] T14. Crear `frontend/src/features/tracking/TrackingMap.tsx`
  - Componente que recibe `lat: number | null`, `lng: number | null`.
  - Si `lat`/`lng` son `null`: renderizar `<MapContainer>` centrado en `[4.711, -74.0721]` zoom 12, sin `<Marker>`.
  - Si `lat`/`lng` no son `null`: renderizar `<MapContainer>` centrado en `[lat, lng]` zoom 14 con `<Marker position={[lat, lng]} />`.
  - Usar `react-leaflet` con tiles de OpenStreetMap.
  - Asegurarse de importar el CSS de Leaflet (`leaflet/dist/leaflet.css`).

- [ ] T15. Crear `frontend/src/features/tracking/EventoTimeline.tsx`
  - Componente que recibe `eventos: EventoEnvioTrackingDto[]`.
  - Renderiza cada evento como fila de línea de tiempo: icono de estado + timestamp formateado `DD/MM/YYYY – HH:MM AM/PM` + badge `estado`.
  - Formato de fecha usando `Intl.DateTimeFormat` con locale `es-CO` y timezone del cliente.

- [ ] T16. Crear `frontend/src/features/tracking/RastrearPaquete.tsx`
  - Estado local: `codigoInput` (string), `codigoBuscado` (string | null), `marcadorPos` (`{ lat: number, lng: number } | null`).
  - Validación local: si `codigoInput` está vacío al presionar "Buscar", mostrar mensaje inline "Ingrese un código de seguimiento" sin llamar a la API.
  - Integrar `useTracking(codigoBuscado)`.
  - Al recibir resultado exitoso: inicializar `marcadorPos` con la última coordenada no nula de `eventos`, si existe.
  - Integrar `useTrackingSocket(resultado?.envioId ?? null, (payload) => setMarcadorPos({ lat: payload.lat, lng: payload.lng }))`.
  - Renderizar: campo + botón, badge de estado, texto de última actualización, `<TrackingMap lat={marcadorPos?.lat ?? null} lng={marcadorPos?.lng ?? null} />`, `<EventoTimeline eventos={resultado?.eventos ?? []} />`.
  - Si `isError` del query → mostrar "Código de seguimiento no encontrado".
  - Estructurar visualmente según wireframe (sección "Rastrear Paquete" de `docs/wireframe-reference.md`).

- [ ] T17. Actualizar router en `frontend/src/router/`
  - Añadir ruta pública `/tracking` que renderiza `<RastrearPaquete />`.
  - La ruta NO debe estar envuelta en `<ProtectedRoute>`.
  - Verificar que la ruta `/tracking` está accesible para usuarios no autenticados.

- [ ] T18. Escribir tests en `frontend/src/features/tracking/RastrearPaquete.test.tsx` (Vitest + Testing Library)
  - `R17 — debe renderizar el campo de búsqueda y el botón "Buscar"`
  - `R18 — debe llamar a trackingService.getByCodigo con el código introducido al presionar "Buscar"`
  - `R19 — debe mostrar el badge de estado, la última actualización y el mapa al recibir resultado`
  - `R22 — debe renderizar la línea de tiempo con los eventos recibidos`
  - `R24 — debe mostrar "Código de seguimiento no encontrado" cuando el API devuelve 404`
  - `R25 — debe mostrar error inline y no llamar a la API cuando el campo está vacío`

---

## Verificación final

- [ ] T19. Ejecutar `npm run lint` en `backend/` y `frontend/` — sin errores.
- [ ] T20. Ejecutar `npm run test` en `backend/` — todos los tests de `tracking.test.ts` en verde.
- [ ] T21. Ejecutar `npm run test` en `frontend/` — todos los tests de `RastrearPaquete.test.tsx` en verde.
- [ ] T22. Ejecutar `npm run build` en `backend/` y `frontend/` — sin errores de TypeScript.
