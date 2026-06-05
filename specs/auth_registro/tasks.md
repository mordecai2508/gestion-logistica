# Tasks — auth_registro

> Feature: Registro de usuarios (id: 2, sprint 1)
> Implementer: seguir en orden. Marcar `[x]` al completar cada task.

---

## Backend

- [x] T1. Actualizar `backend/src/validators/authValidator.ts` añadiendo `registerSchema`:
  - `nombre: z.string().min(1, 'El nombre es requerido')`
  - `correo: z.string().email('El correo debe tener un formato válido')`
  - `password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres')`
  - `confirmPassword: z.string().min(1, 'La confirmación de contraseña es requerida')`
  - `telefono: z.string().min(1, 'El teléfono es requerido')`
  - `rol: z.enum(['CLIENTE', 'OPERADOR', 'REPARTIDOR'])`
  - Refinamiento: `.refine((d) => d.password === d.confirmPassword, { message: 'Las contraseñas no coinciden', path: ['confirmPassword'] })`
  - Exportar tipo `RegisterDto = z.infer<typeof registerSchema>`.

- [x] T2. Actualizar `backend/src/repositories/authRepository.ts` añadiendo el método `createUsuario`:
  - Firma: `createUsuario(data: RegisterDto & { hashedPassword: string }): Promise<{ id: string, correo: string, rol: Rol }>`
  - Implementar usando `prisma.$transaction(async (tx) => { ... })`:
    - `tx.usuario.create(...)` con `{ nombre, correo, password: hashedPassword, telefono, rol }`
    - Según `rol`: `tx.cliente.create(...)` | `tx.operador.create(...)` | `tx.repartidor.create({ data: { usuarioId, disponible: true } })`
  - Devolver `{ id: usuario.id, correo: usuario.correo, rol: usuario.rol }`.

- [x] T3. Actualizar `backend/src/services/authService.ts` añadiendo el método `register`:
  - Firma: `register(dto: RegisterDto): Promise<{ id: string, correo: string, rol: Rol }>`
  - Pasos: (1) llamar `authRepository.findByCorreo(dto.correo)`; si existe, lanzar error `EMAIL_ALREADY_EXISTS` con statusCode 409. (2) `bcrypt.hash(dto.password, 12)` → `hashedPassword`. (3) llamar `authRepository.createUsuario({ ...dto, hashedPassword })`. (4) devolver el resultado.

- [x] T4. Actualizar `backend/src/controllers/authController.ts` añadiendo `registerHandler`:
  - Parsear body con `registerSchema.parse(req.body)`.
  - Llamar `authService.register(dto)`.
  - Responder con `res.status(201).json({ data: result, message: 'Usuario registrado exitosamente', status: 201 })`.
  - Pasar cualquier error a `next(error)`.

- [x] T5. Actualizar `backend/src/routes/auth.ts` añadiendo la ruta:
  - `router.post('/register', registerHandler)`
  - Asegurarse de que el router sigue registrado bajo el prefijo `/api/v1/auth` con el `authLimiter` existente.

- [x] T6. Escribir tests en `backend/src/tests/auth.test.ts` — bloque `describe('POST /api/v1/auth/register')`:
  - `it('R1 - debe devolver 201 con { data: { id, correo, rol } } al registrar con datos válidos')`
  - `it('R2 - debe persistir la contraseña como hash bcrypt y no en texto plano')`
  - `it('R3 - debe devolver 409 EMAIL_ALREADY_EXISTS si el correo ya existe en la BD')`
  - `it('R4 - debe devolver 422 si el campo correo tiene formato inválido')`
  - `it('R5 - debe devolver 422 si la contraseña tiene menos de 8 caracteres')`
  - `it('R6 - debe devolver 422 si confirmPassword no coincide con password')`
  - `it('R7 - debe devolver 422 si el campo nombre está vacío')`
  - `it('R8 - debe devolver 422 si el campo telefono está vacío')`
  - `it('R9 - debe devolver 422 si el rol no es uno de los valores permitidos')`

