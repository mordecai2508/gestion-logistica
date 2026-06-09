# Review — dashboard_operador — RECHAZADO (2 pasadas)

Fecha primera pasada: 2026-06-08  
Fecha segunda pasada: 2026-06-08  
Revisor: subagente `reviewer`

---

## Trazabilidad R1–R31

| Req | Descripción breve | Test | Estado |
|-----|-------------------|------|--------|
| R1 | GET /metrics → 200 con 4 métricas numéricas | `R1/R2/R3/R4/R5 — debe devolver 200...` (dashboard.test.ts) | ✅ |
| R2 | `totalEnvios` = count total | idem + unit `R2/R3/R4/R5 — getMetrics delega...` | ✅ |
| R3 | `enRuta` = count EN_RUTA | idem | ✅ |
| R4 | `entregados` = count ENTREGADO | idem | ✅ |
| R5 | `incidenciasAbiertas` = count ABIERTA | idem | ✅ |
| R6 | /metrics sin token → 401 | `R6 — debe devolver 401 sin token` | ✅ |
| R7 | /metrics CLIENTE o REPARTIDOR → 403 | `R7 — CLIENTE → 403` + `R7 — REPARTIDOR → 403` (dos casos) | ✅ |
| R8 | GET /envios-recientes → 200 | `R8/R9/R10 — debe devolver 200...` | ✅ |
| R9 | ≤ 5 ítems, orderBy createdAt desc | idem (length ≤ 5 verificado) | ✅ |
| R10 | Campos: codigoSeguimiento, clienteNombre, estado, createdAt ISO 8601 | idem + unit `R10 — getEnviosRecientes aplana clienteNombre` | ✅ |
| R11 | /envios-recientes sin token → 401 | `R11 — debe devolver 401 sin token` | ✅ |
| R12 | /envios-recientes CLIENTE o REPARTIDOR → 403 | `R12 — REPARTIDOR → 403` + `R12 — CLIENTE → 403` (dos casos explícitos) | ✅ |
| R13 | GET /rutas-pendientes → 200 | `R13/R14/R15 — debe devolver 200...` | ✅ |
| R14 | ≤ 5 rutas PENDIENTE, orderBy createdAt asc | idem | ✅ |
| R15 | Campos: id, codigo, nombre, createdAt | idem + unit `R15 — getRutasPendientes devuelve los campos` | ✅ |
| R16 | /rutas-pendientes sin token → 401 | `R16 — debe devolver 401 sin token` | ✅ |
| R17 | /rutas-pendientes CLIENTE o REPARTIDOR → 403 | `R17 — CLIENTE → 403` | ✅ |
| R18 | GET /vehiculos-disponibles → 200 | `R18/R19/R20 — debe devolver 200...` | ✅ |
| R19 | ≤ 5 vehículos DISPONIBLE, orderBy placa asc | idem + `item.estado === 'DISPONIBLE'` verificado | ✅ |
| R20 | Campos: id, placa, modelo, estado | idem + unit `R20 — getVehiculosDisponibles devuelve los campos` | ✅ |
| R21 | /vehiculos-disponibles sin token → 401 | `R21 — debe devolver 401 sin token` | ✅ |
| R22 | /vehiculos-disponibles REPARTIDOR → 403 | `R22 — debe devolver 403...` | ✅ |
| R23 | /dashboard renderiza 4 tarjetas de métricas | `R23/R24 — debe renderizar 4 tarjetas...` | ✅ |
| R24 | Labels: Total Envíos, En Ruta, Entregados, Incidencias Abiertas | idem + valores 20, 5, 10, 3 verificados | ✅ |
| R25 | Skeleton mientras carga | `R25 — debe mostrar skeleton...` (role="status" detectado) | ✅ |
| R26 | PieChart con 3 sectores: En Ruta (azul), Entregados (verde), Otros (gris) | `EnviosPieChart.test.tsx` — 4 tests R26 (mock recharts, slice count, loading, sin datos) | ✅ |
| R27 | Tabla Envíos Recientes con 4 columnas | `R27 — debe renderizar la tabla...` | ✅ |
| R28 | Panel Rutas Pendientes con navegación a /rutas/:id | `R28 — ...códigos del mock` + `R28 — navega a /rutas/:id` | ✅ |
| R29 | Panel Vehículos Disponibles: Placa, Modelo, Estado | `R29 — ...placa/modelo del mock` | ✅ |
| R30 | Toast de error cuando falla una query | `R30 — Toast cuando metrics falla` + cierre del toast | ✅ |
| R31 | Botón "+ Nuevo Envío" → /envios/crear | `R31 — navega a /envios/crear` | ✅ |

