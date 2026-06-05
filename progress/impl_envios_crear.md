# Implementación — envios_crear (Feature id: 4, Sprint 2)

> Fecha: 2026-06-05
> Implementer: subagente `implementer`

---

## Archivos creados / modificados

### Backend

| Archivo | Estado |
|---------|--------|
| `backend/src/validators/envioValidator.ts` | Creado — `crearEnvioSchema` (Zod) + tipo `CrearEnvioInput` |
| `backend/src/types/envioTypes.ts` | Creado — interfaces `CrearEnvioDto` y `EnvioResponseDto` |
| `backend/src/repositories/envioRepository.ts` | Creado — `createEnvio` (transacción atómica) + `findByCodigo` |
| `backend/src/repositories/clienteRepository.ts` | Creado — `findById` para verificación previa |
| `backend/src/lib/appError.ts` | Creado — clase `AppError` usada en toda la lógica de errores |
| `backend/src/services/envioService.ts` | Creado — `generarCodigoUnico` + `envioService.crear` |
| `backend/src/controllers/envioController.ts` | Creado — `crearEnvioHandler` |
| `backend/src/middlewares/roleMiddleware.ts` | Creado — `roleMiddleware(rol)` |
| `backend/src/routes/envios.ts` | Creado — router con `POST /` → authMiddleware → roleMiddleware → handler |
| `backend/src/index.ts` | Modificado — registra `/api/v1/envios` router |
| `backend/src/tests/envios.test.ts` | Creado + corregido — lint fix línea 150 (IIFE para destructuring sin var no usada) |

### Frontend

| Archivo | Estado |
|---------|--------|
| `frontend/src/services/envioService.ts` | Creado — `envioService.crear(dto)` usando instancia `api` Axios |
| `frontend/src/hooks/useCrearEnvio.ts` | Creado — `useMutation` con invalidación de `['envios']`; corregido `import type` |
| `frontend/src/features/envios/CrearEnvio.tsx` | Creado — formulario RHF + Zod, Toast, navegación |
| `frontend/src/router/index.tsx` | Modificado — ruta `/envios/crear` protegida con `ProtectedRoute allowedRoles=['OPERADOR']` |
| `frontend/src/features/envios/CrearEnvio.test.tsx` | Creado + corregido — `vi.useFakeTimers({ shouldAdvanceTime: true })` y `vi.useRealTimers()` en `beforeEach` |

---

## Correcciones aplicadas en esta sesión

1. **Backend lint (T14)** — `backend/src/tests/envios.test.ts` línea 150:
   - Antes: `const { remitente: _r, ...withoutRemitente } = validPayload;`
   - Después: `const withoutRemitente = (({ remitente: _, ...rest }) => rest)(validPayload);`
   - Razón: `_r` es una variable local no usada; la IIFE convierte `remitente` en argumento `_` que sí es ignorado por `argsIgnorePattern: "^_"`.

2. **Frontend tests (T16)** — `frontend/src/features/envios/CrearEnvio.test.tsx`:
   - Cambiado `vi.useFakeTimers()` a `vi.useFakeTimers({ shouldAdvanceTime: true })` en test de Toast de éxito.
   - Añadido `vi.useRealTimers()` en `beforeEach` para evitar contaminación entre tests cuando un test falla antes de llamar a `vi.useRealTimers()`.
   - Razón: `waitFor` de Testing Library usa `setTimeout` internamente; con fake timers sin `shouldAdvanceTime: true`, el polling de `waitFor` se congela y el test agota el timeout de 5000 ms.

3. **Frontend build (T17)** — `frontend/src/hooks/useCrearEnvio.ts`:
   - Separado el import de tipos: `import type { CrearEnvioDto, EnvioResponseDto }` para cumplir con `verbatimModuleSyntax` del tsconfig del frontend.

---

## Tabla de trazabilidad

| Requisito | Nombre del test | Archivo : línea |
|-----------|-----------------|-----------------|
| R1 | `R1 — debe rechazar requests sin token con 401` | `backend/src/tests/envios.test.ts:98` |
| R2 | `R2 — debe rechazar requests de rol CLIENTE con 403` | `backend/src/tests/envios.test.ts:104` |
| R2 | `R2 — debe rechazar requests de rol REPARTIDOR con 403` | `backend/src/tests/envios.test.ts:114` |
| R3 | `R3 — debe crear el envío con estado PENDIENTE y devolver 201 con EnvioResponseDto` | `backend/src/tests/envios.test.ts:192` |
| R4 | `R4 — debe crear un EventoEnvio inicial con estado PENDIENTE al crear el envío` | `backend/src/tests/envios.test.ts:215` |
| R5/R6 | `R5/R6 — el código generado debe tener formato TRK-YYYYMMDD-XXXXXXXX y ser único` | `backend/src/tests/envios.test.ts:237` |
| R7 | `R7 — debe devolver 500 cuando hay 3 colisiones consecutivas al generar el código` | `backend/src/tests/envios.test.ts:264` |
| R8/R9 | `R8/R9 — debe devolver 422 cuando peso es 0` | `backend/src/tests/envios.test.ts:131` |
| R8/R9 | `R8/R9 — debe devolver 422 cuando peso es negativo` | `backend/src/tests/envios.test.ts:140` |
| R8/R9 | `R8/R9 — debe devolver 422 cuando falta remitente` | `backend/src/tests/envios.test.ts:149` |
| R8/R9 | `R8/R9 — debe devolver 422 cuando dimensiones no tiene formato WxHxD` | `backend/src/tests/envios.test.ts:159` |
| R10 | `R10 — debe devolver 404 cuando clienteId no existe en la tabla Cliente` | `backend/src/tests/envios.test.ts:173` |
| R11–R16 | `debe renderizar todos los campos del formulario` | `frontend/src/features/envios/CrearEnvio.test.tsx:75` |
| R14 | `debe mostrar errores de validación al enviar el formulario vacío` | `frontend/src/features/envios/CrearEnvio.test.tsx:90` |
| R11 | `debe llamar a envioService.crear con los datos correctos al enviar el formulario` | `frontend/src/features/envios/CrearEnvio.test.tsx:102` |
| R15 | `debe mostrar Toast de éxito y navegar a /envios al recibir 201` | `frontend/src/features/envios/CrearEnvio.test.tsx:127` |
| R16 | `debe mostrar Toast de error cuando la API devuelve un error` | `frontend/src/features/envios/CrearEnvio.test.tsx:152` |
| R12 | `debe deshabilitar el botón GUARDAR ENVÍO mientras isPending es true` | `frontend/src/features/envios/CrearEnvio.test.tsx:170` |

