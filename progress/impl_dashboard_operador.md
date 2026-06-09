# Informe de implementación — dashboard_operador

Fecha: 2026-06-08

## Resultado de verificación

| Check | Resultado |
|-------|-----------|
| `npm run lint` (backend) | ✅ sin errores |
| `npm test` (backend) | ✅ 255/255 passing (16 suites) |
| `npm run build` (backend) | ✅ |
| `npm run lint` (frontend) | ✅ sin errores |
| `npm test` (frontend) | ✅ 133/133 passing (25 suites) |
| `npm run build` (frontend) | ✅ |
| `./init.sh` | ✅ 30/30 checks |

Tests nuevos de esta feature: 17 backend + 9 frontend = 26 tests.

---

## Archivos creados

### Backend
- `backend/src/repositories/dashboardRepository.ts`
- `backend/src/types/dashboard.ts`
- `backend/src/services/dashboardService.ts`
- `backend/src/controllers/dashboardController.ts`
- `backend/src/routes/dashboard.ts`
- `backend/src/tests/dashboard.test.ts`

### Frontend
- `frontend/src/types/dashboard.ts`
- `frontend/src/services/dashboardService.ts`
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/features/dashboard/MetricCard.tsx`
- `frontend/src/features/dashboard/EnviosPieChart.tsx`
- `frontend/src/features/dashboard/EnviosRecientesTable.tsx`
- `frontend/src/features/dashboard/RutasPendientesPanel.tsx`
- `frontend/src/features/dashboard/VehiculosDisponiblesPanel.tsx`
- `frontend/src/features/dashboard/DashboardOperador.tsx`
- `frontend/src/features/dashboard/__tests__/DashboardOperador.test.tsx`

### Archivos modificados
- `backend/src/index.ts` — registro de `dashboardRouter` en `/api/v1/dashboard`
- `frontend/src/router/index.tsx` — sustitución de `DashboardPage` inline por `DashboardOperador`
- `specs/dashboard_operador/tasks.md` — todas las tasks marcadas `[x]`

---

## Tabla de trazabilidad R1–R31

| Req | Descripción | Test / Cobertura | Archivo |
|-----|-------------|-----------------|---------|
| R1 | GET /metrics → 200 con 4 métricas | `R1/R2/R3/R4/R5 — debe devolver 200...` | `dashboard.test.ts` |
| R2 | `totalEnvios` = count total envíos | idem + unit `getMetrics delega en repositorio` | `dashboard.test.ts` |
| R3 | `enRuta` = count EN_RUTA | idem | `dashboard.test.ts` |
| R4 | `entregados` = count ENTREGADO | idem | `dashboard.test.ts` |
| R5 | `incidenciasAbiertas` = count ABIERTA | idem | `dashboard.test.ts` |
| R6 | /metrics sin token → 401 | `R6 — debe devolver 401 sin token` | `dashboard.test.ts` |
| R7 | /metrics con CLIENTE/REPARTIDOR → 403 | `R7 — debe devolver 403...` (×2) | `dashboard.test.ts` |
| R8 | GET /envios-recientes → 200 | `R8/R9/R10 — debe devolver 200...` | `dashboard.test.ts` |
| R9 | ≤ 5 envíos, orderBy createdAt desc | idem | `dashboard.test.ts` |
| R10 | Campos: codigoSeguimiento, clienteNombre, estado, createdAt | idem + unit `getEnviosRecientes aplana clienteNombre` | `dashboard.test.ts` |
| R11 | /envios-recientes sin token → 401 | `R11 — debe devolver 401 sin token` | `dashboard.test.ts` |
| R12 | /envios-recientes con REPARTIDOR → 403 | `R12 — debe devolver 403...` | `dashboard.test.ts` |
| R13 | GET /rutas-pendientes → 200 | `R13/R14/R15 — debe devolver 200...` | `dashboard.test.ts` |
| R14 | ≤ 5 rutas PENDIENTE, orderBy createdAt asc | idem | `dashboard.test.ts` |
| R15 | Campos: id, codigo, nombre, createdAt | idem + unit `getRutasPendientes devuelve los campos` | `dashboard.test.ts` |
| R16 | /rutas-pendientes sin token → 401 | `R16 — debe devolver 401 sin token` | `dashboard.test.ts` |
| R17 | /rutas-pendientes con CLIENTE → 403 | `R17 — debe devolver 403...` | `dashboard.test.ts` |
| R18 | GET /vehiculos-disponibles → 200 | `R18/R19/R20 — debe devolver 200...` | `dashboard.test.ts` |
| R19 | ≤ 5 vehículos DISPONIBLE, orderBy placa asc | idem | `dashboard.test.ts` |
| R20 | Campos: id, placa, modelo, estado | idem + unit `getVehiculosDisponibles devuelve los campos` | `dashboard.test.ts` |
| R21 | /vehiculos-disponibles sin token → 401 | `R21 — debe devolver 401 sin token` | `dashboard.test.ts` |
| R22 | /vehiculos-disponibles con REPARTIDOR → 403 | `R22 — debe devolver 403...` | `dashboard.test.ts` |
| R23 | /dashboard renderiza 4 tarjetas de métricas | `R23/R24 — debe renderizar 4 tarjetas...` | `DashboardOperador.test.tsx` |
| R24 | Labels: Total Envíos, En Ruta, Entregados, Incidencias Abiertas | idem | `DashboardOperador.test.tsx` |
| R25 | Skeleton mientras carga | `R25 — debe mostrar skeleton...` | `DashboardOperador.test.tsx` |
| R26 | PieChart con 3 sectores (recharts) | `EnviosPieChart.tsx` — renderizado condicional por datos | `EnviosPieChart.tsx` |
| R27 | Tabla Envíos Recientes con 4 columnas | `R27 — debe renderizar la tabla...` | `DashboardOperador.test.tsx` |
| R28 | Panel Rutas Pendientes con navegación a /rutas/:id | `R28 — debe renderizar el panel de rutas...` (×2) | `DashboardOperador.test.tsx` |
| R29 | Panel Vehículos Disponibles: Placa, Modelo, Estado | `R29 — debe renderizar el panel de vehículos...` | `DashboardOperador.test.tsx` |
| R30 | Toast de error cuando falla una query | `R30 — debe mostrar Toast...` (×2) | `DashboardOperador.test.tsx` |
| R31 | Botón flotante "+ Nuevo Envío" → /envios/crear | `R31 — el botón "+ Nuevo Envío"...` | `DashboardOperador.test.tsx` |
