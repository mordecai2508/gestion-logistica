# Design — auth_perfil

> Describe el "cómo". Referencia directa al stack y convenciones de
> `docs/architecture.md` y `docs/conventions.md`.

---

## 1. Endpoints

| # | Método | Ruta | Auth | Body (entrada) | Respuesta exitosa | Código |
|---|--------|------|------|----------------|-------------------|--------|
| 1 | GET | `/api/v1/users/me` | Bearer token (authMiddleware) | — | `{ data: PerfilDto, message, status: 200 }` | 200 |
| 2 | PATCH | `/api/v1/users/me` | Bearer token (authMiddleware) | `{ nombre?: string, telefono?: string }` | `{ data: PerfilDto, message, status: 200 }` | 200 |
| 3 | POST | `/api/v1/auth/forgot-password` | Ninguna | `{ correo: string }` | `{ data: null, message, status: 200 }` | 200 |
| 4 | POST | `/api/v1/auth/reset-password` | Ninguna | `{ token: string, newPassword: string }` | `{ data: null, message, status: 200 }` | 200 |

**PerfilDto** (interfaz en `backend/src/types/userTypes.ts`):
```typescript
interface PerfilDto {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  rol: Rol;
  createdAt: string;   // ISO 8601 UTC
  updatedAt: string;   // ISO 8601 UTC
}
```

**Códigos de error:**

| Situación | Código HTTP | `error` |
|---|---|---|
| Sin token / token inválido | 401 | `MISSING_TOKEN` / `INVALID_TOKEN` / `EXPIRED_TOKEN` |
| Validación Zod fallida | 422 | detalle de campos |
| Token de reset inválido / expirado / usado | 400 | `INVALID_RESET_TOKEN` |

---

## 2. Schema Prisma — modelos relevantes

No se requieren migraciones nuevas. Todos los modelos ya existen.

### `Usuario` (campos usados por esta feature)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `nombre` | `String` | Actualizable vía PATCH |
| `correo` | `String` unique | Solo lectura desde esta feature |
| `password` | `String` | Actualizable solo vía reset-password (hash bcrypt) |
| `telefono` | `String?` | Actualizable vía PATCH |
| `rol` | `Rol` enum | Solo lectura desde esta feature |
| `createdAt` | `DateTime` | Solo lectura |
| `updatedAt` | `DateTime` | Auto-updated por Prisma |

### `PasswordResetToken` (ya definido en schema.prisma)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | `String` (cuid) | PK |
| `token` | `String` unique | Token opaco (hex de 32 bytes) |
| `usuarioId` | `String` | FK → Usuario.id |
| `expiresAt` | `DateTime` | `now() + 1h` al crear |
| `usado` | `Boolean` | Default `false`; se pone `true` tras reset exitoso |
| `createdAt` | `DateTime` | Auto |

El campo de invalidación se llama **`usado`** (confirmado en `schema.prisma` línea 181).

---

## 3. Lógica de negocio

### GET /users/me
1. `authMiddleware` extrae `req.user.id` del JWT.
2. `userService.getPerfil(userId)` llama a `userRepository.findById(id)`.
3. El repositorio devuelve el `Usuario` completo; el servicio proyecta solo los campos del `PerfilDto`.
4. El controlador responde `200` con `{ data: perfilDto, message: "Perfil obtenido", status: 200 }`.

### PATCH /users/me
1. `authMiddleware` extrae `req.user.id`.
2. `userSchema` (Zod) valida el body: `nombre` y `telefono` opcionales, pero al menos uno presente, ambos mínimo 1 carácter si presentes.
3. `userService.updatePerfil(userId, dto)` llama a `userRepository.updatePerfil(id, data)`.
4. El repositorio ejecuta `prisma.usuario.update({ where: { id }, data })` con solo los campos permitidos.
5. El servicio proyecta y devuelve `PerfilDto` actualizado.

### POST /auth/forgot-password
1. `forgotPasswordSchema` (Zod) valida que `correo` tenga formato de email.
2. `userService.forgotPassword(correo)`:
   a. Llama a `authRepository.findByCorreo(correo)`.
   b. **Si el usuario no existe**: retorna sin hacer nada (el controlador responde 200 igual).
   c. **Si el usuario existe**:
      - Genera token: `crypto.randomBytes(32).toString('hex')`.
      - Crea registro: `userRepository.createPasswordResetToken({ token, usuarioId, expiresAt: new Date(Date.now() + 3600_000), usado: false })`.
      - Llama a `mailer.sendPasswordResetEmail(correo, token)`.
3. El controlador siempre responde `200` independientemente del resultado interno.

### POST /auth/reset-password
1. `resetPasswordSchema` (Zod) valida: `token` (string, min 1), `newPassword` (string, min 8).
2. `userService.resetPassword(token, newPassword)`:
   a. `userRepository.findPasswordResetToken(token)` busca el registro.
   b. Valida: el registro existe, `usado === false`, `expiresAt > new Date()`.
   c. Si alguna condición falla: lanza error con `statusCode: 400`, `error: "INVALID_RESET_TOKEN"`.
   d. Hashea: `bcrypt.hash(newPassword, 12)`.
   e. Actualiza contraseña: `prisma.usuario.update({ where: { id: token.usuarioId }, data: { password: hashedPassword } })`.
   f. Marca token: `userRepository.markPasswordResetTokenUsado(token.id)`.
