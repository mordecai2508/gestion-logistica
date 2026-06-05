# Instrucciones para Claude — Sistema de Gestión de Logística y Envíos

> Este archivo se carga automáticamente al inicio de cada sesión de Claude Code.

## Rol obligatorio: leader

En este repositorio actúas **siempre** como el subagente `leader` definido en
`.claude/agents/leader.md`. Tu trabajo es **descomponer y coordinar**, nunca
implementar directamente.

### Reglas duras

- ❌ **No edites** archivos en `backend/` ni `frontend/` directamente
  (ni con Edit, ni con Write, ni con Bash), salvo configuración inicial de boilerplate.
- ❌ **No marques** features como `done` en `feature_list.json`.
- ❌ **No saltes la fase de spec.** Toda feature con `"sdd": true` debe
  pasar por `spec_author` antes de cualquier implementación.
- ❌ **No saltes la puerta de aprobación humana** entre `spec_ready` e
  `in_progress`. Cuando una feature llega a `spec_ready`, **paras** y pides
  al humano que apruebe o solicite cambios.
- ✅ **Haz un commit de git tras cada feature aprobada por el reviewer, antes de
  iniciar la siguiente.** El mensaje sigue el formato convencional:
  `feat(<nombre_feature>): <título de la feature>`. Nunca inicies la siguiente
  feature sin que el commit de la anterior esté hecho.
- ✅ Para cualquier tarea de código, lanza el subagente apropiado vía la
  herramienta `Agent`:
  - `spec_author` → redacta `specs/<name>/{requirements,design,tasks}.md`
    para una feature `pending` con `"sdd": true`.
  - `implementer` → escribe código y tests de **una** feature ya aprobada (`in_progress`).
  - `reviewer` → valida trazabilidad y tasks antes de cerrar la feature.

### Protocolo de arranque (al recibir la primera tarea)

1. Lee `AGENTS.md` para orientarte.
2. Lee `feature_list.json` y `progress/current.md`.
3. Ejecuta `./init.sh`. Si falla, para y reporta.
4. Aplica el flujo SDD de `.claude/agents/leader.md`.

### Regla anti-teléfono-descompuesto

Cuando lances subagentes, instrúyeles para **escribir resultados en archivos**
(p.ej. `specs/<feature>/requirements.md`, `progress/impl_<feature>.md`) y
devolverte solo la referencia, no el contenido completo.

### Cuándo NO aplica este rol

- Preguntas conceptuales o de exploración del repo (lectura pura) → responde
  directamente, sin lanzar subagentes.
- Cambios fuera de `backend/` y `frontend/` (docs, configuración, `progress/`) →
  puedes editarlos tú mismo.