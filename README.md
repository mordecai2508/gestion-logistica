# Arnés — Sistema de Gestión de Logística y Envíos

Proyecto de ingeniería de software aplicando los principios de **Harness Engineering**
al desarrollo de una plataforma web logística (backend Express+TypeScript+Prisma /
frontend React+Vite).

> El código de la aplicación vive en `backend/` y `frontend/`.
> Lo importante de este repo no es solo **qué** hace, sino **cómo** está estructurado
> para que un agente de IA pueda trabajar sobre él de forma autónoma y verificable.

---

## Cómo está organizado el arnés

| Pilar | Manifestación en este repo |
|---|---|
| **1. El repositorio ES el sistema** | `AGENTS.md`, `init.sh`, `feature_list.json`, `specs/`, `progress/`, `docs/` |
| **2. Orquestación multi-agente** | `.claude/agents/leader.md`, `spec_author.md`, `implementer.md`, `reviewer.md` |
| **3. Spec Driven Development** | `docs/specs.md`, EARS notation, puerta de aprobación humana en `spec_ready` |
| **4. Supervisión y mejora** | `CHECKPOINTS.md`, hooks en `.claude/settings.json`, tests en `backend/` y `frontend/` |

---

## Para empezar

```bash
./init.sh
```

Si todo está verde, abre `AGENTS.md` y sigue desde ahí.

---

## Usar con Claude Code

1. `./init.sh` — debe terminar verde (advertencias de boilerplate pendiente son normales al inicio).
2. Abre `feature_list.json` — empieza por `infra_base` (sin SDD) para crear el boilerplate.
3. Lanza Claude Code en la raíz: `claude`
4. Pídele: **«implementa la feature infra_base»** (boilerplate sin spec) o
   **«implementa la siguiente feature pendiente»** (para features SDD).

### Lo que ocurre con features SDD, en dos fases:

**Fase 1 — Spec.** El `leader` lanza un `spec_author` que escribe
`specs/<feature>/{requirements.md, design.md, tasks.md}` y deja la feature en `spec_ready`.
Luego **para y te pide aprobación**.

Tú lees los tres archivos:
- `requirements.md` — qué debe hacer la feature, en EARS estricto.
- `design.md` — decisiones técnicas antes de escribir código.
- `tasks.md` — checklist de pasos a ejecutar.

Cuando estés conforme, dices «aprobado» (o pides cambios).

**Fase 2 — Código.** El `leader` pasa a `in_progress` y lanza `implementer`
(sigue las tasks marcando `[x]`) y después `reviewer` (verifica trazabilidad `R<n>` ↔ test).

---

## Estructura

```
.
├── AGENTS.md                    # Mapa para agentes (divulgación progresiva)
├── CHECKPOINTS.md               # Criterios de "estado final correcto"
├── CLAUDE.md                    # Instrucciones para Claude Code (rol leader)
├── feature_list.json            # Alcance: features por sprint con estado
├── init.sh                      # Verificación e inicialización
├── specs/<feature>/             # Spec por feature (Kiro-style)
│   ├── requirements.md          # EARS notation — el QUÉ
│   ├── design.md                # Decisiones técnicas — el CÓMO
│   └── tasks.md                 # Checklist de implementación
├── progress/
│   ├── current.md               # Sesión activa (estado vivo)
│   └── history.md               # Bitácora append-only
├── docs/
│   ├── architecture.md          # Stack, capas, modelo de datos, convenciones de API
│   ├── conventions.md           # Estilo, nombres, patrones de error
│   ├── specs.md                 # Proceso SDD: EARS, 3 archivos, aprobación humana
│   ├── verification.md          # Cómo demostrar que funciona
│   └── wireframe-reference.md   # Referencia textual del WIFRAME.pdf
├── .claude/
│   ├── agents/                  # leader, spec_author, implementer, reviewer
│   └── settings.json            # Hooks de automatización
├── backend/                     # Express + TypeScript + Prisma (a crear)
├── frontend/                    # React + Vite + Shadcn (a crear)
└── tests/                       # Tests E2E transversales (a crear)
```

---

## Sprints planificados

| Sprint | Bloque | Features | Esfuerzo est. |
|---|---|---|---|
| 1 | Autenticación y Acceso | `auth_login`, `auth_registro`, `auth_perfil`, `infra_base` | 58 h |
| 2 | Gestión de Envíos | `envios_crear`, `envios_consultar` | 40 h |
| 3 | Rastreo y Logística | `rastreo_paquete`, `rutas_gestion`, `vehiculos_gestion` | 54 h |
| 4 | Entregas, Incidencias y Notificaciones | `entregas_confirmacion`, `incidencias_gestion`, `notificaciones` | 62 h |

---

## Aprendizajes que ilustra este arnés

- **Divulgación progresiva** en `AGENTS.md`: el agente recibe un mapa, no una biblia.
- **Una feature a la vez** validado por `init.sh` (rechaza más de un `in_progress`).
- **Spec Driven Development**: requirements (EARS) → design → tasks → code, con puerta humana.
- **Estado en disco, no en chat**: `specs/`, `progress/current.md` y `history.md` sobreviven reinicios.
- **Trazabilidad obligatoria**: cada `R<n>` se mapea a un test; el reviewer rechaza si falta.
- **Patrón Leader-Spec-Implementer-Reviewer**: roles separados, sin solapamiento.
- **Anti teléfono-descompuesto**: subagentes escriben en archivos, devuelven solo referencias.
