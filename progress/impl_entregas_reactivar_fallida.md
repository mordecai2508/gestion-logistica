# Implementación — entregas_reactivar_fallida (id 21, sprint 6)

> Generado por el subagente `implementer`. Tasks ejecutadas: T1-T10
> (`specs/entregas_reactivar_fallida/tasks.md`).

---

## 1. Archivos creados

Ninguno. Esta feature extiende código existente (sin migración Prisma, sin
nuevas rutas/endpoints, sin cambios de frontend), conforme a `design.md`.

## 2. Archivos modificados

### Backend

- `backend/src/repositories/incidenciaRepository.ts` — agregado el método
  `resolverConReactivacionEnvio(incidenciaId, envioId)`: ejecuta en una única
  `prisma.$transaction` las tres operaciones `tx.incidencia.update` (→
  `RESUELTA`), `tx.envio.update` (→ `EN_RUTA`) y `tx.eventoEnvio.create`
  (`estado: 'EN_RUTA'`, `descripcion: 'Entrega reactivada tras resolución de
  incidencia'`), devolviendo `{ incidencia, envio }`. Importa `Envio` desde
  `@prisma/client`. `findById` y `actualizarEstado` no se modificaron.
- `backend/src/services/incidenciaService.ts` — extendido
  `actualizarEstado(id, nuevoEstado)`: tras las 3 validaciones existentes
  (404 `INCIDENCIA_NOT_FOUND`, 409 mismo estado, 409 no reabrir `RESUELTA`,
  sin cambios), si `nuevoEstado === 'RESUELTA'` y
  `incidencia.tipo === 'ENTREGA_FALLIDA'`, carga
  `envio = await envioRepository.findById(incidencia.envioId)` y calcula
  `esReactivacion = envio !== null && envio.estado === 'FALLIDO'`. Si es
  reactivación: llama a
  `incidenciaRepository.resolverConReactivacionEnvio(id, incidencia.envioId)`,
  notifica al cliente (`notificacionService.notificar`, `tipo:
  'CAMBIO_ESTADO'`, mensaje con `envio.codigoSeguimiento`) y devuelve
  `proyectarIncidencia(incidenciaActualizada)`. Si no, comportamiento idéntico
  al previo (`incidenciaRepository.actualizarEstado` + `proyectarIncidencia`).
  `envioRepository` y `notificacionService` ya estaban importados.

### Tests backend

- `backend/src/tests/incidencias.test.ts` — agregado helper
  `makeEnvioConDetalle` (fixture `EnvioConDetalle` con `cliente.usuario`,
  `estado` configurable), extendido `loadServiceWithMockedRepos` para exponer
  también `notifService` (mock de `notificacionService`), y nuevo describe
  `incidenciaService.actualizarEstado — reactivación de envío al resolver
  ENTREGA_FALLIDA` con 7 tests nuevos cubriendo R1-R7.
- `backend/src/tests/entregasListar.test.ts` — 1 test nuevo (R8) confirmando
  que un envío `EN_RUTA` (resultado de reactivación) cae en `pendientes` y no
  en `completadas`.
- `backend/src/tests/entregaConfirmar.test.ts` — 1 test nuevo (R9,
  controlador) + comentario en el test de servicio existente (R8) que ya usa
  fixture `estado: 'EN_RUTA'`.
- `backend/src/tests/entregaFallo.test.ts` — 1 test nuevo (R9, controlador) +
  comentario en `makeEnvioConRutaYCliente` (ya `estado: 'EN_RUTA'`, usado por
  R15/R16).

---

## 3. Trazabilidad R1-R9 → Test → Archivo:línea

| Requisito | Test | Archivo:línea |
|---|---|---|
| R1 | "R1/R2/R3 - debe reactivar el envío FALLIDO a EN_RUTA y registrar el EventoEnvio de reactivación dentro de una única transacción" | `backend/src/tests/incidencias.test.ts:703` |
| R2 | mismo test (verifica delegación en `resolverConReactivacionEnvio`, que registra el `EventoEnvio` de reactivación — verificado a nivel de plantilla del repositorio) | `backend/src/tests/incidencias.test.ts:703` |
| R3 | mismo test (`incidenciaRepo.resolverConReactivacionEnvio` se invoca con los IDs correctos; `incidenciaRepo.actualizarEstado` NO se invoca en el camino de reactivación) | `backend/src/tests/incidencias.test.ts:703` |
| R4 | "R4 - debe notificar al cliente dueño del envío con tipo CAMBIO_ESTADO mencionando el código de seguimiento y la reactivación" | `backend/src/tests/incidencias.test.ts:748` |
| R5 | "R5 - al resolver una incidencia cuyo tipo no es ENTREGA_FALLIDA, debe actualizar solo la incidencia y NO modificar el envío ni notificar" | `backend/src/tests/incidencias.test.ts:785` |
| R6 | "R6 - al resolver una incidencia ENTREGA_FALLIDA cuyo envío asociado NO está en estado FALLIDO..." (envío `EN_RUTA`) y "...ya está ENTREGADO..." | `backend/src/tests/incidencias.test.ts:807,830` |
| R7 | describe "R7 - regresión: validaciones existentes (404/409) se preservan independientemente del tipo de incidencia o estado del envío" — 3 tests (404 NOT_FOUND, 409 mismo estado, 409 reabrir RESUELTA) | `backend/src/tests/incidencias.test.ts:852-893` |
| R8 | "R8 (entregas_reactivar_fallida) - un envío reactivado de FALLIDO a EN_RUTA aparece en 'pendientes' y no en 'completadas'" | `backend/src/tests/entregasListar.test.ts:102` |
| R9 | "R9 (entregas_reactivar_fallida) - debe procesar normalmente la confirmación de un envío EN_RUTA..." / "...el registro de fallo de un envío EN_RUTA..." (+ cobertura implícita ya existente vía fixtures `EN_RUTA` en R8/R15/R16) | `backend/src/tests/entregaConfirmar.test.ts:187`, `backend/src/tests/entregaFallo.test.ts:166` |

---

## 4. Resultados de verificación

### Backend
- `npx tsc --noEmit`: sin errores.
- `npm test`: **22/22 suites passing, 339/339 tests passing** (11 tests
  nuevos respecto a la base de 328 de `gestion_usuarios`).
- `npm run lint`: sin errores.
- `npm run build` (`tsc`): sin errores.

### Frontend
- `npm test -- --run`: **33/33 archivos de test passing, 194/194 tests
  passing**. Sin cambios de frontend en esta feature; no se ejecutó `vite
  build` (no requerido por las instrucciones de esta feature, 100% backend).
- El error preexistente TS2322 en
  `frontend/src/features/cliente/__tests__/MisEnvios.test.tsx` (líneas 105,
  120, introducido en `daa067b`, documentado en
  `progress/impl_gestion_repartidores.md` y `progress/impl_gestion_usuarios.md`)
  es preexistente, no bloqueante, y no afectado por esta feature (no se tocó
  ningún archivo de frontend).

---

## 5. Estado de tasks

T1-T10 marcadas `[x]` en `specs/entregas_reactivar_fallida/tasks.md`.
