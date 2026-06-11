# Tasks — repartidor_rutas_mapa

> Orden de implementación: componente de mapa → pantalla de rutas → pantalla de mapa →
> router → botón de logout en Perfil → tests.
> Marcar cada task `[x]` al completarla. Feature 100% frontend — no tocar `backend/`.

---

- [x] T1. Crear `frontend/src/features/repartidor/RepartidorMap.tsx`
  Componente de mapa Leaflet de solo lectura, modelado sobre `frontend/src/features/tracking/TrackingMap.tsx`:
  - Importa `leaflet/dist/leaflet.css`, aplica el mismo fix de iconos por defecto
    (`delete L.Icon.Default.prototype._getIconUrl` + `L.Icon.Default.mergeOptions(...)`).
  - Props: `{ envios: EnvioEnRutaDto[] }` (todos los envíos recibidos ya tienen `lat`/`lng` no nulos —
    el filtrado ocurre en el componente padre).
  - Renderiza `<MapContainer>` + `<TileLayer>` (mismo `url`/`attribution` de OpenStreetMap que `TrackingMap`)
    + un `<Marker position={[envio.lat, envio.lng]}>` por cada envío.
  - Centro inicial: coordenadas del primer envío del array (o el centroide simple si se prefiere,
    pero el primer punto es suficiente para cumplir R10). Zoom inicial fijo (p. ej. `13`).
  - No agrega controles de edición ni listeners de eventos de mapa (solo lectura — R13).
  Cubre: R10, R13.

- [x] T2. Crear `frontend/src/features/repartidor/RutasRepartidor.tsx`
  Pantalla `/repartidor/rutas`:
  - Usa `useRutas({ page: 1, limit: 50, repartidorId: 'me' })` de `@/hooks/useRutas`.
  - Título `<h1>Mis Rutas</h1>`.
  - Mientras `isLoading`: renderiza un indicador de carga (texto, p. ej. "Cargando rutas...") en vez de la lista. (R5)
  - Si `isError`: renderiza `<p role="alert">` con un mensaje indicando que no se pudieron cargar las rutas. (R6)
  - Si `data.data.length === 0` (y no loading/error): renderiza el texto exacto
    `"No tienes rutas asignadas"`. (R4)
  - Si `data.data.length > 0`: renderiza una `<Card>` por ruta (componente inline `RutaRepartidorCard`),
    mostrando `ruta.codigo`, un `<Badge>{ruta.estado}</Badge>` (mismo patrón que `RutaCard.tsx`),
    y una lista de sus `ruta.envios` (cada uno con `codigoSeguimiento`, `direccionDestino` y `estado`). (R2, R3)
  - Estructura de contenedor: `mx-auto max-w-md space-y-4 p-4` (mismo patrón que `VistaRepartidor.tsx`).
  Cubre: R1, R2, R3, R4, R5, R6, R7.

- [x] T3. Crear `frontend/src/features/repartidor/MapaRepartidor.tsx`
  Pantalla `/repartidor/mapa`:
  - Usa `useRutas({ page: 1, limit: 50, repartidorId: 'me' })` de `@/hooks/useRutas`.
  - Título `<h1>Mapa de Ruta Activa</h1>` (o equivalente).
  - Mientras `isLoading`: renderiza un indicador de carga en vez del mapa. (R14)
  - Si `isError`: renderiza `<p role="alert">` con un mensaje indicando que no se pudo cargar la información del mapa. (R15)
  - Si no loading/error: calcula la ruta activa con la función `obtenerRutaActiva` definida en
    `design.md` §3.1 (primera ruta de `data.data` cuyo `estado` no esté en `['COMPLETADA', 'CANCELADA']`).
  - Calcula `enviosConCoordenadas` (design.md §3.2): filtra `ruta.envios` donde `lat != null && lng != null`.
  - Si no hay ruta activa (R11) **o** `enviosConCoordenadas.length === 0` (R12):
    renderiza el texto exacto `"Sin ubicaciones disponibles para mostrar"`.
  - Si hay al menos un envío con coordenadas: renderiza `<RepartidorMap envios={enviosConCoordenadas} />`. (R10)
  Cubre: R8, R9, R10, R11, R12, R14, R15.

