# Informe de Implementación — repartidor_rutas_mapa

> Feature ID: 19 | Sprint 6 | Fecha: 2026-06-11

---

## Archivos creados

### Frontend
| Archivo | Descripción |
|---------|-------------|
| `frontend/src/features/repartidor/RepartidorMap.tsx` | Componente de mapa Leaflet de solo lectura, multi-marcador, modelado sobre `TrackingMap.tsx`. Props: `{ envios: EnvioEnRutaDto[] }`. |
| `frontend/src/features/repartidor/RutasRepartidor.tsx` | Pantalla `/repartidor/rutas`. Lista las rutas asignadas al repartidor autenticado (componente inline `RutaRepartidorCard`). |
| `frontend/src/features/repartidor/MapaRepartidor.tsx` | Pantalla `/repartidor/mapa`. Calcula la ruta activa (`obtenerRutaActiva`) y los envíos con coordenadas (`enviosConCoordenadas`), y renderiza `RepartidorMap` o el mensaje vacío. |
| `frontend/src/features/repartidor/RutasRepartidor.test.tsx` | Tests R20, R21, R5, R6. |
| `frontend/src/features/repartidor/MapaRepartidor.test.tsx` | Tests R22, R23 (x2), R14, R15. |
| `frontend/src/features/auth/Perfil.test.tsx` | Tests R24, R18 (archivo nuevo — no existía test previo de `Perfil.tsx`). |

## Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/router/index.tsx` | Importa `RutasRepartidor` y `MapaRepartidor`; reemplaza los `PlaceholderPage` de `/repartidor/rutas` y `/repartidor/mapa` por los componentes nuevos. Sin cambios de anidamiento (siguen dentro de `ProtectedRoute allowedRoles={['REPARTIDOR']}` → `RepartidorLayout`). |
| `frontend/src/features/auth/Perfil.tsx` | Agrega `useNavigate`, `authService`, `useAuthStore`; implementa `handleLogout` (try/finally, mismo patrón que `ProfileMenu.tsx`); renderiza botón "Cerrar sesión" (`variant="outline"`) dentro de `<CardContent>`, debajo del `<form>`, separado con `border-t pt-4 mt-4`. |
| `specs/repartidor_rutas_mapa/tasks.md` | T1-T12 marcadas `[x]`. |

---

## Trazabilidad R → Test

| Req | Test | Archivo:línea |
|-----|------|----------------|
| R1 | `RutasRepartidor` usa `useRutas({ page:1, limit:50, repartidorId:'me' })` (verificado indirectamente por R20/R21/R5/R6, que mockean ese hook) | `frontend/src/features/repartidor/RutasRepartidor.tsx:42` |
| R2 | `R20 - debe renderizar una tarjeta por ruta asignada con código, estado y envíos` | `frontend/src/features/repartidor/RutasRepartidor.test.tsx:81` |
| R3 | `R20 - debe renderizar una tarjeta por ruta asignada con código, estado y envíos` (verifica `codigoSeguimiento` de envíos) | `frontend/src/features/repartidor/RutasRepartidor.test.tsx:81` |
| R4 | `R21 - debe mostrar "No tienes rutas asignadas" cuando la lista de rutas está vacía` | `frontend/src/features/repartidor/RutasRepartidor.test.tsx:99` |
| R5 | `R5 - debe mostrar un indicador de carga y no la lista mientras la petición está en curso` | `frontend/src/features/repartidor/RutasRepartidor.test.tsx:111` |
| R6 | `R6 - debe mostrar un mensaje de error accesible cuando la petición falla` | `frontend/src/features/repartidor/RutasRepartidor.test.tsx:124` |
| R7 | `repartidorId: 'me'` explícito en `useRutas` (mismo hook/llamada cubierta por R1) | `frontend/src/features/repartidor/RutasRepartidor.tsx:42` |
| R8 | `MapaRepartidor` usa `useRutas({ page:1, limit:50, repartidorId:'me' })` (cubierto indirectamente por R22/R23/R14/R15) | `frontend/src/features/repartidor/MapaRepartidor.tsx:18` |
| R9 | `obtenerRutaActiva` — `R22 - debe renderizar un marcador por cada envío con coordenadas de la ruta activa` (usa array con ruta `COMPLETADA` antes de la activa `EN_CURSO`) | `frontend/src/features/repartidor/MapaRepartidor.test.tsx:135` |
| R10 | `R22 - debe renderizar un marcador por cada envío con coordenadas de la ruta activa` | `frontend/src/features/repartidor/MapaRepartidor.test.tsx:135` |
| R11 | `R23 - debe mostrar "Sin ubicaciones disponibles para mostrar" cuando no hay ruta activa` | `frontend/src/features/repartidor/MapaRepartidor.test.tsx:150` |
| R12 | `R23 - debe mostrar "Sin ubicaciones disponibles para mostrar" cuando la ruta activa no tiene envíos con coordenadas` | `frontend/src/features/repartidor/MapaRepartidor.test.tsx:163` |
| R13 | `RepartidorMap` no agrega controles de edición ni listeners (verificado por inspección — sin handlers `onClick`/`onDrag`/etc. en `MapContainer`/`Marker`); cubierto indirectamente por R22 (el mapa mockeado solo recibe `envios`, sin props de edición) | `frontend/src/features/repartidor/RepartidorMap.tsx` |
| R14 | `R14 - debe mostrar un indicador de carga y no el mapa mientras la petición está en curso` | `frontend/src/features/repartidor/MapaRepartidor.test.tsx:176` |
| R15 | `R15 - debe mostrar un mensaje de error accesible cuando la petición falla` | `frontend/src/features/repartidor/MapaRepartidor.test.tsx:188` |
| R16 | Botón "Cerrar sesión" siempre renderizado en `Perfil.tsx` (sin condicional de rol) — cubierto por R24/R18, que renderizan `Perfil` con `rol: 'REPARTIDOR'` y encuentran el botón | `frontend/src/features/auth/Perfil.tsx:163` |
| R17 | `R24 - debe invocar logout, limpiar el authStore y navegar a /login al hacer clic en "Cerrar sesión"` | `frontend/src/features/auth/Perfil.test.tsx:67` |
| R18 | `R18 - debe limpiar el authStore y navegar a /login incluso si la llamada de logout falla` | `frontend/src/features/auth/Perfil.test.tsx:84` |
| R19 | `R24 - debe invocar logout, limpiar el authStore y navegar a /login al hacer clic en "Cerrar sesión"` (verifica `navigate('/login')`) | `frontend/src/features/auth/Perfil.test.tsx:67` |
| R20 | `R20 - debe renderizar una tarjeta por ruta asignada con código, estado y envíos` | `frontend/src/features/repartidor/RutasRepartidor.test.tsx:81` |
| R21 | `R21 - debe mostrar "No tienes rutas asignadas" cuando la lista de rutas está vacía` | `frontend/src/features/repartidor/RutasRepartidor.test.tsx:99` |
| R22 | `R22 - debe renderizar un marcador por cada envío con coordenadas de la ruta activa` | `frontend/src/features/repartidor/MapaRepartidor.test.tsx:135` |
| R23 | `R23 - debe mostrar "Sin ubicaciones disponibles para mostrar" cuando no hay ruta activa` y `R23 - ... cuando la ruta activa no tiene envíos con coordenadas` | `frontend/src/features/repartidor/MapaRepartidor.test.tsx:150` y `:163` |
| R24 | `R24 - debe invocar logout, limpiar el authStore y navegar a /login al hacer clic en "Cerrar sesión"` | `frontend/src/features/auth/Perfil.test.tsx:67` |

