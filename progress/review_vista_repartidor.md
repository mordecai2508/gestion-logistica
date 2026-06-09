# Review — vista_repartidor — APROBADO

**Feature:** vista_repartidor (id 15, sprint 5)
**Reviewer:** reviewer
**Fecha:** 2026-06-09

---

## Trazabilidad R1–R15

| R | Descripción | Test | Estado |
|---|-------------|------|--------|
| R1 | GET /api/v1/repartidor/entregas → 200 con data agrupada | `R1 - debe devolver 200 con pendientes y completadas al repartidor autenticado` (`repartidorEntregas.test.ts:55`) | ✅ |
| R2 | Clasificación correcta de estados en pendientes/completadas | `R2 - debe clasificar correctamente PENDIENTE|EN_PREPARACION|EN_TRANSITO|EN_RUTA...` (`repartidorEntregas.test.ts:74`) | ✅ |
| R3 | 401 sin token | `R3 - debe devolver 401 sin token` (`repartidorEntregas.test.ts:102`) | ✅ |
| R4 | 403 con rol no-REPARTIDOR | `R4 - debe devolver 403 con rol OPERADOR o CLIENTE` (`repartidorEntregas.test.ts:107`) | ✅ |
| R5 | 404 sin perfil de repartidor | `R5 - debe devolver 404 si el usuario REPARTIDOR no tiene perfil de repartidor` (`repartidorEntregas.test.ts:121`) | ✅ |
| R6 | Campos completos en EntregaListItemDto (`id`, `codigoSeguimiento`, `estado`, `destinatario`, `direccionDestino`, `rutaId`, `updatedAt`) | Todos los campos mapeados en `entregaService.mapToListItem()`; tipos definidos en `backend/src/types/entregaTypes.ts`; contrato verificado por tests R1/R2 y por `entregasListar.test.ts` R1–R2 que siguen pasando con datos completos | ✅ |
| R7 | Título "Mis Entregas" y pestañas Pendientes(n)/Completadas | `R7 - debe renderizar título "Mis Entregas" y pestañas Pendientes y Completadas` (`VistaRepartidor.test.tsx:108`) | ✅ |
| R8 | EntregaCard pendiente: icono Package, codigoSeguimiento, direccionDestino, estado badge | `R8 - debe renderizar una tarjeta por entrega pendiente con icono de paquete...` (`VistaRepartidor.test.tsx:116`) | ✅ |
| R9 | EntregaCard completada: sin flecha de navegación | `R9 - debe renderizar una tarjeta por entrega completada sin flecha de navegación` (`VistaRepartidor.test.tsx:124`) | ✅ |
| R10 | Mensaje vacío "No tienes entregas pendientes hoy" | `R10 - debe mostrar "No tienes entregas pendientes hoy"...` (`VistaRepartidor.test.tsx:136`) | ✅ |
| R11 | Navegar a `/repartidor/entregas/:id/confirmar` al clic en pendiente | `R11 - debe navegar a /repartidor/entregas/:id/confirmar...` (`VistaRepartidor.test.tsx:147`) | ✅ |
| R12 | Loading indicator mientras la API responde | `R12 - debe mostrar indicador de carga mientras la API responde` (`VistaRepartidor.test.tsx:157`) | ✅ |
| R13 | Error con `role="alert"` cuando la API falla | `R13 - debe mostrar mensaje de error con role="alert" cuando la API falla` (`VistaRepartidor.test.tsx:164`) | ✅ |
| R14 | `aria-label` con `codigoSeguimiento` en botón de navegación | `aria-label={\`Confirmar entrega ${entrega.codigoSeguimiento}\`}` en `VistaRepartidor.tsx:63`; ejercitado por tests R9 y R11 que buscan el botón por ese aria-label | ✅ |
| R15 | Ruta `/repartidor/entregas` en `RepartidorLayout` + `ProtectedRoute(REPARTIDOR)` | Verificado en `frontend/src/router/index.tsx:64–66`: `<ProtectedRoute allowedRoles={['REPARTIDOR']}>` → `<RepartidorLayout>` → `<Route path="/repartidor/entregas" element={<VistaRepartidor />}/>` | ✅ |

