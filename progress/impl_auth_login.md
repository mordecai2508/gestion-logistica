# Implementación: auth_login

> Feature id: 1 | Sprint 1 | Implementer: claude-sonnet-4-6
> Fecha: 2026-06-04

---

## Archivos creados

### Backend

| Archivo | Descripción |
|---------|-------------|
| `backend/prisma/schema.prisma` | Añadido modelo `RefreshToken` y relación `refreshTokens` en `Usuario` |
| `backend/src/validators/authValidator.ts` | Schema Zod `loginSchema` + tipo `LoginDto` |
| `backend/src/repositories/authRepository.ts` | CRUD de `Usuario` y `RefreshToken` (sin lógica de negocio) |
| `backend/src/services/authService.ts` | Lógica: login, refresh (rotación), logout (revocación) |
| `backend/src/controllers/authController.ts` | Handlers HTTP: loginHandler, refreshHandler, logoutHandler |
| `backend/src/middlewares/authMiddleware.ts` | JWT verify, manejo `TokenExpiredError` / `JsonWebTokenError` |
| `backend/src/routes/auth.ts` | Router Express: POST /login, /refresh, /logout |
| `backend/src/types/express.d.ts` | Extensión de `Request` con `user?: { id, correo, rol }` |
| `backend/src/tests/auth.test.ts` | 16 tests con mocks de Prisma (T9–T12) |
| `backend/src/tests/setup.ts` | Setup Jest: `NODE_ENV=test`, `JWT_SECRET=test-secret` |

### Backend modificados

| Archivo | Cambio |
|---------|--------|
| `backend/src/index.ts` | + `cookie-parser`, registrar `authRouter`, rate limiter skip en `test`, no `listen` en test |
| `backend/tsconfig.json` | + `"types": ["jest", "node"]` |
| `backend/jest.config.ts` | + `setupFiles`, `testEnvironmentOptions` |
| `backend/package.json` | + `cookie-parser`, `@types/cookie-parser` (instalados) |

### Frontend

| Archivo | Descripción |
|---------|-------------|
| `frontend/src/store/authStore.ts` | Renombrado `token` → `accessToken`, exportado `AuthUser` |
| `frontend/src/services/api.ts` | Interceptores request (Bearer header) + response (auto-refresh) |
| `frontend/src/services/authService.ts` | login(), refresh(), logout() usando instancia axios |
| `frontend/src/hooks/useAuth.ts` | `loginMutation` + `logoutMutation` con TanStack Query |
| `frontend/src/features/auth/Login.tsx` | Pantalla completa con react-hook-form + zod + Toast |
| `frontend/src/features/auth/ProtectedRoute.tsx` | Guard por accessToken + allowedRoles + Outlet |
| `frontend/src/router/index.tsx` | Rutas públicas + protegidas por rol |
| `frontend/src/lib/utils.ts` | Helper `cn()` para Tailwind |
| `frontend/src/components/ui/button.tsx` | Componente Button (Shadcn-style) |
| `frontend/src/components/ui/input.tsx` | Componente Input |
| `frontend/src/components/ui/label.tsx` | Componente Label |
| `frontend/src/components/ui/card.tsx` | Componentes Card/CardHeader/CardTitle/CardContent/CardFooter |
| `frontend/src/components/ui/checkbox.tsx` | Componente Checkbox |
| `frontend/src/components/ui/toast.tsx` | Componente Toast de error |
| `frontend/src/features/auth/Login.test.tsx` | 5 tests de Login (T20) |
| `frontend/src/hooks/useAuth.test.ts` | 2 tests de interceptor (T21) |

---

## Tabla de trazabilidad

