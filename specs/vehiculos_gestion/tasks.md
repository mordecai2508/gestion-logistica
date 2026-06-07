# Tasks — vehiculos_gestion

El implementer sigue este orden estrictamente, marcando `[x]` al completar cada tarea.

---

## Backend

- [x] T1. Verificar el schema Prisma: confirmar que el modelo `Vehiculo` (campos `id`, `placa @unique`, `modelo`, `capacidad`, `estado EstadoVehiculo @default(DISPONIBLE)`, `createdAt`, `updatedAt`, relación `rutas Ruta[]`) y el enum `EstadoVehiculo { DISPONIBLE EN_RUTA MANTENIMIENTO FUERA_SERVICIO }` ya existen tal como se documenta en `design.md` sección 2 (`backend/prisma/schema.prisma` líneas ~34-39 y ~134-143). **No se requiere ninguna migración**: no ejecutar `npx prisma migrate dev`. Si por alguna razón el schema difiere de lo documentado, detener la implementación y reportar la discrepancia al leader antes de continuar.

- [x] T2. Crear validator Zod `backend/src/validators/vehiculoValidator.ts` con los siguientes schemas:
  - `crearVehiculoSchema`: `{ placa: string (no vacía, trim), modelo: string (no vacío), capacidad: number (positivo, > 0) }`
  - `listarVehiculosSchema`: `{ estado?: enum(['DISPONIBLE', 'EN_RUTA', 'MANTENIMIENTO', 'FUERA_SERVICIO']) }` — query param opcional, valor inválido produce error Zod (422)
  - `actualizarEstadoVehiculoSchema`: `{ estado: enum(['DISPONIBLE', 'EN_RUTA', 'MANTENIMIENTO', 'FUERA_SERVICIO']) }` — campo requerido

- [x] T3. Crear repositorio `backend/src/repositories/vehiculoRepository.ts` con las siguientes operaciones (solo acceso a Prisma, sin lógica de negocio, sin validaciones):
  - `crear(data)` — crea el vehículo
  - `findByPlaca(placa)` — para validar unicidad antes de crear
  - `findById(id)` — busca por id
  - `findAll(filters)` — lista vehículos, filtra por `estado` si se provee, ordena por `placa` ascendente
  - `actualizarEstado(id, estado)` — actualización parcial del campo `estado`

- [x] T4. Crear servicio `backend/src/services/vehiculoService.ts` con los métodos (sin acceso directo a Prisma — todo a través de `vehiculoRepository`):
  - `crear(dto)` — implementa los pasos de la sección 3.1 del design.md (verificación de placa única, creación con estado DISPONIBLE por defecto; lanza error de dominio 409 `PLACA_DUPLICADA` si ya existe)
  - `listar(filters)` — implementa los pasos de la sección 3.2 del design.md (filtro opcional por estado, sin paginación)
  - `actualizarEstado(id, nuevoEstado)` — implementa los pasos de la sección 3.3 del design.md (busca el vehículo, lanza 404 si no existe, valida la transición — bloquea `EN_RUTA → MANTENIMIENTO` y `EN_RUTA → FUERA_SERVICIO` con error 422 — y actualiza)

- [x] T5. Crear controlador `backend/src/controllers/vehiculoController.ts` con los handlers (solo extraen params/DTO validado, llaman al servicio, responden HTTP — sin lógica de negocio):
  - `crearVehiculo` — llama a `vehiculoService.crear`, responde 201 con `{ data, message: 'Vehículo registrado', status: 201 }`
  - `listarVehiculos` — extrae query `estado`, llama a `vehiculoService.listar`, responde 200 con `{ data, message, status }`
  - `actualizarEstadoVehiculo` — extrae `:id` y `estado` del body validado, llama a `vehiculoService.actualizarEstado`, responde 200 con `{ data, message: 'Estado actualizado', status: 200 }`

- [x] T6. Registrar rutas en `backend/src/routes/vehiculos.ts` con los middlewares apropiados, y montar el router en `backend/src/index.ts` (o `app.ts`, según corresponda) bajo `/api/v1/vehiculos`:
  - `POST /` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `validate(crearVehiculoSchema)`, `crearVehiculo`
  - `GET /` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `validate(listarVehiculosSchema)`, `listarVehiculos`
  - `PATCH /:id` → `authMiddleware`, `roleMiddleware('OPERADOR')`, `validate(actualizarEstadoVehiculoSchema)`, `actualizarEstadoVehiculo`

