# Design — auth_registro

> Feature: Registro de usuarios (id: 2, sprint 1)

---

## 1. Endpoints

| Método | Ruta | Auth requerida | Payload entrada | Payload salida | HTTP |
|--------|------|----------------|-----------------|----------------|------|
| POST | `/api/v1/auth/register` | No | `{ nombre: string, correo: string, password: string, confirmPassword: string, telefono: string, rol: Rol }` | `{ data: { id: string, correo: string, rol: Rol }, message: "Usuario registrado exitosamente", status: 201 }` | 201 |

### Códigos de error relevantes

| Caso | HTTP | `error` |
|------|------|---------|
| Correo ya registrado | 409 | `EMAIL_ALREADY_EXISTS` |
| Campo requerido ausente o inválido (Zod) | 422 | detalle de campos |
| `rol` no permitido | 422 | detalle de campos |
| `password` < 8 caracteres | 422 | detalle de campos |
| `confirmPassword` no coincide | 422 | detalle de campos |
| Rate limit superado | 429 | manejado por `express-rate-limit` |

---

## 2. Schema Prisma

No se requieren modelos nuevos. La feature utiliza los modelos ya existentes en `backend/prisma/schema.prisma`.

### Modelos utilizados y campos poblados por rol

**`Usuario`** — campos que se crean en cada registro:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `String` (cuid) | Generado automáticamente |
| `nombre` | `String` | Nombre completo del usuario |
| `correo` | `String` unique | Correo electrónico; se verifica unicidad antes de insertar |
| `password` | `String` | Hash bcrypt (rounds=12) de la contraseña enviada |
| `telefono` | `String?` | Teléfono de contacto (requerido en el formulario) |
| `rol` | `Rol` enum | `CLIENTE`, `OPERADOR`, o `REPARTIDOR` |
| `createdAt` | `DateTime` | Timestamp automático |
| `updatedAt` | `DateTime` | Timestamp automático |

**`Cliente`** — creado cuando `rol === CLIENTE`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `String` (cuid) | Generado automáticamente |
| `usuarioId` | `String` unique | FK al `Usuario` recién creado |

**`Operador`** — creado cuando `rol === OPERADOR`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `String` (cuid) | Generado automáticamente |
| `usuarioId` | `String` unique | FK al `Usuario` recién creado |

**`Repartidor`** — creado cuando `rol === REPARTIDOR`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | `String` (cuid) | Generado automáticamente |
| `usuarioId` | `String` unique | FK al `Usuario` recién creado |
| `licencia` | `String?` | `null` en el momento del registro (se completa en perfil) |
| `disponible` | `Boolean` | `true` por defecto |

**Total de modelos nuevos: 0. Modelos existentes utilizados: `Usuario`, `Cliente`, `Operador`, `Repartidor`.**

---

## 3. Lógica de negocio

### Flujo de registro (`authService.register`)

1. Recibir DTO ya validado por Zod: `{ nombre, correo, password, confirmPassword, telefono, rol }`.
   - La comparación `password === confirmPassword` se resuelve en el schema Zod con `.refine()` antes de que llegue al servicio.
2. Verificar unicidad de correo: `authRepository.findByCorreo(correo)`.
   - Si existe → lanzar error `EMAIL_ALREADY_EXISTS` (HTTP 409).
3. Hashear la contraseña: `bcrypt.hash(password, 12)` → `hashedPassword`.
4. Ejecutar `prisma.$transaction(async (tx) => { ... })` con los siguientes pasos atómicos:
   a. Crear `Usuario`: `tx.usuario.create({ data: { nombre, correo, password: hashedPassword, telefono, rol } })`.
   b. Según el valor de `rol`:
      - `CLIENTE` → `tx.cliente.create({ data: { usuarioId: usuario.id } })`
      - `OPERADOR` → `tx.operador.create({ data: { usuarioId: usuario.id } })`
      - `REPARTIDOR` → `tx.repartidor.create({ data: { usuarioId: usuario.id, disponible: true } })`
5. Retornar `{ id: usuario.id, correo: usuario.correo, rol: usuario.rol }` al controlador.

### Separación de responsabilidades

- El controlador aplica el schema Zod (`registerSchema.parse(req.body)`) y devuelve la respuesta HTTP 201.
- El servicio orquesta la lógica de negocio (unicidad, hashing, transacción).
- El repositorio expone `findByCorreo` (ya existente) y el nuevo método `createUsuario` que encapsula `prisma.$transaction`.

---

## 4. Frontend

### Árbol de archivos relevantes

