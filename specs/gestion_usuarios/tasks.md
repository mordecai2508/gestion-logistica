# Tasks — gestion_usuarios

> Feature ID: 20 | Sprint 6
> El implementer sigue estas tasks en orden. Marcar cada una `[x]` al completarla.

---

## Backend

- [x] T1. Modificar `backend/prisma/schema.prisma`: agregar `activo Boolean @default(true)` al modelo `Usuario` (líneas 63-78), después del campo `rol`. Ejecutar `npx prisma migrate dev --name add_usuario_activo` desde `backend/` para generar la migración (ver `design.md` sección 2). Verificar que el cliente Prisma se regenera sin errores.

- [x] T2. Crear `backend/src/types/usuarioTypes.ts` con las interfaces `UsuarioDto`, `ListaUsuariosResponse`, `ListarUsuariosInput` y `ActualizarEstadoUsuarioDto` tal como se define en `design.md` sección 3. NO exponer el campo `password`. Importar `Rol` desde `@prisma/client`.

- [x] T3. Crear `backend/src/validators/usuarioValidator.ts` con tres schemas Zod:
  - `listarUsuariosSchema`: valida `page` (entero positivo, default 1), `limit` (entero 1–100, default 20), `rol` (enum `['CLIENTE', 'OPERADOR', 'REPARTIDOR']`, opcional) — sigue el mismo patrón que `listarRepartidoresSchema`.
  - `usuarioIdParamSchema`: valida que `id` sea string no vacío.
  - `actualizarEstadoUsuarioSchema`: objeto `{ activo: z.boolean() }` (campo requerido, sin opcionales, `strict` para rechazar campos extra).

- [x] T4. Crear `backend/src/repositories/usuarioRepository.ts` con los métodos:
  - `findAll(filters: { rol?: Rol }, skip: number, take: number): Promise<{ usuarios: UsuarioSeleccionado[]; total: number }>` — usa `prisma.usuario.findMany` con `select: { id, nombre, correo, rol, telefono, activo, createdAt }` (sin `password` ni relaciones), aplica filtro `where.rol` si está presente, `orderBy: { createdAt: 'desc' }`.
  - `findById(id: string): Promise<UsuarioSeleccionado | null>` — `prisma.usuario.findUnique({ where: { id }, select: {...mismo select...} })`.
  - `actualizarEstado(id: string, activo: boolean): Promise<UsuarioSeleccionado>` — `prisma.usuario.update({ where: { id }, data: { activo }, select: {...mismo select...} })`.
  - Exportar el tipo `UsuarioSeleccionado` derivado con `Prisma.UsuarioGetPayload<{ select: {...} }>` que coincida exactamente con `UsuarioDto` (sin `password`).

- [x] T5. Crear `backend/src/services/usuarioService.ts` con los métodos:
  - `listar(query: ListarUsuariosInput): Promise<ListaUsuariosResponse>` — calcula `skip`, llama al repository, construye `meta` (mismo patrón que `repartidorService.listar`).
  - `obtenerPorId(id: string): Promise<UsuarioDto>` — llama al repository; si devuelve `null` lanza `AppError('NOT_FOUND', 'Usuario no encontrado', 404)`.
  - `actualizarEstado(id: string, dto: ActualizarEstadoUsuarioDto, operadorId: string): Promise<UsuarioDto>` — sigue el orden descrito en `design.md` sección 4: (1) si `id === operadorId` lanza `AppError('CANNOT_DEACTIVATE_SELF', 'No puedes desactivar tu propia cuenta', 409)`; (2) verifica existencia con `findById` (404 si `null`); (3) llama a `usuarioRepository.actualizarEstado(id, dto.activo)`.
  - Mapear el resultado del repositorio a `UsuarioDto` (convertir `createdAt` a ISO string si Prisma devuelve `Date`).

- [x] T6. Crear `backend/src/controllers/usuarioController.ts` con las funciones:
  - `listarUsuarios(req, res, next)`: parsea `req.query` con `listarUsuariosSchema`, llama a `usuarioService.listar`, responde `{ data: resultado.data, meta: resultado.meta, message: 'Usuarios obtenidos exitosamente', status: 200 }`.
  - `obtenerUsuario(req, res, next)`: extrae `req.params.id`, llama a `usuarioService.obtenerPorId`, responde `{ data, message: 'Usuario obtenido', status: 200 }`.
  - `actualizarEstadoUsuario(req, res, next)`: parsea `req.body` con `actualizarEstadoUsuarioSchema`, extrae `req.params.id` y `req.user!.id`, llama a `usuarioService.actualizarEstado(id, dto, operadorId)`, responde `{ data, message: 'Estado del usuario actualizado', status: 200 }`.

