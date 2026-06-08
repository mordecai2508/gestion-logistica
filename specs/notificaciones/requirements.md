# Requirements — notificaciones

> Notación EARS. Un requisito = una sola idea. "SHALL" = obligatorio,
> "SHOULD" = deseable (marcado explícitamente). No se describe implementación.

---

## Generación de notificaciones ante cambios de estado de envío (HU35)

R1. WHEN an envío's estado changes to any value (creation, transición de
    estado, asignación de ruta, confirmación de entrega o registro de fallo)
    THE SYSTEM SHALL persist a notificación record associated with the
    envío's cliente, containing a human-readable message describing the
    change and an unread status.

R2. WHEN a ruta is created or a repartidor/vehículo is (re)asignado to a ruta
    THE SYSTEM SHALL persist a notificación record associated with the
    affected repartidor describing the assignment.

R3. WHEN a repartidor reports an incidencia for an envío THE SYSTEM SHALL
    persist a notificación record associated with the envío's cliente
    describing the reported incidencia.

R4. WHEN a notificación record is persisted THE SYSTEM SHALL associate it
    with the recipient user, a classification of the kind of event that
    originated it (e.g. envío created, estado changed, entrega completed,
    ruta assigned, incidencia reported), an optional reference to the
    related envío, a message, a creation timestamp, and an initial unread
    status.

---

## Distribución en tiempo real (HU36)

R5. WHEN a notificación record is persisted for a user THE SYSTEM SHALL emit
    a `notification:new` real-time event carrying the notificación's data to
    that specific user's communication channel, without delivering it to
    other users.

R6. IF the recipient user has no active real-time connection at the moment
    a notificación is persisted THEN THE SYSTEM SHALL still persist the
    notificación so that it is retrievable later through the listing
    endpoint, regardless of real-time delivery.

---

## Distribución por correo electrónico (HU37)

R7. WHEN a new envío is created THE SYSTEM SHALL send an email to the
    cliente's registered correo informing that the envío was created,
    including its tracking code.

R8. WHEN an envío's estado changes to `ENTREGADO` THE SYSTEM SHALL send an
    email to the cliente's registered correo informing that the envío was
    delivered.

R9. WHEN an incidencia is reported for an envío THE SYSTEM SHALL send an
    email to the cliente's registered correo informing that an incidencia
    was reported for that envío.

R10. IF sending an email for a notification-triggering event fails THEN THE
     SYSTEM SHALL still complete the triggering operation (persist the
     notificación, emit the real-time event, and return a successful
     response) and SHALL record the email failure without exposing it to the
     end user.

---

## Listado de notificaciones del usuario (HU38)

R11. WHEN an authenticated user requests their notificaciones THE SYSTEM
     SHALL return a paginated collection containing only the notificaciones
     addressed to that user, ordered from most recent to oldest, including
     for each one its message, its classification (the kind of event that
     originated it, per R4), related envío reference (when present),
     read/unread status and creation timestamp.

R12. WHEN a notificaciones listing request includes pagination parameters
     THE SYSTEM SHALL return the corresponding page along with pagination
     metadata (total count, current page, page size and total pages).

R13. IF a notificaciones listing request includes pagination parameters that
     are not positive integers THEN THE SYSTEM SHALL respond with HTTP 422
     and the corresponding validation details.

R14. IF a request to list notificaciones is made without a valid
     authentication token THEN THE SYSTEM SHALL respond with HTTP 401 and
     SHALL NOT return any notificación data.

---

## Pantalla "Notificaciones" (HU39)

R15. WHEN an authenticated user opens the "Notificaciones" screen THE SYSTEM
     SHALL display a list of their notificaciones, each showing a type icon,
     the notification message in bold, a description and a relative time
     indicator (e.g. "hace 5 minutos"), matching the structure described in
     the wireframe reference.

R16. WHEN the "Notificaciones" screen displays a notificación THE SYSTEM
     SHALL render its left border with a color that reflects the
     notificación's type, distinguishing at least entrega realizada, ruta
     asignada, retraso/incidencia reportada and cambio de estado.

R17. WHEN the number of notificaciones for the user exceeds a single page THE
     SYSTEM SHALL display pagination controls that allow the user to
     navigate between pages of results.

R18. WHEN the "Notificaciones" screen is open and the user receives a
     `notification:new` real-time event for their account THE SYSTEM SHALL
     update the displayed list to include the new notificación without
     requiring a manual page reload.

R19. IF the user has no notificaciones THE SYSTEM SHALL display a message
     indicating that there are no notificaciones to show.

---

## Marcar notificaciones como leídas (ampliación de alcance aprobada)

R20. WHEN an authenticated user requests to mark one of their own
     notificaciones as read THE SYSTEM SHALL update that notificación's
     status to read and SHALL return the updated notificación, including
     its message, related envío reference (when present), read status and
     creation timestamp.

R21. IF a request to mark a notificación as read references a notificación
     that does not exist THEN THE SYSTEM SHALL respond with HTTP 404 and
     SHALL NOT modify any notificación.

R22. IF a request to mark a notificación as read references a notificación
     that belongs to a different user than the authenticated requester THEN
     THE SYSTEM SHALL respond with HTTP 404, SHALL NOT modify the
     notificación, and SHALL NOT reveal whether a notificación with that
     identifier exists for another user.

R23. IF a request to mark a notificación as read is made without a valid
     authentication token THEN THE SYSTEM SHALL respond with HTTP 401 and
     SHALL NOT modify any notificación.
