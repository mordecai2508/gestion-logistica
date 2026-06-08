# Implementación — incidencias_gestion (id 10, sprint 4)

> Informe del implementer al cierre de T1–T23. Tasks T1–T18 ya estaban `[x]`
> de pasadas anteriores (backend íntegro + tipos/servicios/hooks frontend);
> esta sesión ejecutó **T19–T23**.

---

## 1. Archivos creados/modificados (T1–T23)

### Backend

| Archivo | Tipo | Tasks |
|---|---|---|
| `backend/src/types/incidenciaTypes.ts` | creado | T2 |
| `backend/src/types/envioTypes.ts` | modificado (`ReprogramarEnvioDto`/`ReprogramarEnvioResponseDto`) | T3 |
| `backend/src/validators/incidenciaValidator.ts` | creado | T4 |
| `backend/src/validators/envioValidator.ts` | modificado (`reprogramarEnvioSchema`) | T5 |
| `backend/src/repositories/incidenciaRepository.ts` | creado | T6 |
| `backend/src/repositories/envioRepository.ts` | modificado (`reprogramar`) | T7 |
| `backend/src/services/incidenciaService.ts` | creado | T8 |
| `backend/src/services/envioService.ts` | modificado (`reprogramar`) | T9 |
| `backend/src/controllers/incidenciaController.ts` | creado | T10 |
| `backend/src/controllers/envioController.ts` | modificado (`reprogramarEnvio`) | T11 |
| `backend/src/routes/incidencias.ts` | creado | T12 |
| `backend/src/index.ts` | modificado (registro de `incidenciasRouter`) | T12 |
| `backend/src/routes/envios.ts` | modificado (`POST /:id/reprogramar`) | T13 |
| `backend/src/tests/incidencias.test.ts` | creado | T14 |
| `backend/src/tests/envioReprogramar.test.ts` | creado | T15 |

No hubo migración Prisma (T1: confirmado que `Incidencia`, `TipoIncidencia`,
`EstadoIncidencia` y `Envio.fechaReprogramacion` ya existían).

### Frontend

| Archivo | Tipo | Tasks |
|---|---|---|
| `frontend/src/types/incidenciaTypes.ts` | creado | T16 |
| `frontend/src/types/envioTypes.ts` | modificado (`ReprogramarEnvioDto`/`ReprogramarEnvioResponseDto`) | T16 |
| `frontend/src/services/incidenciaService.ts` | creado | T17 |
| `frontend/src/services/envioService.ts` | modificado (`reprogramar`) | T17 |
| `frontend/src/hooks/useIncidencias.ts` | creado | T18 |
| `frontend/src/hooks/useCrearIncidencia.ts` | creado | T18 |
| `frontend/src/hooks/useActualizarEstadoIncidencia.ts` | creado | T18 |
| `frontend/src/hooks/useReprogramarEnvio.ts` | creado | T18 |
| `frontend/src/features/incidencias/GestionIncidencias.tsx` | creado | T19 |
| `frontend/src/features/repartidor/ReportarIncidencia.tsx` | creado | T20 |
| `frontend/src/features/envios/ReprogramarEntregaModal.tsx` | creado | T20 |
| `frontend/src/features/envios/DetalleEnvio.tsx` | **modificado en esta sesión**: agregado botón "Reprogramar entrega" (`CalendarClock`, visible solo `rol === 'OPERADOR'` y oculto en estados terminales `ENTREGADO`/`CANCELADO`) que abre `<ReprogramarEntregaModal envioId={envio.id} onClose={...} />` | T20 |
| `frontend/src/features/repartidor/VistaRepartidor.tsx` | modificado (entrada a `ReportarIncidencia`, de pasadas anteriores) | T20 |
| `frontend/src/router/index.tsx` | **modificado en esta sesión**: import + `<Route path="/incidencias" element={<GestionIncidencias />} />` dentro del bloque `<ProtectedRoute allowedRoles={['OPERADOR']}>` | T21 |
| `frontend/src/features/incidencias/__tests__/GestionIncidencias.test.tsx` | **creado en esta sesión** | T22 |
| `frontend/src/features/repartidor/__tests__/ReportarIncidencia.test.tsx` | **creado en esta sesión** | T22 |
| `frontend/src/features/envios/ReprogramarEntregaModal.test.tsx` | **creado en esta sesión** | T22 |

