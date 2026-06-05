# Tasks — auth_login

> Feature: Login y autenticación JWT (id: 1, sprint 1)
> Implementer: seguir en orden. Marcar `[x]` al completar cada task.

---

## Backend

- [x] T1. Añadir modelo `RefreshToken` al schema Prisma (`backend/prisma/schema.prisma`) y añadir relación `refreshTokens RefreshToken[]` en `Usuario`. Ejecutar `npx prisma migrate dev --name add_refresh_token`.

- [x] T2. Crear validator Zod `backend/src/validators/authValidator.ts` con:
  - `loginSchema`: `{ correo: z.string().email(), password: z.string().min(1) }`
  - Exportar tipo `LoginDto` inferido del schema.

- [x] T3. Crear repositorio `backend/src/repositories/authRepository.ts` con métodos:
  - `findByCorreo(correo: string): Promise<Usuario | null>`
  - `createRefreshToken(data: { token, usuarioId, expiresAt }): Promise<RefreshToken>`
  - `findRefreshToken(token: string): Promise<(RefreshToken & { usuario: Usuario }) | null>`
  - `revokeRefreshToken(id: string): Promise<void>`
  - `revokeAllUserRefreshTokens(usuarioId: string): Promise<void>`

- [x] T4. Crear servicio `backend/src/services/authService.ts` con métodos:
  - `login(dto: LoginDto): Promise<{ accessToken: string, user: { id, nombre, correo, rol }, refreshTokenValue: string }>`
  - `refresh(tokenValue: string): Promise<{ accessToken: string, newRefreshTokenValue: string }>`
  - `logout(tokenValue: string | undefined): Promise<void>`

- [x] T5. Crear controlador `backend/src/controllers/authController.ts` con handlers:
  - `loginHandler`: valida con `loginSchema`, llama `authService.login`, establece cookie `refreshToken`, devuelve 200.
  - `refreshHandler`: lee `req.cookies.refreshToken`, llama `authService.refresh`, rota cookie, devuelve 200.
  - `logoutHandler`: lee `req.cookies.refreshToken`, llama `authService.logout`, limpia cookie con `res.clearCookie`, devuelve 200.

- [x] T6. Crear middleware `backend/src/middlewares/authMiddleware.ts`:
  - Extrae Bearer token del header `Authorization`.
  - Verifica con `jwt.verify`. Maneja errores `TokenExpiredError` y `JsonWebTokenError` por separado.
  - Adjunta `req.user: { id, correo, rol }` si válido.

- [x] T7. Crear rutas `backend/src/routes/auth.ts`:
  - `POST /login` → `loginHandler`
  - `POST /refresh` → `refreshHandler`
  - `POST /logout` → `logoutHandler`
  - Añadir `cookie-parser` middleware al servidor (`index.ts`) para leer cookies.
  - Registrar el router en `index.ts`: `app.use('/api/v1/auth', authLimiter, authRouter)`.

- [x] T8. Instalar dependencias necesarias en `backend/`: `jsonwebtoken`, `bcrypt`, `cookie-parser` y sus tipos (`@types/jsonwebtoken`, `@types/bcrypt`, `@types/cookie-parser`).

- [x] T9. Escribir test `backend/src/tests/auth.test.ts` — bloque `describe('POST /api/v1/auth/login')`:
  - `it('R1 R2 - debe devolver accessToken en body y cookie refreshToken httpOnly con credenciales válidas')`
  - `it('R3 - debe devolver 401 INVALID_CREDENTIALS si el correo no existe')`
  - `it('R4 - debe devolver 401 INVALID_CREDENTIALS si la contraseña es incorrecta')`
  - `it('R5 - debe devolver 422 si el campo correo tiene formato inválido')`
  - `it('R6 - debe devolver 422 si el campo password está vacío')`

- [x] T10. Escribir tests en `backend/src/tests/auth.test.ts` — bloque `describe('POST /api/v1/auth/refresh')`:
  - `it('R7 R8 - debe devolver nuevo accessToken y rotar la cookie refreshToken con token válido')`
  - `it('R9 - debe devolver 401 MISSING_REFRESH_TOKEN si no hay cookie')`
  - `it('R10 - debe devolver 401 EXPIRED_REFRESH_TOKEN si el token ha expirado')`
  - `it('R11 - debe devolver 401 INVALID_REFRESH_TOKEN si el token está malformado')`
  - `it('R12 - debe devolver 401 INVALID_REFRESH_TOKEN si el token ya fue rotado (replay)')`

- [x] T11. Escribir tests en `backend/src/tests/auth.test.ts` — bloque `describe('POST /api/v1/auth/logout')`:
  - `it('R13 - debe responder 200 y limpiar la cookie refreshToken')`
  - `it('R14 - debe marcar el refreshToken como revocado en BD tras logout')`

