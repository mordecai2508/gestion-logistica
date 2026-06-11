# Implementación — gestion_usuarios (id 20, sprint 6)

> Generado por el subagente `implementer`. Tasks ejecutadas: T1-T19 (`specs/gestion_usuarios/tasks.md`).

---

## 1. Archivos creados

### Backend
- `backend/src/types/usuarioTypes.ts` — `UsuarioDto`, `ListaUsuariosResponse`, `ListarUsuariosInput`, `ActualizarEstadoUsuarioDto`.
- `backend/src/validators/usuarioValidator.ts` — `listarUsuariosSchema`, `usuarioIdParamSchema`, `actualizarEstadoUsuarioSchema`.
- `backend/src/repositories/usuarioRepository.ts` — `findAll`, `findById`, `actualizarEstado` (select explícito sin `password`/relaciones).
- `backend/src/services/usuarioService.ts` — `listar`, `obtenerPorId`, `actualizarEstado` (con `CANNOT_DEACTIVATE_SELF`).
- `backend/src/controllers/usuarioController.ts` — `listarUsuarios`, `obtenerUsuario`, `actualizarEstadoUsuario`.
- `backend/src/routes/usuarios.ts` — `usuariosRouter` (GET `/`, GET `/:id`, PATCH `/:id/estado`).
- `backend/src/tests/usuarios.test.ts` — 25 tests (R1-R21).
- `backend/prisma/migrations/20260611162952_add_usuario_activo/migration.sql` — `ALTER TABLE "Usuario" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;`

### Frontend
- `frontend/src/types/usuarioTypes.ts` — `Rol`, `UsuarioDto`, `UsuarioMeta`, `ListaUsuariosDto`, `ListarUsuariosFiltros`, `ActualizarEstadoUsuarioInput`.
- `frontend/src/services/usuarioService.ts` — `listar`, `obtenerPorId`, `actualizarEstado`.
- `frontend/src/hooks/useUsuarios.ts` — `useUsuarios`, `useUsuario`, `useActualizarEstadoUsuario`.
- `frontend/src/features/usuarios/UsuarioTable.tsx` — tabla con badges de estado y acciones Activar/Desactivar/Ver.
- `frontend/src/features/usuarios/UsuarioDetalle.tsx` — panel de detalle de solo lectura.
- `frontend/src/features/usuarios/GestionUsuarios.tsx` — página principal con filtro, paginación, loading/error/toast.
- `frontend/src/features/usuarios/usuarios.test.tsx` — 13 tests (R22-R31).

## 2. Archivos modificados

### Backend
- `backend/prisma/schema.prisma` — agregado `activo Boolean @default(true)` al modelo `Usuario` (después de `rol`).
- `backend/src/index.ts` — registrado `usuariosRouter` en `/api/v1/usuarios`.
- `backend/src/services/authService.ts` — `login()` ahora valida `usuario.activo` después de `bcrypt.compare` exitoso; lanza `USER_INACTIVE` (403) si `activo === false`.
- `backend/src/tests/auth.test.ts` — `makeUser` ahora incluye `activo: true` por defecto (override posible) + 3 tests nuevos para R19-R21 (USER_INACTIVE, INVALID_CREDENTIALS con activo=false, no-leak de `password`).
- `backend/src/tests/userProfile.test.ts` — `makeUsuario` incluye `activo: true` (requerido por el tipo `Usuario` tras T1).
- `backend/src/tests/forgotPassword.test.ts` — `makeUsuario` incluye `activo: true` (idem).
- `backend/src/tests/entregaConfirmar.test.ts` — objeto `usuario` inline (cliente) incluye `activo: true` (idem).
- `backend/src/tests/entregaFallo.test.ts` — objeto `usuario` inline (cliente) incluye `activo: true` (idem).
- `backend/src/tests/envios.test.ts` — `makeEnvioConCliente` incluye `activo: true` en `usuario` (idem).
- `backend/src/tests/rutas.test.ts` — `makeRepartidor` incluye `activo: true` en `usuario` (idem).
- `backend/src/tests/tracking.test.ts` — `makeEnvioConDetalle` incluye `activo: true` en `usuario` (idem).

### Frontend
- `frontend/src/router/index.tsx` — reemplazado `<PlaceholderPage title="Usuarios" />` por `<GestionUsuarios />` en la ruta `/usuarios`; import de `PlaceholderPage` se mantiene (usado en `/repartidor/*`).

## 3. Migración Prisma

