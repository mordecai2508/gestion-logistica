# Requirements — envios_consultar

> Feature id: 5 | Sprint 2 | Historias: HU10, HU11, HU12, HU13
> Notación EARS. Cada requisito es una sola idea. Solo SHALL (obligatorio).

---

## Autenticación y autorización

R1. WHEN a request reaches any endpoint under `/api/v1/envios` without a valid Bearer token THE SYSTEM SHALL reject it with HTTP 401 and `{ error: "MISSING_TOKEN" | "INVALID_TOKEN" | "EXPIRED_TOKEN", message: string, statusCode: 401 }`.

R2. WHEN a request reaches `GET /api/v1/envios`, `GET /api/v1/envios/:id`, `PATCH /api/v1/envios/:id`, or `DELETE /api/v1/envios/:id` with a valid token whose role is not `OPERADOR` THE SYSTEM SHALL reject it with HTTP 403 and `{ error: "FORBIDDEN", message: "Acceso denegado: se requiere rol OPERADOR", statusCode: 403 }`.

---

## Listar envíos (paginado y filtrable)

R3. WHEN an authenticated `OPERADOR` sends `GET /api/v1/envios` THE SYSTEM SHALL return HTTP 200 with a paginated list of `Envio` records in the format:
```json
{
  "data": [ /* array de EnvioListItemDto */ ],
  "meta": { "total": number, "page": number, "limit": number, "totalPages": number },
  "message": "Envíos obtenidos exitosamente",
  "status": 200
}
```

R4. WHEN the `GET /api/v1/envios` request omits `?page` or `?limit` THE SYSTEM SHALL default to `page=1` and `limit=20`.

R5. WHEN the `GET /api/v1/envios` request includes `?page` or `?limit` THE SYSTEM SHALL validate that both values are positive integers; if either fails validation THE SYSTEM SHALL return HTTP 422 with `{ error: "VALIDATION_ERROR", message: string, statusCode: 422 }`.

R6. WHEN the `GET /api/v1/envios` request includes `?estado=<value>` THE SYSTEM SHALL return only the `Envio` records whose `estado` matches the given value exactly.

R7. WHEN the `GET /api/v1/envios` request includes `?cliente=<value>` THE SYSTEM SHALL return only the `Envio` records whose associated `Cliente.usuario.nombre` contains `<value>` (case-insensitive, partial match).

R8. WHEN the `GET /api/v1/envios` request includes `?codigo=<value>` THE SYSTEM SHALL return only the `Envio` records whose `codigoSeguimiento` contains `<value>` (case-insensitive, partial match).

R9. WHEN the `GET /api/v1/envios` request includes multiple filter parameters simultaneously THE SYSTEM SHALL apply all filters conjunctively (AND logic).

R10. WHEN the `GET /api/v1/envios` request includes `?estado=<value>` with a value that is not a valid `EstadoEnvio` enum entry THE SYSTEM SHALL return HTTP 422 with `{ error: "VALIDATION_ERROR", message: string, statusCode: 422 }`.

---

## Detalle de envío

R11. WHEN an authenticated `OPERADOR` sends `GET /api/v1/envios/:id` with a valid `id` THE SYSTEM SHALL return HTTP 200 with the full `Envio` record including its array of `EventoEnvio` entries ordered by `timestamp` ascending, in the format:
```json
{
  "data": {
    "id": "<cuid>",
    "codigoSeguimiento": "TRK-YYYYMMDD-XXXXXXXX",
    "estado": "<EstadoEnvio>",
    "remitente": "<string>",
    "destinatario": "<string>",
    "direccionDestino": "<string>",
    "peso": "<number>",
    "dimensiones": "<string>",
    "descripcion": "<string | null>",
    "clienteId": "<string>",
    "rutaId": "<string | null>",
    "createdAt": "<ISO 8601 UTC>",
    "updatedAt": "<ISO 8601 UTC>",
    "eventos": [
      {
        "id": "<cuid>",
        "estado": "<EstadoEnvio>",
        "descripcion": "<string>",
        "lat": "<number | null>",
        "lng": "<number | null>",
        "timestamp": "<ISO 8601 UTC>"
      }
    ]
  },
  "message": "Envío obtenido exitosamente",
  "status": 200
}
```

