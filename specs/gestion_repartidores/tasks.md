# Tasks — gestion_repartidores

> Feature ID: 17 | Sprint 5
> El implementer sigue estas tasks en orden. Marcar cada una `[x]` al completarla.

---

## Backend

- [x] T1. Crear `backend/src/types/repartidorTypes.ts` con las interfaces `RepartidorDto`, `RepartidorDetalleDto`, `ListaRepartidoresResponse` y `ActualizarRepartidorDto` tal como se define en `design.md` sección 3. NO exponer el campo `password`.

- [x] T2. Crear `backend/src/validators/repartidorValidator.ts` con tres schemas Zod:
  - `listarRepartidoresSchema`: valida `page` (entero positivo, default 1), `limit` (entero 1–100, default 20), `disponible` (booleano coercible desde string `"true"/"false"`, opcional).
  - `repartidorIdParamSchema`: valida que `id` sea string no vacío.
  - `actualizarRepartidorSchema`: objeto con `disponible` (boolean, opcional) y `licencia` (string, trim, min 1, max 50, opcional), con refinement que exige que al menos uno esté presente.

- [x] T3. Crear `backend/src/repositories/repartidorRepository.ts` con los métodos:
  - `findAll(filters: { disponible?: boolean }, skip: number, take: number): Promise<{ repartidores: RepartidorConUsuario[]; total: number }>` — usa `prisma.repartidor.findMany` con `include: { usuario: true }`, aplica filtro si `disponible !== undefined`, `orderBy: { usuario: { nombre: 'asc' } }`.
  - `findById(id: string): Promise<RepartidorConUsuario | null>` — `prisma.repartidor.findUnique({ where: { id }, include: { usuario: true } })`.
  - `update(id: string, data: { disponible?: boolean; licencia?: string }): Promise<RepartidorConUsuario>` — `prisma.repartidor.update({ where: { id }, data, include: { usuario: true } })`.
  - Exportar el tipo `RepartidorConUsuario` derivado con `Prisma.RepartidorGetPayload<{ include: { usuario: true } }>`.

- [x] T4. Crear `backend/src/services/repartidorService.ts` con los métodos:
  - `listar(query: ListarRepartidoresInput): Promise<ListaRepartidoresResponse>` — calcula `skip`, llama al repository, construye `meta`.
  - `obtenerPorId(id: string): Promise<RepartidorDetalleDto>` — llama al repository; si devuelve `null` lanza `{ statusCode: 404, error: 'NOT_FOUND', message: 'Repartidor no encontrado' }`.
  - `actualizar(id: string, dto: ActualizarRepartidorDto): Promise<RepartidorDetalleDto>` — verifica existencia (404 si no existe), luego actualiza.

- [x] T5. Crear `backend/src/controllers/repartidorController.ts` con las funciones:
  - `listarRepartidores(req, res, next)`: parsea query con `listarRepartidoresSchema`, llama a `repartidorService.listar`, responde `{ data: resultado.data, meta: resultado.meta, message: 'Repartidores obtenidos exitosamente', status: 200 }`.
  - `obtenerRepartidor(req, res, next)`: extrae `req.params.id`, llama a `repartidorService.obtenerPorId`, responde `{ data, message: 'Repartidor obtenido', status: 200 }`.
  - `actualizarRepartidor(req, res, next)`: parsea body con `actualizarRepartidorSchema`, extrae `req.params.id`, llama a `repartidorService.actualizar`, responde `{ data, message: 'Repartidor actualizado', status: 200 }`.

- [x] T6. Crear `backend/src/routes/repartidores.ts` (nuevo archivo, distinto del existente `repartidor.ts` que es para el rol REPARTIDOR) con:
  - `GET /` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `listarRepartidores`
  - `GET /:id` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `obtenerRepartidor`
  - `PATCH /:id` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `actualizarRepartidor`
  - Exportar como `repartidoresRouter`.

- [x] T7. Registrar el nuevo router en `backend/src/app.ts` (o el archivo central de rutas) con el prefijo `/api/v1/repartidores`, asegurándose de que no colisiona con el router existente `/api/v1/repartidor` (singular).

