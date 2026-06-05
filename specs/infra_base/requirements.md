# Requirements — infra_base

> Feature con `"sdd": false`. Requisitos derivados directamente de los criterios de
> aceptación de `feature_list.json`. No pasa por puerta de aprobación SDD.

---

R1. THE SYSTEM SHALL provide a `backend/` directory runnable with `npm run dev`
    (Express + TypeScript + Prisma) without errors.

R2. THE SYSTEM SHALL provide a `frontend/` directory runnable with `npm run dev`
    on port 5173 (Vite + React + TypeScript) without errors.

R3. THE SYSTEM SHALL include a Prisma schema (`backend/prisma/schema.prisma`) with
    all domain models: Usuario, Cliente, Operador, Repartidor, Envio, Ruta,
    Vehiculo, EventoEnvio, Incidencia, Notificacion, PasswordResetToken.

R4. THE SYSTEM SHALL apply the Prisma migration (`npx prisma migrate dev`) without
    errors against a PostgreSQL database configured via `DATABASE_URL`.

R5. THE SYSTEM SHALL pass ESLint (`npm run lint`) without errors in both
    `backend/` and `frontend/` workspaces.

R6. THE SYSTEM SHALL have `init.sh` return exit code 0 when all checks pass
    (Node.js, npm, harness files, backend package.json, frontend package.json).
