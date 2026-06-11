# progress/current.md — Sesión activa

> Este archivo describe el estado de la sesión en curso.
> Al cerrar la sesión, mover el contenido al final de `progress/history.md`
> y dejar solo esta plantilla vacía.

---

## Estado

Sprints 1-5 completados. Se agregó el Sprint 6 (`feature_list.json`) con 3
features `pending`/`sdd: true` a partir de hallazgos de QA del humano sobre
la app desplegada:

- `repartidor_rutas_mapa` (id 19): pantallas reales /repartidor/rutas y
  /repartidor/mapa (hoy PlaceholderPage) + botón "Cerrar sesión" en Perfil.tsx
  (actualmente ningún rol sin topbar puede cerrar sesión desde ahí).
- `gestion_usuarios` (id 20): pantalla /usuarios (hoy PlaceholderPage) +
  endpoints CRUD-lite de usuarios + campo `activo` en Usuario (migración nueva).
- `entregas_reactivar_fallida` (id 21): al resolver una incidencia
  ENTREGA_FALLIDA, el envío FALLIDO debe volver a EN_RUTA para que el
  repartidor pueda reintentar la entrega (hoy queda bloqueado para siempre).

## Feature en progreso

Ninguna.

## Última acción

`repartidor_rutas_mapa` (id 19) cerrada con commit `100dbba feat(repartidor_rutas_mapa)`.
Reviewer aprobó en 1 pass (24/24 requisitos con test, 181/181 tests, lint y
`./init.sh` 30/30 en verde). Estado cambiado a `done` en `feature_list.json`.

## Próximo paso

Lanzar `spec_author` para `gestion_usuarios` (id 20, sprint 6, `pending`,
`sdd: true`), siguiendo el flujo SDD de `.claude/agents/leader.md`.

## Bloqueos

Ninguno.
