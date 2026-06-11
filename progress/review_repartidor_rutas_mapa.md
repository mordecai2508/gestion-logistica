# Review — repartidor_rutas_mapa — APROBADO

> Feature ID: 19 | Sprint 6 | Fecha de revisión: 2026-06-11

---

## Trazabilidad

| R# | Descripción (resumen) | Test | Estado |
|----|------------------------|------|--------|
| R1 | `/repartidor/rutas` reemplaza el placeholder y solicita las rutas del repartidor | `useRutas({ page:1, limit:50, repartidorId:'me' })` en `RutasRepartidor.tsx:39`, ejercitado por R20/R21/R5/R6 en `RutasRepartidor.test.tsx` | ✅ |
| R2 | Cada ruta muestra `código` y `estado` | `R20 - debe renderizar una tarjeta por ruta asignada con código, estado y envíos` (`RutasRepartidor.test.tsx:74-90`) | ✅ |
| R3 | Cada ruta muestra sus envíos asociados | Mismo test R20 (`codigoSeguimiento` de `envio-1`/`envio-2` verificado) | ✅ |
| R4 | Lista vacía → "No tienes rutas asignadas" | `R21 - ... cuando la lista de rutas está vacía` (`RutasRepartidor.test.tsx:92-102`) | ✅ |
| R5 | Loading → indicador, sin lista | `R5 - debe mostrar un indicador de carga ...` (`RutasRepartidor.test.tsx:104-115`) | ✅ |
| R6 | Error → `role="alert"` accesible | `R6 - debe mostrar un mensaje de error accesible ...` (`RutasRepartidor.test.tsx:117-127`) | ✅ |
| R7 | Solo rutas del repartidor autenticado (sin exponer otras) | `repartidorId: 'me'` fijo en `RutasRepartidor.tsx:39`; resuelto server-side por `rutaService.ts:182-187` (backend, ya `done`, sin cambios) | ✅ |
| R8 | `/repartidor/mapa` reemplaza el placeholder y muestra mapa de solo lectura | `useRutas({...repartidorId:'me'})` en `MapaRepartidor.tsx:17`, ejercitado por R22/R23/R14/R15 | ✅ |
| R9 | "Ruta activa" = primera ruta no terminal (`!= COMPLETADA/CANCELADA`) | `obtenerRutaActiva` (`MapaRepartidor.tsx:7-9`); `R22 - ...` usa `[rutaCompletada, rutaActivaConCoordenadas]` y selecciona la segunda (`MapaRepartidor.test.tsx:117-131`) | ✅ |
| R10 | Mapa con un marcador por envío con `lat`/`lng` de la ruta activa | `R22 - debe renderizar un marcador por cada envío con coordenadas de la ruta activa` (`MapaRepartidor.test.tsx:117-131`) — verifica `data-marker-count="2"`, `marker-envio-1`, `marker-envio-2`, ausencia de `marker-envio-3` (sin coords) | ✅ |
| R11 | Sin ruta activa → "Sin ubicaciones disponibles para mostrar" | `R23 - ... cuando no hay ruta activa` (`MapaRepartidor.test.tsx:133-144`, solo `rutaCompletada`) | ✅ |
| R12 | Ruta activa sin envíos con coordenadas → mismo mensaje | `R23 - ... cuando la ruta activa no tiene envíos con coordenadas` (`MapaRepartidor.test.tsx:146-157`) | ✅ |
| R13 | Mapa de solo lectura, sin controles de edición/listeners | Verificación por inspección de `RepartidorMap.tsx`: solo `MapContainer`/`TileLayer`/`Marker` con `position`, sin `onClick`/`onDrag`/handlers ni controles de edición. El mock de `react-leaflet` en R22 solo recibe `envios` (sin props de edición) | ✅ |
| R14 | Loading → indicador, sin mapa | `R14 - debe mostrar un indicador de carga ...` (`MapaRepartidor.test.tsx:159-170`) | ✅ |
| R15 | Error → `role="alert"` accesible | `R15 - debe mostrar un mensaje de error accesible ...` (`MapaRepartidor.test.tsx:172-182`) | ✅ |
| R16 | Botón "Cerrar sesión" visible para CLIENTE/OPERADOR/REPARTIDOR | `Perfil.tsx` no condiciona ningún render por `perfil?.rol` (única referencia es el badge de rol en línea 98); botón siempre presente — verificado por R24/R18 con `rol: 'REPARTIDOR'` (`Perfil.tsx:159-170`) | ✅ |
| R17 | Click invoca `authService.logout()` | `R24 - debe invocar logout, limpiar el authStore y navegar a /login ...` (`Perfil.test.tsx:64-80`) — `mockLogout` llamado | ✅ |
| R18 | `clearAuth()` se ejecuta aunque `logout()` falle | `R18 - debe limpiar el authStore y navegar a /login incluso si la llamada de logout falla` (`Perfil.test.tsx:82-98`) — `mockLogout.mockRejectedValueOnce`, `clearAuth`/`navigate` igualmente llamados | ✅ |
| R19 | Redirige a `/login` | `R24` y `R18` verifican `mockNavigate` llamado con `'/login'` | ✅ |
| R20 | Test: una tarjeta por ruta con código/estado/envíos | `RutasRepartidor.test.tsx:74-90` | ✅ |
| R21 | Test: "No tienes rutas asignadas" con lista vacía | `RutasRepartidor.test.tsx:92-102` | ✅ |
| R22 | Test: un marcador por envío con coordenadas de la ruta activa | `MapaRepartidor.test.tsx:117-131` | ✅ |
| R23 | Test: "Sin ubicaciones disponibles para mostrar" (sin ruta activa / sin coords) | `MapaRepartidor.test.tsx:133-144` y `:146-157` (dos casos) | ✅ |
| R24 | Test: click "Cerrar sesión" invoca logout, limpia authStore, navega a `/login` | `Perfil.test.tsx:64-80` | ✅ |

