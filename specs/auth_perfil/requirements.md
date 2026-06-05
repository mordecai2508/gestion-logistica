# Requirements — auth_perfil

> EARS notation. Un requisito = una sola idea. Solo SHALL (obligatorio).
> Trazabilidad: cada R<n> debe aparecer como referencia en al menos un test.

---

## Perfil de usuario (GET /api/v1/users/me)

R1. WHEN an authenticated user sends `GET /api/v1/users/me` with a valid Bearer token THE SYSTEM SHALL return HTTP 200 with `{ data: { id, nombre, correo, telefono, rol, createdAt }, message: "Perfil obtenido", status: 200 }`.

R2. WHEN a request reaches `GET /api/v1/users/me` without a Bearer token THE SYSTEM SHALL reject the request with HTTP 401 and `{ error: "MISSING_TOKEN", message: "Token de acceso requerido", statusCode: 401 }`.

R3. WHEN a request reaches `GET /api/v1/users/me` with an expired or invalid Bearer token THE SYSTEM SHALL reject the request with HTTP 401.

---

## Actualización de perfil (PATCH /api/v1/users/me)

R4. WHEN an authenticated user sends `PATCH /api/v1/users/me` with at least one of `nombre` or `telefono` THE SYSTEM SHALL update only the provided fields, leave all other fields unchanged, and return HTTP 200 with `{ data: { id, nombre, correo, telefono, rol, updatedAt }, message: "Perfil actualizado", status: 200 }`.

R5. WHEN `PATCH /api/v1/users/me` body contains a `nombre` field THE SYSTEM SHALL reject the request with HTTP 422 if `nombre` is an empty string.

R6. WHEN `PATCH /api/v1/users/me` body contains a `telefono` field THE SYSTEM SHALL reject the request with HTTP 422 if `telefono` is an empty string.

R7. WHEN `PATCH /api/v1/users/me` body contains neither `nombre` nor `telefono` THE SYSTEM SHALL reject the request with HTTP 422 and a validation error indicating that at least one field must be present.

R8. THE SYSTEM SHALL never allow `PATCH /api/v1/users/me` to modify the fields `correo`, `rol`, or `password`, even if those fields are present in the request body.

R9. WHEN a request reaches `PATCH /api/v1/users/me` without a valid Bearer token THE SYSTEM SHALL reject the request with HTTP 401.

---

## Solicitud de recuperación de contraseña (POST /api/v1/auth/forgot-password)

R10. WHEN a user sends `POST /api/v1/auth/forgot-password` with a `correo` field THE SYSTEM SHALL always return HTTP 200 with `{ data: null, message: "Si el correo existe recibirás un enlace de recuperación", status: 200 }`, regardless of whether the correo exists in the database.

R11. WHEN the correo provided to `POST /api/v1/auth/forgot-password` corresponds to an existing user THE SYSTEM SHALL create a `PasswordResetToken` record with: a cryptographically random opaque token value, `usuarioId` linked to the user, `expiresAt` set to exactly 1 hour from the time of creation, and `usado = false`.

R12. WHEN the `PasswordResetToken` is successfully created THE SYSTEM SHALL send an email to the user's correo containing a reset link in the format `<FRONTEND_URL>/reset-password?token=<token_value>`.

R13. IF `NODE_ENV` equals `test` THE SYSTEM SHALL NOT send a real email but SHALL allow the email-sending function to be replaced by a spy or mock without modifying business logic.

R14. WHEN `POST /api/v1/auth/forgot-password` receives a body without a `correo` field or with an invalid email format THE SYSTEM SHALL return HTTP 422 with a Zod validation error.

---

## Restablecimiento de contraseña (POST /api/v1/auth/reset-password)

R15. WHEN a user sends `POST /api/v1/auth/reset-password` with a valid `token` and a `newPassword` of at least 8 characters, and the token exists, is not expired, and has `usado = false` THE SYSTEM SHALL hash the new password with bcrypt (rounds = 12), update the `Usuario.password` field, mark the `PasswordResetToken.usado` as `true`, and return HTTP 200 with `{ data: null, message: "Contraseña actualizada correctamente", status: 200 }`.

R16. WHEN `POST /api/v1/auth/reset-password` is called with a token that does not exist in the database THE SYSTEM SHALL return HTTP 400 with `{ error: "INVALID_RESET_TOKEN", message: "Token inválido o expirado", statusCode: 400 }`.

R17. WHEN `POST /api/v1/auth/reset-password` is called with a token whose `expiresAt` is in the past THE SYSTEM SHALL return HTTP 400 with `{ error: "INVALID_RESET_TOKEN", message: "Token inválido o expirado", statusCode: 400 }`.

R18. WHEN `POST /api/v1/auth/reset-password` is called with a token that has `usado = true` THE SYSTEM SHALL return HTTP 400 with `{ error: "INVALID_RESET_TOKEN", message: "Token inválido o expirado", statusCode: 400 }`.

R19. WHEN `POST /api/v1/auth/reset-password` receives a body missing the `token` or `newPassword` fields, or `newPassword` is shorter than 8 characters THE SYSTEM SHALL return HTTP 422 with a Zod validation error.

R20. THE SYSTEM SHALL ensure each `PasswordResetToken` can only be used once: after a successful reset the token SHALL NOT be accepted again.

---

## Cobertura de tests requerida

R21. THE SYSTEM SHALL include backend integration tests covering: R1 (obtener perfil autenticado), R4 (actualizar perfil — nombre, teléfono), R7 (PATCH sin campos), R10 (forgot-password — correo inexistente devuelve 200), R11+R12 (forgot-password — correo existente crea token), R15 (reset exitoso), R17 (reset con token expirado), R18 (reset con token ya usado).

R22. THE SYSTEM SHALL include frontend component tests covering: render de `Perfil.tsx`, submit de edición, render de `ForgotPassword.tsx`, render de `ResetPassword.tsx`.
