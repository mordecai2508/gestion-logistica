# Informe de implementación — vehiculos_gestion (id: 8, sprint 3)

## Resumen

Feature implementada siguiendo exactamente `specs/vehiculos_gestion/{requirements,design,tasks}.md`.
Las 17 tasks (T1–T17) están marcadas `[x]` en `specs/vehiculos_gestion/tasks.md`.
No se generó ninguna migración Prisma (T1 confirmó que el modelo `Vehiculo` y el
enum `EstadoVehiculo` ya existían tal como se documenta en `design.md`, líneas
135-143 y 34-39 de `backend/prisma/schema.prisma`).

## Archivos creados

### Backend
- `backend/src/validators/vehiculoValidator.ts` — `crearVehiculoSchema`, `listarVehiculosSchema`, `actualizarEstadoVehiculoSchema` (Zod)
- `backend/src/repositories/vehiculoRepository.ts` — `crear`, `findByPlaca`, `findById`, `findAll`, `actualizarEstado` (único acceso a Prisma)
- `backend/src/types/vehiculoTypes.ts` — `CrearVehiculoDto`, `ListarVehiculosFiltros`, `VehiculoResponseDto`
- `backend/src/services/vehiculoService.ts` — `crear`, `listar`, `actualizarEstado` (orquesta el repositorio, valida reglas de negocio, lanza `AppError`)
- `backend/src/controllers/vehiculoController.ts` — `crearVehiculo`, `listarVehiculos`, `actualizarEstadoVehiculo`
- `backend/src/routes/vehiculos.ts` — router con `authMiddleware` + `roleMiddleware('OPERADOR')` en los 3 endpoints
- `backend/src/tests/vehiculos.test.ts` — 15 tests Jest+Supertest (uno por cada `R1`–`R15`), mockeando `vehiculoService`/`vehiculoRepository` (sin mocks vacíos)

### Frontend
- `frontend/src/types/vehiculoTypes.ts` — `EstadoVehiculo`, `VehiculoDto`, `CrearVehiculoDto`, `VehiculoFiltros`
- `frontend/src/services/vehiculoService.ts` — `listar`, `crear`, `actualizarEstado` (usa `api`, devuelve `res.data.data`)
- `frontend/src/hooks/useVehiculos.ts` — `useQuery(['vehiculos', filters], ...)`
- `frontend/src/hooks/useCrearVehiculo.ts` — `useMutation` que invalida `['vehiculos']`
- `frontend/src/hooks/useActualizarEstadoVehiculo.ts` — `useMutation` que invalida `['vehiculos']`
- `frontend/src/features/vehiculos/VehiculoForm.tsx` — formulario RHF+Zod con validación inline y manejo de 409 (placa duplicada) sin limpiar campos
- `frontend/src/features/vehiculos/VehiculoTable.tsx` — tabla con columnas Placa/Modelo/Capacidad/Estado y badges de color por estado
- `frontend/src/features/vehiculos/ActualizarEstadoVehiculo.tsx` — selector/diálogo de cambio de estado con Toast de resultado
- `frontend/src/features/vehiculos/GestionVehiculos.tsx` — pantalla principal: título "Vehículos", filtro por estado, tabla, botón "+ Registrar Vehículo"
- `frontend/src/features/vehiculos/vehiculos.test.tsx` — 7 tests Vitest+Testing Library cubriendo `R16`–`R20` (+ 1 test adicional de sanity sobre `VehiculoTable`)

## Archivos modificados

- `backend/src/index.ts` — importa y monta `vehiculosRouter` bajo `/api/v1/vehiculos`
- `frontend/src/router/index.tsx` — registra `/vehiculos` → `GestionVehiculos` dentro de `ProtectedRoute allowedRoles={['OPERADOR']}`, junto a `/rutas`
- `specs/vehiculos_gestion/tasks.md` — T1–T17 marcadas `[x]`

## Decisiones de diseño no triviales (causa raíz)

1. **`validate(schema)` del design.md vs. `schema.parse()` inline en el controlador**:
   el design.md (T6) menciona genéricamente `validate(crearVehiculoSchema)` como
   middleware, pero el proyecto **no tiene** un middleware `validate` — la
   convención real, confirmada en `rutaController.ts`/`rutasRouter`, es invocar
   `schema.parse(req.body | req.query)` dentro de cada handler del controlador y
   dejar que `errorHandler` traduzca `ZodError` a 422. Se siguió esa convención
   real (la que el `implementer.md` exige seguir "sin excepción") en lugar del
   nombre genérico del design, evitando introducir un middleware nuevo fuera del
   alcance de esta feature.

