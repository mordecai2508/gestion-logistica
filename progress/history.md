# progress/history.md — Bitácora de sesiones

> Archivo append-only. Nunca borrar entradas. Agregar al final al cerrar cada sesión.

---

_Sin sesiones registradas aún._

---

## Sesión 2026-06-04 — infra_base ✅ DONE

**Feature:** `infra_base` (id: 12, sprint 1, sdd: false)
**Resultado:** APROBADO por reviewer.

**Resumen:**
- Creado `backend/` completo: Express + TypeScript + Prisma v5 con schema de 11 modelos y 6 enums, estructura de capas (routes/middlewares/controllers/services/repositories/sockets/types/validators), helmet/cors/rate-limit/socket.io, errorHandler global.
- Creado `frontend/` completo: Vite + React 18 + TypeScript + TanStack Query + Zustand + Tailwind v3 + Leaflet + axios instance + authStore + router placeholder.
- `./init.sh` 28/28 ✅ — exit 0.
- `npm run build` ✅ y `npm run lint` ✅ en ambos workspaces.
- Decisiones técnicas notables: Prisma v5 (v7 incompatible con schema url = env()), Tailwind v3 (v4 no tiene CLI), ESLint flat config en frontend (generado por Vite v8).
- Pendiente: `prisma migrate dev` (requiere BD PostgreSQL con DATABASE_URL configurada).

