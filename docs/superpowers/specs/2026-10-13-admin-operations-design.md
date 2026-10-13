# Panel administrativo: operaciones por fases

**Estado:** aprobado para iniciar la fase 1.  
**Entorno:** `demo.suplenitud.com` exclusivamente.  
**Producción:** `suplenitud.com` y `www.suplenitud.com` fuera de alcance.

## Decisiones confirmadas

- Roles con acceso al panel: `SUPER_ADMIN`, `ADMIN` y `TREASURER` solamente.
- `USHER` y los futuros integrantes de ministerios son **contactos ministeriales**, no usuarios del panel. No inician sesión ni reciben permisos de administración.
- En esta etapa los roles de panel son fijos. La creación de roles dinámicos queda como posibilidad futura, no como funcionalidad actual.
- La interfaz conserva navy, verde y lima de Iglesia Plenitud. Puede tomar de TailAdmin la jerarquía visual de tabla, perfil, bandeja y chat, pero no copiar su código, marca, Tailwind ni su paleta.
- Las ramas, commits y documentación no usarán nombres de IA. Usar nombres funcionales como `feature/admin-operations`.

## Fase 1: administración de usuarios y perfil

### Usuarios: `/admin/users`

Tabla clásica y responsive con búsqueda, filtros por rol/estado y paginación. Muestra nombre, correo, rol, estado, 2FA, fecha de creación y última actividad disponible. Las acciones se abren en panel/modal accesible: crear, editar datos permitidos, cambiar rol dentro de la matriz existente, forzar cambio de contraseña y desactivar/reactivar. No borrar físicamente una cuenta ni permitir crear otro `SUPER_ADMIN` desde la interfaz.

Cada acción exige autorización del lado servidor, validación de origen y registro en auditoría. El usuario activo no puede desactivarse a sí mismo. `SUPER_ADMIN` administra todas las cuentas; `ADMIN` y `TREASURER` no acceden a esta ruta.

### Contactos ministeriales

Nueva entidad separada de `User`: nombre, ministerio, teléfono/WhatsApp opcional, identificador de Telegram opcional, idioma, zona horaria, estado de autorización y notas administrativas. No contiene contraseña, sesión ni rol de panel. El `SUPER_ADMIN` y `ADMIN` los gestionan; `TREASURER` no.

Los ministerios iniciales se manejan como catálogo controlado (por ejemplo Ujieres, Música, Tesorería, otros), no como permisos del panel. Crear un ministerio nuevo requiere nombre y confirmación explícita en la interfaz; no altera roles ni acceso.

### Perfil: `/admin/configs`

Ficha de perfil inspirada en la jerarquía de TailAdmin: encabezado de identidad, datos de contacto, canales autorizados y bloque de seguridad. Edición explícita por sección; no un formulario largo abierto permanentemente. Conserva el flujo de 2FA existente. El correo de inicio de sesión sigue requiriendo el futuro flujo verificado; no se permite cambiarlo directamente.

### Visual y móvil

Mantener el shell ya publicado: sidebar/drawer, iconos Tabler y tema claro/oscuro. Añadir tablas con encabezados, barra de filtros, acciones de fila y estado vacío profesional. En móvil, las columnas secundarias pasan a detalle expandible; las acciones deben quedar alcanzables sin depender de hover.

## Fase 2: analítica pastoral de visitas

Reemplazar la vista actual por métricas agregadas con filtro de fecha: visitas/páginas públicas, países, estados de EE. UU. e idiomas. Excluir en servidor toda ruta `/admin`, API administrativa, bots conocidos y tráfico de pruebas. No guardar perfiles de visitante, correo, teléfono, IP cruda ni rastrear administradores.

La fuente de país/estado debe definirse antes de programar: cabecera confiable del proxy o proveedor GeoIP con licencia y retención documentada. Si no hay fuente confiable, la UI muestra "geografía no disponible"; no inventa ubicación.

## Fase 3: correo institucional MailCow

Mostrar únicamente los buzones que un administrador tenga asignados. La primera entrega será lectura y redacción desde una bandeja estilo clásico: Inbox, Enviados, Borradores, búsqueda, conversación y adjuntos con límites. La conexión será IMAP/SMTP o una API documentada, mediante credenciales de servicio fuera de Git y con control por buzón.

No se administrará MailCow completo desde el panel en la primera versión: crear buzones, contraseñas globales, dominios, cuotas y reglas del servidor permanecen en MailCow hasta contar con una política aprobada y una API de mínimo privilegio. No activar envío real sin autorización y prueba controlada.

## Fase 4: comunicación ministerial por Telegram

El Admin conversa desde una vista de chat con contactos ministeriales que ya autorizaron su ID de Telegram. n8n transporta los mensajes; PostgreSQL conserva conversaciones, dirección, hora, estado y correlación, sin almacenar tokens en la aplicación. El contacto responde en Telegram y la conversación se refleja en el panel.

Antes de activarla: consentimiento, IDs autorizados, retención/borrado, límites de envío, prevención de duplicados, logs de auditoría y manejo de errores. Nunca exponer el bot ni convertir mensajes entrantes en instrucciones ejecutables.

## Validación y publicación

Cada fase: migración Prisma revisada, pruebas de autorización y rutas, lint, typecheck, build, `git diff --check`, revisión desktop/móvil y commit/push antes de desplegar. Desplegar solo commits ya publicados en `demo.suplenitud.com`; no tocar producción.

## Fuera de alcance por ahora

- Roles dinámicos de panel.
- Geolocalización sin fuente confiable.
- Administración completa de MailCow.
- Envío real de correo o Telegram sin credenciales, autorización y pruebas.
- PayPal, Square, WhatsApp y n8n de peticiones de oración.
