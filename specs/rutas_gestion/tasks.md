# Tasks — rutas_gestion

El implementer sigue este orden estrictamente, marcando `[x]` al completar cada tarea.

---

## Backend

- [x] T1. Actualizar schema Prisma: añadir campo `codigo String @unique` al modelo `Ruta`, agregar enum `EstadoRuta { PENDIENTE EN_PROGRESO COMPLETADA CANCELADA }` si no existe, y verificar/añadir campos `lat Float?` y `lng Float?` en el modelo `Envio` para soportar coordenadas de destino. Ejecutar migración `npx prisma migrate dev --name rutas_gestion`.

- [x] T2. Crear validator Zod `backend/src/validators/rutaValidator.ts` con los siguientes schemas:
  - `crearRutaSchema`: `{ enviosIds: string[] (min 1), vehiculoId: string (cuid), repartidorId: string (cuid) }`
  - `reasignarRutaSchema`: `{ repartidorId?: string (cuid), vehiculoId?: string (cuid) }` — al menos uno requerido
  - `listarRutasSchema`: `{ page?: number, limit?: number (max 100), repartidorId?: string }`

- [x] T3. Crear repositorio `backend/src/repositories/rutaRepository.ts` con las siguientes operaciones (solo acceso a Prisma, sin lógica de negocio):
  - `crear(data)` — crea ruta e incluye relaciones vehiculo, repartidor, envios
  - `findById(id)` — incluye relaciones completas
  - `findAll(filters)` — paginado, filtra por `repartidorId` opcional
  - `update(id, data)` — actualización parcial
  - `findByCodigo(codigo)` — para validar unicidad

- [x] T4. Crear servicio `backend/src/services/rutaService.ts` con los métodos:
  - `crear(dto, operadorId)` — implementa los pasos de la sección 3.1 del design.md (validaciones, generación de código, transacción)
  - `listar(filters, usuarioId, rol)` — aplica filtro `repartidorId=me` si rol es REPARTIDOR
  - `obtenerDetalle(id, usuarioId, rol)` — valida acceso según rol
  - `reasignar(id, dto)` — implementa los pasos de la sección 3.2 del design.md
  - `calcularOptima(id)` — implementa el nearest-neighbor heuristic de la sección 3.3 del design.md
  - `verificarCierreRuta(rutaId)` — lógica de cierre automático de la sección 3.4 del design.md (llamado desde envioService al actualizar estado)

- [x] T5. Crear controlador `backend/src/controllers/rutaController.ts` con los handlers:
  - `crearRuta` — extrae DTO validado, llama a `rutaService.crear`, responde 201
  - `listarRutas` — extrae query params, llama a `rutaService.listar`, responde 200
  - `obtenerRuta` — extrae `:id`, llama a `rutaService.obtenerDetalle`, responde 200
  - `reasignarRuta` — extrae `:id` y DTO, llama a `rutaService.reasignar`, responde 200
  - `obtenerRutaOptima` — extrae `:id`, llama a `rutaService.calcularOptima`, responde 200

- [x] T6. Registrar rutas en `backend/src/routes/rutas.ts` con los middlewares apropiados:
  - `POST /` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `validate(crearRutaSchema)`, `crearRuta`
  - `GET /` → `authMiddleware`, `roleMiddleware(['OPERADOR', 'REPARTIDOR'])`, `validate(listarRutasSchema)`, `listarRutas`
  - `GET /:id` → `authMiddleware`, `roleMiddleware(['OPERADOR', 'REPARTIDOR'])`, `obtenerRuta`
  - `PATCH /:id` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `validate(reasignarRutaSchema)`, `reasignarRuta`
  - `GET /:id/optima` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `obtenerRutaOptima`
  - Montar el router en `app.ts` bajo `/api/v1/rutas`.

- [x] T7. Integrar `rutaService.verificarCierreRuta` en `backend/src/services/envioService.ts`: al actualizar el estado de un envío a `ENTREGADO` o `CANCELADO`, si el envío pertenece a una ruta, llamar a `verificarCierreRuta(envio.rutaId)`.

