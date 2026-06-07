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