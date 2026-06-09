# Design — mis_envios_cliente

---

## 1. Endpoints

| Método | Ruta | Auth requerida | Query params | Respuesta 200 | Otros códigos |
|--------|------|----------------|--------------|---------------|---------------|
| GET | `/api/v1/clientes/me/envios` | `authMiddleware` + `roleMiddleware('CLIENTE')` | `?page`, `?limit`, `?estado` | `{ data: MisEnviosItemDto[], meta: PaginationMeta, message: string, status: 200 }` | 401, 403, 404, 422 |

### DTO de respuesta — `MisEnviosItemDto`

```
{
  id: string
  codigoSeguimiento: string
  estado: EstadoEnvio
  destinatario: string
  createdAt: string   // ISO 8601
}
```

### Parámetros de paginación

- `page`: entero positivo, default `1`
- `limit`: entero positivo, default `10`
- `estado`: valor del enum `EstadoEnvio` (opcional)

---

## 2. Schema Prisma

No se requieren cambios al schema Prisma. La relación `Cliente → Envio` ya existe:

```
model Cliente {
  id        String  @id @default(cuid())
  usuarioId String  @unique
  usuario   Usuario @relation(...)
  envios    Envio[]   // ← relación existente
}

model Envio {
  clienteId String
  cliente   Cliente @relation(...)  // ← relación existente
  ...
}
```

---

## 3. Lógica de negocio

### Resolución clienteId → usuarioId

El JWT contiene `{ id: usuarioId, rol, correo }`. El flujo del servicio es:

1. Recibir `usuarioId = req.user.id` desde el controlador.
2. Llamar a `clienteRepository.findByUsuarioId(usuarioId)` para obtener el
   registro `Cliente` (necesita método nuevo en el repositorio).
3. Si no existe, lanzar `AppError('CLIENTE_NOT_FOUND', ..., 404)`.
4. Usar `cliente.id` como `clienteId` para filtrar `Envio`.

### Filtrado y paginación

- `where = { clienteId: cliente.id }` — garantiza aislamiento: el cliente
  solo ve sus propios envíos.
- Si `?estado` está presente, añadir `where.estado = estado`.
- Aplicar `skip = (page - 1) * limit` y `take = limit`.
- Retornar `{ data, meta: { total, page, limit, totalPages } }`.

### Por qué NO reutilizar `GET /api/v1/envios`

El endpoint existente `GET /api/v1/envios` está restringido a rol OPERADOR y
devuelve `clienteNombre` (dato del operador). Un cliente que acceda a él
recibiría HTTP 403. Además, ese endpoint permite filtrar por cualquier
`clienteId`, lo cual violaría el principio de aislamiento de datos.

**Decisión:** Crear un nuevo endpoint dedicado `/api/v1/clientes/me/envios`
con `roleMiddleware('CLIENTE')` que fuerza el filtro por el `clienteId` del
token. El servicio y repositorio existentes (`envioService`, `envioRepository`)
se extienden mínimamente en lugar de duplicarse.

**Alternativa descartada:** Ampliar `GET /api/v1/envios` para aceptar también
rol CLIENTE. Se descarta porque mezclaría lógicas de autorización (el operador
puede ver todos; el cliente solo los suyos), complicaría el guard de roles y
añadiría complejidad a un endpoint ya utilizado con tests existentes.

---

## 4. Frontend

### Árbol de archivos nuevos/modificados

```
frontend/src/
├── types/
│   └── misEnviosTypes.ts           (nuevo) — MisEnviosItemDto, MisEnviosFilters
├── services/
│   └── misEnviosService.ts         (nuevo) — listarMisEnvios(filters)
├── hooks/
│   └── useMisEnvios.ts             (nuevo) — TanStack Query wrapper
├── features/
│   └── cliente/
│       └── MisEnvios.tsx           (nuevo) — página completa
└── router/index.tsx                (modificar) — reemplazar <MisEnviosPage> inline
                                      por <MisEnvios> importado
```

### Componente `MisEnvios.tsx`

Estado local:
- `page: number` (default 1)
- `estadoFiltro: string` (default `''` = todos)

Comportamiento:
1. Llamar a `useMisEnvios({ page, limit: 10, estado: estadoFiltro || undefined })`.
2. Mostrar selector de estado (valores del enum `EstadoEnvio` + opción "Todos").
3. Renderizar tabla con columnas: Código | Estado (badge) | Destinatario | Fecha creación.
4. Cada fila: botón "Rastrear" → `navigate('/tracking/' + envio.codigoSeguimiento)`.
5. Si `data.length === 0 && !isLoading`: mostrar `"Aún no tienes envíos registrados"`.
6. Si `meta.totalPages > 1`: renderizar paginación (mismo patrón que `ConsultarEnvios`).

### Badge de estado

Reutilizar la constante `ESTADO_BADGE` ya definida en `ConsultarEnvios.tsx`
extrayéndola a `frontend/src/utils/estadoBadge.ts` (o definirla localmente —
el implementer decide; se sugiere extraerla para DRY).

Colores por estado (consistentes con `ConsultarEnvios`):

| Estado | Clases Tailwind |
|--------|-----------------|
| PENDIENTE | `bg-orange-100 text-orange-800` |
| EN_PREPARACION | `bg-yellow-100 text-yellow-800` |
| EN_TRANSITO | `bg-blue-100 text-blue-800` |
| EN_RUTA | `bg-blue-100 text-blue-800` |
| ENTREGADO | `bg-green-100 text-green-800` |
| CANCELADO | `bg-red-100 text-red-800` |
| FALLIDO | `bg-gray-100 text-gray-800` |

### Hook `useMisEnvios.ts`

```
queryKey: ['mis-envios', filters]
queryFn:  () => misEnviosService.listar(filters)
```

---

## 5. Decisión técnica clave

**Nuevo endpoint vs. reutilizar existente:** Se crea `/api/v1/clientes/me/envios`
(nuevo). Justificación detallada en sección 3.

**Resolución de clienteId:** Se añade `findByUsuarioId` al
`clienteRepository` existente en lugar de crear un repositorio nuevo, para
mantener la cohesión (todo acceso al modelo `Cliente` en el mismo archivo).

**Paginación default 10:** La feature_list especifica "paginación cuando hay
más de 10 envíos", lo que implica limit=10 como umbral. Se usa `limit=10`
como default del endpoint (diferente al `limit=20` del endpoint de operador).

---

## 6. Seguridad

- `authMiddleware` valida el JWT en cada request; rechaza con 401 si falta o
  es inválido.
- `roleMiddleware('CLIENTE')` rechaza con 403 cualquier rol diferente a CLIENTE.
- El filtro `where.clienteId = cliente.id` se construye a partir del JWT, no
  de un parámetro de la URL; un cliente no puede solicitar los envíos de otro.
- El query param `?estado` se valida con Zod contra los valores del enum
  `EstadoEnvio`; valores inválidos producen HTTP 422 (manejado por el error
  handler global).
- No se exponen campos sensibles (peso, dimensiones, evidenciaFoto, firma) en
  `MisEnviosItemDto`; solo los campos necesarios para la tabla.
