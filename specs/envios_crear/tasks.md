# Tasks — envios_crear

> Feature id: 4 | Sprint 2
> El implementer ejecuta estas tasks en orden. Marcar cada una `[x]` al completarla.
> Trazabilidad: cada Rn de requirements.md debe estar cubierta por al menos un test (T8).

---

## Backend

- [x] T1. Crear `backend/src/validators/envioValidator.ts`
  - Exportar `crearEnvioSchema` (Zod): campos `remitente`, `destinatario`, `direccionDestino`, `peso` (>0), `dimensiones` (regex `/^\d+(\.\d+)?x\d+(\.\d+)?x\d+(\.\d+)?$/i`), `clienteId` (cuid), `descripcion` (opcional).
  - Exportar el tipo inferido `CrearEnvioInput = z.infer<typeof crearEnvioSchema>`.

- [x] T2. Crear `backend/src/types/envioTypes.ts`
  - Interfaz `CrearEnvioDto`: campos del body validado (`remitente`, `destinatario`, `direccionDestino`, `peso`, `dimensiones`, `clienteId`, `descripcion?`).
  - Interfaz `EnvioResponseDto`: `id`, `codigoSeguimiento`, `estado`, `remitente`, `destinatario`, `direccionDestino`, `peso`, `dimensiones`, `descripcion`, `clienteId`, `createdAt`.

- [x] T3. Crear `backend/src/repositories/envioRepository.ts`
  - Importar `PrismaClient` (instancia singleton compartida o nueva según patrón del proyecto).
  - Método `createEnvio(data: CrearEnvioDto & { codigoSeguimiento: string }): Promise<Envio>`:
    - Usa `prisma.$transaction` para crear `Envio` y el `EventoEnvio` inicial (`estado: 'PENDIENTE'`, `descripcion: 'Envío creado'`) de forma atómica.
    - Devuelve el `Envio` creado.
  - Método `findByCodigo(codigo: string): Promise<Envio | null>`:
    - `prisma.envio.findUnique({ where: { codigoSeguimiento: codigo } })`.

- [x] T4. Crear `backend/src/services/envioService.ts`
  - Función interna `generarCodigoUnico(): Promise<string>`:
    - Bucle de hasta 3 intentos.
    - Cada intento: fecha UTC `YYYYMMDD` + `crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 8)` → `TRK-{fecha}-{parte}`.
    - Llama `envioRepository.findByCodigo(codigo)` para verificar unicidad.
    - Si los 3 intentos colisionan, lanza `AppError('CODIGO_GENERATION_FAILED', 'No se pudo generar un código de seguimiento único', 500)`.
  - Exportar `envioService` con método `crear(dto: CrearEnvioDto): Promise<EnvioResponseDto>`:
    1. Verificar `clienteId` existe (llamada a `clienteRepository.findById` o query directa); lanzar `AppError('CLIENTE_NOT_FOUND', 404)` si no existe.
    2. Llamar `generarCodigoUnico()`.
    3. Llamar `envioRepository.createEnvio({ ...dto, codigoSeguimiento: codigo })`.
    4. Mapear resultado a `EnvioResponseDto` y devolver.

- [x] T5. Crear `backend/src/controllers/envioController.ts`
  - Exportar `crearEnvioHandler(req: Request, res: Response, next: NextFunction)`:
    - Parsear body con `crearEnvioSchema.parse(req.body)` (error capturado por error handler global → 422).
    - Llamar `envioService.crear(dto)`.
    - Responder `res.status(201).json({ data: envio, message: 'Envío creado exitosamente', status: 201 })`.
    - Pasar cualquier otro error a `next(error)`.

- [x] T6. Crear `backend/src/middlewares/roleMiddleware.ts` (si no existe ya)
  - Exportar `roleMiddleware(rol: Rol)` → middleware Express que verifica `req.user?.rol === rol`; si no coincide, llama `next(AppError('FORBIDDEN', 'Acceso denegado: se requiere rol ' + rol, 403))`.

- [x] T7. Crear `backend/src/routes/envios.ts` y registrar en el servidor principal
  - Definir router Express.
  - `router.post('/', authMiddleware, roleMiddleware('OPERADOR'), crearEnvioHandler)`.
  - En `backend/src/index.ts` (o el archivo de app principal), registrar: `app.use('/api/v1/envios', enviosRouter)`.

