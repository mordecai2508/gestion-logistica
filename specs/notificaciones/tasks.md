# Tasks — notificaciones

> Orden estándar: schema Prisma → validator → repository → service →
> controller → routes → tests backend → componentes frontend → service
> frontend → hook → tests frontend → verificación.
> Marcar `[x]` al completar cada task.

---

- [x] T1. Ejecutar la migración Prisma APROBADA por el humano (`design.md`
      sección 2 y Decisión técnica 5.3, revisada — ya **no** es una
      disyuntiva, es una instrucción directa):
      1. Agregar al `schema.prisma` el nuevo enum `TipoNotificacion` con
         exactamente estos 5 valores: `ENVIO_CREADO`, `CAMBIO_ESTADO`,
         `ENTREGA_REALIZADA`, `RUTA_ASIGNADA`, `INCIDENCIA_REPORTADA`.
      2. Agregar la columna `tipo TipoNotificacion` (no nula, sin
         `@default`) al modelo `Notificacion` (que ya existe con `id`,
         `mensaje`, `leida`, `usuarioId`, `envioId`, `createdAt`, relaciones
         `usuario`/`envio` — confirmar que esos campos siguen intactos).
      3. Generar la migración con
         `npx prisma migrate dev --name add_tipo_notificacion`. Si Prisma
         solicita un valor para las filas existentes (columna nueva no
         nula), seguir la guía de "Migración de datos existentes" de
         `design.md` sección 2 (asignar `CAMBIO_ESTADO` como valor por
         defecto para filas preexistentes, o reiniciar la BD de desarrollo
         si no hay datos relevantes que conservar).
      4. Verificar que `npx prisma generate` corrió (automático tras
         `migrate dev`) y que `@prisma/client` expone el nuevo enum
         `TipoNotificacion` y el campo `Notificacion.tipo`.

- [x] T2. Crear `backend/src/types/notificacionTypes.ts` con
      `TipoNotificacion` (unión de literales — puede derivarse del enum
      Prisma o declararse independiente, según el patrón ya usado para
      otros enums del dominio en `backend/src/types/*Types.ts`),
      `NotificacionDto`, `CrearNotificacionInput`, `NotificationNewPayload`
      y `PaginatedNotificacionesResponse` (ver `design.md` sección 1).
      Reutilizar/importar `PaginationMeta` desde `envioTypes.ts` sin
      duplicar la interfaz.

- [x] T3. Crear `backend/src/validators/notificacionValidator.ts` con
      `listarNotificacionesSchema` (query `{ page?: int positivo (default
      1), limit?: int positivo (default 20) }`, mismo patrón
      `.transform(...).pipe(...)` que `listarEnviosSchema`/
      `listarIncidenciasSchema` — R13). Exportar el tipo inferido
      `ListarNotificacionesInput`. (No se requiere un schema para `PATCH
      /:id/leer`: no recibe body ni query, solo el parámetro de ruta `id`
      — ver `design.md` sección 3.5.)

- [x] T4. Crear `backend/src/repositories/notificacionRepository.ts` con:
      - `crear(data: { usuarioId, envioId?, mensaje, tipo })` — el campo
        `tipo` se incluye desde el inicio (persistido directamente en la
        columna agregada en T1, sin heurísticas — `design.md` sección 3.1).
      - `findManyByUsuario(usuarioId, skip, limit)` (con `orderBy: {
        createdAt: 'desc' }`, proyectando también `tipo` desde BD) y
        `countByUsuario(usuarioId)` (R11, R12).
      - `findById(id: string)` — usado por `marcarComoLeida` para verificar
        existencia y pertenencia antes de mutar (R21, R22, `design.md`
        sección 3.5).
      - `marcarComoLeida(id: string)` — `UPDATE ... SET leida = true WHERE
        id = :id`, devuelve el registro actualizado (R20).
      Solo acceso a Prisma — cero lógica de negocio ni validaciones de
      pertenencia (esas viven en el servicio; regla crítica de
      `docs/architecture.md`).

- [x] T5. Extender `backend/src/lib/mailer.ts` agregando una función
      genérica `sendNotificationEmail(correo: string, asunto: string,
      cuerpoHtml: string): Promise<void>` que reutiliza el `transporter`
      existente y replica el guard `if (process.env.NODE_ENV === 'test')
      return;` de `sendPasswordResetEmail` (ver `design.md` sección 6 —
      necesario para que los tests no dependan de SMTP real).

