# Design — repartidor_rutas_mapa

> Feature 100% frontend. No hay endpoints nuevos ni cambios al schema Prisma.

---

## 1. Endpoints

Ningún endpoint nuevo. La feature reutiliza el endpoint ya implementado por `rutas_gestion`:

| Método | Ruta | Auth | Query | Respuesta | HTTP |
|--------|------|------|-------|-----------|------|
| GET | `/api/v1/rutas` | Bearer JWT (cualquier rol autenticado; el backend filtra por `req.user.rol`) | `?page&limit&repartidorId=me` | `PaginatedRutasResponse` (`{ data: RutaDto[], meta, message, status }`) | 200 |

Confirmado en `backend/src/services/rutaService.ts` (`listar`): cuando `req.user.rol === 'REPARTIDOR'`, el servicio ignora cualquier `repartidorId` recibido y resuelve el repartidor a partir de `req.user.id` (vía `resolverRepartidorPorUsuario`), devolviendo únicamente las rutas asignadas a ese repartidor. El query param `repartidorId=me` documentado en el criterio de aceptación es, para un usuario REPARTIDOR, redundante pero inofensivo (mismo resultado con o sin él) — se incluye igualmente porque así lo exige el criterio de aceptación y porque deja explícita la intención en el código del frontend.

No se usa paginación visible en la UI: se solicita `page=1&limit=50` (suficiente para el caso de uso de un repartidor con un número acotado de rutas activas; igual patrón que otras pantallas de "mis X" del repartidor que no paginan).

`RutaDto` (frontend, `frontend/src/types/rutaTypes.ts`) — shape ya existente, sin cambios:

```ts
export interface RutaDto {
  id: string;
  codigo: string;
  estado: EstadoRuta; // 'PENDIENTE' | 'EN_CURSO' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA'
  createdAt: string;
  updatedAt: string;
  vehiculo: VehiculoDto;
  repartidor: RepartidorDto;
  envios: EnvioEnRutaDto[];
}

export interface EnvioEnRutaDto {
  id: string;
  codigoSeguimiento: string;
  estado: string;
  direccionDestino: string;
  lat?: number | null;
  lng?: number | null;
}
```

`lat`/`lng` provienen de `Envio.lat` / `Envio.lng` (`Float?` en `backend/prisma/schema.prisma`), expuestos tal cual en `EnvioEnRutaDto`.

No se usa el endpoint `POST /api/v1/auth/logout` directamente desde esta spec más allá de invocar `authService.logout()`, que ya existe y ya es usado por `ProfileMenu.tsx` (`frontend/src/services/authService.ts`).

---

## 2. Schema Prisma

Sin cambios. Los campos `Envio.lat` y `Envio.lng` (`Float?`) ya existen y ya se exponen vía `EnvioEnRutaDto.lat` / `EnvioEnRutaDto.lng`. El enum `EstadoRuta` ya existe:

```prisma
enum EstadoRuta {
  PENDIENTE
  EN_CURSO
  EN_PROGRESO
  COMPLETADA
  CANCELADA
}
```

---

## 3. Lógica de negocio no obvia

### 3.1 Definición de "ruta activa" (R9)

De las rutas devueltas por `GET /api/v1/rutas?repartidorId=me&page=1&limit=50` (ya vienen ordenadas por el backend, sin orden adicional aplicado en el frontend), la **ruta activa** es:

> La primera ruta del array `data` cuyo campo `estado` **no** sea uno de los estados terminales: `COMPLETADA` o `CANCELADA`.

Estados no terminales (candidatos a ruta activa, en cualquier orden de aparición): `PENDIENTE`, `EN_CURSO`, `EN_PROGRESO`.

```ts
const ESTADOS_TERMINALES: EstadoRuta[] = ['COMPLETADA', 'CANCELADA'];

function obtenerRutaActiva(rutas: RutaDto[]): RutaDto | undefined {
  return rutas.find((r) => !ESTADOS_TERMINALES.includes(r.estado));
}
```

Si `rutas` está vacío, o todas las rutas tienen `estado` terminal, `obtenerRutaActiva` devuelve `undefined` → R11 (mensaje "Sin ubicaciones disponibles para mostrar").

### 3.2 Extracción de envíos con coordenadas (R10, R12)

A partir de la ruta activa (si existe), se filtran sus `envios`:

```ts
function enviosConCoordenadas(ruta: RutaDto | undefined): EnvioEnRutaDto[] {
  if (!ruta) return [];
  return ruta.envios.filter((e) => e.lat != null && e.lng != null);
}
```