---

## Resultado de verificación

| Verificación | Resultado |
|---|---|
| Tests backend | 66/66 passing (12 en envios.test.ts) |
| Tests frontend | 29/29 passing (6 en CrearEnvio.test.tsx) |
| Lint backend | OK — sin errores |
| Lint frontend | OK — sin errores |
| Build backend | OK — tsc sin errores |
| Build frontend | OK — tsc -b && vite build sin errores |

---

## Tasks completadas

- [x] T1 — `envioValidator.ts`
- [x] T2 — `envioTypes.ts`
- [x] T3 — `envioRepository.ts`
- [x] T4 — `envioService.ts`
- [x] T5 — `envioController.ts`
- [x] T6 — `roleMiddleware.ts`
- [x] T7 — `routes/envios.ts` + registro en `index.ts`
- [x] T8 — `tests/envios.test.ts` (12 tests)
- [x] T9 — `CrearEnvio.tsx`
- [x] T10 — `frontend/services/envioService.ts`
- [x] T11 — `useCrearEnvio.ts`
- [x] T12 — ruta `/envios/crear` en router
- [x] T13 — `CrearEnvio.test.tsx` (6 tests)
- [x] T14 — lint backend + frontend sin errores
- [x] T15 — backend tests 66/66
- [x] T16 — frontend tests 29/29
- [x] T17 — build backend + frontend sin errores

---

## Correcciones post-review

### Archivos modificados

| Archivo | Corrección | Acción |
|---------|-----------|--------|
| `frontend/src/types/envioTypes.ts` | D1 | Creado — interfaces `CrearEnvioDto` y `EnvioResponseDto` movidas aquí |
| `frontend/src/services/envioService.ts` | D1 | Modificado — eliminadas definiciones inline; `import type { CrearEnvioDto, EnvioResponseDto } from '@/types/envioTypes'`; re-exporta los tipos |
| `frontend/src/hooks/useCrearEnvio.ts` | D1 | Modificado — import de tipos actualizado a `@/types/envioTypes` |
| `frontend/src/features/envios/CrearEnvio.test.tsx` | D2 | Modificado — añadido test R13 (Cancelar); mock de `clienteService`; `fillForm` actualizado para usar combobox; total: 7 tests |
| `frontend/src/features/envios/CrearEnvio.tsx` | D3A + D3B | Modificado — campo `clienteId` reemplazado por combobox/buscador con debounce 300ms; Peso y Dimensiones en grid de 2 columnas |
| `frontend/src/services/clienteService.ts` | D3A | Creado — `clienteService.search(query)` usando instancia `api` Axios |
| `backend/src/repositories/clienteRepository.ts` | D3A | Modificado — añadido método `search(query)` con Prisma (OR nombre/correo, `take: 10`) |
| `backend/src/controllers/clienteController.ts` | D3A | Creado — `searchClientesHandler` |
| `backend/src/routes/clientes.ts` | D3A | Creado — `GET /` con authMiddleware + roleMiddleware('OPERADOR') |
| `backend/src/index.ts` | D3A | Modificado — registra `app.use('/api/v1/clientes', clientesRouter)` |
| `specs/envios_crear/requirements.md` | D3A | Modificado — R11 actualizado: clienteId ahora es buscador/combobox |
| `specs/envios_crear/tasks.md` | — | Añadidas tasks T18–T21 marcadas [x] |

### Resultado de verificación post-correcciones

| Verificación | Resultado |
|---|---|
| Tests backend | 66/66 passing |
| Tests frontend | 30/30 passing (7 en CrearEnvio.test.tsx — incluye R13) |
| Lint backend | OK — sin errores |
| Lint frontend | OK — sin errores |
| Build backend | OK — tsc sin errores |
| Build frontend | OK — tsc -b && vite build sin errores |

### Tasks T18–T21

- [x] T18 — DTOs movidos a `frontend/src/types/envioTypes.ts` (D1)
- [x] T19 — Test R13 para botón Cancelar añadido (D2)
- [x] T20 — Peso y Dimensiones en grid de 2 columnas (D3B)
- [x] T21 — Campo clienteId → combobox + endpoint `GET /api/v1/clientes` (D3A)
