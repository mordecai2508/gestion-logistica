# Design — entregas_reactivar_fallida

> Describe el "cómo". Referencia directa al stack y convenciones de
> `docs/architecture.md` y `docs/conventions.md`.

---

## 1. Endpoints

| # | Método | Ruta | Auth | Rol | Body / Query (entrada) | Respuesta exitosa | Código |
|---|--------|------|------|-----|------------------------|-------------------|--------|
| 1 | PATCH | `/api/v1/incidencias/:id` | Bearer token (authMiddleware) | OPERADOR | JSON body: `{ estado: EstadoIncidencia }` (sin cambios de firma) | `{ data: IncidenciaDto, message: "Estado de incidencia actualizado", status: 200 }` | 200 |

No se añaden endpoints nuevos ni se modifica la firma de
`PATCH /api/v1/incidencias/:id` (`incidenciaController.actualizarEstadoIncidencia`,
`actualizarEstadoIncidenciaSchema`). El payload de entrada y el `IncidenciaDto`
de salida son idénticos a los de `incidencias_gestion`. Toda la lógica nueva
vive dentro de `incidenciaService.actualizarEstado`.

Los endpoints `GET /api/v1/entregas?repartidorId=me` (alias
`GET /api/v1/repartidor/entregas`) y `POST /api/v1/envios/:id/confirmar` /
`POST /api/v1/envios/:id/fallo` (de `entregas_confirmacion`) tampoco cambian de
firma: su comportamiento correcto para el envío reactivado es consecuencia de
que `entregaService` ya clasifica por `estado` (R8, R9) — ver sección 3.

**Códigos de error:** sin cambios respecto a `incidencias_gestion`
(`INCIDENCIA_NOT_FOUND` 404, `INVALID_STATE_TRANSITION` 409, `FORBIDDEN` 403,
`401` sin token, `422` validación Zod). No se introduce ningún código de error
nuevo.

---

## 2. Schema Prisma

**No se requiere ninguna migración.** Todos los modelos, campos y valores de
enum necesarios ya existen:

| Modelo / Enum | Elemento usado | Uso en esta feature |
|---|---|---|
| `Incidencia` | `tipo` (`TipoIncidencia.ENTREGA_FALLIDA`), `estado` (`EstadoIncidencia.RESUELTA`), `envioId` | Condición de entrada para la reactivación (R1) y campo de actualización existente. |
| `Envio` | `estado` (`EstadoEnvio.FALLIDO` → `EstadoEnvio.EN_RUTA`) | Transición de estado del envío reactivado (R1). |
| `EventoEnvio` | `envioId`, `estado` (`EN_RUTA`), `descripcion`, `timestamp` (`@default(now())`) | Registro de historial de la reactivación (R2). |
| `Cliente` / `Usuario` | `cliente.usuarioId` (vía `envio.cliente`) | Resolver el destinatario de la notificación (R4). |
| `TipoNotificacion` (enum) | `CAMBIO_ESTADO` | Tipo de notificación elegido para "envío reactivado" — ver sección 5. |

No se agregan campos, tablas ni valores de enum.

---

## 3. Lógica de negocio

### `incidenciaService.actualizarEstado(id, nuevoEstado)` — algoritmo completo (R1, R3, R5–R7)

El orden de las validaciones existentes **no cambia**; la lógica de
reactivación se añade **después** de que todas las validaciones actuales hayan
pasado, y solo aplica condicionalmente:

1. `incidencia = incidenciaRepository.findById(id)`.
   - Si `null` → `AppError('INCIDENCIA_NOT_FOUND', 'Incidencia no encontrada', 404)`.
     *(sin cambios)*
2. Si `nuevoEstado === incidencia.estado` →
   `AppError('INVALID_STATE_TRANSITION', 'La incidencia ya se encuentra en ese estado', 409)`.
   *(sin cambios — R7)*
3. Si `incidencia.estado === 'RESUELTA'` →
   `AppError('INVALID_STATE_TRANSITION', 'No se puede reabrir una incidencia resuelta', 409)`.
   *(sin cambios — R7)*
