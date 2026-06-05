# Implementación — auth_perfil

> Fecha: 2026-06-04
> Implementador: implementer subagent

---

## Archivos creados

### Backend
- `backend/src/validators/userValidator.ts` — Schemas Zod: userSchema, forgotPasswordSchema, resetPasswordSchema
- `backend/src/types/userTypes.ts` — Interfaces PerfilDto, UpdatePerfilInput, CreatePasswordResetTokenInput
- `backend/src/repositories/userRepository.ts` — findById, updatePerfil, createPasswordResetToken, findPasswordResetToken, markPasswordResetTokenUsado, updatePassword
- `backend/src/lib/mailer.ts` — sendPasswordResetEmail (named export, mockeable con jest.mock)
- `backend/src/services/userService.ts` — getPerfil, updatePerfil, forgotPassword, resetPassword
- `backend/src/controllers/userController.ts` — getMe, updateMe, forgotPassword, resetPassword
- `backend/src/routes/users.ts` — GET /, PATCH / con authMiddleware
- `backend/src/tests/userProfile.test.ts` — 8 tests (R1–R9)
- `backend/src/tests/forgotPassword.test.ts` — 4 tests (R10, R11+R12, R14)
- `backend/src/tests/resetPassword.test.ts` — 7 tests (R15–R20)

### Backend (modificados)
- `backend/src/index.ts` — añade import usersRouter + `app.use('/api/v1/users/me', usersRouter)`
- `backend/src/routes/auth.ts` — añade POST /forgot-password y POST /reset-password
- `backend/.env.example` — añade EMAIL_FROM

### Frontend
- `frontend/src/types/userTypes.ts` — Rol, PerfilDto, UpdatePerfilInput
- `frontend/src/services/userService.ts` — getPerfil(), updatePerfil()
- `frontend/src/hooks/usePerfil.ts` — useQuery wrapping userService.getPerfil
- `frontend/src/hooks/useUpdatePerfil.ts` — useMutation wrapping userService.updatePerfil
- `frontend/src/features/auth/Perfil.tsx` — página de perfil con form editable
- `frontend/src/features/auth/ForgotPassword.tsx` — formulario recuperación contraseña
- `frontend/src/features/auth/ResetPassword.tsx` — formulario reset con ?token= de URL
- `frontend/src/features/auth/__tests__/Perfil.test.tsx` — 4 tests (R1, R4, R7)
- `frontend/src/features/auth/__tests__/ForgotPassword.test.tsx` — 3 tests (R10)
- `frontend/src/features/auth/__tests__/ResetPassword.test.tsx` — 3 tests (R15, R16/R17/R18)

### Frontend (modificados)
- `frontend/src/services/authService.ts` — añade forgotPassword(), resetPassword()
- `frontend/src/router/index.tsx` — añade rutas /perfil (protegida), /forgot-password, /reset-password

---

## Trazabilidad R<n> → Test → Archivo:Línea

| Requisito | Test | Archivo | Línea aprox. |
|---|---|---|---|
| R1 (GET perfil 200) | `R1 - debe devolver perfil del usuario autenticado` | `userProfile.test.ts` | 51 |
| R1 (frontend render) | `R1 - debe renderizar datos del perfil` | `Perfil.test.tsx` | 55 |
| R2/R3 (GET sin token 401) | `R2/R3 - debe rechazar GET /users/me sin token` | `userProfile.test.ts` | 64 |
| R3 (token inválido) | `R3 - debe rechazar GET /users/me con token inválido` | `userProfile.test.ts` | 71 |
| R4 (PATCH nombre/tel) | `R4 - debe actualizar nombre y/o teléfono` | `userProfile.test.ts` | 80 |
| R4 (frontend submit) | `R4 - debe llamar a updatePerfil al enviar formulario` | `Perfil.test.tsx` | 65 |
| R5/R6 (campo vacío 422) | `R5/R6 - debe rechazar PATCH con campo vacío` | `userProfile.test.ts` | 100, 109 |
| R7 (sin campos 422) | `R7 - debe rechazar PATCH sin campos` | `userProfile.test.ts` | 93 |
| R7 (frontend) | `R7 - debe mostrar error si el formulario está vacío` | `Perfil.test.tsx` | 76 |
| R8 (no correo/rol) | `R8 - debe ignorar intento de actualizar correo` | `userProfile.test.ts` | 118 |
| R9 (PATCH sin token) | `R9 - debe rechazar PATCH sin token` | `userProfile.test.ts` | 128 |
| R10 (forgot 200 siempre) | `R10 - debe devolver 200 aunque correo no exista` | `forgotPassword.test.ts` | 44 |
| R10 (frontend confirm) | `R10 - debe mostrar mensaje de confirmación tras submit` | `ForgotPassword.test.tsx` | 43 |
| R11+R12 (crea token+email) | `R11+R12 - debe crear PasswordResetToken y llamar a sendPasswordResetEmail` | `forgotPassword.test.ts` | 57 |
| R14 (forgot 422) | `R14 - debe rechazar body sin correo` | `forgotPassword.test.ts` | 78, 85 |
| R15 (reset exitoso) | `R15 - debe actualizar password y marcar token como usado` | `resetPassword.test.ts` | 34 |
| R15 (frontend redirect) | `R15 - debe redirigir a /login tras reset exitoso` | `ResetPassword.test.tsx` | 47 |
| R16 (token inexistente) | `R16 - debe devolver 400 con token inexistente` | `resetPassword.test.ts` | 72 |
| R16/R17/R18 (frontend) | `R16/R17/R18 - debe mostrar mensaje de error con token inválido` | `ResetPassword.test.tsx` | 70 |
| R17 (token expirado) | `R17 - debe devolver 400 con token expirado` | `resetPassword.test.ts` | 50 |
| R18 (token usado) | `R18 - debe devolver 400 con token ya usado` | `resetPassword.test.ts` | 61 |
| R19 (password < 8) | `R19 - debe rechazar body inválido (newPassword < 8 chars)` | `resetPassword.test.ts` | 81 |
| R20 (token un solo uso) | `R20 - no debe aceptar el mismo token dos veces` | `resetPassword.test.ts` | 93 |

---

## Resultados

- Tests backend: **54/54 passing**
- Tests frontend: **23/23 passing**
- Lint backend: ✅ (sin errores)
- Lint frontend: ✅ (sin errores)
- Build backend: ✅ (tsc sin errores)
- Build frontend: ✅ (tsc -b && vite build sin errores)
