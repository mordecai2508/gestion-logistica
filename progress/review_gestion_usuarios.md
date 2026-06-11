# Review — gestion_usuarios — APROBADO

> Feature ID: 20 | Sprint 6 | Stories: HU58, HU59, HU60
> Reviewer: subagente `reviewer` (.claude/agents/reviewer.md)

---

## Trazabilidad R1–R31

| R | Test | Archivo | Estado |
|---|---|---|---|
| R1 | "R1 — debe devolver lista paginada de usuarios con id/nombre/correo/rol/telefono/activo/createdAt" | `backend/src/tests/usuarios.test.ts:79` | ✅ |
| R2 | "R2 — debe respetar parámetros page y limit y devolver meta correcta" | `backend/src/tests/usuarios.test.ts:100` | ✅ |
| R3 | "R3 — debe filtrar por ?rol=CLIENTE/OPERADOR/REPARTIDOR" | `backend/src/tests/usuarios.test.ts:118,133,148` | ✅ |
| R4 | "R4 — debe devolver 422 si ?rol tiene un valor no permitido" | `backend/src/tests/usuarios.test.ts:163` | ✅ |
| R5 | "R5 — debe devolver 401 sin token en GET /usuarios" | `backend/src/tests/usuarios.test.ts:172` | ✅ |
| R6 | "R6 — debe devolver 403 con rol CLIENTE / REPARTIDOR en GET /usuarios" | `backend/src/tests/usuarios.test.ts:180,190` | ✅ |
| R7 | "R7 — la respuesta de GET /usuarios no debe incluir el campo password" | `backend/src/tests/usuarios.test.ts:200` | ✅ |
| R8 | "R8 — debe devolver detalle completo del usuario por id" | `backend/src/tests/usuarios.test.ts:219` | ✅ |
| R9 | "R9 — debe devolver 404 para id inexistente en GET /usuarios/:id" | `backend/src/tests/usuarios.test.ts:239` | ✅ |
| R10 | "R10 — debe devolver 401 sin token en GET /usuarios/:id" | `backend/src/tests/usuarios.test.ts:253` | ✅ |
| R11 | "R11 — debe devolver 403 con rol incorrecto en GET /usuarios/:id" | `backend/src/tests/usuarios.test.ts:260` | ✅ |
| R12 | "R12 — la respuesta de GET /usuarios/:id no debe incluir el campo password" | `backend/src/tests/usuarios.test.ts:270` | ✅ |
| R13 | "R13 — debe activar/desactivar un usuario y devolver el usuario actualizado" | `backend/src/tests/usuarios.test.ts:287,304` | ✅ |
| R14 | "R14 — debe devolver 422 cuando el body no contiene activo como boolean / no contiene el campo activo" | `backend/src/tests/usuarios.test.ts:321,331` | ✅ |
| R15 | "R15 — debe devolver 404 para id inexistente en PATCH /usuarios/:id/estado" | `backend/src/tests/usuarios.test.ts:341` | ✅ |
| R16 | "R16 — debe devolver 409 CANNOT_DEACTIVATE_SELF... sin modificar activo" | `backend/src/tests/usuarios.test.ts:356` | ✅ |
| R17 | "R17 — debe devolver 401 sin token en PATCH /usuarios/:id/estado" | `backend/src/tests/usuarios.test.ts:376` | ✅ |
| R18 | "R18 — debe devolver 403 con rol incorrecto en PATCH /usuarios/:id/estado" | `backend/src/tests/usuarios.test.ts:385` | ✅ |
| R19 | "R19 R20 R21 — debe devolver 403 USER_INACTIVE..., sin emitir accessToken ni cookie refreshToken" | `backend/src/tests/usuarios.test.ts:424` | ✅ |
| R20 | mismo test + "R20 — debe seguir devolviendo 401 INVALID_CREDENTIALS si la contraseña es incorrecta para activo=false" | `backend/src/tests/usuarios.test.ts:424,446` | ✅ |
| R21 | mismo test (no emite tokens, evaluado tras bcrypt.compare) | `backend/src/tests/usuarios.test.ts:424` | ✅ |
| R22 | "muestra el heading principal con el título correcto" | `frontend/src/features/usuarios/usuarios.test.tsx:93` | ✅ |
| R23 | "renderiza los encabezados de columna requeridos" / "renderiza los datos de los usuarios en la tabla" | `frontend/src/features/usuarios/usuarios.test.tsx:107,116` | ✅ |
| R24 | "llama a useUsuarios con rol=CLIENTE..." / "...sin rol al seleccionar 'Todos'" | `frontend/src/features/usuarios/usuarios.test.tsx:131,145` | ✅ |
| R25 | "abre el panel de detalle con la información del usuario seleccionado" | `frontend/src/features/usuarios/usuarios.test.tsx:167` | ✅ |
| R26 | "muestra 'Desactivar' para un usuario activo y 'Activar' para uno inactivo" | `frontend/src/features/usuarios/usuarios.test.tsx:188` | ✅ |
| R27 | "llama a actualizarEstado.mutateAsync con el valor invertido y muestra toast de éxito" | `frontend/src/features/usuarios/usuarios.test.tsx:201` | ✅ |
| R28 | "muestra el mensaje de error devuelto por la API sin modificar la tabla" | `frontend/src/features/usuarios/usuarios.test.tsx:231` | ✅ |
| R29 | "muestra el texto de carga cuando isLoading es true y deshabilita el filtro" | `frontend/src/features/usuarios/usuarios.test.tsx:256` | ✅ |
| R30 | "muestra el mensaje de error y el botón 'Reintentar' cuando isError es true" | `frontend/src/features/usuarios/usuarios.test.tsx:278` | ✅ |
| R31 | "muestra los botones Anterior/Siguiente..." / "no muestra controles de paginación cuando solo hay una página" | `frontend/src/features/usuarios/usuarios.test.tsx:298,315` | ✅ |