---

## Puntos de atención específicos

### Compatibilidad del endpoint original GET /api/v1/entregas
- El endpoint `GET /api/v1/entregas` usa el controlador `listarMisEntregas` con validación Zod (`listarEntregasSchema`) sobre `req.query`.
- El nuevo endpoint alias `GET /api/v1/repartidor/entregas` usa `listarMisEntregasRepartidor`, que omite esa validación de query params (no los envía por diseño).
- Los 6 tests de `entregasListar.test.ts` siguen pasando íntegramente (2 suites, 11 tests en total verificados con ejecución directa).

### Alias route — delegación correcta
- `repartidorRouter` en `backend/src/routes/repartidor.ts` delega a `listarMisEntregasRepartidor`, que llama `entregaService.listarMisEntregas(req.user!.id)` — idéntico al controlador original salvo la validación de query.
- El test R1 verifica explícitamente `mockedEntregaService.listarMisEntregas.toHaveBeenCalledWith('user-rep-1')`, confirmando que el alias delega al servicio y no duplica lógica.

### URL en entregaService.ts
- `listarMisEntregas()` llama ahora a `/repartidor/entregas` (actualizado desde `/entregas`).
- Los tests de frontend mockean `useEntregas` (no la URL directamente), lo que es correcto: el hook invoca el servicio, que a su vez usa la URL canónica.

---

## Arquitectura: ✅

- Controladores delgados: `listarMisEntregasRepartidor` no contiene lógica de negocio — toda la lógica vive en `entregaService.listarMisEntregas`.
- Repositorios sin validaciones: no modificados en esta feature.
- Sin `fetch` directo en componentes React: `VistaRepartidor` usa `useEntregas` (TanStack Query).
- Sin estado del servidor duplicado en Zustand: no hay store Zustand para entregas.
- Sin `any` explícito: verificado en `repartidor.ts`, `entregaController.ts`, `VistaRepartidor.tsx` y `entregaService.ts` (frontend).
- Sin `console.log` de debug en los archivos nuevos/modificados.

## Seguridad: ✅

- `GET /api/v1/repartidor/entregas` protegido por `authMiddleware` + `roleMiddleware('REPARTIDOR')` (verificado en `repartidor.ts`).
- Ruta frontend `/repartidor/entregas` dentro de `<ProtectedRoute allowedRoles={['REPARTIDOR']}>`.
- No hay subida de archivos en esta feature.
- El repartidor se resuelve desde el JWT (`req.user!.id`), no desde query params — no hay posibilidad de acceder a datos de otro repartidor.

## Convenios: ✅

- Rutas bajo `/api/v1/`.
- Respuesta con formato `{ data, message, status }` en 200 y `{ error, message, statusCode }` en errores (a través de `errorHandler`).
- Nombres de archivos siguen el patrón del proyecto (`repartidor.ts`, `repartidorEntregas.test.ts`, `VistaRepartidor.tsx`).
- `Badge` creado en `components/ui/badge.tsx` siguiendo el patrón CVA del resto de componentes UI.

## Verificación: ✅ (261/261 backend, 144/144 frontend, lint limpio, build exitoso, init.sh 30/30)

- `backend npm run lint` → 0 errores
- `backend npm test` → 261/261 tests (17 suites)
- `backend npm run build` → 0 errores TypeScript
- `frontend npm run lint` → 0 errores
- `frontend npm test` → 144/144 tests (26 suites)
- `frontend npm run build` → 0 errores TypeScript (1 advertencia de dynamic import preexistente, no relacionada con esta feature)
- `./init.sh` → 30/30 checks verdes

---

**Decisión: APROBADO. El leader debe hacer el commit y luego marcar la feature como done.**
