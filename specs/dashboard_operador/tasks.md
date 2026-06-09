# Tasks — dashboard_operador

> Seguir en orden. Marcar `[x]` al completar cada task.
> El implementer no debe iniciar una task si la anterior no está verde en lint/tests.

---

## Backend

- [x] T1. Crear `backend/src/repositories/dashboardRepository.ts` con 4 funciones:
  - `getMetrics()` → ejecuta `Promise.all` con 4 `prisma.count` (totalEnvios, enRuta, entregados, incidenciasAbiertas). Usar `select` mínimo; nunca traer registros completos.
  - `getEnviosRecientes()` → `prisma.envio.findMany({ take: 5, orderBy: { createdAt: 'desc' }, select: { codigoSeguimiento, estado, createdAt, cliente: { select: { usuario: { select: { nombre } } } } } })`.
  - `getRutasPendientes()` → `prisma.ruta.findMany({ take: 5, where: { estado: 'PENDIENTE' }, orderBy: { createdAt: 'asc' }, select: { id, codigo, nombre, createdAt } })`.
  - `getVehiculosDisponibles()` → `prisma.vehiculo.findMany({ take: 5, where: { estado: 'DISPONIBLE' }, orderBy: { placa: 'asc' }, select: { id, placa, modelo, estado } })`.

- [x] T2. Crear `backend/src/services/dashboardService.ts` con 4 funciones que llaman al repositorio y aplanan los datos al DTO correspondiente:
  - `getMetrics()` → devuelve `DashboardMetricsDto`.
  - `getEnviosRecientes()` → mapea `cliente.usuario.nombre` a `clienteNombre`; devuelve `EnvioRecienteDto[]`.
  - `getRutasPendientes()` → devuelve `RutaPendienteDto[]`.
  - `getVehiculosDisponibles()` → devuelve `VehiculoDisponibleDto[]`.

- [x] T3. Crear `backend/src/types/dashboard.ts` con las interfaces `DashboardMetricsDto`, `EnvioRecienteDto`, `RutaPendienteDto` y `VehiculoDisponibleDto` (sin `any`; reutilizar enums `EstadoEnvio`, `EstadoVehiculo` desde `@prisma/client`).

- [x] T4. Crear `backend/src/controllers/dashboardController.ts` con 4 handlers:
  - `getMetricsHandler`, `getEnviosRecientesHandler`, `getRutasPendientesHandler`, `getVehiculosDisponiblesHandler`.
  - Cada handler llama al servicio correspondiente y devuelve `res.status(200).json({ data, message: '...', status: 200 })`. Sin lógica de negocio.

- [x] T5. Crear `backend/src/routes/dashboard.ts` registrando las 4 rutas GET con `authMiddleware` y `roleMiddleware('OPERADOR')`:
  ```
  GET /metrics               → getMetricsHandler
  GET /envios-recientes      → getEnviosRecientesHandler
  GET /rutas-pendientes      → getRutasPendientesHandler
  GET /vehiculos-disponibles → getVehiculosDisponiblesHandler
  ```

- [x] T6. Registrar `dashboardRouter` en `backend/src/index.ts`:
  ```
  app.use('/api/v1/dashboard', dashboardRouter);
  ```

- [x] T7. Escribir tests backend `backend/src/tests/dashboard.test.ts` (Jest + Supertest):
  - `R1/R2/R3/R4/R5` — GET /metrics con token OPERADOR válido: debe devolver 200 con `{ totalEnvios, enRuta, entregados, incidenciasAbiertas }` todos numéricos y coherentes con datos de la BD de test.
  - `R6` — GET /metrics sin token: debe devolver 401.
  - `R7` — GET /metrics con token CLIENTE: debe devolver 403.
  - `R8/R9/R10` — GET /envios-recientes con token OPERADOR: debe devolver ≤ 5 ítems con campos `codigoSeguimiento`, `clienteNombre`, `estado`, `createdAt`.
  - `R11` — GET /envios-recientes sin token: debe devolver 401.
  - `R12` — GET /envios-recientes con token REPARTIDOR: debe devolver 403.
  - `R13/R14/R15` — GET /rutas-pendientes con token OPERADOR: debe devolver ≤ 5 rutas con estado PENDIENTE, campos `id`, `codigo`, `nombre`, `createdAt`.
  - `R16`, `R17` — sin token → 401, token CLIENTE → 403.
  - `R18/R19/R20` — GET /vehiculos-disponibles con token OPERADOR: debe devolver ≤ 5 vehículos con estado DISPONIBLE, campos `id`, `placa`, `modelo`, `estado`.
  - `R21`, `R22` — sin token → 401, token REPARTIDOR → 403.

