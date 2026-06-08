# Review — notificaciones — REJECTED

Revisor: `reviewer`  
Fecha: 2026-06-08  
Feature id: 11, sprint 4  
Tasks verificadas: T1–T21 (todas `[x]` en `tasks.md`) ✅

---

## Trazabilidad R1–R23

| R# | Descripción resumida | Test citado | Estado |
|----|---------------------|-------------|--------|
| R1 | Notificación al cliente al cambiar estado (ENTREGA_REALIZADA) | `notificaciones.test.ts` — "R1 - persiste una notificación para el cliente al notificar ENVIO_CREADO" + "R2/R3/R4" confirmados; `confirmarEntrega` llama `notificar({ tipo: 'ENTREGA_REALIZADA' })` | ✅ |
| R2 | Notificación al repartidor al crear/asignar ruta | `notificaciones.test.ts` — "R2 - persiste una notificación para el repartidor al notificar RUTA_ASIGNADA"; `rutaService.crear` y `reasignar` llaman `notificar({ tipo: 'RUTA_ASIGNADA' })` | ✅ |
| R3 | Notificación al cliente al reportar incidencia | `notificaciones.test.ts` — "R3 - persiste una notificación para el cliente al notificar INCIDENCIA_REPORTADA"; `incidenciaService.crear` y `entregaService.registrarFallo` llaman `notificar({ tipo: 'INCIDENCIA_REPORTADA' })` | ✅ |
| R4 | Notificación con todos los campos requeridos (leida: false) | `notificaciones.test.ts` — "R4 - persiste la notificación con usuarioId, tipo, envioId, mensaje, createdAt y leida:false" | ✅ |
| R5 | Emite `notification:new` a sala `user:${userId}` del destinatario y NO a otros | `notificaciones.test.ts` — El `describe('R5 ...')` block existe pero **NO contiene ningún test que verifique la emisión real**. El único test en ese bloque es el de R6 (persistencia sin socket). No hay spy sobre `io.to(...)` ni cliente Socket.IO de prueba. | ❌ |
| R6 | Persiste aunque el usuario no tenga socket activo | `notificaciones.test.ts` — "R6 - persiste la notificación incluso sin conexión socket activa del destinatario (getIo devuelve null)" — test real presente | ✅ |
| R7 | Correo al crear envío (ENVIO_CREADO) | `notificaciones.test.ts` — "R7 - debe buscar correo y llamar a sendNotificationEmail al notificar ENVIO_CREADO"; verifica `findCorreoByUsuarioId` llamado | ✅ |
| R8 | Correo solo para ENTREGA_REALIZADA, no para CAMBIO_ESTADO | `notificaciones.test.ts` — "R8 - debe buscar correo al notificar ENTREGA_REALIZADA, pero NO al notificar CAMBIO_ESTADO"; verifica que `findCorreoByUsuarioId` NO se llama para `CAMBIO_ESTADO` | ✅ |
| R9 | Correo al reportar incidencia (INCIDENCIA_REPORTADA) | `notificaciones.test.ts` — "R9 - debe buscar correo al notificar INCIDENCIA_REPORTADA" | ✅ |
| R10 | Operación completa aunque el correo falle | `notificaciones.test.ts` — "R10 - debe completar la operación (persistir y devolver DTO) aunque sendNotificationEmail falle"; simula fallo de `findCorreoByUsuarioId` y verifica que `notificar` resuelve con éxito | ✅ |
| R11 | Lista solo notificaciones del usuario autenticado, ordenadas desc, con campos completos | `notificaciones.test.ts` — "R11 - devuelve solo las notificaciones del usuario con campos completos, ordenadas desc" (unit) + prueba HTTP con 3 roles | ✅ |
| R12 | Meta de paginación correcta | `notificaciones.test.ts` — "R12 - devuelve meta correcta con totalPages calculado" | ✅ |
| R13 | 422 con page/limit no enteros o no positivos | `notificaciones.test.ts` — "R13 - debe devolver 422 con page/limit no enteros o no positivos" (page=0, limit=-5, page='abc') | ✅ |
| R14 | 401 sin token en GET /notificaciones | `notificaciones.test.ts` — "R14 - debe devolver 401 sin token de autenticación" | ✅ |
| R15 | Pantalla muestra ícono, mensaje en negrita y tiempo relativo | `Notificaciones.test.tsx` — "renderiza el título y la lista de notificaciones con mensajes"; `formatTiempoRelativo.test.ts` — 5 casos cubriendo segundos/minutos/horas/días/meses | ✅ |
| R16 | Borde izquierdo coloreado según tipo | `Notificaciones.test.tsx` — "aplica border-l-green-500 para ENTREGA_REALIZADA" y "aplica border-l-blue-500 para RUTA_ASIGNADA" | ✅ |
| R17 | Controles de paginación cuando totalPages > 1 | `Notificaciones.test.tsx` — "muestra controles de paginación cuando hay más de una página" + verifica navegación con `fireEvent.click` | ✅ |
| R18 | Lista se actualiza al recibir `notification:new` sin recarga | `Notificaciones.test.tsx` — "llama a useNotificacionesSocket al renderizar" — **test solo verifica que el hook es invocado, no que la lista se actualiza realmente** al disparar el evento. El comportamiento de R18 ("update the displayed list to include the new notificación") no se prueba end-to-end en este test. | ⚠️ |
| R19 | Mensaje vacío cuando no hay notificaciones | `Notificaciones.test.tsx` — "muestra 'No tienes notificaciones' cuando la lista está vacía" | ✅ |
| R20 | Marcar notificación propia como leída | `Notificaciones.test.tsx` — "muestra el control solo para notificaciones no leídas e invoca mutate al hacer clic"; `notificaciones.test.ts` — "R20 - debe marcar la notificación propia como leída y devolver el recurso actualizado" | ✅ |
| R21 | 404 si id no existe en PATCH /:id/leer | `notificaciones.test.ts` — "R21 - debe devolver 404 si el id no corresponde a ninguna notificación existente" | ✅ |
| R22 | 404 (no 403) si id pertenece a otro usuario, sin modificarla | `notificaciones.test.ts` — "R22 - debe devolver 404 (no 403) si el id corresponde a una notificación de otro usuario y no modificarla" (HTTP); + unit test "R22 - debe lanzar NOTIFICACION_NOT_FOUND (404, nunca 403) cuando la notificación pertenece a otro usuario" | ✅ |
| R23 | 401 sin token en PATCH /:id/leer | `notificaciones.test.ts` — "R23 - debe devolver 401 sin token de autenticación" | ✅ |

