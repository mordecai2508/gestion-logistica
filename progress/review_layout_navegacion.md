# Review — layout_navegacion — APROBADO

Fecha: 2026-06-08
Reviewer: subagente `reviewer`
Feature id: 13, sprint 5
Tasks verificadas: T1–T16 (todas `[x]`)

---

## Trazabilidad R1–R24

| R# | Descripción | Test(s) que lo cubre | Archivo:línea | Estado |
|---|---|---|---|---|
| R1 | Sidebar OPERADOR con 7 enlaces | `R20 — renderiza los 7 enlaces...` | `OperadorSidebar.test.tsx:25` | ✅ |
| R2 | Clase activa en enlace de ruta actual | `R20 — aplica la clase activa (sidebar-link-active)...` | `OperadorSidebar.test.tsx:43` | ✅ |
| R3 | Sidebar oculto en viewport < 768px | `R21 — el aside de escritorio tiene clase "hidden"` | `OperadorSidebar.test.tsx:87` | ✅ |
| R4 | Toggle del drawer móvil con hamburguesa | `R21 — cuando isOpen es true, renderiza el panel drawer móvil` | `OperadorSidebar.test.tsx:94` | ✅ |
| R5 | Cerrar overlay con clic exterior/Escape | `R21 — cuando isOpen es false, no renderiza el panel drawer` + keydown listener en `useEffect` verificado en código | `OperadorSidebar.test.tsx:101` + `OperadorSidebar.tsx:36-47` | ✅ |
| R6 | Topbar con búsqueda, campana y perfil | Composición en `OperadorTopbar.tsx`; todos sus sub-componentes probados individualmente | `OperadorTopbar.tsx:10` | ✅ |
| R7 | Badge oculto cuando count=0 | `R22 — debe ocultar el badge cuando count === 0` | `NotificationBell.test.tsx:48` | ✅ |
| R8 | Badge muestra count; "99+" si >99 | `R22 — debe mostrar el badge con el número cuando count > 0` + `R22 — debe mostrar "99+"` | `NotificationBell.test.tsx:41,55` | ✅ |
| R9 | Clic en campana navega a /notificaciones | `R22 — debe navegar a /notificaciones al hacer clic en el botón` | `NotificationBell.test.tsx:78` | ✅ |
| R10 | Dropdown con "Ver perfil" y "Cerrar sesión" | `R23 — abre el dropdown al hacer clic en el trigger` | `ProfileMenu.test.tsx:54` | ✅ |
| R11 | Nombre del usuario en trigger | `R23 — muestra el nombre del usuario como trigger del menú` | `ProfileMenu.test.tsx:47` | ✅ |
| R12 | "Cerrar sesión" limpia auth y redirige a /login | `R23 — llama a authService.logout, clearAuth y navega a /login` | `ProfileMenu.test.tsx:74` | ✅ |
| R13 | Input de búsqueda accesible, sin acción al enviar | `onSubmit={(e) => e.preventDefault()}` + `aria-label="Buscar"` en `OperadorTopbar.tsx` | `OperadorTopbar.tsx:24` | ✅ |
| R14 | Bottom nav REPARTIDOR con 4 tabs | `R24 — renderiza los 4 tabs de navegación` | `RepartidorBottomNav.test.tsx:19` | ✅ |
| R15 | Estilo activo en tab de ruta actual | `R24 — aplica la clase activa (bottom-nav-active) al tab...` | `RepartidorBottomNav.test.tsx:28` | ✅ |
| R16 | OperadorLayout envuelve todas las rutas OPERADOR automáticamente | Router usa `<Route element={<OperadorLayout />}>` sin `path` dentro de `ProtectedRoute allowedRoles=['OPERADOR']` | `router/index.tsx:46` | ✅ |
| R17 | RepartidorLayout envuelve todas las rutas REPARTIDOR automáticamente | Router usa `<Route element={<RepartidorLayout />}>` sin `path` dentro de `ProtectedRoute allowedRoles=['REPARTIDOR']` | `router/index.tsx:65` | ✅ |
| R18 | Contenido OPERADOR en zona principal a la derecha del sidebar | `<main className="flex-1 overflow-auto p-6"><Outlet /></main>` dentro de flex-row en `OperadorLayout.tsx` | `OperadorLayout.tsx:19` | ✅ |
| R19 | PlaceholderPage para rutas sin implementación | `/reportes`, `/usuarios`, `/repartidor/rutas`, `/repartidor/mapa` apuntan a `<PlaceholderPage>` | `router/index.tsx:57,58,72,73` | ✅ |
| R20 | Test: sidebar renderiza 7 enlaces + clase activa | 3 tests en describe R20 — reales, no stubs | `OperadorSidebar.test.tsx:24` | ✅ |
| R21 | Test: sidebar colapsado en mobile / hamburguesa visible | 3 tests en describe R21 — mockean `window.innerWidth=375`, verifican `hidden` y presencia/ausencia del drawer | `OperadorSidebar.test.tsx:67` | ✅ |
| R22 | Test: badge con conteo correcto de useUnreadCount | 6 tests en describe R22 — cubren count=0, count>0, count=99, count=100, clic→navegar | `NotificationBell.test.tsx:39` | ✅ |
| R23 | Test: "Cerrar sesión" limpia auth y redirige | 5 tests en describe R23 — incluye escenario de logout con error de red | `ProfileMenu.test.tsx:46` | ✅ |
| R24 | Test: bottom nav renderiza 4 tabs + estilo activo | 5 tests en describe R24 — cubren cada tab como activo y verifica inactivos | `RepartidorBottomNav.test.tsx:18` | ✅ |

