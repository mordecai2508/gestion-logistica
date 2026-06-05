# Review — envios_crear — APROBADO

> Reviewer: subagente `reviewer`
> Fecha: 2026-06-05
> Feature id: 4 | Sprint 2
> Revisión: **Segunda (post-correcciones)**

---

## Decisión: APROBADO

Los 3 defectos detectados en la primera revisión (D1, D2, D3A, D3B) están **completamente resueltos**. No se detectaron nuevos problemas. La feature puede marcarse como `done`.

---

## Primera revisión — Historial

La primera revisión (misma fecha) resultó **RECHAZADO** con los siguientes defectos:

| ID | Descripción |
|----|-------------|
| D1 | `CrearEnvioDto` / `EnvioResponseDto` definidos en el servicio, no en `frontend/src/types/` |
| D2 | Faltaba test R13 para el botón Cancelar |
| D3A | Campo `clienteId` era texto libre en vez de combobox/buscador; faltaba `GET /api/v1/clientes` |
| D3B | Peso y Dimensiones apilados en lugar de grid de dos columnas |

---

## Verificación de defectos corregidos

### D1 — RESUELTO

- `frontend/src/types/envioTypes.ts` creado; contiene `CrearEnvioDto` y `EnvioResponseDto`.
- `frontend/src/services/envioService.ts` eliminó las definiciones inline; ahora importa `import type { CrearEnvioDto, EnvioResponseDto } from '@/types/envioTypes'` y re-exporta los tipos.
- `frontend/src/hooks/useCrearEnvio.ts` actualizado al mismo import.

### D2 — RESUELTO

- `frontend/src/features/envios/CrearEnvio.test.tsx` línea 195: test `R13 — debe navegar a /envios al hacer click en Cancelar sin llamar a mutateAsync`.
- El test verifica `expect(mockNavigate).toHaveBeenCalledWith('/envios')` y `expect(mockMutateAsync).not.toHaveBeenCalled()`.

### D3A — RESUELTO

- `frontend/src/features/envios/CrearEnvio.tsx`: campo `clienteId` reemplazado por combobox con debounce 300 ms que llama a `clienteService.search(query)`.
- `frontend/src/services/clienteService.ts` creado: `GET /api/v1/clientes?search=<q>`.
- `backend/src/repositories/clienteRepository.ts` añadido método `search(query)` con `OR nombre/correo, take: 10`.
- `backend/src/controllers/clienteController.ts` creado: `searchClientesHandler`.
- `backend/src/routes/clientes.ts` creado: `GET / — authMiddleware + roleMiddleware('OPERADOR')`.
- `backend/src/index.ts` registra `app.use('/api/v1/clientes', clientesRouter)`.

### D3B — RESUELTO

- `CrearEnvio.tsx` líneas 178–210: Peso y Dimensiones envueltos en `<div className="grid grid-cols-2 gap-3">`.

---

## Paso 1 — Tasks (T1–T21)

Todos los ítems en `specs/envios_crear/tasks.md` están marcados `[x]` (T1–T21, incluyendo T18–T21 de correcciones post-review). **PASA.**

---

## Paso 2 — Trazabilidad R1–R23

| Requisito | Nombre del test | Archivo | Estado |
|-----------|-----------------|---------|--------|
| R1 | `R1 — debe rechazar requests sin token con 401` | `backend/src/tests/envios.test.ts:98` | OK |
| R2 | `R2 — debe rechazar requests de rol CLIENTE con 403` | `backend/src/tests/envios.test.ts:104` | OK |
| R2 | `R2 — debe rechazar requests de rol REPARTIDOR con 403` | `backend/src/tests/envios.test.ts:114` | OK |
| R3 | `R3 — debe crear el envío con estado PENDIENTE y devolver 201 con EnvioResponseDto` | `backend/src/tests/envios.test.ts:192` | OK |
| R4 | `R4 — debe crear un EventoEnvio inicial con estado PENDIENTE al crear el envío` | `backend/src/tests/envios.test.ts:215` | OK |
| R5/R6 | `R5/R6 — el código generado debe tener formato TRK-YYYYMMDD-XXXXXXXX y ser único` | `backend/src/tests/envios.test.ts:237` | OK |
| R7 | `R7 — debe devolver 500 cuando hay 3 colisiones consecutivas al generar el código` | `backend/src/tests/envios.test.ts:264` | OK |
| R8/R9 | `R8/R9 — debe devolver 422 cuando peso es 0` | `backend/src/tests/envios.test.ts:131` | OK |
| R8/R9 | `R8/R9 — debe devolver 422 cuando peso es negativo` | `backend/src/tests/envios.test.ts:140` | OK |
| R8/R9 | `R8/R9 — debe devolver 422 cuando falta remitente` | `backend/src/tests/envios.test.ts:149` | OK |
| R8/R9 | `R8/R9 — debe devolver 422 cuando dimensiones no tiene formato WxHxD` | `backend/src/tests/envios.test.ts:159` | OK |
| R10 | `R10 — debe devolver 404 cuando clienteId no existe en la tabla Cliente` | `backend/src/tests/envios.test.ts:173` | OK |
| R11 | `debe renderizar todos los campos del formulario` | `frontend/src/features/envios/CrearEnvio.test.tsx:89` | OK |
| R12 | `debe deshabilitar el botón GUARDAR ENVÍO mientras isPending es true` | `frontend/src/features/envios/CrearEnvio.test.tsx:186` | OK |
| R13 | `R13 — debe navegar a /envios al hacer click en Cancelar sin llamar a mutateAsync` | `frontend/src/features/envios/CrearEnvio.test.tsx:195` | OK |
| R14 | `debe mostrar errores de validación al enviar el formulario vacío` | `frontend/src/features/envios/CrearEnvio.test.tsx:104` | OK |
| R15 | `debe mostrar Toast de éxito y navegar a /envios al recibir 201` | `frontend/src/features/envios/CrearEnvio.test.tsx:141` | OK |
| R16 | `debe mostrar Toast de error cuando la API devuelve un error` | `frontend/src/features/envios/CrearEnvio.test.tsx:168` | OK |
| R17–R23 | Cubiertos por R1–R10 (misma batería de tests) | `backend/src/tests/envios.test.ts` | OK |

