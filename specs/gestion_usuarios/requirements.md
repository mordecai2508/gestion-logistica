# Requirements — gestion_usuarios

> Feature ID: 20 | Sprint 6 | Stories: HU58, HU59, HU60

---

## Listado de usuarios (HU58)

R1. WHEN an authenticated OPERADOR sends `GET /api/v1/usuarios` THE SYSTEM SHALL return a paginated list of all registered users including each one's `id`, `nombre`, `correo`, `rol`, `telefono`, `activo`, and `createdAt`.

R2. THE SYSTEM SHALL apply pagination parameters `page` (default 1) and `limit` (default 20) to `GET /api/v1/usuarios`, responding with `{ data: UsuarioDto[], meta: { total, page, limit, totalPages } }`.

R3. WHEN an authenticated OPERADOR sends `GET /api/v1/usuarios?rol=CLIENTE`, `?rol=OPERADOR`, or `?rol=REPARTIDOR` THE SYSTEM SHALL return only users whose `rol` field matches the filter value.

R4. IF the `rol` query parameter on `GET /api/v1/usuarios` is present but is not one of `CLIENTE`, `OPERADOR`, or `REPARTIDOR` THE SYSTEM SHALL return HTTP 422 with validation error details.

R5. WHEN a request reaches `GET /api/v1/usuarios` without a valid JWT THE SYSTEM SHALL return HTTP 401 with `{ error: "UNAUTHORIZED", message: "Token requerido", statusCode: 401 }`.

R6. WHEN a request reaches `GET /api/v1/usuarios` with a valid JWT but a role other than `OPERADOR` THE SYSTEM SHALL return HTTP 403 with `{ error: "FORBIDDEN", message: "Acceso denegado", statusCode: 403 }`.

R7. THE SYSTEM SHALL never include the `password` field of a user in the response of `GET /api/v1/usuarios`.

---

## Detalle de usuario (HU59)

R8. WHEN an authenticated OPERADOR sends `GET /api/v1/usuarios/:id` with a valid user id THE SYSTEM SHALL return HTTP 200 with the user's full detail: `id`, `nombre`, `correo`, `rol`, `telefono`, `activo`, `createdAt`.

R9. WHEN an authenticated OPERADOR sends `GET /api/v1/usuarios/:id` with a non-existent id THE SYSTEM SHALL return HTTP 404 with `{ error: "NOT_FOUND", message: "Usuario no encontrado", statusCode: 404 }`.

R10. WHEN a request reaches `GET /api/v1/usuarios/:id` without a valid JWT THE SYSTEM SHALL return HTTP 401 with `{ error: "UNAUTHORIZED", message: "Token requerido", statusCode: 401 }`.

R11. WHEN a request reaches `GET /api/v1/usuarios/:id` with a valid JWT but a role other than `OPERADOR` THE SYSTEM SHALL return HTTP 403 with `{ error: "FORBIDDEN", message: "Acceso denegado", statusCode: 403 }`.

R12. THE SYSTEM SHALL never include the `password` field of a user in the response of `GET /api/v1/usuarios/:id`.

---

## Activar / desactivar usuario (HU60)

R13. WHEN an authenticated OPERADOR sends `PATCH /api/v1/usuarios/:id/estado` with a body `{ activo: boolean }` referring to a different user id THE SYSTEM SHALL update the user's `activo` field and return HTTP 200 with the updated user detail (`id`, `nombre`, `correo`, `rol`, `telefono`, `activo`, `createdAt`).

R14. IF the `PATCH /api/v1/usuarios/:id/estado` body does not contain an `activo` field of type boolean THE SYSTEM SHALL return HTTP 422 with validation error details.

R15. WHEN an authenticated OPERADOR sends `PATCH /api/v1/usuarios/:id/estado` with a non-existent id THE SYSTEM SHALL return HTTP 404 with `{ error: "NOT_FOUND", message: "Usuario no encontrado", statusCode: 404 }`.

R16. IF the `:id` path parameter of `PATCH /api/v1/usuarios/:id/estado` equals the id of the authenticated OPERADOR THE SYSTEM SHALL return HTTP 409 with `{ error: "CANNOT_DEACTIVATE_SELF", message: "No puedes desactivar tu propia cuenta", statusCode: 409 }` and SHALL NOT modify the `activo` field.

R17. WHEN a request reaches `PATCH /api/v1/usuarios/:id/estado` without a valid JWT THE SYSTEM SHALL return HTTP 401 with `{ error: "UNAUTHORIZED", message: "Token requerido", statusCode: 401 }`.

R18. WHEN a request reaches `PATCH /api/v1/usuarios/:id/estado` with a valid JWT but a role other than `OPERADOR` THE SYSTEM SHALL return HTTP 403 with `{ error: "FORBIDDEN", message: "Acceso denegado", statusCode: 403 }`.

---

## Bloqueo de inicio de sesión para cuentas inactivas (HU60)

R19. THE SYSTEM SHALL add a field `activo` (boolean, default `true`) to every user record.

R20. IF a user submits credentials for a user account whose `activo` field is `false` THEN THE SYSTEM SHALL return HTTP 403 with `{ error: "USER_INACTIVE", message: "...", statusCode: 403 }` from `POST /api/v1/auth/login` without issuing an `accessToken` or a `refreshToken`.

R21. THE SYSTEM SHALL evaluate the `activo` check on `POST /api/v1/auth/login` only after the submitted credentials (correo + password) have been validated as correct.

---

## Frontend — Pantalla de Gestión de Usuarios (HU58, HU59, HU60)

R22. THE SYSTEM SHALL display a screen titled "Gestión de Usuarios" accessible to authenticated OPERADORs at the route `/usuarios` within the `OperadorLayout`, replacing the existing placeholder screen.

R23. THE SYSTEM SHALL render a table on the "Gestión de Usuarios" screen with columns: Nombre, Correo, Rol, Estado (badge "Activo"/"Inactivo"), and Acciones.

R24. THE SYSTEM SHALL provide a filter control that allows the OPERADOR to filter the table by role (`Todos`, `CLIENTE`, `OPERADOR`, `REPARTIDOR`), re-fetching the list automatically when the filter changes.

R25. WHEN the OPERADOR clicks the "ver" action for a user THE SYSTEM SHALL display a detail view showing all fields: nombre, correo, rol, teléfono, estado (activo/inactivo), fecha de creación.

R26. THE SYSTEM SHALL render, for each row in the table, an action button labeled "Activar" when the user's `activo` field is `false`, and "Desactivar" when the user's `activo` field is `true`.

R27. WHEN the OPERADOR clicks the "Activar"/"Desactivar" action for a user THE SYSTEM SHALL call `PATCH /api/v1/usuarios/:id/estado` with the toggled `activo` value, display a success toast, and refresh the user list.

R28. IF the OPERADOR clicks the "Desactivar" action on their own user row THE SYSTEM SHALL display an error toast with the message returned by the API and SHALL NOT modify the table state.

R29. WHILE the user list is loading THE SYSTEM SHALL display a loading indicator and disable the filter controls.

R30. IF the API returns an error loading the user list THE SYSTEM SHALL display an error message and offer a retry action.

R31. THE SYSTEM SHALL display pagination controls on the "Gestión de Usuarios" screen that allow the OPERADOR to navigate between pages when there is more than one page of results.
