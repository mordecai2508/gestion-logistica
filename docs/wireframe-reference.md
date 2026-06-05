# docs/wireframe-reference.md — Referencia de Wireframes

> Resumen textual del archivo `WIFRAME.pdf` para que los agentes puedan
> consultar los requisitos de UI sin necesidad de abrir el PDF.
> Ante cualquier duda, el PDF es la fuente de verdad.

---

## Login

- Logo centrado arriba.
- Campo correo electrónico (con icono de persona).
- Campo contraseña (con icono de candado).
- Checkbox "Recordarme".
- Botón primario "INICIAR SESIÓN" (ancho completo, fondo oscuro).
- Links: "¿Olvidó su contraseña?" y "¿No tienes cuenta? Registrarse".

## Registro (Crear cuenta)

- Título "Crear cuenta".
- Campos: Nombre completo, Correo electrónico, Contraseña, Confirmar contraseña, Teléfono.
- Selector de Rol (dropdown).
- Botón primario "REGISTRARSE".
- Link "¿Ya tienes cuenta? Inicia sesión".

## Vista Operador (Dashboard)

- Sidebar izquierdo con navegación: Dashboard, Envíos, Rutas, Vehículos, Incidencias, Reportes, Usuarios, Configuración.
- Barra de búsqueda superior + iconos de notificación y perfil.
- Tarjetas de métricas: Total Envíos (120), En Ruta (45), Entregados (70), Incidencias (5).
- Tabla de envíos recientes: Código | Cliente | Estado | Fecha | Acciones (ver, editar, eliminar).
- Estados con badges de color: Pendiente (naranja/gris), En ruta (azul), Entregado (verde).
- Panel "Envíos por estado" con gráfico de torta.
- Panel "Rutas Pendientes": lista RUTA-001 a RUTA-004 con flecha de acción.
- Panel "Vehículos Disponibles": tabla placa/modelo/estado.
- Botón flotante "+ Nuevo Envío".

## Crear Envío

- Título "Nuevo Envío".
- Campo Remitente (text).
- Campo Destinatario (text).
- Campo Dirección destino (text + ícono mapa).
- Campos Peso (kg) y Dimensiones (cm) en fila.
- Campo Descripción del paquete (textarea).
- Botón "GUARDAR ENVÍO" (primario).
- Botón "Cancelar" (secundario/texto).

## Consultar Envíos

- Barra de búsqueda "Buscar por código, cliente o estado" con botón lupa.
- Tabla: Código | Cliente | Estado | Acciones (ver, editar, eliminar).
- Paginación inferior (< 1 2 3 >).
- Botón "+ Nuevo Envío".

## Rastrear Paquete

- Campo de texto "Ingrese código de seguimiento" + botón "Buscar".
- Badge de estado actual (p.ej. "EN RUTA" con fondo azul).
- Texto "Última actualización: 17/04/2026 – 11:45 AM".
- Mapa interactivo (Leaflet) con ruta trazada y marcador del paquete.
- Historial del envío con línea de tiempo: icono + fecha + hora + estado.

## Gestión de Rutas

- Campo "Ruta ID" (readonly o seleccionable: RUTA-001…).
- Lista "Envíos asignados" con checkboxes (ENV001 – Juan Pérez, etc.).
- Selector "Vehículo" (dropdown).
- Selector "Repartidor" (dropdown).
- Botón "GENERAR RUTA ÓPTIMA".
- Botón "Guardar ruta".

## Gestión de Vehículos

- Título "Vehículos".
- Tabla: Placa | Modelo | Capacidad | Estado.
- Badges de estado: Disponible (verde), Ocupado (naranja), Mantenimiento (rojo/gris).
- Botones en footer de tabla: "+ Registrar Vehículo", "Asignar Vehículo", "Actualizar Estado".

## Vista Repartidor (mobile)

- Barra superior con nombre de app y notificación.
- Título "Mis Entregas".
- Pestañas: Pendientes (3) | Completadas.
- Tarjetas de entrega: ícono + código + dirección + rango horario + flecha.
- Barra inferior de navegación: Rutas | Entregas | Mapa | Perfil.

## Confirmación de Entrega (mobile)

- Header "Confirmar Entrega" con notificación.
- Info: Código ENVxxx, Cliente: nombre.
- Zona "Foto evidencia" con botón de cámara.
- Zona "Firma receptor" con área de firma (línea de trazo).
- Botón "CONFIRMAR ENTREGA" (primario, ancho completo).
- Link "Reportar incidencia".

## Incidentes

- Título "Incidencias".
- Tabla: Código | Tipo | Descripción | Estado | Acciones (ver, editar).
- Estados: Abierta, En proceso.
- Botón "+ Nueva Incidencia".
- Paginación inferior.

## Notificaciones

- Lista de notificaciones con ícono de tipo + mensaje en negrita + descripción + tiempo relativo.
- Tipos: entrega realizada, ruta asignada, retraso reportado, cambio de estado.
- Cada notificación tiene borde izquierdo de color según tipo.