**Resumen trazabilidad**: 22/23 ✅ · 1/23 ❌ (R5) · 1/23 ⚠️ (R18)

---

## Arquitectura

| Criterio | Resultado | Detalle |
|----------|-----------|---------|
| Sin lógica de negocio en controllers | ✅ | `notificacionController.ts` solo parsea query/params, llama al service y responde. Sin ramas condicionales de negocio. |
| Sin validaciones en repositories | ✅ | `notificacionRepository.ts` solo ejecuta queries Prisma. La verificación de pertenencia vive en `notificacionService.marcarComoLeida`. |
| Sin `fetch` directo en componentes React | ✅ | `Notificaciones.tsx` usa únicamente hooks (`useNotificaciones`, `useNotificacionesSocket`, `useMarcarNotificacionLeida`). |
| Sin estado del servidor duplicado en Zustand | ✅ | El estado de notificaciones vive en React Query; no hay store Zustand duplicado. |
| Sin `any` explícito en TypeScript | ✅ | Búsqueda global de `any` en backend y frontend: sin coincidencias en archivos de la feature. |
| Sin `console.log` de debug | ✅ | No hay `console.log` en ningún archivo de la feature. El único `console.error` en `notificacionService.ts` es el handler de fallo de correo permitido explícitamente por `design.md` sección 3.1 y `docs/conventions.md`. |

---