---

## Arquitectura: ✅

- Sin `fetch` directo en componentes: `useUnreadCount` usa `useNotificaciones` (TanStack Query); `ProfileMenu` usa `authService`; sin llamadas directas a `fetch`.
- Sin estado del servidor duplicado en Zustand: el conteo se computa desde el cache de TanStack Query.
- Sin `any` explícito en TypeScript: verificado con grep en todos los archivos nuevos y tests.
- Sin `console.log` de debug: verificado con grep en todos los archivos nuevos.
- Lógica en hooks/servicios: `useUnreadCount` encapsula el conteo; `ProfileMenu` delega logout a `authService`.
- Estado local correcto: `sidebarOpen` en `OperadorLayout`, `isOpen` en `ProfileMenu` — ambos son estado de UI local, correcto.

---

## Seguridad: ✅

- `OperadorLayout` y `RepartidorLayout` se renderizan **dentro** de `ProtectedRoute` con los roles correctos (`OPERADOR` y `REPARTIDOR` respectivamente).
- `/perfil` y `/notificaciones` dentro del layout de OPERADOR y REPARTIDOR: confirmado por el humano en gate `spec_ready` (design.md §7 decisión 2). Implementado correctamente en router.
- Badge de notificaciones: `useUnreadCount` consulta solo las notificaciones del usuario autenticado (hereda el token del interceptor de `api`). No hay riesgo de exposición cross-user.
- "Cerrar sesión" usa `try/finally`: incluso si `authService.logout()` falla por red, `clearAuth()` y la redirección a `/login` siempre se ejecutan.
- `PlaceholderPage` no realiza llamadas a la API.

---

## Convenios: ✅

- `NavLink` con `className={({ isActive }) => ...}` para enlace activo: cumplido en `OperadorSidebar` y `RepartidorBottomNav`.
- Colapso mobile con estado local `sidebarOpen` en `OperadorLayout`: cumplido.
- `PlaceholderPage` para rutas no implementadas: cumplido (`/reportes`, `/usuarios`, `/repartidor/rutas`, `/repartidor/mapa`).
- Naming consistente con `docs/conventions.md`: componentes en PascalCase, hooks en camelCase con prefijo `use`, archivos en PascalCase para componentes.
- `VistaRepartidor` refactorizado: eliminado `<header>` y `<nav>` inline (T11 ✅).

---

## Verificación: ✅ (124/124 tests, lint limpio, build exitoso)

- `npx vitest run`: **124/124 passing** — 24 archivos de test, 0 fallos.
  - Tests nuevos: 6 (OperadorSidebar) + 6 (NotificationBell) + 5 (ProfileMenu) + 5 (RepartidorBottomNav) = 22 tests nuevos, todos en verde.
- `npm run lint`: **PASS** — sin errores ni warnings de ESLint.
- `npm run build`: **PASS** — tsc + vite build completados sin errores TypeScript.
  - Warnings de bundle size y dynamic import de `authService` son pre-existentes al feature (no introducidos por esta feature).
- Todas las tasks T1–T16 marcadas `[x]` en `specs/layout_navegacion/tasks.md`.

---

**Decisión: APROBADO. El leader debe hacer el commit y luego marcar la feature como done.**
