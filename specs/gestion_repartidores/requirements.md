# Requirements — gestion_repartidores

> Feature ID: 17 | Sprint 5 | Stories: HU49, HU50, HU51

---

## Listado de repartidores (HU49)

R1. WHEN an authenticated OPERADOR sends `GET /api/v1/repartidores` THE SYSTEM SHALL return a paginated list of all registered repartidores including each one's `id`, `licencia`, `disponible`, and the nested `usuario` fields `nombre`, `correo`, `telefono`.

R2. THE SYSTEM SHALL apply pagination parameters `page` (default 1) and `limit` (default 20) to `GET /api/v1/repartidores`, responding with `{ data: RepartidorDto[], meta: { total, page, limit, totalPages } }`.

R3. WHEN an authenticated OPERADOR sends `GET /api/v1/repartidores?disponible=true` or `?disponible=false` THE SYSTEM SHALL return only repartidores whose `disponible` field matches the filter value.

R4. WHEN a request reaches `GET /api/v1/repartidores` without a valid JWT THE SYSTEM SHALL return HTTP 401 with `{ error: "UNAUTHORIZED", message: "Token requerido", statusCode: 401 }`.

R5. WHEN a request reaches `GET /api/v1/repartidores` with a valid JWT but a role other than `OPERADOR` THE SYSTEM SHALL return HTTP 403 with `{ error: "FORBIDDEN", message: "Acceso denegado", statusCode: 403 }`.

---

## Detalle de repartidor (HU50)

R6. WHEN an authenticated OPERADOR sends `GET /api/v1/repartidores/:id` with a valid repartidor id THE SYSTEM SHALL return HTTP 200 with the repartidor's full detail: `id`, `licencia`, `disponible`, and nested `usuario` fields `nombre`, `correo`, `telefono`.

R7. WHEN an authenticated OPERADOR sends `GET /api/v1/repartidores/:id` with a non-existent id THE SYSTEM SHALL return HTTP 404 with `{ error: "NOT_FOUND", message: "Repartidor no encontrado", statusCode: 404 }`.

R8. WHEN a request reaches `GET /api/v1/repartidores/:id` without a valid JWT THE SYSTEM SHALL return HTTP 401 with `{ error: "UNAUTHORIZED", message: "Token requerido", statusCode: 401 }`.

R9. WHEN a request reaches `GET /api/v1/repartidores/:id` with a valid JWT but a role other than `OPERADOR` THE SYSTEM SHALL return HTTP 403 with `{ error: "FORBIDDEN", message: "Acceso denegado", statusCode: 403 }`.

---

## Actualización de repartidor (HU51)

R10. WHEN an authenticated OPERADOR sends `PATCH /api/v1/repartidores/:id` with a body containing at least one of `disponible` (boolean) or `licencia` (string) THE SYSTEM SHALL update the repartidor record and return HTTP 200 with the updated repartidor detail including nested `usuario` data.

R11. IF the `PATCH /api/v1/repartidores/:id` body contains neither `disponible` nor `licencia` THE SYSTEM SHALL return HTTP 422 with validation error details indicating that at least one field is required.

R12. IF `licencia` is provided in the `PATCH` body THE SYSTEM SHALL validate that it is a non-empty string with a minimum length of 1 character before persisting.

R13. WHEN an authenticated OPERADOR sends `PATCH /api/v1/repartidores/:id` with a non-existent id THE SYSTEM SHALL return HTTP 404 with `{ error: "NOT_FOUND", message: "Repartidor no encontrado", statusCode: 404 }`.

R14. WHEN a request reaches `PATCH /api/v1/repartidores/:id` without a valid JWT THE SYSTEM SHALL return HTTP 401 with `{ error: "UNAUTHORIZED", message: "Token requerido", statusCode: 401 }`.

R15. WHEN a request reaches `PATCH /api/v1/repartidores/:id` with a valid JWT but a role other than `OPERADOR` THE SYSTEM SHALL return HTTP 403 with `{ error: "FORBIDDEN", message: "Acceso denegado", statusCode: 403 }`.

---

## Frontend — Pantalla de Gestión de Repartidores (HU49, HU50, HU51)

R16. THE SYSTEM SHALL display a screen titled "Gestión de Repartidores" accessible to authenticated OPERADORs at the route `/repartidores` within the `OperadorLayout`.

R17. THE SYSTEM SHALL render a table on the "Gestión de Repartidores" screen with columns: Nombre, Correo, Teléfono, Licencia, Disponibilidad, and Acciones (ver detalle, editar).

R18. THE SYSTEM SHALL provide a filter control that allows the OPERADOR to filter the table by availability (`Todos`, `Disponible`, `No disponible`), re-fetching the list automatically when the filter changes.

R19. WHEN the OPERADOR clicks the "ver" action for a repartidor THE SYSTEM SHALL display a detail view showing all fields: nombre, correo, teléfono, licencia, disponibilidad.

R20. WHEN the OPERADOR clicks the "editar" action for a repartidor THE SYSTEM SHALL display an inline form or modal pre-filled with the repartidor's current `disponible` and `licencia` values.

R21. WHEN the OPERADOR submits the edit form with valid data THE SYSTEM SHALL call `PATCH /api/v1/repartidores/:id`, display a success toast, and refresh the repartidor list.

R22. WHILE the repartidor list is loading THE SYSTEM SHALL display a loading indicator and disable the filter controls.

R23. IF the API returns an error loading the repartidor list THE SYSTEM SHALL display an error message and offer a retry action.
