# docs/verification.md — Cómo verificar que el trabajo funciona

> Leer antes de declarar cualquier tarea como `done`.
> La verificación es la única forma de demostrar que algo funciona.

---

## Orden de verificación (siempre en este orden)

### 1. Tests unitarios e integración (backend)

```bash
cd backend
npm run test          # Jest — todos los tests
npm run test:unit     # solo unitarios (sin Supertest)
```

**Criterios de éxito:**
- 0 tests fallidos.
- Al menos 1 test por cada `R<n>` de `requirements.md`.
- Cobertura mínima del 80% en servicios (verificar con `--coverage`).

### 2. Tests (frontend)

```bash
cd frontend
npm run test          # Vitest
```

**Criterios de éxito:**
- 0 tests fallidos.
- Componentes críticos (ProtectedRoute, formularios con validación) tienen tests.

### 3. Lint

```bash
cd backend && npm run lint
cd frontend && npm run lint
```

**Criterios de éxito:** 0 errores ESLint. 0 errores TypeScript.

### 4. Build de producción

```bash
cd backend && npm run build
cd frontend && npm run build
```

**Criterios de éxito:** ambos terminan sin errores. Los archivos `dist/` existen.

### 5. init.sh completo

```bash
./init.sh
```

**Criterios de éxito:** exit code 0, todos los bloques verdes.

---

## Cómo verificar una feature específica

Para la feature activa, además de los pasos anteriores:

1. **Revisa el spec:** abre `specs/<feature>/requirements.md` y confirma que cada
   `R<n>` tiene al menos un test que lo cubre explícitamente (el test debe nombrar el requisito).

2. **Revisa las tasks:** abre `specs/<feature>/tasks.md` y confirma que todos los
   ítems están marcados `[x]`.

3. **Prueba manual rápida (opcional pero recomendada):**
   - Levanta backend (`npm run dev` en `backend/`) y frontend (`npm run dev` en `frontend/`).
   - Navega a la pantalla de la feature y compara con el wireframe en `WIFRAME.pdf`.
   - Intenta los flujos alternativos (datos inválidos, rol sin permiso, etc.).

---

## Qué hacer si un test falla

1. **No marcar la feature como `done`.**
2. Leer el mensaje de error completo antes de actuar.
3. Si el test está mal escrito → corregir el test, no borrar el test.
4. Si la implementación está mal → corregir la implementación.
5. Si hay un bloqueo sin solución clara → documentar en `progress/current.md` y parar.

---

## Verificación de seguridad (checklist rápido)

Antes de cerrar cualquier feature que exponga endpoints:

- [ ] El endpoint está protegido con `authMiddleware` (si requiere auth).
- [ ] El endpoint tiene `roleMiddleware` correcto (si está restringido por rol).
- [ ] El body pasa por validación Zod antes de llegar al servicio.
- [ ] Si sube archivos: MIME type y tamaño validados.
- [ ] No hay datos sensibles (passwords, tokens) en los logs o en las respuestas.

---

## Mapeo de trazabilidad (plantilla)

Al cerrar la feature, el `implementer` escribe en `progress/impl_<feature>.md`:

```markdown
# Implementación — <nombre_feature>

## Archivos modificados
- backend/src/services/envioService.ts
- backend/src/controllers/envioController.ts
- (...)

## Trazabilidad R<n> → test
| Requisito | Test | Archivo |
|---|---|---|
| R1 | `R1 - debe crear envío con código único` | `tests/envio.test.ts:42` |
| R2 | `R2 - debe rechazar campos inválidos` | `tests/envio.test.ts:67` |

## Resultado de verificación
- Tests: ✅ X/X passing
- Lint backend: ✅
- Lint frontend: ✅
- Build: ✅
```