2. **Bloqueo de transición `EN_RUTA → MANTENIMIENTO/FUERA_SERVICIO` (R14)**:
   implementado en `vehiculoService.actualizarEstado` mediante un arreglo
   `ESTADOS_BLOQUEADOS_DESDE_EN_RUTA` comprobado solo cuando
   `vehiculo.estado === 'EN_RUTA'`, exactamente como especifica design.md §3.3.
   La transición inversa `EN_RUTA → DISPONIBLE` y cualquier otra combinación
   quedan permitidas, delegando la responsabilidad de "liberar" un vehículo a
   `rutas_gestion` (reasignación/cierre de ruta), tal como documenta el design.

3. **Mapeo `EN_RUTA → "Ocupado"` como etiqueta de presentación**: siguiendo
   la decisión técnica documentada en design.md §5 (opción descartada: ampliar
   el enum con `OCUPADO`), el badge de estado en `VehiculoTable.tsx` y el
   selector de `ActualizarEstadoVehiculo.tsx` traducen el valor de dominio
   `EN_RUTA` a la etiqueta visual "Ocupado" únicamente en el componente de
   presentación — el contrato de API y el enum Prisma permanecen intactos.

4. **Sin componente `Dialog`/`Modal` en el kit de Shadcn/UI del proyecto**:
   `VehiculoForm` y `ActualizarEstadoVehiculo` se muestran como paneles
   colapsables inline (mismo patrón que `GestionRutas.tsx` con `RutaForm`),
   en lugar de un modal real, ya que no existe `components/ui/dialog.tsx` y
   crear uno habría sido un cambio fuera del alcance de `vehiculos_gestion`
   (pertenecería a una mejora del kit de UI compartido).

5. **`/vehiculos` registrado sin sidebar**: `layout_navegacion` (mencionado en
   T15) aún no existe como feature `done`; se dejó un comentario en
   `router/index.tsx` indicando que el futuro enlace "Vehículos" del sidebar
   deberá apuntar a esta ruta, sin invadir el alcance de esa feature pendiente
   (igual que hizo `rutas_gestion` con `/rutas`).

## Trazabilidad R<n> → test → archivo:línea

### Backend (Jest + Supertest) — `backend/src/tests/vehiculos.test.ts`

| Requisito | Test | Archivo:línea |
|---|---|---|
| R1  | `debe registrar un vehículo válido con estado DISPONIBLE y devolver 201` | `backend/src/tests/vehiculos.test.ts:60` |
| R2  | `debe rechazar el registro con placa duplicada y devolver 409` | `backend/src/tests/vehiculos.test.ts:75` |
| R3  | `debe rechazar el registro con campos inválidos o capacidad no positiva con 422` | `backend/src/tests/vehiculos.test.ts:89` |
| R4  | `debe rechazar el registro de un usuario sin rol OPERADOR con 403` | `backend/src/tests/vehiculos.test.ts:99` |
| R5  | `debe rechazar el registro sin autenticación con 401` | `backend/src/tests/vehiculos.test.ts:109` |
| R6  | `debe listar vehículos con placa, modelo, capacidad y estado` | `backend/src/tests/vehiculos.test.ts:124` |
| R7  | `debe filtrar vehículos por estado cuando se recibe ?estado` | `backend/src/tests/vehiculos.test.ts:142` |
| R8  | `debe rechazar el listado con un valor de estado inválido en el filtro con 422` | `backend/src/tests/vehiculos.test.ts:157` |
| R9  | `debe rechazar el listado sin autenticación con 401` | `backend/src/tests/vehiculos.test.ts:166` |
| R10 | `debe rechazar el listado para un usuario con rol CLIENTE con 403` | `backend/src/tests/vehiculos.test.ts:173` |
| R11 | `debe actualizar el estado de un vehículo existente y devolver 200` | `backend/src/tests/vehiculos.test.ts:188` |
| R12 | `debe rechazar la actualización con un valor de estado inválido con 422` | `backend/src/tests/vehiculos.test.ts:204` |
| R13 | `debe devolver 404 al actualizar un vehículo inexistente` | `backend/src/tests/vehiculos.test.ts:214` |
| R14 | `debe rechazar el cambio de un vehículo EN_RUTA a MANTENIMIENTO o FUERA_SERVICIO con 422` | `backend/src/tests/vehiculos.test.ts:228` |
| R15 | `debe rechazar la actualización de estado de un usuario sin rol OPERADOR con 403` | `backend/src/tests/vehiculos.test.ts:246` |