R12. WHEN the `:id` provided in `GET /api/v1/envios/:id` does not correspond to an existing `Envio` record THE SYSTEM SHALL return HTTP 404 with `{ error: "ENVIO_NOT_FOUND", message: "Envío no encontrado", statusCode: 404 }`.

---

## Edición de envío

R13. WHEN an authenticated `OPERADOR` sends `PATCH /api/v1/envios/:id` with a valid payload THE SYSTEM SHALL update the specified editable fields of the `Envio` record and return HTTP 200 with the updated `Envio` in the same shape as the detail response (R11), excluding the `eventos` array.

R14. THE SYSTEM SHALL permit editing only the following fields via `PATCH /api/v1/envios/:id`: `remitente`, `destinatario`, `direccionDestino`, `peso`, `dimensiones`, `descripcion`. All other fields (including `estado`, `codigoSeguimiento`, `clienteId`) SHALL NOT be modifiable through this endpoint.

R15. WHEN the `PATCH /api/v1/envios/:id` request body contains no recognized editable fields THE SYSTEM SHALL return HTTP 422 with `{ error: "VALIDATION_ERROR", message: "Se requiere al menos un campo editable", statusCode: 422 }`.

R16. WHEN the `PATCH /api/v1/envios/:id` request body contains fields that fail Zod validation (e.g. `peso <= 0`, `dimensiones` in wrong format) THE SYSTEM SHALL return HTTP 422 with `{ error: "VALIDATION_ERROR", message: string, statusCode: 422, details: ZodIssue[] }`.

R17. WHEN the `:id` provided in `PATCH /api/v1/envios/:id` does not correspond to an existing `Envio` record THE SYSTEM SHALL return HTTP 404 with `{ error: "ENVIO_NOT_FOUND", message: "Envío no encontrado", statusCode: 404 }`.

---

## Cancelación de envío

R18. WHEN an authenticated `OPERADOR` sends `DELETE /api/v1/envios/:id` and the target `Envio` has `estado = PENDIENTE` THE SYSTEM SHALL change its `estado` to `CANCELADO`, persist the change, and return HTTP 200 with `{ data: { id, codigoSeguimiento, estado: "CANCELADO" }, message: "Envío cancelado exitosamente", status: 200 }`.

R19. WHEN an authenticated `OPERADOR` sends `DELETE /api/v1/envios/:id` and the target `Envio` has `estado` other than `PENDIENTE` THE SYSTEM SHALL return HTTP 409 with `{ error: "INVALID_STATE_TRANSITION", message: "Solo se pueden cancelar envíos en estado PENDIENTE", statusCode: 409 }`.

R20. WHEN the `:id` provided in `DELETE /api/v1/envios/:id` does not correspond to an existing `Envio` record THE SYSTEM SHALL return HTTP 404 with `{ error: "ENVIO_NOT_FOUND", message: "Envío no encontrado", statusCode: 404 }`.

R21. WHEN an `Envio` is successfully cancelled (R18) THE SYSTEM SHALL atomically create a new `EventoEnvio` record with `estado = CANCELADO` and `descripcion = "Envío cancelado por operador"`, linked to the cancelled `Envio`, within the same database transaction.

---

## Pantalla (frontend)

R22. THE SYSTEM SHALL provide a screen titled "Consultar Envíos" containing a search bar with placeholder "Buscar por código, cliente o estado" and a search button (lupa icon), consistent with the wireframe.

R23. THE SYSTEM SHALL display a table on the "Consultar Envíos" screen with columns: Código, Cliente, Estado, Acciones (ver, editar, eliminar), consistent with the wireframe.

