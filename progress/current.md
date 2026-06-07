# progress/current.md — Sesión activa

> Este archivo describe el estado de la sesión en curso.
> Al cerrar la sesión, mover el contenido al final de `progress/history.md`
> y dejar solo esta plantilla vacía.

---

## Estado

Sesión activa — 2026-06-05 — implementación en curso

## Feature en progreso

`rutas_gestion` (id: 7, sprint 3) — fase: `in_progress`

## Última acción

`reviewer` evaluó la implementación (T1–T18) y **RECHAZÓ** la feature.
Informe: `progress/review_rutas_gestion.md`. Hallazgos bloqueantes:
- 5 tests stub (`R7, R8, R16, R22, R23` — `expect(true).toBe(true)` / `toBeDefined()`).
- Violación de arquitectura confirmada: `rutaService.ts` instancia su propio
  `PrismaClient` y accede a Prisma directo en vez de pasar por `rutaRepository`.
- R22/R23 (cierre automático de ruta) son código inalcanzable: `verificarCierreRuta`
  solo se invoca desde `envioService.cancelar`, que exige estado `PENDIENTE`, pero
  un envío asignado a ruta nunca está en `PENDIENTE`.
- `GestionRutas.tsx`/`RutaDetalle.tsx` usan arreglos vacíos hardcodeados
  (`vehiculosDisponibles = []`, etc.) — pantalla funcionalmente inerte en producción.
- (No bloqueante) enum `EstadoRuta` queda con 5 valores en vez de 4 (`EN_CURSO` vs `EN_PROGRESO` redundantes).

## Próximo paso

`implementer` relanzado con la lista de correcciones de `progress/review_rutas_gestion.md`
(secciones A–E). Tras corregir, vuelve a pasar por `reviewer` antes del commit.

## Bloqueos

_Ninguno._