- [x] T12. Escribir tests en `backend/src/tests/auth.test.ts` — bloque `describe('authMiddleware')`:
  - `it('R15 - debe devolver 401 MISSING_TOKEN si no hay Authorization header')`
  - `it('R16 - debe devolver 401 INVALID_TOKEN si el Bearer token está malformado')`
  - `it('R17 - debe devolver 401 EXPIRED_TOKEN si el accessToken ha expirado')`
  - `it('R18 - debe adjuntar req.user y llamar next() con token válido')`

---

## Frontend

- [x] T13. Crear store Zustand `frontend/src/store/authStore.ts`:
  - Estado: `{ user: AuthUser | null, accessToken: string | null }`
  - Acciones: `setAuth(user, token)`, `clearAuth()`
  - Exportar tipo `AuthUser: { id, nombre, correo, rol: Rol }`.

- [x] T14. Crear instancia axios configurada `frontend/src/services/api.ts`:
  - `baseURL = import.meta.env.VITE_API_URL`
  - `withCredentials: true` (para enviar/recibir cookies)
  - Interceptor de request: adjunta `Authorization: Bearer <accessToken>` desde `authStore`.
  - Interceptor de response: si 401 + `error === "EXPIRED_TOKEN"` → llama `authService.refresh()` → actualiza store → reintenta. Si el refresh falla → `clearAuth()` + redirige a `/login`.

- [x] T15. Crear servicio `frontend/src/services/authService.ts`:
  - `login(dto: LoginDto): Promise<LoginResponse>`
  - `refresh(): Promise<{ accessToken: string }>`
  - `logout(): Promise<void>`
  - Los tres usan la instancia `api` de T14.

- [x] T16. Crear hook `frontend/src/hooks/useAuth.ts`:
  - `loginMutation`: `useMutation` que llama `authService.login`, en `onSuccess` ejecuta `setAuth` y redirige según rol (`R22`, `R23`, `R24`).
  - `logoutMutation`: `useMutation` que llama `authService.logout`, en `onSuccess` ejecuta `clearAuth` y redirige a `/login`.

- [x] T17. Crear componente `frontend/src/features/auth/Login.tsx`:
  - `react-hook-form` + `zodResolver` con schema `loginSchema` (importado de tipos compartidos o definido localmente).
  - Campos: correo (`Input` + icono persona), password (`Input` type password + icono candado), checkbox "Recordarme".
  - Botón "INICIAR SESIÓN" (full width, variante primary de Shadcn `Button`).
  - Links: "¿Olvidó su contraseña?" y "¿No tienes cuenta? Registrarse".
  - En error 401: Toast de error con `useToast()`.
  - Coincide con wireframe de `docs/wireframe-reference.md` sección "Login".

- [x] T18. Crear componente `frontend/src/features/auth/ProtectedRoute.tsx`:
  - Lee `accessToken` y `user` de `authStore`.
  - Si no hay `accessToken` → `<Navigate to="/login" replace />`.
  - Si se pasa prop `allowedRoles` y el rol del usuario no está en la lista → redirige a la ruta base del rol.
  - Si pasa validación → renderiza `<Outlet />`.

- [x] T19. Actualizar `frontend/src/router/index.tsx`:
  - Ruta pública `/login` → `<Login />`.
  - Ruta protegida `/dashboard` → `<ProtectedRoute allowedRoles={['OPERADOR']} />`.
  - Ruta protegida `/repartidor/*` → `<ProtectedRoute allowedRoles={['REPARTIDOR']} />`.
  - Ruta protegida `/tracking` → `<ProtectedRoute allowedRoles={['CLIENTE']} />`.

- [x] T20. Escribir test `frontend/src/features/auth/Login.test.tsx`:
  - `it('R20 - debe renderizar todos los elementos del wireframe: logo, campos, checkbox, botón, links')`
  - `it('R21 R22 - debe redirigir a /dashboard cuando el login es exitoso con rol OPERADOR')`
  - `it('R23 - debe redirigir a /repartidor cuando el login es exitoso con rol REPARTIDOR')`
  - `it('R24 - debe redirigir a /tracking cuando el login es exitoso con rol CLIENTE')`
  - `it('R25 - debe mostrar Toast de error cuando el servidor devuelve 401')`

- [x] T21. Escribir test `frontend/src/hooks/useAuth.test.ts`:
  - `it('R27 - debe reintentar el request original con nuevo accessToken tras refresh automático exitoso')`
  - `it('R28 - debe limpiar el store y redirigir a /login si el refresh también falla')`

---

## Verificación final

- [x] T22. Ejecutar `npm run test` en `backend/` y verificar que todos los tests pasen (verde).
- [x] T23. Ejecutar `npm run lint` en `backend/` y verificar que no haya errores de ESLint ni TypeScript.
- [x] T24. Ejecutar `npm run build` en `backend/` y verificar que compila sin errores.
- [x] T25. Ejecutar `npm run test` en `frontend/` y verificar que todos los tests pasen (verde).
- [x] T26. Ejecutar `npm run lint` en `frontend/` y verificar que no haya errores de ESLint ni TypeScript.
- [x] T27. Ejecutar `npm run build` en `frontend/` y verificar que compila sin errores.
