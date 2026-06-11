# Tasks — entregas_reactivar_fallida

> Orden estándar: schema Prisma → validator → repository → service →
> controller → routes → tests backend → componentes frontend → service
> frontend → hook → tests frontend → verificación.
> Marcar `[x]` al completar cada task.

---

- [x] T1. Confirmar que **no se requiere migración Prisma**: verificar en
      `backend/prisma/schema.prisma` que `EstadoEnvio.EN_RUTA`,
      `EstadoEnvio.FALLIDO`, `TipoIncidencia.ENTREGA_FALLIDA`,
      `EstadoIncidencia.RESUELTA`, el modelo `EventoEnvio` y
      `TipoNotificacion.CAMBIO_ESTADO` ya existen tal como se documenta en
      `design.md` sección 2. No ejecutar `npx prisma migrate dev`.

- [x] T2. No se requieren cambios de validator: confirmar que
      `actualizarEstadoIncidenciaSchema`
      (`backend/src/validators/incidenciaValidator.ts`) sigue siendo
      `{ estado: enum EstadoIncidencia }` sin modificaciones (`design.md`
      sección 1).

- [x] T3. Extender `backend/src/repositories/incidenciaRepository.ts`
      agregando el método `resolverConReactivacionEnvio(incidenciaId: string,
      envioId: string): Promise<{ incidencia: Incidencia; envio: Envio }>`
      que ejecuta en una única `prisma.$transaction(async (tx) => {...})`:
      `tx.incidencia.update({ where: { id: incidenciaId }, data: { estado:
      'RESUELTA' } })`, `tx.envio.update({ where: { id: envioId }, data: {
      estado: 'EN_RUTA' } })` y `tx.eventoEnvio.create({ data: { envioId,
      estado: 'EN_RUTA', descripcion: 'Entrega reactivada tras resolución de
      incidencia' } })`, devolviendo `{ incidencia, envio }` (ver `design.md`
      sección 3, plantilla exacta de código). Importar `Envio` desde
      `@prisma/client` junto con los tipos ya importados (`Incidencia`,
      `Prisma`, `EstadoIncidencia`). No modificar `findById` ni
      `actualizarEstado` existentes.

