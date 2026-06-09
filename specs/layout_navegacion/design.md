# Design — layout_navegacion

> Feature 100% frontend. No hay endpoints nuevos ni cambios al schema Prisma.

---

## 1. Endpoints afectados

Ningún endpoint nuevo. La feature consume dos endpoints ya existentes de la feature `notificaciones`:

| Método | Ruta                              | Uso en layout                                          |
|--------|-----------------------------------|--------------------------------------------------------|
| GET    | /api/v1/notificaciones?limit=1    | Obtener `meta.total` de notificaciones no leídas para el badge |
| POST   | /api/v1/auth/logout (ya existe)   | Llamado al "Cerrar sesión" para limpiar la cookie del refreshToken |

> El badge de notificaciones no crea un endpoint dedicado de conteo no leído.
> En cambio se reutiliza `useNotificaciones` filtrando por `leida=false` (si el backend
> lo soporta) o contando `data.filter(n => !n.leida).length` en cliente.
> Revisar si `GET /api/v1/notificaciones` acepta `?leida=false`; si no, se hace la
> cuenta en cliente sobre la primera página (limit=50 no leídas). Ver decisión técnica §5.

---

## 2. Schema Prisma

Sin cambios. Esta feature no toca el backend.

---

## 3. Lógica de negocio no obvia

### 3.1 Unread badge count

El topbar necesita un contador de notificaciones no leídas que se actualice en tiempo real.

Flujo:
1. `useUnreadCount` (nuevo hook ligero) llama a `notificacionService.listar({ limit: 50 })`.
2. Filtra en cliente: `data.filter(n => !n.leida).length`.
3. Se suscribe a Socket.IO mediante `useNotificacionesSocket` (ya existe) con los mismos filtros para invalidar automáticamente el query cuando lleguen nuevas notificaciones.
4. Si el conteo supera 99, el badge muestra "99+".

### 3.2 Cerrar sesión

1. El componente `ProfileMenu` llama a `authService.logout()` (ya implementado: `POST /api/v1/auth/logout`).
2. Tras la respuesta (o en `onSettled` si falla), llama a `useAuthStore.getState().clearAuth()`.
3. Navega a `/login` con `useNavigate`.

### 3.3 Detección de ruta activa

Se usa el hook `useMatch` (o la prop `className` de `NavLink`) de React Router.
`NavLink` acepta una función en `className`: `({ isActive }) => isActive ? 'active-class' : ''`.
Esto aplica automáticamente la clase activa sin lógica extra.

---

## 4. Componentes / Pantallas Frontend

### 4.1 Componentes a crear

| Componente | Ubicación | Descripción |
|---|---|---|
| `OperadorLayout` | `frontend/src/components/shared/OperadorLayout.tsx` | Wrapper: sidebar + topbar + `<Outlet />`. Rol OPERADOR. |
| `RepartidorLayout` | `frontend/src/components/shared/RepartidorLayout.tsx` | Wrapper: `<Outlet />` + bottom nav bar. Rol REPARTIDOR. |
| `OperadorSidebar` | `frontend/src/components/shared/OperadorSidebar.tsx` | Sidebar izquierdo con los 7 NavLinks. Recibe `isOpen` + `onClose` (para mobile overlay). |
| `OperadorTopbar` | `frontend/src/components/shared/OperadorTopbar.tsx` | Topbar con SearchInput, NotificationBell, ProfileMenu. |
| `NotificationBell` | `frontend/src/components/shared/NotificationBell.tsx` | Ícono de campana + badge; usa `useUnreadCount`. |
| `ProfileMenu` | `frontend/src/components/shared/ProfileMenu.tsx` | Dropdown con nombre del usuario, "Ver perfil", "Cerrar sesión". |
| `RepartidorBottomNav` | `frontend/src/components/shared/RepartidorBottomNav.tsx` | Barra inferior con 4 NavLinks para REPARTIDOR. |
| `PlaceholderPage` | `frontend/src/components/shared/PlaceholderPage.tsx` | Página genérica "Próximamente" para rutas sin implementar. |

### 4.2 Hooks a crear

| Hook | Ubicación | Descripción |
|---|---|---|
| `useUnreadCount` | `frontend/src/hooks/useUnreadCount.ts` | Devuelve `{ count: number }`. Combina `useNotificaciones` + `useNotificacionesSocket` para contar notificaciones no leídas en tiempo real. |

