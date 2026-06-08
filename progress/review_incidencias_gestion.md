# Review — incidencias_gestion (id 10, sprint 4) — APROBADO

> Revisión de T1–T23 (23/23 marcadas `[x]` en `specs/incidencias_gestion/tasks.md`),
> contra `requirements.md` (R1–R28), `design.md` y `progress/impl_incidencias_gestion.md`.

---

## 1. Trazabilidad R1–R28

Todos los requisitos tienen al menos un test real (no stub/no-op) que ejercita
el comportamiento descrito — verificado leyendo el código de los tests, no solo
los nombres.

| R | Test | Archivo:línea | Estado |
|---|---|---|---|
| R1 | `'R1 - debe crear la incidencia vinculada al envío con estado ABIERTA y devolver 201'` (+ unit de servicio `'R1 - debe verificar la existencia del envío y crear la incidencia con estado ABIERTA'`) | `backend/src/tests/incidencias.test.ts:75,479` | ✅ |
| R2 | `'R2 - debe devolver 404 ENVIO_NOT_FOUND...'` (+ unit `'R2 - debe lanzar ENVIO_NOT_FOUND (404) y NO crear...'`) | `incidencias.test.ts:91,493` | ✅ |
| R3 | `'R3 - debe devolver 422 con descripción vacía, tipo inválido o envioId faltante'` (3 sub-casos + assert de que el servicio NO se invoca) | `incidencias.test.ts:106` | ✅ |
| R4 | `'R4 - debe devolver 403 si el usuario autenticado no es REPARTIDOR'` (OPERADOR y CLIENTE) | `incidencias.test.ts:131` | ✅ |
| R5 | `'R5 - debe devolver 401 sin token de autenticación'` | `incidencias.test.ts:149` | ✅ |
| R6 | `'R6 - debe listar incidencias paginadas...'` (+ unit `R6/R9` de construcción de `where`/proyección) | `incidencias.test.ts:181,505` | ✅ |
| R7 | `'R7 - debe filtrar por ?tipo'` (+ unit que verifica el `where` exacto) | `incidencias.test.ts:195,532` | ✅ |
| R8 | `'R8 - debe filtrar por ?estado'` (+ unit) | `incidencias.test.ts:209,547` | ✅ |
| R9 | `'R9 - debe combinar ?tipo&estado'` (+ unit `R6/R9`) | `incidencias.test.ts:223,505` | ✅ |
| R10 | `'R10 - debe devolver 422 con tipo/estado/paginación inválidos'` (3 sub-casos) | `incidencias.test.ts:237` | ✅ |
| R11 | `'R11 - debe devolver 403 si el usuario autenticado no es OPERADOR'` (incl. assert `data` indefinido) | `incidencias.test.ts:262` | ✅ |
| R12 | `'R12 - debe devolver 401 sin token'` | `incidencias.test.ts:273` | ✅ |
| R13 | `'R13 - debe actualizar el estado...'` (+ unit que valida delegación y proyección) | `incidencias.test.ts:285,562` | ✅ |
| R14 | `'R14 - debe devolver 404 INCIDENCIA_NOT_FOUND...'` (+ unit) | `incidencias.test.ts:303,582` | ✅ |
| R15 | `'R15 - debe devolver 409 al repetir el mismo estado y al intentar mover una incidencia RESUELTA a otro estado'` (+ unit con 3 sub-casos: mismo estado, RESUELTA→otro, EN_PROCESO→ABIERTA permitido) | `incidencias.test.ts:318,593` | ✅ |
| R16 | `'R16 - debe devolver 422 con estado ausente o fuera del enum'` | `incidencias.test.ts:342` | ✅ |
| R17 | `'R17 - debe devolver 403 si el usuario autenticado no es OPERADOR'` | `incidencias.test.ts:360` | ✅ |
| R18 | `'R18 - debe devolver 401 sin token'` | `incidencias.test.ts:371` | ✅ |
| R19 | `'R19 - debe registrar la nueva fecha de reprogramación, crear el EventoEnvio correspondiente y devolver el envío actualizado'` (+ unit que verifica `descripcionEvento`, persistencia y que `estado` no cambia) | `backend/src/tests/envioReprogramar.test.ts:54,224` | ✅ |
| R20 | `'R20 - debe devolver 404 ENVIO_NOT_FOUND...'` (+ unit) | `envioReprogramar.test.ts:72,248` | ✅ |
| R21 | `'R21 - debe devolver 422 con fechaReprogramacion ausente, no parseable o no futura'` (3 sub-casos) | `envioReprogramar.test.ts:87` | ✅ |
| R22 | `'R22 - debe devolver 409 INVALID_STATE_TRANSITION al reprogramar un envío ENTREGADO o CANCELADO'` (+ unit, 2 sub-casos: ENTREGADO, CANCELADO) | `envioReprogramar.test.ts:113,260` | ✅ |
| R23 | `'R23 - debe devolver 403 si el usuario autenticado no es OPERADOR'` (REPARTIDOR y CLIENTE) | `envioReprogramar.test.ts:145` | ✅ |
| R24 | `'R24 - debe devolver 401 sin token de autenticación'` | `envioReprogramar.test.ts:163` | ✅ |
| R25 | `'renderiza el título, las columnas y las filas con sus datos'` (verifica `getAllByRole('columnheader')` == `['Código','Tipo','Descripción','Estado','Acciones']` + contenido de filas con `within`) | `frontend/src/features/incidencias/__tests__/GestionIncidencias.test.tsx:95` | ✅ |
| R26 | 3 casos: filtra por `tipo`, por `estado`, y reseteo a `undefined` con "Todos" — todos verifican el objeto `filters` propagado a `useIncidencias` con `page: 1` | `GestionIncidencias.test.tsx:126,138,150` | ✅ |
| R27 | 2 casos: ausencia de controles con 1 página, presencia + navegación (números de página y "siguiente") con `totalPages: 3` | `GestionIncidencias.test.tsx:169,175` | ✅ |
| R28 | 2 casos: abre modal vía "Editar", envía `{ id, estado }` y muestra confirmación; muestra error vía Toast | `GestionIncidencias.test.tsx:207,228` | ✅ |
| R1 (frontend) | 3 casos: envía `{ envioId, tipo, descripcion }`, valida descripción vacía sin invocar mutación, muestra error del backend vía Toast | `frontend/src/features/repartidor/__tests__/ReportarIncidencia.test.tsx:47,82,93` | ✅ |
| R19/R21 (frontend) | 4 casos: rechaza sin fecha, rechaza fecha no futura, envía `{ envioId, fechaReprogramacion }` en ISO 8601 al ser futura + confirmación, muestra error del backend | `frontend/src/features/envios/ReprogramarEntregaModal.test.tsx:53,64,82,112` | ✅ |