- [x] T4. Modificar `frontend/src/router/index.tsx`
  - Importar `RutasRepartidor` desde `@/features/repartidor/RutasRepartidor` y `MapaRepartidor` desde
    `@/features/repartidor/MapaRepartidor`.
  - Reemplazar `<Route path="/repartidor/rutas" element={<PlaceholderPage title="Rutas" />} />`
    por `<Route path="/repartidor/rutas" element={<RutasRepartidor />} />`.
  - Reemplazar `<Route path="/repartidor/mapa" element={<PlaceholderPage title="Mapa" />} />`
    por `<Route path="/repartidor/mapa" element={<MapaRepartidor />} />`.
  - Ambas rutas permanecen dentro del grupo existente
    `<ProtectedRoute allowedRoles={['REPARTIDOR']}>` → `<RepartidorLayout>` — no cambiar el anidamiento.
  Cubre: R1, R8.

- [x] T5. Modificar `frontend/src/features/auth/Perfil.tsx`
  - Importar `useNavigate` de `react-router-dom`, `authService` de `@/services/authService`,
    `useAuthStore` de `@/store/authStore`.
  - Agregar `const navigate = useNavigate();` y `const clearAuth = useAuthStore((s) => s.clearAuth);`.
  - Implementar `handleLogout` con el mismo patrón try/finally de `ProfileMenu.tsx`:
    ```ts
    const handleLogout = async () => {
      try {
        await authService.logout();
      } catch {
        // logout failure should not prevent local auth cleanup
      } finally {
        clearAuth();
        navigate('/login');
      }
    };
    ```
  - Renderizar un botón visible "Cerrar sesión" dentro de `<CardContent>`, después del `<form>` de edición
    de perfil (separado visualmente, p. ej. con `border-t pt-4 mt-4`), con `onClick={() => { void handleLogout(); }}`.
    El botón debe ser visible para los 3 roles (CLIENTE, OPERADOR, REPARTIDOR) — `Perfil.tsx` no
    condiciona ningún render existente por rol, por lo que el nuevo botón se muestra siempre.
  Cubre: R16, R17, R18, R19.

- [x] T6. Escribir tests en `frontend/src/features/repartidor/RutasRepartidor.test.tsx`
  - `R20 - debe renderizar una tarjeta por ruta asignada con código, estado y envíos` — mockear
    `useRutas` devolviendo `{ data: { data: [ruta1, ruta2], meta: {...} }, isLoading: false, isError: false }`
    con rutas que incluyan `envios` no vacío; verificar que se renderizan `codigo`, `estado` (badge)
    y al menos un `codigoSeguimiento` de envío por ruta.
  - `R21 - debe mostrar "No tienes rutas asignadas" cuando la lista de rutas está vacía` — mockear
    `useRutas` devolviendo `{ data: { data: [], meta: {...} }, isLoading: false, isError: false }`.
  - Adicional: test de `isLoading: true` → indicador de carga visible, lista no renderizada. (R5)
  - Adicional: test de `isError: true` → `role="alert"` presente. (R6)
  Mockear `@/hooks/useRutas`. Usar `@testing-library/react` + `vitest`. Envolver en `MemoryRouter`.
  Cubre: R20, R21 (y R5/R6 como casos adicionales).

