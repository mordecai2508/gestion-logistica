# Tasks — incidencias_gestion

> Orden estándar: schema Prisma → validator → repository → service →
> controller → routes → tests backend → componentes frontend → service
> frontend → hook → tests frontend → verificación.
> Marcar `[x]` al completar cada task.

---

- [x] T1. Confirmar que **no se requiere migración Prisma**: verificar en
      `backend/prisma/schema.prisma` que el modelo `Incidencia`, los enums
      `TipoIncidencia`/`EstadoIncidencia` y el campo `Envio.fechaReprogramacion`
      ya existen tal como se documenta en `design.md` sección 2. No ejecutar
      `npx prisma migrate dev` si no hay cambios al schema.

- [x] T2. Crear `backend/src/types/incidenciaTypes.ts` con las interfaces
      `IncidenciaDto`, `IncidenciaListItemDto`, `CrearIncidenciaDto`,
      `ActualizarEstadoIncidenciaDto`, `PaginatedIncidenciasResponse` (ver
      `design.md` sección 1). Reutilizar/importar `PaginationMeta` desde
      `envioTypes.ts` si es posible, sin duplicar la interfaz.

- [x] T3. Extender `backend/src/types/envioTypes.ts` agregando
      `ReprogramarEnvioDto` y `ReprogramarEnvioResponseDto` (ver `design.md`
      sección 1).

- [x] T4. Crear `backend/src/validators/incidenciaValidator.ts` con
      `crearIncidenciaSchema` (`{ envioId: z.string().cuid(), tipo: enum
      TipoIncidencia, descripcion: z.string().min(1) }`),
      `listarIncidenciasSchema` (query `{ tipo?, estado?, page?, limit? }`,
      mismo patrón de transform/pipe que `listarEnviosSchema` en
      `envioValidator.ts`) y `actualizarEstadoIncidenciaSchema`
      (`{ estado: enum EstadoIncidencia }`). Exportar los tipos inferidos
      (`CrearIncidenciaInput`, `ListarIncidenciasInput`,
      `ActualizarEstadoIncidenciaInput`).

- [x] T5. Extender `backend/src/validators/envioValidator.ts` agregando
      `reprogramarEnvioSchema` (`{ fechaReprogramacion: z.coerce.date()
      }.refine(fecha > new Date(), 'fechaReprogramacion debe ser una fecha
      futura')`) y exportar `ReprogramarEnvioInput`.

- [x] T6. Crear `backend/src/repositories/incidenciaRepository.ts` con
      `crear(data)`, `findById(id)`, `findMany(where, skip, limit)` (con
      `include: { envio: { select: { codigoSeguimiento: true } } }` y
      `orderBy: { createdAt: 'desc' }`), `count(where)` y
      `actualizarEstado(id, estado)`. Solo acceso a Prisma — cero lógica de
      negocio ni validaciones (regla crítica de `docs/architecture.md`).

- [x] T7. Extender `backend/src/repositories/envioRepository.ts` agregando
      `reprogramar(id, { fechaReprogramacion, descripcionEvento })`, que
      ejecuta en una sola `prisma.$transaction`: actualizar
      `Envio.fechaReprogramacion` y crear el `EventoEnvio` correspondiente
      (mismo patrón transaccional que `entregaRepository.confirmarEntrega`/
      `registrarFallo`).

- [x] T8. Crear `backend/src/services/incidenciaService.ts` con `crear(dto)`
      (verifica existencia del envío vía `envioRepository.findById`, lanza
      `ENVIO_NOT_FOUND` 404 si no existe — R2), `listar(query)` (construye
      `where` combinando filtros `tipo`/`estado`, pagina y proyecta a
      `IncidenciaListItemDto` — R6–R9) y `actualizarEstado(id, nuevoEstado)`
      (verifica existencia, valida la transición según las reglas de
      `design.md` sección 3 — mismo estado o `RESUELTA → otro` ⇒
      `INVALID_STATE_TRANSITION` 409 — R14, R15).

