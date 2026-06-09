# Requirements — layout_navegacion

> EARS notation. Un requisito = una sola idea. Solo el "qué", sin mencionar implementación.
> Cubre todos los criterios de aceptación de feature_list.json (id 13) y las historias HU40, HU41.

---

## Sidebar del Operador

R1. WHEN a user with role OPERADOR accesses any protected route THE SYSTEM SHALL render a sidebar on the left with navigation links to: Dashboard (/dashboard), Envíos (/envios), Rutas (/rutas), Vehículos (/vehiculos), Incidencias (/incidencias), Reportes (/reportes), and Usuarios (/usuarios).

R2. WHEN the current URL path matches a sidebar link THE SYSTEM SHALL apply an active CSS class to that link so it is visually distinguished from inactive links.

R3. WHEN the viewport width is less than 768px and the user is OPERADOR THE SYSTEM SHALL hide the sidebar and display a hamburger button instead.

R4. WHEN the user taps the hamburger button on mobile THE SYSTEM SHALL toggle the sidebar open as an overlay panel.

R5. WHEN the sidebar overlay is open and the user taps outside it or presses Escape THE SYSTEM SHALL close the sidebar overlay.

---

## Topbar del Operador

R6. WHEN a user with role OPERADOR accesses any protected OPERADOR route THE SYSTEM SHALL render a topbar containing: a global search input, a notification bell icon with an unread-count badge, and a profile menu trigger.

R7. IF the count of unread notifications is zero THE SYSTEM SHALL hide the badge on the notification bell icon.

R8. IF the count of unread notifications is greater than zero THE SYSTEM SHALL display that count in a badge overlaid on the notification bell icon; if the count exceeds 99 the badge SHALL display "99+".

R9. WHEN the user clicks the notification bell icon THE SYSTEM SHALL navigate to /notificaciones.

R10. WHEN the user clicks the profile menu trigger THE SYSTEM SHALL display a dropdown menu with two options: "Ver perfil" (navigates to /perfil) and "Cerrar sesión" (clears auth state and navigates to /login).

R11. THE SYSTEM SHALL display the current authenticated user's name in the profile menu trigger area.

R12. WHEN the user selects "Cerrar sesión" from the profile dropdown THE SYSTEM SHALL clear the authentication state (token + user) and redirect to /login.

---

## Buscador global (alcance acotado)

R13. THE SYSTEM SHALL render a search input in the topbar that accepts free text; in this release the search input is a UI placeholder — it does not perform any search query or navigate to results. It SHALL be visible and accessible (label/aria) but submitting it SHALL produce no action.

> Rationale: no acceptance criterion in feature_list.json covers search results or a results page.
> A functional search is deferred to a future feature. The input is present to match the wireframe.

---

## Barra de navegación inferior del Repartidor

R14. WHEN a user with role REPARTIDOR accesses any protected REPARTIDOR route THE SYSTEM SHALL render a bottom navigation bar with four tabs: Rutas (navigates to /repartidor/rutas), Entregas (navigates to /repartidor/entregas), Mapa (navigates to /repartidor/mapa), Perfil (navigates to /perfil).

R15. WHEN the current URL path matches a bottom navigation tab's target route THE SYSTEM SHALL apply an active visual style to that tab.

---

## Layout automático en rutas protegidas

R16. THE SYSTEM SHALL wrap all protected OPERADOR routes inside the OperadorLayout (sidebar + topbar) automatically, without each individual page component being responsible for rendering the layout.

R17. THE SYSTEM SHALL wrap all protected REPARTIDOR routes inside the RepartidorLayout (bottom navigation bar) automatically, without each individual page component being responsible for rendering the layout.

R18. WHEN the layout wrapper is rendered for OPERADOR routes THE SYSTEM SHALL render the page content in the main content area to the right of the sidebar (or full-width on mobile when sidebar is collapsed).

---

## Rutas aún no implementadas (decisión de alcance)

R19. IF a sidebar link target route does not yet have a corresponding page component in the router THE SYSTEM SHALL still render the link in the sidebar pointing to the expected path; navigating to that path SHALL render a placeholder page (e.g., "Próximamente") rather than a blank screen or a router error.

> Affected routes at time of spec: /reportes (id 18, pending), /usuarios (no feature id assigned yet),
> /dashboard (id 14, pending), /repartidor/rutas (id 15 partial — route exists as catch-all placeholder),
> /repartidor/mapa (no feature id assigned — route exists as catch-all placeholder).
> See design.md §5 for the decision on how to handle these.

---

## Tests requeridos

R20. THE SYSTEM SHALL have a test that verifies the OPERADOR sidebar renders all seven navigation links and applies the active class to the link matching the current route.

R21. THE SYSTEM SHALL have a test that verifies the sidebar collapses (is not visible) when the viewport is below 768px and the hamburger button is rendered instead.

R22. THE SYSTEM SHALL have a test that verifies the notification badge displays the correct unread count obtained from useNotificaciones.

R23. THE SYSTEM SHALL have a test that verifies "Cerrar sesión" clears auth state and redirects to /login.

R24. THE SYSTEM SHALL have a test that verifies the REPARTIDOR bottom navigation bar renders all four tabs and applies the active style to the tab matching the current route.