R24. THE SYSTEM SHALL display Estado values as color-coded badges: PENDIENTE (naranja/gris), EN_RUTA (azul), ENTREGADO (verde), CANCELADO (rojo), consistent with the wireframe.

R25. THE SYSTEM SHALL display pagination controls (< 1 2 3 >) at the bottom of the envíos table, consistent with the wireframe.

R26. THE SYSTEM SHALL display a "+ Nuevo Envío" button on the "Consultar Envíos" screen that navigates to `/envios/crear`.

R27. WHEN the user enters text in the search bar and submits (button click or Enter key) THE SYSTEM SHALL filter the displayed envíos by matching the search term against `codigoSeguimiento`, `cliente nombre`, or `estado` simultaneously.

R28. WHEN the user clicks the "ver" action on a table row THE SYSTEM SHALL navigate to the detail view of that envío, displaying all fields including the `EventoEnvio` history.

R29. WHEN the user clicks the "editar" action on a table row THE SYSTEM SHALL open an edit form pre-populated with the current editable fields of that envío.

R30. WHEN the user submits the edit form with valid data THE SYSTEM SHALL call `PATCH /api/v1/envios/:id`, show a success Toast, and refresh the table.

R31. WHEN the user clicks the "eliminar" (delete/cancel) action on a table row THE SYSTEM SHALL show a confirmation dialog before proceeding.

R32. WHEN the user confirms cancellation in the dialog THE SYSTEM SHALL call `DELETE /api/v1/envios/:id`; if the response is HTTP 200 THE SYSTEM SHALL show a success Toast and refresh the table.

R33. WHEN the `DELETE /api/v1/envios/:id` call returns HTTP 409 THE SYSTEM SHALL show an error Toast with the message from the API response and NOT remove the row from the table.

---

## Tests

R34. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios` without a token returns 401 and with a non-OPERADOR token returns 403 (covers R1, R2).

R35. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios` returns a paginated response with the correct `meta` shape when no filters are applied (covers R3, R4).

R36. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios?page=0` returns HTTP 422 (covers R5).

R37. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios?estado=PENDIENTE` returns only envíos with `estado = PENDIENTE` (covers R6).

R38. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios?cliente=<name>` returns only envíos whose client name contains the search term (covers R7).

R39. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios?codigo=<partial>` returns only matching envíos (covers R8).

R40. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios?estado=PENDIENTE&codigo=<partial>` applies both filters (covers R9).

R41. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios?estado=INVALID` returns HTTP 422 (covers R10).

R42. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios/:id` with a valid id returns the full detail including the `eventos` array ordered by timestamp (covers R11).

R43. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/envios/:id` with a non-existent id returns HTTP 404 (covers R12).

R44. THE SYSTEM SHALL have a backend test that verifies: `PATCH /api/v1/envios/:id` with valid editable fields returns HTTP 200 with the updated record (covers R13, R14).

R45. THE SYSTEM SHALL have a backend test that verifies: `PATCH /api/v1/envios/:id` with a body that attempts to change `estado` does not modify the `estado` field (covers R14).

R46. THE SYSTEM SHALL have a backend test that verifies: `PATCH /api/v1/envios/:id` with an empty body (no editable fields) returns HTTP 422 (covers R15).

R47. THE SYSTEM SHALL have a backend test that verifies: `PATCH /api/v1/envios/:id` with invalid field values (e.g. `peso = -1`) returns HTTP 422 (covers R16).

R48. THE SYSTEM SHALL have a backend test that verifies: `DELETE /api/v1/envios/:id` on a PENDIENTE envío changes its estado to CANCELADO and returns HTTP 200 (covers R18, R21).

R49. THE SYSTEM SHALL have a backend test that verifies: `DELETE /api/v1/envios/:id` on a non-PENDIENTE envío returns HTTP 409 (covers R19).

R50. THE SYSTEM SHALL have a backend test that verifies: `DELETE /api/v1/envios/:id` with a non-existent id returns HTTP 404 (covers R20).
