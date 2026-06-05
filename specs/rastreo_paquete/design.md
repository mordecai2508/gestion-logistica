# Design — rastreo_paquete

> Feature id: 6 | Sprint 3
> Este documento describe el "cómo" técnico. Los requisitos están en requirements.md.

---

## 1. Endpoints

| # | Método | Ruta | Auth | Rol requerido | Payload entrada | Respuesta éxito | Códigos HTTP |
|---|--------|------|------|---------------|-----------------|-----------------|--------------|
| 1 | GET | `/api/v1/tracking/:codigo` | Ninguna (público) | — | Param URL: `codigo` | `{ data: TrackingResponseDto, message, status: 200 }` | 200, 404, 422 |

### Parámetro de entrada

| Parámetro | Tipo | Validación |
|-----------|------|------------|
| `codigo` | string (URL param) | Regex `/^TRK-\d{8}-[A-Z0-9]{8}$/` vía Zod en el controlador |

### Payload de respuesta exitosa (`TrackingResponseDto`)

```json
{
  "codigoSeguimiento": "TRK-YYYYMMDD-XXXXXXXX",
  "estado": "EN_RUTA",
  "remitente": "string",
  "destinatario": "string",
  "direccionDestino": "string",
  "ultimaActualizacion": "2026-06-05T14:30:00.000Z",
  "eventos": [
    {
      "id": "cuid",
      "estado": "PENDIENTE",
      "descripcion": "Envío creado",
      "lat": null,
      "lng": null,
      "timestamp": "2026-06-05T10:00:00.000Z"
    },
    {
      "id": "cuid",
      "estado": "EN_RUTA",
      "descripcion": "Actualización de ubicación",
      "lat": 4.711,
      "lng": -74.0721,
      "timestamp": "2026-06-05T14:30:00.000Z"
    }
  ]
}
```

### Respuestas de error

| Situación | Código HTTP | `error` |
|-----------|-------------|---------|
| `codigo` no tiene formato `TRK-YYYYMMDD-XXXXXXXX` | 422 | `VALIDATION_ERROR` |
| Envío no encontrado en BD | 404 | `ENVIO_NOT_FOUND` |

---

## 2. Cambios al schema Prisma

No se requieren migraciones nuevas. Los campos `lat` y `lng` ya existen como `Float?` en `EventoEnvio` (visible en `envioTypes.ts` → `EventoEnvioDto`). Los modelos `Envio` y `EventoEnvio` ya están correctamente definidos.

### Campos de `EventoEnvio` relevantes para esta feature

| Campo | Tipo Prisma | Descripción |
|-------|-------------|-------------|
| `lat` | `Float?` | Latitud; `null` para eventos sin componente geográfico |
| `lng` | `Float?` | Longitud; `null` para eventos sin componente geográfico |
| `estado` | `EstadoEnvio` | Estado del envío en el momento del evento |
| `descripcion` | `String` | Texto descriptivo; `"Actualización de ubicación"` para eventos de Socket.IO |
| `timestamp` | `DateTime` | Marca de tiempo automática (`@default(now())`) |

---

## 3. Lógica de negocio

### 3.1 Servicio de tracking (`trackingService`)

```
trackingService.getByCodigoSeguimiento(codigo):
  1. trackingRepository.findByCodigo(codigo)
     → incluye eventos ordenados por timestamp ASC
     → si null → lanzar AppError('ENVIO_NOT_FOUND', 404)
  2. Calcular ultimaActualizacion = eventos[eventos.length - 1].timestamp
     → si eventos vacíos → usar envio.updatedAt
  3. Mapear a TrackingResponseDto y devolver
```

### 3.2 Socket.IO — handler `location:update` (socket)

El manejador vive en `backend/src/sockets/tracking.ts` y se registra en `backend/src/index.ts` dentro del bloque `io.on('connection', ...)`.

