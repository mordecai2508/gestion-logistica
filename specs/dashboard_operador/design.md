# Design — dashboard_operador

---

## 1. Endpoints

All endpoints require `Authorization: Bearer <accessToken>` and `roleMiddleware('OPERADOR')`.

| Método | Ruta | Auth | Payload entrada | Payload salida | HTTP |
|--------|------|------|-----------------|----------------|------|
| GET | `/api/v1/dashboard/metrics` | OPERADOR | — | `{ data: DashboardMetricsDto, message, status }` | 200 |
| GET | `/api/v1/dashboard/envios-recientes` | OPERADOR | — | `{ data: EnvioRecienteDto[], message, status }` | 200 |
| GET | `/api/v1/dashboard/rutas-pendientes` | OPERADOR | — | `{ data: RutaPendienteDto[], message, status }` | 200 |
| GET | `/api/v1/dashboard/vehiculos-disponibles` | OPERADOR | — | `{ data: VehiculoDisponibleDto[], message, status }` | 200 |

### DTOs de respuesta

```
DashboardMetricsDto {
  totalEnvios: number
  enRuta: number
  entregados: number
  incidenciasAbiertas: number
}

EnvioRecienteDto {
  codigoSeguimiento: string
  clienteNombre: string
  estado: EstadoEnvio
  createdAt: string   // ISO 8601 UTC
}

RutaPendienteDto {
  id: string
  codigo: string
  nombre: string | null
  createdAt: string   // ISO 8601 UTC
}

VehiculoDisponibleDto {
  id: string
  placa: string
  modelo: string
  estado: EstadoVehiculo   // always "DISPONIBLE"
}
```

Errores siguiendo la convención global:
- 401 → `{ error: "UNAUTHORIZED", message: "...", statusCode: 401 }` (authMiddleware)
- 403 → `{ error: "FORBIDDEN", message: "...", statusCode: 403 }` (roleMiddleware)

---

## 2. Schema Prisma

No se requieren modelos nuevos ni cambios al schema. Los 4 endpoints hacen consultas de conteo y listado sobre modelos existentes: `Envio`, `Incidencia`, `Ruta` y `Vehiculo`.

---

## 3. Lógica de negocio

### GET /metrics
El servicio ejecuta 4 queries en paralelo (`Promise.all`) para minimizar latencia:

1. `prisma.envio.count()` → `totalEnvios`
2. `prisma.envio.count({ where: { estado: 'EN_RUTA' } })` → `enRuta`
3. `prisma.envio.count({ where: { estado: 'ENTREGADO' } })` → `entregados`
4. `prisma.incidencia.count({ where: { estado: 'ABIERTA' } })` → `incidenciasAbiertas`

Usar `count` de Prisma (delegado a SQL `COUNT(*)`) — nunca traer todos los registros en memoria para contar.

### GET /envios-recientes
```
prisma.envio.findMany({
  take: 5,
  orderBy: { createdAt: 'desc' },
  select: {
    codigoSeguimiento: true,
    estado: true,
    createdAt: true,
    cliente: {
      select: {
        usuario: { select: { nombre: true } }
      }
    }
  }
})
```
El servicio mapea cada resultado para exponer `clienteNombre` (aplanado del join `cliente.usuario.nombre`).

### GET /rutas-pendientes
```
prisma.ruta.findMany({
  take: 5,
  where: { estado: 'PENDIENTE' },
  orderBy: { createdAt: 'asc' },
  select: { id: true, codigo: true, nombre: true, createdAt: true }
})
```

Justificación del estado "pendiente": según el enum `EstadoRuta` del schema (`PENDIENTE | EN_CURSO | EN_PROGRESO | COMPLETADA | CANCELADA`), solo `PENDIENTE` corresponde a rutas que todavía no han comenzado su ejecución. El wireframe muestra una lista "Rutas Pendientes" con rutas aún no asignadas a un repartidor en marcha.

### GET /vehiculos-disponibles
```
prisma.vehiculo.findMany({
  take: 5,
  where: { estado: 'DISPONIBLE' },
  orderBy: { placa: 'asc' },
  select: { id: true, placa: true, modelo: true, estado: true }
})
```

---

## 4. Frontend — Pantalla y componentes

### Ruta
`/dashboard` → ya registrada en `frontend/src/router/index.tsx` dentro del grupo `<OperadorLayout>`. Actualmente renderiza `<DashboardPage />` (placeholder `<div>Dashboard</div>`). Esta feature reemplaza ese placeholder con el componente real.

### Estructura de archivos a crear