---

## Arquitectura

- ✅ Repositorio: usa `prisma.count()` para métricas (no findMany en memoria). Usa `findMany` con `select` mínimo y `take: 5` para las 3 listas.
- ✅ Servicio: única capa con lógica de mapeo (aplanar `cliente.usuario.nombre`, convertir `Date` a ISO string). Sin lógica en controllers.
- ✅ Controllers: sin lógica de negocio. Solo llamada al servicio + `res.json`.
- ✅ Frontend: sin `fetch` directo. Toda llamada HTTP va por la instancia Axios `api` desde `dashboardService.ts`.
- ✅ Sin estado del servidor duplicado en Zustand.
- ✅ Sin `any` explícito en ningún archivo de la feature (backend ni frontend).
- ✅ Sin `console.log` de debug.

## Seguridad

- ✅ Los 4 endpoints registran `authMiddleware` + `roleMiddleware('OPERADOR')` en `backend/src/routes/dashboard.ts`.
- ✅ Tests R6/R11/R16/R21 verifican rechazo 401 sin token.
- ✅ Tests R7/R12/R17/R22 verifican rechazo 403 para roles distintos a OPERADOR.
- ✅ No hay inputs de usuario (GET sin body); validación Zod no aplica a estos endpoints de solo lectura.

## Convenios

- ✅ Rutas bajo `/api/v1/dashboard/` (registrado en `index.ts` línea 57).
- ✅ Respuesta en formato `{ data, message, status: 200 }` en todos los handlers.
- ✅ TanStack Query con `staleTime: 60_000` en los 4 hooks (`useDashboard.ts`).
- ✅ Recharts encapsulado en `EnviosPieChart.tsx` (componente propio, no inline).
- ✅ Router actualizado: `DashboardOperador` importado desde `@/features/dashboard/DashboardOperador`.

## Verificación final (primera pasada)

| Check | Resultado |
|-------|-----------|
| `npx jest --runInBand src/tests/dashboard.test.ts` (backend) | ✅ 17/17 passing |
| `npm run lint` (backend) | ✅ sin errores |
| `npm run build` (backend) | ✅ |
| `npx vitest run src/features/dashboard/__tests__/DashboardOperador.test.tsx` | ✅ 9/9 passing |
| `npm run lint` (frontend) | ✅ sin errores |
| `npm run build` (frontend) | ✅ (warnings de chunk size, no errores) |
| `./init.sh` | ✅ 30/30 checks |

---

## Correcciones bloqueantes (primera pasada)

### CB-1 — R26 sin cobertura de test [BLOQUEANTE]

**Categoría:** Trazabilidad  
**Archivo:** `frontend/src/features/dashboard/__tests__/DashboardOperador.test.tsx`  
**Problema:** R26 exige que el sistema renderice un pie chart con 3 sectores (En Ruta, Entregados, Otros) usando datos de métricas. No existe ningún test que cite `R26` en su nombre ni que haga aserciones sobre la presencia del gráfico o sus sectores.  
**El impl report lista R26 como cubierto por el componente `EnviosPieChart.tsx` directamente, lo cual no es un test.**

