# Design — reportes

> Feature id: 18 | Sprint 5

---

## 1. Endpoints

| Método | Ruta | Auth | Query params | Respuesta exitosa | HTTP |
|---|---|---|---|---|---|
| GET | `/api/v1/reportes/envios` | authMiddleware + roleMiddleware('OPERADOR') | `desde` (ISO date), `hasta` (ISO date) | `{ data: ReporteEnviosDto, message, status }` | 200 |
| GET | `/api/v1/reportes/envios/export` | authMiddleware + roleMiddleware('OPERADOR') | `desde` (ISO date), `hasta` (ISO date) | CSV file attachment | 200 |
| GET | `/api/v1/reportes/repartidores` | authMiddleware + roleMiddleware('OPERADOR') | — | `{ data: RepartidorRankingDto[], message, status }` | 200 |

### DTOs

```
ReporteEnviosDto {
  porEstado: { estado: EstadoEnvio, total: number }[]
  porDia:    { fecha: string (YYYY-MM-DD), total: number }[]
  totalPeriodo: number
}

RepartidorRankingDto {
  id:               string
  nombre:           string
  totalEntregados:  number
  totalFallidos:    number
}

ReporteEnviosFiltroDto {
  desde: string   // ISO date, required
  hasta: string   // ISO date, required
}
```

---

## 2. Schema Prisma

No se requieren nuevos modelos ni migraciones. Todos los datos necesarios existen:
- `Envio.estado` (EstadoEnvio enum) + `Envio.createdAt` para los reportes de envíos.
- `Ruta.repartidorId` + `Envio.rutaId` para relacionar envíos con repartidores.
- `Usuario.nombre` a través de `Repartidor → Usuario` para el ranking.

No hay cambios al schema.

---

## 3. Lógica de negocio

### Reporte de envíos (`reportesService.getEnviosReport`)

1. Validar que `desde <= hasta`; si no, lanzar error 422.
2. Construir rango de fechas: `desde` se interpreta como inicio del día (00:00:00 UTC); `hasta` como fin del día (23:59:59 UTC).
3. Ejecutar `prisma.envio.groupBy({ by: ['estado'], where: { createdAt: { gte, lte } }, _count: true })` para obtener `porEstado`.
4. Para `porDia`: ejecutar `prisma.envio.findMany({ where: { createdAt: { gte, lte } }, select: { createdAt: true } })` y agrupar en el servicio por fecha calendario (formato `YYYY-MM-DD`). Justificación: `groupBy` con funciones de fecha no es directo en Prisma; agrupar en JS sobre un set potencialmente grande pero acotado por el rango es aceptable. Si el volumen crece se puede migrar a una raw query SQL.
5. Calcular `totalPeriodo` como suma de `porEstado`.
6. Devolver `ReporteEnviosDto`.

### Exportación CSV (`reportesService.exportEnviosCSV`)

1. Reutilizar la misma query acotada por rango de fechas pero recuperar todos los campos necesarios: `codigoSeguimiento`, `estado`, `remitente`, `destinatario`, `direccionDestino`, `createdAt`.
2. Construir el CSV en el servicio usando construcción de string (sin librería externa): fila de cabecera + filas de datos separadas por coma y newline. Los campos que puedan contener comas se envuelven en comillas dobles.
3. El controlador establece los headers `Content-Type: text/csv` y `Content-Disposition: attachment; filename="envios-<desde>-<hasta>.csv"` antes de enviar el string.

**Decisión: CSV generado en el servidor (no en el cliente)**
- Opción elegida: endpoint `GET /api/v1/reportes/envios/export` genera y devuelve el CSV como stream de texto.
- Opción descartada: generar el CSV en el frontend con los datos ya cargados.
- Justificación: el frontend solo carga los datos agregados (`porDia`, `porEstado`), no los registros individuales. Generar el CSV en cliente requeriría una segunda consulta al mismo endpoint o un endpoint de datos crudos adicional. El servidor ya tiene acceso directo a todos los campos necesarios. Mantener la generación en el servidor es más limpio y evita duplicar lógica de serialización.

### Ranking de repartidores (`reportesService.getRepartidoresRanking`)