- [x] T8. Escribir tests backend en `backend/src/tests/envios.test.ts` (Jest + Supertest)
  - `R1 — debe rechazar requests sin token con 401`
  - `R2 — debe rechazar requests de rol CLIENTE con 403`
  - `R2 — debe rechazar requests de rol REPARTIDOR con 403`
  - `R3 — debe crear el envío con estado PENDIENTE y devolver 201 con EnvioResponseDto`
  - `R4 — debe crear un EventoEnvio inicial con estado PENDIENTE al crear el envío`
  - `R5/R6 — el código generado debe tener formato TRK-YYYYMMDD-XXXXXXXX y ser único`
  - `R7 — debe devolver 500 cuando hay 3 colisiones consecutivas al generar el código`
  - `R8/R9 — debe devolver 422 cuando peso es 0 o negativo`
  - `R8/R9 — debe devolver 422 cuando faltan campos obligatorios (remitente)`
  - `R8/R9 — debe devolver 422 cuando dimensiones no tiene formato WxHxD`
  - `R10 — debe devolver 404 cuando clienteId no existe en la tabla Cliente`
  - `R17 al R23 — referencias cruzadas en nombre del test según formato "Rn - debe..."`

---

## Frontend

- [x] T9. Crear `frontend/src/features/envios/CrearEnvio.tsx`
  - Formulario con React Hook Form + resolver Zod (schema frontend).
  - Campos: Remitente, Destinatario, Dirección destino (con ícono `MapPin`), Peso (kg), Dimensiones (cm, placeholder `30x20x15`), Descripción (textarea, opcional).
  - Integrar `useCrearEnvio()` hook; botón "GUARDAR ENVÍO" deshabilitado mientras `isPending`.
  - Botón "Cancelar" → `navigate('/envios')`.
  - Toast de éxito al recibir 201; Toast de error al recibir cualquier error de API.
  - Asegurarse que el layout visual coincide con el wireframe (sección "Crear Envío").

- [x] T10. Crear `frontend/src/services/envioService.ts`
  - Exportar `envioService` con método `crear(dto: CrearEnvioDto): Promise<EnvioResponseDto>` usando la instancia `api` (Axios configurada con `baseURL = /api/v1` y el interceptor de auth).

- [x] T11. Crear `frontend/src/hooks/useCrearEnvio.ts`
  - Hook `useCrearEnvio()` usando `useMutation` de TanStack Query.
  - `mutationFn`: llama `envioService.crear(dto)`.
  - `onSuccess`: invalida query key `['envios']`.
  - Exponer `{ mutate, isPending, isError, error }`.

- [x] T12. Actualizar el router en `frontend/src/router/`
  - Añadir ruta protegida `/envios/crear` que renderiza `<CrearEnvio />`.
  - La ruta debe estar envuelta en `<ProtectedRoute roles={['OPERADOR']} />`.
  - Verificar que el enlace desde el botón "+ Nuevo Envío" del Dashboard apunta a `/envios/crear`.

- [x] T13. Escribir tests frontend en `frontend/src/features/envios/CrearEnvio.test.tsx` (Vitest + Testing Library)
  - `debe renderizar todos los campos del formulario`
  - `debe mostrar errores de validación al enviar el formulario vacío`
  - `debe llamar a envioService.crear con los datos correctos al enviar el formulario`
  - `debe mostrar Toast de éxito y navegar a /envios al recibir 201`
  - `debe mostrar Toast de error cuando la API devuelve un error`
  - `debe deshabilitar el botón GUARDAR ENVÍO mientras isPending es true`

---

## Verificación final

- [x] T14. Ejecutar `npm run lint` en `backend/` y `frontend/` — sin errores.
- [x] T15. Ejecutar `npm run test` en `backend/` — todos los tests de `envios.test.ts` en verde.
- [x] T16. Ejecutar `npm run test` en `frontend/` — todos los tests de `CrearEnvio.test.tsx` en verde.
- [x] T17. Ejecutar `npm run build` en `backend/` y `frontend/` — sin errores de TypeScript.

---

## Correcciones post-review

- [x] T18. Mover DTOs frontend a `frontend/src/types/envioTypes.ts` (D1)
- [x] T19. Añadir test R13 para botón Cancelar (D2)
- [x] T20. Layout Peso/Dimensiones en fila (D3B)
- [x] T21. Campo clienteId → buscador/combobox de clientes (D3A) + endpoint `GET /api/v1/clientes`
