# CHECKPOINTS — Evaluación del estado final

> En sistemas multi-agente no se evalúa el camino, se evalúa el destino.
> Estos son los checkpoints objetivos que un juez (humano o IA) puede usar
> para decidir si el proyecto está sano.

---

## C1 — El arnés está completo

- [ ] Existen los 4 archivos base: `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`.
- [ ] Existen los 4 docs: `docs/architecture.md`, `docs/conventions.md`, `docs/specs.md`, `docs/verification.md`.
- [ ] `./init.sh` termina con exit code 0.

---

## C2 — El estado es coherente

- [ ] Como mucho una feature en `in_progress` en `feature_list.json`.
- [ ] Toda feature `done` tiene tests asociados que pasan.
- [ ] `progress/current.md` está vacío o describe la sesión activa
  (no contiene basura de sesiones anteriores).

---

## C3 — El código respeta la arquitectura

- [ ] `backend/` sigue la estructura: `routes/` → `middlewares/` → `controllers/` → `services/` → `repositories/`.
- [ ] Los controladores no contienen lógica de negocio (solo extracción de params + llamada al servicio + respuesta HTTP).
- [ ] Los repositorios no contienen validaciones (solo acceso a Prisma).
- [ ] `frontend/` sigue la estructura: `services/` para HTTP, `hooks/` para TanStack Query, `store/` para estado global.
- [ ] No hay `fetch` directo en componentes React (todo pasa por `services/`).
- [ ] No hay estado del servidor duplicado en Zustand/Context (exclusivamente TanStack Query).
- [ ] No hay `console.log` de debug, ni TODOs sin contexto.
- [ ] TypeScript `strict: true` en ambos `tsconfig.json`; no hay `any` explícito.

---

## C4 — La verificación es real

- [ ] `backend/`: `npm run test` pasa al 100% con al menos un test por módulo de servicio.
- [ ] `frontend/`: `npm run test` pasa al 100%.
- [ ] `npm run lint` en ambos workspaces termina sin errores.
- [ ] `npm run build` en ambos workspaces termina sin errores.
- [ ] Toda respuesta de la API sigue el formato `{ data, message, status }` (éxito) o `{ error, message, statusCode }` (error).
- [ ] Las rutas de la API usan el prefijo `/api/v1/`.

---

## C5 — La sesión se cerró bien

- [ ] No hay archivos sin trackear sospechosos (`*.tmp`, `.env` en git, `node_modules/` fuera del `.gitignore`).
- [ ] `progress/history.md` tiene una entrada por la última sesión.
- [ ] La última feature trabajada está reflejada en su estado correcto en `feature_list.json`.

---

## C6 — Spec Driven Development

- [ ] Toda feature con `"sdd": true` en estado `spec_ready`, `in_progress` o `done` tiene su carpeta
  `specs/<name>/` con los 3 archivos: `requirements.md`, `design.md`, `tasks.md`.
- [ ] `requirements.md` usa EARS estricto (ver `docs/specs.md`).
- [ ] Toda feature `done` con `"sdd": true` tiene todas sus tasks marcadas `[x]` en `tasks.md`.
- [ ] Cada `R<n>` de `requirements.md` está cubierto por al menos un test concreto.

---

## C7 — Seguridad mínima (no omitir)

- [ ] `helmet` y `cors` están configurados en Express.
- [ ] Rate limiting activo en rutas `/api/v1/auth/*`.
- [ ] Los inputs pasan por validación Zod antes de llegar a Prisma (no concatenación de strings).
- [ ] Los archivos subidos (fotos de incidencias, firmas) son validados por tipo MIME y tamaño.
- [ ] Los tokens JWT se verifican en el middleware `authMiddleware`; los endpoints protegidos no son accesibles sin token válido.

---

**Cómo usar este archivo:** un agente `reviewer` recorre cada checkbox,
marca `[x]` o `[ ]`, y rechaza el cierre de sesión si quedan boxes vacíos en C1–C7.