**Conclusión de trazabilidad**: 28/28 requisitos cubiertos por tests reales que
ejercitan el comportamiento (no solo la existencia de la función). Los tests
backend usan un patrón de dos capas — ruta (Supertest, servicio mockeado, valida
status/forma de respuesta/middlewares) y servicio (`jest.isolateModules` +
`jest.unmock`, repos mockeados, valida la lógica condicional real: construcción
de `where`, reglas de transición, verificación de existencia) — replicando el
patrón ya aprobado en `rutas.test.ts`/`vehiculos.test.ts`. Verifiqué que ninguno
es un placeholder: cada test hace asserts específicos sobre código de estado,
cuerpo de la respuesta, argumentos exactos pasados a las dependencias mockeadas,
y in the negative cases confirma explícitamente que el servicio/repositorio NO
fue invocado.

---

## 2. Arquitectura: ✅

- **Sin lógica de negocio en controladores**: `incidenciaController.ts` y las
  extensiones de `envioController.ts` solo parsean con Zod
  (`crearIncidenciaSchema.parse`, `listarIncidenciasSchema.parse`,
  `actualizarEstadoIncidenciaSchema.parse`, `reprogramarEnvioSchema.parse`),
  delegan al servicio y formatean la respuesta. Cero acceso a Prisma desde
  controladores (`grep -l "prisma\|PrismaClient"` → sin resultados).
- **Sin validaciones en repositorios**: `incidenciaRepository.ts` (44 líneas)
  contiene únicamente las 5 operaciones Prisma documentadas en `design.md`
  (`crear`, `findById`, `findMany`, `count`, `actualizarEstado`) — sin `if`, sin
  `throw`, sin `AppError`. La extensión `envioRepository.reprogramar` ejecuta
  solo la transacción Prisma (`update` + `eventoEnvio.create`), replicando el
  patrón de `entregaRepository.confirmarEntrega`.
- **Sin `fetch` directo en componentes**: `grep -n "fetch("` sobre
  `GestionIncidencias.tsx`, `ReportarIncidencia.tsx`, `ReprogramarEntregaModal.tsx`
  e `incidenciaService.ts` → sin resultados. Toda comunicación HTTP pasa por la
  instancia `api` (axios) en los servicios `incidenciaService`/`envioService`.