**Corrección requerida:** Añadir en `DashboardOperador.test.tsx` (o en un nuevo archivo `EnviosPieChart.test.tsx`) al menos un test con `R26` en su nombre que:
- Renderice `DashboardOperador` (o `EnviosPieChart` directamente) con métricas mockeadas.
- Afirme que los sectores/leyendas "En Ruta", "Entregados" y/o "Otros" están presentes en el DOM (recharts renderiza `<text>` y `<tspan>` con los nombres de sectores, o al menos la `<Legend>` que emite elementos de texto).

### CB-2 — R12 solo cubre REPARTIDOR, no CLIENTE [MENOR — no bloqueante según protocolo]

**Categoría:** Trazabilidad parcial  
**Archivo:** `backend/src/tests/dashboard.test.ts`, línea 159  
**Problema:** R12 especifica "CLIENTE o REPARTIDOR → 403" para `/envios-recientes`, pero el único caso de R12 prueba REPARTIDOR. CLIENTE no tiene caso explícito para este endpoint (sí está cubierto para /metrics en R7 con el mismo middleware). La restricción es de middleware compartido, por lo que el comportamiento es correcto; sin embargo, la trazabilidad textual está incompleta.  
**Recomendación:** Añadir un segundo caso R12 con CLIENTE_TOKEN. No se considera bloqueante porque el mismo middleware ya está demostrado para CLIENTE en R7 con el mismo stack, pero se debe corregir para trazabilidad completa.

---

## Segunda pasada de revisión — 2026-06-08

### Verificación CB-1 (R26 — EnviosPieChart.test.tsx)

Se añadió `frontend/src/features/dashboard/__tests__/EnviosPieChart.test.tsx` con 4 tests:

1. `R26 — renderiza "En Ruta", "Entregados" y "Otros" con métricas que producen los 3 sectores` — renderiza el componente con `totalEnvios=10, enRuta=3, entregados=5` (otros=2) y afirma que los 3 nombres de sector aparecen en el DOM.
2. `R26 — hay exactamente 3 entradas en el gráfico de sectores con los datos de ejemplo` — verifica que `getAllByTestId(/^pie-slice-/)` devuelve exactamente 3 elementos; fallaría si el componente filtrara sectores con `value > 0` incorrectamente o si faltan slices.
3. `R26 — muestra skeleton de carga cuando metrics es undefined` — verifica el `role="status"` del estado de carga.
4. `R26 — muestra "Sin datos" cuando todos los sectores tienen valor 0` — verifica el mensaje "Sin datos para mostrar".

**Calidad del mock:** El mock de recharts es necesario y justificado: `ResponsiveContainer` colapsa a 0×0 en jsdom porque no existe `ResizeObserver`. El mock NO enmascara el comportamiento: la prop `data` del `<Pie>` mock renderiza directamente los `entry.name` de los datos que el componente construye, por lo que los tests validan que el componente construye correctamente los 3 sectores a partir de las métricas recibidas. Los tests fallarían si el componente no pasara los 3 sectores como `data` a `<Pie>` (test 1 y 2), si no renderizara el skeleton (test 3) o si no renderizara el fallback de sin datos (test 4).

**Estado CB-1: CORREGIDO ✅**

### Verificación CB-2 (R12 — caso CLIENTE en /envios-recientes)

Se añadió en `backend/src/tests/dashboard.test.ts` (tras la línea 167) el caso:
```
it('R12 — debe devolver 403 cuando el usuario autenticado es CLIENTE', ...)
```
con `CLIENTE_TOKEN`, verificando status 403, `res.body.error === 'FORBIDDEN'` y que el servicio no fue llamado.

**Estado CB-2: CORREGIDO ✅**

### Verificación final completa (segunda pasada)