- [x] T7. Crear `backend/src/routes/usuarios.ts` con:
  - `GET /` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `listarUsuarios`
  - `GET /:id` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `obtenerUsuario`
  - `PATCH /:id/estado` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `actualizarEstadoUsuario`
  - Exportar como `usuariosRouter`. (Nota: distinto del router existente `routes/users.ts`, montado en `/api/v1/users/me` para el perfil propio — no modificar ese archivo.)

- [x] T8. Registrar el nuevo router en `backend/src/index.ts` con `app.use('/api/v1/usuarios', usuariosRouter)`, junto al resto de `app.use('/api/v1/...')` (cerca de `repartidoresRouter`).

- [x] T9. Modificar `backend/src/services/authService.ts`, función `login` (línea ~34): inmediatamente después del `bcrypt.compare` exitoso (línea ~43) y antes de la generación de `accessToken`, agregar:
  ```typescript
  if (!usuario.activo) {
    throw createAuthError('USER_INACTIVE', 'La cuenta está desactivada. Contacta al administrador.', 403);
  }
  ```
  Verificar que `authRepository.findByCorreo` devuelve el campo `activo` (si usa `select` explícito, agregarlo; si usa `findUnique` sin `select`, ya lo incluye automáticamente tras T1).

- [x] T10. Escribir tests backend en `backend/src/tests/usuarios.test.ts` con Jest + Supertest cubriendo:
  - R1 — debe devolver lista paginada de usuarios con id/nombre/correo/rol/telefono/activo/createdAt
  - R2 — debe respetar parámetros `page` y `limit` y devolver `meta` correcta
  - R3 — debe filtrar por `?rol=CLIENTE`, `?rol=OPERADOR` y `?rol=REPARTIDOR`
  - R4 — debe devolver 422 si `?rol` tiene un valor no permitido
  - R5 — debe devolver 401 sin token en GET /usuarios
  - R6 — debe devolver 403 con rol CLIENTE en GET /usuarios; debe devolver 403 con rol REPARTIDOR en GET /usuarios
  - R7 — la respuesta de GET /usuarios no debe incluir el campo `password`
  - R8 — debe devolver detalle completo del usuario por id
  - R9 — debe devolver 404 para id inexistente en GET /usuarios/:id
  - R10 — debe devolver 401 sin token en GET /usuarios/:id
  - R11 — debe devolver 403 con rol incorrecto en GET /usuarios/:id
  - R12 — la respuesta de GET /usuarios/:id no debe incluir el campo `password`
  - R13 — debe activar un usuario (`activo: true`) y devolver el usuario actualizado
  - R13 — debe desactivar un usuario (`activo: false`) y devolver el usuario actualizado
  - R14 — debe devolver 422 cuando el body no contiene `activo` como boolean
  - R15 — debe devolver 404 para id inexistente en PATCH /usuarios/:id/estado
  - R16 — debe devolver 409 CANNOT_DEACTIVATE_SELF cuando el operador intenta cambiar su propio estado, sin modificar `activo`
  - R17 — debe devolver 401 sin token en PATCH /usuarios/:id/estado
  - R18 — debe devolver 403 con rol incorrecto en PATCH /usuarios/:id/estado
  - R19 R20 R21 — debe devolver 403 USER_INACTIVE en POST /api/v1/auth/login para un usuario con `activo=false` y credenciales correctas, sin emitir accessToken ni cookie refreshToken
  - R20 — debe seguir devolviendo 401 INVALID_CREDENTIALS si la contraseña es incorrecta para un usuario con `activo=false` (la verificación de `activo` no debe ejecutarse antes de validar la contraseña)

---

## Frontend

- [x] T11. Crear `frontend/src/types/usuarioTypes.ts` con las interfaces del frontend tal como se define en `design.md` sección 5 (DTOs frontend), incluyendo el type alias `Rol`. No importar de `@prisma/client`.