```
20260611162952_add_usuario_activo
```
Contenido: `ALTER TABLE "Usuario" ADD COLUMN "activo" BOOLEAN NOT NULL DEFAULT true;`
Aplicada exitosamente contra `logistica_db`. Prisma Client regenerado (v5.22.0) sin errores.

## 4. Nota sobre fixes adicionales (fuera de la lista original pero requeridos)

Al agregar `activo: Boolean` (requerido) al modelo `Usuario` en T1, el tipo `Prisma.UsuarioGetPayload<...>` y los objetos `Usuario` completos pasaron a requerir el campo `activo`. Esto rompió la **compilación TypeScript** (no las aserciones) de 7 suites de tests preexistentes que construían objetos `usuario`/`Usuario` mock sin ese campo:

- `auth.test.ts` (helper `makeUser`)
- `userProfile.test.ts` (helper `makeUsuario`)
- `forgotPassword.test.ts` (helper `makeUsuario`)
- `entregaConfirmar.test.ts`, `entregaFallo.test.ts`, `envios.test.ts`, `rutas.test.ts`, `tracking.test.ts` (objetos `usuario` inline)

Se agregó `activo: true` a cada uno de estos mocks/helpers — es una consecuencia mecánica directa del cambio de esquema de T1, sin alterar la lógica de los tests existentes. Tras el fix, `npx tsc --noEmit` no reporta errores y las 22 suites de backend compilan y pasan.

---

## 5. Trazabilidad R1-R31 → Test → Archivo:línea

| Requisito | Test | Archivo:línea |
|---|---|---|
| R1 | "R1 — debe devolver lista paginada de usuarios con id/nombre/correo/rol/telefono/activo/createdAt" | `backend/src/tests/usuarios.test.ts:79` |
| R2 | "R2 — debe respetar parámetros page y limit y devolver meta correcta" | `backend/src/tests/usuarios.test.ts:100` |
| R3 | "R3 — debe filtrar por ?rol=CLIENTE" / "?rol=OPERADOR" / "?rol=REPARTIDOR" | `backend/src/tests/usuarios.test.ts:118,133,148` |
| R4 | "R4 — debe devolver 422 si ?rol tiene un valor no permitido" | `backend/src/tests/usuarios.test.ts:163` |
| R5 | "R5 — debe devolver 401 sin token en GET /usuarios" | `backend/src/tests/usuarios.test.ts:172` |
| R6 | "R6 — debe devolver 403 con rol CLIENTE / REPARTIDOR en GET /usuarios" | `backend/src/tests/usuarios.test.ts:180,190` |
| R7 | "R7 — la respuesta de GET /usuarios no debe incluir el campo password" | `backend/src/tests/usuarios.test.ts:200` |
| R8 | "R8 — debe devolver detalle completo del usuario por id" | `backend/src/tests/usuarios.test.ts:219` |
| R9 | "R9 — debe devolver 404 para id inexistente en GET /usuarios/:id" | `backend/src/tests/usuarios.test.ts:239` |
| R10 | "R10 — debe devolver 401 sin token en GET /usuarios/:id" | `backend/src/tests/usuarios.test.ts:253` |
| R11 | "R11 — debe devolver 403 con rol incorrecto en GET /usuarios/:id" | `backend/src/tests/usuarios.test.ts:260` |
| R12 | "R12 — la respuesta de GET /usuarios/:id no debe incluir el campo password" | `backend/src/tests/usuarios.test.ts:270` |
| R13 | "R13 — debe activar un usuario (activo: true)..." / "...desactivar un usuario (activo: false)..." | `backend/src/tests/usuarios.test.ts:287,304` |
| R14 | "R14 — debe devolver 422 cuando el body no contiene activo como boolean" / "...no contiene el campo activo" | `backend/src/tests/usuarios.test.ts:321,331` |
| R15 | "R15 — debe devolver 404 para id inexistente en PATCH /usuarios/:id/estado" | `backend/src/tests/usuarios.test.ts:341` |
| R16 | "R16 — debe devolver 409 CANNOT_DEACTIVATE_SELF cuando el operador intenta cambiar su propio estado, sin modificar activo" | `backend/src/tests/usuarios.test.ts:356` |
| R17 | "R17 — debe devolver 401 sin token en PATCH /usuarios/:id/estado" | `backend/src/tests/usuarios.test.ts:376` |
| R18 | "R18 — debe devolver 403 con rol incorrecto en PATCH /usuarios/:id/estado" | `backend/src/tests/usuarios.test.ts:385` |
| R19 | "R19 R20 R21 — debe devolver 403 USER_INACTIVE con credenciales correctas y activo=false, sin emitir accessToken ni cookie refreshToken" | `backend/src/tests/usuarios.test.ts:424` |
| R20 | mismo test anterior + "R20 — debe seguir devolviendo 401 INVALID_CREDENTIALS si la contraseña es incorrecta para un usuario con activo=false" | `backend/src/tests/usuarios.test.ts:424,446` |
| R21 | mismo test (no emite tokens) + "R21 - no debe incluir el campo password en la respuesta" (auth.test.ts, regresión) | `backend/src/tests/usuarios.test.ts:424`, `backend/src/tests/auth.test.ts:475` |
| R22 | "muestra el heading principal con el título correcto" (describe "R22 — renderiza la página con título 'Gestión de Usuarios'") | `frontend/src/features/usuarios/usuarios.test.tsx:93-99` |
| R23 | "renderiza los encabezados de columna requeridos" / "renderiza los datos de los usuarios en la tabla" | `frontend/src/features/usuarios/usuarios.test.tsx:107,116` |
| R24 | "llama a useUsuarios con rol=CLIENTE al seleccionar 'CLIENTE'" / "llama a useUsuarios sin rol al seleccionar 'Todos'" | `frontend/src/features/usuarios/usuarios.test.tsx:131,145` |
| R25 | "abre el panel de detalle con la información del usuario seleccionado" | `frontend/src/features/usuarios/usuarios.test.tsx:167` |
| R26 | "muestra 'Desactivar' para un usuario activo y 'Activar' para uno inactivo" | `frontend/src/features/usuarios/usuarios.test.tsx:188` |
| R27 | "llama a actualizarEstado.mutateAsync con el valor invertido y muestra toast de éxito" | `frontend/src/features/usuarios/usuarios.test.tsx:201` |
| R28 | "muestra el mensaje de error devuelto por la API sin modificar la tabla" | `frontend/src/features/usuarios/usuarios.test.tsx:231` |
| R29 | "muestra el texto de carga cuando isLoading es true y deshabilita el filtro" | `frontend/src/features/usuarios/usuarios.test.tsx:256` |
| R30 | "muestra el mensaje de error y el botón 'Reintentar' cuando isError es true" | `frontend/src/features/usuarios/usuarios.test.tsx:278` |
| R31 | "muestra los botones Anterior/Siguiente cuando hay más de una página" / "no muestra controles de paginación cuando solo hay una página" | `frontend/src/features/usuarios/usuarios.test.tsx:298,315` |