- Si `ruta` es `undefined` → array vacío → R11.
- Si `ruta` existe pero `enviosConCoordenadas(ruta).length === 0` → R12 (mismo mensaje "Sin ubicaciones disponibles para mostrar").
- Si `enviosConCoordenadas(ruta).length > 0` → se renderiza el mapa con un `<Marker>` por envío (R10).

### 3.3 Centro y zoom inicial del mapa

Siguiendo el patrón de `TrackingMap.tsx`: el mapa se centra en el promedio (centroide simple) de las coordenadas de los envíos con `lat`/`lng`, o en el primer marcador si solo hay uno. Zoom inicial fijo (p. ej. `13`), igual de simple que `TrackingMap`. No se requiere lógica de "fit bounds" automática para cumplir los criterios de aceptación; se documenta como posible mejora futura, no bloqueante.

---

## 4. Frontend

### 4.1 Qué ya existe y se reutiliza sin modificar

| Asset | Archivo | Uso |
|---|---|---|
| `useRutas` | `frontend/src/hooks/useRutas.ts` | TanStack Query hook, acepta `RutaFilters` (`{ page, limit, repartidorId }`). Se reutiliza sin cambios: `useRutas({ page: 1, limit: 50, repartidorId: 'me' })`. |
| `rutaService.listar` | `frontend/src/services/rutaService.ts` | Ya soporta `filters.repartidorId`. Sin cambios. |
| `RutaDto`, `EnvioEnRutaDto`, `EstadoRuta`, `RutaFilters` | `frontend/src/types/rutaTypes.ts` | Sin cambios. |
| Patrón de mapa Leaflet de solo lectura | `frontend/src/features/tracking/TrackingMap.tsx` | Se usa como referencia directa de configuración de `MapContainer`/`TileLayer`/fix de iconos. |
| `authService.logout()` | `frontend/src/services/authService.ts` | Reutilizado tal cual desde `Perfil.tsx`. |
| `useAuthStore.clearAuth` | `frontend/src/store/authStore.ts` | Reutilizado tal cual desde `Perfil.tsx`. |
| Patrón de logout (try/finally) | `frontend/src/components/shared/ProfileMenu.tsx` (`handleLogout`) | Se replica el mismo cuerpo de función en `Perfil.tsx`. |
| `RepartidorBottomNav` | `frontend/src/components/shared/RepartidorBottomNav.tsx` | Ya enlaza a `/repartidor/rutas` y `/repartidor/mapa` — sin cambios. |
| `RepartidorLayout` | `frontend/src/components/shared/RepartidorLayout.tsx` | Envuelve las nuevas pantallas — sin cambios. |
| `Badge` (Shadcn/UI) | `frontend/src/components/ui/badge.tsx` | Para mostrar `estado` de cada ruta/envío, igual que `RutaCard.tsx`. |
| `Card`, `CardContent` (Shadcn/UI) | `frontend/src/components/ui/*` | Para las tarjetas de ruta, igual que `VistaRepartidor.tsx`. |

### 4.2 Componentes nuevos

| Componente | Ubicación | Descripción |
|---|---|---|
| `RutasRepartidor` | `frontend/src/features/repartidor/RutasRepartidor.tsx` | Pantalla `/repartidor/rutas`. Lista las rutas asignadas al repartidor autenticado. |
| `RutaRepartidorCard` | definido inline en `RutasRepartidor.tsx` (no requiere archivo propio — sigue el patrón de `EntregaCard` en `VistaRepartidor.tsx`) | Tarjeta de solo lectura: código, badge de `estado`, lista de envíos (código de seguimiento + dirección + estado). |
| `MapaRepartidor` | `frontend/src/features/repartidor/MapaRepartidor.tsx` | Pantalla `/repartidor/mapa`. Calcula la ruta activa y renderiza `RepartidorMap` o el mensaje vacío. |
| `RepartidorMap` | `frontend/src/features/repartidor/RepartidorMap.tsx` | Componente de mapa Leaflet de solo lectura (`MapContainer` + `TileLayer` + `Marker[]`), modelado sobre `TrackingMap.tsx`. Recibe `envios: EnvioEnRutaDto[]` (ya filtrados, todos con `lat`/`lng` no nulos). |

### 4.3 Hooks / servicios nuevos

Ninguno. `RutasRepartidor` y `MapaRepartidor` usan `useRutas({ page: 1, limit: 50, repartidorId: 'me' })` directamente — mismo hook que usa `GestionRutas.tsx` (operador), parametrizado distinto.

