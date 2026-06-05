# Tasks — infra_base

> Feature con `"sdd": false`. No requiere aprobación humana previa.
> El implementer ejecuta estas tasks en orden, marcando cada una `[x]` al completar.
> Referencia de requisitos en `specs/infra_base/requirements.md`.

---

## BACKEND

- [x] T1. Crear `backend/` y ejecutar `npm init -y` para generar `package.json`.
- [x] T2. Instalar dependencias de producción del backend:
  `express @types/express prisma @prisma/client dotenv zod bcrypt @types/bcrypt jsonwebtoken @types/jsonwebtoken cors @types/cors helmet express-rate-limit socket.io nodemailer @types/nodemailer multer @types/multer`
- [x] T3. Instalar dependencias de desarrollo del backend:
  `typescript ts-node ts-node-dev @types/node eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser jest ts-jest @types/jest supertest @types/supertest`
- [x] T4. Crear `backend/tsconfig.json` con `strict: true`, `target: ES2020`,
  `module: commonjs`, `outDir: dist`, `rootDir: src`, `esModuleInterop: true`,
  `resolveJsonModule: true`, `skipLibCheck: true`.
- [x] T5. Crear `backend/.eslintrc.json` con parser `@typescript-eslint/parser`,
  plugin `@typescript-eslint`, rules: `no-explicit-any: error`, `no-console: warn`
  (solo warn, permitir `console.error` en producción).
- [x] T6. Crear `backend/jest.config.ts` configurado con `ts-jest`,
  preset `ts-jest`, testEnvironment `node`, testMatch `**/*.test.ts`.
- [x] T7. Actualizar `backend/package.json` scripts:
  `"dev": "ts-node-dev --respawn --transpile-only src/index.ts"`,
  `"build": "tsc"`, `"start": "node dist/index.js"`,
  `"lint": "eslint src --ext .ts"`, `"test": "jest --runInBand"`.
- [x] T8. Crear `backend/.env.example` con las variables definidas en `specs/infra_base/design.md`.
- [x] T9. Crear `backend/prisma/schema.prisma` completo con todos los modelos y enums
  definidos en `specs/infra_base/design.md` (R3).
  Asegurarse de incluir: Usuario, Cliente, Operador, Repartidor, Envio, Ruta,
  Vehiculo, EventoEnvio, Incidencia, Notificacion, PasswordResetToken.
  Datasource: `provider = "postgresql"`, `url = env("DATABASE_URL")`.
  Generator: `provider = "prisma-client-js"`.
- [x] T10. Crear la estructura de directorios en `backend/src/`:
  `routes/`, `middlewares/`, `controllers/`, `services/`,
  `repositories/`, `sockets/`, `types/`, `validators/`.
  Cada carpeta con un archivo `.gitkeep` vacío (excepto `middlewares/`).
- [x] T11. Crear `backend/src/middlewares/errorHandler.ts`:
  Middleware Express de 4 parámetros que captura errores Zod (devuelve 422),
  errores con `statusCode` (devuelve ese código), y resto (500).
  Formato de respuesta: `{ error: string, message: string, statusCode: number }`.
- [x] T12. Crear `backend/src/index.ts`:
  - Carga dotenv (`dotenv/config`).
  - Crea Express app.
  - Aplica `helmet()`, `cors({ origin: process.env.FRONTEND_URL, credentials: true })`,
    `express.json()`.
  - Rate-limiter en `/api/v1/auth` (windowMs: 60_000, max: 10).
  - Monta errorHandler al final del pipeline.
  - Crea `http.Server`, adjunta `Socket.IO` con cors config equivalente.
  - `server.listen(process.env.PORT ?? 3001)`.
- [x] T13. Verificar que `cd backend && npm run build` termina sin errores TypeScript.
- [x] T14. Verificar que `cd backend && npm run lint` termina sin errores ESLint.

---

## FRONTEND

- [x] T15. Crear el proyecto Vite desde `gestion-logistica/` raíz:
  `npm create vite@latest frontend -- --template react-ts`.
  (Esto genera `frontend/` con Vite + React + TypeScript preconfigurado.)