**24/24 requisitos con test real (no stub) que ejercita el comportamiento descrito.**

---

## Tasks (`specs/repartidor_rutas_mapa/tasks.md`)

T1-T12 están todas marcadas `[x]`. Verificado contra el código real:
- T1 (`RepartidorMap.tsx`): componente Leaflet de solo lectura, fix de iconos por defecto, `MapContainer`+`TileLayer`+`Marker`, centro = primer envío, zoom fijo `13`. ✅
- T2 (`RutasRepartidor.tsx`): `useRutas({page:1, limit:50, repartidorId:'me'})`, título "Mis Rutas", loading/error/empty/list según spec, `RutaRepartidorCard` con `Card`/`Badge`. ✅
- T3 (`MapaRepartidor.tsx`): `obtenerRutaActiva` y `enviosConCoordenadas` implementadas tal como en `design.md`, mensajes exactos R11/R12. ✅
- T4 (`router/index.tsx`): placeholders reemplazados por `RutasRepartidor`/`MapaRepartidor`, mismo anidamiento `ProtectedRoute(['REPARTIDOR'])` → `RepartidorLayout` (diff verificado, sin cambios de anidamiento). ✅
- T5 (`Perfil.tsx`): `handleLogout` con patrón try/finally idéntico a `ProfileMenu.tsx`, botón "Cerrar sesión" visible para los 3 roles dentro de `<CardContent>`, separado con `border-t pt-4 mt-4`. ✅
- T6-T8: archivos de test presentes con los casos descritos. ✅
- T9-T12: ver sección Verificación. ✅

---

## Arquitectura: ✅