### Frontend (Vitest + Testing Library) — `frontend/src/features/vehiculos/vehiculos.test.tsx`

| Requisito | Test | Archivo:línea |
|---|---|---|
| R16 | `renderiza el título "Vehículos", la tabla con sus columnas y los controles principales` | `frontend/src/features/vehiculos/vehiculos.test.tsx:80` |
| R17 | `muestra mensajes de validación junto a cada campo inválido sin enviar el formulario` | `frontend/src/features/vehiculos/vehiculos.test.tsx:110` |
| R18 | `envía la solicitud de actualización con el nuevo estado seleccionado` + `refleja un error de la actualización (p.ej. 422) mediante un Toast sin recargar la página` | `frontend/src/features/vehiculos/vehiculos.test.tsx:131` y `:150` |
| R19 | `filtra la tabla al seleccionar un estado en el control de filtro` | `frontend/src/features/vehiculos/vehiculos.test.tsx:173` |
| R20 | `muestra un error inline de placa duplicada y conserva los valores ingresados cuando el backend responde 409` | `frontend/src/features/vehiculos/vehiculos.test.tsx:198` |

(Test adicional de sanity, fuera de la trazabilidad R<n>: `VehiculoTable — renderiza
badges de estado por color/etiqueta`, línea 227 — verifica el mapeo de badges usado
también por R16/R19.)

## Resultado de verificación (T17)

| Verificación | Antes | Después | Resultado |
|---|---|---|---|
| Tests backend (`npx jest`) | 118/118 (7 suites) | **133/133 (8 suites)** | ✅ verde (+15 tests, 1 suite nueva) |
| Tests frontend (`npx vitest run`) | 59/59 (12 archivos) | **66/66 (13 archivos)** | ✅ verde (+7 tests, 1 archivo nuevo) |
| Lint backend (`npm run lint`) | — | sin errores ni warnings | ✅ |
| Lint frontend (`npm run lint`) | — | sin errores ni warnings | ✅ |
| Build backend (`npm run build` → `tsc`) | — | compila sin errores | ✅ |
| Build frontend (`npm run build` → `tsc -b && vite build`) | — | compila y empaqueta sin errores (warning preexistente `INEFFECTIVE_DYNAMIC_IMPORT` de `authService.ts`, no relacionado con esta feature) | ✅ |
| `./init.sh` | — | **30/30 checks pasaron**, incluyendo "Exactamente una feature in_progress: vehiculos_gestion" y "Specs presentes para 8 feature(s) sdd activas" | ✅ |
| Migración Prisma nueva | — | ninguna generada (`backend/prisma/migrations/` sin cambios: última es `20260605120000_rutas_gestion`) | ✅ confirma T1 |

## Notas

- No se usó `any` explícito en TypeScript.
- No se dejaron `console.log` de debug.
- No se marcó la feature como `done` en `feature_list.json` (responsabilidad del leader tras revisión del reviewer).
- No se hicieron commits de git (responsabilidad del leader).

---

## Correcciones aplicadas tras revisión (RECHAZADO → re-presentación)

Fuente de verdad del rechazo: `progress/review_vehiculos_gestion.md`. Hallazgo
único bloqueante: `vehiculos.test.ts` mockeaba `vehiculoService` por completo
(`jest.mock('../services/vehiculoService')`), por lo que la lógica real del
servicio —y muy en particular la regla de negocio de R14— nunca se ejecutaba;
el reviewer lo demostró invirtiendo la condición `vehiculo.estado === 'EN_RUTA'`
y viendo que las 15 pruebas seguían en verde.

### Qué se cambió

**Archivo modificado**: `backend/src/tests/vehiculos.test.ts` (único archivo
tocado; no se modificó arquitectura, controllers, repositorios, frontend ni
ningún otro artefacto que el reviewer ya validó).

