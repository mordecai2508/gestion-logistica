# progress/current.md — Sesión activa

> Este archivo describe el estado de la sesión en curso.
> Al cerrar la sesión, mover el contenido al final de `progress/history.md`
> y dejar solo esta plantilla vacía.

---

## Estado

Sesión activa — 2026-06-06 — implementación en curso

## Feature en progreso

`vehiculos_gestion` (id: 8, sprint 3) — fase: `in_progress`

## Última acción

`reviewer` evaluó la implementación (T1–T17) y **RECHAZÓ** la feature.
Informe: `progress/review_vehiculos_gestion.md`. Hallazgo bloqueante:
- `backend/src/tests/vehiculos.test.ts` mockea `vehiculoService` por completo
  (`jest.mock('../services/vehiculoService')`) — la lógica real del servicio
  nunca se ejecuta; los 15 tests solo verifican que el controller reenvía lo
  que el mock decide devolver. El reviewer lo demostró mediante mutación
  deliberada: invirtió la condición central de **R14** en
  `vehiculoService.actualizarEstado` (`=== 'EN_RUTA'` → `!== 'EN_RUTA'`,
  rompiendo por completo la regla de bloqueo de transición de estado) y
  las 15 pruebas siguieron pasando en verde. Restauró el archivo y confirmó
  sin residuos vía `git diff --stat`.
- Esto deja sin cobertura real R1, R2, R6, R7, R11, R13 y sobre todo **R14**
  (la única regla de negocio no trivial de la feature).
- El propio repo ya tiene el patrón correcto disponible como precedente
  aprobado: `rutas.test.ts` (líneas 336-368) carga el servicio REAL vía
  `jest.isolateModules` + `jest.unmock(...)` mockeando solo el repositorio —
  `vehiculos_gestion` no lo replicó pese a tenerlo a mano.
- (No bloqueante) observación menor: tipo `createdAt`/`updatedAt: Date` vs.
  `string (ISO 8601)` documentado en `design.md`.
- Lo demás verificado correcto por el reviewer: arquitectura limpia (cero
  Prisma fuera de `vehiculoRepository.ts`), seguridad/convenciones (auth +
  rol OPERADOR, Zod, formato de respuesta), frontend real y conectado
  (sin placeholders), contrato `GET /api/v1/vehiculos?estado=DISPONIBLE`
  implementado tal como `rutas_gestion` lo espera, y lint/build/tests
  ejecutados de forma independiente (133/133 backend, 66/66 frontend, init.sh 30/30).

## Próximo paso

`implementer` (ronda 2) aplicó la corrección y extendió
`progress/impl_vehiculos_gestion.md` con la sección "Correcciones aplicadas
tras revisión":
- Único archivo tocado: `backend/src/tests/vehiculos.test.ts` — agregó 11 tests
  reales (15→26) en `describe('vehiculoService — lógica de negocio (unit, real
  implementación + repo mockeado)')`, replicando el patrón aprobado de
  `rutas.test.ts` (`jest.isolateModules` + `jest.unmock`, repo mockeado,
  servicio real). Cubre R1, R2, R6, R7, R11, R13 y R14 (5 casos vía `it.each`).
- Verificación por mutación de R14 (réplica de la prueba del reviewer): 5/26
  tests fallan al invertir la condición — confirma cobertura real. Mutación
  revertida, `git diff` sin residuos.
- Observación de tipos `Date` vs `string`: decidió NO cambiarlo (consistente
  con precedente aprobado `rutaTypes.ts`); documentado en el informe.
- Tests: backend 133→144/144 (+11, 0 regresiones) | frontend 66/66 sin cambios.
  Lint ✅ | Build ✅.

`reviewer` (ronda 2) verificó la corrección de forma independiente y emitió
veredicto **APROBADO**. Informe: `progress/review_vehiculos_gestion.md`
(reescrito, conserva resumen histórico de la ronda 1). Verificación clave:
- Repitió la mutación de R14 desde cero (invirtió la condición en
  `vehiculoService.actualizarEstado` línea 56) → exactamente 5/26 tests
  fallan (los mismos que reportó el implementer); revirtió y comparó
  byte-a-byte contra respaldo — cero residuos.
- Confirmó que `loadServiceWithMockedRepo()` (líneas 276-289 de
  `vehiculos.test.ts`) usa `jest.isolateModules` + `jest.unmock` + `require`,
  replicando el patrón aprobado de `rutas.test.ts`, con solo el repositorio
  mockeado y asserts significativos para R1, R2, R6, R7, R11, R13, R14×5.
- Reconfirmó de forma independiente: backend 144/144, frontend 66/66,
  lint/build limpios, `./init.sh` 30/30. Sin regresiones respecto a ronda 1.

## Próximo paso

Proceder con el commit de la feature aprobada (`feat(vehiculos_gestion): Gestión
de vehículos`) y marcarla como `done` en `feature_list.json`, siguiendo el
flujo de `AGENTS.md`/`leader.md` (mismo criterio aplicado para `rutas_gestion`).
Después: lanzar `spec_author` para la siguiente feature pendiente del sprint
(`entregas_confirmacion`, id 9, sprint 4).

## Bloqueos

_Ninguno._
