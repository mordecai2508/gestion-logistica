# Tasks — reportes

> Feature id: 18 | Sprint 5
> Implementar en orden. Marcar cada task `[x]` al completarla.

---

## Backend

- [x] T1. Crear validator Zod `backend/src/validators/reportesValidator.ts` con `reporteEnviosFiltroSchema` (campos `desde` y `hasta` requeridos, formato ISO date, `desde <= hasta`).

- [x] T2. Crear interfaces y DTOs en `backend/src/types/reportes.ts`: `ReporteEnviosDto`, `RepartidorRankingDto`, `ReporteEnviosFiltroDto`.

- [x] T3. Crear repositorio `backend/src/repositories/reportesRepository.ts` con las siguientes funciones de acceso a Prisma:
  - `getEnviosPorEstado(desde: Date, hasta: Date)` — `groupBy estado, _count`.
  - `getEnviosPorRango(desde: Date, hasta: Date)` — `findMany` con `select { createdAt: true }` acotado al rango.
  - `getEnviosParaCSV(desde: Date, hasta: Date)` — `findMany` con `select { codigoSeguimiento, estado, remitente, destinatario, direccionDestino, createdAt }`.
  - `getRepartidoresConEnvios()` — `findMany` incluyendo `usuario { nombre }` y `rutas { envios { estado } }`.

- [x] T4. Crear servicio `backend/src/services/reportesService.ts` con las funciones:
  - `getEnviosReport(filtro: ReporteEnviosFiltroDto): Promise<ReporteEnviosDto>` — valida rango, llama al repositorio, agrupa `porDia` en JS, calcula `totalPeriodo`.
  - `exportEnviosCSV(filtro: ReporteEnviosFiltroDto): Promise<string>` — obtiene filas del repositorio y construye string CSV.
  - `getRepartidoresRanking(): Promise<RepartidorRankingDto[]>` — obtiene repartidores del repositorio, suma `totalEntregados` / `totalFallidos`, ordena descendente.

- [x] T5. Crear controlador `backend/src/controllers/reportesController.ts` con tres handlers:
  - `getEnviosReport` — parsea query params con `reporteEnviosFiltroSchema`, llama al servicio, responde `{ data, message, status: 200 }`.
  - `exportEnviosCSV` — parsea query params, llama al servicio, establece `Content-Type: text/csv` y `Content-Disposition` header, envía el string CSV.
  - `getRepartidoresRanking` — llama al servicio, responde `{ data, message, status: 200 }`.

- [x] T6. Crear archivo de rutas `backend/src/routes/reportes.ts`:
  - `GET /reportes/envios` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `getEnviosReport`.
  - `GET /reportes/envios/export` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `exportEnviosCSV`.
  - `GET /reportes/repartidores` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `getRepartidoresRanking`.
  - Montar el router en `backend/src/index.ts` (o donde se registran las rutas) bajo el prefijo `/api/v1`.

- [x] T7. Escribir tests backend `backend/src/tests/reportes.test.ts` (Jest + Supertest, mocking del servicio):
  - R1 — debe devolver 200 con `porEstado` y `porDia` para OPERADOR autenticado con rango válido.
  - R2 — debe devolver 422 cuando falta `desde` o `hasta`.
  - R3 — debe devolver 422 cuando `desde` > `hasta`.
  - R4 — debe devolver 200 con arrays vacíos cuando no hay envíos en el rango.
  - R5 — debe devolver Content-Type `text/csv` y cabecera CSV cuando OPERADOR exporta rango válido.
  - R6 — debe devolver 422 en export cuando falta parámetro de fecha.
  - R7 — debe devolver CSV con solo cabecera cuando no hay envíos en rango para export.
  - R8 — debe devolver 200 con array de RepartidorRankingDto ordenado por `totalEntregados` desc.
  - R9 — debe incluir repartidores con cero entregas en el ranking.
  - R10 — debe devolver 401 en los tres endpoints sin token.
  - R11 — debe devolver 403 en los tres endpoints con token CLIENTE o REPARTIDOR.

