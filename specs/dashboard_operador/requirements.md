# Requirements — dashboard_operador

> EARS notation. One idea per requirement. No implementation details.
> Stories: HU42, HU43, HU44.

---

## Backend — Endpoint de métricas

R1. WHEN an authenticated OPERADOR sends `GET /api/v1/dashboard/metrics` THE SYSTEM SHALL return HTTP 200 with `{ data: { totalEnvios, enRuta, entregados, incidenciasAbiertas }, message: string, status: 200 }`.

R2. THE SYSTEM SHALL compute `totalEnvios` as the count of all Envio records regardless of state.

R3. THE SYSTEM SHALL compute `enRuta` as the count of Envio records with estado `EN_RUTA`.

R4. THE SYSTEM SHALL compute `entregados` as the count of Envio records with estado `ENTREGADO`.

R5. THE SYSTEM SHALL compute `incidenciasAbiertas` as the count of Incidencia records with estado `ABIERTA`.

R6. WHEN an unauthenticated request is made to `GET /api/v1/dashboard/metrics` THE SYSTEM SHALL return HTTP 401.

R7. WHEN an authenticated CLIENTE or REPARTIDOR sends `GET /api/v1/dashboard/metrics` THE SYSTEM SHALL return HTTP 403.

---

## Backend — Endpoint de envíos recientes

R8. WHEN an authenticated OPERADOR sends `GET /api/v1/dashboard/envios-recientes` THE SYSTEM SHALL return HTTP 200 with `{ data: EnvioReciente[], message: string, status: 200 }`.

R9. THE SYSTEM SHALL return at most 5 Envio records ordered by `createdAt` descending (most recent first).

R10. THE SYSTEM SHALL include the following fields for each envío reciente: `codigoSeguimiento`, `clienteNombre` (the associated cliente's usuario nombre), `estado`, and `createdAt` in ISO 8601 format (UTC).

R11. WHEN an unauthenticated request is made to `GET /api/v1/dashboard/envios-recientes` THE SYSTEM SHALL return HTTP 401.

R12. WHEN an authenticated CLIENTE or REPARTIDOR sends `GET /api/v1/dashboard/envios-recientes` THE SYSTEM SHALL return HTTP 403.

---

## Backend — Endpoint de rutas pendientes

R13. WHEN an authenticated OPERADOR sends `GET /api/v1/dashboard/rutas-pendientes` THE SYSTEM SHALL return HTTP 200 with `{ data: RutaPendiente[], message: string, status: 200 }`.

R14. THE SYSTEM SHALL return at most 5 Ruta records with estado `PENDIENTE`, ordered by `createdAt` ascending (oldest first).

R15. THE SYSTEM SHALL include the following fields for each ruta pendiente: `id`, `codigo`, `nombre` (nullable), and `createdAt` in ISO 8601 format (UTC).

R16. WHEN an unauthenticated request is made to `GET /api/v1/dashboard/rutas-pendientes` THE SYSTEM SHALL return HTTP 401.

R17. WHEN an authenticated CLIENTE or REPARTIDOR sends `GET /api/v1/dashboard/rutas-pendientes` THE SYSTEM SHALL return HTTP 403.

---

## Backend — Endpoint de vehículos disponibles

R18. WHEN an authenticated OPERADOR sends `GET /api/v1/dashboard/vehiculos-disponibles` THE SYSTEM SHALL return HTTP 200 with `{ data: VehiculoDisponible[], message: string, status: 200 }`.

R19. THE SYSTEM SHALL return at most 5 Vehiculo records with estado `DISPONIBLE`, ordered by `placa` ascending.

R20. THE SYSTEM SHALL include the following fields for each vehículo disponible: `id`, `placa`, `modelo`, and `estado`.

R21. WHEN an unauthenticated request is made to `GET /api/v1/dashboard/vehiculos-disponibles` THE SYSTEM SHALL return HTTP 401.

R22. WHEN an authenticated CLIENTE or REPARTIDOR sends `GET /api/v1/dashboard/vehiculos-disponibles` THE SYSTEM SHALL return HTTP 403.

---

## Frontend — Pantalla Dashboard

R23. WHEN an OPERADOR navigates to `/dashboard` THE SYSTEM SHALL render a page with 4 metric cards displaying the values from `GET /api/v1/dashboard/metrics`.

R24. THE SYSTEM SHALL label the metric cards: "Total Envíos", "En Ruta", "Entregados", and "Incidencias Abiertas", each showing its corresponding numeric value.

R25. WHILE the metrics data is loading THE SYSTEM SHALL display a skeleton or loading state in place of each metric card.

R26. THE SYSTEM SHALL render a pie chart showing the distribution of Envio records by estado using the data from `GET /api/v1/dashboard/envios-recientes` combined with counts from `GET /api/v1/dashboard/metrics`.

R27. THE SYSTEM SHALL render a "Envíos Recientes" table with columns: Código, Cliente, Estado (badge with color), and Fecha, showing at most 5 rows from `GET /api/v1/dashboard/envios-recientes`.

R28. THE SYSTEM SHALL render a "Rutas Pendientes" panel listing at most 5 routes from `GET /api/v1/dashboard/rutas-pendientes`, each row showing the route `codigo` and an action arrow to navigate to `/rutas/:id`.

R29. THE SYSTEM SHALL render a "Vehículos Disponibles" panel with a table showing at most 5 vehicles from `GET /api/v1/dashboard/vehiculos-disponibles`, with columns: Placa, Modelo, Estado.

R30. WHEN any dashboard API call fails THE SYSTEM SHALL display an error message using the Shadcn/UI Toast component without crashing the rest of the page.

R31. THE SYSTEM SHALL include a floating "+ Nuevo Envío" button that navigates to `/envios/crear`.