- [x] T6. Crear `backend/src/services/notificacionService.ts` con:
      - `notificar(input: CrearNotificacionInput): Promise<NotificacionDto>`
        — orquesta persistencia + emisión Socket.IO + correo condicional,
        siguiendo exactamente los pasos de `design.md` sección 3.1
        (incluyendo el `try/catch` que aísla el fallo de correo sin
        propagarlo — R10). Persiste `tipo` directamente (T1/T4) y lo
        proyecta desde el registro creado, sin "recordarlo" del input.
        Recibe la instancia `io` de Socket.IO (inyectada o importada desde
        `index.ts`/un módulo compartido — definir el mecanismo de acceso a
        `io` desde un servicio sin crear una dependencia circular con
        `index.ts`, p.ej. extrayendo la creación de `io` a
        `lib/socketServer.ts` si `index.ts` no es importable limpiamente).
      - `listar(usuarioId: string, query: ListarNotificacionesInput):
        Promise<PaginatedNotificacionesResponse>` — pagina, proyecta cada
        fila a `NotificacionDto` leyendo `tipo` **directamente de BD**
        (asignación simple `tipo: row.tipo`, sin heurísticas — `design.md`
        sección 3.4, revisada) y arma `meta` (R11, R12).
      - `marcarComoLeida(id: string, usuarioId: string):
        Promise<NotificacionDto>` (**nuevo** — cubre R20-R22, ampliación de
        alcance aprobada): busca con `findById`, lanza
        `AppError('NOTIFICACION_NOT_FOUND', 'Notificación no encontrada',
        404)` si no existe **o** si `notificacion.usuarioId !== usuarioId`
        (un único 404 para ambos casos — verificación de pertenencia
        CRÍTICA, nunca reveladora de la existencia de recursos ajenos), es
        idempotente si ya está `leida: true` (no relanza error ni repite el
        `UPDATE`), y en otro caso llama a `notificacionRepository
        .marcarComoLeida(id)` y proyecta el resultado (`design.md` sección
        3.5).

- [x] T7. Crear `backend/src/controllers/notificacionController.ts` con:
      - `listarNotificaciones` — extrae/valida params con
        `listarNotificacionesSchema` (T3), llama a
        `notificacionService.listar(req.user!.id, query)` y responde
        `{ data, meta, message: "Notificaciones obtenidas", status: 200 }`
        (ver `docs/conventions.md`).
      - `marcarNotificacionComoLeida` (**nuevo** — R20) — extrae `:id` de
        `req.params`, llama a
        `notificacionService.marcarComoLeida(id, req.user!.id)` y responde
        `{ data, message: "Notificación marcada como leída", status: 200 }`.
        No valida body (no lo recibe — ver T3).