---

## 6. Resultados de verificación

### Backend
- `npx tsc --noEmit -p tsconfig.json`: sin errores.
- `npm run test`: **22/22 suites passing, 328/328 tests passing**.
- `npm run lint`: sin errores.
- `npm run build` (`tsc`): sin errores.

### Frontend
- `npm run test`: **33/33 archivos de test passing, 194/194 tests passing**.
- `npm run lint`: sin errores.
- `npm run build` (`tsc -b && vite build`): falla con un error **preexistente y no relacionado**:
  ```
  src/features/cliente/__tests__/MisEnvios.test.tsx(105,32): error TS2322: Type '"ENTREGADO"' is not assignable to type '"PENDIENTE"'.
  src/features/cliente/__tests__/MisEnvios.test.tsx(120,32): error TS2322: Type '"CANCELADO"' is not assignable to type '"PENDIENTE"'.
  ```
  Confirmado vía `git diff HEAD --stat -- frontend/src/features/cliente/__tests__/MisEnvios.test.tsx` (sin cambios — archivo no tocado por esta feature) y `git log` (introducido en commit `daa067b feat(mis_envios_cliente)`, anterior a `gestion_usuarios`). Ya documentado como preexistente en `progress/impl_gestion_repartidores.md` (línea 108). Ningún archivo nuevo/modificado de `gestion_usuarios` presenta errores de tipos.

### init.sh (raíz)
- **30/30 checks en verde**, incluyendo lint backend, tests backend (22/22), lint frontend, tests frontend (33/33 — 194/194 tests). `init.sh` no ejecuta `vite build`, por lo que el error preexistente de `MisEnvios.test.tsx` no afecta este resultado.

---

## 7. Estado de tasks

T1-T19 marcadas `[x]` en `specs/gestion_usuarios/tasks.md`.
