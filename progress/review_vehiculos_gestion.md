# Review — vehiculos_gestion — APROBADO (ronda 2)

> Este informe sustituye el veredicto de la ronda 1 (RECHAZADO). Se conserva
> un resumen de la ronda 1 al final como histórico.

## Resumen del veredicto (ronda 2)

**APROBADO.** El único hallazgo bloqueante de la ronda 1 — que
`backend/src/tests/vehiculos.test.ts` mockeaba `vehiculoService` por completo
y por lo tanto la lógica real del servicio (en particular R14, la regla de
bloqueo de transición `EN_RUTA → MANTENIMIENTO/FUERA_SERVICIO`) nunca se
ejecutaba — ha sido corregido de forma verificable e independiente.

He repetido **yo mismo, desde cero**, exactamente la prueba de mutación que
hice en la ronda 1 (invertir `vehiculo.estado === 'EN_RUTA'` →
`vehiculo.estado !== 'EN_RUTA'` en `vehiculoService.actualizarEstado`,
línea 56) contra la nueva suite de 26 tests, y esta vez **5 de 26 tests
fallan**, exactamente los que dependen de esa condición:

- `R11 — debe buscar el vehículo, delegar la actualización…` (un vehículo
  `DISPONIBLE` dispara el bloqueo erróneamente con la condición invertida).
- `R14 › lanza VEHICULO_EN_RUTA_ACTIVA (422)… MANTENIMIENTO` y `…FUERA_SERVICIO`
  (con la condición invertida, un vehículo `EN_RUTA` ya no lanza el error
  esperado; el mensaje real observado es `TypeError: Cannot read properties
  of undefined (reading 'id')` porque el repo mockeado de `actualizarEstado`
  nunca fue configurado para ese camino).
- `R14 › permite la transición DISPONIBLE → MANTENIMIENTO` y `…FUERA_SERVICIO`
  (con la condición invertida, un vehículo `DISPONIBLE` sí dispara el bloqueo,
  violando una transición que debe estar permitida).

Esto coincide **exactamente** (mismo número, mismos nombres de test) con lo
que reporta el implementer en `progress/impl_vehiculos_gestion.md` §
"Verificación por mutación de R14". La cobertura de R14 (y, de paso, de R11)
es ahora real.

Reverti la mutación inmediatamente y confirmé **cero residuos**: comparé el
archivo restaurado byte a byte contra una copia de respaldo tomada antes de
mutar (`diff` → idéntico), volví a correr la suite completa de
`vehiculos.test.ts` (→ 26/26 en verde) y eliminé la copia de respaldo.
`git status` confirma que `backend/src/services/vehiculoService.ts` permanece
exactamente como estaba (sigue listado como `??` — nuevo/untracked — sin ningún
artefacto adicional).

---

## Paso 1 — Verificación del nuevo bloque de tests (real implementación + repo mockeado)

Leí `backend/src/tests/vehiculos.test.ts` completo (448 líneas, 26 tests:
15 originales de integración HTTP + 11 nuevos de servicio). Confirmo que el
nuevo bloque (líneas 257–448,
`describe('vehiculoService — lógica de negocio (unit, real implementación + repo mockeado)')`):

- Usa un helper `loadServiceWithMockedRepo()` (líneas 276–289) que llama
  `jest.isolateModules(() => { jest.unmock('../services/vehiculoService'); ... require(...) })`,
  cargando la implementación **real** de `vehiculoService` en un registro de
  módulos aislado, con `vehiculoRepository` auto-mockeado (`jest.mock(...)` de
  cabecera, línea 8) como única dependencia simulada.
- Replica **literalmente** el patrón ya aprobado en `rutas.test.ts` líneas
  336–366 (`loadServiceWithMockedRepo`, `jest.isolateModules` +
  `jest.unmock('../services/rutaService')` + `require`) — comparé ambos
  bloques lado a lado y la estructura es idéntica salvo el nombre de la
  entidad.
- NO se toca/desactiva el `jest.mock('../services/vehiculoService')` global
  (línea 9): el `unmock` ocurre solo dentro de `isolateModules`, exactamente
  como en `rutaService`, así que los 15 tests HTTP de integración siguen
  usando el servicio mockeado (su propósito original) y los 11 nuevos cargan
  el real.