- [x] T12. Crear `frontend/src/services/usuarioService.ts` con las funciones `listar(params)`, `obtenerPorId(id)` y `actualizarEstado(id, dto)` usando la instancia `api` (axios configurada), siguiendo el patrón de `repartidorService.ts`. El parámetro `rol` se envía como string en la query (`CLIENTE`/`OPERADOR`/`REPARTIDOR`).

- [x] T13. Crear `frontend/src/hooks/useUsuarios.ts` con:
  - `useUsuarios(filtros)` — `useQuery` con `queryKey: ['usuarios', filtros]`.
  - `useUsuario(id)` — `useQuery` con `queryKey: ['usuarios', id]`, habilitado solo si `id` no es `null`.
  - `useActualizarEstadoUsuario()` — `useMutation` que llama a `usuarioService.actualizarEstado`; en `onSuccess` invalida `['usuarios']` y muestra toast de éxito; en `onError` muestra toast de error con el mensaje de la respuesta de la API (cubre R28: 409 al auto-desactivarse).

- [x] T14. Crear `frontend/src/features/usuarios/UsuarioTable.tsx` — tabla con columnas Nombre / Correo / Rol / Estado (badge verde "Activo" / rojo "Inactivo") / Acciones (botones "Ver" y "Activar"/"Desactivar" según `usuario.activo`). Accesible: `<table>` semántico con `<th scope="col">`. El botón de estado invoca `useActualizarEstadoUsuario` con el valor `activo` invertido.

- [x] T15. Crear `frontend/src/features/usuarios/UsuarioDetalle.tsx` — componente que recibe un `UsuarioDto` y muestra todos sus campos en modo lectura (`nombre`, `correo`, `rol`, `telefono`, estado activo/inactivo, `createdAt` formateada), siguiendo el mismo patrón `<dl>/<dt>/<dd>` que `RepartidorDetalle.tsx`.

- [x] T16. Crear `frontend/src/features/usuarios/GestionUsuarios.tsx` — página principal:
  - Título "Gestión de Usuarios".
  - Control de filtro (select: Todos / CLIENTE / OPERADOR / REPARTIDOR) que actualiza el estado local y re-ejecuta `useUsuarios`, reseteando `page` a 1 al cambiar.
  - Renderiza `UsuarioTable`; al pulsar "Ver" abre `UsuarioDetalle`; al pulsar "Activar"/"Desactivar" ejecuta `useActualizarEstadoUsuario` y muestra toast de éxito o error.
  - Muestra indicador de carga (R29) y mensaje de error con botón "Reintentar" (R30).
  - Controles de paginación (anterior/siguiente) que actualizan el parámetro `page` (R31), siguiendo el mismo patrón que `GestionRepartidores.tsx`.

- [x] T17. Reemplazar en `frontend/src/router/index.tsx` la línea 63 (`<Route path="/usuarios" element={<PlaceholderPage title="Usuarios" />} />`) por `<Route path="/usuarios" element={<GestionUsuarios />} />`, importando `GestionUsuarios` desde `@/features/usuarios/GestionUsuarios`. El `PlaceholderPage` puede seguir importado si se usa en otras rutas (verificar antes de eliminar el import).

- [x] T18. Escribir tests frontend en `frontend/src/features/usuarios/usuarios.test.tsx` con Vitest + Testing Library cubriendo:
  - R22 — renderiza la página con título "Gestión de Usuarios"
  - R23 — muestra columnas Nombre, Correo, Rol, Estado en la tabla
  - R24 — el filtro por rol re-ejecuta la query con el parámetro correcto
  - R25 — al hacer clic en "Ver" se muestra el panel de detalle con los datos del usuario
  - R26 — el botón de acción muestra "Activar" para usuarios inactivos y "Desactivar" para usuarios activos
  - R27 — al hacer clic en "Desactivar"/"Activar" se llama al servicio PATCH /usuarios/:id/estado y se muestra toast de éxito
  - R28 — si la API responde 409 (auto-desactivación) se muestra un toast de error con el mensaje recibido
  - R29 — muestra indicador de carga mientras se obtiene la lista
  - R30 — muestra mensaje de error si la API falla, con botón "Reintentar"
  - R31 — muestra controles de paginación cuando `meta.totalPages > 1`

---

## Verificación final

- [x] T19. Ejecutar `./init.sh` desde la raíz del proyecto. Verificar que lint, tests de backend (incluyendo `usuarios.test.ts` y la suite de `auth.test.ts` actualizada), tests de frontend y build de ambos paquetes completan sin errores. Reportar resultado al leader.
