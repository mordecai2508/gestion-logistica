# Design — envios_crear

> Feature id: 4 | Sprint 2
> Este documento describe el "cómo" técnico. Los requisitos están en requirements.md.

---

## 1. Endpoints

| # | Método | Ruta | Auth | Rol requerido | Payload entrada | Respuesta éxito | Códigos HTTP |
|---|--------|------|------|---------------|-----------------|-----------------|--------------|
| 1 | POST | `/api/v1/envios` | Bearer JWT | OPERADOR | `CrearEnvioDto` (ver abajo) | `{ data: EnvioResponseDto, message, status: 201 }` | 201, 401, 403, 404, 422, 500 |

### Payload de entrada (`CrearEnvioDto`)

```json
{
  "remitente":        "string (requerido)",
  "destinatario":     "string (requerido)",
  "direccionDestino": "string (requerido)",
  "peso":             "number > 0 (requerido)",
  "dimensiones":      "string formato WxHxD, e.g. '30x20x15' (requerido)",
  "clienteId":        "string cuid (requerido)",
  "descripcion":      "string (opcional)"
}
```

### Payload de respuesta exitosa (`EnvioResponseDto`)

```json
{
  "id":               "cuid",
  "codigoSeguimiento":"TRK-YYYYMMDD-XXXXXXXX",
  "estado":           "PENDIENTE",
  "remitente":        "string",
  "destinatario":     "string",
  "direccionDestino": "string",
  "peso":             "number",
  "dimensiones":      "string",
  "descripcion":      "string | null",
  "clienteId":        "string",
  "createdAt":        "ISO 8601 UTC"
}
```

### Respuesta de error

```json
{ "error": "ERROR_CODE", "message": "descripción", "statusCode": number }
```

| Situación | Código | `error` |
|-----------|--------|---------|
| Sin token | 401 | `MISSING_TOKEN` |
| Token inválido/expirado | 401 | `INVALID_TOKEN` / `EXPIRED_TOKEN` |
| Rol distinto a OPERADOR | 403 | `FORBIDDEN` |
| clienteId no existe | 404 | `CLIENTE_NOT_FOUND` |
| Campos inválidos | 422 | `VALIDATION_ERROR` |
| Colisión de código x3 | 500 | `CODIGO_GENERATION_FAILED` |

---

## 2. Schema Prisma

No se requieren migraciones nuevas. Los modelos ya existen. A continuación los campos relevantes que se usan en esta feature:

### Modelo `Envio` (campos usados en creación)

| Campo | Tipo Prisma | Obligatorio | Notas |
|-------|-------------|-------------|-------|
| `id` | `String @id @default(cuid())` | auto | generado por Prisma |
| `codigoSeguimiento` | `String @unique` | sí | generado en servicio |
| `remitente` | `String` | sí | del body |
| `destinatario` | `String` | sí | del body |
| `direccionDestino` | `String` | sí | del body |
| `peso` | `Float` | sí | del body |
| `dimensiones` | `String` | sí | del body |
| `descripcion` | `String?` | no | del body |
| `estado` | `EstadoEnvio @default(PENDIENTE)` | auto | valor por defecto |
| `clienteId` | `String` | sí | FK a `Cliente.id` |
| `createdAt` | `DateTime @default(now())` | auto | generado por Prisma |
| `updatedAt` | `DateTime @updatedAt` | auto | generado por Prisma |

### Modelo `EventoEnvio` (registro inicial creado atómicamente)

| Campo | Tipo Prisma | Valor en creación |
|-------|-------------|-------------------|
| `id` | `String @id @default(cuid())` | auto |
| `descripcion` | `String` | `"Envío creado"` |
| `estado` | `EstadoEnvio` | `PENDIENTE` |
| `lat` | `Float?` | `null` |
| `lng` | `Float?` | `null` |
| `timestamp` | `DateTime @default(now())` | auto |
| `envioId` | `String` | FK al `Envio.id` creado |

---

## 3. Lógica de negocio

### 3.1 Generación del código de seguimiento

```
función generarCodigoUnico():
  INTENTOS_MAX = 3
  para intento = 1 hasta INTENTOS_MAX:
    fecha = now() en UTC → string "YYYYMMDD"
    bytes = crypto.randomBytes(6)          // 6 bytes = 12 hex chars → tomamos 8 uppercase alfanuméricos
    parte_aleatoria = bytes.toString('hex').toUpperCase().slice(0, 8)
    codigo = "TRK-" + fecha + "-" + parte_aleatoria  // e.g. TRK-20260604-A3F9B21C
    existente = envioRepository.findByCodigo(codigo)
    si existente == null → devolver codigo
  lanzar AppError("CODIGO_GENERATION_FAILED", 500)
```