Se agregó, al final del archivo, un bloque
`describe('vehiculoService — lógica de negocio (unit, real implementación + repo mockeado)')`
que replica EXACTAMENTE el patrón ya aprobado en `rutas.test.ts` (líneas
~336-368): un helper `loadServiceWithMockedRepo()` que usa
`jest.isolateModules` + `jest.unmock('../services/vehiculoService')` +
`require(...)` para cargar la implementación REAL de `vehiculoService` junto
con `vehiculoRepository` auto-mockeado (el `jest.mock('../repositories/vehiculoRepository')`
de cabecera ya existía). También se agregó un helper `makeVehiculo(...)` que
construye el objeto `Vehiculo` con forma de Prisma (no el DTO de respuesta),
análogo al `makeVehiculo` de `rutas.test.ts`.

**11 tests nuevos** (de 15 → 26 tests totales en el archivo), todos ejercitando
la implementación real del servicio con el repositorio mockeado:

| Requisito | Qué verifica contra la implementación real | Test |
|---|---|---|
| R1 | `vehiculoService.crear` llama primero a `repo.findByPlaca('ABC-123')`, y solo si devuelve `null` invoca `repo.crear({ placa, modelo, capacidad })` (sin `estado` en el payload) y devuelve el DTO con `estado: 'DISPONIBLE'` | `R1 — debe verificar placa única y crear el vehículo cuando no existe duplicado` |
| R2 | `vehiculoService.crear` lanza `AppError('PLACA_DUPLICADA', …, 409)` cuando `repo.findByPlaca` devuelve un vehículo existente, y NO llama a `repo.crear` | `R2 — debe lanzar PLACA_DUPLICADA (409) y NO crear cuando la placa ya existe` |
| R6 | `vehiculoService.listar({})` reenvía `{}` a `repo.findAll` y mapea correctamente el array de `Vehiculo` (Prisma) a `VehiculoResponseDto[]` | `R6 — debe listar vehículos delegando en el repositorio sin filtro y mapear al DTO` |
| R7 | `vehiculoService.listar({ estado: 'MANTENIMIENTO' })` reenvía el filtro tal cual a `repo.findAll` y devuelve solo lo que el repositorio (responsable real del filtrado vía Prisma `where`) responde | `R7 — debe reenviar el filtro de estado al repositorio y devolver solo lo que este responde` |
| R11 | `vehiculoService.actualizarEstado` busca con `repo.findById`, delega en `repo.actualizarEstado(id, nuevoEstado)` y devuelve el DTO mapeado | `R11 — debe buscar el vehículo, delegar la actualización en el repositorio y devolver el DTO mapeado` |
| R13 | `vehiculoService.actualizarEstado` lanza `AppError('VEHICULO_NOT_FOUND', …, 404)` cuando `repo.findById` devuelve `null`, y NO llama a `repo.actualizarEstado` | `R13 — debe lanzar VEHICULO_NOT_FOUND (404) y NO actualizar cuando el vehículo no existe` |
| **R14** | (a) `it.each([MANTENIMIENTO, FUERA_SERVICIO])` — lanza `AppError('VEHICULO_EN_RUTA_ACTIVA', …, 422)` y NO llama a `repo.actualizarEstado` cuando el vehículo está `EN_RUTA`; (b) permite `EN_RUTA → DISPONIBLE` (no lanza, delega en el repo); (c) `it.each([MANTENIMIENTO, FUERA_SERVICIO])` — permite `DISPONIBLE → {MANTENIMIENTO,FUERA_SERVICIO}` (el bloqueo NO aplica fuera de `EN_RUTA`) | `describe('R14 — bloqueo de transición de un vehículo EN_RUTA hacia MANTENIMIENTO/FUERA_SERVICIO')` con 5 casos (`it.each` ×2 + 1 caso simple) |

Las pruebas usan `repo.findById`/`repo.findByPlaca`/`repo.findAll`/`repo.crear`/
`repo.actualizarEstado` mockeados (vía `jest.Mocked<typeof vehiculoRepository>`)
y `expect(...).rejects.toMatchObject({ error, statusCode })` /
`expect(repo.X).not.toHaveBeenCalled()` para que sea la lógica condicional
REAL del servicio la que decide lanzar o delegar — exactamente el nivel de
rigor ya aprobado para `rutaService`.

### Verificación por mutación de R14 (réplica de la prueba del reviewer)

1. Se invirtió deliberadamente la condición en
   `backend/src/services/vehiculoService.ts:56`:
   `vehiculo.estado === 'EN_RUTA'` → `vehiculo.estado !== 'EN_RUTA'`.