- [x] T8. Escribir tests backend `backend/src/tests/rutas.test.ts` (Jest + Supertest) cubriendo:
  - R1 — `debe crear ruta con envíos, vehículo y repartidor válidos y devolver 201`
  - R2 — `debe rechazar creación sin envíos con 422`
  - R3 — `debe rechazar creación con vehículo no disponible con 422`
  - R4 — `debe rechazar creación con repartidor no disponible con 422`
  - R5 — `debe rechazar envío que no está en PENDIENTE con 422`
  - R6 — `debe rechazar envío ya asignado a otra ruta con 422`
  - R7 — `debe actualizar estado del vehículo a EN_RUTA al crear ruta`
  - R8 — `debe actualizar estado de los envíos a EN_RUTA al crear ruta`
  - R9 + R10 — `debe listar rutas paginadas con metadata`
  - R11 — `debe devolver solo rutas del repartidor autenticado con repartidorId=me`
  - R12 — `debe rechazar listado sin autenticación con 401`
  - R13 — `debe rechazar acceso con rol CLIENTE con 403`
  - R14 + R15 — `debe reasignar repartidor y vehículo válidos y devolver 200`
  - R16 — `debe revertir vehículo anterior a DISPONIBLE al reasignar`
  - R17 — `debe devolver 404 si el nuevo repartidor o vehículo no existe`
  - R18 — `debe rechazar reasignación en ruta COMPLETADA con 422`
  - R19 — `debe ordenar paradas por vecino más cercano`
  - R20 — `debe devolver la única parada sin reordenar si solo hay un envío`
  - R21 — `debe devolver advertencia si algún envío no tiene coordenadas`
  - R22 — `debe marcar ruta como COMPLETADA cuando todos los envíos son terminales`
  - R23 — `debe marcar vehículo como DISPONIBLE al completar la ruta`

---

## Frontend

- [x] T9. Crear service frontend `frontend/src/services/rutaService.ts` con las funciones: `listar(filters)`, `obtenerDetalle(id)`, `crear(dto)`, `reasignar(id, dto)`, `obtenerOptima(id)`. Todas usan la instancia axios configurada; devuelven `res.data.data`.

- [x] T10. Crear hooks TanStack Query en `frontend/src/hooks/`:
  - `useRutas.ts` — `useQuery(['rutas', filters], () => rutaService.listar(filters))`
  - `useRutaDetalle.ts` — `useQuery(['rutas', id], () => rutaService.obtenerDetalle(id))`
  - `useCrearRuta.ts` — `useMutation` que invalida `['rutas']` en `onSuccess`
  - `useReasignarRuta.ts` — `useMutation` que invalida `['rutas', id]` en `onSuccess`
  - `useRutaOptima.ts` — `useQuery` con `enabled: false` para activación manual

- [x] T11. Crear componente `frontend/src/features/rutas/EnvioCheckboxList.tsx`: lista los envíos en estado PENDIENTE con checkboxes; gestiona selección múltiple; muestra código de seguimiento y dirección de destino de cada envío.

- [x] T12. Crear componente `frontend/src/features/rutas/RutaForm.tsx`: integra `EnvioCheckboxList`, dropdown de vehículos (filtrado a DISPONIBLE), dropdown de repartidores (filtrado a `disponible=true`), botón "GENERAR RUTA ÓPTIMA" (llama a `useRutaOptima` y reordena la lista), botón "Guardar Ruta" (llama a `useCrearRuta`). Muestra mensajes de error inline con Toast de Shadcn/UI ante errores 422.

- [x] T13. Crear componente `frontend/src/features/rutas/RutaCard.tsx`: muestra resumen de una ruta (código, estado con badge de color, vehículo, repartidor, cantidad de envíos).

- [x] T14. Crear pantalla `frontend/src/features/rutas/GestionRutas.tsx`: página principal de gestión de rutas para el OPERADOR. Incluye lista de rutas existentes usando `useRutas`, botón para abrir formulario de nueva ruta (renderiza `RutaForm`), y navegación a detalle de cada ruta. Ruta React: `/rutas`.