**Nota técnica:** `crypto.randomBytes(6).toString('hex')` produce 12 caracteres hexadecimales (0-9, A-F). Tomando los primeros 8 en mayúsculas se obtiene el formato `XXXXXXXX` requerido. El espacio de posibilidades es 16^8 = ~4.3 mil millones, por lo que la colisión es prácticamente imposible en producción; los reintentos son una salvaguarda de diseño.

### 3.2 Verificación del cliente

Antes de crear el envío, el servicio llama a `clienteRepository.findById(clienteId)`. Si devuelve `null`, lanza `AppError("CLIENTE_NOT_FOUND", 404)`.

### 3.3 Creación atómica con `prisma.$transaction`

```typescript
// envioRepository.createEnvio(data)
return prisma.$transaction(async (tx) => {
  const envio = await tx.envio.create({ data: { ...envioData } });
  await tx.eventoEnvio.create({
    data: {
      envioId:     envio.id,
      estado:      'PENDIENTE',
      descripcion: 'Envío creado',
    },
  });
  return envio;
});
```

Si cualquiera de las dos operaciones falla, la transacción hace rollback completo y no queda ningún registro huérfano en la base de datos.

### 3.4 Flujo completo del servicio

```
envioService.crear(dto, operadorId):
  1. Verificar que dto.clienteId existe en tabla Cliente → 404 si no
  2. Generar codigo = generarCodigoUnico() → 500 si falla tras 3 intentos
  3. envioRepository.createEnvio({ ...dto, codigoSeguimiento: codigo })
     → crea Envio + EventoEnvio en una sola transacción
  4. Devolver EnvioResponseDto (campos seleccionados del registro creado)
```

---

## 4. Frontend

### Componente: `frontend/src/features/envios/CrearEnvio.tsx`

- Formulario controlado con **React Hook Form** + validación **Zod** (schema `crearEnvioSchemaFrontend`).
- Campos según wireframe (sección "Crear Envío"):
  1. Remitente (text input)
  2. Destinatario (text input)
  3. Dirección destino (text input con ícono de mapa — usar `MapPin` de Lucide)
  4. Peso (kg) — number input, `min=0.01`, `step=0.01`
  5. Dimensiones (cm) — text input, placeholder `30x20x15`
  6. Descripción del paquete (textarea, opcional)
  7. Campo oculto / selector de `clienteId` (operador selecciona o ingresa ID del cliente)
- Botón primario "GUARDAR ENVÍO" (deshabilitado mientras `isPending`).
- Botón secundario "Cancelar" → navega a `/envios`.
- Errores mostrados con componente `Toast` de Shadcn/UI.
- Al éxito: Toast de éxito + `navigate('/envios')`.

### Hook: `frontend/src/hooks/useCrearEnvio.ts`

```typescript
export const useCrearEnvio = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CrearEnvioDto) => envioService.crear(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['envios'] });
    },
  });
};
```

### Servicio: `frontend/src/services/envioService.ts`

```typescript
export const envioService = {
  async crear(dto: CrearEnvioDto): Promise<EnvioResponseDto> {
    const res = await api.post('/envios', dto);
    return res.data.data;
  },
};
```

`api` es la instancia de Axios ya configurada con `baseURL = /api/v1` y el interceptor de `Authorization: Bearer <token>` del store de auth.

---

## 5. Decisión técnica clave

**Opción A (elegida): `prisma.$transaction` para crear `Envio` + `EventoEnvio` atómicamente.**

Garantiza que si la creación del `EventoEnvio` falla (p. ej. violación de FK), el `Envio` también hace rollback. No pueden quedar envíos sin su evento inicial de estado.

**Opción B (descartada): dos `create` separados — primero `Envio`, luego `EventoEnvio`.**

Descartada porque si el segundo `create` falla, el sistema queda en estado inconsistente: existe un `Envio` sin historial de estados. Esto rompería las consultas de rastreo y el dashboard de operador.

---

## 6. Seguridad

| Capa | Medida |
|------|--------|
| Auth | `authMiddleware` verifica JWT firmado con `JWT_SECRET`; rechaza requests sin token o con token expirado/inválido (R1) |
| Autorización | `roleMiddleware('OPERADOR')` aplicado en la ruta antes del controlador; devuelve 403 si `req.user.rol !== 'OPERADOR'` (R2) |
| Validación | `crearEnvioSchema` (Zod) se ejecuta en el controlador antes de llamar al servicio; Prisma nunca recibe datos no validados (R8, R9) |
| Integridad referencial | El servicio verifica existencia del `clienteId` antes de insertar; Prisma también refuerza la FK a nivel de BD (R10) |
| Inyección | Todos los inputs pasan por Zod y por Prisma ORM con queries parametrizadas; nunca se construyen queries con concatenación de strings |
| Secrets | `JWT_SECRET` y `DATABASE_URL` en variables de entorno, nunca en código fuente |