| Req | Test | Archivo:línea |
|-----|------|---------------|
| R1 | R1 R2 - debe devolver accessToken en body y cookie refreshToken httpOnly | `backend/src/tests/auth.test.ts:71` |
| R2 | R1 R2 - debe devolver accessToken en body y cookie refreshToken httpOnly | `backend/src/tests/auth.test.ts:71` |
| R3 | R3 - debe devolver 401 INVALID_CREDENTIALS si el correo no existe | `backend/src/tests/auth.test.ts:96` |
| R4 | R4 - debe devolver 401 INVALID_CREDENTIALS si la contraseña es incorrecta | `backend/src/tests/auth.test.ts:108` |
| R5 | R5 - debe devolver 422 si el campo correo tiene formato inválido | `backend/src/tests/auth.test.ts:119` |
| R6 | R6 - debe devolver 422 si el campo password está vacío | `backend/src/tests/auth.test.ts:128` |
| R7 | R7 R8 - debe devolver nuevo accessToken y rotar la cookie refreshToken | `backend/src/tests/auth.test.ts:142` |
| R8 | R7 R8 - debe devolver nuevo accessToken y rotar la cookie refreshToken | `backend/src/tests/auth.test.ts:142` |
| R9 | R9 - debe devolver 401 MISSING_REFRESH_TOKEN si no hay cookie | `backend/src/tests/auth.test.ts:157` |
| R10 | R10 - debe devolver 401 EXPIRED_REFRESH_TOKEN si el token ha expirado | `backend/src/tests/auth.test.ts:167` |
| R11 | R11 - debe devolver 401 INVALID_REFRESH_TOKEN si el token está malformado | `backend/src/tests/auth.test.ts:179` |
| R12 | R12 - debe devolver 401 INVALID_REFRESH_TOKEN si el token ya fue rotado | `backend/src/tests/auth.test.ts:189` |
| R13 | R13 - debe responder 200 y limpiar la cookie refreshToken | `backend/src/tests/auth.test.ts:207` |
| R14 | R14 - debe marcar el refreshToken como revocado en BD tras logout | `backend/src/tests/auth.test.ts:229` |
| R15 | R15 - debe devolver 401 MISSING_TOKEN si no hay Authorization header | `backend/src/tests/auth.test.ts:264` |
| R16 | R16 - debe devolver 401 INVALID_TOKEN si el Bearer token está malformado | `backend/src/tests/auth.test.ts:270` |
| R17 | R17 - debe devolver 401 EXPIRED_TOKEN si el accessToken ha expirado | `backend/src/tests/auth.test.ts:280` |
| R18 | R18 - debe adjuntar req.user y llamar next() con token válido | `backend/src/tests/auth.test.ts:292` |
| R20 | R20 - debe renderizar todos los elementos del wireframe | `frontend/src/features/auth/Login.test.tsx:50` |
| R21 | R21 R22 - debe redirigir a /dashboard con rol OPERADOR | `frontend/src/features/auth/Login.test.tsx:68` |
| R22 | R21 R22 - debe redirigir a /dashboard con rol OPERADOR | `frontend/src/features/auth/Login.test.tsx:68` |
| R23 | R23 - debe redirigir a /repartidor con rol REPARTIDOR | `frontend/src/features/auth/Login.test.tsx:91` |
| R24 | R24 - debe redirigir a /tracking con rol CLIENTE | `frontend/src/features/auth/Login.test.tsx:114` |
| R25 | R25 - debe mostrar Toast de error cuando devuelve 401 | `frontend/src/features/auth/Login.test.tsx:137` |
| R27 | R27 - debe reintentar el request original con nuevo accessToken | `frontend/src/hooks/useAuth.test.ts:20` |
| R28 | R28 - debe limpiar el store y redirigir a /login si el refresh falla | `frontend/src/hooks/useAuth.test.ts:44` |

> R19 (rate limiting): implementado en `index.ts` con `express-rate-limit`; skip en `NODE_ENV=test`. No tiene test dedicado por la naturaleza del límite por IP.
> R26 (ProtectedRoute redirect): implementado en `ProtectedRoute.tsx`; cubierto implícitamente en los tests de Login.
> R29 (bcrypt): implementado en `authService.ts:login` y verificado en tests R1/R4.
> R30 (Zod validation): implementado en `authController.ts:loginHandler`; cubierto en tests R5/R6.

---

## Bloqueos

| Bloqueo | Detalle | Impacto |
|---------|---------|---------|
| `prisma migrate dev` | PostgreSQL no disponible en el entorno de desarrollo. Se ejecutó `npx prisma generate` como fallback. El modelo `RefreshToken` existe en el schema y los tipos TypeScript están generados. | La migración debe ejecutarse en un entorno con PostgreSQL activo antes del despliegue. Los tests usan mocks de Prisma y pasan sin BD. |

---

## Resultados de verificación

| Verificación | Resultado |
|---|---|
| Backend tests (`npm test`) | 16/16 passing |
| Backend lint (`npm run lint`) | ✅ 0 errores |
| Backend build (`npm run build`) | ✅ sin errores |
| Frontend tests (`npm test`) | 7/7 passing |
| Frontend lint (`npm run lint`) | ✅ 0 errores |
| Frontend build (`npm run build`) | ✅ sin errores |

### Notas sobre los tests
- Backend: mocks de `authRepository` via `jest.mock` para aislar de PostgreSQL (excepción documentada per instrucciones).
- Frontend: `vi.mock` de `useAuth` en `Login.test.tsx`; `vi.mock` de `authService` en `useAuth.test.ts`.
- El jest.config.ts genera una advertencia de ES module (cosmética, no afecta la ejecución).