> Nota de diseño: ambas pantallas (`/repartidor/rutas` y `/repartidor/mapa`) llaman a `useRutas` con los mismos `filters`. TanStack Query deduplicará la request si ambas pantallas están montadas (no es el caso aquí, son rutas separadas) y cacheará por `queryKey: ['rutas', { page: 1, limit: 50, repartidorId: 'me' }]`, por lo que no hay llamadas redundantes relevantes.

### 4.4 Componentes a modificar

| Archivo | Modificación |
|---|---|
| `frontend/src/router/index.tsx` | Reemplazar `<Route path="/repartidor/rutas" element={<PlaceholderPage title="Rutas" />} />` por `<Route path="/repartidor/rutas" element={<RutasRepartidor />} />`. Reemplazar `<Route path="/repartidor/mapa" element={<PlaceholderPage title="Mapa" />} />` por `<Route path="/repartidor/mapa" element={<MapaRepartidor />} />`. Ambas dentro del grupo `RepartidorLayout` ya existente — sin cambios de anidación. Importar los dos nuevos componentes. |
| `frontend/src/features/auth/Perfil.tsx` | Agregar botón "Cerrar sesión" dentro de `<CardContent>`, debajo del formulario de edición. Importa `useNavigate` de `react-router-dom`, `authService` de `@/services/authService`, `useAuthStore` de `@/store/authStore`. Implementa `handleLogout` con el mismo cuerpo try/finally que `ProfileMenu.tsx`. |

### 4.5 Wireframe / layout de las nuevas pantallas

**`/repartidor/rutas`** — sigue el patrón mobile de `VistaRepartidor.tsx` (`mx-auto max-w-md space-y-4 p-4`):

```
┌─────────────────────────────┐
│ Mis Rutas                    │  <h1>
├─────────────────────────────┤
│ RUTA-0007        [EN_CURSO]  │  <Card> por ruta
│ Envíos:                       │
│  • TRK-...A1  Calle 1  [...] │  <li> por envío
│  • TRK-...A2  Calle 2  [...] │
├─────────────────────────────┤
│ RUTA-0008        [PENDIENTE] │
│ Envíos: ...                   │
└─────────────────────────────┘

(o, si data.length === 0)
┌─────────────────────────────┐
│ Mis Rutas                    │
│ No tienes rutas asignadas    │
└─────────────────────────────┘
```

**`/repartidor/mapa`** — pantalla de mapa a pantalla completa (similar a cómo `TrackingMap` ocupa `400px`/`100%` width, pero aquí se usa `h-[calc(100vh-<bottom-nav-height>)]` o similar, ajustable por el implementer dentro de las restricciones de `RepartidorLayout`):

```
┌─────────────────────────────┐
│ Mapa de Ruta Activa          │  <h1>
├─────────────────────────────┤
│                               │
│        [Leaflet map]         │
│      📍 📍 📍 (marcadores)   │
│                               │
└─────────────────────────────┘

(o, si no hay ruta activa / sin coordenadas)
┌─────────────────────────────┐
│ Mapa de Ruta Activa          │
│ Sin ubicaciones disponibles  │
│ para mostrar                 │
└─────────────────────────────┘
```

---

## 5. Decisión técnica clave

### Decisión A — Filtro `repartidorId=me` vs. omitir el query param

**Contexto.** `rutaService.listar` ya acepta `filters.repartidorId`. El servicio backend (`rutaService.listar` en `backend/src/services/rutaService.ts`) ignora `repartidorId` cuando `req.user.rol === 'REPARTIDOR'` y siempre resuelve las rutas del repartidor autenticado a partir del JWT — es decir, el resultado es idéntico con o sin `repartidorId=me` para un usuario REPARTIDOR.

**Opción elegida: incluir explícitamente `repartidorId: 'me'` en el `RutaFilters` pasado a `useRutas`.**

Justificación: el criterio de aceptación de `feature_list.json` especifica textualmente `GET /api/v1/rutas?repartidorId=me`. Aunque el backend no lo necesita para usuarios REPARTIDOR, incluirlo (a) documenta la intención en el código del frontend, (b) mantiene el contrato consistente si en el futuro el backend deja de inferir el rol exclusivamente del JWT, y (c) es el mismo patrón ya usado por `GestionRutas.tsx` para operadores filtrando por un repartidor específico — no introduce un código nuevo, solo un valor de filtro distinto.