```
frontend/src/
├── features/
│   └── dashboard/
│       ├── DashboardOperador.tsx        — página principal
│       ├── MetricCard.tsx               — tarjeta de una métrica
│       ├── EnviosRecientesTable.tsx     — tabla de últimos 5 envíos
│       ├── EnviosPieChart.tsx           — gráfico de torta
│       ├── RutasPendientesPanel.tsx     — panel rutas pendientes
│       ├── VehiculosDisponiblesPanel.tsx — panel vehículos disponibles
│       └── __tests__/
│           └── DashboardOperador.test.tsx
├── services/
│   └── dashboardService.ts             — llamadas HTTP a los 4 endpoints
├── hooks/
│   └── useDashboard.ts                 — 4 useQuery de TanStack Query
└── types/
    └── dashboard.ts                    — interfaces DashboardMetricsDto, etc.
```

### Hooks (TanStack Query)

`useDashboard.ts` exporta 4 hooks independientes:
- `useDashboardMetrics()` → `useQuery({ queryKey: ['dashboard', 'metrics'], ... })`
- `useEnviosRecientes()` → `useQuery({ queryKey: ['dashboard', 'enviosRecientes'], ... })`
- `useRutasPendientes()` → `useQuery({ queryKey: ['dashboard', 'rutasPendientes'], ... })`
- `useVehiculosDisponibles()` → `useQuery({ queryKey: ['dashboard', 'vehiculosDisponibles'], ... })`

Stale time sugerido: 60 s (el dashboard es un snapshot, no necesita revalidación cada segundo).

### Router update
En `frontend/src/router/index.tsx` sustituir:
```
const DashboardPage = () => <div>Dashboard</div>;
```
por la importación real de `DashboardOperador`.

---

## 5. Decisión técnica — Librería de gráficos

### Situación actual
`recharts` **no está** en `frontend/package.json`. Las dependencias de producción actuales son: react, react-dom, react-router-dom, axios, zod, zustand, @tanstack/react-query, react-hook-form, leaflet, react-leaflet, lucide-react, socket.io-client y utilidades de Shadcn/UI. No existe ninguna librería de gráficos instalada.

### Opciones evaluadas

| Opción | Pros | Contras |
|--------|------|---------|
| **Instalar `recharts`** (mencionado en el acceptance criterion) | El criterio de aceptación lo menciona explícitamente; API declarativa para React; ampliamente mantenido; ~200 kB minificado | Agrega una nueva dependencia de producción; requiere decisión humana |
| Gráfico SVG inline sin dependencia | Cero dependencias nuevas | Complejidad de mantenimiento; cálculo manual de ángulos del sector circular; más código que mantener |
| `chart.js` + `react-chartjs-2` | Popular, flexible | Dos dependencias en lugar de una; no mencionado en el spec |

### Decisión adoptada en este spec
Este spec diseña el componente `EnviosPieChart.tsx` asumiendo que **`recharts` se instalará** (`npm install recharts`), ya que el criterio de aceptación lo menciona explícitamente ("recharts o similar") y es la opción con menor complejidad de implementación. **Sin embargo, la instalación de una nueva dependencia de producción requiere confirmación humana** antes de que el implementer la ejecute (ver sección de ambigüedades en la nota al leader).

Si el humano decide no agregar `recharts`, el implementer debe implementar el gráfico de torta con SVG nativo. El componente `EnviosPieChart.tsx` debe encapsular completamente la implementación del gráfico, de modo que el cambio de estrategia solo afecte a ese archivo.

### Datos para el gráfico de torta
El gráfico muestra la distribución de envíos por estado. Los datos se obtienen llamando `GET /api/v1/dashboard/metrics` (que ya devuelve `enRuta` y `entregados`) y se complementa con:
- `pendientes = totalEnvios - enRuta - entregados - (otros estados)`

Para mostrar todos los estados con color distinto, se añade un quinto endpoint o se amplía la respuesta de `/metrics`. **Decisión**: mantener el endpoint `/metrics` con las 4 métricas ya definidas (que cubren los criterios de aceptación) y calcular el gráfico de torta desde esos 4 valores. El segmento "Otros" agrupa los estados restantes (`PENDIENTE`, `EN_PREPARACION`, `EN_TRANSITO`, `CANCELADO`, `FALLIDO`).

Fórmula: `otros = totalEnvios - enRuta - entregados`.
El gráfico muestra 3 sectores: En Ruta (azul), Entregados (verde), Otros (gris).

---

## 6. Seguridad

- Los 4 endpoints requieren `authMiddleware` + `roleMiddleware('OPERADOR')`. Ningún endpoint es público.
- No se aceptan query params ni body: los endpoints son GET sin input del usuario, eliminando la superficie de inyección.
- No se exponen IDs internos de Cliente ni datos personales más allá del nombre del cliente en `/envios-recientes`.
- En el frontend, los datos del dashboard se obtienen con el `accessToken` del store Zustand; si el token expira, el interceptor de Axios redirige a `/login`.