**Próxima feature:** `auth_login` (id: 1, sprint 1, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-04 — auth_login ✅ DONE

**Feature:** `auth_login` (id: 1, sprint 1, sdd: true)
**Resultado:** APROBADO por reviewer.

**Resumen:**
- Backend: `POST /auth/login` (accessToken body + refreshToken httpOnly cookie), `POST /auth/refresh` (rotación con detección de replay), `POST /auth/logout` (revocación en BD). Middleware `authMiddleware` para rutas protegidas. RefreshToken opaco almacenado en BD con campo `revocado`.
- Frontend: `Login.tsx` (react-hook-form + Zod + Toast), `ProtectedRoute.tsx` (guard por rol), `authStore` Zustand, interceptor axios con refresh automático, `useAuth` hook con redirección por rol.
- Tests: 16/16 backend (mocks Prisma) + 7/7 frontend (vi.mock) = 23/23 ✅.
- Lint ✅ | Build ✅ | init.sh 28/28 ✅.
- Pendiente: `prisma migrate dev --name add_refresh_token` (requiere PostgreSQL activo).

**Próxima feature:** `auth_registro` (id: 2, sprint 1, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-07 — entregas_confirmacion ✅ DONE

**Feature:** `entregas_confirmacion` (id: 9, sprint 4, sdd: true)
**Resultado:** APROBADO por reviewer. Commit `60c309c`.

**Resumen:**
- Spec aprobado por el humano tras una corrección mía: R2/`design.md` debían
  incluir `EN_PREPARACION` entre los estados "pendiente" (si no, esos envíos
  desaparecían de ambas pestañas del frontend, violando R26).
- Backend: `GET /api/v1/entregas?repartidorId=me`, `POST /api/v1/envios/:id/confirmar`
  y `POST /api/v1/envios/:id/fallo` — multer (memoryStorage, validación MIME +
  5MB), almacenamiento en `backend/uploads/entregas/<envioId>/...`, servido vía
  `express.static('/uploads')`. Capas repository/service/controller respetadas,
  transacciones Prisma para envío+evento(+incidencia), `Notificacion` al cliente.
- Frontend: `VistaRepartidor.tsx` (pestañas Pendientes/Completadas + nuevo
  primitivo `tabs.tsx`), `ConfirmacionEntrega.tsx` (captura de foto, firma por
  canvas→Blob, confirmación y modal de incidencia), hooks TanStack Query,
  rutas registradas antes del catch-all `/repartidor/*`.
- El `implementer` necesitó 4 corridas (3 cortes de conexión por socket error en
  corridas largas; recuperación verificando el repo en disco y relanzando con
  instrucciones de continuación). Se detectó y corrigió una violación de la
  regla "prohibido `any` explícito" (`as any` x6 en un test) antes de avanzar.
- **Discrepancia detectada en la verificación final**: el autorreporte del
  implementer afirmaba "todas las tasks marcadas `[x]` excepto T31", pero
  `tasks.md` solo tenía T1–T15 marcadas. Verifiqué el trabajo real (no el
  autorreporte): código revisado archivo por archivo, 0 `any`/`console.log`/
  `alert`, y re-ejecuté yo mismo backend (174/174 tests, lint, build) y
  frontend (73/73 tests, lint, build) — coincidieron exactamente con lo
  reportado. Conclusión: el trabajo de T16–T30 estaba genuinamente completo;
  solo faltaba marcar las casillas. Las marqué yo mismo (specs/ es editable
  por el leader). T31 (verificación manual con Mailpit) queda correctamente
  sin marcar.
- `reviewer` validó trazabilidad completa 32/32 (R1–R32) abriendo cada test,
  no solo el nombre — **APROBADO**. Único hallazgo no bloqueante: entrada
  duplicada `backend/uploads/` en `.gitignore` (el implementer documentó haber
  tocado `backend/.gitignore`, que no existe — era el `.gitignore` raíz);
  limpié el duplicado yo mismo.
- Tests: backend 174/174 (12 suites) ✅ | frontend 73/73 (15 suites) ✅ |
  lint ✅ ambos | build ✅ ambos.

**Lección para próximas sesiones:** no confiar en el recuento de checkboxes ni
en los números de tests del autorreporte de un subagente — re-ejecutar las
verificaciones (`grep` de checkboxes, `npm test`/`lint`/`build`) directamente.
En esta ocasión los números eran correctos, pero el conteo de tasks marcadas
no lo era.

**Próxima feature:** `incidencias_gestion` (id: 10, sprint 4, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-04 — auth_registro ✅ DONE

**Feature:** `auth_registro` (id: 2, sprint 1, sdd: true)
**Resultado:** APROBADO por reviewer (tras 1 ciclo de correcciones).

**Resumen:**
- Backend: `POST /api/v1/auth/register` con validación Zod (nombre, correo, password≥8, confirmPassword, teléfono, rol), `prisma.$transaction` para crear Usuario + perfil (Cliente/Operador/Repartidor) atómicamente, bcrypt rounds=12, 409 para correo duplicado.
- Frontend: `Register.tsx` con react-hook-form + Zod, Shadcn Select con Controller para el campo rol, Toast en 409, redirect a `/login` en éxito.
- Tests: 33/33 backend + 13/13 frontend = 46/46 ✅. Lint ✅ | Build ✅.
- Correcciones del reviewer: tests R10–R12 con mock de `prisma.$transaction` verificando `tx.cliente/operador/repartidor.create`; test R16 con aserción de `navigate('/login')`; `<select>` nativo reemplazado por Shadcn Select con `Controller`.
- Pendiente: `prisma migrate dev` (requiere PostgreSQL activo).

**Próxima feature:** `auth_perfil` (id: 3, sprint 1, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-04 — auth_perfil ✅ DONE

**Feature:** `auth_perfil` (id: 3, sprint 1, sdd: true)
**Resultado:** APROBADO por reviewer en primera pasada.

**Resumen:**
- Backend: `GET /users/me` y `PATCH /users/me` (protegidos con authMiddleware, PATCH solo acepta nombre/teléfono vía Zod, nunca modifica correo/rol/password). `POST /auth/forgot-password` (token opaco 32 bytes, expiresAt+1h, respuesta 200 siempre). `POST /auth/reset-password` (valida token no expirado/no usado, bcrypt rounds=12, marca usado=true).
- `mailer.ts` con nodemailer, exportado directamente para jest.mock sin modificar lógica. Variables SMTP en .env.example.
- Frontend: `Perfil.tsx` (useQuery + useMutation), `ForgotPassword.tsx`, `ResetPassword.tsx` (useSearchParams para token), rutas en router.
- Tests: 54/54 backend + 23/23 frontend = 77/77 ✅. Lint ✅ | Build ✅ | init.sh 30/30 ✅.

**Próxima feature:** `envios_crear` (id: 4, sprint 2, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-05 — envios_crear ✅ DONE

**Feature:** `envios_crear` (id: 4, sprint 2, sdd: true)
**Resultado:** APROBADO por reviewer en segunda pasada (post-correcciones).

**Resumen:**
- Backend: `POST /api/v1/envios` (OPERADOR only): validación Zod, generación de código TRK-YYYYMMDD-XXXXXXXX con 3 reintentos, `prisma.$transaction` crea Envio + EventoEnvio inicial, `AppError` 404 si clienteId no existe, 500 si 3 colisiones. `GET /api/v1/clientes?search=` para el combobox del formulario.
- Frontend: `CrearEnvio.tsx` (react-hook-form + Zod, combobox de búsqueda de clientes con debounce, Peso/Dimensiones en grid de 2 columnas), `useCrearEnvio` hook (TanStack useMutation), `envioService`, `clienteService`, DTOs en `frontend/src/types/envioTypes.ts`, ruta `/envios/crear` protegida con `ProtectedRoute roles=['OPERADOR']`.
- Tests: 66/66 backend + 30/30 frontend = 96/96 ✅. Lint ✅ | Build ✅.
- Correcciones post-review: DTOs movidos a `types/`, test R13 (botón Cancelar), layout Peso/Dimensiones en fila, `clienteId` como combobox con endpoint `GET /api/v1/clientes`.

**Próxima feature:** `envios_consultar` (id: 5, sprint 2, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-05 — envios_consultar ✅ DONE

**Feature:** `envios_consultar` (id: 5, sprint 2, sdd: true)
**Resultado:** APROBADO por reviewer en primera pasada.

**Resumen:**
- Backend: `GET /api/v1/envios` (paginado, filtros `estado`/`cliente`/`codigo` AND-logic en Prisma, meta con `total/page/limit/totalPages`), `GET /api/v1/envios/:id` (detalle con `EventoEnvio[]` ordenado por timestamp), `PATCH /api/v1/envios/:id` (edita 6 campos, protege `estado`/`codigoSeguimiento`, `.refine` exige ≥1 campo), `DELETE /api/v1/envios/:id` (cancela solo si PENDIENTE → 409 si no, transacción atómica con EventoEnvio).
- Frontend: `ConsultarEnvios.tsx` (tabla con badges, buscador, paginación, AlertDialog, botón Nuevo Envío), `EditarEnvioModal.tsx` (Dialog Shadcn + RHF + Zod pre-poblado), `DetalleEnvio.tsx` (línea de tiempo de eventos), 4 hooks (useEnvios, useEnvioDetalle, useEditarEnvio, useCancelarEnvio), rutas `/envios` y `/envios/:id` con orden correcto respecto a `/envios/crear`.
- Tests: 87/87 backend + 46/46 frontend = 133/133 ✅. Lint ✅ | Build ✅.

**Próxima feature:** `rastreo_paquete` (id: 6, sprint 3, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-05 — rastreo_paquete ✅ DONE

**Feature:** `rastreo_paquete` (id: 6, sprint 3, sdd: true)
**Resultado:** APROBADO por reviewer en primera pasada.

**Resumen:**
- Backend: `GET /api/v1/tracking/:codigo` (público, sin auth) devuelve estado + EventoEnvio[] ordenado por timestamp + `ultimaActualizacion`. Socket.IO handler en `sockets/tracking.ts`: valida payload `location:update { envioId, lat, lng }` con Zod, persiste `EventoEnvio` con lat/lng en BD, rebroadcast a sala `tracking:${envioId}` como evento `tracking:location`.
- Frontend: `RastrearPaquete.tsx` (campo búsqueda por código, badge estado, timestamp), `TrackingMap.tsx` (react-leaflet, marcador actualizable en tiempo real), `EventoTimeline.tsx` (historial de eventos), hooks `useTracking` (REST) y `useTrackingSocket` (Socket.IO), ruta pública `/tracking/:codigo`.
- Tests: 96/96 backend (9 nuevos en `tracking.test.ts`) + 52/52 frontend (6 nuevos) = 148/148 ✅. Lint ✅ | Build ✅.

**Próxima feature:** `rutas_gestion` (id: 7, sprint 3, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-06 — rutas_gestion ✅ DONE

**Feature:** `rutas_gestion` (id: 7, sprint 3, sdd: true)
**Resultado:** APROBADO por reviewer en segunda pasada (post-correcciones).

**Resumen:**
- Backend: `POST /api/v1/rutas` (crea ruta con envíos+vehículo+repartidor vía `prisma.$transaction`), `GET /api/v1/rutas` (lista con filtros, incluye `?repartidorId=me`), `GET /api/v1/rutas/:id`, `PATCH /api/v1/rutas/:id` (reasigna repartidor/vehículo), `GET /api/v1/rutas/:id/optima` (heurística de orden óptimo de paradas), cierre automático de ruta (`verificarCierreRuta`) cuando todos sus envíos llegan a estado terminal.
- Frontend: `GestionRutas.tsx`, `RutaCard.tsx`, `RutaDetalle.tsx`, `RutaForm.tsx`, `EnvioCheckboxList.tsx`, hooks `useRutas`/`useRutaDetalle`/`useCrearRuta`/`useReasignarRuta`/`useRutaOptima`, `rutaService`, tipos en `types/rutaTypes.ts`, ruta `/rutas` en el router.
- **Ronda 1 — RECHAZADO** (`progress/review_rutas_gestion.md`): 5 tests stub (`R7,R8,R16,R22,R23` con `expect(true).toBe(true)`), violación de arquitectura (`rutaService.ts` instanciaba su propio `PrismaClient` con 11 accesos directos a Prisma en vez de pasar por `rutaRepository`), `R22/R23` código inalcanzable (`verificarCierreRuta` solo se invoca desde `envioService.cancelar`, que exige `estado=PENDIENTE`, imposible para envíos ya asignados a ruta), `GestionRutas.tsx`/`RutaDetalle.tsx` con arreglos hardcodeados vacíos (pantalla inerte), enum `EstadoRuta` con 5 valores redundantes (`EN_CURSO`/`EN_PROGRESO`).
- **Ronda 2 — correcciones (A–E) y APROBADO**: refactor completo de `rutaService.ts` (cero accesos directos a Prisma, todo vía `rutaRepository` con nuevos métodos `findEnviosByIds/findVehiculoById/findRepartidorById/findRepartidorByUsuarioId/crearConTransaccion/reasignarConTransaccion/cerrarRutaConTransaccion`); 5 stubs reemplazados por tests reales (`jest.isolateModules` + mocks de repositorio), verificados como no-stub mediante mutation testing (reviewer mutó `rutaService.ts` 3 veces, confirmó que los tests fallan, y revirtió); `enviosDisponibles` conectado al hook real `useEnvios({estado:'PENDIENTE'})`; selectores de vehículo/repartidor dejados honestamente vacíos con notas "NOTA DE ALCANCE" documentando dependencia de `vehiculos_gestion` (id 8, aún `pending`); R22/R23 aceptado como limitación documentada (resolución opción a) ya que `entregas_confirmacion` (id 9) sigue `pending`.
- Bugfix de infraestructura incluido en el mismo commit: `tracking.test.ts` no cerraba el servidor HTTP/Socket.IO (`server`/`io`) tras sus tests, dejando vivo el listener TCP y los timers de heartbeat — causaba que Jest nunca saliera (`Jest did not exit...`). Fix: `afterAll((done) => io.close(() => server.close(() => done())))`. Detalle en `progress/impl_fix_tracking_test_hang.md`.
- Tests: 118/118 backend (22/22 en `rutas.test.ts`) + 59/59 frontend (7/7 en `rutas.test.tsx`) ✅. Lint ✅ | Build ✅.
- Commit: `31a7279 feat(rutas_gestion): Gestión de rutas`.

**Próxima feature:** `vehiculos_gestion` (id: 8, sprint 3, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-06/07 — vehiculos_gestion ✅ DONE

**Feature:** `vehiculos_gestion` (id: 8, sprint 3, sdd: true)
**Resultado:** APROBADO por reviewer en segunda pasada (post-correcciones).

**Resumen:**
- `spec_author` redactó `specs/vehiculos_gestion/{requirements,design,tasks}.md` (R1–R20 / T1–T17). Reutiliza el modelo `Vehiculo`/enum `EstadoVehiculo` ya existentes en el schema (creados durante `rutas_gestion`) — **sin migración nueva**. Diseño aprobado por el humano sin cambios.
- Backend: `POST/GET/PATCH /api/v1/vehiculos` (placa única → 409, filtro `?estado`, actualización de estado con regla R14 de transición bloqueada `EN_RUTA → MANTENIMIENTO/FUERA_SERVICIO` → 422), `vehiculoRepository`/`vehiculoService`/`vehiculoController`/`vehiculoValidator` (Zod) respetando estrictamente `controller→service→repository→Prisma`. Endpoint `GET /api/v1/vehiculos?estado=DISPONIBLE` queda como contrato consumible por `rutas_gestion` (selectores hoy vacíos).
- Frontend: `GestionVehiculos.tsx`, `VehiculoForm.tsx`, `VehiculoTable.tsx`, `ActualizarEstadoVehiculo.tsx`, hooks `useVehiculos`/`useCrearVehiculo`/`useActualizarEstadoVehiculo`, ruta `/vehiculos` protegida con `ProtectedRoute allowedRoles={['OPERADOR']}`.
- **Ronda 1 — RECHAZADO** (`progress/review_vehiculos_gestion.md`): único hallazgo bloqueante — `vehiculos.test.ts` mockeaba `vehiculoService` por completo (`jest.mock`), dejando R1, R2, R6, R7, R11, R13 y sobre todo **R14** sin cobertura real. El reviewer lo demostró invirtiendo la condición de R14 en el servicio: las 15 pruebas seguían en verde.
- **Ronda 2 — corrección y APROBADO**: el implementer agregó 11 tests reales (15→26) en un bloque que carga la implementación REAL de `vehiculoService` vía `jest.isolateModules`+`jest.unmock` con solo `vehiculoRepository` mockeado (replicando el patrón aprobado de `rutas.test.ts`), cubriendo R1, R2, R6, R7, R11, R13 y R14 (5 casos). El reviewer repitió la mutación de R14 desde cero de forma independiente: 5/26 tests fallan exactamente como predicho, reveritó sin residuos (diff byte-a-byte). Observación menor de tipos `Date` vs `string` se dejó intencionalmente igual a `rutaTypes.ts` (precedente aprobado).
- Tests: 144/144 backend (26/26 en `vehiculos.test.ts`, +11 desde ronda 1) + 66/66 frontend (7/7 en `vehiculos.test.tsx`) ✅. Lint ✅ | Build ✅ | `./init.sh` 30/30 ✅.
- Commit: `4b015f7 feat(vehiculos_gestion): Gestión de vehículos`.

**Próxima feature:** `entregas_confirmacion` (id: 9, sprint 4, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-07/08 — incidencias_gestion ✅ DONE

**Feature:** `incidencias_gestion` (id: 10, sprint 4, sdd: true)
**Resultado:** APROBADO por reviewer. Commit `3f4905e`.

**Resumen:**
- `spec_author` redactó `specs/incidencias_gestion/{requirements,design,tasks.md}`
  (R1–R28 / T1–T23). El modelo `Incidencia`, los enums `TipoIncidencia`/
  `EstadoIncidencia` y `Envio.fechaReprogramacion` ya existían en el schema —
  **sin migración nueva**. El humano aprobó el spec incluyendo la solución
  propuesta para la inconsistencia wireframe-vs-rol del botón "+ Nueva
  Incidencia" (deshabilitado + tooltip para OPERADOR, ya que el endpoint de
  creación exige rol REPARTIDOR).
- Backend: `POST/GET /api/v1/incidencias`, `PATCH /api/v1/incidencias/:id`
  (transición de estado `ABIERTA → EN_PROCESO → RESUELTA`, terminal, con 409
  `INVALID_STATE_TRANSITION`) y `POST /api/v1/envios/:id/reprogramar` (valida
  fecha futura, bloquea envíos `ENTREGADO`/`CANCELADO`, registra `EventoEnvio`
  en una sola `prisma.$transaction`). Capas repository/service/controller
  respetadas.
- Frontend: `GestionIncidencias.tsx` (tabla+filtros+paginación+modal de cambio
  de estado), `ReportarIncidencia.tsx` (rol REPARTIDOR), `ReprogramarEntregaModal.tsx`
  (rol OPERADOR, cableado en `DetalleEnvio.tsx`, oculto para envíos
  `ENTREGADO`/`CANCELADO`), 4 hooks TanStack Query, ruta `/incidencias`
  protegida con `ProtectedRoute allowedRoles={['OPERADOR']}`.
- **Incidente operativo notable — bloqueo de permisos en subagentes background**:
  el primer `implementer` completó T1–T18 pero su autorreporte fue
  contradictorio (afirmaba "bloqueo total de Edit/Write" y a la vez haber
  escrito 17 archivos — verifiqué que lo segundo era cierto). Tres relanzamientos
  posteriores en *background* fracasaron: uno se autodeclaró "leader" por
  confusión de rol, otro interpretó el prompt de relanzamiento como intento de
  prompt-injection y se negó a proceder, y un tercero sí adoptó el rol
  correctamente pero confirmó un bloqueo **real y reproducible**: `Edit`/`Write`/
  `Bash`-de-escritura devuelven *"Permission to use [Tool] has been denied"* de
  forma instantánea y automática para subagentes lanzados en background — ningún
  prompt de aprobación llega al humano, ni siquiera sobre archivos fuera de
  `backend/`/`frontend/` (p.ej. `progress/current.md`). **Conclusión para
  futuras sesiones: los subagentes que necesiten escribir código deben lanzarse
  en *foreground* (síncrono), nunca en background** — ahí los permisos de
  escritura funcionan con normalidad. Relanzado en foreground, el implementer
  completó T19–T23 sin incidentes (botón+modal de reprogramación cableado, ruta
  `/incidencias` registrada, 3 archivos de test frontend nuevos con 15 tests
  R25–R28/R1/R19–R21, informe en `progress/impl_incidencias_gestion.md`).
- `reviewer` validó trazabilidad completa 28/28 (R1–R28) con tests reales (no
  placeholders) — **APROBADO sin correcciones**. Verificó arquitectura
  (sin lógica de negocio en controllers/repositories, sin `fetch` directo, sin
  `any`/`console.log`), seguridad (`authMiddleware`+`roleMiddleware` en los 4
  endpoints, validación Zod, transacciones atómicas) y convenciones
  (`/api/v1/`, formato `{data,message,status}`, paginación, wireframe).
- Tests: backend 212/212 ✅ | frontend 88/88 ✅ | lint ✅ ambos | build ✅ ambos |
  `./init.sh` 30/30 ✅ — todo verificado de forma independiente por el leader y
  por el reviewer (no solo confiando en el autorreporte del implementer).

**Lección para próximas sesiones:** lanzar siempre los subagentes `implementer`
(y cualquier otro que necesite `Edit`/`Write`/`Bash`-de-escritura) **en
foreground**, nunca con `run_in_background: true` — los permisos de escritura
se deniegan instantáneamente y sin posibilidad de aprobación interactiva para
agentes en background, sin importar la ruta del archivo.

**Próxima feature:** `notificaciones` (id: 11, sprint 4, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-08 — notificaciones ✅ DONE

**Feature:** `notificaciones` (id: 11, sprint 4, sdd: true)
**Resultado:** APROBADO por reviewer en segunda pasada (post-corrección). Commit `4888b01`.

**Resumen:**
- `spec_author` redactó `specs/notificaciones/{requirements,design,tasks.md}` (R1–R19 / T1–T20 inicial). Detectó 6 decisiones técnicas no triviales para aprobación humana. El humano aprobó con 3 cambios: (1) migración Prisma para agregar enum `TipoNotificacion` + columna `tipo` al modelo `Notificacion` (en lugar de la heurística de derivación por texto propuesta como respaldo); (2) ampliar el alcance con endpoint `PATCH /:id/leer` para marcar notificaciones como leídas (nuevos R20–R23 y tasks); (3) habilitar la pantalla `/notificaciones` para los 3 roles (CLIENTE, OPERADOR, REPARTIDOR). Tras la revisión del spec: R1–R23, T1–T21.
- **Migración Prisma**: `add_tipo_notificacion` — agrega enum `TipoNotificacion` (5 valores: ENVIO_CREADO, CAMBIO_ESTADO, ENTREGA_REALIZADA, RUTA_ASIGNADA, INCIDENCIA_REPORTADA) y columna `tipo` (no nula) a `Notificacion`.
- **Backend**: `GET /api/v1/notificaciones` (paginado, cualquier rol autenticado, filtra por `req.user.id`), `PATCH /api/v1/notificaciones/:id/leer` (marca `leida=true`, verifica pertenencia al usuario — 404 unificado si no existe o es de otro usuario). Middleware `io.use` de autenticación JWT de sockets (verifica `socket.handshake.auth.token`, auto-join server-side a sala privada `user:${userId}`). Función `notificacionService.notificar()` como punto único de orquestación (persistencia + emisión Socket.IO + correo). Integración en `envioService`, `rutaService`, `incidenciaService`, `entregaService` (migración de las llamadas directas a `entregaRepository.crearNotificacion` ya existentes al punto único). `sendNotificationEmail` añadida a `mailer.ts` con guard `NODE_ENV=test`.
- **Frontend**: `Notificaciones.tsx` (lista con ícono/color por `tipo`, paginación, estado vacío, botón "marcar como leída"), `useNotificaciones`/`useNotificacionesSocket`/`useMarcarNotificacionLeida`, `notificacionService`, `formatTiempoRelativo` (`Intl.RelativeTimeFormat` nativo, sin nueva dependencia), ruta `/notificaciones` para 3 roles, `socket.ts` actualizado con `auth` callback que envía `accessToken`.
- `docs/architecture.md` actualizado con `/notificaciones` disponible para los 3 roles.
- **Ronda 1 — RECHAZADO**: R5 tenía el bloque `describe` vacío de la prueba real — solo se ejecutaba la verificación de persistencia (R6) sin probar la emisión Socket.IO (`io.to(...).emit(...)`).
- **Ronda 2 — corrección y APROBADO**: implementer agregó test con `jest.isolateModules` + mock de `getIo()` con spies `toSpy`/`emitSpy`; el reviewer lo verificó con mutación del servicio (confirmó que falla si se omite el emit) y revirtió limpiamente.
- Tests: backend 238/238 ✅ | frontend 102/102 ✅ | lint ✅ ambos | build ✅ ambos | `./init.sh` 30/30 ✅.

**Próxima feature:** `layout_navegacion` (id: 13, sprint 5, sdd: true) → lanzar `spec_author`.

---

## Sesión 2026-06-08 — layout_navegacion ✅ DONE

**Feature:** `layout_navegacion` (id: 13, sprint 5, sdd: true)
**Resultado:** APROBADO por reviewer en primera pasada. Commit `7c58313`.

**Resumen:**
- `spec_author` redactó R1–R24 / T1–T16. Feature 100% frontend, sin endpoints nuevos.
- Decisiones confirmadas por el humano: (A) Layout Route de React Router v6 como estrategia de layout automático; (B) buscador global como placeholder visual; (C) `/usuarios` con PlaceholderPage; (D) badge con `useUnreadCount` en cliente sin endpoint dedicado; (E) refactorización de `VistaRepartidor` aprobada. Además: `/perfil` y `/notificaciones` dentro del layout de OPERADOR y REPARTIDOR; barra repartidor "Rutas" → PlaceholderPage.
- Componentes creados: `OperadorSidebar`, `OperadorTopbar`, `OperadorLayout`, `RepartidorBottomNav`, `RepartidorLayout`, `NotificationBell`, `ProfileMenu`, `PlaceholderPage`, `useUnreadCount`. Todos en `frontend/src/components/shared/` y `frontend/src/hooks/`.
- `frontend/src/router/index.tsx` reestructurado con grupos de Layout Route por rol (OPERADOR con `OperadorLayout`, REPARTIDOR con `RepartidorLayout`); `/perfil` y `/notificaciones` duplicadas en ambos grupos con layout.
- `VistaRepartidor.tsx`: eliminado header/nav inline obsoleto.
- Fix menor en `ProfileMenu.tsx`: `try/finally` sin `catch` propagaba unhandled rejection en logout con error de red; se añadió `catch` vacío para swallowing intencional (el `finally` garantiza `clearAuth + navigate` siempre).
- Tests: 124/124 frontend ✅ (22 nuevos: `OperadorSidebar.test.tsx`, `RepartidorBottomNav.test.tsx`, `NotificationBell.test.tsx`, `ProfileMenu.test.tsx`). Lint ✅ | Build ✅ | `./init.sh` 30/30 ✅.

**Próxima feature:** `dashboard_operador` (id: 14, sprint 5, sdd: true) → lanzar `spec_author`.

---