### 4.3 Componentes a modificar

| Archivo | Modificación necesaria |
|---|---|
| `frontend/src/router/index.tsx` | Envolver las rutas de OPERADOR con `<OperadorLayout>` y las de REPARTIDOR con `<RepartidorLayout>` usando el patrón de layout route. |
| `frontend/src/features/repartidor/VistaRepartidor.tsx` | Eliminar el `<header>` y el `<nav>` inline (la campana hardcoded y la barra de navegación), ya que pasan a ser responsabilidad de `RepartidorLayout`. |
| `frontend/src/features/incidencias/GestionIncidencias.tsx` | Sin header propio de layout; ya renderiza su contenido principal. No necesita cambio estructural, solo confirmar que funciona dentro del `<Outlet />` de `OperadorLayout`. |

### 4.4 Estructura del router tras la integración

```
<BrowserRouter>
  <Routes>
    {/* Public routes — sin layout */}
    <Route path="/login" ... />
    <Route path="/register" ... />
    <Route path="/forgot-password" ... />
    <Route path="/reset-password" ... />
    <Route path="/tracking" ... />

    {/* Rutas compartidas CLIENTE — sin layout de rol */}
    <Route element={<ProtectedRoute allowedRoles={['CLIENTE']} />}>
      <Route path="/perfil" ... />
      <Route path="/notificaciones" ... />
      <Route path="/mis-envios" ... />
    </Route>

    {/* Rutas OPERADOR — con OperadorLayout como wrapper */}
    <Route element={<ProtectedRoute allowedRoles={['OPERADOR']} />}>
      <Route element={<OperadorLayout />}>
        <Route path="/dashboard" ... />
        <Route path="/envios/crear" ... />
        <Route path="/envios" ... />
        <Route path="/envios/:id" ... />
        <Route path="/rutas" ... />
        <Route path="/rutas/:id" ... />
        <Route path="/vehiculos" ... />
        <Route path="/incidencias" ... />
        <Route path="/reportes" element={<PlaceholderPage title="Reportes" />} />
        <Route path="/usuarios" element={<PlaceholderPage title="Usuarios" />} />
        {/* /perfil y /notificaciones dentro del layout (aprobado por el humano) */}
        <Route path="/perfil" ... />
        <Route path="/notificaciones" ... />
      </Route>
    </Route>

    {/* Rutas REPARTIDOR — con RepartidorLayout como wrapper */}
    <Route element={<ProtectedRoute allowedRoles={['REPARTIDOR']} />}>
      <Route element={<RepartidorLayout />}>
        <Route path="/repartidor/entregas" ... />
        <Route path="/repartidor/entregas/:id/confirmar" ... />
        <Route path="/repartidor/rutas" element={<PlaceholderPage title="Rutas" />} />
        <Route path="/repartidor/mapa" element={<PlaceholderPage title="Mapa" />} />
        <Route path="/repartidor/*" element={<PlaceholderPage title="Repartidor" />} />
        {/* /perfil y /notificaciones dentro del layout (aprobado por el humano) */}
        <Route path="/perfil" ... />
        <Route path="/notificaciones" ... />
      </Route>
    </Route>

    <Route path="/" element={<Navigate to="/login" replace />} />
  </Routes>
</BrowserRouter>
```

---

## 5. Decisión técnica clave

### Decisión A — Estrategia de layout automático: Layout Route vs. HOC vs. per-page

**Opción elegida: Layout Route (React Router v6 nested route sin `path`)**

Se inserta un `<Route element={<OperadorLayout />}>` sin `path` entre el `ProtectedRoute` y las rutas hijas de OPERADOR. `OperadorLayout` renderiza `<Outlet />` en su zona de contenido principal. Mismo patrón para `RepartidorLayout`.

**Alternativa descartada: HOC `withLayout(Component)`**
Requeriría envolver cada componente de página individualmente y replicar la misma invocación en cada archivo de feature. Es propenso a olvidos cuando se añaden páginas nuevas. Más difícil de testear de forma aislada.

**Alternativa descartada: Importar el layout dentro de cada componente de página**
VistaRepartidor ya hace esto hoy (header + nav inline). El problema es que cualquier cambio de layout requiere modificar cada componente de página. Ya se ve el anti-patrón en el código actual.