- Sin `fetch` directo: ambos componentes usan `useRutas` (TanStack Query) → `rutaService.listar` → `api` (axios). Sin llamadas HTTP inline.
- Sin estado de servidor duplicado en Zustand: `useAuthStore` solo se usa para `clearAuth()` (estado de sesión, no datos de servidor); las rutas vienen exclusivamente de `useRutas`/React Query.
- Sin `any` explícito: revisado `RepartidorMap.tsx`, `RutasRepartidor.tsx`, `MapaRepartidor.tsx`, `Perfil.tsx` — no hay `: any` ni `as any` (solo casts tipados como `as number` para `lat`/`lng` ya validados como no-null en `enviosConCoordenadas`).
- Sin `console.log` de debug en ninguno de los archivos nuevos/modificados.
- Componentes Shadcn/UI: `Card`, `CardContent`, `Badge`, `Button`, `Input`, `Label` reutilizados consistentemente con el resto del proyecto.
- Patrón de logout idéntico a `ProfileMenu.tsx` (try/catch-vacío/finally con `clearAuth()` + `navigate('/login')`).
- `RepartidorMap.tsx` no agrega controles de edición ni listeners de eventos de mapa (R13, solo lectura).

---

## Seguridad: ✅

- Las rutas `/repartidor/rutas` y `/repartidor/mapa` permanecen dentro de `<ProtectedRoute allowedRoles={['REPARTIDOR']}>` → `<RepartidorLayout>` (sin cambios de anidamiento, verificado vía diff).
- `repartidorId: 'me'` se resuelve server-side al repartidor autenticado (backend ya existente, `rutaService.ts:182-187`), sin exponer rutas de otros repartidores (R7).
- Feature 100% frontend: no se tocó `backend/`, no hay endpoints nuevos ni cambios de schema Prisma — confirmado por `git status` (solo archivos en `frontend/`, `feature_list.json`, `progress/`, `specs/`).

---

## Convenios: ✅

- Estructura de contenedor `mx-auto max-w-md ... p-4` consistente con `VistaRepartidor.tsx`.
- Llamadas HTTP vía `services/` (`rutaService` a través de `useRutas`).
- Mensajes exactos según spec: "No tienes rutas asignadas", "Sin ubicaciones disponibles para mostrar".
- `role="alert"` para errores accesibles (R6, R15).
- Nombres de archivos/componentes siguen el patrón de la feature (`RepartidorMap`, `RutasRepartidor`, `MapaRepartidor`).

---

## Verificación

### Lint frontend — ✅
```
> eslint src --ext .ts,.tsx
(sin errores)
```

### Tests frontend — ✅
```
Test Files  32 passed (32)
     Tests  181 passed (181)
```
Incluye `RutasRepartidor.test.tsx` (4 tests), `MapaRepartidor.test.tsx` (5 tests), `Perfil.test.tsx` (2 tests).

### `tsc --noEmit -p tsconfig.app.json` — ✅ (para archivos de esta feature)
Salida completa (2 errores, ambos preexistentes y ajenos a esta feature):
```
src/features/cliente/__tests__/MisEnvios.test.tsx(105,32): error TS2322: Type '"ENTREGADO"' is not assignable to type '"PENDIENTE"'.
src/features/cliente/__tests__/MisEnvios.test.tsx(120,32): error TS2322: Type '"CANCELADO"' is not assignable to type '"PENDIENTE"'.
```
- Verificado con `git stash --include-untracked` + `tsc --noEmit`: el mismo error (idéntico, mismas líneas) existe en `main` antes de esta feature.
- `git log` de `MisEnvios.test.tsx` muestra que el último commit que tocó ese archivo es `daa067b feat(mis_envios_cliente): Mis envíos (vista cliente)`, ajeno a `repartidor_rutas_mapa`.
- Cero errores en `features/repartidor/`, `features/auth/Perfil.tsx` y `router/index.tsx`.
- Sigue el precedente de `progress/review_gestion_repartidores.md`: error preexistente documentado, no bloqueante.

### `./init.sh` — ✅
```
✅ Todo verde: 30/30 checks pasaron
```
Incluye:
- Consistencia de `feature_list.json`: exactamente una feature `in_progress` (`repartidor_rutas_mapa`), specs presentes para las 18 features SDD activas.
- Lint backend: sin errores. Tests backend: todos verdes (sin cambios, feature 100% frontend).
- Lint frontend: sin errores. Tests frontend: 181/181.

---

## Decisión

**APROBADO. El leader debe hacer el commit y luego marcar la feature como done.**