- [x] T8. Escribir tests backend en `backend/src/tests/repartidores.test.ts` con Jest + Supertest cubriendo:
  - R1 — debe devolver lista paginada con datos de usuario incluidos
  - R2 — debe respetar parámetros `page` y `limit` y devolver `meta` correcta
  - R3 — debe filtrar por `?disponible=true` y `?disponible=false`
  - R4 — debe devolver 401 sin token en GET /repartidores
  - R5 — debe devolver 403 con rol CLIENTE en GET /repartidores; debe devolver 403 con rol REPARTIDOR en GET /repartidores
  - R6 — debe devolver detalle completo del repartidor por id
  - R7 — debe devolver 404 para id inexistente en GET /repartidores/:id
  - R8 — debe devolver 401 sin token en GET /repartidores/:id
  - R9 — debe devolver 403 con rol incorrecto en GET /repartidores/:id
  - R10 — debe actualizar `disponible` y devolver repartidor actualizado
  - R10 — debe actualizar `licencia` y devolver repartidor actualizado
  - R11 — debe devolver 422 cuando PATCH body está vacío
  - R12 — debe devolver 422 cuando `licencia` es string vacío
  - R13 — debe devolver 404 para id inexistente en PATCH /repartidores/:id
  - R14 — debe devolver 401 sin token en PATCH /repartidores/:id
  - R15 — debe devolver 403 con rol incorrecto en PATCH /repartidores/:id

---

## Frontend

- [x] T9. Crear `frontend/src/types/repartidorTypes.ts` con las interfaces del frontend tal como se define en `design.md` sección 5 (DTOs frontend). No importar de `@prisma/client`.

- [x] T10. Crear `frontend/src/services/repartidorService.ts` con las funciones `listar(params)`, `obtenerPorId(id)` y `actualizar(id, dto)` usando la instancia `api` (axios configurada). Los parámetros `disponible` deben enviarse como string `"true"/"false"` en la query string para compatibilidad con el validador Zod del backend.

- [x] T11. Crear `frontend/src/hooks/useRepartidores.ts` con:
  - `useRepartidores(filtros)` — `useQuery` con `queryKey: ['repartidores', filtros]`.
  - `useRepartidor(id)` — `useQuery` con `queryKey: ['repartidores', id]`, habilitado solo si `id` no es `null`.
  - `useActualizarRepartidor()` — `useMutation` que llama a `repartidorService.actualizar`; en `onSuccess` invalida `['repartidores']` y muestra toast de éxito; en `onError` muestra toast de error.

- [x] T12. Crear `frontend/src/features/repartidores/RepartidorTable.tsx` — tabla con columnas Nombre / Correo / Teléfono / Licencia / Disponibilidad (badge verde/rojo) / Acciones (botones "Ver" y "Editar"). Accesible: `<table>` semántico con `<th scope="col">`.

- [x] T13. Crear `frontend/src/features/repartidores/RepartidorDetalle.tsx` — componente que recibe un `RepartidorDto` y muestra todos sus campos en modo lectura (puede ser un `<Dialog>` de Shadcn/UI o un panel con `<dl>`/`<dt>`/`<dd>`).

- [x] T14. Crear `frontend/src/features/repartidores/EditarRepartidor.tsx` — formulario controlado con campo checkbox/toggle para `disponible` y campo de texto para `licencia`. Valida con Zod en frontend que al menos uno esté modificado. Al enviar, llama a `useActualizarRepartidor`. Al cerrar, llama al callback `onClose`.

- [x] T15. Crear `frontend/src/features/repartidores/GestionRepartidores.tsx` — página principal:
  - Título "Gestión de Repartidores".
  - Control de filtro (select: Todos / Disponible / No disponible) que actualiza el estado local y re-ejecuta `useRepartidores`.
  - Renderiza `RepartidorTable`; al pulsar "Ver" abre `RepartidorDetalle`; al pulsar "Editar" abre `EditarRepartidor`.
  - Muestra indicador de carga (R22) y mensaje de error con botón "Reintentar" (R23).
  - La paginación se maneja con controles de página anterior/siguiente que actualizan el parámetro `page`.

- [x] T16. Registrar la ruta `/repartidores` en `frontend/src/router/index.tsx` dentro del bloque `ProtectedRoute allowedRoles={['OPERADOR']}` con `OperadorLayout`, importando `GestionRepartidores`.

- [x] T17. Escribir tests frontend en `frontend/src/features/repartidores/repartidores.test.tsx` con Vitest + Testing Library cubriendo:
  - R16 — renderiza la página con título "Gestión de Repartidores"
  - R17 — muestra columnas Nombre, Correo, Licencia, Disponibilidad en la tabla
  - R18 — el filtro de disponibilidad re-ejecuta la query con el parámetro correcto
  - R19 — al hacer clic en "Ver" se muestra el panel de detalle con los datos del repartidor
  - R20 — al hacer clic en "Editar" se muestra el formulario pre-llenado
  - R21 — al enviar el formulario con datos válidos se llama al servicio PATCH y se muestra toast
  - R22 — muestra indicador de carga mientras se obtiene la lista
  - R23 — muestra mensaje de error si la API falla

---

## Verificación final

- [x] T18. Ejecutar `./init.sh` desde la raíz del proyecto. Verificar que lint, tests de backend, tests de frontend y build de ambos paquetes completan sin errores. Reportar resultado al leader.
