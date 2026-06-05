# Implementación — rastreo_paquete

> Feature id: 6 | Sprint 3 | Implementado: 2026-06-05

---

## Archivos creados

### Backend

| Archivo | Descripción |
|---------|-------------|
| `backend/src/validators/trackingValidator.ts` | Schemas Zod: `trackingCodigoSchema`, `locationUpdateSchema` |
| `backend/src/types/trackingTypes.ts` | Interfaces: `TrackingEventoDto`, `TrackingResponseDto`, `CreateEventoUbicacionDto` |
| `backend/src/repositories/trackingRepository.ts` | `findByCodigo`, `createEventoUbicacion` |
| `backend/src/services/trackingService.ts` | `getByCodigoSeguimiento` — lógica de negocio |
| `backend/src/controllers/trackingController.ts` | `getTrackingByCodigo` — handler HTTP |
| `backend/src/routes/tracking.ts` | Router Express — `GET /:codigo` sin `authMiddleware` |
| `backend/src/sockets/tracking.ts` | `registerTrackingHandlers` — Socket.IO handlers |
| `backend/src/tests/tracking.test.ts` | 9 tests: R1–R11 (HTTP + Socket.IO) |

### Backend modificado

| Archivo | Cambio |
|---------|--------|
| `backend/src/index.ts` | Import `trackingRouter` + `registerTrackingHandlers`; registro en `app` y `io.on('connection')` |

### Frontend

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/types/trackingTypes.ts` | Interfaces: `EventoEnvioTrackingDto`, `TrackingResponseDto`, `TrackingLocationPayload` |
| `frontend/src/services/trackingService.ts` | `getByCodigo` — llamada Axios GET `/tracking/:codigo` |
| `frontend/src/hooks/useTracking.ts` | Hook TanStack Query `useTracking(codigo)` |
| `frontend/src/hooks/useTrackingSocket.ts` | Hook Socket.IO `useTrackingSocket(envioId, onLocation)` |
| `frontend/src/lib/socket.ts` | Singleton `socket` de `socket.io-client` |
| `frontend/src/features/tracking/TrackingMap.tsx` | Componente Leaflet con marcador actualizable |
| `frontend/src/features/tracking/EventoTimeline.tsx` | Línea de tiempo de eventos |
| `frontend/src/features/tracking/RastrearPaquete.tsx` | Pantalla principal `/tracking` |
| `frontend/src/features/tracking/RastrearPaquete.test.tsx` | 6 tests: R17–R25 |

### Frontend modificado

| Archivo | Cambio |
|---------|--------|
| `frontend/src/router/index.tsx` | Import `RastrearPaquete`; ruta pública `/tracking`; eliminada de `ProtectedRoute` de CLIENTE |

### Backend devDependency instalada

- `socket.io-client` (para tests de Socket.IO)

---

## Tabla de trazabilidad

| Requisito | Descripción | Test | Archivo:línea |
|-----------|-------------|------|---------------|
| R1 | GET 200 con TrackingResponseDto | `debe retornar HTTP 200 con TrackingResponseDto y eventos ordenados por timestamp ASC` | `tracking.test.ts:102` |
| R2 | eventos ordenados ASC | (incluido en test R1) | `tracking.test.ts:116` |
| R3 | ultimaActualizacion = último evento | (incluido en test R1) | `tracking.test.ts:118` |
| R4 | GET 404 código no existe | `debe retornar HTTP 404 cuando el código no existe en la BD` | `tracking.test.ts:128` |
| R5 | GET 200 sin Authorization | `debe retornar HTTP 200 sin header Authorization` | `tracking.test.ts:140` |
| R6 | GET 422 formato inválido | `debe retornar HTTP 422 cuando el código no tiene formato TRK-YYYYMMDD-XXXXXXXX` | `tracking.test.ts:152` |
| R8 | socket emite tracking:location a sala | `debe emitir tracking:location a la sala tracking:${envioId}` | `tracking.test.ts:192` |
| R9 | crea EventoEnvio con lat/lng/descripcion | `debe crear un EventoEnvio con lat, lng y descripcion "Actualización de ubicación"` | `tracking.test.ts:221` |
| R10 | tracking:error si envioId no existe | `debe emitir tracking:error al socket emisor cuando envioId no existe` | `tracking.test.ts:242` |
| R11 | tracking:error si payload inválido | `debe emitir tracking:error al socket emisor cuando el payload carece del campo lat` | `tracking.test.ts:255` |
| R17 | pantalla con input y botón | `debe renderizar el campo de búsqueda y el botón "Buscar"` | `RastrearPaquete.test.tsx:81` |
| R18 | llama API con código | `debe llamar a trackingService.getByCodigo con el código introducido` | `RastrearPaquete.test.tsx:95` |
| R19 | muestra badge, fecha, mapa | `debe mostrar el badge de estado, la última actualización y el mapa` | `RastrearPaquete.test.tsx:112` |
| R22 | timeline con eventos | `debe renderizar la línea de tiempo con los eventos recibidos` | `RastrearPaquete.test.tsx:133` |
| R24 | error 404 → mensaje | `debe mostrar "Código de seguimiento no encontrado" cuando el API devuelve 404` | `RastrearPaquete.test.tsx:152` |
| R25 | input vacío → error inline | `debe mostrar error inline y no llamar a la API cuando el campo está vacío` | `RastrearPaquete.test.tsx:86` |

---

## Resultado de verificación

| Verificación | Resultado |
|---|---|
| `npm run lint` (backend) | ✅ 0 errores |
| `npm run lint` (frontend) | ✅ 0 errores |
| `npm run test` (backend) | ✅ 96/96 passing (9 nuevos en tracking.test.ts) |
| `npm run test` (frontend) | ✅ 52/52 passing (6 nuevos en RastrearPaquete.test.tsx) |
| `npm run build` (backend) | ✅ Sin errores TypeScript |
| `npm run build` (frontend) | ✅ Sin errores TypeScript |

---

## Tasks completadas

- [x] T1. `trackingValidator.ts`
- [x] T2. `types/trackingTypes.ts` (backend)
- [x] T3. `trackingRepository.ts`
- [x] T4. `trackingService.ts`
- [x] T5. `trackingController.ts`
- [x] T6. `routes/tracking.ts` + registro en `index.ts`
- [x] T7. `sockets/tracking.ts`
- [x] T8. Actualizar `index.ts` — `registerTrackingHandlers`
- [x] T9. `tests/tracking.test.ts` — 9 tests (R1–R11)
- [x] T10. `frontend/src/types/trackingTypes.ts`
- [x] T11. `frontend/src/services/trackingService.ts`
- [x] T12. `frontend/src/hooks/useTracking.ts`
- [x] T13. `frontend/src/hooks/useTrackingSocket.ts`
- [x] T14. `frontend/src/features/tracking/TrackingMap.tsx`
- [x] T15. `frontend/src/features/tracking/EventoTimeline.tsx`
- [x] T16. `frontend/src/features/tracking/RastrearPaquete.tsx`
- [x] T17. Router actualizado — `/tracking` como ruta pública
- [x] T18. `RastrearPaquete.test.tsx` — 6 tests (R17–R25)
- [x] T19. `npm run lint` — ✅ backend / ✅ frontend
- [x] T20. `npm run test` — ✅ backend 96/96
- [x] T21. `npm run test` — ✅ frontend 52/52
- [x] T22. `npm run build` — ✅ backend / ✅ frontend
