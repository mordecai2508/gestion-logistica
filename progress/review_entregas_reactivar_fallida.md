# Review — entregas_reactivar_fallida — APROBADO

## Trazabilidad

| R<n> | Test | Estado |
|---|---|---|
| R1 | `incidencias.test.ts:703` "R1/R2/R3 - debe reactivar el envío FALLIDO a EN_RUTA y registrar el EventoEnvio de reactivación dentro de una única transacción" — verifica que `incidenciaRepo.resolverConReactivacionEnvio('incidencia-1', 'envio-1')` se invoca y que `incidenciaRepo.actualizarEstado` NO se invoca en el camino de reactivación. | ✅ |
| R2 | mismo test (`incidencias.test.ts:703`) — confirma delegación en `resolverConReactivacionEnvio`, cuyo cuerpo (`incidenciaRepository.ts:51-73`) crea el `EventoEnvio` con `estado: 'EN_RUTA'` y la descripción exacta "Entrega reactivada tras resolución de incidencia". | ✅ |
| R3 | mismo test — una sola llamada a `resolverConReactivacionEnvio`, que internamente ejecuta `prisma.$transaction` con las 3 operaciones (`tx.incidencia.update`, `tx.envio.update`, `tx.eventoEnvio.create`). Atomicidad verificada a nivel de implementación del repositorio (patrón idéntico a `entregaRepository.confirmarEntrega`/`registrarFallo`). | ✅ |
| R4 | `incidencias.test.ts:748` "R4 - debe notificar al cliente dueño del envío con tipo CAMBIO_ESTADO mencionando el código de seguimiento y la reactivación" — verifica `usuarioId: 'user-cliente-1'`, `tipo: 'CAMBIO_ESTADO'`, mensaje contiene `TRK-20260604-A3F9B21C` y la palabra "reactiv". | ✅ |
| R5 | `incidencias.test.ts:785` "R5 - al resolver una incidencia cuyo tipo no es ENTREGA_FALLIDA..." — `incidenciaRepo.resolverConReactivacionEnvio`, `envioRepo.findById` y `notifService.notificar` NO se invocan; solo `actualizarEstado`. | ✅ |
| R6 | `incidencias.test.ts:807` (envío `EN_RUTA`) y `incidencias.test.ts:830` (envío `ENTREGADO`) — incidencia `ENTREGA_FALLIDA` con envío no-FALLIDO: solo `actualizarEstado`, sin reactivación ni notificación. | ✅ |
| R7 | `incidencias.test.ts:852-893` describe "R7 - regresión: validaciones existentes (404/409) se preservan..." — 3 tests: 404 `INCIDENCIA_NOT_FOUND`, 409 mismo estado, 409 reabrir `RESUELTA`, todos con incidencia `ENTREGA_FALLIDA`/envío `FALLIDO` para probar que la nueva rama no se salta las validaciones previas. | ✅ |
| R8 | `entregasListar.test.ts:102` "R8 (entregas_reactivar_fallida) - un envío reactivado de FALLIDO a EN_RUTA aparece en 'pendientes' y no en 'completadas'" — fixture `estado: 'EN_RUTA'`, confirma agrupación correcta vía `GET /api/v1/entregas?repartidorId=me`. | ✅ |
| R9 | `entregaConfirmar.test.ts:187` y `entregaFallo.test.ts:166` "R9 (entregas_reactivar_fallida) - debe procesar normalmente..." sobre envío `EN_RUTA`, status 200 y `!== 409`. Cobertura adicional implícita vía fixtures `EN_RUTA` ya usados en R8/R15/R16 de esos archivos. | ✅ |

**9/9 requisitos con test real (no stubs), cada uno probando el comportamiento descrito, no solo la existencia de la función.**

## Tasks (T1-T10)

Todas marcadas `[x]` en `specs/entregas_reactivar_fallida/tasks.md` y el trabajo coincide con lo implementado:

