# Requirements — rutas_gestion

> EARS notation. Un requisito = una sola idea. Sin mencionar implementación.

---

## Creación de ruta

R1. WHEN an operator submits a valid route creation request with at least one pending shipment, an available vehicle, and an available delivery person THE SYSTEM SHALL create the route with status PENDIENTE and return HTTP 201 with the created route data.

R2. WHEN an operator attempts to create a route without specifying at least one shipment THE SYSTEM SHALL reject the request with HTTP 422 and an error indicating that at least one shipment is required.

R3. WHEN an operator attempts to create a route and assigns a vehicle that is not in DISPONIBLE status THE SYSTEM SHALL reject the request with HTTP 422 indicating the vehicle is not available.

R4. WHEN an operator attempts to create a route and assigns a delivery person who is not available (`disponible = false`) THE SYSTEM SHALL reject the request with HTTP 422 indicating the delivery person is not available.

R5. WHEN an operator attempts to assign a shipment that is not in PENDIENTE status to a new route THE SYSTEM SHALL reject the request with HTTP 422 indicating the shipment cannot be assigned.

R6. WHEN an operator attempts to assign a shipment already assigned to another active route THE SYSTEM SHALL reject the request with HTTP 422 indicating the shipment is already assigned.

R7. WHEN a route is successfully created THE SYSTEM SHALL update the status of the assigned vehicle to EN_RUTA.

R8. WHEN a route is successfully created THE SYSTEM SHALL update the status of each assigned shipment from PENDIENTE to EN_RUTA.

---

## Consulta de rutas

R9. WHEN an operator requests the route list THE SYSTEM SHALL return a paginated list of routes including their status, assigned shipments, vehicle, and delivery person.

R10. WHEN a request includes pagination parameters `page` and `limit` THE SYSTEM SHALL return the corresponding page of results with metadata: `{ total, page, limit, totalPages }`.

R11. WHEN a delivery person authenticated as REPARTIDOR requests routes with the `repartidorId=me` filter THE SYSTEM SHALL return only the routes assigned to that delivery person.

R12. IF an operator or delivery person requests a route list without authentication THE SYSTEM SHALL reject the request with HTTP 401.

R13. IF a CLIENT role user attempts to access the route list THE SYSTEM SHALL reject the request with HTTP 403.

---

## Reasignación de ruta

R14. WHEN an operator submits a partial update to a route to change the assigned delivery person THE SYSTEM SHALL validate that the new delivery person is available and update the assignment.

R15. WHEN an operator submits a partial update to a route to change the assigned vehicle THE SYSTEM SHALL validate that the new vehicle is in DISPONIBLE status and update the assignment.

R16. WHEN a vehicle is replaced in a route THE SYSTEM SHALL set the previous vehicle's status back to DISPONIBLE and set the new vehicle's status to EN_RUTA.

R17. WHEN an operator attempts to reassign a resource (delivery person or vehicle) that does not exist THE SYSTEM SHALL return HTTP 404.

R18. WHEN an operator attempts to reassign resources to a route that has status COMPLETADA or CANCELADA THE SYSTEM SHALL reject the request with HTTP 422.

---

## Ruta óptima

R19. WHEN an operator requests the optimal stop order for a specific route THE SYSTEM SHALL return the shipments ordered by a nearest-neighbor heuristic based on the destination addresses of each shipment.

R20. IF a route has only one assigned shipment WHEN the optimal route is requested THE SYSTEM SHALL return that shipment as the only stop without applying any ordering algorithm.

R21. IF the geolocation coordinates of one or more shipments are not available WHEN the optimal route is requested THE SYSTEM SHALL return the stops in their current assignment order and include a warning indicating that coordinates are incomplete.

---

## Estado y cierre de ruta

R22. WHEN all shipments assigned to a route reach ENTREGADO or CANCELADO status THE SYSTEM SHALL automatically update the route status to COMPLETADA.

R23. WHEN a route is marked COMPLETADA THE SYSTEM SHALL set the vehicle status back to DISPONIBLE.

---

## Pantalla "Gestión de Rutas"

R24. THE SYSTEM SHALL display a route management screen accessible only to users with the OPERADOR role, matching the wireframe layout (Route ID, assigned shipments list with checkboxes, vehicle selector, delivery person selector, "Generar Ruta Óptima" button, "Guardar Ruta" button).

R25. WHEN the operator clicks "GENERAR RUTA ÓPTIMA" THE SYSTEM SHALL call the optimal route endpoint and reorder the shipments list in the UI according to the suggested order.

R26. WHEN an operator submits the route form with invalid or missing required fields THE SYSTEM SHALL display inline validation messages next to each invalid field without submitting the form.
