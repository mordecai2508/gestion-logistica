# Requirements — entregas_confirmacion

> EARS notation. Un requisito = una sola idea. Solo SHALL (obligatorio).
> Trazabilidad: cada R<n> debe aparecer como referencia en al menos un test.

---

## Listado de entregas del repartidor (GET /api/v1/entregas?repartidorId=me)

R1. WHEN an authenticated user with role REPARTIDOR sends `GET /api/v1/entregas?repartidorId=me` THE SYSTEM SHALL return HTTP 200 with a list of deliveries (envíos) assigned to that repartidor's active routes, separated into pending and completed groups, in `{ data: { pendientes: Entrega[], completadas: Entrega[] }, message: "Entregas obtenidas", status: 200 }`.

R2. WHEN `GET /api/v1/entregas?repartidorId=me` is requested THE SYSTEM SHALL classify as "pendiente" every delivery whose estado is one of `PENDIENTE`, `EN_PREPARACION`, `EN_TRANSITO`, or `EN_RUTA` and is assigned to a route of the requesting repartidor, and as "completada" every delivery whose estado is `ENTREGADO` or `FALLIDO`.

R3. WHEN a request reaches `GET /api/v1/entregas?repartidorId=me` without a valid Bearer token THE SYSTEM SHALL reject the request with HTTP 401.

R4. WHEN an authenticated user without role REPARTIDOR sends `GET /api/v1/entregas?repartidorId=me` THE SYSTEM SHALL reject the request with HTTP 403 and `{ error: "FORBIDDEN", message: "...", statusCode: 403 }`.

R5. WHEN an authenticated user with role REPARTIDOR sends `GET /api/v1/entregas?repartidorId=me` and that user has no associated repartidor profile THE SYSTEM SHALL reject the request with HTTP 404 and `{ error: "REPARTIDOR_NOT_FOUND", message: "...", statusCode: 404 }`.

R6. WHEN `GET /api/v1/entregas` is requested with a `repartidorId` value other than the literal `me` THE SYSTEM SHALL reject the request with HTTP 422 and a validation error indicating that only `repartidorId=me` is supported.

---

## Confirmación de entrega exitosa (POST /api/v1/envios/:id/confirmar)

R7. WHEN an authenticated user with role REPARTIDOR submits `POST /api/v1/envios/:id/confirmar` as `multipart/form-data` containing a valid evidence photo (`foto`), a valid signature image (`firma`), and the targeted envío exists, is assigned to a route of the requesting repartidor, and is in a state other than `ENTREGADO`, `CANCELADO`, or `FALLIDO`, THE SYSTEM SHALL persist the photo and signature, change the envío's estado to `ENTREGADO`, create a new `EventoEnvio` recording the transition with a timestamp, and return HTTP 200 with `{ data: { id, codigoSeguimiento, estado: "ENTREGADO", evidenciaFoto, firma, fechaEntrega }, message: "Entrega confirmada", status: 200 }`.

R8. WHEN an envío's estado changes to `ENTREGADO` as a result of `POST /api/v1/envios/:id/confirmar` THE SYSTEM SHALL create a `Notificacion` for the envío's client informing that the delivery has been completed.

R9. WHEN `POST /api/v1/envios/:id/confirmar` is submitted without a `foto` file, without a `firma` file, or with either field missing THE SYSTEM SHALL reject the request with HTTP 422 and a validation error indicating which file is missing.

R10. WHEN `POST /api/v1/envios/:id/confirmar` references an envío id that does not exist THE SYSTEM SHALL reject the request with HTTP 404 and `{ error: "ENVIO_NOT_FOUND", message: "...", statusCode: 404 }`.

R11. WHEN `POST /api/v1/envios/:id/confirmar` references an envío that is not assigned to any route of the requesting repartidor THE SYSTEM SHALL reject the request with HTTP 403 and `{ error: "FORBIDDEN", message: "...", statusCode: 403 }`.

R12. WHEN `POST /api/v1/envios/:id/confirmar` references an envío whose estado is already `ENTREGADO`, `CANCELADO`, or `FALLIDO` THE SYSTEM SHALL reject the request with HTTP 409 and `{ error: "INVALID_STATE_TRANSITION", message: "...", statusCode: 409 }` without modifying the envío.

R13. WHEN a request reaches `POST /api/v1/envios/:id/confirmar` without a valid Bearer token THE SYSTEM SHALL reject the request with HTTP 401.

R14. WHEN an authenticated user without role REPARTIDOR sends `POST /api/v1/envios/:id/confirmar` THE SYSTEM SHALL reject the request with HTTP 403 and `{ error: "FORBIDDEN", message: "...", statusCode: 403 }`.

---

## Registro de fallo de entrega (POST /api/v1/envios/:id/fallo)

R15. WHEN an authenticated user with role REPARTIDOR submits `POST /api/v1/envios/:id/fallo` as `multipart/form-data` containing a non-empty textual `nota` describing the reason, an optional evidence photo (`foto`), and the targeted envío exists, is assigned to a route of the requesting repartidor, and is in a state other than `ENTREGADO`, `CANCELADO`, or `FALLIDO`, THE SYSTEM SHALL change the envío's estado to `FALLIDO`, create a new `EventoEnvio` recording the failed attempt with the note and timestamp, create an `Incidencia` of tipo `ENTREGA_FALLIDA` linked to the envío with the note and the photo (when provided), and return HTTP 200 with `{ data: { id, codigoSeguimiento, estado: "FALLIDO", incidenciaId }, message: "Fallo de entrega registrado", status: 200 }`.

