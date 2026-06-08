# Informe de implementación — notificaciones (id 11)

Fecha: 2026-06-08  
Estado: completo  
Verificación: `./init.sh` 30/30 ✅ | backend 237 tests | frontend 102 tests

---

## Archivos creados

### Backend
- `backend/prisma/migrations/20260608210524_add_tipo_notificacion/migration.sql`
- `backend/src/types/notificacionTypes.ts`
- `backend/src/validators/notificacionValidator.ts`
- `backend/src/repositories/notificacionRepository.ts`
- `backend/src/lib/socketServer.ts`
- `backend/src/services/notificacionService.ts`
- `backend/src/controllers/notificacionController.ts`
- `backend/src/routes/notificaciones.ts`
- `backend/src/sockets/notificaciones.ts`
- `backend/src/tests/notificaciones.test.ts`

### Frontend
- `frontend/src/types/notificacionTypes.ts`
- `frontend/src/services/notificacionService.ts`
- `frontend/src/hooks/useNotificaciones.ts`
- `frontend/src/hooks/useNotificacionesSocket.ts`
- `frontend/src/hooks/useMarcarNotificacionLeida.ts`
- `frontend/src/lib/formatTiempoRelativo.ts`
- `frontend/src/features/notificaciones/Notificaciones.tsx`
- `frontend/src/features/notificaciones/__tests__/Notificaciones.test.tsx`
- `frontend/src/lib/__tests__/formatTiempoRelativo.test.ts`

---

## Archivos modificados

### Backend
- `backend/prisma/schema.prisma` — añadido enum `TipoNotificacion` y columna `tipo` en modelo `Notificacion`
- `backend/src/lib/mailer.ts` — añadida `sendNotificationEmail` con guard `NODE_ENV=test`
- `backend/src/index.ts` — registrado `io.use()` JWT middleware, `setIo(io)`, router `/api/v1/notificaciones`, `registerNotificacionHandlers`
- `backend/src/services/envioService.ts` — añadida llamada `notificar({ tipo: 'ENVIO_CREADO' })`
- `backend/src/services/entregaService.ts` — reemplazado `crearNotificacion` por `notificar` para `ENTREGA_REALIZADA`, `CAMBIO_ESTADO` e `INCIDENCIA_REPORTADA`
- `backend/src/services/rutaService.ts` — añadida llamada `notificar({ tipo: 'RUTA_ASIGNADA' })` en crear y reasignar
- `backend/src/services/incidenciaService.ts` — añadida llamada `notificar({ tipo: 'INCIDENCIA_REPORTADA' })`
- `backend/src/repositories/entregaRepository.ts` — eliminado `crearNotificacion` (código muerto)
- `backend/src/tests/entregaConfirmar.test.ts` — mock de `notificacionService`; actualizado PrismaClient mock
- `backend/src/tests/entregaFallo.test.ts` — ídem
- `backend/src/tests/envios.test.ts` — mock de `notificacionService`; actualizado PrismaClient mock
- `backend/src/tests/incidencias.test.ts` — mock de `notificacionService`; actualizado PrismaClient mock
- `backend/src/tests/rutas.test.ts` — mock de `notificacionService`; actualizado PrismaClient mock
- `backend/src/tests/tracking.test.ts` — añadido JWT `auth` token en conexiones socket

### Frontend
- `frontend/src/lib/socket.ts` — añadida opción `auth: (cb) => cb({ token })` desde `useAuthStore`
- `frontend/src/router/index.tsx` — registrada ruta `/notificaciones` en `ProtectedRoute` con los 3 roles
- `docs/architecture.md` — actualizada tabla de rutas para OPERADOR y REPARTIDOR incluyendo `/notificaciones`

---

## Tabla de trazabilidad R1–R23