- [x] T9. Extender `backend/src/services/envioService.ts` agregando
      `reprogramar(id, dto)`: verifica existencia del envío (`ENVIO_NOT_FOUND`
      404 — R20), valida que `estado` no sea `ENTREGADO`/`CANCELADO`
      (`INVALID_STATE_TRANSITION` 409 — R22), arma la descripción del evento
      (`'Entrega reprogramada para <fecha ISO>'`) y delega en
      `envioRepository.reprogramar`. Proyecta y devuelve
      `ReprogramarEnvioResponseDto`.

- [x] T10. Crear `backend/src/controllers/incidenciaController.ts` con
      `crearIncidencia`, `listarIncidencias`, `actualizarEstadoIncidencia` —
      solo extraen/validan params con los schemas Zod de T4, llaman al
      servicio y responden con el formato `{ data, message, status }` /
      `{ error, message, statusCode }` (ver `docs/conventions.md`).

- [x] T11. Extender `backend/src/controllers/envioController.ts` agregando
      `reprogramarEnvio` — valida con `reprogramarEnvioSchema`, llama a
      `envioService.reprogramar` y responde `200` con `{ data, message:
      "Entrega reprogramada", status: 200 }`.

- [x] T12. Crear `backend/src/routes/incidencias.ts`: `Router` con
      `POST /` (`authMiddleware`, `roleMiddleware('REPARTIDOR')`,
      `crearIncidencia`), `GET /` (`authMiddleware`,
      `roleMiddleware('OPERADOR')`, `listarIncidencias`) y `PATCH /:id`
      (`authMiddleware`, `roleMiddleware('OPERADOR')`,
      `actualizarEstadoIncidencia`). Registrar el router en
      `backend/src/index.ts` como `app.use('/api/v1/incidencias',
      incidenciasRouter)`.

- [x] T13. Extender `backend/src/routes/envios.ts` agregando
      `POST /:id/reprogramar` (`authMiddleware`, `roleMiddleware('OPERADOR')`,
      `reprogramarEnvio`).

- [x] T14. Escribir tests backend (Jest + Supertest) en
      `backend/src/tests/incidencias.test.ts` cubriendo, como mínimo:
      - `R1` — debe crear la incidencia vinculada al envío con estado `ABIERTA` y devolver 201.
      - `R2` — debe devolver 404 `ENVIO_NOT_FOUND` al crear una incidencia sobre un envío inexistente.
      - `R3` — debe devolver 422 con `descripcion` vacía / `tipo` inválido / `envioId` faltante.
      - `R4` — debe devolver 403 si el usuario autenticado no es REPARTIDOR.
      - `R5` — debe devolver 401 sin token de autenticación.
      - `R6` — debe listar incidencias paginadas ordenadas por más reciente, incluyendo código del envío.
      - `R7` — debe filtrar por `?tipo`.
      - `R8` — debe filtrar por `?estado`.
      - `R9` — debe combinar `?tipo&estado`.
      - `R10` — debe devolver 422 con `tipo`/`estado`/paginación inválidos.
      - `R11` — debe devolver 403 si el usuario autenticado no es OPERADOR (listar).
      - `R12` — debe devolver 401 sin token (listar).
      - `R13` — debe actualizar el estado de la incidencia y devolverla actualizada.
      - `R14` — debe devolver 404 `INCIDENCIA_NOT_FOUND` con un id inexistente.
      - `R15` — debe devolver 409 al repetir el mismo estado y al intentar mover una incidencia `RESUELTA` a otro estado.
      - `R16` — debe devolver 422 con `estado` ausente o fuera del enum.
      - `R17` — debe devolver 403 si el usuario autenticado no es OPERADOR (cambiar estado).
      - `R18` — debe devolver 401 sin token (cambiar estado).

- [x] T15. Escribir tests backend (Jest + Supertest) en
      `backend/src/tests/envioReprogramar.test.ts` cubriendo, como mínimo:
      - `R19` — debe registrar la nueva fecha de reprogramación, crear el `EventoEnvio` correspondiente y devolver el envío actualizado.
      - `R20` — debe devolver 404 `ENVIO_NOT_FOUND` con un id de envío inexistente.
      - `R21` — debe devolver 422 con `fechaReprogramacion` ausente, no parseable o no futura.
      - `R22` — debe devolver 409 `INVALID_STATE_TRANSITION` al reprogramar un envío `ENTREGADO` o `CANCELADO`.
      - `R23` — debe devolver 403 si el usuario autenticado no es OPERADOR.
      - `R24` — debe devolver 401 sin token de autenticación.