- **Sin estado del servidor duplicado en Zustand**: los 4 hooks nuevos
  (`useIncidencias`, `useCrearIncidencia`, `useActualizarEstadoIncidencia`,
  `useReprogramarEnvio`) usan exclusivamente TanStack Query
  (`useQuery`/`useMutation` + `invalidateQueries`); `useAuthStore` (Zustand) se
  usa solo para leer el `rol` del usuario autenticado, no para cachear datos de
  incidencias/envíos.
- **Sin `any` explícito**: `grep -n "\bany\b"` sobre todos los archivos nuevos y
  modificados de esta feature (backend y frontend) → la única coincidencia es
  `expect.any(Date)` (matcher de Jest, no el tipo `any` de TypeScript).
- **Sin `console.log` de debug**: `grep -rn "console\.(log|debug|warn|error)"` →
  sin resultados en ningún archivo de la feature.
- `npm run build` (tsc) pasa sin errores en backend y frontend, lo que confirma
  ausencia de `any` implícitos bajo `strict`.

---

## 3. Seguridad: ✅

- **`authMiddleware`** aplicado a los 4 endpoints (`POST /incidencias`,
  `GET /incidencias`, `PATCH /incidencias/:id`, `POST /envios/:id/reprogramar`)
  — verificado en `backend/src/routes/incidencias.ts` y la extensión de
  `backend/src/routes/envios.ts` (línea 27-32). Cubierto por R5/R12/R18/R24
  (401 sin token).
- **`roleMiddleware`** correcto por endpoint:
  - `roleMiddleware('REPARTIDOR')` en `POST /incidencias` (R4).
  - `roleMiddleware('OPERADOR')` en `GET /incidencias`, `PATCH /incidencias/:id`
    y `POST /envios/:id/reprogramar` (R11, R17, R23).
  - Los tests de 403 prueban explícitamente con tokens de roles "vecinos"
    (p.ej. CLIENTE y REPARTIDOR contra endpoints de OPERADOR), no solo "sin rol".
- **Validación con Zod** en los 4 endpoints:
  `crearIncidenciaSchema` (`envioId` cuid, `tipo` enum, `descripcion.min(1)`),
  `listarIncidenciasSchema` (filtros enum + paginación con `.transform/.pipe`,
  mismo patrón que `listarEnviosSchema`), `actualizarEstadoIncidenciaSchema`
  (`estado` enum) y `reprogramarEnvioSchema`
  (`z.coerce.date().refine(fecha > Date.now())`). Ninguno construye `where` de
  Prisma con input crudo.
- **Verificación de existencia antes de mutar**: `incidenciaService.crear`
  verifica el envío (`ENVIO_NOT_FOUND` 404 — R2),
  `incidenciaService.actualizarEstado` verifica la incidencia
  (`INCIDENCIA_NOT_FOUND` 404 — R14), `envioService.reprogramar` verifica el
  envío (`ENVIO_NOT_FOUND` 404 — R20) — los tres antes de cualquier escritura.
- **Transiciones de estado controladas** con `409 INVALID_STATE_TRANSITION`:
  `incidenciaService.actualizarEstado` rechaza mismo-estado y `RESUELTA → otro`
  (R15); `envioService.reprogramar` rechaza `ENTREGADO`/`CANCELADO` (R22).
- **Persistencia atómica**: `envioRepository.reprogramar` usa
  `prisma.$transaction` para `Envio.update` + `EventoEnvio.create`, replicando
  el patrón de `entregaRepository.confirmarEntrega`/`registrarFallo` — evita
  estados intermedios inconsistentes.
- No aplica subida de archivos en esta feature (campos `foto`/`nota` de
  `Incidencia` quedan `null` para este flujo, como documenta `design.md`).

---

## 4. Convenios: ✅

- **Prefijo `/api/v1/`**: confirmado en `backend/src/index.ts:49`
  (`app.use('/api/v1/incidencias', incidenciasRouter)`) y la ruta existente
  `/api/v1/envios` extendida con `POST /:id/reprogramar`.