**Justificación:** el patrón de Layout Route es el recomendado por React Router v6, es el más declarativo, y garantiza que cualquier ruta nueva que se añada dentro del grupo hereda el layout automáticamente sin modificación adicional.

### Decisión B — Buscador global: funcional vs. placeholder

**Decisión: placeholder sin funcionalidad.**

Los criterios de aceptación de feature_list.json no incluyen ningún comportamiento de búsqueda (no hay endpoint, no hay pantalla de resultados, no hay test de búsqueda). El wireframe muestra la barra de búsqueda como elemento visual. El requisito R13 la marca explícitamente como UI placeholder. Se implementa como un `<input>` accesible que no hace nada al enviar. Una búsqueda funcional requiere especificación propia.

### Decisión C — Rutas no implementadas en el sidebar

Las rutas `/reportes` (id 18, `pending`) y `/usuarios` (sin feature id asignado) no tienen páginas reales.

**Decisión:** el sidebar incluye los enlaces a `/reportes` y `/usuarios` tal como pide el criterio de aceptación. En el router se registran esas rutas apuntando a `<PlaceholderPage>` (componente genérico "Próximamente"). Esto evita errores de router sin ocultar el trabajo pendiente.

Las rutas `/repartidor/rutas` y `/repartidor/mapa` ya existen como catch-all `<RepartidorPage>` en el router; se reemplazarán por `<PlaceholderPage>` con título específico.

**Pendiente de confirmación humana:** ¿es aceptable que `/usuarios` sea un `PlaceholderPage` dado que no hay feature id para esa sección? Ver sección de ambigüedades al final del documento.

### Decisión D — Badge de notificaciones: conteo en cliente vs. endpoint dedicado

**Decisión: conteo en cliente.**

`GET /api/v1/notificaciones` ya devuelve el campo `leida` en cada `NotificacionDto`. El nuevo hook `useUnreadCount` fetcha con `limit=50` y cuenta `data.filter(n => !n.leida).length`. Si el total de no leídas supera 50 se muestra "99+" directamente. No se crea un endpoint dedicado de conteo para evitar complejidad de backend innecesaria para esta feature de UI.

Si en el futuro el número de notificaciones no leídas crece sustancialmente, un endpoint `GET /api/v1/notificaciones/unread-count` sería la solución correcta, pero eso es una optimización futura.

### Decisión E — Refactorización de VistaRepartidor

`VistaRepartidor.tsx` actualmente tiene un `<header>` propio (con campana hardcoded) y un `<nav>` propio (barra inferior con NavLinks). Tras introducir `RepartidorLayout`, esos elementos quedan duplicados.

**Decisión:** el implementer debe eliminar el `<header>` y el `<nav>` de `VistaRepartidor` al integrarlo bajo `RepartidorLayout`. La barra de notificaciones del header de `VistaRepartidor` era un emoji hardcoded sin funcionalidad; `OperadorTopbar` / `RepartidorLayout` cubren esa necesidad correctamente.

---

## 6. Seguridad

- `OperadorLayout` y `RepartidorLayout` se renderizan únicamente dentro de grupos de rutas ya protegidos por `ProtectedRoute` — no se añade lógica de autenticación dentro del propio layout.
- El botón "Cerrar sesión" en `ProfileMenu` llama a `authService.logout()` que limpia la cookie `refreshToken` en el servidor antes de limpiar el estado local.
- No hay rutas nuevas que expongan datos protegidos; las páginas `PlaceholderPage` no realizan llamadas a la API.
- El sidebar y la barra inferior no filtran visualmente por rol (cada layout ya está dentro de su `ProtectedRoute` correcto), pero `OperadorLayout` y `RepartidorLayout` pueden verificar `user.rol` de `useAuthStore` como defensa en profundidad y redirigir si el rol no corresponde.

---

## 7. Decisiones confirmadas por el humano (gate spec_ready)

1. **`/usuarios`**: incluir en el sidebar con `PlaceholderPage`. ✅
2. **`/perfil` y `/notificaciones` dentro del layout**: sí, moverlas dentro de los grupos OPERADOR y REPARTIDOR (con sidebar/topbar). Para CLIENTE se mantienen en el grupo sin layout. Ver estructura del router en §4.4. ✅
3. **Refactorización de `VistaRepartidor`**: aprobada. Eliminar header/nav inline en T11. ✅
4. **Barra repartidor 'Rutas'**: `PlaceholderPage`, no redirigir a entregas. ✅