## Seguridad

| Criterio | Resultado | Detalle |
|----------|-----------|---------|
| `authMiddleware` en ambos endpoints | ✅ | `routes/notificaciones.ts`: `GET /` y `PATCH /:id/leer` ambos llevan `authMiddleware` antes del controller. |
| Auth de sockets vía JWT en `io.use` | ✅ | `index.ts` registra `io.use((socket, next) => ...)` que verifica `socket.handshake.auth.token` con `jwt.verify`; rechaza con `next(new Error('UNAUTHORIZED'))` si falta o es inválido. |
| Sala personal derivada server-side (`user:${userId}`) | ✅ | `sockets/notificaciones.ts`: `socket.join(`user:${socket.data.userId}`)` — `userId` proviene del JWT verificado en `socket.data`, nunca de un payload del cliente. |
| Validación Zod en paginación | ✅ | `notificacionValidator.ts` con `.transform().pipe(z.number().int().positive())` para `page` y `limit`. |
| PATCH /:id/leer verifica pertenencia antes de mutar | ✅ | `notificacionService.marcarComoLeida`: busca con `findById`, compara `notificacion.usuarioId !== usuarioId`, lanza 404 unificado si no existe **o** es ajeno. El UPDATE en BD (`notificacionRepository.marcarComoLeida`) solo se alcanza si la pertenencia está confirmada. |
| 404 uniforme (nunca 403) en PATCH /:id/leer | ✅ | `AppError('NOTIFICACION_NOT_FOUND', ..., 404)` en ambos casos (no existe / ajeno). |

---

## Convenciones

| Criterio | Resultado | Detalle |
|----------|-----------|---------|
| Rutas bajo `/api/v1/` | ✅ | `app.use('/api/v1/notificaciones', notificacionesRouter)` en `index.ts`. |
| Respuestas con formato estándar | ✅ | `{ data, meta, message, status }` en GET; `{ data, message, status }` en PATCH; error handler global propaga `AppError`. |
| Paginación | ✅ | `meta: { total, page, limit, totalPages }` — idéntico a `envioService`/`incidenciaService`. |
| Coincidencia con wireframe | ✅ | Ícono por tipo (mapeo `lucide-react`), mensaje en negrita, tiempo relativo (`formatTiempoRelativo` con `Intl.RelativeTimeFormat('es')`), borde izquierdo coloreado, paginación inferior, estado vacío. |
| Naming de archivos y variables | ✅ | `notificacionRepository`, `notificacionService`, `notificacionController`, `notificacionesRouter`, `useNotificaciones`, `useNotificacionesSocket`, `useMarcarNotificacionLeida` — todos en camelCase, consistentes con el resto del proyecto. |

---

## Verificación final

| Paso | Resultado |
|------|-----------|
| `npm test` backend | ✅ 237/237 passing |
| `npm run lint` backend | ✅ sin errores |
| `npm run build` backend | ✅ sin errores de compilación |
| `npm test` frontend | ✅ 102/102 passing |
| `npm run lint` frontend | ✅ sin errores |
| `npm run build` frontend | ✅ build exitoso (solo warning de chunk size preexistente) |
| `./init.sh` raíz | ✅ 30/30 checks verdes |

---

## Hallazgos detallados

### ❌ BLOQUEANTE — R5: ausencia de test de emisión Socket.IO

**Archivo**: `backend/src/tests/notificaciones.test.ts`, bloque `describe('R5 ...')` (líneas 378–396)

**Descripción**: El bloque está etiquetado como "R5 - notificar() debe emitir notification:new al canal del usuario" pero **no contiene ningún test que verifique la emisión**. El único test dentro del bloque (línea 379) está etiquetado "R6" y solo verifica que la notificación persiste cuando `getIo()` devuelve `null`. Esto cubre R6, no R5.