### Specs / bitácora

| Archivo | Cambio |
|---|---|
| `specs/incidencias_gestion/tasks.md` | T19–T23 marcadas `[x]` |

---

## 2. Trabajo de esta sesión (T19–T23) — detalle

- **T19**: se confirmó que `GestionIncidencias.tsx` (líneas 175–399) ya
  implementaba título "Incidencias", filtros `tipo`/`estado` (R26), tabla
  Código/Tipo/Descripción/Estado/Acciones (R25), paginación inferior (R27),
  modal "Cambiar estado" vía acción "Editar" (R28), y el botón
  "+ Nueva Incidencia" deshabilitado con `title`/tooltip explicativo para
  `rol === 'OPERADOR'` (línea 209: `nuevaIncidenciaDeshabilitada = rol === 'OPERADOR'`;
  línea 217: `<span title="Solo el repartidor puede reportar incidencias">`),
  conforme a la decisión de diseño de `design.md` sección 4 (R4 — no se
  construye un formulario de creación que el backend rechazaría con 403).
  Sin cambios de código; se marcó `[x]`.

- **T20**: `ReportarIncidencia.tsx` y `ReprogramarEntregaModal.tsx` ya
  existían completos. Se cerró el cableado faltante en `DetalleEnvio.tsx`:
  agregado `import { useAuthStore } from '@/store/authStore'`, lectura de
  `const rol = useAuthStore((state) => state.user?.rol)`, y un botón
  "Reprogramar entrega" (`<CalendarClock />`) en la cabecera, visible solo si
  `rol === 'OPERADOR'` y `!ESTADOS_TERMINALES.has(envio.estado)`
  (`ESTADOS_TERMINALES = new Set(['ENTREGADO', 'CANCELADO'])`, ya definido en
  el archivo). El click pone `mostrarReprogramar` en `true`; al final del
  componente se renderiza condicionalmente
  `<ReprogramarEntregaModal envioId={envio.id} onClose={() => setMostrarReprogramar(false)} />`,
  respetando la firma exacta de props (`{ envioId: string; onClose: () => void }`)
  ya definida en `ReprogramarEntregaModal.tsx`.

- **T21**: registrada la ruta `/incidencias` en `frontend/src/router/index.tsx`
  dentro del bloque `<Route element={<ProtectedRoute allowedRoles={['OPERADOR']} />}>`
  (mismo patrón que `/rutas` y `/vehiculos`), con
  `<Route path="/incidencias" element={<GestionIncidencias />} />`.

- **T22**: creados 3 archivos de test (15 casos nuevos, todos verdes):
  - `GestionIncidencias.test.tsx` (8 tests): R25 (tabla con columnas exactas
    vía `getAllByRole('columnheader')` + filas acotadas con `within`), R26
    (cambio de filtros `tipo`/`estado` propaga `{ tipo, estado, page: 1 }` a
    `useIncidencias`, incluido el reseteo a `undefined` con "Todos"), R27
    (controles de paginación ausentes con una sola página, presentes y
    navegables — números + "siguiente" — con `totalPages > 1`), R28 (acción
    "Editar" abre el modal, envía `{ id, estado }` vía
    `useActualizarEstadoIncidencia` y muestra Toast de éxito/error).
  - `ReportarIncidencia.test.tsx` (3 tests): R1 desde el frontend — envía
    `{ envioId, tipo, descripcion }`, valida descripción no vacía
    (sin llamar a la mutación) y muestra Toast de confirmación/error.
  - `ReprogramarEntregaModal.test.tsx` (4 tests): R19/R21 desde el frontend —
    rechaza envío sin fecha o con fecha no futura (validación cliente, sin
    llamar a la mutación), y al enviar una fecha futura llama a
    `mutateAsync({ envioId, fechaReprogramacion })` con el ISO 8601 esperado y
    muestra confirmación/error vía Toast. Las fechas se calculan en runtime
    relativas a `Date.now()` (sin fake timers, para no interferir con el
    polling de `waitFor`).

