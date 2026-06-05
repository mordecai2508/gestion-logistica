# Design — auth_login

> Feature: Login y autenticación JWT (id: 1, sprint 1)

---

## 1. Endpoints

| Método | Ruta | Auth requerida | Payload entrada | Payload salida | HTTP |
|--------|------|----------------|-----------------|----------------|------|
| POST | `/api/v1/auth/login` | No | `{ correo: string, password: string }` | `{ data: { accessToken: string, user: { id, nombre, correo, rol } }, message: string, status: 200 }` + cookie `refreshToken` | 200 |
| POST | `/api/v1/auth/refresh` | No (cookie) | (ninguno — lee cookie `refreshToken`) | `{ data: { accessToken: string }, message: string, status: 200 }` + cookie `refreshToken` rotada | 200 |
| POST | `/api/v1/auth/logout` | No | (ninguno) | `{ data: null, message: string, status: 200 }` + cookie `refreshToken` eliminada | 200 |

### Códigos de error relevantes

| Caso | HTTP | `error` |
|------|------|---------|
| Credenciales inválidas (login) | 401 | `INVALID_CREDENTIALS` |
| Cookie ausente (refresh) | 401 | `MISSING_REFRESH_TOKEN` |
| Cookie expirada (refresh) | 401 | `EXPIRED_REFRESH_TOKEN` |
| Token malformado/rotado (refresh) | 401 | `INVALID_REFRESH_TOKEN` |
| Token ausente (middleware) | 401 | `MISSING_TOKEN` |
| Token malformado (middleware) | 401 | `INVALID_TOKEN` |
| Token expirado (middleware) | 401 | `EXPIRED_TOKEN` |
| Validación Zod fallida | 422 | (detalle de campos) |
| Rate limit superado | 429 | (manejado por `express-rate-limit`) |

---

## 2. Schema Prisma

No se requieren modelos nuevos. La feature usa los modelos ya existentes en `backend/prisma/schema.prisma`:

### Modelos utilizados

**`Usuario`** — campos empleados en login:
- `id` (String, cuid)
- `correo` (String, unique) — campo de búsqueda en login
- `password` (String) — comparado con `bcrypt.compare`
- `rol` (enum `Rol`: CLIENTE | OPERADOR | REPARTIDOR) — incluido en el JWT payload y en la respuesta
- `nombre` (String) — incluido en la respuesta de login

### Nuevo modelo: `RefreshToken`

Se añade el modelo `RefreshToken` al schema para implementar rotación con invalidación (ver sección 5):

```prisma
model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  usuarioId String
  expiresAt DateTime
  revocado  Boolean  @default(false)
  createdAt DateTime @default(now())
  usuario   Usuario  @relation(fields: [usuarioId], references: [id])
}
```

Y en el modelo `Usuario` se añade la relación inversa:
```prisma
refreshTokens RefreshToken[]
```

**Total: 1 modelo nuevo (`RefreshToken`), 0 modelos modificados significativamente.**

---

## 3. Lógica de negocio

### Flujo de login (`authService.login`)

1. Recibir DTO validado por Zod: `{ correo, password }`.
2. Buscar `Usuario` en BD por `correo` via `authRepository.findByCorreo(correo)`.
3. Si el usuario no existe → lanzar error `INVALID_CREDENTIALS` (HTTP 401). No revelar si el correo existe.
4. Comparar password con `bcrypt.compare(password, usuario.password)`.
5. Si no coincide → lanzar error `INVALID_CREDENTIALS` (HTTP 401).
6. Generar `accessToken`: `jwt.sign({ id, correo, rol }, JWT_SECRET, { expiresIn: '15m' })`.
7. Generar valor aleatorio `refreshTokenValue = crypto.randomBytes(64).toString('hex')`.
8. Persistir `RefreshToken` en BD: `{ token: refreshTokenValue, usuarioId: id, expiresAt: now + 7 días }` via `authRepository.createRefreshToken(...)`.
9. Devolver `{ accessToken, user: { id, nombre, correo, rol } }` al controlador.
10. El controlador establece la cookie `refreshToken` con opciones httpOnly, Secure, SameSite=Strict, maxAge=7días.

### Flujo de refresh (`authService.refresh`)

1. Leer cookie `refreshToken` de `req.cookies`. Si ausente → error `MISSING_REFRESH_TOKEN`.
2. Buscar el token en BD: `authRepository.findRefreshToken(tokenValue)`.
3. Si no existe o `revocado === true` → error `INVALID_REFRESH_TOKEN`.
4. Si `expiresAt < now` → error `EXPIRED_REFRESH_TOKEN`.
5. Invalidar token antiguo: `authRepository.revokeRefreshToken(id)`.
6. Generar nuevo `refreshTokenValue` y persistirlo en BD.
7. Generar nuevo `accessToken` con los datos del `usuario` relacionado.
8. Devolver `{ accessToken }`. El controlador rota la cookie.

### Flujo de logout (`authService.logout`)

1. Leer cookie `refreshToken`. Si existe, buscar en BD y marcarlo como `revocado = true`.
2. Si no existe cookie, proceder igualmente (logout idempotente).
3. El controlador limpia la cookie con `res.clearCookie('refreshToken')`.

### authMiddleware