```
onLocationUpdate(socket, io, payload):
  1. Validar payload: { envioId: string, lat: number, lng: number }
     → si inválido → socket.emit('tracking:error', { message: 'Payload inválido' }); return
  2. envioRepository.findById(envioId)
     → si null → socket.emit('tracking:error', { message: 'Envío no encontrado' }); return
  3. Crear EventoEnvio:
     trackingRepository.createEventoUbicacion({
       envioId,
       estado: envio.estado,          // estado actual del Envio
       descripcion: 'Actualización de ubicación',
       lat,
       lng,
     })
  4. io.to(`tracking:${envioId}`).emit('tracking:location', {
       envioId,
       lat,
       lng,
       timestamp: new Date().toISOString(),
     })
```

### 3.3 Socket.IO — handlers de sala

```
onTrackingJoin(socket, payload):
  Validar payload tiene { envioId: string }
  socket.join(`tracking:${envioId}`)

onTrackingLeave(socket, payload):
  Validar payload tiene { envioId: string }
  socket.leave(`tracking:${envioId}`)
```

### 3.4 Repositorio de tracking (`trackingRepository`)

Nuevo repositorio (`backend/src/repositories/trackingRepository.ts`) para separar responsabilidades. Métodos:

- `findByCodigo(codigo: string)` — devuelve `Envio` con `eventos` incluidos (ordenados ASC por timestamp) o `null`.
- `createEventoUbicacion(data: CreateEventoUbicacionDto)` — inserta un `EventoEnvio` con `lat`/`lng` no nulos.

El repositorio `envioRepository` existente no se modifica; solo se añade el nuevo repositorio para no violar la separación de responsabilidades.

---

## 4. Frontend

### 4.1 Componente: `frontend/src/features/tracking/RastrearPaquete.tsx`

Pantalla principal disponible en la ruta `/tracking` (accesible sin autenticación).

**Estructura visual (según wireframe):**
1. Campo de texto "Ingrese código de seguimiento" + botón "Buscar".
2. Badge de estado actual (color-coded según `estado`).
3. Texto "Última actualización: DD/MM/YYYY – HH:MM AM/PM".
4. Mapa Leaflet interactivo con marcador.
5. Historial de eventos como línea de tiempo vertical.

**Lógica del componente:**
- Estado local `codigoInput` para el campo de texto.
- Llama a `useTracking(codigo)` hook cuando el usuario presiona "Buscar".
- Al recibir resultado, conecta Socket.IO a `tracking:${envioId}` y escucha `tracking:location`.
- Al desmontar el componente (o cambiar de código), emite `tracking:leave` y desconecta.

### 4.2 Hook: `frontend/src/hooks/useTracking.ts`

```typescript
export const useTracking = (codigo: string | null) => {
  return useQuery({
    queryKey: ['tracking', codigo],
    queryFn: () => trackingService.getByCodigo(codigo!),
    enabled: !!codigo,
  });
};
```

### 4.3 Servicio: `frontend/src/services/trackingService.ts`

```typescript
export const trackingService = {
  async getByCodigo(codigo: string): Promise<TrackingResponseDto> {
    const res = await api.get(`/tracking/${codigo}`);
    return res.data.data;
  },
};
```

La instancia `api` es el Axios configurado con `baseURL = /api/v1`. Para este endpoint no se adjunta el header `Authorization` (endpoint público).

### 4.4 Hook Socket.IO: `frontend/src/hooks/useTrackingSocket.ts`

```typescript
export const useTrackingSocket = (
  envioId: string | null,
  onLocation: (payload: TrackingLocationPayload) => void,
) => {
  useEffect(() => {
    if (!envioId) return;
    socket.emit('tracking:join', { envioId });
    socket.on('tracking:location', onLocation);
    return () => {
      socket.emit('tracking:leave', { envioId });
      socket.off('tracking:location', onLocation);
    };
  }, [envioId]);
};
```

`socket` es la instancia singleton de `socket.io-client` configurada con la URL del backend.

### 4.5 Componente: `frontend/src/features/tracking/TrackingMap.tsx`

Componente que encapsula el mapa Leaflet. Recibe `lat`, `lng` (posición inicial del marcador) y un callback `onMove` o acepta actualizaciones via prop. Cuando `lat`/`lng` son `null`, renderiza el mapa centrado en coordenadas por defecto (lat: 4.711, lng: -74.0721, zoom 12) sin marcador.