- Cada uno de los 11 tests llama a `loadServiceWithMockedRepo()` (módulo
  aislado por test) y configura solo `repo.findByPlaca` / `repo.findById` /
  `repo.findAll` / `repo.crear` / `repo.actualizarEstado` (el repositorio,
  nunca el servicio).

### Asserts por requisito — ¿son significativos?

| R | Test(s) | ¿Qué decide el resultado del assert? | Significativo |
|---|---|---|---|
| R1 | `R1 — debe verificar placa única y crear…` | `repo.findByPlaca` devuelve `null` → la lógica real de `service.crear` decide llamar a `repo.findByPlaca('ABC-123')` primero, luego `repo.crear({placa, modelo, capacidad})` **sin** `estado`, y el DTO resultante tiene `estado: 'DISPONIBLE'`. Si el servicio no verificara la placa antes de crear, `repo.findByPlaca` no se invocaría con ese argumento. | ✅ |
| R2 | `R2 — debe lanzar PLACA_DUPLICADA…` | `repo.findByPlaca` devuelve un vehículo existente → el servicio real decide lanzar `AppError('PLACA_DUPLICADA', …, 409)` y **no** llamar `repo.crear`. `rejects.toMatchObject({error, statusCode})` + `expect(repo.crear).not.toHaveBeenCalled()`: si el `if (existente !== null) throw …` se eliminara o invirtiera, el test fallaría (no se lanzaría el error, o se llamaría `repo.crear`). | ✅ |
| R6 | `R6 — debe listar… sin filtro y mapear al DTO` | El servicio real invoca `repo.findAll({})`  y mapea cada `Vehiculo` (forma Prisma) a `VehiculoResponseDto` vía `mapVehiculoToDto`; el assert verifica forma y contenido del DTO mapeado (placa/modelo/capacidad/estado), no solo la longitud del array. | ✅ |
| R7 | `R7 — debe reenviar el filtro de estado…` | Verifica que `service.listar({estado: 'MANTENIMIENTO'})` reenvía exactamente `{estado: 'MANTENIMIENTO'}` a `repo.findAll` (no `{}` ni otra forma) — si el servicio ignorara el filtro o lo transformara incorrectamente, `toHaveBeenCalledWith` fallaría. | ✅ |
| R11 | `R11 — debe buscar…, delegar… y devolver el DTO mapeado` | Con `repo.findById` devolviendo un vehículo `DISPONIBLE`, el servicio real debe (a) no lanzar, (b) llamar `repo.actualizarEstado('vehiculo-1', 'MANTENIMIENTO')`, (c) mapear el resultado. Es precisamente este test el que la mutación de R14 rompe (porque con la condición invertida un `DISPONIBLE` activa el bloqueo) — evidencia de que ejercita la rama condicional real. | ✅ |
| R13 | `R13 — debe lanzar VEHICULO_NOT_FOUND…` | `repo.findById` devuelve `null` → el servicio real decide lanzar `AppError('VEHICULO_NOT_FOUND', …, 404)` y no llamar `repo.actualizarEstado`. | ✅ |
| **R14** | `describe('R14 — bloqueo de transición…')` con 5 casos (`it.each` ×2 + 1 simple) | (a) `EN_RUTA` + `{MANTENIMIENTO, FUERA_SERVICIO}` → debe lanzar `VEHICULO_EN_RUTA_ACTIVA` (422) y NO llamar `repo.actualizarEstado`; (b) `EN_RUTA → DISPONIBLE` → debe permitirse (no lanza, delega); (c) `DISPONIBLE → {MANTENIMIENTO, FUERA_SERVICIO}` → debe permitirse (el bloqueo NO aplica fuera de `EN_RUTA`). Estos tres escenarios cubren exactamente las tres ramas de la condición compuesta `vehiculo.estado === 'EN_RUTA' && ESTADOS_BLOQUEADOS_DESDE_EN_RUTA.includes(nuevoEstado)`, y mi mutación independiente (ver abajo) confirma que rompen si esa condición se invierte. | ✅✅ |

