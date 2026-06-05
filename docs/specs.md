# docs/specs.md — Proceso Spec Driven Development (SDD)

> Leer **completo** antes de redactar o revisar cualquier spec.
> El `spec_author` no puede empezar a escribir sin haber leído este archivo.

---

## Por qué SDD

El Sistema de Logística es complejo: múltiples roles, estado en tiempo real,
transacciones críticas. Sin un spec aprobado antes del código, los agentes
inventan comportamientos, producen código difícil de revisar y obligan a
rehacerlo. El flujo SDD garantiza que **el humano aprueba qué antes de que
la IA decida cómo**.

---

## Los 3 archivos de cada spec

Para toda feature con `"sdd": true`, el `spec_author` crea en `specs/<name>/`:

### 1. `requirements.md` — Qué debe hacer (EARS)

Usa **EARS notation** (Easy Approach to Requirements Syntax). Cada requisito es
una oración con una de estas plantillas:

| Plantilla | Cuándo usarla |
|---|---|
| `WHEN <trigger> THE SYSTEM SHALL <response>` | Reacción a un evento |
| `IF <condition> THEN THE SYSTEM SHALL <response>` | Comportamiento condicional |
| `THE SYSTEM SHALL <response>` | Comportamiento incondicional |
| `WHILE <state> THE SYSTEM SHALL <response>` | Comportamiento continuo |

Numerar cada requisito: `R1`, `R2`, `R3`…

**Ejemplo para `auth_login`:**
```
R1. WHEN a user submits valid credentials THE SYSTEM SHALL return an accessToken
    (JWT, 15 min expiry) in the response body and set a refreshToken
    (JWT, 7 days) as an httpOnly cookie.
R2. WHEN a user submits invalid credentials THE SYSTEM SHALL return HTTP 401
    with { error: "INVALID_CREDENTIALS", message: "...", statusCode: 401 }.
R3. THE SYSTEM SHALL redirect authenticated users to their role-specific route:
    /dashboard (OPERADOR), /repartidor (REPARTIDOR), /tracking (CLIENTE).
```

**Reglas:**
- Un requisito = una sola idea. Si usas "y también", divide en dos.
- Prohibido "debería" o "podría" — solo "SHALL" (obligatorio) o "SHOULD" (deseable, marcado explícitamente).
- No mezclar el "qué" con el "cómo": no mencionar implementación (bcrypt, Prisma, etc.) en requirements.

---

### 2. `design.md` — Cómo se va a hacer

Responde a estas preguntas para la feature:

1. **Endpoints afectados** — método, ruta, payload de entrada, payload de salida, códigos HTTP.
2. **Cambios al schema Prisma** — tablas nuevas, columnas nuevas, relaciones nuevas.
3. **Lógica de negocio no obvia** — describe los pasos del servicio que no son triviales (p.ej. generación de código único con reintento).
4. **Componentes/páginas frontend** — qué pantallas se crean o modifican; qué hooks y servicios se añaden.
5. **Decisión técnica clave** — si hay varias opciones, explica cuál se elige y por qué (y cuál se descarta).
6. **Consideraciones de seguridad** — validaciones, permisos de rol, límites de archivos.

---

### 3. `tasks.md` — Lista de pasos para el implementer

Un checklist ordenado de pasos concretos. El implementer los sigue en orden,
marcando cada uno `[x]` al completarlo.

**Formato:**
```markdown
# Tasks — <nombre_feature>

- [ ] T1. Crear/actualizar schema Prisma y ejecutar migración
- [ ] T2. Crear validator Zod `schemas/<nombre>Schema.ts`
- [ ] T3. Crear repositorio `repositories/<nombre>Repository.ts`
- [ ] T4. Crear servicio `services/<nombre>Service.ts`
- [ ] T5. Crear controlador `controllers/<nombre>Controller.ts`
- [ ] T6. Registrar rutas en `routes/<nombre>.ts` con middlewares
- [ ] T7. Escribir tests (Jest + Supertest) para R1, R2, R3...
- [ ] T8. Crear componente(s) frontend según diseño
- [ ] T9. Crear service frontend `services/<nombre>Service.ts`
- [ ] T10. Crear hook TanStack Query `hooks/use<Nombre>.ts`
- [ ] T11. Verificar: `npm run test` verde, `npm run lint` sin errores, `npm run build` sin errores
```

Cada task debe ser lo suficientemente pequeña para que un agente la ejecute sin
ambigüedad. Si una task es grande, divídela.

---

## Puerta de aprobación humana

```
spec_author escribe → spec_ready → ⏸ HUMANO APRUEBA → in_progress → implementer
```

El leader **detiene el flujo** cuando la feature llega a `spec_ready`. El humano:
1. Lee `specs/<name>/requirements.md` → ¿captura correctamente los requisitos?
2. Lee `specs/<name>/design.md` → ¿las decisiones técnicas son coherentes con la arquitectura?
3. Lee `specs/<name>/tasks.md` → ¿la descomposición es suficientemente granular?

Si algo falla, el humano pide cambios al `spec_author` antes de avanzar. Nunca se
salta esta puerta, aunque parezca urgente.

---

## Trazabilidad obligatoria

Cada `R<n>` en `requirements.md` debe aparecer en al menos un test. El `reviewer`
verifica esta cobertura antes de cerrar la feature. Si falta trazabilidad, rechaza.

Formato de referencia en tests:
```typescript
it('R1 - debe devolver accessToken y cookie refreshToken con credenciales válidas', async () => {
  // ...
});
```