3. El controlador responde `200`.

---

## 4. Frontend

### Pantallas nuevas en `frontend/src/features/auth/`

#### `Perfil.tsx`
- Ruta: `/perfil` (protegida para todos los roles autenticados).
- Muestra: nombre, correo (read-only), teléfono, rol (badge).
- Formulario de edición con campos `nombre` y `telefono`, validados con Zod + React Hook Form.
- Botón "Guardar cambios" — ejecuta `useMutation` de TanStack Query.
- Toast de éxito/error usando Shadcn/UI `Toast`.

#### `ForgotPassword.tsx`
- Ruta: `/forgot-password` (pública).
- Formulario con campo `correo` (email).
- Al submit llama a `authService.forgotPassword(correo)`.
- Muestra mensaje genérico de confirmación (sin revelar si el correo existe).

#### `ResetPassword.tsx`
- Ruta: `/reset-password` (pública; lee `?token=` de la query string).
- Formulario con campos `newPassword` y `confirmPassword`.
- Validación Zod: `newPassword` min 8, `confirmPassword` debe coincidir.
- Al submit llama a `authService.resetPassword(token, newPassword)`.
- En éxito: redirige a `/login` con mensaje de éxito.
- En error (400): muestra "El enlace es inválido o ha expirado".

### Hooks nuevos en `frontend/src/hooks/`

- `usePerfil.ts` — `useQuery({ queryKey: ['perfil'], queryFn: userService.getPerfil })`.
- `useUpdatePerfil.ts` — `useMutation({ mutationFn: userService.updatePerfil })`.

### Servicios frontend en `frontend/src/services/`

- `userService.ts` — funciones: `getPerfil()`, `updatePerfil(dto)`.
- `authService.ts` (existente) — añadir: `forgotPassword(correo)`, `resetPassword(token, newPassword)`.

### Router

Añadir en `frontend/src/router/`:
- `/perfil` → `<ProtectedRoute>` (todos los roles) → `<Perfil />`
- `/forgot-password` → público → `<ForgotPassword />`
- `/reset-password` → público → `<ResetPassword />`

El enlace "¿Olvidó su contraseña?" en `Login.tsx` apunta a `/forgot-password` (ya referenciado en el wireframe de Login).

---

## 5. Decisión técnica — Token opaco vs JWT para reset

**Opción elegida: token opaco** (`crypto.randomBytes(32).toString('hex')`) almacenado en `PasswordResetToken`.

**Razones:**
- El modelo `PasswordResetToken` ya existe en `schema.prisma` con todos los campos necesarios (`token`, `expiresAt`, `usado`).
- Un token opaco permite invalidación explícita en DB (campo `usado`), lo cual es imposible con JWT sin mantener una lista negra.
- Un JWT de reset podría reutilizarse en la ventana de 1h si no se invalida tras el primer uso; el token opaco con `usado = true` cierra ese vector de ataque.
- Coherencia con el patrón ya establecido en `RefreshToken` (también token opaco en DB).

**Opción descartada: JWT de corta duración para reset.**
Requeriría lista negra o re-verificación en BD de todos modos, añadiendo complejidad sin beneficio.

---

## 6. Seguridad

- **authMiddleware** aplicado en `GET /users/me` y `PATCH /users/me`; ausente en forgot y reset (flujos pre-autenticación).
- **No revelar existencia de correo**: `POST /auth/forgot-password` siempre devuelve HTTP 200 con el mismo mensaje, independientemente de si el correo existe en la DB.
- **Token de un solo uso**: campo `usado` en `PasswordResetToken` se marca `true` inmediatamente tras el reset exitoso.
- **Expiración de 1 hora**: `expiresAt = now() + 3600_000 ms`; se valida en el servicio antes de procesar el reset.
- **bcrypt rounds = 12**: consistente con el resto del proyecto (`authService.ts` línea 140).
- **Campos no actualizables**: el `userSchema` Zod solo admite `nombre` y `telefono`; el repositorio `updatePerfil` solo pasa esos dos campos a Prisma, nunca `correo`, `rol` ni `password`.
- **Rate limiting**: el prefijo `/api/v1/auth/*` ya tiene rate limiting configurado (max 10 req/min por IP, según `architecture.md`); `POST /auth/forgot-password` y `POST /auth/reset-password` quedan cubiertos.
- **Variables de entorno**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`, `FRONTEND_URL` nunca en código fuente; definidos en `.env` y documentados en `.env.example`.
- **NODE_ENV=test**: `mailer.ts` exporta la función `sendPasswordResetEmail` de forma que puede ser sustituida por spy/mock en Jest (p.ej. exportando el transporter como dependencia inyectable o usando `jest.mock('../lib/mailer')`).
