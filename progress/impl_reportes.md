# Informe de implementación — reportes

> Feature id: 18 | Sprint 5 | Fecha: 2026-06-09

---

## Archivos creados

### Backend
| Archivo | Descripción |
|---|---|
| `backend/src/validators/reportesValidator.ts` | Schema Zod v4 `reporteEnviosFiltroSchema` con refinement `desde <= hasta` |
| `backend/src/types/reportes.ts` | Interfaces `ReporteEnviosDto`, `RepartidorRankingDto`, `ReporteEnviosFiltroDto` |
| `backend/src/repositories/reportesRepository.ts` | 4 funciones Prisma: `getEnviosPorEstado`, `getEnviosFechas`, `getEnviosParaCSV`, `getRepartidoresConEnvios` |
| `backend/src/services/reportesService.ts` | 3 funciones: `getEnviosReport`, `exportEnviosCSV`, `getRepartidoresRanking` |
| `backend/src/controllers/reportesController.ts` | 3 handlers: `getEnviosReportHandler`, `exportEnviosCSVHandler`, `getRepartidoresRankingHandler` |
| `backend/src/routes/reportes.ts` | Router con 3 rutas protegidas (export antes de envios) |
| `backend/src/tests/reportes.test.ts` | 13 tests de integración (Supertest) R1–R11 |
| `backend/src/tests/reportesService.test.ts` | 4 tests unitarios del servicio R1, R3, R5, R8 |

### Frontend
| Archivo | Descripción |
|---|---|
| `frontend/src/types/reportes.ts` | Interfaces DTO del frontend |
| `frontend/src/services/reportesService.ts` | 3 métodos HTTP: `getReporteEnvios`, `getRepartidoresRanking`, `exportEnviosCSV` (blob) |
| `frontend/src/hooks/useReportes.ts` | Hooks TanStack Query: `useReporteEnvios`, `useRepartidoresRanking` |
| `frontend/src/features/reportes/DateRangePicker.tsx` | Selector de rango de fechas (dos inputs type=date) |
| `frontend/src/features/reportes/EnviosPorDiaChart.tsx` | BarChart recharts con skeleton |
| `frontend/src/features/reportes/EstadoBreakdownTable.tsx` | Tabla con badges de color por estado |
| `frontend/src/features/reportes/RepartidorRankingTable.tsx` | Tabla de ranking con skeleton |
| `frontend/src/features/reportes/ReportesPage.tsx` | Página principal con exportación CSV |
| `frontend/src/features/reportes/__tests__/ReportesPage.test.tsx` | 5 tests Vitest R12–R16 |

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `backend/src/index.ts` | Importar y montar `reportesRouter` bajo `/api/v1/reportes` |
| `frontend/src/router/index.tsx` | Reemplazar `PlaceholderPage title="Reportes"` por `<ReportesPage />` |
| `specs/reportes/tasks.md` | Todas las tasks marcadas `[x]` |

---

## Trazabilidad R → Test

| Requisito | Test | Archivo |
|---|---|---|
| R1 | `R1 — debe devolver 200 con porEstado y porDia` | `reportes.test.ts` + `reportesService.test.ts` |
| R2 | `R2 — debe devolver 422 cuando falta desde/hasta` | `reportes.test.ts` |
| R3 | `R3 — debe devolver 422 cuando desde > hasta` | `reportes.test.ts` + `reportesService.test.ts` |
| R4 | `R4 — debe devolver 200 con arrays vacíos` | `reportes.test.ts` |
| R5 | `R5 — debe devolver Content-Type text/csv` | `reportes.test.ts` + `reportesService.test.ts` |
| R6 | `R6 — debe devolver 422 en export cuando falta fecha` | `reportes.test.ts` |
| R7 | `R7 — debe devolver CSV con solo cabecera` | `reportes.test.ts` |
| R8 | `R8 — debe devolver 200 con array ordenado` | `reportes.test.ts` + `reportesService.test.ts` |
| R9 | `R9 — debe incluir repartidores con cero entregas` | `reportes.test.ts` |
| R10 | `R10 — debe devolver 401 sin token` | `reportes.test.ts` |
| R11 | `R11 — debe devolver 403 con token CLIENTE/REPARTIDOR` | `reportes.test.ts` |
| R12 | `R12 — renderiza título "Reportes" y secciones` | `ReportesPage.test.tsx` |
| R13 | `R13 — actualiza rango de fechas` | `ReportesPage.test.tsx` |
| R14 | `R14 — muestra skeleton mientras isLoading` | `ReportesPage.test.tsx` |
| R15/R16 | `R15/R16 — llama a exportEnviosCSV con fechas actuales` | `ReportesPage.test.tsx` |

---

## Resultado de verificación

- **Backend tests**: 17/17 passing (13 integración + 4 unitarios)
- **Frontend tests**: 5/5 passing (ReportesPage.test.tsx)
- **init.sh**: 30/30 checks — todo verde
- **Lint backend**: sin errores
- **Lint frontend**: sin errores
- **Todas las tasks marcadas [x]**: T1–T19