1. Obtener todos los repartidores con `prisma.repartidor.findMany({ include: { usuario: { select: { nombre: true } }, rutas: { include: { envios: { select: { estado: true } } } } } })`.
2. Para cada repartidor, sumar `envios` de todas sus rutas donde `estado === 'ENTREGADO'` → `totalEntregados`; donde `estado === 'FALLIDO' || estado === 'CANCELADO'` → `totalFallidos`.
3. Ordenar descendente por `totalEntregados`.
4. Devolver array de `RepartidorRankingDto`.

**Nota sobre el modelo de datos:** En el schema actual, la relación `Repartidor → Ruta → Envio` es la única forma de asociar envíos con repartidores. No existe una foreign key directa `Envio.repartidorId`. El ranking se computa a través de `Ruta.repartidorId`.

---

## 4. Frontend

### Archivos nuevos

| Archivo | Tipo | Descripción |
|---|---|---|
| `frontend/src/features/reportes/ReportesPage.tsx` | Componente (página) | Contenedor principal de la pantalla `/reportes` |
| `frontend/src/features/reportes/EnviosPorDiaChart.tsx` | Componente | Gráfico de barras (recharts `BarChart`) de envíos por día |
| `frontend/src/features/reportes/EstadoBreakdownTable.tsx` | Componente | Tabla de totales por estado (EstadoEnvio) |
| `frontend/src/features/reportes/RepartidorRankingTable.tsx` | Componente | Tabla de ranking de repartidores ordenada por entregas completadas |
| `frontend/src/features/reportes/DateRangePicker.tsx` | Componente | Selector de fecha inicio / fecha fin con inputs de tipo date |
| `frontend/src/services/reportesService.ts` | Service | Llamadas HTTP a los tres endpoints de reportes |
| `frontend/src/hooks/useReportes.ts` | Hook | TanStack Query hooks: `useReporteEnvios`, `useRepartidoresRanking` |
| `frontend/src/types/reportes.ts` | Tipos | Interfaces `ReporteEnviosDto`, `RepartidorRankingDto`, `ReporteEnviosFiltroDto` |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/router/index.tsx` | Reemplazar `<PlaceholderPage title="Reportes" />` por `<ReportesPage />` e importar el componente |

### Reutilización de recharts

`EnviosPieChart.tsx` ya importa `PieChart`, `Cell`, `Tooltip`, `Legend`, `ResponsiveContainer` de recharts. `EnviosPorDiaChart.tsx` importará adicionalmente `BarChart`, `Bar`, `XAxis`, `YAxis`, `CartesianGrid` del mismo paquete (ya instalado).

### Exportación CSV desde el frontend

`reportesService.exportEnvios(desde, hasta)` realizará una llamada con `axios({ responseType: 'blob' })`. El handler en el componente creará un `<a>` temporal con `URL.createObjectURL(blob)` y lo accionará programáticamente para disparar la descarga del archivo.

---

## 5. Decisiones técnicas

| Decisión | Elegida | Descartada | Justificación |
|---|---|---|---|
| Agrupación por día | JS en el servicio (sobre resultados de `findMany`) | Raw SQL con `DATE_TRUNC` | Menor complejidad; Prisma no soporta `DATE_TRUNC` en `groupBy` directamente. Aceptable para rangos de hasta 90 días. |
| Generación CSV | Servidor (endpoint dedicado) | Cliente (librería `papaparse`) | Los datos individuales no se cargan en el frontend; el servidor tiene acceso completo sin round-trip extra. |
| Ranking de repartidores | Cálculo en el servicio sobre `Repartidor → Ruta → Envio` | Vista/query SQL dedicada | El grafo ya existe en Prisma y la cardinalidad es manejable; no justifica una vista adicional. |

---

## 6. Seguridad

- Todos los endpoints de reportes están protegidos por `authMiddleware` (valida JWT Bearer) + `roleMiddleware('OPERADOR')` (deniega CLIENTE y REPARTIDOR con 403).
- Los parámetros `desde` y `hasta` se validan con un schema Zod (`reporteEnviosFiltroSchema`) antes de llegar al servicio: formato ISO date, ambos requeridos, `desde <= hasta`.
- El CSV no incluye datos sensibles (passwords, tokens). Solo campos de negocio del envío.
- El endpoint de exportación aplica el mismo middleware de auth/rol que los demás.