2. Se ejecutó `npx jest src/tests/vehiculos.test.ts`:
   **resultado: 5 tests fallan** (de 26) — exactamente los que dependen de la
   condición real de R14:
   - `R11 — debe buscar el vehículo, delegar la actualización…` (un vehículo
     `DISPONIBLE` ahora dispara el bloqueo erróneamente).
   - `R14 › lanza VEHICULO_EN_RUTA_ACTIVA (422)… MANTENIMIENTO` y `…FUERA_SERVICIO`
     (con la condición invertida, un vehículo `EN_RUTA` ya NO lanza el error
     esperado — falla con `TypeError` porque el repo mockeado nunca configurado
     devuelve `undefined`).
   - `R14 › permite la transición DISPONIBLE → MANTENIMIENTO` y `…FUERA_SERVICIO`
     (con la condición invertida, un vehículo `DISPONIBLE` SÍ dispara el bloqueo,
     violando la transición que debería estar permitida).
3. Esto confirma que la nueva cobertura SÍ ejercita la lógica condicional real
   de R14 (y de paso la de R11), a diferencia de la suite original que el
   reviewer demostró ciega a esta mutación (15/15 en verde).
4. Se revirtió la mutación inmediatamente:
   `vehiculo.estado !== 'EN_RUTA'` → `vehiculo.estado === 'EN_RUTA'`.
   **`git diff backend/src/services/vehiculoService.ts` devuelve vacío** —
   cero residuos, el archivo quedó idéntico al original.
5. Se re-ejecutó `npx jest src/tests/vehiculos.test.ts` con la condición
   restaurada: **26/26 en verde**.

### Sobre la observación menor de tipos (`createdAt`/`updatedAt`)

Se investigó la discrepancia señalada (`VehiculoResponseDto.createdAt/updatedAt: Date`
vs. `design.md` → `string (ISO 8601)`) y se decidió **no modificarla**, por ser
en realidad **consistente con el precedente ya aprobado del propio repo**:
`backend/src/types/rutaTypes.ts` (feature `rutas_gestion`, ya revisada y
aprobada) tipa sus mismos campos como `createdAt: Date` / `updatedAt: Date` en
el DTO interno del backend, mientras que sus contrapartes en
`frontend/src/types/{ruta,vehiculo}Types.ts` los tipan como `string` —
reflejando fielmente que Express serializa `Date → string ISO 8601` en
`res.json()`. `vehiculoTypes.ts` sigue exactamente esa misma convención
backend/frontend ya validada. Cambiar solo `vehiculoTypes.ts` a `string`
introduciría una inconsistencia con `rutaTypes.ts` y obligaría a tocar
`mapVehiculoToDto` (que retorna `Vehiculo.createdAt: Date` de Prisma
directamente) sin aportar ningún cambio de comportamiento real — el contrato
HTTP ya es el correcto. Se documenta esta decisión en lugar de aplicar un
cambio que generaría más inconsistencia que la que resuelve.

### Resultado final de verificación

| Verificación | Resultado |
|---|---|
| `npx jest src/tests/vehiculos.test.ts` | ✅ 26/26 (15 originales + 11 nuevos de servicio real) |
| `cd backend && npm test` (suite completa) | ✅ **144/144** (8 suites) — antes de esta corrección: 133/133; +11 tests nuevos, 0 regresiones |
| `cd backend && npm run lint` | ✅ sin errores ni warnings |
| `cd backend && npm run build` (`tsc`) | ✅ compila sin errores |
| `cd frontend && npm test` (Vitest) | ✅ 66/66 (13 archivos) — sin cambios, no se tocó frontend |
| `cd frontend && npm run lint` | ✅ sin errores ni warnings |
| `cd frontend && npm run build` | ✅ compila y empaqueta (mismo warning preexistente `INEFFECTIVE_DYNAMIC_IMPORT` de `authService.ts`, no relacionado) |
| Mutación deliberada de R14 (réplica de la prueba del reviewer) | ✅ **5/26 tests fallan** con la condición invertida → cobertura real confirmada; mutación revertida, `git diff` del servicio vacío |

**Archivo modificado**: únicamente `backend/src/tests/vehiculos.test.ts`
(+11 tests reales de servicio). Ningún otro archivo de la implementación
original fue tocado.