- **T23**: verificación final ejecutada y en verde (ver sección 4).

---

## 3. Trazabilidad `R<n>` → test → archivo:línea

### Backend — `incidencias.test.ts` (creación, listado, cambio de estado)

| R | Test | Archivo:línea |
|---|------|---------------|
| R1 | `'R1 - debe crear la incidencia vinculada al envío con estado ABIERTA y devolver 201'` | `backend/src/tests/incidencias.test.ts:75` |
| R2 | `'R2 - debe devolver 404 ENVIO_NOT_FOUND al crear una incidencia sobre un envío inexistente'` | `backend/src/tests/incidencias.test.ts:91` |
| R3 | `'R3 - debe devolver 422 con descripción vacía, tipo inválido o envioId faltante'` | `backend/src/tests/incidencias.test.ts:106` |
| R4 | `'R4 - debe devolver 403 si el usuario autenticado no es REPARTIDOR'` | `backend/src/tests/incidencias.test.ts:131` |
| R5 | `'R5 - debe devolver 401 sin token de autenticación'` | `backend/src/tests/incidencias.test.ts:149` |
| R6 | `'R6 - debe listar incidencias paginadas ordenadas por más reciente, incluyendo código del envío'` | `backend/src/tests/incidencias.test.ts:181` |
| R7 | `'R7 - debe filtrar por ?tipo'` | `backend/src/tests/incidencias.test.ts:195` |
| R8 | `'R8 - debe filtrar por ?estado'` | `backend/src/tests/incidencias.test.ts:209` |
| R9 | `'R9 - debe combinar ?tipo&estado'` | `backend/src/tests/incidencias.test.ts:223` |
| R10 | `'R10 - debe devolver 422 con tipo/estado/paginación inválidos'` | `backend/src/tests/incidencias.test.ts:237` |
| R11 | `'R11 - debe devolver 403 si el usuario autenticado no es OPERADOR'` | `backend/src/tests/incidencias.test.ts:262` |
| R12 | `'R12 - debe devolver 401 sin token'` | `backend/src/tests/incidencias.test.ts:273` |
| R13 | `'R13 - debe actualizar el estado de la incidencia y devolverla actualizada'` | `backend/src/tests/incidencias.test.ts:285` |
| R14 | `'R14 - debe devolver 404 INCIDENCIA_NOT_FOUND con un id inexistente'` | `backend/src/tests/incidencias.test.ts:303` |
| R15 | `'R15 - debe devolver 409 al repetir el mismo estado y al intentar mover una incidencia RESUELTA a otro estado'` | `backend/src/tests/incidencias.test.ts:318` |
| R16 | `'R16 - debe devolver 422 con estado ausente o fuera del enum'` | `backend/src/tests/incidencias.test.ts:342` |
| R17 | `'R17 - debe devolver 403 si el usuario autenticado no es OPERADOR'` | `backend/src/tests/incidencias.test.ts:360` |
| R18 | `'R18 - debe devolver 401 sin token'` | `backend/src/tests/incidencias.test.ts:371` |

> Complementan a nivel de servicio (mismo archivo, suite `incidenciaService`):
> `R1`/`R2` en línea 479/493, `R6`–`R9` en líneas 505/532/547, `R13`–`R15` en
> líneas 562/582/593.

### Backend — `envioReprogramar.test.ts` (reprogramación de entrega)

