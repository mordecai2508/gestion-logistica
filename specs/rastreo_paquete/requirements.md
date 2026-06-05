# Requirements — rastreo_paquete

> Feature id: 6 | Sprint 3 | Historias: HU14, HU15, HU16, HU17
> Notación EARS. Cada requisito es una sola idea. Solo SHALL (obligatorio).

---

## Endpoint público de rastreo

R1. WHEN a client sends `GET /api/v1/tracking/:codigo` with an existing tracking code THE SYSTEM SHALL return HTTP 200 with:
```json
{
  "data": {
    "codigoSeguimiento": "TRK-YYYYMMDD-XXXXXXXX",
    "estado": "<EstadoEnvio>",
    "remitente": "<string>",
    "destinatario": "<string>",
    "direccionDestino": "<string>",
    "ultimaActualizacion": "<ISO 8601 UTC>",
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
  "message": "Envío encontrado",
  "status": 200
}
```

R2. THE SYSTEM SHALL return the `eventos` array ordered by `timestamp` ascending.

R3. THE SYSTEM SHALL set `ultimaActualizacion` to the `timestamp` of the most recent `EventoEnvio` in the array.

R4. WHEN a client sends `GET /api/v1/tracking/:codigo` with a code that does not exist in the database THE SYSTEM SHALL return HTTP 404 with `{ error: "ENVIO_NOT_FOUND", message: "Envío no encontrado", statusCode: 404 }`.

R5. THE SYSTEM SHALL NOT require any authentication token on `GET /api/v1/tracking/:codigo`; the endpoint is publicly accessible.

R6. WHEN the `:codigo` path parameter is an empty string or does not match the format `TRK-YYYYMMDD-XXXXXXXX` THE SYSTEM SHALL return HTTP 422 with `{ error: "VALIDATION_ERROR", message: "Código de seguimiento inválido", statusCode: 422 }`.

---

## Socket.IO — emisión del repartidor

R7. WHEN an authenticated `REPARTIDOR` emits a Socket.IO event `location:update` with payload `{ envioId: string, lat: number, lng: number }` THE SYSTEM SHALL validate that `envioId`, `lat`, and `lng` are all present and of the correct types.

R8. WHEN the `location:update` payload is valid THE SYSTEM SHALL rebroadcast the event to the Socket.IO room `tracking:${envioId}` under the event name `tracking:location` with payload `{ envioId, lat, lng, timestamp: <ISO 8601 UTC> }`.

R9. WHEN the `location:update` payload is valid THE SYSTEM SHALL create a new `EventoEnvio` record with `estado` equal to the current `Envio.estado`, `descripcion = "Actualización de ubicación"`, `lat`, `lng`, and `timestamp = now()`, linked to the `Envio` identified by `envioId`.

R10. WHEN the `location:update` payload references an `envioId` that does not exist in the database THE SYSTEM SHALL emit a `tracking:error` event back to the emitting socket with `{ message: "Envío no encontrado" }` and SHALL NOT rebroadcast to any room.

R11. WHEN the `location:update` payload is missing required fields or contains non-numeric `lat`/`lng` THE SYSTEM SHALL emit a `tracking:error` event back to the emitting socket with `{ message: "Payload inválido" }` and SHALL NOT rebroadcast to any room.

---

## Socket.IO — sala de rastreo (cliente/operador)

R12. WHEN a frontend client connects to Socket.IO and emits a `tracking:join` event with `{ envioId: string }` THE SYSTEM SHALL add that socket to the room `tracking:${envioId}`.

R13. WHILE a socket is subscribed to room `tracking:${envioId}` THE SYSTEM SHALL forward every `tracking:location` broadcast to that socket in real time.

R14. WHEN a frontend client emits a `tracking:leave` event with `{ envioId: string }` THE SYSTEM SHALL remove that socket from the room `tracking:${envioId}`.

---

## Persistencia de ubicación en EventoEnvio

R15. THE SYSTEM SHALL store `lat` and `lng` as nullable `Float` fields on the `EventoEnvio` model; these fields are `null` for state-change events that do not originate from a location update.

R16. WHEN a new `EventoEnvio` is created via a `location:update` Socket.IO event THE SYSTEM SHALL populate `lat` and `lng` with the values from the event payload.

---

## Pantalla "Rastrear Paquete" (frontend)

R17. THE SYSTEM SHALL provide a screen at the route `/tracking` containing a text input labeled "Ingrese código de seguimiento" and a "Buscar" button, consistent with the wireframe.

R18. WHEN the user submits a tracking code via the "Buscar" button THE SYSTEM SHALL call `GET /api/v1/tracking/:codigo` and display the result without requiring the user to be authenticated.

R19. WHEN the API returns a valid tracking result THE SYSTEM SHALL display: a badge with the current `estado` (color-coded), the text "Última actualización: <fecha>" formatted as `DD/MM/YYYY – HH:MM AM/PM`, an interactive Leaflet map, and the event history timeline.

R20. WHEN the tracking result includes at least one `EventoEnvio` with non-null `lat`/`lng` THE SYSTEM SHALL center the Leaflet map on the coordinates of the most recent such event and display a marker at those coordinates.

R21. WHEN no `EventoEnvio` in the result has non-null `lat`/`lng` THE SYSTEM SHALL render the Leaflet map centered on a default coordinate (lat: 4.711, lng: -74.0721, zoom 12) without a marker.

R22. THE SYSTEM SHALL display the event history as a vertical timeline with, for each event: an icon, the `timestamp` formatted as `DD/MM/YYYY – HH:MM AM/PM`, and the event `estado` as a label.

R23. WHEN the user is viewing a tracking result and a `tracking:location` Socket.IO event is received for the current `envioId` THE SYSTEM SHALL move the Leaflet map marker to the new `{ lat, lng }` coordinates without reloading the page.

R24. WHEN the `GET /api/v1/tracking/:codigo` call returns HTTP 404 THE SYSTEM SHALL display an error message "Código de seguimiento no encontrado" below the search input.

R25. WHEN the "Buscar" button is clicked with an empty input field THE SYSTEM SHALL display an inline validation message "Ingrese un código de seguimiento" and SHALL NOT call the API.

R26. THE SYSTEM SHALL connect to the Socket.IO room `tracking:${envioId}` immediately after a successful tracking lookup and disconnect from the room when the user navigates away from the tracking screen.

---

## Tests

R27. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/tracking/:codigo` with an existing code returns HTTP 200 with the correct response shape including the `eventos` array (covers R1, R2, R3).

R28. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/tracking/:codigo` with a non-existent code returns HTTP 404 (covers R4).

R29. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/tracking/:codigo` returns HTTP 200 without an `Authorization` header (covers R5).

R30. THE SYSTEM SHALL have a backend test that verifies: `GET /api/v1/tracking/INVALID` returns HTTP 422 (covers R6).

R31. THE SYSTEM SHALL have a backend test that verifies: a Socket.IO `location:update` event with a valid payload causes the server to emit `tracking:location` to the room `tracking:${envioId}` (covers R8).

R32. THE SYSTEM SHALL have a backend test that verifies: a Socket.IO `location:update` event with a valid payload creates a new `EventoEnvio` record with the correct `lat`, `lng`, and `descripcion` (covers R9).

R33. THE SYSTEM SHALL have a backend test that verifies: a Socket.IO `location:update` event referencing a non-existent `envioId` causes the server to emit `tracking:error` to the emitting socket (covers R10).

R34. THE SYSTEM SHALL have a backend test that verifies: a Socket.IO `location:update` event with a missing `lat` field causes the server to emit `tracking:error` to the emitting socket (covers R11).