- [x] T7. Escribir tests en `frontend/src/features/repartidor/MapaRepartidor.test.tsx`
  - `R22 - debe renderizar un marcador por cada envío con coordenadas de la ruta activa` — mockear
    `useRutas` devolviendo `data.data` con al menos dos rutas: la primera con `estado: 'EN_CURSO'`
    (no terminal) y `envios` con `lat`/`lng` definidos para al menos uno; verificar que `RepartidorMap`
    (o los `Marker` renderizados) recibe la cantidad correcta de envíos con coordenadas.
    Mockear `react-leaflet` (`MapContainer`, `TileLayer`, `Marker`) como componentes simples que
    renderizan sus props/children, siguiendo el patrón de tests existentes para `TrackingMap`
    (revisar `frontend/src/features/tracking/*.test.tsx` para el mock exacto de `react-leaflet`/`leaflet`).
  - `R23 - debe mostrar "Sin ubicaciones disponibles para mostrar" cuando no hay ruta activa` — mockear
    `useRutas` devolviendo solo rutas con `estado` en `['COMPLETADA', 'CANCELADA']` (o `data.data: []`).
  - `R23 - debe mostrar "Sin ubicaciones disponibles para mostrar" cuando la ruta activa no tiene envíos con coordenadas`
    — mockear una ruta activa (`estado` no terminal) cuyos `envios` tengan `lat`/`lng` igual a `null` o `undefined`.
  - Adicional: test de `isLoading: true` → indicador de carga visible, mapa no renderizado. (R14)
  - Adicional: test de `isError: true` → `role="alert"` presente. (R15)
  Mockear `@/hooks/useRutas`. Usar `@testing-library/react` + `vitest`. Envolver en `MemoryRouter`.
  Cubre: R22, R23 (y R14/R15 como casos adicionales).

- [x] T8. Escribir test en `frontend/src/features/auth/Perfil.test.tsx`
  - `R24 - debe invocar logout, limpiar el authStore y navegar a /login al hacer clic en "Cerrar sesión"`:
    - Mockear `@/services/authService` (`logout` como `vi.fn()` resuelto).
    - Mockear `@/store/authStore` (`useAuthStore` devolviendo `clearAuth: vi.fn()` vía selector).
    - Mockear `useNavigate` de `react-router-dom` (mismo patrón que `frontend/src/features/rutas/rutas.test.tsx`).
    - Mockear `usePerfil` / `useUpdatePerfil` (hooks ya usados por `Perfil.tsx`) con datos mínimos
      (`{ nombre, correo, telefono, rol }`) para que el componente renderice sin errores.
    - Click en el botón "Cerrar sesión" (`getByRole('button', { name: /cerrar sesión/i })`).
    - Verificar (con `waitFor` si es necesario, dado el `async` de `handleLogout`):
      `authService.logout` fue llamado, `clearAuth` fue llamado, y `navigate` fue llamado con `'/login'`.
    - Caso adicional: `authService.logout` rechaza (mock `mockRejectedValueOnce`) → `clearAuth` y
      `navigate('/login')` se llaman igualmente (R18).
  Si ya existe un archivo de test para `Perfil.tsx`, agregar los nuevos casos allí en vez de crear uno nuevo.
  Cubre: R24 (y R18 como caso adicional).

---

## Verificación

- [x] T9. Ejecutar `npm run lint` en `frontend/` — cero errores.
- [x] T10. Ejecutar `npm test` en `frontend/` — todos los tests en verde, incluyendo
  `RutasRepartidor.test.tsx`, `MapaRepartidor.test.tsx` y los nuevos casos de `Perfil.test.tsx`.
- [x] T11. Ejecutar `npm run build` en `frontend/` — cero errores de TypeScript en los
  archivos de esta feature (`tsc --noEmit -p tsconfig.app.json` no reporta errores en
  `features/repartidor/`, `features/auth/Perfil.tsx` ni `router/index.tsx`). El build
  global falla por un error TS2322 pre-existente en
  `frontend/src/features/cliente/__tests__/MisEnvios.test.tsx` (feature `envios_consultar`,
  ya `done`), confirmado presente en `main` antes de esta feature vía `git stash` y ya
  documentado como pre-existente en `progress/impl_gestion_repartidores.md`. Ver
  `progress/impl_repartidor_rutas_mapa.md` para detalle.
- [x] T12. Desde la raíz del repositorio, ejecutar `./init.sh` y confirmar que pasa.
  Resultado: ✅ Todo verde: 30/30 checks pasaron.
