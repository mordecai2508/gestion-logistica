# Tasks — auth_perfil

> Lista ordenada para el `implementer`. Seguir en orden estricto.
> Marcar `[x]` al completar cada task. No marcar `done` en `feature_list.json`
> hasta que el `reviewer` lo apruebe.

---

## Backend

- [x] T1. Crear `backend/src/validators/userValidator.ts` con:
  - `userSchema` (Zod): objeto con `nombre` (string, min 1, opcional) y `telefono` (string, min 1, opcional), con refinement `.refine()` que exige al menos uno de los dos campos presente. Exportar `UpdatePerfilDto = z.infer<typeof userSchema>`.
  - `forgotPasswordSchema` (Zod): objeto con `correo` (string, email). Exportar `ForgotPasswordDto`.
  - `resetPasswordSchema` (Zod): objeto con `token` (string, min 1) y `newPassword` (string, min 8). Exportar `ResetPasswordDto`.

- [x] T2. Crear `backend/src/types/userTypes.ts` con:
  - Interface `PerfilDto { id: string; nombre: string; correo: string; telefono: string | null; rol: Rol; createdAt: string; updatedAt: string; }`.
  - Interface `UpdatePerfilInput { nombre?: string; telefono?: string; }`.
  - Interface `CreatePasswordResetTokenInput { token: string; usuarioId: string; expiresAt: Date; }`.

- [x] T3. Crear `backend/src/repositories/userRepository.ts` con los siguientes métodos (solo acceso a Prisma, sin lógica de negocio):
  - `findById(id: string): Promise<Usuario | null>` — `prisma.usuario.findUnique({ where: { id } })`.
  - `updatePerfil(id: string, data: UpdatePerfilInput): Promise<Usuario>` — `prisma.usuario.update({ where: { id }, data })` pasando solo `nombre` y/o `telefono`.
  - `createPasswordResetToken(data: CreatePasswordResetTokenInput): Promise<PasswordResetToken>` — `prisma.passwordResetToken.create({ data })`.
  - `findPasswordResetToken(token: string): Promise<PasswordResetToken | null>` — `prisma.passwordResetToken.findUnique({ where: { token } })`.
  - `markPasswordResetTokenUsado(id: string): Promise<void>` — `prisma.passwordResetToken.update({ where: { id }, data: { usado: true } })`.