| Req | Descripción | Test que lo cubre |
|-----|-------------|-------------------|
| R1 | Notificación al cambiar estado de envío (ENTREGA_REALIZADA) | `notificaciones.test.ts` — "debe persistir una notificación ENTREGA_REALIZADA al confirmar la entrega" |
| R2 | Notificación para el repartidor al asignar ruta | `notificaciones.test.ts` — "debe persistir una notificación RUTA_ASIGNADA para el repartidor al crear una ruta" |
| R3 | Notificación para el cliente al reportar incidencia | `notificaciones.test.ts` — "debe persistir una notificación INCIDENCIA_REPORTADA para el cliente" |
| R4 | Notificación persiste con todos sus campos (leida:false) | `notificaciones.test.ts` — "debe persistir la notificación con usuarioId, tipo, envioId, mensaje, createdAt y leida:false" |
| R5 | Emite Socket.IO `notification:new` a sala `user:${userId}` correcta | `notificaciones.test.ts` — "debe emitir el evento notification:new a la sala del usuario destinatario" |
| R6 | Persiste aunque el usuario no tenga socket activo | `notificaciones.test.ts` — "debe persistir la notificación aunque el destinatario no tenga socket activo" |
| R7 | Envía correo para ENVIO_CREADO | `notificaciones.test.ts` — "debe enviar correo al crear un nuevo envío (ENVIO_CREADO)" |
| R8 | Envía correo solo para ENTREGA_REALIZADA, no para otras transiciones | `notificaciones.test.ts` — "debe enviar correo al confirmar entrega (ENTREGA_REALIZADA)" y "no debe enviar correo para CAMBIO_ESTADO" |
| R9 | Envía correo para INCIDENCIA_REPORTADA | `notificaciones.test.ts` — "debe enviar correo al reportar incidencia (INCIDENCIA_REPORTADA)" |
| R10 | Operación completa aunque el correo falle | `notificaciones.test.ts` — "debe completar la operación aunque el envío de correo falle" |
| R11 | Lista notificaciones del usuario autenticado ordenadas desc | `notificaciones.test.ts` — "debe listar solo las notificaciones del usuario autenticado, ordenadas de más reciente a más antigua" |
| R12 | Devuelve meta con paginación correcta | `notificaciones.test.ts` — "debe devolver meta con total, page, limit, totalPages correctos" |
| R13 | 422 con page/limit no enteros o no positivos | `notificaciones.test.ts` — "debe devolver 422 con page no entero" y "debe devolver 422 con limit cero" |
| R14 | 401 sin token en GET /notificaciones | `notificaciones.test.ts` — "debe devolver 401 sin token en GET /notificaciones" |
| R15 | Muestra notificación con ícono, mensaje negrita y tiempo relativo | `Notificaciones.test.tsx` — "renderiza el título y la lista de notificaciones con mensajes"; `formatTiempoRelativo.test.ts` — todos los casos |
| R16 | Borde izquierdo coloreado según tipo | `Notificaciones.test.tsx` — "aplica border-l-green-500 para ENTREGA_REALIZADA" y "aplica border-l-blue-500 para RUTA_ASIGNADA" |
| R17 | Controles de paginación cuando totalPages > 1 | `Notificaciones.test.tsx` — "muestra controles de paginación cuando hay más de una página" |
| R18 | Suscripción en vivo via socket | `Notificaciones.test.tsx` — "llama a useNotificacionesSocket al renderizar" |
| R19 | Mensaje vacío "No tienes notificaciones" | `Notificaciones.test.tsx` — "muestra 'No tienes notificaciones' cuando la lista está vacía" |
| R20 | Marcar como leída al hacer clic en control | `Notificaciones.test.tsx` — "muestra el control solo para notificaciones no leídas e invoca mutate al hacer clic"; `notificaciones.test.ts` — "debe marcar la notificación propia como leída" |
| R21 | 404 si id no existe en PATCH /:id/leer | `notificaciones.test.ts` — "debe devolver 404 si la notificación no existe" |
| R22 | 404 (no 403) si id pertenece a otro usuario | `notificaciones.test.ts` — "debe devolver 404 si la notificación pertenece a otro usuario y no modificarla" |
| R23 | 401 sin token en PATCH /:id/leer | `notificaciones.test.ts` — "debe devolver 401 sin token en PATCH /:id/leer" |
