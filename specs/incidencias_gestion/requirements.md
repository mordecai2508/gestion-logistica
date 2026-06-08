# Requirements — incidencias_gestion

> Notación EARS. Un requisito = una sola idea. "SHALL" = obligatorio,
> "SHOULD" = deseable (marcado explícitamente). No se describe implementación.

---

## Creación de incidencias (HU32)

R1. WHEN a repartidor submits a new incidencia with a valid `envioId`, a `tipo`
    in `{ENTREGA_FALLIDA, CLIENTE_AUSENTE, DAÑO, DIRECCION_INCORRECTA, OTRO}` and
    a non-empty `descripcion`, THE SYSTEM SHALL create the incidencia linked to
    that envío with initial estado `ABIERTA` and return HTTP 201 with the
    created incidencia.

R2. IF the `envioId` referenced in an incidencia creation request does not
    correspond to an existing envío THEN THE SYSTEM SHALL respond with HTTP 404
    and an error indicating that the envío was not found.

R3. IF an incidencia creation request is missing required fields, has an empty
    `descripcion`, or has a `tipo` outside the allowed set THEN THE SYSTEM SHALL
    respond with HTTP 422 and the corresponding validation details.

R4. IF a user whose role is not REPARTIDOR attempts to create an incidencia
    THEN THE SYSTEM SHALL respond with HTTP 403 and SHALL NOT create the
    incidencia.

R5. IF a request to create an incidencia is made without a valid authentication
    token THEN THE SYSTEM SHALL respond with HTTP 401 and SHALL NOT create the
    incidencia.

---

## Listado y consulta de incidencias (HU33)

R6. WHEN an operador requests the list of incidencias THE SYSTEM SHALL return a
    paginated collection of incidencias ordered by most recent first, including
    for each one its code/identifier, tipo, descripción, estado, the related
    envío's tracking code and creation date.

R7. WHEN an operador requests the list of incidencias with a `tipo` filter THE
    SYSTEM SHALL return only incidencias whose `tipo` matches the supplied
    value.

R8. WHEN an operador requests the list of incidencias with an `estado` filter
    THE SYSTEM SHALL return only incidencias whose `estado` matches the
    supplied value.

R9. WHEN an operador requests the list of incidencias with both `tipo` and
    `estado` filters THE SYSTEM SHALL return only incidencias that satisfy both
    conditions simultaneously.

R10. IF a list request includes a `tipo` or `estado` value outside the allowed
     enumerations, or invalid pagination parameters, THEN THE SYSTEM SHALL
     respond with HTTP 422 and the corresponding validation details.

R11. IF a user whose role is not OPERADOR attempts to list incidencias THEN THE
     SYSTEM SHALL respond with HTTP 403 and SHALL NOT return any incidencia
     data.

R12. IF a request to list incidencias is made without a valid authentication
     token THEN THE SYSTEM SHALL respond with HTTP 401.

---

## Cambio de estado de incidencias (HU33)

R13. WHEN an operador submits a new `estado` value in
     `{ABIERTA, EN_PROCESO, RESUELTA}` for an existing incidencia THE SYSTEM
     SHALL update the incidencia's estado to that value and return the updated
     incidencia.

R14. IF the `id` referenced in an incidencia status update request does not
     correspond to an existing incidencia THEN THE SYSTEM SHALL respond with
     HTTP 404 and an error indicating that the incidencia was not found.

R15. IF a status update request submits an `estado` value already equal to the
     incidencia's current estado, or attempts to move a `RESUELTA` incidencia to
     any other estado, THEN THE SYSTEM SHALL respond with HTTP 409 and SHALL NOT
     modify the incidencia.

R16. IF a status update request supplies an `estado` value outside
     `{ABIERTA, EN_PROCESO, RESUELTA}` or omits the `estado` field THEN THE
     SYSTEM SHALL respond with HTTP 422 and the corresponding validation
     details.

R17. IF a user whose role is not OPERADOR attempts to change an incidencia's
     estado THEN THE SYSTEM SHALL respond with HTTP 403 and SHALL NOT modify the
     incidencia.

R18. IF a request to change an incidencia's estado is made without a valid
     authentication token THEN THE SYSTEM SHALL respond with HTTP 401.

---

## Reprogramación de entrega (HU34)

R19. WHEN an operador submits a new delivery date for an envío that is later
     than the current date and time THE SYSTEM SHALL record that date as the
     envío's reprogrammed delivery date, register the change in the envío's
     event history, and return the updated envío information.

R20. IF the `id` referenced in a reprogramming request does not correspond to
     an existing envío THEN THE SYSTEM SHALL respond with HTTP 404 and an error
     indicating that the envío was not found.

R21. IF a reprogramming request omits the new delivery date, supplies a date
     that cannot be parsed as a valid date, or supplies a date that is not
     later than the current date and time, THEN THE SYSTEM SHALL respond with
     HTTP 422 and the corresponding validation details, and SHALL NOT modify
     the envío.

R22. IF a reprogramming request targets an envío whose estado is `ENTREGADO`,
     `CANCELADO`, or `RESUELTA`-equivalent terminal state for the envío
     (`CANCELADO`) THEN THE SYSTEM SHALL respond with HTTP 409 indicating an
     invalid state transition and SHALL NOT modify the envío.

R23. IF a user whose role is not OPERADOR attempts to reprogram an envío's
     delivery THEN THE SYSTEM SHALL respond with HTTP 403 and SHALL NOT modify
     the envío.

R24. IF a request to reprogram an envío's delivery is made without a valid
     authentication token THEN THE SYSTEM SHALL respond with HTTP 401.

---

## Pantalla "Incidentes" (HU33)

R25. WHEN an operador opens the "Incidencias" screen THE SYSTEM SHALL display a
     table listing each incidencia's código/identificador, tipo, descripción
     and estado, along with actions to view and edit each row, matching the
     structure described in the wireframe reference.

R26. WHEN an operador applies tipo and/or estado filters on the "Incidencias"
     screen THE SYSTEM SHALL update the displayed table to show only the
     incidencias matching the selected filters.

R27. WHEN the number of incidencias exceeds a single page THE SYSTEM SHALL
     display pagination controls that allow the operador to navigate between
     pages of results.

R28. WHEN an operador selects the action to edit an incidencia from the table
     THE SYSTEM SHALL present a control to change that incidencia's estado
     among `{ABIERTA, EN_PROCESO, RESUELTA}` and submit the change.