- [x] T16. Crear `frontend/src/types/incidenciaTypes.ts` replicando
      `IncidenciaDto`, `IncidenciaListItemDto`, `CrearIncidenciaDto`,
      `PaginatedIncidenciasResponse` y los enums `TipoIncidencia`/
      `EstadoIncidencia` como uniones de literales (sin importar
      `@prisma/client`, siguiendo el patrón de `entregaTypes.ts` del
      frontend). Extender `frontend/src/types/envioTypes.ts` con
      `ReprogramarEnvioDto`/`ReprogramarEnvioResponseDto`.

- [x] T17. Crear `frontend/src/services/incidenciaService.ts` con
      `listar(filters)`, `crear(dto)` y `actualizarEstado(id, estado)`
      (llamadas HTTP vía la instancia `api` configurada — nunca `fetch`
      directo en componentes). Extender `frontend/src/services/envioService.ts`
      con `reprogramar(envioId, fechaReprogramacion)`.

- [x] T18. Crear `frontend/src/hooks/useIncidencias.ts`,
      `useCrearIncidencia.ts` y `useActualizarEstadoIncidencia.ts`
      (TanStack Query — `useQuery`/`useMutation` con invalidación de
      `['incidencias']`, ver `design.md` sección 4). Crear
      `frontend/src/hooks/useReprogramarEnvio.ts` (`useMutation` con
      invalidación de `['envios', 'detalle', envioId]`).

- [x] T19. Crear `frontend/src/features/incidencias/GestionIncidencias.tsx`
      según el wireframe: título "Incidencias", botón "+ Nueva Incidencia",
      filtros por `tipo`/`estado`, tabla (Código | Tipo | Descripción | Estado
      | Acciones: ver/editar) con `useIncidencias`, paginación inferior y
      modal de cambio de estado (`useActualizarEstadoIncidencia`). Resolver
      el comportamiento del botón "+ Nueva Incidencia" para rol OPERADOR
      conforme a la nota de alcance de `design.md` sección 4 (no construir un
      flujo de creación que el backend rechazaría con 403).

- [x] T20. Crear el componente de reporte de incidencia
      (`ReportarIncidencia`, en `features/repartidor/` o
      `components/shared/` según se determine al implementar) con `Select`
      de `tipo` y `Textarea` de `descripcion`, usando `useCrearIncidencia`
      (rol REPARTIDOR). Crear `ReprogramarEntregaModal` en
      `features/envios/` (o `components/shared/`) con selector de fecha y
      validación de fecha futura, usando `useReprogramarEnvio` (rol OPERADOR),
      accesible desde el detalle de envío.

- [x] T21. Registrar la ruta `/incidencias` en `frontend/src/router/` con
      `<ProtectedRoute roles={['OPERADOR']}>` envolviendo
      `<GestionIncidencias />` (confirmar que coincide con la tabla de rutas
      de `docs/architecture.md`).

- [x] T22. Escribir tests frontend (Vitest + Testing Library):
      - `frontend/src/features/incidencias/__tests__/GestionIncidencias.test.tsx`:
        `R25` — debe mostrar la tabla con columnas código/tipo/descripción/estado;
        `R26` — debe filtrar la lista al cambiar tipo/estado;
        `R27` — debe mostrar controles de paginación cuando hay más de una página;
        `R28` — debe permitir cambiar el estado de una incidencia desde la acción "editar".
      - Test del componente de reporte de incidencia: debe enviar
        `{ envioId, tipo, descripcion }` y mostrar confirmación en éxito
        (cubre el flujo de R1 desde el frontend).
      - Test del modal de reprogramación: debe validar fecha futura en
        cliente y enviar `{ envioId, fechaReprogramacion }` (cubre R19/R21
        desde el frontend).

- [x] T23. Verificación final: ejecutar `./init.sh` desde la raíz (lint +
      tests de backend y frontend + validación de `feature_list.json`/specs);
      confirmar `npm run lint`, `npm test` y `npm run build` en verde para
      `backend/` y `frontend/` antes de marcar la feature como lista para
      revisión.
