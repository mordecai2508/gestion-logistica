# Tasks — layout_navegacion

> Orden de implementación: componentes base → hooks → integración router → refactorización → tests.
> Marcar cada task `[x]` al completarla.
> El implementer debe seguir este orden; no saltar tasks.

---

- [x] T1. Crear `frontend/src/components/shared/PlaceholderPage.tsx`
  Componente mínimo que recibe `title: string` y muestra "Próximamente — {title}" centrado.
  Cubre: R19.

- [x] T2. Crear `frontend/src/hooks/useUnreadCount.ts`
  Llama a `notificacionService.listar({ limit: 50 })`, filtra `data.filter(n => !n.leida).length`,
  y llama internamente a `useNotificacionesSocket({})` para mantener el conteo actualizado en tiempo real.
  Devuelve `{ count: number }`.
  Cubre: R7, R8.

- [x] T3. Crear `frontend/src/components/shared/NotificationBell.tsx`
  Usa `useUnreadCount`. Renderiza un botón con ícono de campana (lucide-react `Bell`).
  Si `count > 0`: renderiza badge con el número (si count > 99, muestra "99+").
  Si `count === 0`: no renderiza el badge.
  Al hacer clic navega a `/notificaciones` con `useNavigate`.
  Cubre: R7, R8, R9.

- [x] T4. Crear `frontend/src/components/shared/ProfileMenu.tsx`
  Recibe `userName: string`.
  Muestra el nombre del usuario como trigger.
  Al hacer clic despliega un dropdown con opciones:
    - "Ver perfil" → `navigate('/perfil')`
    - "Cerrar sesión" → llama a `authService.logout()`, luego `clearAuth()` del store, luego `navigate('/login')`
  Usar estado local `isOpen` + `useRef` para cerrar al hacer clic fuera.
  Cubre: R10, R11, R12.

- [x] T5. Crear `frontend/src/components/shared/OperadorTopbar.tsx`
  Recibe `onMenuToggle: () => void` (para mobile hamburger).
  Contiene: botón hamburguesa (visible solo en mobile, llama `onMenuToggle`), input de búsqueda
  (placeholder "Buscar...", aria-label, `onSubmit` no hace nada — R13), `<NotificationBell />`,
  `<ProfileMenu userName={user.nombre} />` (lee `user` de `useAuthStore`).
  Cubre: R6, R13.

- [x] T6. Crear `frontend/src/components/shared/OperadorSidebar.tsx`
  Recibe `isOpen: boolean` y `onClose: () => void`.
  Lista de `NavLink` con los 7 ítems del sidebar usando `className={({ isActive }) => ...}` de React Router.
  Items: Dashboard (/dashboard), Envíos (/envios), Rutas (/rutas), Vehículos (/vehiculos),
         Incidencias (/incidencias), Reportes (/reportes), Usuarios (/usuarios).
  En desktop (>= 768px): siempre visible, fijo a la izquierda.
  En mobile (< 768px): panel deslizante tipo drawer controlado por `isOpen`; overlay oscuro detrás;
  cerrar al hacer clic en overlay o al presionar Escape (keydown listener).
  Cubre: R1, R2, R3, R4, R5.

- [x] T7. Crear `frontend/src/components/shared/OperadorLayout.tsx`
  Gestiona estado local `sidebarOpen: boolean` (default false).
  Renderiza: `<OperadorSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />`,
  `<OperadorTopbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />`,
  y `<Outlet />` en la zona de contenido principal.
  El layout usa CSS/Tailwind para estructura: sidebar fijo a la izquierda en desktop,
  contenido con padding-left para compensar el ancho del sidebar; en mobile el sidebar es overlay.
  Cubre: R1, R3, R4, R16, R18.

