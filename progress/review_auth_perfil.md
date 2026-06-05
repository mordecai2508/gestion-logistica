# Review — auth_perfil

> Fecha: 2026-06-04
> Reviewer: reviewer subagent

## Veredicto: APROBADO

---

## Checklist de trazabilidad R1–R22

| Req | Test de cobertura | Archivo | Resultado |
|-----|------------------|---------|-----------|
| R1  | `R1 - debe devolver perfil del usuario autenticado` | `userProfile.test.ts:55` | PASS |
| R1  | `R1 - debe renderizar datos del perfil` | `Perfil.test.tsx:57` | PASS |
| R2  | `R2/R3 - debe rechazar GET /users/me sin token` | `userProfile.test.ts:77` | PASS |
| R3  | `R3 - debe rechazar GET /users/me con token inválido` | `userProfile.test.ts:84` | PASS |
| R4  | `R4 - debe actualizar nombre y/o teléfono` | `userProfile.test.ts:97` | PASS |
| R4  | `R4 - verifica que correo y rol no cambian tras PATCH` | `userProfile.test.ts:113` | PASS |
| R4  | `R4 - debe llamar a updatePerfil al enviar formulario` | `Perfil.test.tsx:71` | PASS |
| R5  | `R5 - debe rechazar PATCH con nombre vacío` | `userProfile.test.ts:143` | PASS |
| R6  | `R6 - debe rechazar PATCH con telefono vacío` | `userProfile.test.ts:153` | PASS |
| R7  | `R7 - debe rechazar PATCH sin campos` | `userProfile.test.ts:133` | PASS |
| R7  | `R7 - debe mostrar error si el formulario no tiene al menos nombre o telefono` | `Perfil.test.tsx:90` | PASS |
| R8  | `R8 - debe ignorar o rechazar intento de actualizar correo` | `userProfile.test.ts:163` | PASS |
| R9  | `R9 - debe rechazar PATCH sin token` | `userProfile.test.ts:175` | PASS |
| R10 | `R10 - debe devolver 200 aunque el correo no exista` | `forgotPassword.test.ts:42` | PASS |
| R10 | `R10 - debe mostrar mensaje de confirmación tras submit` | `ForgotPassword.test.tsx:43` | PASS |
| R11+R12 | `R11+R12 - debe crear PasswordResetToken y llamar a sendPasswordResetEmail` | `forgotPassword.test.ts:56` | PASS |
| R13 | Mailer mockeado con `jest.mock('../lib/mailer', ...)` | `forgotPassword.test.ts:9` | PASS |
| R14 | `R14 - debe rechazar body sin correo` / `R14 - debe rechazar correo con formato inválido` | `forgotPassword.test.ts:86,94` | PASS |
| R15 | `R15 - debe actualizar password y marcar token como usado` | `resetPassword.test.ts:33` | PASS |
| R15 | `R15 - debe redirigir a /login tras reset exitoso` | `ResetPassword.test.tsx:47` | PASS |
| R16 | `R16 - debe devolver 400 con token inexistente` | `resetPassword.test.ts:80` | PASS |
| R16/R17/R18 | `R16/R17/R18 - debe mostrar mensaje de error con token inválido` | `ResetPassword.test.tsx:70` | PASS |
| R17 | `R17 - debe devolver 400 con token expirado` | `resetPassword.test.ts:53` | PASS |
| R18 | `R18 - debe devolver 400 con token ya usado` | `resetPassword.test.ts:68` | PASS |
| R19 | `R19 - debe rechazar body inválido (newPassword < 8 chars)` / `R19 - debe rechazar body sin token` | `resetPassword.test.ts:91,99` | PASS |
| R20 | `R20 - no debe aceptar el mismo token dos veces` | `resetPassword.test.ts:107` | PASS |
| R21 | Tests backend cubren R1, R4, R7, R10, R11+R12, R15, R17, R18 | backend tests | PASS |
| R22 | Tests frontend cubren render Perfil, submit edición, ForgotPassword, ResetPassword | frontend tests | PASS |

---

## Checklist de arquitectura

- [x] `userRepository` sin lógica de negocio — solo Prisma, sin bcrypt ni generación de tokens.
- [x] `userController` sin lógica de negocio — solo parsea body con Zod y delega a `userService`.
- [x] `userService.forgotPassword` retorna sin error si correo no existe (`authRepository.findByCorreo` → null → return).
- [x] No `any` explícito — verificado con grep en backend y frontend.
- [x] No `console.log` de debug — verificado con grep en backend y frontend.

---

## Checklist de seguridad

- [x] `authMiddleware` aplicado en GET y PATCH `/users/me` — `routes/users.ts` líneas 7–8.
- [x] `forgot-password` NO revela si correo existe — respuesta 200 idéntica en ambos casos.
- [x] `PasswordResetToken.usado = true` tras reset exitoso — `userService.ts:74` llama a `markPasswordResetTokenUsado`.
- [x] bcrypt `rounds=12` en `resetPassword` — `userService.ts:71`: `bcrypt.hash(newPassword, 12)`.
- [x] PATCH nunca modifica correo/rol/password — `userSchema` solo define `nombre` y `telefono`; Zod strips unknown fields; `UpdatePerfilInput` solo tiene `nombre?` y `telefono?`.

---

## Observaciones (no bloqueantes)

- `mailer.ts:24` contiene un guard `if (process.env.NODE_ENV === 'test') { return; }` dentro de la función exportada. Esto no viola R13 (la función sigue siendo mockeable vía `jest.mock` sin modificar business logic), pero introduce una dependencia de entorno en la capa de transporte. Los tests de `forgotPassword.test.ts` mockean completamente el módulo, por lo que el guard es redundante. Se recomienda eliminarlo en un refactor futuro, pero no es bloqueante.

---

## Resultado final

Todos los tasks T1–T27 están marcados `[x]`. Todos los requisitos R1–R22 tienen cobertura de test. Los checklists de arquitectura y seguridad están en verde. La implementación es correcta y completa.