1. Leer header `Authorization`. Si ausente → error `MISSING_TOKEN`.
2. Extraer el Bearer token. Si formato incorrecto → error `INVALID_TOKEN`.
3. `jwt.verify(token, JWT_SECRET)`. Si falla por expiración → error `EXPIRED_TOKEN`. Si falla por otra razón → error `INVALID_TOKEN`.
4. Adjuntar payload decodificado a `req.user: { id, correo, rol }`.
5. Llamar `next()`.

---

## 4. Frontend

### Árbol de archivos relevantes

```
frontend/src/
├── features/auth/
│   ├── Login.tsx                  ← pantalla de login (componente principal)
│   └── ProtectedRoute.tsx         ← wrapper de rutas protegidas por rol
├── hooks/
│   └── useAuth.ts                 ← useMutation para login/logout, lógica de redirección
├── services/
│   └── authService.ts             ← llamadas HTTP a /auth/login, /auth/refresh, /auth/logout
├── store/
│   └── authStore.ts               ← Zustand: { user, accessToken, setAuth, clearAuth }
└── router/
    └── index.tsx                  ← rutas con ProtectedRoute aplicado
```

### `Login.tsx`

- Usa `react-hook-form` + schema Zod para validación en cliente.
- Campos: correo (email input), password (password input), checkbox "Recordarme".
- Botón "INICIAR SESIÓN": dispara `useAuth.loginMutation`.
- Links: "¿Olvidó su contraseña?" → `/forgot-password`; "¿No tienes cuenta? Registrarse" → `/register`.
- En error 401: muestra Toast con mensaje del servidor.
- Estilo con Shadcn/UI: `Input`, `Button`, `Checkbox`, `Label`, `Card`.

### `ProtectedRoute.tsx`

- Lee `accessToken` y `user.rol` del Zustand auth store.
- Si no hay token → redirige a `/login`.
- Si el rol no tiene permiso para la ruta → redirige a la ruta base del rol.
- Renderiza `<Outlet />` si pasa la validación.

### Lógica de redirección por rol

```
OPERADOR   → /dashboard
REPARTIDOR → /repartidor
CLIENTE    → /tracking
```

Implementada en `useAuth.ts` dentro del `onSuccess` de `loginMutation`.

### `authService.ts`

```typescript
// Usa instancia axios configurada con baseURL = VITE_API_URL
export const authService = {
  login(dto: LoginDto): Promise<LoginResponse>,
  refresh(): Promise<{ accessToken: string }>,
  logout(): Promise<void>,
}
```

### Interceptor axios (refresh automático)

Configurado en la instancia axios global (`services/api.ts`):
- Response interceptor: si recibe 401 con `error === "EXPIRED_TOKEN"` → llama `authService.refresh()` → actualiza `authStore` → reintenta request original.
- Si el refresh también falla → llama `authStore.clearAuth()` y redirige a `/login`.

### `authStore.ts` (Zustand)

```typescript
interface AuthState {
  user: { id: string; nombre: string; correo: string; rol: Rol } | null;
  accessToken: string | null;
  setAuth: (user: AuthState['user'], token: string) => void;
  clearAuth: () => void;
}
```

---

## 5. Decisión técnica: almacenamiento de RefreshToken

**Opción elegida: RefreshToken almacenado en base de datos.**

**Opción descartada:** RefreshToken stateless (JWT firmado en cookie).

**Justificación:**

Un refreshToken stateless no puede invalidarse antes de su expiración natural. Esto significa que si un usuario hace logout o su sesión es comprometida, el token sigue siendo válido hasta los 7 días. En un sistema de logística con roles sensibles (OPERADOR, REPARTIDOR), esto es inaceptable.

Al almacenar el token en BD:
- El logout real es posible: el token se marca `revocado = true` inmediatamente.
- La rotación de tokens detecta replay attacks: si se intenta usar un token ya rotado, se detecta en BD y se rechaza.
- Los administradores pueden revocar sesiones activas desde el backoffice en el futuro.

**Tradeoff aceptado:** Cada request de refresh implica una consulta a BD. Dado el volumen esperado (usuarios concurrentes en el rango de decenas), este costo es despreciable frente a la ganancia de seguridad.

---

## 6. Seguridad

| Aspecto | Implementación |
|---------|----------------|
| Rate limiting | `express-rate-limit` en `/api/v1/auth/*`: máx 10 req/min/IP (ya configurado en `index.ts`) |
| Hashing de contraseñas | `bcrypt` con `rounds = 12` |
| Cookie refreshToken | `httpOnly: true`, `secure: true` (solo HTTPS en producción), `sameSite: 'strict'`, `maxAge: 7 * 24 * 60 * 60 * 1000` |
| Validación de inputs | Schema Zod `loginSchema` aplicado en el controlador antes de cualquier lógica |
| Mensajes de error | Credenciales inválidas retorna siempre `INVALID_CREDENTIALS` sin distinguir "correo no existe" de "password incorrecto" (evita enumeración de usuarios) |
| Tokens JWT | `accessToken` firmado con `JWT_SECRET` (env var), algoritmo HS256, expiry 15 min |
| RefreshToken en BD | Valor opaco (`crypto.randomBytes(64).toString('hex')`), no JWT, almacenado con `expiresAt` y flag `revocado` |
| Variables de entorno requeridas | `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL`, `NODE_ENV` |
