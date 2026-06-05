# docs/conventions.md — Convenciones de Código

> Leer antes de escribir cualquier línea. Aplicar sin excepción.

---

## TypeScript

- `strict: true` en ambos `tsconfig.json`. **Prohibido usar `any`** explícito.
- DTOs como interfaces en `backend/src/types/` y `frontend/src/types/`.
- Enums de Prisma se reutilizan en el frontend importándolos de los DTOs, no de `@prisma/client` directamente.
- Usar `type` para uniones/intersecciones, `interface` para objetos extensibles.

## Nombres

| Elemento | Convención | Ejemplo |
|---|---|---|
| Archivos backend | `camelCase.ts` | `envioService.ts`, `authMiddleware.ts` |
| Archivos frontend | `PascalCase.tsx` para componentes | `CrearEnvio.tsx` |
| Archivos de hooks | `useNombre.ts` | `useEnvios.ts` |
| Archivos de servicios | `nombreService.ts` | `envioService.ts` |
| Schemas Zod (backend) | `nombreSchema` | `crearEnvioSchema` |
| Endpoints | kebab-case en URL | `/api/v1/envios`, `/api/v1/rutas-optimas` |
| Variables de entorno | `SCREAMING_SNAKE_CASE` | `JWT_SECRET`, `DATABASE_URL` |
| Constantes | `SCREAMING_SNAKE_CASE` | `MAX_FILE_SIZE_MB` |

## Estructura de un controlador (backend)

```typescript
// Solo extrae params, llama al servicio, responde HTTP. Sin lógica de negocio.
export const crearEnvio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dto = crearEnvioSchema.parse(req.body); // validación Zod
    const envio = await envioService.crear(dto, req.user!.id);
    res.status(201).json({ data: envio, message: 'Envío creado', status: 201 });
  } catch (error) {
    next(error); // siempre pasar al error handler global
  }
};
```

## Estructura de un servicio (backend)

```typescript
// Toda la lógica de negocio aquí. Sin acceso directo a Prisma.
export const envioService = {
  async crear(dto: CrearEnvioDto, operadorId: string): Promise<Envio> {
    const codigo = await generarCodigoUnico(); // lógica aquí
    return envioRepository.crear({ ...dto, codigo, operadorId });
  }
};
```

## Estructura de un repositorio (backend)

```typescript
// Solo acceso a Prisma. Sin lógica de negocio. Sin validaciones.
export const envioRepository = {
  async crear(data: PrismaEnvioCreateInput): Promise<Envio> {
    return prisma.envio.create({ data });
  },
  async findByCodigo(codigo: string): Promise<Envio | null> {
    return prisma.envio.findUnique({ where: { codigoSeguimiento: codigo } });
  }
};
```

## Llamadas HTTP en el frontend

```typescript
// En services/envioService.ts — NUNCA fetch directo en componentes
export const envioService = {
  async crear(dto: CrearEnvioDto): Promise<Envio> {
    const res = await api.post('/envios', dto); // api = axios instance configurada
    return res.data.data;
  }
};
```

## Estado del servidor en el frontend

```typescript
// En hooks/useEnvios.ts — TanStack Query, no duplicar en Zustand
export const useEnvios = (filters: EnvioFilters) => {
  return useQuery({
    queryKey: ['envios', filters],
    queryFn: () => envioService.listar(filters),
  });
};
```

## Manejo de errores

- El backend tiene un **error handler global** en `middlewares/errorHandler.ts`.
- Todos los errores que no son de validación Zod se pasan con `next(error)`.
- Los errores Zod se capturan en el error handler y devuelven 422 con los detalles de validación.
- El frontend intercepta errores de Axios y los propaga a los `onError` de TanStack Query.
- No usar `alert()` en el frontend; usar los componentes Toast de Shadcn/UI.

## Tests

- Backend: `describe` por módulo de servicio/controlador. Un `it`/`test` por caso de uso (éxito + error).
- Frontend: un archivo `*.test.tsx` por componente o hook crítico.
- Los tests del backend usan una base de datos de test separada (variable `TEST_DATABASE_URL`).
- No mockear Prisma directamente; usar transacciones que se hacen rollback al final del test.
- Naming: `debe <comportamiento esperado>` → `debe crear el envío con código único`.

## Commits

- `feat(scope): descripción` — nueva funcionalidad
- `fix(scope): descripción` — corrección de bug
- `test(scope): descripción` — tests añadidos/corregidos
- `chore(scope): descripción` — configuración, deps
- Scope = nombre de la feature de `feature_list.json` (p.ej. `auth_login`, `envios_crear`)

## Lo que nunca debe aparecer en el código

- `any` explícito en TypeScript.
- `console.log` de debug (usar `console.error` solo en el error handler global).
- `TODO` sin número de issue o contexto suficiente.
- Credenciales o secrets en código fuente.
- Fetch directo en componentes React.
- Lógica de negocio en controladores o repositorios.