**31/31 requisitos con test real (no stubs), cada uno verificando el comportamiento descrito.**

---

## Arquitectura: ✅

- Cadena `routes → middlewares → controllers → services → repositories` respetada en `backend/src/routes/usuarios.ts`, `controllers/usuarioController.ts`, `services/usuarioService.ts`, `repositories/usuarioRepository.ts`.
- Controladores (`usuarioController.ts`) sin lógica de negocio: solo `parse` con Zod, llaman al servicio y responden con `{ data, message, status }`.
- Repositorio (`usuarioRepository.ts`) sin validaciones; `select` explícito (`usuarioSelect`) que excluye `password`, `refreshTokens`, `passwordResetTokens` en `findAll`, `findById`, `actualizarEstado`. Tipo `UsuarioSeleccionado` derivado vía `Prisma.UsuarioGetPayload<{ select: typeof usuarioSelect }>`.
- Validación con Zod en `usuarioValidator.ts` (`listarUsuariosSchema`, `usuarioIdParamSchema`, `actualizarEstadoUsuarioSchema` con `.strict()`).
- `actualizarEstadoUsuarioSchema` rechaza correctamente strings/objetos vacíos (R14, validado por test).
- Frontend: sin `fetch` directo en componentes — todo pasa por `usuarioService.ts` (axios `api`). Estado de servidor solo vía TanStack Query (`useUsuarios`, `useUsuario`, `useActualizarEstadoUsuario`); no hay duplicación en Zustand. Componentes usan Shadcn/UI existentes (`Button`, `Label`, `Select`, `Toast`).
- `usuarioIdParamSchema` está exportado pero no se usa explícitamente en el controlador — mismo patrón preexistente que `repartidorIdParamSchema` (definido y no referenciado), no es una desviación introducida por esta feature; lint no lo marca.

## Seguridad: ✅

