# Requirements — vehiculos_gestion

> EARS notation. Un requisito = una sola idea. Sin mencionar implementación.

---

## Registro de vehículos

R1. WHEN an operator submits a vehicle registration request with a license plate, model, and capacity that are all valid and the license plate does not already exist THE SYSTEM SHALL create the vehicle with status DISPONIBLE and return HTTP 201 with the created vehicle data.

R2. WHEN an operator submits a vehicle registration request with a license plate that already exists THE SYSTEM SHALL reject the request with HTTP 409 and an error indicating the license plate is already registered.

R3. WHEN an operator submits a vehicle registration request missing required fields or with a non-positive capacity THE SYSTEM SHALL reject the request with HTTP 422 and validation details for each invalid field.

R4. IF a user without the OPERADOR role attempts to register a vehicle THE SYSTEM SHALL reject the request with HTTP 403.

R5. IF an unauthenticated user attempts to register a vehicle THE SYSTEM SHALL reject the request with HTTP 401.

---

## Consulta y disponibilidad de vehículos

R6. WHEN an operator requests the vehicle list THE SYSTEM SHALL return the vehicles including license plate, model, capacity, and status.

R7. WHEN a request to list vehicles includes the `estado` filter THE SYSTEM SHALL return only the vehicles whose status matches the requested value (DISPONIBLE | EN_RUTA | MANTENIMIENTO | FUERA_SERVICIO).

R8. IF a request to list vehicles includes an `estado` filter value that is not one of the four valid statuses THE SYSTEM SHALL reject the request with HTTP 422 indicating the value is invalid.

R9. IF an unauthenticated user attempts to list vehicles THE SYSTEM SHALL reject the request with HTTP 401.

R10. IF a user with the CLIENTE role attempts to list vehicles THE SYSTEM SHALL reject the request with HTTP 403.

---

## Actualización de estado

R11. WHEN an operator submits a request to change the status of an existing vehicle to one of the four valid statuses THE SYSTEM SHALL update the vehicle status and return HTTP 200 with the updated vehicle data.

R12. WHEN an operator submits a request to change the status of a vehicle to a value that is not one of the four valid statuses THE SYSTEM SHALL reject the request with HTTP 422 indicating the value is invalid.

R13. IF an operator attempts to update the status of a vehicle that does not exist THE SYSTEM SHALL return HTTP 404.

R14. IF an operator attempts to change the status of a vehicle that is currently assigned to an active route (status EN_RUTA) to a status other than DISPONIBLE or EN_RUTA THE SYSTEM SHALL reject the request with HTTP 422 indicating that the vehicle must be unassigned from its active route first.

R15. IF a user without the OPERADOR role attempts to update a vehicle's status THE SYSTEM SHALL reject the request with HTTP 403.

---

## Pantalla "Gestión de Vehículos"

R16. THE SYSTEM SHALL display a vehicle management screen accessible only to users with the OPERADOR role, matching the wireframe layout (title "Vehículos", table with columns Placa, Modelo, Capacidad, Estado, status badges, and the actions "+ Registrar Vehículo" and "Actualizar Estado").

R17. WHEN the operator submits the vehicle registration form with invalid or missing required fields THE SYSTEM SHALL display inline validation messages next to each invalid field without submitting the form.

R18. WHEN the operator selects a new status for a vehicle from the table and confirms the change THE SYSTEM SHALL send the update request and refresh the displayed status without requiring a full page reload.

R19. WHEN the vehicle list is filtered by status through the screen's filter control THE SYSTEM SHALL display only the vehicles matching the selected status.

R20. WHEN a vehicle registration is rejected because the license plate already exists THE SYSTEM SHALL display an inline error message indicating the duplicate plate without clearing the rest of the form fields.