- [x] T7. Escribir tests en `backend/src/tests/auth.test.ts` — bloque `describe('Registro — creación de perfil por rol')`:
  - `it('R10 - debe crear un registro en la tabla Cliente cuando rol es CLIENTE')`
  - `it('R11 - debe crear un registro en la tabla Operador cuando rol es OPERADOR')`
  - `it('R12 - debe crear un registro en la tabla Repartidor cuando rol es REPARTIDOR')`
  - `it('R13 - debe hacer rollback completo si falla la creación del perfil (transacción atómica)')`
  - `it('R21 - no debe incluir el campo password en la respuesta')`

---

## Frontend

- [x] T8. Crear componente `frontend/src/features/auth/Register.tsx`:
  - Usar `react-hook-form` con `zodResolver` y schema Zod `registerSchema` definido en este archivo o importado de `frontend/src/lib/schemas/registerSchema.ts`.
  - Campos en orden: nombre, correo, password, confirmPassword, teléfono, rol (Select de Shadcn).
  - Botón "REGISTRARSE" full-width, deshabilitado mientras `registerMutation.isPending`.
  - Link "¿Ya tienes cuenta? Inicia sesión" → `/login`.
  - Manejo de errores: Toast para 409; mensajes de campo para 422.
  - Componentes Shadcn/UI: `Card`, `CardHeader`, `CardContent`, `Input`, `Button`, `Label`, `Select`, `SelectTrigger`, `SelectContent`, `SelectItem`.
  - Coincidir con wireframe sección "Registro (Crear cuenta)" de `docs/wireframe-reference.md`.

- [x] T9. Actualizar `frontend/src/services/authService.ts` añadiendo el método `register`:
  - Firma: `register(dto: RegisterDto): Promise<{ id: string, correo: string, rol: string }>`
  - Llamada: `api.post('/auth/register', dto)` → devolver `res.data.data`.

- [x] T10. Actualizar `frontend/src/hooks/useAuth.ts` añadiendo `registerMutation`:
  - `useMutation({ mutationFn: authService.register, onSuccess: () => navigate('/login'), onError: (err) => { /* Toast según código */ } })`
  - Exportar `registerMutation` junto con las mutations existentes.

- [x] T11. Actualizar `frontend/src/router/index.tsx` añadiendo la ruta pública:
  - `{ path: '/register', element: <Register /> }` en el bloque de rutas públicas, junto a `/login`.

- [x] T12. Escribir test `frontend/src/features/auth/Register.test.tsx`:
  - `it('R14 - debe renderizar todos los elementos del wireframe: título, campos, selector de rol, botón, link')`
  - `it('R15 - debe mostrar error de validación en el campo correo si el formato es inválido')`
  - `it('R15 - debe mostrar error si confirmPassword no coincide con password')`
  - `it('R16 - debe redirigir a /login cuando el registro es exitoso (201)')`
  - `it('R17 - debe mostrar Toast de error cuando el servidor devuelve 409')`
  - `it('R18 - debe mostrar mensaje de error de campo cuando el servidor devuelve 422')`

---

## Verificación final

- [x] T13. Ejecutar `npm run test` en `backend/` y verificar que todos los tests pasen (verde).
- [x] T14. Ejecutar `npm run lint` en `backend/` y verificar que no haya errores de ESLint ni TypeScript.
- [x] T15. Ejecutar `npm run build` en `backend/` y verificar que compila sin errores.
- [x] T16. Ejecutar `npm run test` en `frontend/` y verificar que todos los tests pasen (verde).
- [x] T17. Ejecutar `npm run lint` en `frontend/` y verificar que no haya errores de ESLint ni TypeScript.
- [x] T18. Ejecutar `npm run build` en `frontend/` y verificar que compila sin errores.

---

## Correcciones del reviewer

- [x] TC1. Corrección C1: tests R10–R12 verifican tx.cliente/operador/repartidor.create
- [x] TC2. Corrección C2: test R16 aserta navigate('/login')
- [x] TC3. Corrección C3: Register.tsx usa Shadcn Select con Controller de RHF
