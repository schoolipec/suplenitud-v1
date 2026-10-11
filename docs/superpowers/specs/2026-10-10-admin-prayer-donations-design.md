# Diseño aprobado: administración, peticiones y donaciones

**Fecha:** 2026-10-10  
**Estado:** aprobado para planificación; sin implementación todavía.  
**Entorno:** únicamente `demo.suplenitud.com`. `suplenitud.com` y `www.suplenitud.com` quedan fuera de alcance.

## Propósito

Incorporar a la aplicación Next.js una administración autenticada para contenido, peticiones de oración y, en una fase posterior, conciliación de donaciones. PostgreSQL es la fuente de verdad. n8n y los proveedores de pago son integraciones externas, nunca sustitutos de los datos ni de los permisos de la aplicación.

## Roles y acceso

| Rol | Acceso inicial |
|---|---|
| `SUPER_ADMIN` | Usuarios, roles, permisos, contenido, peticiones, configuraciones, auditoría y tesorería. |
| `ADMIN` | Contenido, peticiones y asignación; no crea SuperAdmins ni administra secretos. |
| `TREASURER` | Fase de donaciones: consulta y conciliación de transacciones; no ve peticiones ni contenido administrativo. |
| `USHER` | Sin acceso al panel. Puede recibir alertas autorizadas y contactar a personas según asignación externa. |

La primera cuenta será `jscothserver@gmail.com` con rol `SUPER_ADMIN`. Se provisionará una sola vez desde secretos locales del servidor. La contraseña temporal no se guarda, muestra, documenta ni versiona. El mecanismo de bootstrap se deshabilita al terminar y el primer acceso exige cambio de contraseña.

El panel será bilingüe: inglés por defecto y español opcional. Esto es independiente de los cinco idiomas públicos (`en`, `es`, `pt`, `ko`, `de`).

## Contenido público

El contenido editable se modelará en bloques tipados con clave estable, orden, estado de borrador/publicado, revisión recuperable y traducciones en los cinco idiomas públicos. El editor permitirá solo formato seguro y limitado: negrita, cursiva, enlaces, listas y citas.

No se almacenará HTML, CSS o JavaScript arbitrario. Tipografías, colores, tamaños y espaciados se elegirán mediante variantes aprobadas del diseño existente. El panel indicará traducciones faltantes y publicará solo por acción explícita.

## Peticiones de oración

El formulario pedirá nombre y teléfono/WhatsApp; correo será opcional. Requerirá consentimiento explícito para contacto pastoral. Las solicitudes y sus notas nunca alimentan analytics.

Estados: `NEW`, `ASSIGNED`, `CONTACTED`, `CLOSED`. Solo `SUPER_ADMIN` y `ADMIN` acceden al panel de solicitudes. Los ujieres no reciben credenciales del panel.

Cada ujier configurable tendrá zona horaria y horario semanal. El visitante podrá pedir contacto "lo antes posible durante el horario disponible" o elegir una franja preferida. Fuera del horario disponible la solicitud queda pendiente; el mensaje de recepción no promete contacto inmediato.

Se guardará una bitácora de asignación y cambios de estado, con retención/borrado configurable antes de activar el formulario público.

## Notificaciones

La aplicación persiste y valida primero. Luego emite un evento interno hacia n8n. Telegram será el primer canal y se limitará a IDs explícitamente autorizados y responsables disponibles. n8n recibe únicamente los datos necesarios para la alerta.

WhatsApp queda como integración futura, hasta definir número institucional, proveedor, consentimiento y reglas de contacto. No se dependerá de cuentas personales.

## Donaciones

Donaciones es un módulo separado de peticiones. PayPal y Square procesarán los pagos alojados; la aplicación no guarda tarjetas ni datos bancarios. Los webhooks con firma válida e idempotencia registrarán proveedor, referencia externa, importe, moneda, concepto/campaña, fecha y estado (`PENDING`, `CONFIRMED`, `FAILED`, `REFUNDED`).

`TREASURER` se implementará en esta fase posterior con acceso mínimo para revisar y conciliar transacciones.

## Seguridad y operación

- Autenticación y autorización se validan del lado servidor en todas las rutas administrativas y APIs.
- Contraseñas con hash seguro; sesiones revocables, cambio obligatorio de la temporal y limitación de intentos.
- Auditoría sin contraseñas, tokens, contenido íntegro de peticiones ni datos de tarjetas.
- Validación de inputs, protección CSRF apropiada a las sesiones y rate limiting para endpoints públicos.
- Secretos solamente en el entorno seguro del VPS; nunca en Git, documentación ni salida de comandos.
- Cada fase termina con migración reversible, pruebas, commit, push y actualización del checkpoint.

## Límites

No activar todavía el formulario real, Telegram, WhatsApp, PayPal, Square, n8n ni despliegues. Esas acciones requieren completar sus fases verificadas y, para cambios de infraestructura o credenciales, la autorización aplicable. La producción no se toca.