---

## Frontend

- [x] T8. **Confirmar con el humano antes de ejecutar este task**: instalar `recharts` como dependencia de producción en `frontend/`:
  ```
  npm install recharts
  ```
  Si el humano decide no instalar `recharts`, implementar el componente `EnviosPieChart.tsx` con SVG nativo (ver sección 5 del design.md).

- [x] T9. Crear `frontend/src/types/dashboard.ts` con las interfaces `DashboardMetricsDto`, `EnvioRecienteDto`, `RutaPendienteDto` y `VehiculoDisponibleDto`. Reutilizar los string-enum de `EstadoEnvio` y `EstadoVehiculo` como union types (no importar desde `@prisma/client`).

- [x] T10. Crear `frontend/src/services/dashboardService.ts` con 4 funciones que llaman a la API mediante la instancia Axios configurada:
  - `getMetrics()`, `getEnviosRecientes()`, `getRutasPendientes()`, `getVehiculosDisponibles()`.

- [x] T11. Crear `frontend/src/hooks/useDashboard.ts` con 4 hooks TanStack Query:
  - `useDashboardMetrics()`, `useEnviosRecientes()`, `useRutasPendientes()`, `useVehiculosDisponibles()`.
  - `staleTime: 60_000` en todos.

- [x] T12. Crear `frontend/src/features/dashboard/MetricCard.tsx` — componente que recibe `label: string`, `value: number | undefined`, `isLoading: boolean` y renderiza una tarjeta Shadcn/UI con skeleton en estado de carga (R23, R24, R25).

- [x] T13. Crear `frontend/src/features/dashboard/EnviosPieChart.tsx` — gráfico de torta con 3 sectores: En Ruta (azul), Entregados (verde), Otros (gris). Recibe `metrics: DashboardMetricsDto | undefined` y calcula los sectores. Implementar con `recharts` (o SVG si se decide en T8) (R26).

- [x] T14. Crear `frontend/src/features/dashboard/EnviosRecientesTable.tsx` — tabla con columnas Código, Cliente, Estado (badge de color según `EstadoEnvio`), Fecha. Recibe `envios: EnvioRecienteDto[]` (R27).

- [x] T15. Crear `frontend/src/features/dashboard/RutasPendientesPanel.tsx` — lista de rutas con el `codigo` y un ícono de flecha que navega a `/rutas/:id` usando `useNavigate`. Recibe `rutas: RutaPendienteDto[]` (R28).

- [x] T16. Crear `frontend/src/features/dashboard/VehiculosDisponiblesPanel.tsx` — tabla con columnas Placa, Modelo, Estado. Recibe `vehiculos: VehiculoDisponibleDto[]` (R29).

- [x] T17. Crear `frontend/src/features/dashboard/DashboardOperador.tsx` — página principal que:
  - Consume los 4 hooks de `useDashboard.ts`.
  - Compone los 5 componentes anteriores en el layout del wireframe: 4 tarjetas de métricas en la parte superior, tabla de envíos recientes y gráfico de torta en fila media, rutas pendientes y vehículos disponibles en fila inferior.
  - Muestra Toast de error si algún query falla (R30).
  - Incluye botón flotante "+ Nuevo Envío" que navega a `/envios/crear` (R31).

- [x] T18. Actualizar `frontend/src/router/index.tsx`: reemplazar el componente inline `DashboardPage` por la importación de `DashboardOperador` desde `@/features/dashboard/DashboardOperador`.

- [x] T19. Escribir tests frontend `frontend/src/features/dashboard/__tests__/DashboardOperador.test.tsx` (Vitest + Testing Library):
  - `R23/R24` — debe renderizar 4 tarjetas con labels correctos cuando los datos están disponibles.
  - `R25` — debe mostrar skeleton mientras carga.
  - `R27` — debe renderizar la tabla de envíos recientes con los datos del mock.
  - `R28` — debe renderizar el panel de rutas pendientes con los códigos del mock.
  - `R29` — debe renderizar el panel de vehículos disponibles con placa/modelo del mock.
  - `R30` — debe mostrar Toast cuando la llamada a metrics falla.
  - `R31` — el botón "+ Nuevo Envío" debe navegar a `/envios/crear`.

---

## Verificación final

- [x] T20. Ejecutar `./init.sh` desde la raíz del repositorio y confirmar que lint, tests y build de ambos paquetes pasan sin errores.
