# Implementación — auth_registro

> Feature: Registro de usuarios (id: 2, sprint 1)
> Fecha: 2026-06-04
> Implementer: implementer subagent

---

## Archivos creados

| Archivo | Acción |
|---------|--------|
| `frontend/src/features/auth/Register.tsx` | Creado |
| `frontend/src/features/auth/Register.test.tsx` | Creado |
| `frontend/src/components/ui/select.tsx` | Creado (Select nativo estilizado con Tailwind) |

## Archivos modificados

| Archivo | Cambios |
|---------|---------|
| `backend/src/validators/authValidator.ts` | Añadido `registerSchema` y tipo `RegisterDto` |
| `backend/src/repositories/authRepository.ts` | Añadido método `createUsuario` con `prisma.$transaction` |
| `backend/src/services/authService.ts` | Añadido método `register` con verificación de unicidad y bcrypt hash |
| `backend/src/controllers/authController.ts` | Añadido `registerHandler` |
| `backend/src/routes/auth.ts` | Añadida ruta `POST /register` |
| `backend/src/tests/auth.test.ts` | Añadidos 14 tests nuevos (T6, T7) |
| `frontend/src/services/authService.ts` | Añadidos `RegisterDto`, `RegisterResponse`, método `register` |
| `frontend/src/hooks/useAuth.ts` | Añadido `registerMutation` |
| `frontend/src/router/index.tsx` | Sustituido `RegisterPage` placeholder por componente real `Register` |

---

## Tabla de trazabilidad

| Req | Test | Archivo:línea |
|-----|------|---------------|
| R1 | `R1 - debe devolver 201 con { data: { id, correo, rol } }...` | `backend/src/tests/auth.test.ts:263` |
| R2 | `R2 - debe persistir la contraseña como hash bcrypt...` | `backend/src/tests/auth.test.ts:277` |
| R3 | `R3 - debe devolver 409 EMAIL_ALREADY_EXISTS...` | `backend/src/tests/auth.test.ts:295` |
| R4 | `R4 - debe devolver 422 si el campo correo tiene formato inválido` | `backend/src/tests/auth.test.ts:307` |
| R5 | `R5 - debe devolver 422 si la contraseña tiene menos de 8 caracteres` | `backend/src/tests/auth.test.ts:315` |
| R6 | `R6 - debe devolver 422 si confirmPassword no coincide con password` | `backend/src/tests/auth.test.ts:323` |
| R7 | `R7 - debe devolver 422 si el campo nombre está vacío` | `backend/src/tests/auth.test.ts:331` |
| R8 | `R8 - debe devolver 422 si el campo telefono está vacío` | `backend/src/tests/auth.test.ts:339` |
| R9 | `R9 - debe devolver 422 si el rol no es uno de los valores permitidos` | `backend/src/tests/auth.test.ts:347` |
| R10 | `R10 - debe crear un registro en la tabla Cliente cuando rol es CLIENTE` | `backend/src/tests/auth.test.ts:369` |
| R11 | `R11 - debe crear un registro en la tabla Operador cuando rol es OPERADOR` | `backend/src/tests/auth.test.ts:384` |
| R12 | `R12 - debe crear un registro en la tabla Repartidor cuando rol es REPARTIDOR` | `backend/src/tests/auth.test.ts:399` |
| R13 | `R13 - debe hacer rollback completo si falla la creación del perfil` | `backend/src/tests/auth.test.ts:414` |
| R14 | `R14 - debe renderizar todos los elementos del wireframe...` | `frontend/src/features/auth/Register.test.tsx:63` |
| R15 | `R15 - debe mostrar error de validación en el campo correo...` | `frontend/src/features/auth/Register.test.tsx:80` |
| R15 | `R15 - debe mostrar error si confirmPassword no coincide...` | `frontend/src/features/auth/Register.test.tsx:91` |
| R16 | `R16 - debe redirigir a /login cuando el registro es exitoso (201)` | `frontend/src/features/auth/Register.test.tsx:103` |
| R17 | `R17 - debe mostrar Toast de error cuando el servidor devuelve 409` | `frontend/src/features/auth/Register.test.tsx:121` |
| R18 | `R18 - debe mostrar mensaje de error de campo cuando el servidor devuelve 422` | `frontend/src/features/auth/Register.test.tsx:141` |
| R19 | Validación Zod en controlador antes de cualquier consulta BD | `backend/src/controllers/authController.ts` |
| R20 | Rate limit heredado del `authLimiter` existente en `backend/src/index.ts` | (infraestructura existente) |
| R21 | `R21 - no debe incluir el campo password en la respuesta` | `backend/src/tests/auth.test.ts:426` |

---

## Resultados

| Check | Resultado |
|-------|-----------|
| Backend tests | 30/30 passing |
| Backend lint | sin errores |
| Backend build | sin errores |
| Frontend tests | 13/13 passing |
| Frontend lint | sin errores |
| Frontend build | sin errores |
