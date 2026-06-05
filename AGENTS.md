# AGENTS.md — Mapa de navegación para agentes de IA

> Este archivo es el **punto de entrada** para cualquier agente que trabaje en
> este repositorio. NO es una biblia de reglas: es un **mapa**. Lee solo lo que
> necesites cuando lo necesites (divulgación progresiva).

---

## 1. Antes de empezar (obligatorio)

1. Ejecuta `./init.sh` y verifica que termina sin errores. Si falla, **para** y
   resuelve el entorno antes de tocar código.
2. Lee `progress/current.md` para entender en qué estado quedó la última sesión.
3. Lee `feature_list.json`. Toda feature con `"sdd": true` pasa por
   **Spec Driven Development** — ver `docs/specs.md` y §4 de este archivo.
4. Lee `docs/specs.md` antes de tocar cualquier spec o feature `sdd: true`.

---

## 2. Mapa del repositorio

| Archivo / carpeta | Qué contiene | Cuándo leerlo |
|---|---|---|
| `feature_list.json` | Lista de features con estado (`pending` / `spec_ready` / `in_progress` / `done` / `blocked`) | Siempre, al empezar |
| `progress/current.md` | Estado de la sesión actual | Siempre, al empezar |
| `progress/history.md` | Bitácora append-only de sesiones anteriores | Si necesitas contexto histórico |
| `specs/<feature>/` | `requirements.md` + `design.md` + `tasks.md` (Kiro-style) | Antes de implementar cualquier feature `sdd: true` |
| `docs/architecture.md` | Qué significa "hacer un buen trabajo" en este proyecto; capas, convenciones de API, modelo de datos | Antes de implementar |
| `docs/conventions.md` | Reglas de estilo, nombres, estructura de carpetas, patrones de error | Antes de escribir código |
| `docs/specs.md` | Proceso SDD: EARS notation, los 3 archivos, puerta de aprobación humana | Antes de redactar o leer un spec |
| `docs/verification.md` | Cómo verificar que tu trabajo funciona (tests, lint, build) | Antes de declarar una tarea como `done` |
| `CHECKPOINTS.md` | Criterios objetivos de "estado final correcto" | Para auto-evaluarte |
| `.claude/agents/` | Definiciones de subagentes (`leader`, `spec_author`, `implementer`, `reviewer`) | Si orquestas trabajo |
| `backend/` | API REST + WebSockets (Express + TypeScript + Prisma) | Para implementar backend |
| `frontend/` | SPA React + Vite | Para implementar frontend |
| `tests/` | Tests de integración y E2E transversales | Para verificar |

---

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez.** No mezcles cambios de varias tareas en la misma sesión.
- **No declares una tarea `done` sin pruebas verdes.** Ejecuta `./init.sh` y
  verifica que el bloque de tests pasa al 100%.
- **No saltes la fase de spec.** Toda feature con `"sdd": true` debe pasar
  por `spec_author` y obtener aprobación humana antes de tocar código.
- **No saltes la puerta de aprobación humana.** El leader detiene el flujo
  en `spec_ready` y espera.
- **Documenta lo que haces** en `progress/current.md` mientras trabajas, no al final.
- **Deja el repositorio limpio** antes de cerrar la sesión (ver §5).
- **Si no sabes algo, busca en `docs/`** antes de inventarlo.
- **Respeta la separación de capas:** controladores sin lógica de negocio,
  repositorios sin validaciones (ver `docs/architecture.md`).

---

## 4. Flujo de trabajo (SDD)

```
pending → [spec_author] → spec_ready → ⏸ HUMANO → in_progress → [implementer → reviewer] → git commit → done
```

1. El leader detecta la primera feature `pending` con `"sdd": true`.
2. El leader lanza `spec_author`, que crea
   `specs/<name>/{requirements,design,tasks}.md` y marca el status como `spec_ready`.
3. **Pausa.** El humano lee el spec en `specs/<name>/` y aprueba (o pide cambios).
4. Una vez aprobado, el leader cambia el status a `in_progress` y lanza `implementer`.
5. El implementer ejecuta `tasks.md` una a una, marcándolas `[x]`.
6. El reviewer verifica trazabilidad `R<n>` ↔ test y tasks completas; aprueba o rechaza.
7. Si aprueba, el leader ejecuta el commit:
   `git add -A && git commit -m "feat(<nombre_feature>): <título de la feature>"`
8. Solo después del commit: marca `done` en `feature_list.json` y mueve el resumen a
   `progress/history.md`. **Nunca iniciar la siguiente feature sin el commit de la anterior.**

---

## 5. Cierre de sesión (lifecycle)

Antes de terminar:

1. Ejecuta `./init.sh` — todo verde.
2. Si la tarea está acabada: marca `status: "done"` en `feature_list.json`.
3. Mueve el resumen de `progress/current.md` al final de `progress/history.md`.
4. Vacía `progress/current.md` dejando solo la plantilla vacía.
5. No dejes archivos temporales, `console.log` de debug, ni TODOs sin contexto.

---

## 6. Si te bloqueas

- Relee la sección relevante de `docs/`.
- Si la herramienta no hace lo que esperas, **no inventes un workaround**:
  documenta el bloqueo en `progress/current.md` y para la sesión.
- Si hay ambigüedad en los requerimientos, consulta el wireframe en `docs/wireframe-reference.md`
  o pide aclaración al humano antes de asumir.