- [x] T7. Escribir tests backend `backend/src/tests/vehiculos.test.ts` (Jest + Supertest) cubriendo:
  - R1 — `debe registrar un vehículo válido con estado DISPONIBLE y devolver 201`
  - R2 — `debe rechazar el registro con placa duplicada y devolver 409`
  - R3 — `debe rechazar el registro con campos inválidos o capacidad no positiva con 422`
  - R4 — `debe rechazar el registro de un usuario sin rol OPERADOR con 403`
  - R5 — `debe rechazar el registro sin autenticación con 401`
  - R6 — `debe listar vehículos con placa, modelo, capacidad y estado`
  - R7 — `debe filtrar vehículos por estado cuando se recibe ?estado`
  - R8 — `debe rechazar el listado con un valor de estado inválido en el filtro con 422`
  - R9 — `debe rechazar el listado sin autenticación con 401`
  - R10 — `debe rechazar el listado para un usuario con rol CLIENTE con 403`
  - R11 — `debe actualizar el estado de un vehículo existente y devolver 200`
  - R12 — `debe rechazar la actualización con un valor de estado inválido con 422`
  - R13 — `debe devolver 404 al actualizar un vehículo inexistente`
  - R14 — `debe rechazar el cambio de un vehículo EN_RUTA a MANTENIMIENTO o FUERA_SERVICIO con 422`
  - R15 — `debe rechazar la actualización de estado de un usuario sin rol OPERADOR con 403`

---

## Frontend

- [x] T8. Crear tipos `frontend/src/types/vehiculoTypes.ts` con `EstadoVehiculo`, `VehiculoDto`, `CrearVehiculoDto` y `VehiculoFiltros` exactamente como se definen en la sección 4 del design.md.

- [x] T9. Crear service frontend `frontend/src/services/vehiculoService.ts` con las funciones: `listar(filters?)`, `crear(dto)`, `actualizarEstado(id, estado)`. Todas usan la instancia axios configurada (`api`); devuelven `res.data.data`, siguiendo el patrón de `frontend/src/services/rutaService.ts`.

- [x] T10. Crear hooks TanStack Query en `frontend/src/hooks/`:
  - `useVehiculos.ts` — `useQuery(['vehiculos', filters], () => vehiculoService.listar(filters))`
  - `useCrearVehiculo.ts` — `useMutation` que invalida `['vehiculos']` en `onSuccess`
  - `useActualizarEstadoVehiculo.ts` — `useMutation` que invalida `['vehiculos']` en `onSuccess`

- [x] T11. Crear componente `frontend/src/features/vehiculos/VehiculoForm.tsx`: formulario de registro (placa, modelo, capacidad) con React Hook Form + Zod; muestra mensajes de validación inline junto a cada campo inválido; al recibir un error 409 del backend muestra un mensaje inline de placa duplicada sin limpiar el resto de los campos (usa Toast de Shadcn/UI para errores generales, mensajes inline para errores de campo).

- [x] T12. Crear componente `frontend/src/features/vehiculos/VehiculoTable.tsx`: tabla con columnas Placa | Modelo | Capacidad | Estado; renderiza el estado como badge de color (Disponible = verde, En ruta = naranja/"Ocupado", Mantenimiento = rojo/gris, Fuera de servicio = gris); incluye una acción por fila para abrir el cambio de estado.

- [x] T13. Crear componente `frontend/src/features/vehiculos/ActualizarEstadoVehiculo.tsx`: diálogo/selector que permite elegir un nuevo estado de entre los 4 valores y confirma el cambio invocando `useActualizarEstadoVehiculo`; refleja el resultado (éxito o error 422/404) con Toast de Shadcn/UI sin recargar la página.

- [x] T14. Crear pantalla `frontend/src/features/vehiculos/GestionVehiculos.tsx`: página principal de gestión de vehículos para el OPERADOR, según el wireframe "Gestión de Vehículos" (`docs/wireframe-reference.md`). Incluye: título "Vehículos", control de filtro por estado conectado a `useVehiculos`, `VehiculoTable` con los datos filtrados, botón "+ Registrar Vehículo" que abre `VehiculoForm` (en modal/diálogo de Shadcn/UI). Ruta React: `/vehiculos`.

- [x] T15. Registrar la ruta `/vehiculos` en `frontend/src/router/index.tsx` dentro de `ProtectedRoute` con rol `OPERADOR`, junto a las demás rutas del operador. Verificar que el enlace "Vehículos" del sidebar (definido en `layout_navegacion`) apunta a esta ruta; si el layout aún no existe, dejar constancia en el componente de navegación existente sin invadir el alcance de `layout_navegacion`.

- [x] T16. Escribir tests frontend `frontend/src/features/vehiculos/*.test.tsx` (Vitest + Testing Library) cubriendo:
  - R16 — `debe renderizar la pantalla de gestión de vehículos con título, tabla y controles del wireframe`
  - R17 — `debe mostrar errores de validación inline al enviar el formulario de registro con campos inválidos`
  - R18 — `debe enviar la actualización de estado y reflejar el nuevo estado sin recargar la página`
  - R19 — `debe mostrar solo los vehículos cuyo estado coincide con el filtro seleccionado`
  - R20 — `debe mostrar un mensaje de placa duplicada sin limpiar el formulario cuando el backend responde 409`

- [x] T17. Verificación final: ejecutar `npm test` en backend y frontend (verde), `npm run lint` sin errores en ambos workspaces, `npm run build` sin errores en frontend. Confirmar que no se generó ninguna migración Prisma nueva (T1 documentó que no es necesaria) y que los tests cubren cada `R<n>` definido en `requirements.md`.