- [x] T4. Crear `backend/src/lib/mailer.ts` con:
  - Configuración de transporter nodemailer usando variables de entorno: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.
  - Función `sendPasswordResetEmail(correo: string, token: string): Promise<void>` que envía el correo con el enlace `${process.env.FRONTEND_URL}/reset-password?token=${token}`.
  - Cuando `NODE_ENV === 'test'`, la función debe poder ser mockeada vía `jest.mock('../lib/mailer')` sin modificar lógica de negocio. (Exportar la función directamente; no usar singleton que impida el mock.)
  - Añadir `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `FRONTEND_URL` a `backend/.env.example`.

- [x] T5. Crear `backend/src/services/userService.ts` con los métodos:
  - `getPerfil(userId: string): Promise<PerfilDto>` — llama a `userRepository.findById`; lanza error 404 si no existe; proyecta a `PerfilDto`.
  - `updatePerfil(userId: string, dto: UpdatePerfilInput): Promise<PerfilDto>` — llama a `userRepository.updatePerfil`; proyecta a `PerfilDto`.
  - `forgotPassword(correo: string): Promise<void>` — busca usuario via `authRepository.findByCorreo`; si no existe, retorna sin error; si existe: genera token con `crypto.randomBytes(32).toString('hex')`, crea `PasswordResetToken` vía `userRepository.createPasswordResetToken`, llama a `mailer.sendPasswordResetEmail`.
  - `resetPassword(token: string, newPassword: string): Promise<void>` — busca token vía `userRepository.findPasswordResetToken`; valida existencia, `usado === false` y `expiresAt > new Date()`; si falla alguna: lanza error `{ name: 'INVALID_RESET_TOKEN', statusCode: 400 }`; hashea con `bcrypt.hash(newPassword, 12)`; actualiza password del usuario; llama a `userRepository.markPasswordResetTokenUsado`.

- [x] T6. Crear `backend/src/controllers/userController.ts` con handlers (sin lógica de negocio):
  - `getMe(req, res, next)` — llama a `userService.getPerfil(req.user!.id)`; responde `200` con `{ data, message: 'Perfil obtenido', status: 200 }`.
  - `updateMe(req, res, next)` — parsea body con `userSchema.parse(req.body)`; llama a `userService.updatePerfil(req.user!.id, dto)`; responde `200` con `{ data, message: 'Perfil actualizado', status: 200 }`.
  - `forgotPassword(req, res, next)` — parsea body con `forgotPasswordSchema.parse(req.body)`; llama a `userService.forgotPassword(dto.correo)`; responde `200` con `{ data: null, message: 'Si el correo existe recibirás un enlace de recuperación', status: 200 }`.
  - `resetPassword(req, res, next)` — parsea body con `resetPasswordSchema.parse(req.body)`; llama a `userService.resetPassword(dto.token, dto.newPassword)`; responde `200` con `{ data: null, message: 'Contraseña actualizada correctamente', status: 200 }`.

- [x] T7. Crear `backend/src/routes/users.ts`:
  - `GET /` → `authMiddleware`, `getMe`.
  - `PATCH /` → `authMiddleware`, `updateMe`.
  - Registrar en el archivo principal de rutas (probablemente `backend/src/index.ts` o `backend/src/routes/index.ts`) como `app.use('/api/v1/users/me', usersRouter)` o equivalente.

- [x] T8. Añadir los endpoints de forgot/reset-password en `backend/src/routes/auth.ts` (o el archivo de rutas de auth existente):
  - `POST /forgot-password` → `forgotPassword` controller.
  - `POST /reset-password` → `resetPassword` controller.
  - Verificar que el rate limiter de `/api/v1/auth/*` cubra estas nuevas rutas.

- [x] T9. Escribir tests backend en `backend/src/tests/userProfile.test.ts` (Jest + Supertest):
  - `R1 - debe devolver perfil del usuario autenticado` — GET /users/me con token válido → 200 con campos esperados.
  - `R2/R3 - debe rechazar GET /users/me sin token` → 401.
  - `R4 - debe actualizar nombre y/o teléfono` — PATCH /users/me con { nombre: "Nuevo" } → 200; verificar que correo y rol no cambian.
  - `R7 - debe rechazar PATCH /users/me sin campos` → 422.
  - `R5/R6 - debe rechazar PATCH /users/me con campo vacío` → 422.
  - `R8 - debe ignorar o rechazar intento de actualizar correo/rol` — verificar que DB no cambia esos campos.

- [x] T10. Escribir tests backend en `backend/src/tests/forgotPassword.test.ts`:
  - `R10 - debe devolver 200 aunque el correo no exista` (no revelar existencia).
  - `R11+R12 - debe crear PasswordResetToken y llamar a sendPasswordResetEmail cuando el correo existe` (mockear mailer).
  - `R14 - debe rechazar body sin correo o con formato inválido` → 422.

- [x] T11. Escribir tests backend en `backend/src/tests/resetPassword.test.ts`:
  - `R15 - debe actualizar password y marcar token como usado con token válido`.
  - `R17 - debe devolver 400 con token expirado`.
  - `R18 - debe devolver 400 con token ya usado`.
  - `R16 - debe devolver 400 con token inexistente`.
  - `R19 - debe rechazar body inválido (newPassword < 8 chars)` → 422.
  - `R20 - no debe aceptar el mismo token dos veces`.

---

## Frontend

- [x] T12. Crear `frontend/src/features/auth/Perfil.tsx`:
  - Muestra `nombre`, `correo` (read-only), `telefono`, `rol` como badge.
  - Formulario con `nombre` y `telefono` usando React Hook Form + Zod (`updatePerfilSchema`).
  - Usa el hook `useUpdatePerfil` (useMutation); toast de éxito/error (Shadcn Toast).
  - Importa datos desde `usePerfil` (useQuery).

- [x] T13. Crear `frontend/src/hooks/usePerfil.ts`:
  - `useQuery({ queryKey: ['perfil'], queryFn: userService.getPerfil })`.

- [x] T14. Crear `frontend/src/hooks/useUpdatePerfil.ts`:
  - `useMutation({ mutationFn: userService.updatePerfil, onSuccess: () => queryClient.invalidateQueries(['perfil']) })`.

- [x] T15. Crear `frontend/src/services/userService.ts`:
  - `getPerfil(): Promise<PerfilDto>` — `GET /api/v1/users/me` vía instancia axios configurada.
  - `updatePerfil(dto: UpdatePerfilInput): Promise<PerfilDto>` — `PATCH /api/v1/users/me`.

- [x] T16. Actualizar `frontend/src/services/authService.ts` (existente) añadiendo:
  - `forgotPassword(correo: string): Promise<void>` — `POST /api/v1/auth/forgot-password`.
  - `resetPassword(token: string, newPassword: string): Promise<void>` — `POST /api/v1/auth/reset-password`.

- [x] T17. Crear `frontend/src/features/auth/ForgotPassword.tsx`:
  - Campo correo (email) + botón "Enviar enlace".
  - Al submit: `authService.forgotPassword(correo)`; muestra mensaje genérico de confirmación.
  - Link "Volver al login".

- [x] T18. Crear `frontend/src/features/auth/ResetPassword.tsx`:
  - Lee `token` de `useSearchParams()`.
  - Campos `newPassword` y `confirmPassword` con validación Zod (min 8, match).
  - Al submit: `authService.resetPassword(token, newPassword)`.
  - En éxito: `navigate('/login')` + toast "Contraseña actualizada".
  - En error 400: muestra "El enlace es inválido o ha expirado".

- [x] T19. Actualizar `frontend/src/router/` para añadir:
  - `/perfil` → `<ProtectedRoute roles={['CLIENTE','OPERADOR','REPARTIDOR']}>` → `<Perfil />`.
  - `/forgot-password` → público → `<ForgotPassword />`.
  - `/reset-password` → público → `<ResetPassword />`.
  - Verificar que el link "¿Olvidó su contraseña?" en `Login.tsx` apunta a `/forgot-password`.

- [x] T20. Crear `frontend/src/types/userTypes.ts` (o extender tipos existentes):
  - Interfaces `PerfilDto`, `UpdatePerfilInput` para uso en hooks y servicios frontend.

- [x] T21. Escribir tests frontend en `frontend/src/features/auth/__tests__/Perfil.test.tsx` (Vitest + Testing Library):
  - `R1 - debe renderizar datos del perfil`.
  - `R4 - debe llamar a updatePerfil al enviar formulario con datos válidos`.
  - `R7 - debe mostrar error si el formulario está vacío`.

- [x] T22. Escribir tests frontend en `frontend/src/features/auth/__tests__/ForgotPassword.test.tsx`:
  - `R10 - debe mostrar mensaje de confirmación tras submit`.

- [x] T23. Escribir tests frontend en `frontend/src/features/auth/__tests__/ResetPassword.test.tsx`:
  - `R15 - debe redirigir a /login tras reset exitoso`.
  - `R16/R17/R18 - debe mostrar mensaje de error con token inválido`.

---

## Verificación final

- [x] T24. Ejecutar `npm run test` en `backend/` — todos los tests en verde.
- [x] T25. Ejecutar `npm run test` en `frontend/` — todos los tests en verde.
- [x] T26. Ejecutar `npm run lint` en `backend/` y `frontend/` — sin errores ni advertencias.
- [x] T27. Ejecutar `npm run build` en `backend/` y `frontend/` — sin errores de TypeScript.