- [x] T16. Instalar dependencias adicionales del frontend desde `frontend/`:
  `react-router-dom @tanstack/react-query zustand axios zod react-hook-form @hookform/resolvers leaflet @types/leaflet react-leaflet socket.io-client lucide-react class-variance-authority clsx tailwind-merge`
- [x] T17. Instalar dependencias de desarrollo del frontend:
  `vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom`
- [x] T18. Instalar y configurar Tailwind CSS en `frontend/`:
  `npm install -D tailwindcss postcss autoprefixer` y `npx tailwindcss init -p`.
  Actualizar `tailwind.config.js` con content paths para `src/**/*.{ts,tsx}`.
  Reemplazar `src/index.css` con las directivas Tailwind: `@tailwind base; @tailwind components; @tailwind utilities;`.
- [x] T19. Actualizar `frontend/tsconfig.json`:
  Agregar `"baseUrl": "."`, `"paths": { "@/*": ["./src/*"] }`, `strict: true`.
- [x] T20. Actualizar `frontend/vite.config.ts`:
  Agregar alias `@` → `./src`, configurar `server.port = 5173`.
  Agregar configuración de test Vitest: `{ globals: true, environment: 'jsdom', setupFiles: './src/test/setup.ts' }`.
- [x] T21. Crear `frontend/src/test/setup.ts` con `import '@testing-library/jest-dom'`.
- [x] T22. Crear `frontend/.eslintrc.json` con parser TypeScript, plugin `@typescript-eslint`,
  reglas equivalentes al backend.
- [x] T23. Actualizar `frontend/package.json` scripts:
  `"lint": "eslint src --ext .ts,.tsx"`, `"test": "vitest run"`.
- [x] T24. Crear `frontend/.env.example` con las variables definidas en `specs/infra_base/design.md`.
- [x] T25. Crear la estructura de directorios en `frontend/src/`:
  `services/`, `hooks/`, `store/`, `components/ui/`, `components/shared/`,
  `features/auth/`, `features/envios/`, `features/tracking/`, `features/rutas/`,
  `features/vehiculos/`, `features/repartidor/`, `features/incidencias/`,
  `features/notificaciones/`, `router/`, `types/`.
  Cada carpeta con archivo `.gitkeep` (excepto las que ya tienen archivos).
- [x] T26. Crear `frontend/src/services/api.ts`:
  Instancia Axios con `baseURL: import.meta.env.VITE_API_URL`, `withCredentials: true`.
  Interceptor de request: adjunta `Authorization: Bearer <token>` desde authStore si existe.
  (El interceptor de refresh se implementa en `auth_login`.)
- [x] T27. Crear `frontend/src/store/authStore.ts` con Zustand:
  Estado: `{ user: null | { id, nombre, correo, rol }, token: null | string }`.
  Acciones: `setAuth(user, token)`, `clearAuth()`.
- [x] T28. Crear `frontend/src/router/index.tsx`:
  BrowserRouter con rutas placeholder:
  `/login`, `/register`, `/dashboard`, `/tracking`, `/repartidor`, `/mis-envios`.
  Cada ruta renderiza un `<div>` con el nombre de la pantalla como texto.
- [x] T29. Actualizar `frontend/src/App.tsx` para montar `QueryClientProvider` (TanStack Query)
  y el router de `router/index.tsx`.
- [x] T30. Verificar que `cd frontend && npm run build` termina sin errores TypeScript/Vite.
- [x] T31. Verificar que `cd frontend && npm run lint` termina sin errores ESLint.

---

## VERIFICACIÓN FINAL

- [x] T32. Ejecutar `./init.sh` desde la raíz del proyecto y confirmar que retorna exit 0
  con `backend/package.json` y `frontend/package.json` verificados (R6).
- [x] T33. Crear `progress/impl_infra_base.md` con:
  - Lista de todos los archivos creados.
  - Resultado de verificación (build ✅, lint ✅).
  - Nota: prisma migrate se ejecutará cuando esté disponible una BD PostgreSQL.