- [x] T8. Crear `backend/src/routes/notificaciones.ts`: `Router` con
      - `GET /` (`authMiddleware`, `listarNotificaciones` — sin
        `roleMiddleware`, ver `design.md` sección 6).
      - `PATCH /:id/leer` (`authMiddleware`, `marcarNotificacionComoLeida`
        — sin `roleMiddleware`, mismo criterio de "filtra por identidad, no
        por rol" que el listado; **nuevo**, R20-R23).
      Registrar el router en `backend/src/index.ts` como
      `app.use('/api/v1/notificaciones', notificacionesRouter)`.

- [x] T9. Crear el middleware de autenticación de sockets y el auto-join a
      la sala personal (`design.md` sección 3.2 y Decisión técnica 5.1):
      - Agregar `io.use((socket, next) => ...)` en `backend/src/index.ts`
        (o extraído a `sockets/auth.ts`) que verifica el JWT recibido en
        `socket.handshake.auth.token` (reutilizando la lógica de
        verificación de `authMiddleware` — extraerla a una función
        compartida si es razonable, sin duplicar el `try/catch` de
        `jwt.verify`), adjunta `socket.data.userId = payload.id` en éxito,
        y rechaza la conexión (`next(new Error('UNAUTHORIZED'))`) en caso
        contrario.
      - En `io.on('connection', (socket) => ...)`, unir el socket
        autenticado a la sala `user:${socket.data.userId}` (p.ej. en un
        nuevo `backend/src/sockets/notificaciones.ts` que exporta
        `registerNotificacionHandlers(io, socket)` — paridad de estilo con
        `registerTrackingHandlers`).

- [x] T10. Integrar `notificacionService.notificar` en los puntos de
      disparo de `design.md` sección 3.3 (cubre R1, R2, R3):
      - `envioService.crear`: agregar la llamada con `tipo: 'ENVIO_CREADO'`
        tras crear el envío (cierra la brecha preexistente documentada en
        `design.md` sección 0 — el servicio hoy no notifica pese a que la
        descripción de `envios_crear` dice "notifica al cliente").
      - `entregaService.confirmarEntrega`: **reemplazar** la llamada actual
        a `entregaRepository.crearNotificacion` por
        `notificacionService.notificar({ ..., tipo: 'ENTREGA_REALIZADA' })`
        (no duplicar el registro en BD).
      - `entregaService.registrarFallo`: **reemplazar** la llamada actual a
        `entregaRepository.crearNotificacion` por
        `notificacionService.notificar({ ..., tipo: 'CAMBIO_ESTADO' })`.
      - `rutaService` (creación y reasignación de repartidor/vehículo):
        agregar la llamada con `tipo: 'RUTA_ASIGNADA'` dirigida al
        `usuarioId` del repartidor asignado. Antes de escribir el código,
        confirmar si ya existe alguna notificación en `rutaService`
        (no se encontró evidencia al redactar este spec, pero verificar).
      - `incidenciaService.crear` (reporte manual de incidencia) y el
        camino de incidencia automática dentro de
        `entregaService.registrarFallo`: agregar la llamada con
        `tipo: 'INCIDENCIA_REPORTADA'` dirigida al `usuarioId` del cliente
        del envío referenciado.
      - Eliminar `entregaRepository.crearNotificacion` si queda sin uso
        tras las migraciones anteriores (evitar código muerto).

- [x] T11. Escribir tests backend (Jest + Supertest) en
      `backend/src/tests/notificaciones.test.ts` cubriendo, como mínimo:
      - `R1` — debe persistir una notificación para el cliente al cambiar
        el estado de un envío (p.ej. al confirmarse la entrega).
      - `R2` — debe persistir una notificación para el repartidor al
        crear/asignar una ruta.
      - `R3` — debe persistir una notificación para el cliente al reportar
        una incidencia sobre su envío.
      - `R4` — debe persistir la notificación con `usuarioId`, `tipo`,
        `envioId` (cuando aplica), `mensaje`, `createdAt` y
        `leida: false`.
      - `R5` — debe emitir el evento Socket.IO `notification:new` a la sala
        `user:${usuarioId}` del destinatario correcto y NO a otros usuarios
        (test de integración con cliente Socket.IO real o spy sobre `io.to`).
      - `R6` — debe persistir la notificación aunque el destinatario no
        tenga una conexión Socket.IO activa en el momento de la emisión.
      - `R7` — debe enviar un correo (mock/spy de `sendNotificationEmail`)
        al crear un nuevo envío.
      - `R8` — debe enviar un correo al cambiar el estado de un envío a
        `ENTREGADO`, y NO enviarlo en otras transiciones de estado.
      - `R9` — debe enviar un correo al reportar una incidencia.
      - `R10` — debe completar la operación disparadora (y devolver 2xx)
        aunque el envío de correo falle (mockear `sendNotificationEmail`
        para que rechace y verificar que la notificación igual se persiste
        y se emite por socket).
      - `R11` — debe listar solo las notificaciones del usuario autenticado,
        ordenadas de más reciente a más antigua, con sus campos completos
        (incluyendo `tipo` leído directamente de BD).
      - `R12` — debe devolver `meta` con `total`, `page`, `limit`,
        `totalPages` correctos.
      - `R13` — debe devolver 422 con `page`/`limit` no enteros o no
        positivos.
      - `R14` — debe devolver 401 sin token de autenticación.
      - `R20` — `PATCH /notificaciones/:id/leer` debe marcar la
        notificación propia como `leida: true` y devolver el recurso
        actualizado.
      - `R21` — debe devolver 404 si el `id` no corresponde a ninguna
        notificación existente.
      - `R22` — debe devolver 404 (no 403) si el `id` corresponde a una
        notificación de **otro** usuario, y no debe modificarla (verificar
        en BD que su `leida` permanece `false`) — test CRÍTICO de
        aislamiento entre usuarios.
      - `R23` — debe devolver 401 sin token de autenticación.

- [x] T12. Crear `frontend/src/types/notificacionTypes.ts` replicando
      `TipoNotificacion`, `NotificacionDto`,
      `PaginatedNotificacionesResponse` y `NotificationNewPayload` (sin
      importar `@prisma/client`, mismo patrón de `incidenciaTypes.ts`/
      `entregaTypes.ts` del frontend).

- [x] T13. Extender `frontend/src/lib/socket.ts` para enviar el
      `accessToken` en `socket.handshake.auth` al conectar (ver `design.md`
      sección 4 — opción `auth: (cb) => cb({ token })` o `socket.auth = {
      token }` antes de `connect()`), leyendo el token vigente de
      `useAuthStore`.

- [x] T14. Crear `frontend/src/services/notificacionService.ts` con:
      - `listar(filters: { page?, limit? }):
        Promise<PaginatedNotificacionesResponse>` (llamada HTTP vía la
        instancia `api` configurada — `GET /api/v1/notificaciones`).
      - `marcarComoLeida(id: string): Promise<NotificacionDto>` (**nuevo**
        — R20) — `PATCH /api/v1/notificaciones/:id/leer`, sin body.

- [x] T15. Crear `frontend/src/hooks/useNotificaciones.ts`
      (`useQuery` con `queryKey: ['notificaciones', { page, limit }]`),
      `frontend/src/hooks/useNotificacionesSocket.ts` (conecta el socket si
      hace falta, escucha `notification:new`, antepone el item a la query
      cacheada o invalida `['notificaciones']`, limpia el listener al
      desmontar — mismo patrón de cleanup que `useTrackingSocket`) y
      `frontend/src/hooks/useMarcarNotificacionLeida.ts` (**nuevo** — R20,
      ampliación de alcance aprobada): `useMutation` que llama a
      `notificacionService.marcarComoLeida(id)` y en `onSuccess` actualiza
      la query cacheada `['notificaciones', { page, limit }]` reemplazando
      el item afectado por la `NotificacionDto` devuelta (`leida: true`)
      vía `queryClient.setQueryData` (`design.md` sección 4).

- [x] T16. Crear la utilidad `formatTiempoRelativo(iso: string): string`
      (función pura, sin nuevas dependencias — ver `design.md` Decisión
      técnica 5.6) en `frontend/src/lib/` o `components/shared/`, usando
      `Intl.RelativeTimeFormat('es', { numeric: 'auto' })` o aritmética de
      fechas equivalente.

- [x] T17. Crear `frontend/src/features/notificaciones/Notificaciones.tsx`
      según el wireframe: lista de notificaciones con ícono según `tipo`
      (mapeo a `lucide-react`), mensaje en negrita + descripción (mismo
      texto, ver Decisión técnica 5.5), tiempo relativo
      (`formatTiempoRelativo`, R15), borde izquierdo coloreado según `tipo`
      (R16), paginación inferior cuando `meta.totalPages > 1` (R17),
      mensaje de estado vacío "No tienes notificaciones" (R19), suscripción
      en vivo vía `useNotificacionesSocket` que actualiza la lista al
      recibir `notification:new` (R18), y un control "marcar como leída"
      (visible solo en items con `leida: false`) conectado a
      `useMarcarNotificacionLeida` que se deshabilita mientras la mutación
      está en curso y refleja el nuevo estado al resolver con éxito
      (**nuevo** — R20, ver `design.md` sección 4).

- [x] T18. Registrar la ruta `/notificaciones` en `frontend/src/router/`
      con `<ProtectedRoute roles={['CLIENTE', 'OPERADOR', 'REPARTIDOR']}>`
      envolviendo `<Notificaciones />` (ver `design.md` Decisión técnica
      5.4 — decisión ya CERRADA y aprobada por el humano, los 3 roles
      quedan confirmados).

- [x] T19. Actualizar la tabla "Rutas frontend permitidas" de
      `docs/architecture.md` (líneas 74-78) para reflejar que
      `/notificaciones` está disponible para los 3 roles aprobados
      (`CLIENTE`, `OPERADOR`, `REPARTIDOR`) — agregar `/notificaciones` a
      las filas de `OPERADOR` y `REPARTIDOR`, que actualmente no la listan
      (ver `design.md` Decisión técnica 5.4, decisión final). **Nuevo** —
      agregada tras la aprobación del humano de habilitar los 3 roles.

- [x] T20. Escribir tests frontend (Vitest + Testing Library):
      - `frontend/src/features/notificaciones/__tests__/Notificaciones.test.tsx`:
        `R15` — debe mostrar cada notificación con ícono, mensaje en
        negrita y tiempo relativo;
        `R16` — debe aplicar el color de borde correspondiente al `tipo`;
        `R17` — debe mostrar controles de paginación cuando hay más de una
        página;
        `R18` — debe insertar una nueva notificación en la lista al recibir
        un evento `notification:new` simulado (mock del socket);
        `R19` — debe mostrar el mensaje de lista vacía cuando no hay
        notificaciones;
        `R20` — debe invocar la mutación de "marcar como leída" al
        interactuar con su control y reflejar visualmente el nuevo estado
        `leida: true` tras una respuesta exitosa simulada (mock del
        servicio/hook) (**nuevo** — ampliación de alcance aprobada).
      - Test de `formatTiempoRelativo`: debe devolver cadenas como "hace 5
        minutos"/"hace 2 horas"/"hace 3 días" para diferencias de tiempo
        conocidas (cubre la utilidad usada en R15).

- [x] T21. Verificación final: ejecutar `./init.sh` desde la raíz (lint +
      tests de backend y frontend + validación de `feature_list.json`/specs);
      confirmar `npm run lint`, `npm test` y `npm run build` en verde para
      `backend/` y `frontend/` antes de marcar la feature como lista para
      revisión.