- T1 — Confirmado: no hay migración Prisma nueva (`git diff --stat HEAD -- backend/prisma/schema.prisma` vacío). Todos los enums/modelos requeridos (`EstadoEnvio.EN_RUTA/FALLIDO`, `TipoIncidencia.ENTREGA_FALLIDA`, `EstadoIncidencia.RESUELTA`, `EventoEnvio`, `TipoNotificacion.CAMBIO_ESTADO`) ya existían en `schema.prisma`.
- T2 — `actualizarEstadoIncidenciaSchema` no aparece en el diff; sigue siendo `{ estado: enum EstadoIncidencia }`.
- T3 — `incidenciaRepository.resolverConReactivacionEnvio` agregado exactamente como especifica `design.md` (líneas 51-73 de `incidenciaRepository.ts`), import de `Envio` añadido junto a los tipos existentes. `findById` (líneas 19-21) y `actualizarEstado` (líneas 41-43) **sin modificar** — confirmado por diff (solo se añade el import y el método nuevo al final del objeto).
- T4 — `incidenciaService.actualizarEstado` extendido (líneas 117-134 de `incidenciaService.ts`): las 3 validaciones existentes (404/409/409) preceden sin cambios al nuevo bloque; bifurcación `esReactivacion` evaluada exactamente como en `design.md` sección 3; camino 5b cae al código preexistente sin alteración.
- T5 — `backend/src/controllers/incidenciaController.ts` sin diff (verificado con `git diff --stat`).
- T6 — `backend/src/routes/incidencias.ts` sin diff (verificado con `git diff --stat`).
- T7 — `incidencias.test.ts` extendido con el describe "incidenciaService.actualizarEstado — reactivación de envío al resolver ENTREGA_FALLIDA" (líneas 702-894), cubre R1-R7 con fixtures `makeEnvioConDetalle`/`makeIncidenciaRecord` y mock de `notificacionService` expuesto vía `loadServiceWithMockedRepos`.
- T8 — `entregasListar.test.ts` extendido con el test R8 (línea 102).
- T9 — `entregaConfirmar.test.ts` (línea 187) y `entregaFallo.test.ts` (línea 166) extendidos con tests R9 a nivel de controlador, más comentarios de cobertura implícita en fixtures `EN_RUTA` existentes.
- T10 — Verificación final ejecutada por el reviewer (ver abajo): `tsc --noEmit`, `lint`, `test`, `build` en verde.

## Arquitectura

- **Repositorio sin lógica de negocio**: `resolverConReactivacionEnvio` (`incidenciaRepository.ts:51-73`) contiene exclusivamente las 3 operaciones Prisma dentro de `prisma.$transaction(async (tx) => {...})` — `tx.incidencia.update`, `tx.envio.update`, `tx.eventoEnvio.create` — sin condicionales ni validaciones. ✅
- **Servicio concentra la decisión**: la condición `esReactivacion` y toda la bifurcación viven en `incidenciaService.actualizarEstado`; el controlador no cambia. ✅
- Sin `console.log` de debug ni `any` explícito introducidos (verificado con `git diff` + grep sobre los archivos de producción modificados). ✅
- Notificación fuera de la transacción, mismo patrón best-effort que `entregaService.confirmarEntrega`/`registrarFallo`. ✅

## Decisión técnica: tipo de notificación

- `tipo: 'CAMBIO_ESTADO'` (valor existente del enum `TipoNotificacion`, no se inventó ningún valor nuevo). ✅
- Mensaje incluye el código de seguimiento del envío: `` `Tu envío ${envio.codigoSeguimiento} fue reactivado para un nuevo intento de entrega` `` (`incidenciaService.ts:128`), verificado por el test R4 (`expect.stringContaining('TRK-20260604-A3F9B21C')` y `mensaje.toLowerCase()` contiene "reactiv"). ✅
- `CAMBIO_ESTADO` no está en `EMAIL_TIPOS` (`notificacionService.ts:12`), por lo que no se dispara un correo de "entrega realizada" falso — consistente con `design.md` sección 5. ✅

## Seguridad y convenios

- Sin cambios de autenticación/roles: `PATCH /api/v1/incidencias/:id` mantiene `authMiddleware` + `roleMiddleware('OPERADOR')` (sin diff en `routes/incidencias.ts`). ✅
- Sin nuevos campos de entrada ni nuevos códigos de error. ✅
- Rutas y formato de respuesta sin cambios respecto a `incidencias_gestion`. ✅

## Verificación final (ejecutada por el reviewer desde `backend/`)

| Comando | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ Sin errores |
| `npm run lint` | ✅ Sin errores ni warnings |
| `npm test` | ✅ 22/22 suites, 339/339 tests passing |
| `npm run build` | ✅ Sin errores |

### Frontend

`git status`/`git diff --stat HEAD` confirman que **ningún archivo de `frontend/` fue modificado** por esta feature (los únicos archivos modificados son: `backend/src/repositories/incidenciaRepository.ts`, `backend/src/services/incidenciaService.ts`, `backend/src/tests/{incidencias,entregasListar,entregaConfirmar,entregaFallo}.test.ts`, `feature_list.json`, `progress/current.md`; más los nuevos `specs/entregas_reactivar_fallida/*` y `progress/impl_entregas_reactivar_fallida.md`). No fue necesario re-ejecutar la suite de frontend. El error preexistente TS2322 en `frontend/src/features/cliente/__tests__/MisEnvios.test.tsx` (líneas 105, 120) es conocido, preexistente, documentado en `progress/impl_gestion_repartidores.md` y `progress/impl_gestion_usuarios.md`, y no bloquea esta feature.

## Hallazgos

Ninguno. La implementación es mínima, aditiva, preserva el orden de validaciones existentes (R7), no introduce migraciones ni cambios de contrato de API, y la transacción cumple la regla de "sin lógica de negocio en el repositorio".

---

**Decisión: APROBADO. El leader debe hacer el commit y luego marcar la feature como done.**