- [x] T8. Escribir tests unitarios del servicio `backend/src/tests/reportesService.test.ts` (con repositorio mockeado):
  - R1 — `getEnviosReport` agrupa correctamente `porDia` y calcula `totalPeriodo`.
  - R3 — `getEnviosReport` lanza error si `desde > hasta`.
  - R5 — `exportEnviosCSV` produce CSV con cabecera correcta y filas por cada envío.
  - R8 — `getRepartidoresRanking` ordena descendente por `totalEntregados`.

---

## Frontend

- [x] T9. Crear tipos `frontend/src/types/reportes.ts`: interfaces `ReporteEnviosDto`, `RepartidorRankingDto`, `ReporteEnviosFiltroDto`.

- [x] T10. Crear service `frontend/src/services/reportesService.ts` con:
  - `getReporteEnvios(filtro: ReporteEnviosFiltroDto): Promise<ReporteEnviosDto>` — GET `/api/v1/reportes/envios`.
  - `getRepartidoresRanking(): Promise<RepartidorRankingDto[]>` — GET `/api/v1/reportes/repartidores`.
  - `exportEnviosCSV(filtro: ReporteEnviosFiltroDto): Promise<Blob>` — GET `/api/v1/reportes/envios/export` con `responseType: 'blob'`.

- [x] T11. Crear hook `frontend/src/hooks/useReportes.ts` con TanStack Query:
  - `useReporteEnvios(filtro: ReporteEnviosFiltroDto)` — `useQuery` con `queryKey: ['reportes', 'envios', filtro]`.
  - `useRepartidoresRanking()` — `useQuery` con `queryKey: ['reportes', 'repartidores']`.

- [x] T12. Crear componente `frontend/src/features/reportes/DateRangePicker.tsx`: dos inputs `<input type="date">` (desde/hasta) que emiten los valores al componente padre via `onChange`. Valores por defecto: últimos 30 días.

- [x] T13. Crear componente `frontend/src/features/reportes/EnviosPorDiaChart.tsx`: `BarChart` de recharts con datos `porDia`. Eje X = fecha (`YYYY-MM-DD`), eje Y = total. Muestra skeleton cuando `isLoading`.

- [x] T14. Crear componente `frontend/src/features/reportes/EstadoBreakdownTable.tsx`: tabla con columnas Estado / Total a partir de `porEstado`. Usa badges de color por estado (igual que en `ConsultarEnvios`).

- [x] T15. Crear componente `frontend/src/features/reportes/RepartidorRankingTable.tsx`: tabla con columnas Posición / Nombre / Entregados / Fallidos, ordenada tal como llega del hook. Muestra skeleton cuando `isLoading`.

- [x] T16. Crear página `frontend/src/features/reportes/ReportesPage.tsx`:
  - Composición de `DateRangePicker`, `EnviosPorDiaChart`, `EstadoBreakdownTable` y `RepartidorRankingTable`.
  - Botón "Exportar CSV" que llama a `reportesService.exportEnviosCSV` y descarga el blob usando un anchor programático.
  - Muestra Toast de error (Shadcn/UI) si algún endpoint falla.

- [x] T17. Modificar `frontend/src/router/index.tsx`: reemplazar `<PlaceholderPage title="Reportes" />` por `<ReportesPage />` e importar el componente.

- [x] T18. Escribir tests frontend `frontend/src/features/reportes/__tests__/ReportesPage.test.tsx` (Vitest + Testing Library, mocking del hook):
  - R12 — debe renderizar el título "Reportes" y los tres paneles.
  - R13 — debe volver a llamar al hook cuando cambia el rango de fechas.
  - R14 — debe mostrar skeletons mientras `isLoading` es true.
  - R15/R16 — debe llamar a `exportEnviosCSV` con las fechas seleccionadas al hacer click en "Exportar CSV".

---

## Verificación final

- [x] T19. Ejecutar `./init.sh` desde la raíz del monorepo. Verificar que `npm run lint`, `npm test` y `npm run build` pasan sin errores en backend y frontend.
