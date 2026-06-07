# Fix: Jest no salía tras correr la suite de tests del backend

> Bugfix puntual de infraestructura de tests (no es una feature de `feature_list.json`,
> no requiere `specs/` ni `tasks.md`).

## Causa raíz

En `backend/src/tests/tracking.test.ts`, el bloque
`describe('Socket.IO — location:update')`:

- `beforeEach` levanta el servidor HTTP/Socket.IO real con `server.listen(0, ...)`
  (puerto efímero) — reutilizándolo entre tests gracias al guard `if (!server.listening)`.
- `afterEach` solo desconectaba los clientes (`clientSocket.disconnect()` /
  `listenerSocket.disconnect()`), pero **nunca cerraba el lado servidor**
  (`io`/`server`, importados de `../index`).

Esto dejaba un listener TCP real en estado `LISTEN` sobre un puerto alto
aleatorio, más los timers internos de heartbeat de Socket.IO
(`pingInterval`/`pingTimeout`) corriendo indefinidamente — manteniendo vivo el
event loop de Node y por tanto el proceso de Jest, que emitía el warning
`Jest did not exit one second after the test run has completed.`

## Cambio realizado

Archivo modificado: `backend/src/tests/tracking.test.ts`

1. Se añadió `io` al import existente desde `../index`:
   ```ts
   import { app, server, io } from '../index';
   ```
   (antes solo se importaban `app` y `server`).

2. Se añadió un `afterAll` **dentro del describe `'Socket.IO — location:update'`**
   (justo después del `afterEach` que desconecta los sockets cliente, antes del
   primer `it`), que cierra `io` y luego `server` exactamente una vez, al
   terminar todos los tests de ese bloque:

   ```ts
   afterAll((done) => {
     io.close(() => {
       server.close(() => done());
     });
   });
   ```

   Se documentó con un comentario el motivo (timers de heartbeat + listener TCP
   manteniendo vivo el event loop) y por qué se hace en `afterAll` y no en
   `afterEach` (el `beforeEach` reutiliza el server vía el guard `if (!server.listening)`,
   así que cerrarlo en cada `afterEach` rompería el guard para el siguiente test
   del mismo bloque).

### Por qué es seguro cerrar `server`/`io` aquí

- `server` e `io` se importan de `../index`, y varios archivos de test
  (`auth.test.ts`, `envios.test.ts`, `forgotPassword.test.ts`,
  `resetPassword.test.ts`, `rutas.test.ts`, `tracking.test.ts`,
  `userProfile.test.ts`) importan `app`/`server` desde el mismo módulo.
- Sin embargo, Jest (con la config por defecto de este proyecto, sin
  `testEnvironment` compartido entre archivos) instancia **un módulo `../index`
  separado por cada archivo de test** — cada `*.test.ts` obtiene su propia copia
  de `app`/`server`/`io`. Cerrar `server`/`io` al final del describe Socket.IO de
  `tracking.test.ts` solo afecta a la instancia de ese archivo y no interfiere
  con los describes que usan `supertest(app)` (HTTP puro, no necesitan el socket
  abierto) ni con ningún otro archivo de test.
- Dentro del propio `tracking.test.ts`, el bloque Socket.IO es el **último**
  describe del archivo, y es el único que llama `server.listen(...)`; el resto
  de describes (`GET /api/v1/tracking/:codigo — ...`) usan `supertest(app)`
  directamente sobre la app de Express sin requerir que `server` esté escuchando.
  Por tanto cerrar `server`/`io` en `afterAll` de ese describe no afecta a
  ningún test que corra antes (ya terminaron) ni después (no hay ninguno).

## Verificación

### 1. `npx jest src/tests/tracking.test.ts --detectOpenHandles`

```
Test Suites: 1 passed, 1 total
Tests:       9 passed, 9 total
Time:        11.711 s
```
- Sin el warning `Jest did not exit one second after the test run has completed.`
- El comando completo (`time ...`) reportó `real 0m18.267s` — el shell retornó
  inmediatamente tras el resumen de Jest, sin proceso colgado.

### 2. `npm run test` (suite completa)

```
Test Suites: 7 passed, 7 total
Tests:       117 passed, 117 total
Time:        15.608 s, estimated 23 s
```
- `time npm run test` → `real 0m20.829s` (vs. ~tiempo reportado por Jest,
  ~15.6s). El proceso sale solo, sin colgarse.
- Verificación adicional: tras finalizar el comando, `Get-Process -Name node`
  no devuelve ningún proceso vivo (0 procesos `node`/`jest` residuales),
  confirmando que ya no quedan listeners TCP ni timers de heartbeat activos.

### Comparación antes/después

| | Antes | Después |
|---|---|---|
| Tests | 117/117 passing | 117/117 passing |
| Warning "Jest did not exit..." | Sí | No |
| Proceso `node`/`jest` tras el resumen | Vivo 5-11 min, socket TCP en LISTEN | Sale inmediatamente, 0 procesos residuales |
| `time npm run test` (real) | Minutos (colgado) | ~20.8 s |

### 3. `npm run lint`

```
> backend@1.0.0 lint
> eslint src --ext .ts
EXIT_CODE=0
```
Sin errores ni warnings nuevos.

## Nota de seguimiento — `rutaService.ts` (fuera de alcance de este fix)

`backend/src/services/rutaService.ts` instancia su propio `PrismaClient` y
ejecuta queries directas (`prisma.envio.findMany`, `prisma.$transaction`,
`prisma.repartidor.findFirst`, etc. — 11 usos en total), violando la convención
de `docs/architecture.md` según la cual los servicios deben orquestar
repositorios y no acceder a Prisma directamente.

Esto **no** es la causa demostrada del cuelgue analizado en este fix: con
`jest.mock` automockeando `@prisma/client`, el cliente nunca llega a conectarse
realmente a la base de datos (conexión perezosa de Prisma — nunca se ejecuta una
query real en los tests), por lo que no mantiene el event loop vivo. Sí es,
no obstante, una desviación arquitectónica real que conviene refactorizar en una
iteración futura — moviendo esas queries a un `rutaRepository` (que ya existe en
`backend/src/repositories/rutaRepository.ts`) para mantener la cadena
`controller → service → repository → Prisma`. Dado que la feature
`rutas_gestion` está actualmente `in_progress` (esperando revisión del
reviewer), refactorizarla ahora arriesga desestabilizarla; se deja como nota
para que el leader/humano decida cuándo abordarla.

## Resumen de archivos modificados

- `backend/src/tests/tracking.test.ts` — añadido `io` al import desde `../index`
  y `afterAll((done) => { io.close(() => server.close(() => done())); })` dentro
  del describe `'Socket.IO — location:update'`, que cierra el servidor
  HTTP/Socket.IO una sola vez al terminar ese bloque de tests.