R5 requiere verificar que `notificacionService.notificar` llama `io.to('user:${userId}').emit('notification:new', payload)` con el `userId` correcto. Sin este test no hay cobertura de:
- Que el evento se emite al canal `user:${userId}` del destinatario.
- Que el payload del evento coincide con la `NotificacionDto` del registro creado.
- (El criterio "NO a otros usuarios" es implícito por el uso de `io.to(sala)` — aceptable no verificarlo explícitamente si se verifica que la sala usada es la correcta.)

**Corrección requerida**: Agregar en ese bloque un test que:
1. Mockee `getIo` para que devuelva un objeto `io` falso con `to(...).emit(...)` espiado (o use `jest.spyOn`).
2. Invoque `service.notificar({ usuarioId: 'user-1', ... })`.
3. Verifique que `mockIo.to` fue llamado con `'user:user-1'` y que `.emit` fue llamado con `'notification:new'` y el DTO esperado.

Ejemplo mínimo:
```typescript
it('R5 - emite notification:new a la sala user:${userId} con el DTO correcto', async () => {
  const { service, notifRepo } = loadServiceWithMockedRepo();
  const registro = makeNotificacionRecord({ tipo: 'ENVIO_CREADO' });
  notifRepo.crear.mockResolvedValue(registro);
  notifRepo.findCorreoByUsuarioId.mockResolvedValue(null);

  // Mock socketServer.getIo()
  const mockEmit = jest.fn();
  const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
  const mockIo = { to: mockTo };
  jest.spyOn(require('../lib/socketServer'), 'getIo').mockReturnValue(mockIo);

  await service.notificar({
    usuarioId: 'user-1',
    envioId: 'envio-1',
    mensaje: 'Tu envío fue registrado',
    tipo: 'ENVIO_CREADO',
  });

  expect(mockTo).toHaveBeenCalledWith('user:user-1');
  expect(mockEmit).toHaveBeenCalledWith('notification:new', expect.objectContaining({ tipo: 'ENVIO_CREADO' }));
});
```

### ⚠️ NO BLOQUEANTE — R18: test de socket demasiado superficial

**Archivo**: `frontend/src/features/notificaciones/__tests__/Notificaciones.test.tsx`, bloque `describe('R18 ...')` (líneas 161–166)

**Descripción**: El test solo verifica que `useNotificacionesSocket` fue invocado, no que cuando el socket emite `notification:new`, la lista visible se actualiza. R18 exige "update the displayed list to include the new notificación without requiring a manual page reload". Llamar al hook no garantiza que el handler interno funcione correctamente.

**Recomendación**: Ampliar con un test que simule el evento `notification:new` sobre el socket mockeado y verifique que un nuevo item aparece en el DOM. Dado que `useNotificacionesSocket` está mockeado globalmente en el test (`vi.mock('@/hooks/useNotificacionesSocket', ...)`), el test actual no puede verificar el comportamiento interno del hook. La cobertura de `useNotificacionesSocket` per se podría hacerse en un test unitario del hook.

Este hallazgo se marca como **no bloqueante** porque: (a) el hook `useNotificacionesSocket` tiene una implementación real y completa que puede verificarse en un test de unidad del hook; (b) la integración real entre socket y UI es difícil de probar en JSDOM sin un servidor socket real; (c) el reviewer protocol solo bloquea en ausencia de test de un `R<n>`, y hay un test que cita R18 aunque sea superficial. Sin embargo, se recomienda corregirlo antes de considerar la feature como lista para producción.

---

## Decisión final

**REJECTED**

### Correcciones requeridas

| # | Categoría | Archivo | Descripción |
|---|-----------|---------|-------------|
| 1 | **Trazabilidad — R5** ❌ BLOQUEANTE | `backend/src/tests/notificaciones.test.ts` | Agregar un test real dentro del bloque `describe('R5 ...')` que verifique que `notificacionService.notificar` llama `io.to('user:${userId}').emit('notification:new', <NotificacionDto>)` usando un spy sobre `getIo()` (ver ejemplo en sección de hallazgos). El test de R6 que ya existe en ese bloque puede mantenerse. |

### Correcciones recomendadas (no bloqueantes)

