# Informe de Implementación — envios_consultar

> Feature id: 5 | Sprint 2 | Fecha: 2026-06-05

---

## Archivos creados

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/hooks/useEnvios.ts` | Hook TanStack Query para listar envíos con filtros |
| `frontend/src/hooks/useEnvioDetalle.ts` | Hook TanStack Query para detalle de un envío por id |
| `frontend/src/hooks/useEditarEnvio.ts` | Hook useMutation para editar un envío |
| `frontend/src/hooks/useCancelarEnvio.ts` | Hook useMutation para cancelar un envío |
| `frontend/src/features/envios/ConsultarEnvios.tsx` | Pantalla principal con tabla, búsqueda y paginación |
| `frontend/src/features/envios/EditarEnvioModal.tsx` | Modal de edición con React Hook Form + Zod |
| `frontend/src/features/envios/DetalleEnvio.tsx` | Pantalla de detalle con historial de eventos |
| `frontend/src/features/envios/ConsultarEnvios.test.tsx` | Tests Vitest para ConsultarEnvios (8 casos) |
| `frontend/src/features/envios/EditarEnvioModal.test.tsx` | Tests Vitest para EditarEnvioModal (5 casos) |
| `frontend/src/features/envios/DetalleEnvio.test.tsx` | Tests Vitest para DetalleEnvio (3 casos) |

---

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `backend/src/validators/envioValidator.ts` | Añadidos `listarEnviosSchema`, `editarEnvioSchema`, `ListarEnviosInput`, `EditarEnvioInput` |
| `backend/src/types/envioTypes.ts` | Añadidos `EnvioListItemDto`, `EventoEnvioDto`, `EnvioDetalleDto`, `EditarEnvioDto`, `PaginationMeta`, `PaginatedEnviosResponse`, `CancelarEnvioResponseDto` |
| `backend/src/repositories/envioRepository.ts` | Añadidos `findMany`, `count`, `findById`, `update`, `cancelar`; tipos `EnvioConCliente`, `EnvioConDetalle` |
| `backend/src/services/envioService.ts` | Añadidos `listar`, `obtenerDetalle`, `editar`, `cancelar` |
| `backend/src/controllers/envioController.ts` | Añadidos `listarEnviosHandler`, `obtenerDetalleHandler`, `editarEnvioHandler`, `cancelarEnvioHandler` |
| `backend/src/routes/envios.ts` | Añadidas rutas GET /, GET /:id, PATCH /:id, DELETE /:id |
| `backend/src/tests/envios.test.ts` | Añadido bloque `envios_consultar` con 21 casos de test |
| `frontend/src/types/envioTypes.ts` | Añadidos 8 interfaces nuevas para la feature |
| `frontend/src/services/envioService.ts` | Añadidos métodos `listar`, `obtenerDetalle`, `editar`, `cancelar` |
| `frontend/src/router/index.tsx` | Añadidas rutas `/envios` y `/envios/:id` (con `/envios/crear` antes de `/:id`) |

---

## Tabla de trazabilidad

| Requisito | Nombre del test | Archivo : línea aprox. |
|-----------|----------------|------------------------|
| R1 | `R1/R34 — debe rechazar GET /envios sin token con 401` | `backend/src/tests/envios.test.ts` (describe `envios_consultar`) |
| R2 | `R2/R34 — debe rechazar GET /envios con token de CLIENTE con 403` | `backend/src/tests/envios.test.ts` |
| R3 | `R3/R35 — debe devolver lista paginada con meta correcto sin filtros` | `backend/src/tests/envios.test.ts` |
| R4 | `R4/R35 — debe usar page=1 y limit=20 por defecto cuando no se pasan query params` | `backend/src/tests/envios.test.ts` |
| R5 | `R5/R36 — debe devolver 422 cuando page=0` | `backend/src/tests/envios.test.ts` |
| R6 | `R6/R37 — debe filtrar por estado=PENDIENTE y devolver solo envíos PENDIENTE` | `backend/src/tests/envios.test.ts` |
| R7 | `R7/R38 — debe filtrar por cliente (nombre parcial, case-insensitive)` | `backend/src/tests/envios.test.ts` |
| R8 | `R8/R39 — debe filtrar por codigo (parcial, case-insensitive)` | `backend/src/tests/envios.test.ts` |
| R9 | `R9/R40 — debe aplicar filtros estado y codigo simultáneamente (AND)` | `backend/src/tests/envios.test.ts` |
| R10 | `R10/R41 — debe devolver 422 cuando estado tiene un valor no válido` | `backend/src/tests/envios.test.ts` |
| R11 | `R11/R42 — debe devolver detalle completo con array eventos ordenado por timestamp` | `backend/src/tests/envios.test.ts` |
| R11 | `R11 — debe renderizar todos los campos del EnvioDetalleDto` | `frontend/src/features/envios/DetalleEnvio.test.tsx` |
| R12 | `R12/R43 — debe devolver 404 cuando id no existe en GET /:id` | `backend/src/tests/envios.test.ts` |
| R13 | `R13/R44 — debe actualizar campos editables y devolver 200 con registro actualizado` | `backend/src/tests/envios.test.ts` |
| R14 | `R14/R45 — no debe modificar estado aunque se incluya en el body del PATCH` | `backend/src/tests/envios.test.ts` |
| R15 | `R15/R46 — debe devolver 422 cuando body de PATCH no contiene campos editables` | `backend/src/tests/envios.test.ts` |
| R16 | `R16/R47 — debe devolver 422 cuando peso es negativo en PATCH` | `backend/src/tests/envios.test.ts` |
| R17 | `R17 — debe devolver 404 cuando id no existe en PATCH /:id` | `backend/src/tests/envios.test.ts` |
| R18 | `R18/R48 — debe cambiar estado a CANCELADO y devolver 200 para envío PENDIENTE` | `backend/src/tests/envios.test.ts` |
| R19 | `R19/R49 — debe devolver 409 al cancelar envío que no está en PENDIENTE` | `backend/src/tests/envios.test.ts` |
| R20 | `R20/R50 — debe devolver 404 cuando id no existe en DELETE /:id` | `backend/src/tests/envios.test.ts` |
| R21 | `R21/R48 — debe crear EventoEnvio con estado CANCELADO al cancelar el envío` | `backend/src/tests/envios.test.ts` |
| R22 | `R22/R23/R25/R26 — debe renderizar la barra de búsqueda, la tabla, la paginación y el botón Nuevo Envío` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R23 | `R22/R23/R25/R26 — ...` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R24 | `R24 — debe mostrar badges de color para cada estado` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R25 | `R22/R23/R25/R26 — ...` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R26 | `R22/R23/R25/R26 — ...` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R27 | `R27 — debe filtrar la tabla cuando el usuario escribe en la barra de búsqueda y presiona Enter` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R28 | `R28 — debe navegar a /envios/:id al hacer clic en la acción ver` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R29 | `R29/R30 — debe abrir el modal de edición con los campos pre-poblados al hacer clic en editar` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R30 | `R30 — debe llamar a envioService.editar con los datos correctos al enviar` | `frontend/src/features/envios/EditarEnvioModal.test.tsx` |
| R31 | `R31 — debe mostrar AlertDialog de confirmación al hacer clic en eliminar` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R32 | `R32 — debe llamar a envioService.cancelar y mostrar Toast de éxito al confirmar cancelación` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |
| R33 | `R33 — debe mostrar Toast de error cuando DELETE devuelve 409` | `frontend/src/features/envios/ConsultarEnvios.test.tsx` |

---

## Resultado de verificación

| Verificación | Resultado |
|-------------|-----------|
| `backend npm run lint` | PASS — 0 errores |
| `frontend npm run lint` | PASS — 0 errores |
| `backend npm run test` | PASS — 87/87 passing (21 nuevos en bloque `envios_consultar`) |
| `frontend npm run test` | PASS — 46/46 passing (16 nuevos: 8 ConsultarEnvios + 5 EditarEnvioModal + 3 DetalleEnvio) |
| `backend npm run build` | PASS — sin errores TypeScript |
| `frontend npm run build` | PASS — sin errores TypeScript |

---

## Notas de implementación

- **Zod v4**: `nativeEnum` fue reemplazado por `z.enum(Object.values(EstadoEnvio))` ya que el proyecto usa Zod v4 donde `errorMap` no existe en la forma anterior. Se usó `z.enum` con los valores del enum de Prisma.
- **`req.params` tipado**: Los handlers `obtenerDetalleHandler`, `editarEnvioHandler` y `cancelarEnvioHandler` usan `Request<{ id: string }>` para evitar el error TS `string | string[]`.
- **Router order**: `/envios/crear` aparece antes de `/envios/:id` en el router para evitar que React Router interprete "crear" como parámetro dinámico.
- **No se duplicó** el `app.use('/api/v1/envios', enviosRouter)` — ya existía desde `envios_crear`.
- **`findByCodigo`** se conservó sin modificaciones junto a los nuevos métodos.
