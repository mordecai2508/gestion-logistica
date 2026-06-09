# Design — vista_repartidor

---

## 1. Endpoints

### Decision: alias route vs. reuse existing endpoint

**Context.** Feature `entregas_confirmacion` (id 9) already implemented and registered:

```
GET /api/v1/entregas          → entregasRouter (backend/src/routes/entregas.ts)
                               → controller: listarMisEntregas
                               → service:    entregaService.listarMisEntregas(usuarioId)
```

The endpoint already:
- Requires `authMiddleware` + `roleMiddleware('REPARTIDOR')`.
- Returns `{ pendientes: EntregaListItemDto[], completadas: EntregaListItemDto[] }`.
- Classifies states identically to what this feature requires (PENDIENTE|EN_PREPARACION|EN_TRANSITO|EN_RUTA → pendientes; ENTREGADO|FALLIDO → completadas).

The acceptance criterion for `vista_repartidor` specifies `GET /api/v1/repartidor/entregas`. The frontend service currently calls `/entregas` (with no `repartidorId` query param needed since the controller ignores any query params and derives the repartidor from the JWT).

**Decision chosen: register an alias route `/api/v1/repartidor/entregas` that delegates to the same controller.**

Rationale: the acceptance criterion is an explicit contract. Adding a thin alias satisfies the contract without duplicating business logic. The existing route `/api/v1/entregas` is kept for backwards compatibility with `entregas_confirmacion` tests and the existing frontend service.

| Method | Route | Auth | Query | Response body | HTTP |
|--------|-------|------|-------|---------------|------|
| GET | `/api/v1/repartidor/entregas` | Bearer JWT (REPARTIDOR) | — | `{ data: { pendientes: EntregaListItemDto[], completadas: EntregaListItemDto[] }, message, status }` | 200 |
| GET | `/api/v1/entregas` | Bearer JWT (REPARTIDOR) | — | same as above | 200 (kept, no change) |

Error responses (same for both routes):

| Condition | HTTP | error code |
|-----------|------|------------|
| No token | 401 | `UNAUTHORIZED` |
| Non-REPARTIDOR role | 403 | `FORBIDDEN` |
| No Repartidor profile | 404 | `REPARTIDOR_NOT_FOUND` |

---

## 2. Schema Prisma

No schema changes required. All necessary models and enums already exist:
- `EstadoEnvio`: PENDIENTE, EN_PREPARACION, EN_TRANSITO, EN_RUTA, ENTREGADO, FALLIDO, CANCELADO.
- `Envio` → linked to `Ruta` → linked to `Repartidor`.
- `Repartidor` → linked to `Usuario`.

---

## 3. Business logic

### State classification (already implemented in `entregaService.listarMisEntregas`)

```
ESTADOS_PENDIENTES  = [PENDIENTE, EN_PREPARACION, EN_TRANSITO, EN_RUTA]
ESTADOS_COMPLETADOS = [ENTREGADO, FALLIDO]
CANCELADO is excluded from both lists
```

No changes to `entregaService.ts` are required.

### Rango horario

The `updatedAt` ISO 8601 field is the only date available on `EntregaListItemDto`. The wireframe shows a time range (e.g. "10:00 – 11:00"), which is not in the acceptance criteria and has no backing data field in the schema. **Decision: display `updatedAt` formatted as `DD/MM HH:mm` as a UI placeholder.** This is already implemented in `VistaRepartidor.tsx` via `formatRangoHorario(updatedAt)`. No backend change needed.

If a true delivery-window field is added in the future, a schema migration and DTO update will be required — document this as a known gap.

---

## 4. Frontend

### What already exists (from `entregas_confirmacion`, `layout_navegacion`)

| Asset | File | Status |
|-------|------|--------|
| Screen component | `frontend/src/features/repartidor/VistaRepartidor.tsx` | Exists — mostly complete |
| TanStack Query hook | `frontend/src/hooks/useEntregas.ts` | Exists — calls `/entregas` |
| HTTP service | `frontend/src/services/entregaService.ts` | Exists — `listarMisEntregas()` calls `/entregas` |
| Types | `frontend/src/types/entregaTypes.ts` | Exists — `EntregaListItemDto`, `EntregasAgrupadasDto` |
| Router entry | `frontend/src/router/index.tsx` line 66 | Exists — `/repartidor/entregas` → `<VistaRepartidor />` |
| RepartidorLayout | `frontend/src/components/shared/RepartidorLayout.tsx` | Exists — wraps the route |
| ConfirmacionEntrega | `frontend/src/features/repartidor/ConfirmacionEntrega.tsx` | Exists (linked from cards) |

### What is missing or needs adjustment

| Gap | Description |
|-----|-------------|
| Empty-state message wording | Component shows "No tienes entregas pendientes." — criterion requires exactly "No tienes entregas pendientes hoy". Needs a one-word fix. |
| Package icon on cards | `EntregaCard` currently shows no package icon. Wireframe requires an icon (e.g. Shadcn/Lucide `Package` icon). |
| `estado` badge on card | Acceptance criterion requires `estado` to be visible on each card. Current implementation omits it. |
| Navigation on completed cards | Completed cards have `navegable={false}` — no arrow, correct. But clicking the card body should NOT navigate (currently it does not — correct). |
| Service URL | `entregaService.listarMisEntregas()` calls `/entregas`. After the alias route is added it can optionally be updated to call `/repartidor/entregas`. The alias is backward-compatible so this is cosmetic; the implementer SHALL update the URL to match the new canonical route for clarity. |
| Frontend test file | No `VistaRepartidor.test.tsx` exists. Must be created. |

### Components

**`VistaRepartidor`** (`frontend/src/features/repartidor/VistaRepartidor.tsx`)
- Modification: add `<Package />` icon to `EntregaCard`, show `estado` badge, fix empty-state message wording.
- No new component file needed.

**`EntregaCard`** (defined inline in `VistaRepartidor.tsx`)
- Modification: add `<Package className="shrink-0 text-gray-400" />` icon, render `<Badge>` with `entrega.estado`.

### Hooks

**`useEntregas`** (`frontend/src/hooks/useEntregas.ts`) — no change needed. Optional: update `queryKey` to `['repartidor', 'entregas']` for consistency; implementer can decide.

### Services

**`entregaService.listarMisEntregas`** — update URL from `/entregas` to `/repartidor/entregas` (cosmetic, backward-compatible thanks to the alias).

---

## 5. Decisión técnica

| Option | Description | Decision |
|--------|-------------|----------|
| **A — alias route** | Add `GET /api/v1/repartidor/entregas` that calls `listarMisEntregas` controller; keep existing `/entregas`. | **Chosen** |
| B — rename route | Rename `/api/v1/entregas` to `/api/v1/repartidor/entregas` and update all references. | Discarded — breaks `entregas_confirmacion` tests that call `/api/v1/entregas`; higher risk. |
| C — new controller+service | Create a fully separate controller and service for `/repartidor/entregas`. | Discarded — duplicates business logic already covered and tested. |

---

## 6. Security

- `GET /api/v1/repartidor/entregas` MUST be protected by `authMiddleware` + `roleMiddleware('REPARTIDOR')`. No data from other repartidores is exposed because the service resolves the repartidor from `req.user.id` (JWT), not from query params.
- Frontend route `/repartidor/entregas` is already inside `<ProtectedRoute allowedRoles={['REPARTIDOR']}>` — no change required.
- No file uploads, no mutations — no additional rate limiting needed beyond global middleware.
