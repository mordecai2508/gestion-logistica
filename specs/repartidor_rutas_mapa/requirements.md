# Requirements — repartidor_rutas_mapa

> HU55, HU56, HU57 — "Repartidor: pantallas de Rutas, Mapa y cierre de sesión"
> Notación EARS. Un requisito = una sola idea. Solo el "qué", sin mencionar implementación.
> Cubre todos los criterios de aceptación de feature_list.json (id 19).
> Feature 100% frontend — no hay endpoints nuevos ni cambios al schema Prisma.

---

## Pantalla /repartidor/rutas

R1. WHEN a user with role REPARTIDOR accesses `/repartidor/rutas` THE SYSTEM SHALL replace the current placeholder page with a screen that requests the routes assigned to the authenticated repartidor.

R2. WHEN the routes request succeeds and returns at least one route THE SYSTEM SHALL render one route item per returned route, each showing at least its `código` and its `estado`.

R3. WHEN a rendered route item has associated envíos THE SYSTEM SHALL display the envíos included with that route.

R4. WHEN the routes request succeeds and returns zero routes THE SYSTEM SHALL display the message "No tienes rutas asignadas" instead of a route list.

R5. WHILE the routes request is in progress THE SYSTEM SHALL display a loading indicator in place of the route list.

R6. IF the routes request fails THEN THE SYSTEM SHALL display an accessible error message (`role="alert"`) informing the repartidor that the routes could not be loaded.

R7. THE SYSTEM SHALL request only the routes assigned to the authenticated repartidor, without exposing routes assigned to other repartidores.

---

## Pantalla /repartidor/mapa

R8. WHEN a user with role REPARTIDOR accesses `/repartidor/mapa` THE SYSTEM SHALL replace the current placeholder page with a screen that displays a read-only map.

R9. THE SYSTEM SHALL define the repartidor's "ruta activa" as the first route, in the order returned for that repartidor, whose `estado` is not a terminal state (`COMPLETADA` or `CANCELADA`).

R10. WHEN the repartidor has a ruta activa AND at least one envío of that ruta activa has both a latitude and a longitude value THE SYSTEM SHALL render a map with one marker for each envío of the ruta activa that has both a latitude and a longitude value.

R11. IF the repartidor has no ruta activa THEN THE SYSTEM SHALL display the message "Sin ubicaciones disponibles para mostrar" instead of the map.

R12. IF the repartidor has a ruta activa but none of its envíos have both a latitude and a longitude value THEN THE SYSTEM SHALL display the message "Sin ubicaciones disponibles para mostrar" instead of the map.

R13. THE SYSTEM SHALL NOT provide any controls on `/repartidor/mapa` to create, move, or delete markers, or to modify route or envío data — the map is read-only.

R14. WHILE the routes request is in progress THE SYSTEM SHALL display a loading indicator in place of the map area.

R15. IF the routes request fails THEN THE SYSTEM SHALL display an accessible error message (`role="alert"`) informing the repartidor that the map data could not be loaded.

---

## Botón "Cerrar sesión" en Mi Perfil

R16. THE SYSTEM SHALL display a "Cerrar sesión" button on the "Mi Perfil" screen for users with role CLIENTE, OPERADOR, or REPARTIDOR.

R17. WHEN a user clicks the "Cerrar sesión" button on the "Mi Perfil" screen THE SYSTEM SHALL invoke the session termination call to the backend.

R18. WHEN a user clicks the "Cerrar sesión" button on the "Mi Perfil" screen THE SYSTEM SHALL clear the locally stored authentication state regardless of whether the session termination call succeeds or fails.

R19. WHEN a user clicks the "Cerrar sesión" button on the "Mi Perfil" screen THE SYSTEM SHALL redirect the user to `/login`.

---

## Tests requeridos

R20. THE SYSTEM SHALL have a test that verifies `/repartidor/rutas` renders one item per route (with código, estado, and envíos) when the repartidor has assigned routes.

R21. THE SYSTEM SHALL have a test that verifies `/repartidor/rutas` renders the message "No tienes rutas asignadas" when the repartidor has zero assigned routes.

R22. THE SYSTEM SHALL have a test that verifies `/repartidor/mapa` renders one marker per envío with coordinates belonging to the ruta activa.

R23. THE SYSTEM SHALL have a test that verifies `/repartidor/mapa` renders the message "Sin ubicaciones disponibles para mostrar" when there is no ruta activa or no envío of the ruta activa has coordinates.

R24. THE SYSTEM SHALL have a test that verifies clicking "Cerrar sesión" on "Mi Perfil" invokes the logout call, clears the auth state, and navigates to `/login`.