- [x] T4. Extender `backend/src/services/incidenciaService.ts`,
      método `actualizarEstado(id, nuevoEstado)`:
      - Mantener sin cambios las validaciones existentes (orden: `findById` →
        `INCIDENCIA_NOT_FOUND` 404 → "mismo estado" 409 → "RESUELTA no se
        reabre" 409) — R7.
      - Después de esas validaciones, si `nuevoEstado === 'RESUELTA'` y
        `incidencia.tipo === 'ENTREGA_FALLIDA'`: cargar el envío asociado vía
        `envioRepository.findById(incidencia.envioId)` (tipo
        `EnvioConDetalle`, incluye `cliente.usuario` y
        `codigoSeguimiento`).
      - Calcular `esReactivacion = envio !== null && envio.estado ===
        'FALLIDO'` (si `envio === null`, tratar como `esReactivacion =
        false`).
      - Si `esReactivacion === true` (R1–R4): llamar a
        `incidenciaRepository.resolverConReactivacionEnvio(id,
        incidencia.envioId)`; luego llamar a `notificacionService.notificar({
        usuarioId: envio.cliente.usuarioId, envioId: incidencia.envioId,
        mensaje: <mensaje incluyendo envio.codigoSeguimiento, indicando que el
        envío fue reactivado para un nuevo intento de entrega>, tipo:
        'CAMBIO_ESTADO' })`; proyectar y devolver
        `proyectarIncidencia(incidencia_actualizada)`.
      - Si `esReactivacion === false` (incluye: `nuevoEstado !== 'RESUELTA'`,
        `incidencia.tipo !== 'ENTREGA_FALLIDA'`, o `envio.estado !==
        'FALLIDO'`) (R5, R6): comportamiento idéntico al actual —
        `incidenciaRepository.actualizarEstado(id, nuevoEstado)` y
        `proyectarIncidencia(actualizada)`. No tocar `Envio` ni
        `EventoEnvio`, no notificar.
      - Seguir el algoritmo completo descrito en `design.md` sección 3
        (incluye la nota de orden sobre cuándo se carga el envío).

- [x] T5. Confirmar que `backend/src/controllers/incidenciaController.ts`
      (`actualizarEstadoIncidencia`) **no requiere cambios** — sigue
      delegando en `incidenciaService.actualizarEstado(id, dto.estado)` y
      respondiendo `{ data: incidencia, message: 'Estado de incidencia
      actualizado', status: 200 }` (`design.md` sección 1).

- [x] T6. Confirmar que `backend/src/routes/incidencias.ts` **no requiere
      cambios** — `PATCH /:id` mantiene `authMiddleware` +
      `roleMiddleware('OPERADOR')` sin alteraciones.

- [x] T7. Escribir tests backend (Jest + Supertest) en
      `backend/src/tests/incidencias.test.ts` (extender el describe de
      `PATCH /api/v1/incidencias/:id`), cubriendo como mínimo:
      - `R1` — debe actualizar la incidencia ENTREGA_FALLIDA a RESUELTA y, en
        la misma operación, actualizar el envío asociado (en estado FALLIDO)
        a EN_RUTA.
      - `R2` — debe registrar un EventoEnvio con `estado: 'EN_RUTA'` y
        `descripcion: 'Entrega reactivada tras resolución de incidencia'` al
        reactivar el envío.
      - `R3` — debe ejecutar la actualización de la incidencia, la
        actualización del envío y la creación del EventoEnvio dentro de una
        única transacción (`prisma.$transaction`) — verificar que
        `incidenciaRepository.resolverConReactivacionEnvio` (o el mock
        equivalente del repositorio) se invoca con los IDs correctos.
      - `R4` — debe llamar a `notificacionService.notificar` con
        `tipo: 'CAMBIO_ESTADO'`, el `usuarioId` del cliente dueño del envío y
        un mensaje que mencione la reactivación para reintento de entrega.
      - `R5` — al resolver una incidencia cuyo `tipo` no es ENTREGA_FALLIDA
        (p.ej. CLIENTE_AUSENTE) con `estado=RESUELTA`, debe actualizar
        únicamente la incidencia y NO modificar el envío asociado (no se
        invoca `resolverConReactivacionEnvio`, no se crea EventoEnvio, no se
        notifica el cambio de envío).
      - `R6` — al resolver una incidencia ENTREGA_FALLIDA cuyo envío asociado
        NO está en estado FALLIDO (p.ej. EN_RUTA o ENTREGADO) con
        `estado=RESUELTA`, debe actualizar únicamente la incidencia y NO
        modificar el envío.
      - `R7` — debe seguir devolviendo 404 INCIDENCIA_NOT_FOUND con un id
        inexistente, y 409 INVALID_STATE_TRANSITION al repetir el mismo
        estado o al intentar mover una incidencia RESUELTA a otro estado,
        independientemente del `tipo` de la incidencia o del estado del envío
        asociado (regresión de R14/R15 de `incidencias_gestion`).
      - Reutilizar el patrón de fixtures/mocks existente en este archivo
        (mocks de `incidenciaRepository`, `envioRepository`,
        `notificacionService`, tokens JWT por rol).

- [x] T8. Escribir tests backend (Jest + Supertest) en
      `backend/src/tests/entregasListar.test.ts` (o el archivo equivalente
      que cubra `GET /api/v1/entregas?repartidorId=me` /
      `GET /api/v1/repartidor/entregas`), cubriendo:
      - `R8` — un envío con `estado: 'EN_RUTA'` (resultado de una
        reactivación) aparece en el grupo `pendientes` y NO aparece en
        `completadas` de la respuesta de `listarMisEntregas`. Si ya existe un
        test equivalente para `EN_RUTA` en general, añadir un caso o un
        comentario que documente explícitamente que cubre el escenario de
        envío reactivado (sin necesidad de invocar el flujo de incidencias en
        este test — basta con un envío fixture en estado `EN_RUTA`).

- [x] T9. Escribir tests backend (Jest + Supertest) en
      `backend/src/tests/entregaConfirmar.test.ts` y
      `backend/src/tests/entregaFallo.test.ts`, cubriendo:
      - `R9` — `POST /api/v1/envios/:id/confirmar` y
        `POST /api/v1/envios/:id/fallo` sobre un envío en estado `EN_RUTA`
        (resultado de una reactivación) se procesan normalmente y NO
        devuelven `409 INVALID_STATE_TRANSITION`. Si ya existe cobertura para
        envíos `EN_RUTA` en general en estos archivos, añadir un caso o
        comentario que documente explícitamente que cubre el escenario de
        envío reactivado tras resolución de incidencia.

- [x] T10. Verificación final: ejecutar `./init.sh` desde la raíz (lint +
      tests de backend y frontend + validación de `feature_list.json`/specs);
      confirmar `npm run lint`, `npm test` y `npm run build` en verde para
      `backend/` antes de marcar la feature como lista para revisión. No se
      requiere verificación de `frontend/` más allá de que la suite existente
      siga en verde (sin cambios de frontend en esta feature).
