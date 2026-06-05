# Review — rastreo_paquete

> Feature id: 6 | Sprint 3 | Revisado: 2026-06-05
> Decisión: **APROBADO**

---

## 1. Tasks completadas

Todos los checkboxes T1–T22 están marcados `[x]` en `specs/rastreo_paquete/tasks.md`.

---

## 2. Trazabilidad de requisitos

| Requisito | Test que lo cubre | Verificado |
|-----------|-------------------|------------|
| R1 — GET 200 TrackingResponseDto | `tracking.test.ts` — R1/R2/R3 | ✅ |
| R2 — eventos ordenados ASC | incluido en R1 test | ✅ |
| R3 — ultimaActualizacion = último evento | incluido en R1 test | ✅ |
| R4 — GET 404 código inexistente | `tracking.test.ts` — R4 | ✅ |
| R5 — GET 200 sin Authorization | `tracking.test.ts` — R5 | ✅ |
| R6 — GET 422 formato inválido | `tracking.test.ts` — R6 (2 casos) | ✅ |
| R7 — validación de payload | cubierto por R11 (safeParse) | ✅ |
| R8 — rebroadcast tracking:location a sala | `tracking.test.ts` — R8 | ✅ |
| R9 — crea EventoEnvio con lat/lng/descripcion | `tracking.test.ts` — R9 | ✅ |
| R10 — tracking:error si envioId no existe | `tracking.test.ts` — R10 | ✅ |
| R11 — tracking:error si payload inválido | `tracking.test.ts` — R11 | ✅ |
| R12 — tracking:join → join room | implementado en sockets/tracking.ts | ✅ |
| R13 — forward tracking:location a sala | cubierto por R8 test | ✅ |
| R14 — tracking:leave → leave room | implementado en sockets/tracking.ts | ✅ |
| R15 — lat/lng nullable en EventoEnvio | tipos definidos en trackingTypes.ts | ✅ |
| R16 — lat/lng poblados desde location:update | cubierto por R9 test | ✅ |
| R17 — pantalla /tracking con input y botón | `RastrearPaquete.test.tsx` — R17 | ✅ |
| R18 — llama GET con código ingresado | `RastrearPaquete.test.tsx` — R18 | ✅ |
| R19 — muestra badge, fecha, mapa | `RastrearPaquete.test.tsx` — R19 | ✅ |
| R20 — mapa centrado en última coordenada | lógica en RastrearPaquete.tsx `getLastCoords` | ✅ |
| R21 — mapa default lat:4.711 lng:-74.0721 sin marcador | lógica en TrackingMap.tsx (DEFAULT_LAT/LNG) | ✅ |
| R22 — timeline con eventos | `RastrearPaquete.test.tsx` — R22 | ✅ |
| R23 — mueve marcador en tiempo real | `useTrackingSocket` + `setMarcadorPos` en RastrearPaquete | ✅ |
| R24 — error 404 → mensaje | `RastrearPaquete.test.tsx` — R24 | ✅ |
| R25 — input vacío → error inline, no llama API | `RastrearPaquete.test.tsx` — R25 | ✅ |
| R26 — join al encontrar, leave al navegar | `useTrackingSocket` cleanup en useEffect | ✅ |
| R27–R34 — tests backend exigidos | 9 tests en `tracking.test.ts` (todos passing) | ✅ |

---

## 3. Verificación de arquitectura

| Criterio | Resultado |
|----------|-----------|
| Sin lógica de negocio en controladores | ✅ `trackingController.ts` solo parsea, delega a service, responde |
| Sin fetch directo en componentes | ✅ Componentes usan `useTracking` (TanStack Query) y `useTrackingSocket` (hook) |
| Sin `any` explícito | ✅ No se encontraron declaraciones `any` en archivos de la feature |
| Sin `console.log` | ✅ Ninguno encontrado (solo `console.error` en `index.ts` para arranque de servidor — aceptable) |
| Repositorio con instancia Prisma | ✅ `trackingRepository.ts` instancia `PrismaClient` localmente (patrón existente en el proyecto) |

---

## 4. Verificación de seguridad

| Criterio | Resultado |
|----------|-----------|
| `GET /api/v1/tracking/:codigo` sin `authMiddleware` | ✅ Confirmado en `routes/tracking.ts` y `index.ts` |
| `location:update` valida payload con Zod `safeParse` | ✅ `sockets/tracking.ts` línea 8 |
| `tracking:error` emitido si payload inválido | ✅ R11 test passing |
| `tracking:error` emitido si `envioId` no existe | ✅ R10 test passing |

---

## 5. Verificación de convenios

| Criterio | Resultado |
|----------|-----------|
| Ruta bajo `/api/v1/tracking/` | ✅ `app.use('/api/v1/tracking', trackingRouter)` en `index.ts` |
| Formato de respuesta estándar `{ data, message, status }` | ✅ Confirmado en `trackingController.ts` |
| CSS de Leaflet importado | ✅ `import 'leaflet/dist/leaflet.css'` en `TrackingMap.tsx` línea 1 |
| Ruta `/tracking` pública (sin ProtectedRoute) | ✅ `router/index.tsx` línea 26 — ruta fuera de cualquier `ProtectedRoute` |

---

## 6. Resultados de CI/CD ejecutados en revisión

| Comando | Resultado |
|---------|-----------|
| `backend: npx jest tracking.test.ts --forceExit` | ✅ 9/9 passed |
| `backend: npm run lint` | ✅ 0 errores |
| `backend: npm run build` | ✅ Sin errores TypeScript |
| `frontend: npm run test -- --run` | ✅ 52/52 passed (11 suites) |
| `frontend: npm run lint` | ✅ 0 errores |
| `frontend: npm run build` | ✅ Build exitoso (warnings de chunk size son pre-existentes al proyecto) |

---

## 7. Observaciones menores (no bloquean aprobación)

1. **`TrackingResponseDto.ultimaActualizacion` como `string` en frontend vs `Date` en backend**: El backend serializa `Date` a ISO string automáticamente via `JSON.stringify`; el frontend tipea como `string`. Es correcto en la práctica y no genera errores de TypeScript ni de runtime.

2. **`useTrackingSocket` excluye `onLocation` de las dependencias del `useEffect`**: Documentado con comentario explicativo en el archivo. Decisión de diseño válida (evita re-suscripciones en cada render), sin riesgo de closure stale dado que el setter de estado `setMarcadorPos` de React es estable entre renders.

3. **`TrackingMap` usa `key={lat-lng}` para re-centrar el mapa**: Técnica válida con react-leaflet que evita la mutación manual del centro. Sin impacto negativo en R23.

---

## Decisión final

**APROBADO** — La implementación cubre los 34 requisitos, todos los 22 tasks están completados, las suites de test pasan al 100%, lint y build no reportan errores, y se cumplen las restricciones de arquitectura, seguridad y convenios.