- [x] T15. Crear pantalla `frontend/src/features/rutas/RutaDetalle.tsx`: muestra los datos completos de una ruta (vehículo, repartidor, paradas en orden). Permite reasignación de vehículo o repartidor usando `useReasignarRuta`. Ruta React: `/rutas/:id`.

- [x] T16. Registrar las rutas `/rutas` y `/rutas/:id` en `frontend/src/router/` dentro de `ProtectedRoute` con rol `OPERADOR`. Verificar que el sidebar ya incluye el enlace a "Rutas" (se implementa en `layout_navegacion`; si no existe aún, añadir el enlace en el componente de layout existente).

- [x] T17. Escribir tests frontend `frontend/src/features/rutas/*.test.tsx` (Vitest + Testing Library) cubriendo:
  - R24 — `debe renderizar el formulario de gestión de rutas con todos los controles`
  - R25 — `debe reordenar la lista de envíos al recibir respuesta de ruta óptima`
  - R26 — `debe mostrar errores de validación inline al intentar guardar sin campos requeridos`
  - Tests de hooks: `useCrearRuta debe invalidar cache de rutas en onSuccess`

- [x] T18. Verificación final: ejecutar `npm run test` en backend y frontend (verde), `npm run lint` sin errores en ambos workspaces, `npm run build` sin errores en frontend. Confirmar que la migración Prisma está incluida en el commit.

---

## Correcciones tras revisión (RECHAZADO → segunda vuelta)

Ver detalle completo en `progress/review_rutas_gestion.md` y
`progress/impl_rutas_gestion.md` (sección "Correcciones aplicadas tras revisión").

- [x] T19. Reemplazar los 5 tests stub (R7, R8, R16, R22, R23) en
  `backend/src/tests/rutas.test.ts` por tests reales que invocan la implementación
  real de `rutaService` (vía `jest.isolateModules` + `jest.unmock`) con
  `rutaRepository` mockeado, verificando las transiciones de estado afirmadas por
  cada requisito.

- [x] T20. Eliminar la instancia propia de `PrismaClient` y todas las llamadas
  directas `prisma.*` de `backend/src/services/rutaService.ts`. Extender
  `rutaRepository.ts` con `findEnviosByIds`, `findVehiculoById`,
  `findRepartidorById`, `findRepartidorByUsuarioId`, `crearConTransaccion`,
  `reasignarConTransaccion`, `cerrarRutaConTransaccion` para que el servicio
  orqueste exclusivamente a través del repositorio.

- [x] T21. Documentar la decisión sobre R22/R23 (código inalcanzable end-to-end):
  se opta por la opción (a) — `verificarCierreRuta` se prueba de forma aislada y
  real, y la integración end-to-end queda explícitamente pendiente de
  `entregas_confirmacion` (id 9). Constancia dejada en
  `progress/impl_rutas_gestion.md` y como comentario JSDoc en
  `rutaService.verificarCierreRuta`.

- [x] T22. Conectar `enviosDisponibles` en `GestionRutas.tsx` a datos reales vía
  `useEnvios({ estado: 'PENDIENTE' })` (endpoint ya existente de
  `envios_consultar`). Documentar — sin inventar datos de muestra — que
  `vehiculosDisponibles`/`repartidoresDisponibles` quedan pendientes del endpoint
  de `vehiculos_gestion` (id 8) en `GestionRutas.tsx` y `RutaDetalle.tsx`. Ajustar
  `rutas.test.tsx` para que pruebe la integración real de envíos y, a la vez,
  documente explícitamente (sin maquillar) la limitación de vehículos/repartidores.

- [x] T23. Evaluar consolidación del enum `EstadoRuta` (5 valores → 4). Decisión:
  no migrar (PostgreSQL no soporta `DROP VALUE` en enums; recrear el tipo es de
  alto riesgo para beneficio cosmético). Documentar la decisión y su justificación
  en `progress/impl_rutas_gestion.md`.

- [x] T24. Re-ejecutar verificación final completa (backend y frontend: test, lint,
  build) y confirmar resultado en verde antes de re-presentar la feature al
  reviewer.