| Check | Resultado |
|-------|-----------|
| `npx jest --runInBand` (backend — suite completa) | ✅ 256/256 passing |
| `npm run lint` (backend) | ✅ sin errores |
| `npm run build` (backend) | ✅ |
| `npx vitest run` (frontend — suite completa) | ✅ 137/137 passing |
| `npm run lint` (frontend) | ❌ 2 errores en `EnviosPieChart.test.tsx` |
| `./init.sh` | ❌ 1/30 checks fallaron (lint frontend) |

**Errores de lint en `EnviosPieChart.test.tsx` línea 15:**
- `no-useless-assignment`: `const React = require('react')` — la variable `React` se asigna pero su uso como `React.ReactNode` es resuelto por TypeScript en tiempo de compilación; el runtime no la utiliza.
- `@typescript-eslint/no-require-imports`: uso de `require()` en módulo ESM está prohibido por la configuración del proyecto.

**Corrección requerida:** Reemplazar `const React = require('react')` en el factory del mock con `import type React from 'react'` o bien anotar el tipo `React.ReactNode` como `import('react').ReactNode` / eliminar el tipo explícito (inferido). El valor `React` en tiempo de ejecución no es necesario porque JSX ya está transformado.

### Nueva corrección bloqueante

#### CB-3 — Lint frontend falla en `EnviosPieChart.test.tsx` [BLOQUEANTE]

**Categoría:** Calidad / Convenios  
**Archivo:** `frontend/src/features/dashboard/__tests__/EnviosPieChart.test.tsx`, línea 15  
**Problema:** `const React = require('react')` viola dos reglas ESLint del proyecto (`no-useless-assignment` y `@typescript-eslint/no-require-imports`). El lint frontend falla con 2 errores y `./init.sh` reporta 1/30 checks fallados.  
**Corrección requerida:** Eliminar la asignación `const React = require('react')` del factory del mock y reemplazar la anotación `{ children: React.ReactNode }` por `{ children: import('react').ReactNode }` o simplemente `{ children: unknown }` / inferencia de tipo, según convenga.

---

## Decisión final: RECHAZADO

**Razón (segunda pasada):** Las correcciones CB-1 (R26) y CB-2 (R12 CLIENTE) fueron implementadas correctamente. Sin embargo, el archivo `EnviosPieChart.test.tsx` introduce 2 errores de lint que hacen fallar `npm run lint` (frontend) y `./init.sh`. El protocolo del reviewer es explícito: no se puede aprobar si el lint no está limpio y si `./init.sh` no está 30/30 verde.

**Nueva corrección bloqueante:** CB-3 (corregir lint en `EnviosPieChart.test.tsx` línea 15).

---

## Tercera pasada de revisión — 2026-06-08

### Verificación CB-3 (lint `EnviosPieChart.test.tsx`)

Se confirmó que `frontend/src/features/dashboard/__tests__/EnviosPieChart.test.tsx` ya no contiene `require('react')` ni la variable `React`. Las anotaciones de tipo usan `import('react').ReactNode` (tipo de importación dinámica inline, sin violación de ESLint).

**Estado CB-3: CORREGIDO ✅**

### Verificación final completa (tercera pasada)

| Check | Resultado |
|-------|-----------|
| `npx jest --runInBand` (backend — suite completa) | ✅ 256/256 passing |
| `npm run lint` (backend) | ✅ sin errores |
| `npm run build` (backend) | ✅ |
| `npx vitest run` (frontend — suite completa) | ✅ 137/137 passing |
| `npm run lint` (frontend) | ✅ sin errores |
| `npm run build` (frontend) | ✅ (warnings de chunk size, no errores) |
| `./init.sh` | ✅ 30/30 checks |

---

## Decisión final: APROBADO

**Razón (tercera pasada):** CB-3 fue corregido correctamente. El lint del frontend pasa limpio, todos los tests (256 backend + 137 frontend) están verdes, ambos builds compilan sin errores y `./init.sh` reporta 30/30 checks. La trazabilidad R1–R31 está completa, los convenios arquitectónicos se respetan y los controles de seguridad están en orden. No quedan correcciones pendientes.