- **Formato de respuesta**: `{ data, message, status }` en éxito
  (`crearIncidencia` → 201 `"Incidencia registrada"`,
  `actualizarEstadoIncidencia` → 200 `"Estado de incidencia actualizado"`,
  `reprogramarEnvio` → 200 `"Entrega reprogramada"`) y
  `{ data, meta, message, status }` en `listarIncidencias` (paginación, mismo
  patrón que `envioService.listar`). Los errores usan `AppError` →
  `{ error, message, statusCode }` vía el middleware de errores existente
  (verificado por los asserts `res.body.error === 'VALIDATION_ERROR' /
  'ENVIO_NOT_FOUND' / 'INCIDENCIA_NOT_FOUND' / 'INVALID_STATE_TRANSITION' /
  'FORBIDDEN' / 'MISSING_TOKEN'` en los tests).
- **Paginación**: `listarIncidenciasSchema` reutiliza el patrón
  `.transform(...).pipe(z.number().int().positive())` de `listarEnviosSchema`;
  `incidenciaService.listar` calcula `skip = (page - 1) * limit` y
  `totalPages = Math.ceil(total / limit)`, devolviendo
  `meta: { total, page, limit, totalPages }` — idéntico a `envioService.listar`.
- **Coincidencia con wireframe** (`docs/wireframe-reference.md`, sección
  "Incidentes"): título "Incidencias", tabla
  Código | Tipo | Descripción | Estado | Acciones (ver, editar), botón
  "+ Nueva Incidencia", paginación inferior — todos presentes y verificados por
  el test R25 (`getAllByRole('columnheader')` exacto). La columna "Código"
  muestra `envioCodigoSeguimiento` (código de seguimiento legible, p.ej.
  `TRK-20260605-AAAA1111`) en lugar del `id` (cuid opaco) de la incidencia —
  interpretación razonable de "código/identificador" (R25, redacción
  intencionalmente ambigua) para una tabla operativa, documentada
  explícitamente en `design.md` (sección 4, líneas 217-219) y consistente con
  `IncidenciaListItemDto` (que expone ambos campos).
- **Naming**: `TipoIncidencia`/`EstadoIncidencia` usan el valor de transmisión
  `DANIO` (sin diacrítico, restricción de enum SQL) con `TIPO_INCIDENCIA_LABEL`
  para la etiqueta visual "Daño" — documentado y consistente entre
  backend/frontend/tests. Nombres de archivos, hooks y servicios siguen el
  patrón establecido (`useIncidencias`, `useCrearIncidencia`,
  `useActualizarEstadoIncidencia`, `useReprogramarEnvio`,
  `incidenciaService`, `GestionIncidencias`, `ReportarIncidencia`,
  `ReprogramarEntregaModal`).
- **Resolución documentada de la inconsistencia wireframe/reglas de rol**: el
  botón "+ Nueva Incidencia" se muestra deshabilitado para `rol === 'OPERADOR'`
  con tooltip explicativo (`title="Solo el repartidor puede reportar
  incidencias"` + `aria-disabled`), evitando construir un formulario que el
  backend rechazaría con 403 (R4) — decisión técnica explícita en `design.md`
  sección 4 y verificable en `GestionIncidencias.tsx:209-222`.

---

## 5. Verificación final

Ejecuté independientemente (no solo confirmé el reporte del implementer):

```
backend:  npx jest --runInBand        → Test Suites: 14 passed, 14 total | Tests: 212 passed, 212 total
backend:  npx eslint src --ext .ts    → sin errores
backend:  npm run build (tsc)         → sin errores

frontend: npx vitest run --passWithNoTests  → Test Files: 18 passed (18) | Tests: 88 passed, 88 total
frontend: npx eslint src --ext .ts,.tsx     → sin errores
frontend: npm run build (tsc -b && vite build) → build exitoso
          (única advertencia: INEFFECTIVE_DYNAMIC_IMPORT sobre authService.ts —
          preexistente y no relacionada con esta feature)

./init.sh (raíz) → ✅ Todo verde: 30/30 checks pasaron
                   ✅ Exactamente una feature in_progress: incidencias_gestion
                   ✅ Specs presentes para 10 feature(s) sdd activas
                   ✅ lint backend / tests backend / lint frontend / tests frontend
```

Resultados idénticos al baseline reportado por el leader e
`impl_incidencias_gestion.md` — confirmados de forma independiente.

---

## Arquitectura: ✅
## Seguridad: ✅
## Convenios: ✅
## Verificación: ✅ (212/212 backend + 88/88 frontend, lint limpio en ambos, build exitoso, init.sh 30/30)

**Decisión: APROBADO. El leader debe hacer el commit y luego marcar la feature como done.**
