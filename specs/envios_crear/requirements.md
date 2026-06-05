# Requirements — envios_crear

> Feature id: 4 | Sprint 2 | Historias: HU7, HU8, HU9
> Notación EARS. Cada requisito es una sola idea. Solo SHALL (obligatorio).

---

## Autenticación y autorización

R1. WHEN a request reaches `POST /api/v1/envios` without a valid Bearer token THE SYSTEM SHALL reject it with HTTP 401 and `{ error: "MISSING_TOKEN" | "INVALID_TOKEN" | "EXPIRED_TOKEN", message: string, statusCode: 401 }`.

R2. WHEN a request reaches `POST /api/v1/envios` with a valid token whose role is not `OPERADOR` THE SYSTEM SHALL reject it with HTTP 403 and `{ error: "FORBIDDEN", message: "Acceso denegado: se requiere rol OPERADOR", statusCode: 403 }`.

---

## Creación del envío

R3. WHEN an authenticated `OPERADOR` submits a valid `POST /api/v1/envios` request THE SYSTEM SHALL persist a new `Envio` record with `estado = PENDIENTE` and return HTTP 201 with:
```json
{
  "data": {
    "id": "<cuid>",
    "codigoSeguimiento": "TRK-YYYYMMDD-XXXXXXXX",
    "estado": "PENDIENTE",
    "remitente": "<string>",
    "destinatario": "<string>",
    "direccionDestino": "<string>",
    "peso": "<number>",
    "dimensiones": "<string>",
    "descripcion": "<string | null>",
    "clienteId": "<string>",
    "createdAt": "<ISO 8601 UTC>"
  },
  "message": "Envío creado exitosamente",
  "status": 201
}
```

R4. WHEN creating a new `Envio` THE SYSTEM SHALL also atomically create an initial `EventoEnvio` record with `estado = PENDIENTE` and `descripcion = "Envío creado"`, linked to the new `Envio`, within the same database transaction.

---

## Código de seguimiento

R5. WHEN generating a tracking code THE SYSTEM SHALL produce a string matching the pattern `TRK-YYYYMMDD-XXXXXXXX`, where `YYYYMMDD` is the current UTC date and `XXXXXXXX` is exactly 8 uppercase alphanumeric characters generated randomly.

R6. WHEN the generated tracking code already exists in the database THE SYSTEM SHALL retry generation up to 3 times total.

R7. IF all 3 generation attempts produce a colliding tracking code THE SYSTEM SHALL return HTTP 500 with `{ error: "CODIGO_GENERATION_FAILED", message: "No se pudo generar un código de seguimiento único", statusCode: 500 }`.

---

## Validación de campos (Zod)

R8. THE SYSTEM SHALL validate the request body with the following rules before any database access:
- `remitente`: string, non-empty, required.
- `destinatario`: string, non-empty, required.
- `direccionDestino`: string, non-empty, required.
- `peso`: number, greater than 0, required.
- `dimensiones`: string matching format `WxHxD` where W, H, D are positive numbers (e.g. `30x20x15`), required.
- `clienteId`: string (cuid format), required.
- `descripcion`: string, optional.

R9. WHEN the request body fails Zod validation THE SYSTEM SHALL return HTTP 422 with `{ error: "VALIDATION_ERROR", message: string, statusCode: 422, details: ZodIssue[] }`.

---

## Verificación del cliente

R10. WHEN the `clienteId` provided in the body does not correspond to an existing record in the `Cliente` table THE SYSTEM SHALL return HTTP 404 with `{ error: "CLIENTE_NOT_FOUND", message: "Cliente no encontrado", statusCode: 404 }`.

---

## Pantalla (frontend)

R11. THE SYSTEM SHALL provide a screen titled "Nuevo Envío" containing the following form fields, in order: Remitente (text input), Destinatario (text input), Dirección destino (text input with map icon), Peso en kg (number input), Dimensiones en cm (text input), Descripción del paquete (textarea), Cliente (buscador/combobox que autoompleta por nombre o correo del cliente; al seleccionar una opción se almacena el clienteId).

R12. THE SYSTEM SHALL display a primary "GUARDAR ENVÍO" button and a secondary "Cancelar" button on the "Nuevo Envío" screen, consistent with the wireframe.

R13. WHEN a user clicks "Cancelar" on the "Nuevo Envío" screen THE SYSTEM SHALL navigate back to the previous screen without persisting any data.

R14. WHEN the "GUARDAR ENVÍO" form is submitted with invalid or missing required fields THE SYSTEM SHALL display inline field-level error messages without submitting to the API.

R15. WHEN the API returns HTTP 201 after form submission THE SYSTEM SHALL show a success Toast notification and navigate to the envíos list screen.

R16. WHEN the API returns an error after form submission THE SYSTEM SHALL display the error message in a Toast notification without resetting the form.

---

## Tests

R17. THE SYSTEM SHALL have a backend test that verifies: a valid POST request from an OPERADOR creates an Envio with estado PENDIENTE and returns 201 with the correct response shape (covers R3).

R18. THE SYSTEM SHALL have a backend test that verifies: the generated tracking code matches the pattern `TRK-YYYYMMDD-XXXXXXXX` and is unique in the database (covers R5, R6).

R19. THE SYSTEM SHALL have a backend test that verifies: when tracking code generation collides 3 times the endpoint returns HTTP 500 (covers R7).

R20. THE SYSTEM SHALL have a backend test that verifies: a request with missing or invalid fields (peso = 0, missing remitente, invalid dimensiones format) returns HTTP 422 (covers R8, R9).

R21. THE SYSTEM SHALL have a backend test that verifies: a request with a non-existent clienteId returns HTTP 404 (covers R10).

R22. THE SYSTEM SHALL have a backend test that verifies: a request without a token returns 401, and a request with a CLIENTE or REPARTIDOR token returns 403 (covers R1, R2).

R23. THE SYSTEM SHALL have a backend test that verifies: the initial EventoEnvio record is created atomically alongside the Envio in the same transaction (covers R4).
