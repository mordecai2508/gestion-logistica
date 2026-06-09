# Tasks — mis_envios_cliente

Orden de implementación: backend primero, luego frontend, finalmente verificación.
El implementer marca cada tarea `[x]` al completarla.

---

## Backend

- [x] T1. Añadir método `findByUsuarioId(usuarioId: string): Promise<Cliente | null>`
  al repositorio existente `backend/src/repositories/clienteRepository.ts`.
  Usa `prisma.cliente.findUnique({ where: { usuarioId } })`.

- [x] T2. Añadir método `findManyByClienteId` al repositorio existente
  `backend/src/repositories/envioRepository.ts` que acepte
  `{ clienteId, estado?, skip, take }` y retorne `EnvioConCliente[]` (tipo
  existente) más el conteo total. Reutilizar el patrón de `findMany` + `count`
  con `Promise.all`.

- [x] T3. Crear validator Zod `listarMisEnviosSchema` en
  `backend/src/validators/clienteValidator.ts` (nuevo archivo) que valide
  `{ page?, limit?, estado? }` con los mismos tipos que `listarEnviosSchema`
  pero con `limit` default `10` y sin campos `cliente` ni `codigo`.

- [x] T4. Añadir función `listarMisEnvios(usuarioId: string, query: ListarMisEnviosInput)`
  al servicio existente `backend/src/services/envioService.ts`.
  Pasos: (a) resolver `clienteId` vía `clienteRepository.findByUsuarioId`;
  (b) lanzar `AppError('CLIENTE_NOT_FOUND', ..., 404)` si no existe;
  (c) llamar a `envioRepository.findManyByClienteId`;
  (d) mapear resultados al DTO `MisEnviosItemDto`;
  (e) retornar `{ data, meta }`.

- [x] T5. Añadir el tipo `MisEnviosItemDto` e interfaz `PaginatedMisEnviosResponse`
  a `backend/src/types/envioTypes.ts`.

- [x] T6. Crear controlador `misEnviosClienteHandler` en
  `backend/src/controllers/clienteController.ts`.
  Pasos: parsear query con `listarMisEnviosSchema`; llamar a
  `envioService.listarMisEnvios(req.user!.id, query)`; responder 200.

- [x] T7. Registrar la ruta en `backend/src/routes/clientes.ts`:
  `GET /me/envios` con `authMiddleware` + `roleMiddleware('CLIENTE')` +
  `misEnviosClienteHandler`.

- [x] T8. Escribir tests backend en un nuevo archivo
  `backend/src/tests/misEnviosCliente.test.ts` usando Jest + Supertest:
  - R1 — debe retornar 200 con envíos del cliente autenticado (auth CLIENTE)
  - R2 — debe respetar paginación `?page=1&limit=2` con meta correcta
  - R3 — debe filtrar por `?estado=ENTREGADO` retornando solo envíos entregados
  - R4 — debe retornar 401 sin token
  - R5 — debe retornar 403 con token de rol OPERADOR
  - R6 — debe retornar lista vacía si el cliente no tiene envíos
  - R7 — debe retornar 404 si el usuarioId no tiene registro Cliente asociado

---

## Frontend

- [x] T9. Crear `frontend/src/types/misEnviosTypes.ts` con interfaces
  `MisEnviosItemDto` y `MisEnviosFilters` (campos: `page?`, `limit?`, `estado?`).

- [x] T10. Añadir método `listar(filters: MisEnviosFilters)` al servicio
  `frontend/src/services/clienteService.ts` que llame a
  `GET /clientes/me/envios` con los query params correspondientes y retorne
  `PaginatedResponse<MisEnviosItemDto>`.

- [x] T11. Crear hook `frontend/src/hooks/useMisEnvios.ts` con TanStack Query:
  `queryKey: ['mis-envios', filters]`, `queryFn` delegando al service.

- [x] T12. Crear directorio `frontend/src/features/cliente/` y dentro el
  componente `MisEnvios.tsx`. Implementar:
  - Estado local: `page` (default 1) y `estadoFiltro` (default `''`).
  - Selector de estado (opción "Todos" + valores del enum).
  - Tabla con columnas: Código | Estado (badge) | Destinatario | Fecha creación.
  - Botón "Rastrear" por fila que navega a `/tracking/:codigoSeguimiento`.
  - Mensaje vacío `"Aún no tienes envíos registrados"` cuando `data.length === 0`.
  - Indicador de carga mientras `isLoading`.
  - Mensaje de error si `isError`.
  - Paginación inferior cuando `meta.totalPages > 1` (mismo patrón que
    `ConsultarEnvios.tsx`).

- [x] T13. Actualizar `frontend/src/router/index.tsx`: eliminar el componente
  inline `MisEnviosPage` y reemplazarlo por `<MisEnvios />` importado desde
  `@/features/cliente/MisEnvios`.

- [x] T14. Escribir tests frontend en
  `frontend/src/features/cliente/__tests__/MisEnvios.test.tsx` con Vitest +
  Testing Library:
  - R8 — debe renderizar tabla con columnas Código, Estado, Destinatario, Fecha
  - R9 — debe mostrar badge con clases correctas para cada estado (al menos
    PENDIENTE, ENTREGADO, CANCELADO)
  - R10 — debe navegar a `/tracking/:codigo` al pulsar "Rastrear"
  - R11 — debe renderizar controles de paginación cuando totalPages > 1
  - R12 — debe mostrar mensaje "Aún no tienes envíos registrados" con lista vacía
  - R13 — debe mostrar indicador de carga mientras isLoading es true
  - R14 — debe mostrar mensaje de error si la API falla
  - R15 — debe re-fetchar con `?estado` al cambiar el selector de filtro

---

## Verificación

- [x] T15. Ejecutar `./init.sh` desde la raíz del proyecto y confirmar que
  todos los checks (lint + tests backend + tests frontend + validación de
  feature_list.json/specs) pasan con exit 0.