R16. WHEN an envío's estado changes to `FALLIDO` as a result of `POST /api/v1/envios/:id/fallo` THE SYSTEM SHALL create a `Notificacion` for the envío's client informing that the delivery attempt failed and the reason recorded.

R17. WHEN `POST /api/v1/envios/:id/fallo` is submitted without a `nota` field, or with `nota` as an empty string THE SYSTEM SHALL reject the request with HTTP 422 and a validation error indicating that `nota` is required.

R18. WHEN `POST /api/v1/envios/:id/fallo` references an envío id that does not exist THE SYSTEM SHALL reject the request with HTTP 404 and `{ error: "ENVIO_NOT_FOUND", message: "...", statusCode: 404 }`.

R19. WHEN `POST /api/v1/envios/:id/fallo` references an envío that is not assigned to any route of the requesting repartidor THE SYSTEM SHALL reject the request with HTTP 403 and `{ error: "FORBIDDEN", message: "...", statusCode: 403 }`.

R20. WHEN `POST /api/v1/envios/:id/fallo` references an envío whose estado is already `ENTREGADO`, `CANCELADO`, or `FALLIDO` THE SYSTEM SHALL reject the request with HTTP 409 and `{ error: "INVALID_STATE_TRANSITION", message: "...", statusCode: 409 }` without modifying the envío.

R21. WHEN a request reaches `POST /api/v1/envios/:id/fallo` without a valid Bearer token THE SYSTEM SHALL reject the request with HTTP 401.

R22. WHEN an authenticated user without role REPARTIDOR sends `POST /api/v1/envios/:id/fallo` THE SYSTEM SHALL reject the request with HTTP 403 and `{ error: "FORBIDDEN", message: "...", statusCode: 403 }`.

---

## Validación de archivos subidos

R23. WHEN any file is submitted as `foto` or `firma` to `POST /api/v1/envios/:id/confirmar` or `POST /api/v1/envios/:id/fallo` THE SYSTEM SHALL accept it only if its MIME type is `image/jpeg` or `image/png`; otherwise THE SYSTEM SHALL reject the request with HTTP 422 and `{ error: "INVALID_FILE_TYPE", message: "...", statusCode: 422 }` without persisting any change to the envío.

R24. WHEN any file is submitted as `foto` or `firma` to `POST /api/v1/envios/:id/confirmar` or `POST /api/v1/envios/:id/fallo` THE SYSTEM SHALL accept it only if its size is less than or equal to 5 MB; otherwise THE SYSTEM SHALL reject the request with HTTP 422 and `{ error: "FILE_TOO_LARGE", message: "...", statusCode: 422 }` without persisting any change to the envío.

R25. THE SYSTEM SHALL discard any file received under a field name other than `foto` or `firma` in `POST /api/v1/envios/:id/confirmar` and `POST /api/v1/envios/:id/fallo`.

---

## Pantallas (frontend)

R26. THE SYSTEM SHALL provide a screen "Vista Repartidor" that displays the authenticated repartidor's deliveries grouped into "Pendientes" and "Completadas" tabs, each delivery card showing código, dirección, and rango horario, consistent with the wireframe.

R27. THE SYSTEM SHALL provide a screen "Confirmación de Entrega" that displays the envío's código and cliente, an evidence photo capture control, a signature capture area, a "CONFIRMAR ENTREGA" action, and a link to report an incidencia (failed delivery), consistent with the wireframe.

R28. WHEN the repartidor submits the "Confirmación de Entrega" screen with a captured photo and signature THE SYSTEM SHALL send the confirmation request and, on success, navigate back to "Vista Repartidor" showing the delivery moved to "Completadas".

R29. WHEN the repartidor uses the "Reportar incidencia" link from the "Confirmación de Entrega" screen and submits a failure reason THE SYSTEM SHALL send the failed-delivery request and, on success, navigate back to "Vista Repartidor" showing the delivery moved to "Completadas" with estado `FALLIDO`.

R30. IF the confirmation or failure request is rejected by the backend THEN THE SYSTEM SHALL display the corresponding error message to the repartidor without navigating away from the "Confirmación de Entrega" screen.

---

## Cobertura de tests requerida

R31. THE SYSTEM SHALL include backend integration tests covering: R1 (listar entregas pendientes/completadas), R4 (rol incorrecto en GET /entregas), R7 (confirmación exitosa actualiza estado a ENTREGADO), R9 (archivos faltantes), R10 (envío no encontrado), R11 (envío no asignado al repartidor), R12 (transición de estado inválida), R15 (registro de fallo crea Incidencia y cambia estado a FALLIDO), R17 (nota faltante), R23 (MIME inválido), R24 (tamaño excede 5MB).

R32. THE SYSTEM SHALL include frontend component tests covering: render de `VistaRepartidor.tsx` con pestañas Pendientes/Completadas, render de `ConfirmacionEntrega.tsx`, envío del formulario de confirmación, y uso del link "Reportar incidencia".