| R | Test | Archivo:línea |
|---|------|---------------|
| R19 | `'R19 - debe registrar la nueva fecha de reprogramación, crear el EventoEnvio correspondiente y devolver el envío actualizado'` | `backend/src/tests/envioReprogramar.test.ts:54` |
| R20 | `'R20 - debe devolver 404 ENVIO_NOT_FOUND con un id de envío inexistente'` | `backend/src/tests/envioReprogramar.test.ts:72` |
| R21 | `'R21 - debe devolver 422 con fechaReprogramacion ausente, no parseable o no futura'` | `backend/src/tests/envioReprogramar.test.ts:87` |
| R22 | `'R22 - debe devolver 409 INVALID_STATE_TRANSITION al reprogramar un envío ENTREGADO o CANCELADO'` | `backend/src/tests/envioReprogramar.test.ts:113` |
| R23 | `'R23 - debe devolver 403 si el usuario autenticado no es OPERADOR'` | `backend/src/tests/envioReprogramar.test.ts:145` |
| R24 | `'R24 - debe devolver 401 sin token de autenticación'` | `backend/src/tests/envioReprogramar.test.ts:163` |

> Complementan a nivel de servicio (mismo archivo, suite `envioService.reprogramar`):
> `R19`/`R20`/`R22` en líneas 224/248/260.

### Frontend — pantalla, formulario y modal (T22, sesión actual)

| R | Test | Archivo:línea |
|---|------|---------------|
| R25 | `'R25 - debe mostrar la tabla con columnas código/tipo/descripción/estado'` → `'renderiza el título, las columnas y las filas con sus datos'` | `frontend/src/features/incidencias/__tests__/GestionIncidencias.test.tsx:94-95` |
| R26 | `'R26 - debe filtrar la lista al cambiar tipo/estado'` → 3 casos (tipo, estado, reseteo a "Todos") | `frontend/src/features/incidencias/__tests__/GestionIncidencias.test.tsx:125-163` |
| R27 | `'R27 - debe mostrar controles de paginación cuando hay más de una página'` → 2 casos (ausencia con 1 página / presencia y navegación con 3) | `frontend/src/features/incidencias/__tests__/GestionIncidencias.test.tsx:168-204` |
| R28 | `'R28 - debe permitir cambiar el estado de una incidencia desde la acción "editar"'` → 2 casos (éxito + error vía Toast) | `frontend/src/features/incidencias/__tests__/GestionIncidencias.test.tsx:206-247` |
| R1 (frontend) | `'R1 - debe enviar { envioId, tipo, descripcion } y mostrar confirmación en éxito'` → 3 casos (envío correcto, validación de descripción vacía, error del backend vía Toast) | `frontend/src/features/repartidor/__tests__/ReportarIncidencia.test.tsx:46-112` |
| R19/R21 (frontend) | `'R19/R21 - debe validar fecha futura en cliente y enviar { envioId, fechaReprogramacion }'` → 4 casos (sin fecha, fecha no futura, envío correcto en ISO 8601 + confirmación, error del backend vía Toast) | `frontend/src/features/envios/ReprogramarEntregaModal.test.tsx:52-122` |

---

## 4. Resultado de verificación final (T23)

### Backend (`cd backend`)
```
npm run test   → Test Suites: 14 passed, 14 total | Tests: 212 passed, 212 total
npm run lint   → sin errores (eslint src --ext .ts)
npm run build  → tsc sin errores
```

### Frontend (`cd frontend`)
```
npm run test   → Test Files: 18 passed (18) | Tests: 88 passed, 88 total
npm run lint   → sin errores (eslint src --ext .ts,.tsx)
npm run build  → tsc -b && vite build — build exitoso
                 (única advertencia preexistente y no relacionada:
                 INEFFECTIVE_DYNAMIC_IMPORT sobre authService.ts)
```

### `./init.sh` (raíz)
```
── [3/6] Consistencia de feature_list.json ──
✅ Exactamente una feature in_progress: incidencias_gestion
✅ Specs presentes para 10 feature(s) sdd activas

── [4/6] Backend ──     ✅ lint backend: sin errores | ✅ tests backend: todos verdes
── [5/6] Frontend ──    ✅ lint frontend: sin errores | ✅ tests frontend: todos verdes
── [6/6] Resumen ──     ✅ Todo verde: 30/30 checks pasaron
```

---

## 5. Estado de tasks

Todas las tasks **T1–T23** de `specs/incidencias_gestion/tasks.md` están
marcadas `[x]`. La feature queda lista para revisión por el `reviewer`
(el cierre a `done` corresponde al `leader` tras su aprobación).
