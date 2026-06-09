# Tasks — vista_repartidor

Follow in order. Mark each `[x]` when complete. Reference R<n> numbers from `requirements.md`.

---

## Backend

- [x] T1. Create `backend/src/routes/repartidor.ts` — register `GET /` with `authMiddleware`, `roleMiddleware('REPARTIDOR')`, and `listarMisEntregas` controller (imported from `../controllers/entregaController`). No new controller or service logic needed. (R1, R3, R4)

- [x] T2. Mount the new router in `backend/src/index.ts`: `app.use('/api/v1/repartidor', repartidorRouter)` before `app.use(errorHandler)`. (R1)

- [x] T3. Write backend integration tests in `backend/src/tests/repartidorEntregas.test.ts`:
  - `R1 - debe devolver 200 con pendientes y completadas al repartidor autenticado`
  - `R2 - debe clasificar correctamente PENDIENTE|EN_PREPARACION|EN_TRANSITO|EN_RUTA como pendientes y ENTREGADO|FALLIDO como completadas`
  - `R3 - debe devolver 401 sin token`
  - `R4 - debe devolver 403 con rol OPERADOR o CLIENTE`
  - `R5 - debe devolver 404 si el usuario REPARTIDOR no tiene perfil de repartidor`

  Use the same mock pattern as `backend/src/tests/entregasListar.test.ts` (mock `entregaService`, mock `@prisma/client`). Target endpoint: `GET /api/v1/repartidor/entregas`. (R1–R5)

---

## Frontend

- [x] T4. Update `frontend/src/services/entregaService.ts` — change `listarMisEntregas()` to call `/repartidor/entregas` instead of `/entregas`. Remove the `params: { repartidorId: 'me' }` option if present (no longer needed). (R1)

- [x] T5. Modify `EntregaCard` in `frontend/src/features/repartidor/VistaRepartidor.tsx`:
  - Import `Package` from `lucide-react`.
  - Add `<Package />` icon as the leftmost element in the card layout. (R8, R9)
  - Import `Badge` from `@/components/ui/badge` and render `<Badge>{entrega.estado}</Badge>` below `codigoSeguimiento`. (R8, R9)
  - Ensure `aria-label` on the navigation button includes `codigoSeguimiento`. (R14) — already present, verify.

- [x] T6. Fix the empty-state message in the Pendientes tab in `VistaRepartidor.tsx`:
  - Change `"No tienes entregas pendientes."` to `"No tienes entregas pendientes hoy"`. (R10)

- [x] T7. Verify navigation behavior in `VistaRepartidor.tsx`:
  - Confirm that clicking a pending card navigates to `/repartidor/entregas/:id/confirmar`. (R11) — already implemented; verify no regression.
  - Confirm completed cards are rendered with `navegable={false}` (no arrow, no navigation). (R9) — already implemented; verify no regression.

- [x] T8. Write frontend component tests in `frontend/src/features/repartidor/VistaRepartidor.test.tsx`:
  - `R7 - debe renderizar título "Mis Entregas" y pestañas Pendientes y Completadas`
  - `R8 - debe renderizar una tarjeta por entrega pendiente con icono de paquete, codigoSeguimiento, direccionDestino y estado`
  - `R9 - debe renderizar una tarjeta por entrega completada sin flecha de navegación`
  - `R10 - debe mostrar "No tienes entregas pendientes hoy" cuando la lista de pendientes está vacía`
  - `R11 - debe navegar a /repartidor/entregas/:id/confirmar al hacer clic en una tarjeta pendiente`
  - `R12 - debe mostrar indicador de carga mientras la API responde`
  - `R13 - debe mostrar mensaje de error con role="alert" cuando la API falla`

  Mock `useEntregas` hook. Use `@testing-library/react` + `vitest`. Wrap renders with `MemoryRouter`. (R7–R13)

---

## Verification

- [x] T9. Run `npm run lint` in `backend/` and `frontend/` — zero errors.
- [x] T10. Run `npm test` in `backend/` — all tests green, including `repartidorEntregas.test.ts`.
- [x] T11. Run `npm test` in `frontend/` — all tests green, including `VistaRepartidor.test.tsx`.
- [x] T12. Run `npm run build` in both packages — zero TypeScript errors.