**Alternativa descartada:** omitir `repartidorId` y confiar en que el backend infiera el repartidor del JWT. Funciona hoy, pero no satisface literalmente el criterio de aceptación y es menos explícito para quien lea el código del frontend.

### Decisión B — Componente de mapa: nuevo `RepartidorMap` vs. generalizar `TrackingMap`

**Opción elegida: crear un componente nuevo `RepartidorMap.tsx`, modelado sobre `TrackingMap.tsx` pero con una API distinta (multi-marcador en vez de un único punto).**

`TrackingMap` tiene una responsabilidad muy específica: un único marcador (posición actual del paquete rastreado), con `key={`${lat}-${lng}`}` para forzar re-render cuando la posición cambia vía socket. `RepartidorMap` necesita renderizar **N marcadores estáticos** (uno por envío de la ruta activa), sin necesidad de actualización en tiempo real ni de socket.

**Alternativa descartada: generalizar `TrackingMap` para aceptar `lat`/`lng` o `marcadores[]`.**
Descartada porque mezclaría dos responsabilidades (tracking en tiempo real de un solo paquete vs. mapa estático de múltiples paradas) en un mismo componente, complicando sus props y sus tests existentes (`TrackingMap` ya tiene tests que dependen de su API actual de un solo punto). Un componente nuevo y pequeño que reutiliza la misma configuración de Leaflet (import de CSS, fix de iconos, `TileLayer` de OpenStreetMap) es más simple de mantener y de testear de forma aislada.

**Configuración de Leaflet compartida (duplicación aceptada):** el fix de iconos por defecto (`delete L.Icon.Default.prototype._getIconUrl` + `mergeOptions`) se duplica en `RepartidorMap.tsx` igual que existe en `TrackingMap.tsx`. Es código de configuración de librería de 6 líneas; extraerlo a un módulo compartido (`frontend/src/lib/leafletConfig.ts`) es una mejora de limpieza fuera del alcance de esta feature — se documenta como gap conocido, no bloqueante.

### Decisión C — Ubicación del botón "Cerrar sesión" en `Perfil.tsx`

**Opción elegida: agregar el botón dentro de `<CardContent>`, después del `<form>` de edición de perfil, como un `<Button variant="outline">` o equivalente, separado visualmente (p. ej. con un `<hr>` o `mt-4 pt-4 border-t`).**

Justificación: `Perfil.tsx` es una pantalla compartida por los 3 roles y ya tiene una estructura de `Card` de una sola columna. Agregar el botón al final de la tarjeta es la ubicación menos invasiva y no requiere reestructurar el layout existente. El botón usa el mismo `handleLogout` (try/finally) que `ProfileMenu.tsx`, pero **no** se extrae a un hook compartido porque la lógica son 3 líneas y extraerla introduciría un archivo nuevo (`useLogout.ts`) para una duplicación mínima — documentado como posible mejora futura si aparece una tercera ubicación que necesite logout.

**Alternativa descartada:** extraer `useLogout()` como hook compartido entre `ProfileMenu` y `Perfil`. Descartada por ahora (YAGNI) — solo dos consumidores, lógica trivial, y el spec no pide refactorizar `ProfileMenu`.

---

## 6. Seguridad

- `/repartidor/rutas` y `/repartidor/mapa` están dentro del grupo de rutas ya protegido por `<ProtectedRoute allowedRoles={['REPARTIDOR']}>` + `<RepartidorLayout>` (ver `frontend/src/router/index.tsx`) — no se requiere protección adicional.
- `GET /api/v1/rutas?repartidorId=me` ya está protegido por `authMiddleware` en el backend (sin cambios). El backend resuelve el repartidor a partir de `req.user.id`, por lo que un repartidor nunca puede ver rutas de otro repartidor, incluso si manipulara el query param `repartidorId` (el backend lo ignora para rol REPARTIDOR).
- El mapa es estrictamente de solo lectura: no se agregan controles de edición, no se emite ningún evento Socket.IO (`location:update` queda fuera de esta feature — pertenece a otra feature de tracking del repartidor), y no se realiza ninguna mutación.
- El botón "Cerrar sesión" en `Perfil.tsx` reutiliza `authService.logout()`, que ya invalida la cookie `refreshToken` en el backend (`POST /api/v1/auth/logout`, sin cambios). El estado local (`accessToken`, `user`) se limpia siempre (`finally`), incluso si la llamada de red falla, evitando que un usuario quede "atascado" autenticado en el cliente tras un error de red.