- [x] T8. Crear `frontend/src/components/shared/RepartidorBottomNav.tsx`
  Lista de `NavLink` con los 4 ítems usando `className={({ isActive }) => ...}`.
  Items: Rutas (/repartidor/rutas), Entregas (/repartidor/entregas), Mapa (/repartidor/mapa), Perfil (/perfil).
  Barra fija en la parte inferior con fondo blanco y borde superior.
  Cubre: R14, R15.

- [x] T9. Crear `frontend/src/components/shared/RepartidorLayout.tsx`
  Renderiza: `<Outlet />` (contenido principal) y `<RepartidorBottomNav />` fijo abajo.
  El contenido principal debe tener padding-bottom suficiente para no quedar detrás de la barra.
  Cubre: R14, R17.

- [x] T10. Modificar `frontend/src/router/index.tsx`
  Importar `OperadorLayout`, `RepartidorLayout`, `PlaceholderPage`.
  Insertar `<Route element={<OperadorLayout />}>` envolviendo todas las rutas OPERADOR existentes.
  Agregar rutas sin implementación: `/reportes` → `<PlaceholderPage title="Reportes" />`,
  `/usuarios` → `<PlaceholderPage title="Usuarios" />`.
  Insertar `<Route element={<RepartidorLayout />}>` envolviendo todas las rutas REPARTIDOR existentes.
  Reemplazar `<RepartidorPage>` catch-all con `<PlaceholderPage title="Repartidor" />`.
  Agregar `/repartidor/rutas` → `<PlaceholderPage title="Rutas" />`.
  Agregar `/repartidor/mapa` → `<PlaceholderPage title="Mapa" />`.
  Cubre: R1, R14, R16, R17, R19.

- [x] T11. Modificar `frontend/src/features/repartidor/VistaRepartidor.tsx`
  Eliminar el `<header>` (con campana emoji hardcoded) y el `<nav>` (barra inferior con NavLinks).
  El componente debe retornar únicamente el `<main>` con el contenido de entregas.
  Ajustar las clases CSS para que funcione dentro del `<Outlet />` de `RepartidorLayout`
  (sin `min-h-screen` propio ni `flex-col` que conflictúe con el layout padre).
  Cubre: R14, R17.

- [x] T12. Escribir tests en `frontend/src/components/shared/__tests__/OperadorSidebar.test.tsx`
  - R20: test que renderiza el sidebar con 7 NavLinks y aplica clase activa al link de la ruta actual.
    Mockear `useLocation` de React Router con una ruta específica (p.ej. '/rutas') y verificar que
    el enlace correspondiente tiene la clase activa.
  - R21: test que simula viewport < 768px (mockear `window.innerWidth` o usar media query mock)
    y verifica que el sidebar no es visible y el botón hamburguesa está presente.
  Cubre: R20, R21.

- [x] T13. Escribir tests en `frontend/src/components/shared/__tests__/NotificationBell.test.tsx`
  - R22: test con `useUnreadCount` mockeado devolviendo count > 0 → badge muestra el número.
  - R22: test con count = 0 → badge no está en el DOM.
  - R22: test con count = 100 → badge muestra "99+".
  Cubre: R22.

- [x] T14. Escribir tests en `frontend/src/components/shared/__tests__/ProfileMenu.test.tsx`
  - R23: test que hace clic en "Cerrar sesión", verifica que `authService.logout` fue llamado,
    que `clearAuth` del store fue llamado, y que la navegación fue a '/login'.
  Cubre: R23.

- [x] T15. Escribir tests en `frontend/src/components/shared/__tests__/RepartidorBottomNav.test.tsx`
  - R24: test que renderiza los 4 tabs y aplica clase activa al tab de la ruta actual
    (mockear `useLocation` con '/repartidor/entregas').
  Cubre: R24.

- [x] T16. Verificación final
  Desde la raíz del repositorio ejecutar `./init.sh`.
  Verificar que `npm run lint` pasa sin errores en frontend/.
  Verificar que `npm test` (Vitest) pasa con todos los tests nuevos en verde.
  Verificar que `npm run build` completa sin errores de TypeScript en frontend/.