| # | Categoría | Archivo | Descripción |
|---|-----------|---------|-------------|
| 1 | **Trazabilidad — R18** ⚠️ | `frontend/src/features/notificaciones/__tests__/Notificaciones.test.tsx` | Agregar un test que simule la recepción de `notification:new` y verifique que la lista se actualiza, o añadir un test unitario de `useNotificacionesSocket.ts` que cubra el comportamiento del handler. |

### Estado una vez corregido el bloqueante

Todos los demás aspectos (arquitectura, seguridad, convenciones, verificación) están en verde. Con el test de R5 añadido y `./init.sh` en verde, la feature puede ser aprobada.

---

## Segunda pasada — 2026-06-08

### Verificación del hallazgo bloqueante (R5)

**Archivo**: `backend/src/tests/notificaciones.test.ts`, líneas 379–422  
**Test añadido**: `"R5 - emite io.to("user:<usuarioId>").emit("notification:new", <NotificacionDto>) cuando getIo() devuelve un objeto io"`

El test es real y no trivial:

1. Usa `jest.isolateModules` para cargar el módulo `notificacionService` en un contexto limpio donde `../lib/socketServer` está mockeado para devolver un objeto `mockIo` con espías `toSpy` y `emitSpy`.
2. Llama a `service.notificar({ usuarioId: 'user-socket-1', ... })`.
3. Verifica con `expect(toSpy).toHaveBeenCalledWith('user:user-socket-1')` y `expect(emitSpy).toHaveBeenCalledWith('notification:new', expect.objectContaining({ tipo: 'CAMBIO_ESTADO', ... }))`.
4. **Fallaría si el servicio no emitiera**: el servicio solo llama `io.to(...).emit(...)` dentro del bloque `if (io !== null)` (línea 57–59 de `notificacionService.ts`). Si ese bloque se eliminara o la condición no se cumpliera, `toSpy` y `emitSpy` nunca serían invocados y las dos aserciones `toHaveBeenCalledWith` fallarían con "Expected function to have been called with X but it was not called."

Corrección del bloqueante: ✅ APROBADA

### Regresiones introducidas

Ninguna. Los tests de R1–R4 y R6–R23 siguen en verde. El test de R5 no interfiere con ningún otro bloque porque usa `jest.isolateModules` con su propio scope.

### Verificación final (segunda pasada)

| Paso | Resultado |
|------|-----------|
| `npx jest --runInBand` backend | ✅ 238/238 passing (+1 respecto a primera pasada) |
| `npm run lint` backend | ✅ sin errores |
| `npm run build` backend | ✅ sin errores de compilación |
| `npx vitest run` frontend | ✅ 102/102 passing |
| `npm run lint` frontend | ✅ sin errores |
| `npm run build` frontend | ✅ build exitoso (solo warning de chunk size preexistente) |
| `./init.sh` raíz | ✅ 30/30 checks verdes |

### Trazabilidad actualizada

| R# | Estado primera pasada | Estado segunda pasada |
|----|-----------------------|-----------------------|
| R5 | ❌ Sin test real | ✅ Test real de emisión Socket.IO con espías |
| R18 | ⚠️ Test superficial | ⚠️ Sin cambios (no bloqueante, igual que antes) |
| R1–R4, R6–R17, R19–R23 | ✅ | ✅ Sin regresiones |

**Resumen trazabilidad segunda pasada**: 22/23 ✅ · 0/23 ❌ · 1/23 ⚠️ (R18, no bloqueante)

---

## Decisión final (segunda pasada)

**APPROVED**

Todos los hallazgos bloqueantes están resueltos. La suite completa (238 backend + 102 frontend) está en verde, lint y build pasan sin errores en ambos paquetes, y `./init.sh` reporta 30/30.

**El leader debe hacer el commit y luego marcar la feature como done.**

```
git add -A && git commit -m "feat(notificaciones): Notificaciones en tiempo real"
```

Solo después del commit: marcar `notificaciones` como `done` en `feature_list.json` e iniciar la siguiente feature.