**Conclusión del Paso 1**: el bloque nuevo carga la implementación real de
`vehiculoService` con solo `vehiculoRepository` mockeado, replica el patrón ya
aprobado de `rutaService`, y sus asserts son significativos (verifican
secuencias de llamadas, argumentos exactos, contenido del DTO mapeado y
lanzamiento condicional de errores específicos) — no son triviales ni
redundantes con los 15 tests HTTP existentes.

---

## Paso 2 — Mutación independiente de R14 (repetida desde cero)

Procedimiento que ejecuté yo mismo (sin asumir el resultado del implementer):

1. Tomé una copia de respaldo de `backend/src/services/vehiculoService.ts`
   (`cp … vehiculoService.ts.bak`, 69 líneas, contenido verificado idéntico
   al original).
2. Apliqué la mutación con `Edit`: línea 56,
   `vehiculo.estado === 'EN_RUTA'` → `vehiculo.estado !== 'EN_RUTA'`
   (exactamente la misma mutación de mi ronda 1, que invierte la condición
   central que protege R14).
3. Ejecuté `npx jest src/tests/vehiculos.test.ts`:

   ```
   Test Suites: 1 failed, 1 total
   Tests:       5 failed, 21 passed, 26 total
   ```

   Los 5 que fallan son, literalmente:
   - `vehiculoService — … › R11 — debe buscar el vehículo, delegar…`
   - `… › R14 › … lanza VEHICULO_EN_RUTA_ACTIVA (422)… es MANTENIMIENTO`
   - `… › R14 › … lanza VEHICULO_EN_RUTA_ACTIVA (422)… es FUERA_SERVICIO`
   - `… › R14 › … permite la transición DISPONIBLE → MANTENIMIENTO …`
   - `… › R14 › … permite la transición DISPONIBLE → FUERA_SERVICIO …`

   Mensajes observados: para los casos "lanza…", `TypeError: Cannot read
   properties of undefined (reading 'id')` (la rama `EN_RUTA` ya no entra al
   `throw` y cae al `repo.actualizarEstado` no configurado, devolviendo
   `undefined`); para los casos "permite DISPONIBLE → …", el servicio lanza
   `VEHICULO_EN_RUTA_ACTIVA` indebidamente. Exactamente el comportamiento
   esperado de una condición de bloqueo invertida.

4. Reverti con `Edit`: `vehiculo.estado !== 'EN_RUTA'` →
   `vehiculo.estado === 'EN_RUTA'`.
5. Verifiqué **cero residuos**: `diff backend/src/services/vehiculoService.ts
   backend/src/services/vehiculoService.ts.bak` → archivos **idénticos**
   (sin diferencias). `git status --porcelain` muestra el archivo solo como
   `?? backend/src/services/vehiculoService.ts` (nuevo/untracked, sin cambios
   de contenido respecto a como estaba antes de mi mutación).
6. Eliminé la copia de respaldo (`vehiculoService.ts.bak`) — confirmado que
   ya no aparece en `git status`.
7. Re-ejecuté `npx jest src/tests/vehiculos.test.ts` con la condición
   restaurada: **26/26 en verde**.

**Resultado**: mi reproducción independiente coincide exactamente —en número
de tests fallidos, en los nombres de los tests y en la causa— con lo que
reporta el implementer en `progress/impl_vehiculos_gestion.md`. Esto confirma
de forma concluyente que la nueva suite ejercita la lógica condicional real de
R14 (y de R11), a diferencia de la suite original (15/15 ciega a la misma
mutación, demostrado en mi ronda 1).

---

## Paso 3 — Trazabilidad backend actualizada (R1, R2, R6, R7, R11, R13, R14)

Estos 7 requisitos eran los señalados como "disguised stub" en la ronda 1.
Ahora cada uno tiene **dos** capas de cobertura: el test HTTP de integración
original (controlador + middlewares + servicio mockeado) y el nuevo test de
servicio (servicio real + repositorio mockeado), que es el que cierra el
hueco de trazabilidad real:

| R | Test HTTP (mock de servicio) | Test de servicio (real + repo mockeado) | Estado final |
|---|---|---|---|
| R1 | `debe registrar un vehículo válido…` | `R1 — debe verificar placa única y crear…` | ✅ |
| R2 | `debe rechazar el registro con placa duplicada…` | `R2 — debe lanzar PLACA_DUPLICADA…` | ✅ |
| R6 | `debe listar vehículos con placa, modelo…` | `R6 — debe listar… y mapear al DTO` | ✅ |
| R7 | `debe filtrar vehículos por estado…` | `R7 — debe reenviar el filtro de estado…` | ✅ |
| R11 | `debe actualizar el estado… y devolver 200` | `R11 — debe buscar…, delegar… y devolver el DTO mapeado` | ✅ |
| R13 | `404 al actualizar un vehículo inexistente` | `R13 — debe lanzar VEHICULO_NOT_FOUND…` | ✅ |
| **R14** | `debe rechazar el cambio de un vehículo EN_RUTA…` | `describe('R14 — bloqueo de transición…')` (5 casos: bloquea EN_RUTA→{MANT,FS}, permite EN_RUTA→DISPONIBLE, permite DISPONIBLE→{MANT,FS}) | ✅ |

El resto de requisitos (R3, R4, R5, R8, R9, R10, R12, R15 en backend; R16–R20
en frontend) ya estaban correctamente cubiertos en la ronda 1 y no fueron
tocados — siguen igual.

**Trazabilidad backend final: 15/15 requisitos backend (R1–R15) con cobertura
real. Trazabilidad frontend: 5/5 (R16–R20). Total 20/20.**

---

## Paso 4 — Verificación final ejecutada de forma independiente

| Verificación | Resultado |
|---|---|
| `npx jest src/tests/vehiculos.test.ts` (condición original, antes de mutar) | ✅ 26/26 |
| `npx jest src/tests/vehiculos.test.ts` (con mutación de R14 aplicada por mí) | ❌ 5/26 fallan (R11, R14×4) — ver Paso 2 |
| `npx jest src/tests/vehiculos.test.ts` (condición restaurada, verificada idéntica al original) | ✅ 26/26 |
| `cd backend && npm test` (Jest, suite completa) | ✅ **144/144** (8 suites) |
| `cd backend && npm run lint` | ✅ sin errores ni warnings |
| `cd backend && npm run build` (`tsc`) | ✅ compila sin errores |
| `cd frontend && npm test -- --run` (Vitest) | ✅ **66/66** (13 archivos) |
| `cd frontend && npm run lint` | ✅ sin errores ni warnings |
| `cd frontend && npm run build` (`tsc -b && vite build`) | ✅ compila y empaqueta (mismo warning preexistente `INEFFECTIVE_DYNAMIC_IMPORT` de `authService.ts`, no relacionado con esta feature, ya observado en ronda 1) |
| `bash ./init.sh` (raíz) | ✅ **30/30 checks** (lint+tests backend y frontend en verde) |

Todos los conteos finales declarados por el implementer (144/144 backend,
66/66 frontend, +11 tests nuevos en `vehiculos.test.ts`, lint/build limpios)
quedan **confirmados de forma independiente**.

---

## Paso 5 — Confirmación de ausencia de regresiones desde la ronda 1

Comparé `git status --porcelain` actual contra el estado original (mismo
conjunto exacto de archivos `??`/`M`, sin adiciones ni eliminaciones) y
revisé los timestamps de modificación (`mtime`) de todos los archivos nuevos
de `vehiculos_gestion`:

- **Backend** (`vehiculoController.ts`, `vehiculoRepository.ts`,
  `routes/vehiculos.ts`, `vehiculoService.ts`, `vehiculoTypes.ts`,
  `vehiculoValidator.ts`): mtimes entre `23:05:42` y `23:08:59` del
  2026-06-06 — **sin cambios** desde la primera implementación.
  (`vehiculoService.ts` muestra un mtime posterior, `23:59:16`, que
  corresponde **a mi propia operación de revertir la mutación** en el Paso 2
  — confirmado por el `diff` byte-a-byte contra el respaldo, que dio
  resultado idéntico: cero cambios de contenido).
- **`backend/src/tests/vehiculos.test.ts`**: mtime `23:46:41`, claramente
  posterior a todos los demás archivos del backend — es el **único** archivo
  modificado en esta ronda, confirmando la afirmación del implementer
  ("Archivo modificado: únicamente `backend/src/tests/vehiculos.test.ts`").