```
frontend/src/
├── features/auth/
│   ├── Login.tsx              ← ya existe; reutilizar Card, Input, Button, Label
│   └── Register.tsx           ← nuevo componente de pantalla de registro
├── hooks/
│   └── useAuth.ts             ← añadir registerMutation
├── services/
│   └── authService.ts         ← añadir register(dto)
├── types/
│   └── auth.ts                ← añadir RegisterDto, RegisterResponse (si no existe)
└── router/
    └── index.tsx              ← añadir ruta pública /register
```

### `Register.tsx`

- Usa `react-hook-form` con `zodResolver` y schema Zod client-side `registerSchema`.
- Campos (en orden vertical según wireframe):
  1. Nombre completo (`Input`, type text)
  2. Correo electrónico (`Input`, type email)
  3. Contraseña (`Input`, type password)
  4. Confirmar contraseña (`Input`, type password)
  5. Teléfono (`Input`, type tel)
  6. Rol (`Select` de Shadcn/UI con opciones: Cliente, Operador, Repartidor)
- Botón "REGISTRARSE" (full width, variante primary de Shadcn `Button`); deshabilitado mientras el mutation está en vuelo.
- Link "¿Ya tienes cuenta? Inicia sesión" → `/login`.
- En éxito (201): redirigir a `/login`.
- En error 409: Toast de error "El correo ya está registrado".
- En error 422: mostrar mensajes de campo devueltos por el servidor.
- Componentes Shadcn/UI: `Card`, `CardHeader`, `CardContent`, `Input`, `Button`, `Label`, `Select`, `SelectTrigger`, `SelectContent`, `SelectItem` — reutilizando el mismo patrón visual de `Login.tsx`.

### `authService.ts` (frontend) — método añadido

```typescript
register(dto: RegisterDto): Promise<RegisterResponse>
// POST /auth/register — usa instancia api (axios con withCredentials)
// RegisterResponse = { data: { id: string, correo: string, rol: Rol } }
```

### `useAuth.ts` — mutation añadida

```typescript
registerMutation: useMutation({
  mutationFn: (dto: RegisterDto) => authService.register(dto),
  onSuccess: () => navigate('/login'),
  onError: (error) => { /* mostrar Toast según código de error */ },
})
```

### Schema Zod frontend (`registerSchema`)

```typescript
const registerSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  correo: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirmPassword: z.string().min(1, 'La confirmación es requerida'),
  telefono: z.string().min(1, 'El teléfono es requerido'),
  rol: z.enum(['CLIENTE', 'OPERADOR', 'REPARTIDOR']),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});
```

---

## 5. Decisión técnica: `prisma.$transaction` para crear Usuario + perfil

**Opción elegida: `prisma.$transaction` (transacción interactiva de Prisma).**

**Opción descartada: dos inserts secuenciales independientes.**

**Justificación:**

Si se crean primero el `Usuario` y luego el perfil (`Cliente`/`Operador`/`Repartidor`) como operaciones separadas, un fallo entre ambos (error de red, excepción de runtime, constraint de BD) dejaría un `Usuario` sin perfil asociado. Esto rompería la invariante del modelo de datos (todo usuario tiene exactamente un perfil según su rol) y causaría errores en cascada en el resto de la aplicación.

Con `prisma.$transaction`, si cualquiera de los dos creates falla, ambos se revierten automáticamente. La BD queda en estado consistente.

**Tradeoff aceptado:** Una sola transacción por registro es ligeramente más costosa que un único insert, pero el registro es una operación infrecuente y el costo es despreciable.

---

## 6. Seguridad

| Aspecto | Implementación |
|---------|----------------|
| Hashing de contraseñas | `bcrypt` con `rounds = 12` (consistente con `auth_login`; cumple el criterio de aceptación `rounds >= 10`) |
| Validación de inputs | Schema Zod `registerSchema` aplicado en el controlador antes de cualquier consulta a BD |
| Unicidad de correo | Verificada en servicio antes de insertar; error 409 devuelve mensaje genérico sin revelar información adicional |
| Mensaje 409 | `"El correo ya está registrado"` — no distingue entre "correo de cliente" vs "correo de operador" para evitar enumeración de roles |
| Campo `confirmPassword` | Validado en Zod (`.refine()`); no se persiste en BD |
| Rate limiting | Heredado del limitador `/api/v1/auth/*` ya configurado: máx 10 req/min/IP |
| Password en respuesta | El campo `password` (hash) nunca se incluye en ningún payload de respuesta |
| Enum `rol` | Zod valida que solo se acepten valores `CLIENTE`, `OPERADOR`, `REPARTIDOR` antes de llegar a Prisma |
