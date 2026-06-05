# Requirements — auth_login

> Feature: Login y autenticación JWT (id: 1, sprint 1)
> Stories: HU1, HU6
> Notation: EARS (Easy Approach to Requirements Syntax)

---

## Endpoint: POST /api/v1/auth/login

R1. WHEN a user submits a request to `POST /api/v1/auth/login` with a valid email and password THE SYSTEM SHALL return HTTP 200 with `{ data: { accessToken, user: { id, nombre, correo, rol } }, message: "Login exitoso", status: 200 }` where `accessToken` is a signed JWT with 15-minute expiry.

R2. WHEN a user submits a request to `POST /api/v1/auth/login` with a valid email and password THE SYSTEM SHALL set a `refreshToken` as an httpOnly, Secure, SameSite=Strict cookie with a 7-day max-age.

R3. WHEN a user submits a request to `POST /api/v1/auth/login` with an email that does not exist in the database THE SYSTEM SHALL return HTTP 401 with `{ error: "INVALID_CREDENTIALS", message: "Credenciales inválidas", statusCode: 401 }`.

R4. WHEN a user submits a request to `POST /api/v1/auth/login` with a correct email but an incorrect password THE SYSTEM SHALL return HTTP 401 with `{ error: "INVALID_CREDENTIALS", message: "Credenciales inválidas", statusCode: 401 }`.

R5. WHEN a user submits a request to `POST /api/v1/auth/login` with a missing or malformed email field THE SYSTEM SHALL return HTTP 422 with Zod validation error details.

R6. WHEN a user submits a request to `POST /api/v1/auth/login` with a missing or empty password field THE SYSTEM SHALL return HTTP 422 with Zod validation error details.

---

## Endpoint: POST /api/v1/auth/refresh

R7. WHEN a user submits a request to `POST /api/v1/auth/refresh` with a valid `refreshToken` httpOnly cookie THE SYSTEM SHALL return HTTP 200 with a new `accessToken` (JWT, 15-minute expiry) in the response body.

R8. WHEN a user submits a request to `POST /api/v1/auth/refresh` with a valid `refreshToken` httpOnly cookie THE SYSTEM SHALL rotate the `refreshToken` by setting a new httpOnly cookie with a fresh 7-day max-age and invalidating the previous token.

R9. WHEN a user submits a request to `POST /api/v1/auth/refresh` with no `refreshToken` cookie THE SYSTEM SHALL return HTTP 401 with `{ error: "MISSING_REFRESH_TOKEN", message: "Refresh token ausente", statusCode: 401 }`.

R10. WHEN a user submits a request to `POST /api/v1/auth/refresh` with an expired `refreshToken` cookie THE SYSTEM SHALL return HTTP 401 with `{ error: "EXPIRED_REFRESH_TOKEN", message: "Sesión expirada, inicia sesión de nuevo", statusCode: 401 }`.

R11. WHEN a user submits a request to `POST /api/v1/auth/refresh` with a malformed or tampered `refreshToken` cookie THE SYSTEM SHALL return HTTP 401 with `{ error: "INVALID_REFRESH_TOKEN", message: "Token inválido", statusCode: 401 }`.

R12. WHEN a user submits a request to `POST /api/v1/auth/refresh` with a `refreshToken` that has already been rotated (replay attack) THE SYSTEM SHALL return HTTP 401 with `{ error: "INVALID_REFRESH_TOKEN", message: "Token inválido", statusCode: 401 }`.

---

## Endpoint: POST /api/v1/auth/logout

R13. WHEN a user submits a request to `POST /api/v1/auth/logout` THE SYSTEM SHALL clear the `refreshToken` cookie by setting it to an empty value with `Max-Age=0` and return HTTP 200 with `{ data: null, message: "Sesión cerrada correctamente", status: 200 }`.

R14. WHEN a user submits a request to `POST /api/v1/auth/logout` with a valid `refreshToken` cookie THE SYSTEM SHALL invalidate that token in the database so it cannot be reused.

---

## Middleware: authMiddleware

R15. WHEN a request arrives at a protected endpoint without an `Authorization` header THE SYSTEM SHALL reject the request with HTTP 401 with `{ error: "MISSING_TOKEN", message: "Token de acceso requerido", statusCode: 401 }`.

R16. WHEN a request arrives at a protected endpoint with a malformed `Authorization: Bearer <token>` value THE SYSTEM SHALL reject the request with HTTP 401 with `{ error: "INVALID_TOKEN", message: "Token inválido", statusCode: 401 }`.

R17. WHEN a request arrives at a protected endpoint with an expired `accessToken` THE SYSTEM SHALL reject the request with HTTP 401 with `{ error: "EXPIRED_TOKEN", message: "Token expirado", statusCode: 401 }`.

R18. WHEN a request arrives at a protected endpoint with a valid `accessToken` THE SYSTEM SHALL attach the decoded user payload (`{ id, correo, rol }`) to `req.user` and pass control to the next middleware.

---

## Rate Limiting

R19. WHILE any client is sending requests to `/api/v1/auth/*` THE SYSTEM SHALL enforce a rate limit of maximum 10 requests per minute per IP address and return HTTP 429 upon exceeding this limit.

---

## Frontend: Pantalla de Login

R20. THE SYSTEM SHALL render a login screen containing: a centered logo, an email input field with a person icon, a password input field with a lock icon, a "Recordarme" checkbox, a full-width primary "INICIAR SESIÓN" button, a "¿Olvidó su contraseña?" link, and a "¿No tienes cuenta? Registrarse" link — matching the wireframe specification.

R21. WHEN a user submits the login form with valid credentials THE SYSTEM SHALL store the received `accessToken` in Zustand auth store and redirect the user to their role-specific route.

R22. WHEN the authenticated user's role is `OPERADOR` THE SYSTEM SHALL redirect them to `/dashboard`.

R23. WHEN the authenticated user's role is `REPARTIDOR` THE SYSTEM SHALL redirect them to `/repartidor`.

R24. WHEN the authenticated user's role is `CLIENTE` THE SYSTEM SHALL redirect them to `/tracking`.

R25. WHEN a user submits the login form and the server returns HTTP 401 THE SYSTEM SHALL display an error message via a Toast notification without navigating away from the login screen.

R26. WHEN a user attempts to access a protected route without a valid `accessToken` THE SYSTEM SHALL redirect them to `/login`.

---

## Frontend: Interceptor de refresh automático

R27. WHEN an API request returns HTTP 401 with `error: "EXPIRED_TOKEN"` THE SYSTEM SHALL automatically call `POST /api/v1/auth/refresh` to obtain a new `accessToken`, update the Zustand auth store, and retry the original request transparently.

R28. IF the automatic refresh call also fails with HTTP 401 THE SYSTEM SHALL clear the auth store and redirect the user to `/login`.

---

## Seguridad

R29. THE SYSTEM SHALL hash all passwords using bcrypt with a minimum of 12 rounds before storing them, and SHALL use `bcrypt.compare` during login validation.

R30. THE SYSTEM SHALL validate all login request inputs with a Zod schema before any database query is executed.