**Trazabilidad: PASA — todos los requisitos cubiertos.**

---

## Paso 3 — Arquitectura

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Controladores sin lógica de negocio | OK | `envioController.ts`: solo parseo, llamada al servicio y respuesta HTTP |
| Repositorios sin validaciones | OK | `envioRepository.ts` y `clienteRepository.ts`: solo Prisma, sin lógica |
| No fetch directo en componentes React | OK | `CrearEnvio.tsx` usa `useCrearEnvio()` hook; combobox usa `useQuery` + `clienteService` |
| No estado servidor duplicado en Zustand | OK | Solo TanStack Query (`useMutation`, `useQuery`, invalidación de `['envios']`) |
| No `any` explícito en TypeScript | OK | Sin `any` en ningún archivo de la feature |
| No `console.log` de debug | OK | `index.ts` usa `console.error` (permitido) |

**Arquitectura: PASA.**

---

## Paso 4 — Seguridad

| Criterio | Estado | Detalle |
|----------|--------|---------|
| `POST /api/v1/envios` protegido con authMiddleware + roleMiddleware | OK | `routes/envios.ts:8` |
| `GET /api/v1/clientes` protegido con authMiddleware + roleMiddleware | OK | `routes/clientes.ts:8` |
| Inputs validados con Zod antes de lógica | OK | `envioController.ts`: `crearEnvioSchema.parse(req.body)` |
| `clienteId` verificado en DB antes de crear envío | OK | `envioService.ts`: `clienteRepository.findById` |

**Seguridad: PASA.**

---

## Paso 5 — Convenios

| Criterio | Estado | Detalle |
|----------|--------|---------|
| Rutas bajo `/api/v1/` | OK | `index.ts:35–36` |
| Formato de respuestas `{ data, message, status }` / `{ error, message, statusCode }` | OK | Controladores y errorHandler |
| DTOs en `frontend/src/types/` | OK | `frontend/src/types/envioTypes.ts` — D1 resuelto |
| Layout Peso/Dimensiones en fila | OK | `grid grid-cols-2 gap-3` — D3B resuelto |
| Campo clienteId es combobox/buscador | OK | Combobox con debounce + `GET /api/v1/clientes` — D3A resuelto |
| Nombres de archivos y variables | OK | Convenciones mantenidas |

**Convenios: PASA.**

---

## Paso 6 — Verificación final (ejecutada en esta revisión)

| Verificación | Resultado |
|---|---|
| `backend npx jest --testPathPatterns="envios.test"` | **12/12 passing** |
| `frontend npx vitest run CrearEnvio.test.tsx` | **7/7 passing** |
| `backend npm run lint` | **OK — sin errores** |
| `frontend npm run lint` | **OK — sin errores** |
| `backend npm run build` | **OK — tsc sin errores** |
| `frontend npm run build` | **OK — tsc -b && vite build exitoso** |

**Verificación final: PASA en todos los comandos.**

---

## Resumen de defectos (segunda revisión)

Ningún defecto nuevo detectado. Los 3 defectos (D1, D2, D3A, D3B) de la primera revisión están resueltos.

**La feature `envios_crear` queda APROBADA. El leader puede marcar la feature como `done` en `feature_list.json`.**