4. **(Nuevo)** Evaluar la condición de reactivación:
   ```
   esReactivacion =
     nuevoEstado === 'RESUELTA'
     AND incidencia.tipo === 'ENTREGA_FALLIDA'
     AND envio.estado === 'FALLIDO'   // envio resuelto en el siguiente paso
   ```
   Para evaluar `envio.estado` se necesita cargar el envío asociado **antes**
   de decidir el camino de ejecución:
   - `envio = envioRepository.findById(incidencia.envioId)`.
     - Si `null` → este caso no debería ocurrir en datos consistentes (toda
       `Incidencia.envioId` referencia un `Envio` existente por FK); no se
       define un nuevo código de error para esto. Si `envio === null`, se
       trata como "no es reactivación" (`esReactivacion = false`) y se sigue
       el camino 5b (comportamiento sin cambios), ya que no hay nada que
       reactivar.
   - `envio` (tipo `EnvioConDetalle`, incluye `cliente.usuario`) se reutiliza
     más abajo para resolver `cliente.usuarioId` y `codigoSeguimiento` sin una
     segunda consulta (R4).
5. Bifurcación:
   - **5a. `esReactivacion === true`** (R1–R4):
     1. Llamar a
        `incidenciaRepository.resolverConReactivacionEnvio(id, incidencia.envioId)`,
        que ejecuta en una única `prisma.$transaction` (ver sección "Nuevo
        método de repositorio" más abajo):
        - `tx.incidencia.update({ where: { id }, data: { estado: 'RESUELTA' } })`
        - `tx.envio.update({ where: { id: envioId }, data: { estado: 'EN_RUTA' } })`
        - `tx.eventoEnvio.create({ data: { envioId, estado: 'EN_RUTA', descripcion: 'Entrega reactivada tras resolución de incidencia' } })`
        Devuelve `{ incidencia: Incidencia, envio: Envio }` (las filas
        actualizadas).
     2. Llamar a `notificacionService.notificar({ usuarioId: envio.cliente.usuarioId, envioId: incidencia.envioId, mensaje: <mensaje con envio.codigoSeguimiento>, tipo: 'CAMBIO_ESTADO' })`
        (R4) — fuera de la transacción Prisma, mismo patrón que
        `entregaService.confirmarEntrega`/`registrarFallo` (la notificación no
        es parte de la atomicidad de la base de datos; un fallo de
        notificación no debe revertir la transacción ya confirmada, y
        `notificacionService.notificar` ya maneja sus propios efectos
        secundarios — socket/email — de forma best-effort).
     3. Proyectar y devolver `proyectarIncidencia(incidencia_actualizada)`
        (mismo `IncidenciaDto` que hoy — la respuesta del endpoint **no**
        cambia de forma; el envío reactivado no se expone en la respuesta de
        este endpoint, solo se refleja en `GET /entregas` y en la
        notificación).
   - **5b. `esReactivacion === false`** (R5, R6):
     - Comportamiento **idéntico al actual**: `incidenciaRepository.actualizarEstado(id, nuevoEstado)`
       y `proyectarIncidencia(actualizada)`. No se toca `Envio` ni se crea
       `EventoEnvio` ni se notifica.

> **Nota de orden**: cargar `envio` (paso 4) ocurre siempre que las
> validaciones 1–3 pasen, incluso si `incidencia.tipo !== 'ENTREGA_FALLIDA'` o
> `nuevoEstado !== 'RESUELTA'` — porque la condición `esReactivacion` depende
> de los tres factores combinados y evaluarlos requiere los datos del envío.
> Esto añade una consulta `envioRepository.findById` adicional a los caminos
> 5b que antes no la hacían, pero es necesaria para decidir la bifurcación sin
> duplicar lógica de detección. El costo es una lectura adicional (no una
> escritura) y es aceptable dado que `PATCH /incidencias/:id` no es un
> endpoint de alta frecuencia.

### Nuevo método de repositorio: `incidenciaRepository.resolverConReactivacionEnvio`

Firma propuesta:

```typescript
async resolverConReactivacionEnvio(
  incidenciaId: string,
  envioId: string,
): Promise<{ incidencia: Incidencia; envio: Envio }> {
  return prisma.$transaction(async (tx) => {
    const incidencia = await tx.incidencia.update({
      where: { id: incidenciaId },
      data: { estado: 'RESUELTA' },
    });
    const envio = await tx.envio.update({
      where: { id: envioId },
      data: { estado: 'EN_RUTA' },
    });
    await tx.eventoEnvio.create({
      data: {
        envioId,
        estado: 'EN_RUTA',
        descripcion: 'Entrega reactivada tras resolución de incidencia',
      },
    });
    return { incidencia, envio };
  });
}
```

Sigue exactamente el patrón transaccional de
`entregaRepository.confirmarEntrega`/`registrarFallo`
(`backend/src/repositories/entregaRepository.ts`, líneas 55-110): tres
operaciones Prisma dentro de un único `prisma.$transaction(async (tx) => {...})`,
sin lógica de negocio ni validaciones (las validaciones ya se hicieron en el
servicio antes de invocar este método — regla crítica de
`docs/architecture.md`).

`incidenciaRepository.findById` (líneas 19-21) y `actualizarEstado` (líneas
41-43) **no se modifican** — se mantienen para el camino 5b (R5, R6, R7).

### Repercusión en `entregaService` (R8, R9) — sin cambios de código

- `listarMisEntregas` (`backend/src/services/entregaService.ts`, líneas
  91-109) clasifica cada envío del repartidor según `ESTADOS_PENDIENTES`
  (incluye `EN_RUTA`, línea 21) vs. `ESTADOS_COMPLETADOS` (incluye `FALLIDO`,
  línea 24). Tras la reactivación, `envio.estado === 'EN_RUTA'` hace que el
  envío caiga automáticamente en `pendientes` y deje de estar en
  `completadas` (R8). No se requiere ningún cambio en `entregaService` ni en
  `entregaRepository.findEnviosByRepartidorId` — solo un test que lo confirme
  (ver `tasks.md`).
- `obtenerEnvioModificable` (líneas 60-88) rechaza envíos cuyo `estado` esté
  en `ESTADOS_TERMINALES` (`['ENTREGADO', 'CANCELADO', 'FALLIDO']`, línea 26).
  `EN_RUTA` no está en ese array, por lo que un envío reactivado vuelve a ser
  modificable por `confirmarEntrega`/`registrarFallo` sin cambios de código
  (R9). Solo se requiere un test que lo confirme.

---

## 4. Frontend

**Sin cambios.** Esta feature es 100% backend:

- No se crean ni modifican componentes, páginas, hooks ni servicios de
  `frontend/`.
- La pestaña "Pendientes" de `VistaRepartidor` (`vista_repartidor`,
  `entregas_confirmacion`) ya consume `GET /api/v1/entregas?repartidorId=me` /
  `GET /api/v1/repartidor/entregas` y ya renderiza correctamente cualquier
  envío con `estado: 'EN_RUTA'` como navegable — no requiere ajuste, ya que el
  DTO (`EntregaListItemDto`) y la agrupación `pendientes`/`completadas` no
  cambian de forma.
- La pantalla de Notificaciones del cliente ya renderiza notificaciones de
  `tipo: 'CAMBIO_ESTADO'` (usadas por `entregaService.registrarFallo`); el
  nuevo mensaje de reactivación se muestra con el mismo componente sin cambios.

---

## 5. Decisión técnica clave

### Decisión: usar `TipoNotificacion.CAMBIO_ESTADO` para la notificación de reactivación

**Opción elegida**: la notificación enviada al cliente cuando su envío se
reactiva (R4) usa `tipo: 'CAMBIO_ESTADO'`.

**Alternativas descartadas**:
- Agregar un nuevo valor al enum `TipoNotificacion` (p.ej.
  `ENTREGA_REACTIVADA`): descartado explícitamente por la instrucción de la
  feature ("NO agregues valores nuevos al enum, esta feature no incluye
  migraciones") y porque requeriría una migración Prisma, fuera de alcance.
- `ENTREGA_REALIZADA`: descartado — semánticamente describe una entrega
  *completada*, no la reapertura de un intento; usarlo confundiría al cliente
  (notificación de "entregado" sobre un envío que en realidad sigue en
  tránsito) y rompería la consistencia con `EMAIL_TIPOS` en
  `notificacionService.ts` (línea 12), que dispara un correo "Tu envío fue
  entregado" para ese tipo — un correo falso de entrega sería un defecto
  grave.
- `INCIDENCIA_REPORTADA`: descartado — semánticamente es para el reporte
  *inicial* de una incidencia (usado en `incidenciaService.crear` y
  `entregaService.registrarFallo`), no para su resolución; además dispara
  email con asunto "Incidencia reportada en tu envío", mensaje incorrecto
  para este caso (la incidencia se está *resolviendo*, no reportando).

**Justificación**: `CAMBIO_ESTADO` es el tipo genérico ya usado por
`entregaService.registrarFallo` (línea 167 de `entregaService.ts`) para
notificar al cliente que el `estado` de su envío cambió a `FALLIDO` con un
mensaje descriptivo libre. La transición `FALLIDO → EN_RUTA` es exactamente
ese caso de uso: un cambio de `Envio.estado` que el cliente debe conocer, con
un mensaje específico ("Tu envío ... fue reactivado para un nuevo intento de
entrega"). Además, `CAMBIO_ESTADO` **no** está en `EMAIL_TIPOS`
(`notificacionService.ts`, línea 12), por lo que esta notificación se entrega
solo por socket + persistencia (no genera un correo adicional) — comportamiento
conservador y consistente con el de `registrarFallo`, que usa el mismo tipo
para su notificación de cambio de estado.

### Decisión: la reactivación se resuelve dentro de `incidenciaService.actualizarEstado`, no en un nuevo método de servicio

**Opción elegida**: extender el método existente `actualizarEstado` con la
bifurcación condicional descrita en la sección 3.

**Alternativa descartada**: crear un método nuevo
`incidenciaService.resolverConReactivacion(id)` invocado condicionalmente
desde el controlador.

**Justificación**: el criterio de aceptación es explícito en que el
comportamiento se activa a través del mismo
`PATCH /api/v1/incidencias/:id con estado=RESUELTA` ya existente, sin cambios
de firma ni de ruta. Mantener toda la decisión dentro de
`actualizarEstado` preserva la regla de `docs/architecture.md` de que "los
controladores no contienen lógica de negocio" — el controlador
(`incidenciaController.actualizarEstadoIncidencia`) no necesita saber nada
sobre incidencias `ENTREGA_FALLIDA` ni envíos `FALLIDO`; toda la decisión
"¿esto es una reactivación o no?" es responsabilidad exclusiva del servicio.

---

## 6. Seguridad

- **Sin cambios en autenticación/roles**: `PATCH /api/v1/incidencias/:id`
  mantiene `authMiddleware` + `roleMiddleware('OPERADOR')` (sin cambios
  respecto a `incidencias_gestion`, R17/R18 de esa feature). La reactivación
  del envío es un efecto colateral controlado por el servicio, no un nuevo
  permiso expuesto.
- **Atomicidad obligatoria** (R3): la actualización de `Incidencia.estado`, la
  actualización de `Envio.estado` y la creación del `EventoEnvio` ocurren en
  una única `prisma.$transaction`
  (`incidenciaRepository.resolverConReactivacionEnvio`). Si cualquiera de las
  tres operaciones falla, Prisma revierte las tres — evita un estado
  inconsistente donde la incidencia quede `RESUELTA` pero el envío siga
  `FALLIDO` (o viceversa), o un `EventoEnvio` huérfano sin el cambio de estado
  correspondiente.
- **Validaciones existentes preservadas** (R7): las comprobaciones de
  `INCIDENCIA_NOT_FOUND` (404), "mismo estado" y "no reabrir `RESUELTA`" (409)
  se ejecutan **antes** de evaluar la condición de reactivación y no se ven
  alteradas por la nueva lógica — ningún camino nuevo puede saltarse estas
  validaciones.
- **Sin nuevos campos de entrada**: el body de `PATCH /incidencias/:id` sigue
  siendo `{ estado: EstadoIncidencia }`, validado por el
  `actualizarEstadoIncidenciaSchema` ya existente (sin cambios) — no se amplía
  la superficie de entrada validable.
- **Notificación best-effort fuera de la transacción**: siguiendo el patrón ya
  establecido en `entregaService`, un fallo en
  `notificacionService.notificar` (p.ej. error de socket o email) no revierte
  ni bloquea la transacción de reactivación, que ya se confirmó exitosamente
  contra la base de datos.
- **Sin lógica de negocio en el repositorio**: `resolverConReactivacionEnvio`
  ejecuta exclusivamente las tres operaciones Prisma descritas; la decisión de
  *cuándo* invocarlo (la condición `esReactivacion`) vive enteramente en
  `incidenciaService`, conforme a la regla crítica de
  `docs/architecture.md`.