---

## Resultado de verificación

### Lint frontend (T9) — ✅
```
> frontend@0.0.0 lint
> eslint src --ext .ts,.tsx
(sin errores)
```

### Tests frontend (T10) — ✅
```
Test Files  32 passed (32)
     Tests  181 passed (181)
```
Incluye los 3 archivos nuevos: `RutasRepartidor.test.tsx` (4 tests), `MapaRepartidor.test.tsx` (5 tests), `Perfil.test.tsx` (2 tests).

### Build frontend (T11) — ⚠️ pre-existente, fuera de alcance
```
src/features/cliente/__tests__/MisEnvios.test.tsx(105,32): error TS2322: Type '"ENTREGADO"' is not assignable to type '"PENDIENTE"'.
src/features/cliente/__tests__/MisEnvios.test.tsx(120,32): error TS2322: Type '"CANCELADO"' is not assignable to type '"PENDIENTE"'.
```
Confirmado con `git stash` que este error existe en `main` antes de esta feature (también documentado previamente como pre-existente en `progress/impl_gestion_repartidores.md`, sección "Build"). No está en ningún archivo de `repartidor_rutas_mapa` (`tsc --noEmit -p tsconfig.app.json` no reporta errores en `features/repartidor/`, `features/auth/Perfil.tsx` ni `router/index.tsx`). Por restricción de alcance del implementer, no se modificó `MisEnvios.test.tsx` (pertenece a la feature `envios_consultar`, ya `done`).

### `./init.sh` (T12) — ✅
```
✅ Todo verde: 30/30 checks pasaron
```
Incluye lint + tests de backend (sin cambios) y lint + tests de frontend (181/181). `init.sh` no ejecuta `npm run build`.

---

## Notas de implementación

1. **`RepartidorMap`**: centro inicial = coordenadas del primer envío del array recibido (ya filtrado por el padre), zoom fijo `13`, sin key dinámica (no hay actualización en tiempo real, a diferencia de `TrackingMap`). Fix de iconos de Leaflet duplicado de `TrackingMap.tsx` (gap conocido documentado en `design.md`, no bloqueante).
2. **`MapaRepartidor`**: contenedor con `h-[calc(100vh-4rem)]` para que el mapa ocupe el espacio disponible dentro de `RepartidorLayout`/`RepartidorBottomNav`.
3. **`Perfil.tsx`**: el botón "Cerrar sesión" se muestra para los 3 roles (CLIENTE, OPERADOR, REPARTIDOR) ya que `Perfil.tsx` no condiciona ningún render por rol.
4. **Build pre-existente roto** (ver T11 arriba): bloqueante conocido y documentado en una feature anterior, no introducido ni agravado por esta feature.