- `authMiddleware` + `roleMiddleware('OPERADOR')` presentes en los 3 endpoints de `backend/src/routes/usuarios.ts` (`GET /`, `GET /:id`, `PATCH /:id/estado`).
- Regla `CANNOT_DEACTIVATE_SELF` (409) evaluada en `usuarioService.actualizarEstado` comparando `id === operadorId` (proveniente de `req.user!.id`, JWT) **antes** de tocar la base de datos (`backend/src/services/usuarioService.ts:50-56`, antes del `findById`).
- `authService.login` (`backend/src/services/authService.ts:40-51`): orden verificado correcto — `bcrypt.compare` exitoso (líneas 40-43) → chequeo `usuario.activo` (líneas 45-51, lanza `USER_INACTIVE` 403) → recién después se firma `accessToken`/se crea `refreshToken` (líneas 58+). `authRepository.findByCorreo` usa `findUnique` sin `select` restringido, por lo que `activo` llega automáticamente sin cambios necesarios.
- `select` explícito en repositorio nunca expone `password`/`refreshTokens`/`passwordResetTokens` (R7/R12 verificados por test).
- Sin `any` explícito ni `console.log` de debug en los archivos nuevos/modificados de la feature (grep limpio).

## Convenios: ✅

- Rutas bajo `/api/v1/usuarios` (registrado en `backend/src/index.ts:29,65`, junto al resto de routers `/api/v1/...`).
- Respuestas `{ data, message, status }` (200) y `{ error, message, statusCode }` (errores vía `AppError`/`createAuthError` + `errorHandler`).
- Ruta frontend `/usuarios` reemplaza el placeholder dentro de `OperadorLayout` + `ProtectedRoute allowedRoles={['OPERADOR']}` (`frontend/src/router/index.tsx:64`); import de `PlaceholderPage` se conserva (usado en `/repartidor/*`).
- Migración Prisma `backend/prisma/migrations/20260611162952_add_usuario_activo/migration.sql` sigue convención de carpetas existentes; SQL: `ALTER TABLE "Usuario" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;` (sin backfill manual necesario).
- Tests preexistentes modificados (`auth.test.ts`, `userProfile.test.ts`, `forgotPassword.test.ts`, `entregaConfirmar.test.ts`, `entregaFallo.test.ts`, `envios.test.ts`, `rutas.test.ts`, `tracking.test.ts`) — confirmado vía `git diff`: cambio mecánico, único, agregando `activo: true` a mocks/helpers/objetos `usuario` inline, sin alterar lógica ni aserciones.

## Verificación: ✅

- `cd backend && npm run test`: **22/22 suites, 328/328 tests passing**.
- `cd backend && npm run lint`: sin errores.
- `cd backend && npm run build` (`tsc`): sin errores.
- `cd frontend && npm run test -- --run`: **33/33 archivos, 194/194 tests passing**.
- `cd frontend && npm run lint`: sin errores.
- `cd frontend && npx tsc --noEmit -p tsconfig.app.json`: únicos errores son los **2 preexistentes** en `frontend/src/features/cliente/__tests__/MisEnvios.test.tsx` (líneas 105 y 120, `TS2322`), confirmados sin modificar (`git diff HEAD` vacío para ese archivo) e introducidos en commit `daa067b feat(mis_envios_cliente)`, anterior a esta feature y ya documentados como no bloqueantes en `progress/review_gestion_repartidores.md`. Ningún archivo nuevo/modificado de `gestion_usuarios` presenta errores de tipos.
- `./init.sh` (raíz): **30/30 checks en verde**, incluyendo lint backend, tests backend (22/22), lint frontend, tests frontend (33/33 — 194/194), validación de `feature_list.json`/`specs/`.

---

## Tasks

`specs/gestion_usuarios/tasks.md` — T1 a T19 todas marcadas `[x]`, verificadas contra el código entregado (schema/migración, tipos, validators, repository, service, controller, router, registro en `index.ts`, cambio en `authService.login`, tests backend; tipos/servicio/hooks/componentes/test frontend; cambio de ruta).

---

**Decisión: APROBADO. El leader debe hacer el commit y luego marcar la feature como done.**
