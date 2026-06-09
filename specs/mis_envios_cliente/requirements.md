# Requirements — mis_envios_cliente

> Historias: HU47, HU48
> Notación: EARS (Easy Approach to Requirements Syntax)

---

## Endpoint — GET /api/v1/clientes/me/envios

**R1.** WHEN an authenticated CLIENTE sends `GET /api/v1/clientes/me/envios`
THE SYSTEM SHALL return HTTP 200 with a paginated list of shipments that
belong exclusively to that client, including fields: `id`, `codigoSeguimiento`,
`estado`, `destinatario`, `createdAt`.

**R2.** THE SYSTEM SHALL support query parameters `?page` (positive integer,
default 1) and `?limit` (positive integer, default 10) to paginate results,
returning a `meta` object with `{ total, page, limit, totalPages }`.

**R3.** IF the query parameter `?estado` is provided THE SYSTEM SHALL filter
the returned list to only include shipments with the matching `EstadoEnvio`
value; invalid values SHALL return HTTP 422.

**R4.** WHEN an unauthenticated request (no `Authorization` header or invalid
token) is received THE SYSTEM SHALL return HTTP 401 with
`{ error: "MISSING_TOKEN" | "INVALID_TOKEN" | "EXPIRED_TOKEN", statusCode: 401 }`.

**R5.** WHEN an authenticated user whose role is NOT CLIENTE (e.g., OPERADOR or
REPARTIDOR) calls the endpoint THE SYSTEM SHALL return HTTP 403.

**R6.** IF the authenticated CLIENTE has no shipments (filtered or unfiltered)
THE SYSTEM SHALL return HTTP 200 with `{ data: [], meta: { total: 0, ... } }`.

**R7.** THE SYSTEM SHALL resolve the `clienteId` from the `usuarioId` embedded in
the JWT token; if no `Cliente` record exists for that `usuarioId` THE SYSTEM
SHALL return HTTP 404 with `{ error: "CLIENTE_NOT_FOUND" }`.

---

## Pantalla — Mis Envíos (frontend, ruta `/mis-envios`)

**R8.** WHEN the authenticated CLIENTE navigates to `/mis-envios` THE SYSTEM
SHALL display a table with columns: Código, Estado (colored badge), Destinatario,
Fecha creación.

**R9.** THE SYSTEM SHALL render a colored badge per shipment state using the
following mapping: PENDIENTE → orange, EN_PREPARACION → yellow, EN_TRANSITO →
blue, EN_RUTA → blue, ENTREGADO → green, CANCELADO → red, FALLIDO → gray.

**R10.** THE SYSTEM SHALL render a "Rastrear" button on each table row that
navigates to `/tracking/:codigoSeguimiento` when clicked.

**R11.** IF the paginated response contains more than 10 shipments across all
pages (i.e., `meta.totalPages > 1`) THE SYSTEM SHALL display a pagination
control below the table showing previous/next arrows and page number buttons.

**R12.** IF the client has no shipments (the API returns an empty `data` array)
THE SYSTEM SHALL display the message "Aún no tienes envíos registrados" in
place of the table.

**R13.** WHILE the shipment list is loading THE SYSTEM SHALL display a loading
indicator in place of the table.

**R14.** IF the API call fails THE SYSTEM SHALL display an error message to the
user without crashing the page.

**R15.** THE SYSTEM SHALL provide a dropdown or select control that allows the
CLIENTE to filter the list by `estado`; selecting an option SHALL re-fetch the
list from the server with the corresponding `?estado` query parameter.
