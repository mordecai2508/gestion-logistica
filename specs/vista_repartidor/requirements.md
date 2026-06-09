# Requirements — vista_repartidor

> HU45, HU46 — "Vista principal del repartidor"
> Notación EARS. Un requisito = una sola idea.

---

## Backend

R1. WHEN an authenticated REPARTIDOR sends GET /api/v1/repartidor/entregas THE SYSTEM SHALL return HTTP 200 with `{ data: { pendientes: EntregaListItemDto[], completadas: EntregaListItemDto[] }, message: string, status: 200 }`.

R2. THE SYSTEM SHALL classify envíos assigned to the repartidor as **pendientes** when their `estado` is one of `PENDIENTE`, `EN_PREPARACION`, `EN_TRANSITO`, or `EN_RUTA`; and as **completadas** when their `estado` is `ENTREGADO` or `FALLIDO`. Envíos with estado `CANCELADO` SHALL be excluded from both groups.

R3. WHEN an unauthenticated request is sent to GET /api/v1/repartidor/entregas THE SYSTEM SHALL return HTTP 401.

R4. WHEN a request with a non-REPARTIDOR role token is sent to GET /api/v1/repartidor/entregas THE SYSTEM SHALL return HTTP 403 with `{ error: "FORBIDDEN" }`.

R5. WHEN the authenticated user has no associated Repartidor profile THE SYSTEM SHALL return HTTP 404 with `{ error: "REPARTIDOR_NOT_FOUND" }`.

R6. THE SYSTEM SHALL include the following fields in each `EntregaListItemDto` returned by GET /api/v1/repartidor/entregas: `id`, `codigoSeguimiento`, `estado`, `destinatario`, `direccionDestino`, `rutaId`, `updatedAt` (ISO 8601 UTC).

---

## Frontend

R7. WHEN the REPARTIDOR lands on the `/repartidor/entregas` route THE SYSTEM SHALL display a screen titled "Mis Entregas" with two tabs: "Pendientes (n)" and "Completadas", where `n` is the dynamic count of pending deliveries returned by the API.

R8. WHEN the pendientes list is non-empty THE SYSTEM SHALL render one `EntregaCard` per pending delivery showing: a package icon, `codigoSeguimiento`, `direccionDestino`, and a formatted time reference derived from `updatedAt` as a rango horario placeholder.

R9. WHEN the completadas list is non-empty THE SYSTEM SHALL render one `EntregaCard` per completed delivery showing: a package icon, `codigoSeguimiento`, `direccionDestino`, and the formatted time reference. The card SHALL NOT show a navigation arrow.

R10. WHEN the pendientes list is empty THE SYSTEM SHALL display the message "No tienes entregas pendientes hoy" inside the Pendientes tab.

R11. WHEN a REPARTIDOR clicks on a pending delivery card THE SYSTEM SHALL navigate to `/repartidor/entregas/:id/confirmar`.

R12. WHILE the API call is in progress THE SYSTEM SHALL display a loading indicator in place of the tab content.

R13. WHEN the API call fails THE SYSTEM SHALL display an accessible error message (role="alert") informing the user that the deliveries could not be loaded.

R14. THE SYSTEM SHALL display each `EntregaCard` with: an `aria-label` that includes the `codigoSeguimiento` to support screen reader navigation.

R15. THE SYSTEM SHALL expose the screen at route `/repartidor/entregas`, wrapped in `RepartidorLayout` and protected by `ProtectedRoute` restricting access to role `REPARTIDOR`.
