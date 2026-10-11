# Plan de continuidad: administración, peticiones y donaciones

**Basado en:** `../specs/2026-10-10-admin-prayer-donations-design.md`  
**Punto de partida:** commit `192804c` de `nextjs-migration` (demo Next.js publicada).  
**Regla inviolable:** no modificar ni desplegar sobre `suplenitud.com` o `www.suplenitud.com`.

## Cómo retomar de forma segura

1. Leer `../AGENTS.md`, `README.md`, `MIGRATION-CHECKPOINT.md` y el diseño enlazado arriba. No abrir el archivo restringido nombrado en las reglas.
2. Ejecutar `git status --short --branch` y confirmar la rama `nextjs-migration` limpia antes de cada fase.
3. Revisar cada cambio con `npm run lint`, `npm run typecheck` y `npm run build`; añadir pruebas focalizadas para la fase.
4. Hacer un commit pequeño y `push` después de cada fase aprobada. Actualizar `MIGRATION-CHECKPOINT.md` y el checkpoint raíz cuando corresponda.
5. No inspeccionar, imprimir ni versionar valores secretos. El archivo de entorno remoto no se lee ni se copia.

## Fase A — Fundaciones de identidad y permisos

**Objetivo:** acceso administrativo seguro sin modificar la interfaz pública.

- Elegir e integrar una biblioteca de autenticación mantenida compatible con Next.js 16 y Prisma; no construir criptografía o sesiones propias.
- Migrar el esquema Prisma con `User`, credenciales seguras, sesiones, `Role`, asignación de roles y `AuditLog`.
- Implementar el bootstrap de una sola ejecución para `jscothserver@gmail.com` desde variables de entorno locales del servidor. Requiere cambio de contraseña inicial y se desactiva tras crear la cuenta.
- Implementar autorización de servidor para `SUPER_ADMIN`, `ADMIN`, `TREASURER` y `USHER`, aunque los dos últimos no expongan panel aún.
- Crear `/admin` bilingüe (`en` predeterminado, `es`); protegerlo antes de renderizar datos.
- Verificar acceso permitido/denegado por rol, expiración/revocación de sesión, cambio de contraseña y eventos de auditoría sin secretos.

**Criterio de cierre:** solo SuperAdmin puede entrar, crear un Admin y revisar la auditoría mínima. No hay datos de oración ni pago todavía.

## Fase B — Contenido traducible administrable

**Objetivo:** administrar texto público sin permitir cambios de diseño peligrosos.

- Diseñar `ContentBlock`, `ContentTranslation` y revisiones con claves estables y tipos permitidos.
- Crear adaptador de lectura para que Home/Pastors siga mostrando contenido si falta la base o una traducción, con fallback explícito y sin romper las rutas.
- Crear el editor administrativo con formato limitado y sanitizado; prohibir HTML/CSS/script libre.
- Mostrar estado por idioma `en/es/pt/ko/de`, borrador/publicación y restauración de una revisión anterior.
- Migrar primero una sección pequeña como prueba, comparar visualmente y después migrar el resto por bloques.

**Criterio de cierre:** Admin modifica un bloque en borrador, completa traducciones, publica y puede restaurar la revisión previa; no se altera el diseño existente.

## Fase C — Dominio de peticiones de oración

**Objetivo:** modelar y administrar peticiones sin activar todavía notificaciones externas.

- Crear migración para solicitudes, consentimientos, preferencias de contacto, franjas horarias, estados, asignaciones, disponibilidad y bitácora.
- Crear administración para SuperAdmin/Admin; `USHER` no tiene panel ni credenciales.
- Agregar zonas horarias y disponibilidad semanal de ujieres; calcular responsables disponibles sin guardar más datos de los necesarios.
- Implementar retención/borrado configurable y acciones auditadas.
- Crear pruebas de permisos, zona horaria, transiciones de estado, consentimiento y aislamiento frente a analytics.

**Criterio de cierre:** un Admin puede registrar, asignar y cerrar una solicitud en entorno controlado; no hay formulario público ni n8n activo.

## Fase D — Formulario público y Telegram/n8n

**Objetivo:** habilitar el flujo real solo cuando la fase C esté aprobada.

- Reemplazar el formulario deshabilitado por validación de servidor, nombre y teléfono/WhatsApp obligatorios, correo opcional y consentimiento obligatorio.
- Añadir rate limiting, protección antiabuso y respuesta de recepción realista sin prometer contacto inmediato.
- Definir contrato autenticado servidor-a-servidor hacia n8n, con payload mínimo, reintentos idempotentes y trazabilidad.
- Configurar Telegram exclusivamente en n8n con IDs autorizados; notificar solo responsables disponibles. No poner credenciales de n8n o Telegram en cliente ni repositorio.
- Verificar manualmente una petición de prueba de extremo a extremo y que analytics no registra sus datos.

**Criterio de cierre:** petición guardada, consentimiento registrado, aviso Telegram limitado a autorizados y trazabilidad completa. La conexión WhatsApp sigue fuera de esta fase.

## Fase E — Donaciones y tesorería

**Objetivo:** registrar pagos confirmados sin procesar datos de tarjeta en la aplicación.

- Elegir configuración institucional de PayPal y Square; documentar responsables y entornos de prueba sin secretos.
- Crear campañas/conceptos, checkout alojado y tablas de transacción idempotentes.
- Implementar endpoints de webhook con verificación de firma por proveedor y conciliación segura de estados.
- Exponer a `TREASURER` solo el listado, filtros y conciliación necesarios; aislarlo de contenido, usuarios y solicitudes.
- Probar duplicados, firmas inválidas, reembolsos y permisos antes de una demo.

**Criterio de cierre:** Tesorería puede conciliar transacciones confirmadas de sandbox sin acceso a peticiones, y ningún dato de pago sensible entra a PostgreSQL.

## Fase F — Validación y demo

- Ejecutar lint, typecheck, build, migraciones de demo y pruebas de regresión de rutas, idiomas, SEO, popup, analítica y navegación móvil.
- Revisar manualmente `/`, `/pastors/`, las rutas `es/pt/ko/de`, `/admin`, permisos y los módulos habilitados.
- Desplegar exclusivamente en `demo.suplenitud.com` tras verificación local y autorización operativa. Confirmar que `suplenitud.com` permanece sin cambios.
- Registrar versión desplegada, evidencia de pruebas y rollback mediante commit anterior.

## Decisiones ya cerradas

- SuperAdmin inicial: `jscothserver@gmail.com`; contraseña temporal secreta y cambio obligado.
- Idiomas del panel: inglés predeterminado y español.
- Roles actuales: SuperAdmin, Admin, Treasurer y Usher; Usher no entra al panel.
- Formulario: nombre y teléfono/WhatsApp requeridos; correo opcional; consentimiento obligatorio.
- Disponibilidad: zonas horarias, horario semanal y preferencia de contacto del visitante.
- Canal inicial: Telegram mediante n8n e IDs autorizados. WhatsApp se posterga.
- Pagos: PayPal y Square, con webhooks firmados; no se guardan tarjetas.
