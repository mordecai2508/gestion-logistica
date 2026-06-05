# Requirements — auth_registro

> Feature: Registro de usuarios (id: 2, sprint 1)
> Stories: HU2, HU3
> Notation: EARS (Easy Approach to Requirements Syntax)

---

## Endpoint: POST /api/v1/auth/register

R1. WHEN a user submits a request to `POST /api/v1/auth/register` with all valid fields THE SYSTEM SHALL create the user record in the database and return HTTP 201 with `{ data: { id, correo, rol }, message: "Usuario registrado exitosamente", status: 201 }`.

R2. WHEN a valid registration request is processed THE SYSTEM SHALL hash the provided password using bcrypt with a minimum of 10 rounds before persisting it to the database.

R3. WHEN a user submits a request to `POST /api/v1/auth/register` with a `correo` that already exists in the database THE SYSTEM SHALL return HTTP 409 with `{ error: "EMAIL_ALREADY_EXISTS", message: "El correo ya está registrado", statusCode: 409 }`.

R4. WHEN a user submits a request to `POST /api/v1/auth/register` with a missing or malformed `correo` field THE SYSTEM SHALL return HTTP 422 with Zod validation error details.

R5. WHEN a user submits a request to `POST /api/v1/auth/register` with a `password` shorter than 8 characters THE SYSTEM SHALL return HTTP 422 with Zod validation error details indicating the minimum length requirement.

R6. WHEN a user submits a request to `POST /api/v1/auth/register` where the `confirmPassword` value does not match the `password` value THE SYSTEM SHALL return HTTP 422 with Zod validation error details indicating the mismatch.

R7. WHEN a user submits a request to `POST /api/v1/auth/register` with a missing or empty `nombre` field THE SYSTEM SHALL return HTTP 422 with Zod validation error details.

R8. WHEN a user submits a request to `POST /api/v1/auth/register` with a missing or empty `telefono` field THE SYSTEM SHALL return HTTP 422 with Zod validation error details.

R9. WHEN a user submits a request to `POST /api/v1/auth/register` with a `rol` value that is not one of `CLIENTE`, `OPERADOR`, or `REPARTIDOR` THE SYSTEM SHALL return HTTP 422 with Zod validation error details.

---

## Creación de perfil asociado según rol

R10. WHEN a user successfully registers with `rol: "CLIENTE"` THE SYSTEM SHALL atomically create a `Cliente` record linked to the new `Usuario` within the same database transaction.

R11. WHEN a user successfully registers with `rol: "OPERADOR"` THE SYSTEM SHALL atomically create an `Operador` record linked to the new `Usuario` within the same database transaction.

R12. WHEN a user successfully registers with `rol: "REPARTIDOR"` THE SYSTEM SHALL atomically create a `Repartidor` record linked to the new `Usuario` within the same database transaction.

R13. IF the profile creation (Cliente, Operador, or Repartidor) fails for any reason THEN THE SYSTEM SHALL roll back the entire transaction so that no partial data (neither the `Usuario` nor the profile) is persisted.

---

## Frontend: Pantalla de Registro

R14. THE SYSTEM SHALL render a registration screen containing: a "Crear cuenta" title, a "Nombre completo" input field, a "Correo electrónico" input field, a "Contraseña" password input field, a "Confirmar contraseña" password input field, a "Teléfono" input field, a "Rol" dropdown selector, a full-width primary "REGISTRARSE" button, and a "¿Ya tienes cuenta? Inicia sesión" link — matching the wireframe specification.

R15. WHEN a user interacts with the registration form fields THE SYSTEM SHALL validate each field in real time using React Hook Form with a Zod schema resolver and display inline error messages beneath each invalid field.

R16. WHEN a user submits the registration form with valid data and the server returns HTTP 201 THE SYSTEM SHALL redirect the user to `/login`.

R17. WHEN a user submits the registration form and the server returns HTTP 409 THE SYSTEM SHALL display an error Toast notification indicating the email is already registered without navigating away from the registration screen.

R18. WHEN a user submits the registration form and the server returns HTTP 422 THE SYSTEM SHALL display field-level validation error messages returned by the server.

---

## Seguridad

R19. THE SYSTEM SHALL validate all registration request inputs with a Zod schema before any database query is executed.

R20. THE SYSTEM SHALL enforce the rate limit of maximum 10 requests per minute per IP address on `POST /api/v1/auth/register` (covered by the existing `/api/v1/auth/*` rate limiter).

R21. THE SYSTEM SHALL NOT include the hashed password in any response payload.