- **Frontend** (`ActualizarEstadoVehiculo.tsx`, `GestionVehiculos.tsx`,
  `VehiculoForm.tsx`, `VehiculoTable.tsx`, `vehiculos.test.tsx`,
  `useActualizarEstadoVehiculo.ts`, `useCrearVehiculo.ts`, `useVehiculos.ts`,
  `services/vehiculoService.ts`, `types/vehiculoTypes.ts`): mtimes entre
  `23:11:27` y `23:19:34` del 2026-06-06 — **sin cambios**.

No hay archivos nuevos, eliminados ni modificados fuera de
`backend/src/tests/vehiculos.test.ts`. La arquitectura, seguridad, convenios
y wireframe que aprobé como ✅ en la ronda 1 (ver resumen histórico abajo)
permanecen intactos — no se requiere repetirlos en detalle porque el código
de producción no cambió.

### Sobre la observación menor de tipos (no bloqueante, ronda 1)

El implementer decidió **no** modificar `VehiculoResponseDto.createdAt/updatedAt:
Date` (vs. `string` en `design.md`), argumentando consistencia con el
precedente ya aprobado `rutaTypes.ts`. Verifiqué que `rutaTypes.ts` en efecto
tipa sus DTOs de backend como `Date` y los de frontend como `string`, igual
que `vehiculoTypes.ts` — la decisión es razonable, documentada, y la
observación original ya era explícitamente "no bloqueante". Sin objeciones.

---

## Arquitectura: ✅ (sin cambios desde ronda 1 — código de producción intacto)
## Seguridad: ✅ (sin cambios desde ronda 1)
## Convenios: ✅ (sin cambios desde ronda 1)
## Trazabilidad: ✅ 20/20 requisitos (R1–R20) con test real y significativo
## Verificación: ✅ 144/144 backend + 66/66 frontend + lint/build limpios + `init.sh` 30/30 + mutación de R14 reproducida de forma independiente con resultado idéntico al reportado

---

## Decisión

**Decisión: APROBADO.**

El hallazgo bloqueante de la ronda 1 (R14 — y por extensión R1/R2/R6/R7/R11/R13
— sin cobertura real del servicio, demostrado por mutación) fue corregido
mediante la adición de un bloque de 11 tests que cargan la implementación real
de `vehiculoService` con `vehiculoRepository` mockeado, replicando fielmente
el patrón ya aprobado en `rutaService`. Repetí la prueba de mutación de forma
completamente independiente y obtuve el mismo resultado exacto (5/26 tests
fallan, mismos nombres) que reporta el implementer, confirmando que la
cobertura ahora es real y no un "disguised stub". No se detectaron
regresiones: el único archivo modificado en esta ronda es
`backend/src/tests/vehiculos.test.ts`; todo el código de producción,
arquitectura, seguridad, convenios y frontend permanecen exactamente como
fueron aprobados (con reservas) en mi revisión de la ronda 1.

**El leader debe hacer el commit y luego marcar la feature como done.**

---

---

# Histórico — Ronda 1 (RECHAZADO) — resumen

> Conservado para referencia. El veredicto vigente es el de la ronda 2, arriba.

La ronda 1 aprobó arquitectura (✅), seguridad (✅), convenios (✅),
verificación de build/lint/tests (✅ 133/133 backend, 66/66 frontend, `init.sh`
30/30) y trazabilidad frontend (5/5, R16–R20). Se **rechazó exclusivamente**
porque `vehiculos.test.ts` mockeaba `vehiculoService` por completo
(`jest.mock('../services/vehiculoService')`), dejando sin cobertura real del
servicio a R1, R2, R6, R7, R11, R13 y, de forma crítica, **R14** (la regla de
bloqueo de transición de estado `EN_RUTA → MANTENIMIENTO/FUERA_SERVICIO`).
Una mutación deliberada de la condición de R14 no produjo ningún fallo en las
15 pruebas originales, confirmando un "disguised stub". Se señaló también una
observación menor no bloqueante sobre el tipo `Date` vs `string` en
`VehiculoResponseDto`. Todo lo demás (incluida la coherencia con
`rutas_gestion`) fue aprobado sin objeciones y permanece sin cambios.
