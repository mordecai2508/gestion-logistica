# Requirements — entregas_reactivar_fallida

> Notación EARS. Un requisito = una sola idea. "SHALL" = obligatorio,
> "SHOULD" = deseable (marcado explícitamente). No se describe implementación.

---

## Reactivación automática del envío al resolver una incidencia de entrega fallida (HU61)

R1. WHEN an operador updates an incidencia's `estado` to `RESUELTA` AND that
    incidencia's `tipo` is `ENTREGA_FALLIDA` AND the envío associated with that
    incidencia has `estado` equal to `FALLIDO`, THE SYSTEM SHALL update that
    envío's `estado` to `EN_RUTA` as part of the same operation that updates
    the incidencia's `estado`.

R2. WHEN the system reactivates an envío from `FALLIDO` to `EN_RUTA` as a
    result of resolving an incidencia, THE SYSTEM SHALL register a new event
    in that envío's history with `estado` equal to `EN_RUTA` and a description
    of "Entrega reactivada tras resolución de incidencia".

R3. THE SYSTEM SHALL apply the incidencia's `estado` update and the envío's
    reactivation (estado change and history event) as a single atomic
    operation: if either part fails, neither the incidencia nor the envío
    SHALL be left partially updated.

R4. WHEN the system reactivates an envío as described in R1, THE SYSTEM SHALL
    send a notification to the cliente owning that envío informing them that
    their delivery was reactivated for a new delivery attempt.

---

## Comportamiento sin cambios fuera del caso de reactivación (HU61)

R5. IF an operador updates an incidencia's `estado` to `RESUELTA` AND that
    incidencia's `tipo` is not `ENTREGA_FALLIDA`, THEN THE SYSTEM SHALL update
    only the incidencia's `estado` and SHALL NOT modify the associated envío's
    `estado` or history.

R6. IF an operador updates an incidencia's `estado` to `RESUELTA` AND that
    incidencia's `tipo` is `ENTREGA_FALLIDA` AND the envío associated with that
    incidencia does not have `estado` equal to `FALLIDO`, THEN THE SYSTEM
    SHALL update only the incidencia's `estado` and SHALL NOT modify the
    associated envío's `estado` or history.

R7. THE SYSTEM SHALL continue to apply the existing incidencia status
    transition rules (rejecting an update that repeats the current `estado`,
    and rejecting any transition away from `RESUELTA`) before considering any
    envío reactivation, regardless of the incidencia's `tipo` or the
    associated envío's `estado`.

---

## Visibilidad y reintento del envío reactivado para el repartidor (HU62)

R8. WHEN an envío has been reactivated from `FALLIDO` to `EN_RUTA` as
    described in R1, THE SYSTEM SHALL include that envío in the "Pendientes"
    group (and SHALL NOT include it in the "Completadas" group) of the
    repartidor's deliveries list.

R9. WHEN a repartidor submits a delivery confirmation or a delivery failure
    for an envío that was reactivated to `EN_RUTA` as described in R1, THE
    SYSTEM SHALL process that request the same as for any other envío in
    `EN_RUTA`, and SHALL NOT reject it on the basis of the envío's previous
    `FALLIDO` estado.