### 4.6 Componente: `frontend/src/features/tracking/EventoTimeline.tsx`

Lista los `EventoEnvio` como una línea de tiempo vertical. Cada fila muestra: icono de estado, `timestamp` formateado como `DD/MM/YYYY – HH:MM AM/PM`, badge de `estado`.

### 4.7 Tipos: `frontend/src/types/trackingTypes.ts`

```typescript
export interface EventoEnvioTrackingDto {
  id: string;
  estado: string;
  descripcion: string;
  lat: number | null;
  lng: number | null;
  timestamp: string; // ISO 8601
}

export interface TrackingResponseDto {
  codigoSeguimiento: string;
  estado: string;
  remitente: string;
  destinatario: string;
  direccionDestino: string;
  ultimaActualizacion: string; // ISO 8601
  eventos: EventoEnvioTrackingDto[];
}

export interface TrackingLocationPayload {
  envioId: string;
  lat: number;
  lng: number;
  timestamp: string; // ISO 8601
}
```

### 4.8 Router

La ruta `/tracking` se agrega al router de React Router como ruta pública (sin `ProtectedRoute`), ya que el endpoint REST y la pantalla son accesibles sin autenticación.

---

## 5. Decisiones técnicas clave

### 5.1 Endpoint público sin autenticación

**Opción A (elegida):** `GET /api/v1/tracking/:codigo` sin `authMiddleware`. El código de seguimiento actúa como secreto compartido de facto (formato opaco, 16^8 ≈ 4.3 mil millones de combinaciones). No expone datos personales sensibles más allá del estado y las direcciones del envío.

**Opción B (descartada):** Requerir login de CLIENTE. Descartada porque el acceptance criterion establece explícitamente "sin auth requerida" y porque el caso de uso previsto es que el cliente comparta el código con terceros para rastrear el paquete.

### 5.2 Socket.IO en handler separado

**Opción A (elegida):** Handler en `backend/src/sockets/tracking.ts`, registrado en `index.ts` pasando la instancia `io`. Este patrón mantiene la lógica de sockets fuera de `index.ts` y es coherente con la carpeta `sockets/` ya definida en la arquitectura.

**Opción B (descartada):** Implementar el handler directamente en `index.ts` dentro del bloque `io.on('connection', ...)`. Descartada porque violaría la separación de capas y haría el archivo `index.ts` más difícil de mantener.

### 5.3 Persistencia del evento de ubicación

**Opción A (elegida):** Cada `location:update` del repartidor persiste un `EventoEnvio` con `lat`/`lng` y `descripcion = "Actualización de ubicación"`. Esto garantiza que el historial de rastreo es recuperable vía REST y no depende de que el cliente esté conectado en tiempo real al momento del evento.

**Opción B (descartada):** Solo rebroadcast en memoria sin persistencia. Descartada porque los clientes que se conecten después de que se emitió la actualización no verían la última posición conocida del paquete.

### 5.4 Leaflet en React

Se usa `react-leaflet` (wrapper oficial de Leaflet para React). El marcador se actualiza llamando a `setPosition` del estado local del componente `TrackingMap`, que re-renderiza el `<Marker>` de react-leaflet sin recargar el mapa completo.

---

## 6. Seguridad

| Capa | Medida |
|------|--------|
| Endpoint público | No expone IDs internos ni datos personales de alta sensibilidad; solo devuelve estado, fechas y direcciones. El `id` interno del `Envio` no se incluye en `TrackingResponseDto` |
| Validación de parámetro | Zod valida el formato exacto del `codigo` antes de hacer cualquier consulta a la base de datos (R6) |
| Socket.IO `location:update` | La validación del payload se realiza en el handler antes de cualquier operación en BD; errores se emiten solo al socket emisor (R11) |
| Queries | Todas las consultas usan Prisma ORM con parámetros vinculados; no hay concatenación de strings para queries |
| Rate limiting | El endpoint `/api/v1/tracking/*` puede quedar expuesto a abuso; se recomienda añadir `express-rate-limit` (máx. 30 req/min por IP) en la ruta de tracking |
| CORS | La configuración de CORS existente en `index.ts` aplica a todos los endpoints, incluyendo el de tracking |
