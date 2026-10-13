# Continuidad del panel administrativo

**Actualizado:** 2026-10-13

**Rama:** `feature/admin-operations-phase-1` (basada en `nextjs-migration@3690274`)

**Entorno autorizado:** `demo.suplenitud.com` exclusivamente.

## Límites innegociables

- No modificar `suplenitud.com`, `www.suplenitud.com`, sus DNS, ni la maqueta estática de referencia `../suPlenitud/`.
- No abrir el archivo restringido indicado en `../AGENTS.md`.
- No guardar secretos, contraseñas, URI TOTP, códigos de recuperación, tokens ni URLs de base de datos en Git, documentos o comandos registrados.
- Antes de un cambio: revisar estado Git, conservar commits existentes, validar localmente, crear commit y hacer `push`. Desplegar únicamente el commit ya publicado.

## Implementado y publicado en demo

- Better Auth con PostgreSQL aislado, sesiones, roles `SUPER_ADMIN`, `ADMIN`, `TREASURER` y `USHER`, auditoría y cambio obligatorio de la contraseña inicial.
- `SUPER_ADMIN` y `ADMIN` pueden acceder al panel; `TREASURER` tiene acceso restringido (dashboard, donaciones y configuración propia); `USHER` no tiene acceso al panel. Ujieres no tendrán acceso al panel.
- Rutas administrativas iniciales: inicio, usuarios, contenido, peticiones, disponibilidad de ujieres y donaciones. Todas deben mantener verificación del lado servidor.
- Contenido: tablas de bloques, traducciones y revisiones; el editor funcional y su publicación siguen pendientes.
- Peticiones: tablas, formulario público y rutas administrativas iniciales existen; Telegram, WhatsApp y n8n siguen desactivados.
- Donaciones: tabla y vista base existen; PayPal, Square y webhooks no están integrados.
- El selector público de idioma está oculto en `/admin/*`. Las rutas localizadas `/es|pt|ko|de/admin/:path*` redirigen de forma temporal a `/admin/:path*`.
- El cambio de contraseña valida el origen público configurado en `BETTER_AUTH_URL`, evitando el error `invalid_origin` detrás del proxy de demo.

## Bloque actual: base responsive del panel (fase completada en rama; sin desplegar)

La base responsive del panel administrativo quedó implementada en la rama `opencode/admin-panel-responsive` (commits `2a55078` y el de cierre de fase). Pendiente de despliegue a demo tras aprobación:

1. **Dashboard `/admin`:** real con `AdminFrame`, sin formulario de crear usuario incrustado. Tarjetas por rol: Users solo SUPER_ADMIN; para TREASURER solo Donations y Settings (dashboard restringido, sin contadores de peticiones/contenido). Actividad reciente solo visible para SUPER_ADMIN.
2. **`/admin/users`:** lista responsive con scroll horizontal, creación de cuentas por SUPER_ADMIN vía `POST /api/admin/users` (roles `ADMIN`, `TREASURER`, `USHER`; la opción USHER indica "no panel access"; no se puede crear otro SUPER_ADMIN desde la UI). La API valida Origin público (`BETTER_AUTH_URL ?? NEXT_PUBLIC_SITE_URL`) y asigna roles solo desde el enum de roles permitidos.
3. **Shell unificado:** todas las páginas del panel (`content`, `prayer-requests`, `usher-availability`, `donations`, `visits`, `configs`, `users`, overview) usan `AdminFrame` con navegación lateral en escritorio y barra sticky horizontal accesible en móvil (breakpoint 760 px). Las páginas de autenticación/2FA (`sign-in`, `recover-password`, `change-password`, `two-factor`, `security`) conservan `admin-shell` sin navegación (decisión deliberada: no mostrar panel a usuarios no autenticados).
4. **Permisos por rol (menú y servidor):** matriz en `src/lib/access.ts` — SUPER_ADMIN: todo; ADMIN: content, prayer-requests, ushers, visits, configs; TREASURER: dashboard restringido, donations, configs; USHER: sin panel (`canAccessAdmin` excluye USHER). Users solo SUPER_ADMIN (`canManageUsers`); Donations solo SUPER_ADMIN/TREASURER (`canManageDonations`). Cada página valida su rol en el servidor y `AdminNavigation` oculta los enlaces no autorizados. Las APIs mutantes de content/prayer/ushers siguen exigiendo SUPER_ADMIN (`requireSuperAdmin`), sin expansión de alcance.
5. **Origen público en APIs:** helper compartido `hasValidPublicOrigin` en `src/lib/request-origin.ts`, aplicado a `users`, `content` (+ publish/unpublish/translations), `prayer-requests/[id]`, `usher-availability` y `profile`. `change-password` ya lo validaba.
6. **Corrección de sticky móvil:** `overflow-x: hidden` en `html, body` convertía al body en scroll container y rompía `position: sticky` de la nav del admin en móvil (desplazamiento de +70 px y no se pegaba al hacer scroll). Cambiado a `overflow-x: clip` en `globals.css`; verificado con Playwright a 390 px (nav pegada bajo el header fijo, sin solapar el `h1`).
7. **2FA intacto:** no se modificó el sistema TOTP existente.
8. **CSS propio:** sin Tailwind; se definieron las clases faltantes `.admin-data-grid`, `.admin-settings-grid`, `.admin-action-link` y `.admin-field-note` en `globals.css`.

### Verificación de esta fase

- `npm run prisma:generate`, `npm run lint`, `npm run typecheck`, `npm run build` y `git diff --check` pasaron.
- Revisión visual a 390 px con Playwright: capturas en `C:\ProgramandoconClaude\Reportes\IPEC\admin-responsive-390px\` (panel de verificación con CSS compilado real, sign-in real y corrección de sticky).

### Pendiente en esta fase

- Desplegar a demo (fuera del alcance de esta rama; requiere procedimiento del VPS descrito abajo).
- La validación visual autenticada completa requiere una BD local utilizable (las credenciales `.env` locales son placeholders); la verificación se hizo con markup representativo + CSS compilado real y con la página real de sign-in.

## Rediseño visual del panel (publicado en demo)

El commit `2e04e4e` fue integrado en `nextjs-migration`, publicado en GitHub y desplegado únicamente en `demo.suplenitud.com` el 2026-10-13. El rediseño es exclusivamente visual; lógica, permisos, rutas, 2FA, APIs e integraciones permanecen intactos:

1. **Sidebar fija (escritorio):** `AdminNavigation` como columna sticky bajo el header público (78 px), con marca, enlaces + iconos Tabler (`@tabler/icons-react`, única familia) y Sign out anclado abajo. Estado activo con acento lima.
2. **Drawer móvil (390 px):** se reemplaza la franja horizontal por barra móvil sticky (botón de menú + marca + salir) y panel deslizable con overlay. Accesible: `aria-expanded`/`aria-controls`, Escape cierra y devuelve el foco, foco inicial al primer enlace, cierre al navegar. No solapa el header público fijo.
3. **Topbar contextual:** `AdminFrame` envuelve eyebrow + título en `.admin-topbar` sticky bajo el header; contenido en `.admin-workspace-body`.
4. **Tarjetas y tablas:** iconos en tarjetas del dashboard y visits; grid `auto-fit`; estados vacíos con `.admin-empty`; hover sutil en filas de tabla.
5. **Paleta y temas:** variables existentes navy/verde/lima (sin púrpura ni gradientes nuevos); dark mode automático vía `[data-theme="dark"]`; contraste AA (números de tarjeta usan `--ink` para legibilidad en oscuro); `:focus-visible` con anillo lima/verde.
6. **Validación:** lint, typecheck, build y `git diff --check` pasaron. Capturas escritorio/390 px × claro/oscuro (+ drawer abierto) en `C:\ProgramandoconClaude\Reportes\IPEC\admin-visual-refresh\` (18 archivos), generadas con componentes reales + markup representativo (BD local placeholder).

Pendiente: validación visual autenticada real con datos de la base aislada.

## 2FA TOTP (publicado en demo; sin cambios en esta fase)

TOTP nativo de Better Auth está publicado en demo:

1. Migración `20261012020000_add_two_factor` y modelo Prisma `TwoFactor`.
2. Ruta `/admin/security`: inscripción voluntaria usando contraseña actual, URI de configuración y códigos de recuperación de un solo uso.
3. Ruta `/admin/two-factor`: desafío de seis dígitos al iniciar sesión cuando el usuario ya confirmó TOTP.
4. La inscripción no debe activarse automáticamente para nadie. Una vez confirmada por el propietario de la cuenta, Better Auth la exige al inicio de sesión.
5. Nunca registrar, copiar ni mostrar en conversación el URI TOTP o los códigos de recuperación.

### Procedimiento de validación y publicación para cambios futuros

1. Ejecutar `npm run prisma:generate`, `npm run lint`, `npm run typecheck` y `npm run build` desde esta carpeta.
2. Revisar `git diff`, actualizar este documento y `MIGRATION-CHECKPOINT.md`, crear commit y `git push origin nextjs-migration`.
3. En el VPS, dentro de `/opt/suplenitud-demo/app`, actualizar por fast-forward y construir la imagen objetivo `builder`.
4. Aplicar únicamente `npx prisma migrate deploy` contra la base aislada usando la red interna y el archivo de entorno remoto. Confirmar que la migración queda aplicada.
5. Levantar solo el proyecto Compose `suplenitud-demo` con `deploy/docker-compose.demo.yml`; no tocar producción ni otras pilas.
6. Verificar HTTPS, la redirección de ruta localizada, el cambio de contraseña y la presencia del endpoint 2FA. El propietario realiza la inscripción real desde `/admin/security` con su aplicación autenticadora.

## Fase 1 de operaciones: usuarios, contactos ministeriales y perfil (rama; sin desplegar)

Implementada en `feature/admin-operations-phase-1` según `docs/superpowers/specs/2026-10-13-admin-operations-design.md`. Sin desplegar; no crear PR hasta autorización.

### Usuarios (`/admin/users`, solo SUPER_ADMIN)

1. **Schema:** columna `User.active` (default `true`) + migración `20261013100000_add_ministry_contacts_and_user_activation`.
2. **API `GET /api/admin/users`:** devuelve además `active` y `lastActivityAt` (derivado de la sesión más reciente; sin inventar datos).
3. **API `PATCH /api/admin/users/[id]`:** editar nombre; cambiar rol solo dentro de `ADMIN`/`TREASURER`/`USHER` (nunca asignar SUPER_ADMIN desde UI). Si el usuario destino tiene rol `SUPER_ADMIN`, el servidor rechaza cualquier cambio de rol (`cannot_change_super_admin_role`, 403) sin depender de la UI; no se eliminan ni recrean roles de un SUPER_ADMIN. Forzar cambio de contraseña (`mustChangePassword` + revocación de sesiones); desactivar/reactivar (`active`). No se puede desactivar a uno mismo. Toda acción exige `requireSuperAdmin`, `hasValidPublicOrigin` y `auditLog` (`USER_UPDATED`). Guards centralizados en `src/lib/admin-user-actions.ts`.
4. **API `POST /api/admin/users`:** restaurada tras la refactorización de la rama; conserva Origin, `requireSuperAdmin`, validación de nombre/correo/contraseña temporal (≥16)/rol, rechazo de SUPER_ADMIN en el rol asignable, correo duplicado (409), creación vía Better Auth, asignación de rol y auditoría (`USER_CREATED`), y además fija `active: true` y `mustChangePassword: true` en la transacción. Respuesta `201`.
4. **UI `UserManagement`:** búsqueda por nombre/correo, filtros de rol y estado, badges de estado/2FA, actividad reciente, acciones visibles por fila (editar, forzar clave, desactivar/reactivar con confirmación en línea) sin depender de hover; auto-acciones ocultas para la propia cuenta (etiqueta "You"); en móvil la tabla se apila en tarjetas con detalle expandible. Crear usuario conserva el flujo existente (roles ADMIN/TREASURER/USHER; contraseña temporal ≥ 16).
5. **Bloqueo de inactivos:** hook `databaseHooks.session.create.before` en `src/lib/auth.ts` impide crear sesiones de usuarios con `active=false`; al desactivar o forzar clave se revocan sesiones existentes. `requireSuperAdmin`/`requireMinistryManager` y las páginas `/admin/users`, `/admin/ministry-contacts` y `/admin/configs` también verifican `active`.

### Contactos ministeriales (`/admin/ministry-contacts`, SUPER_ADMIN + ADMIN)

1. **Entidad `MinistryContact`** separada de `User`: nombre, ministerio, teléfono/WhatsApp/Telegram ID opcional, idioma, zona horaria, `authorized`, `active` y notas administrativas. Sin contraseña, sesión ni rol de panel.
2. **APIs** `GET`/`POST /api/admin/ministry-contacts` y `PATCH /api/admin/ministry-contacts/[id]` con `requireMinistryManager`, origen público y auditoría (`MINISTRY_CONTACT_CREATED`/`MINISTRY_CONTACT_UPDATED`). Sin DELETE físico; se desactiva y reactiva.
3. **Catálogo de ministerios** controlado en UI: Ujieres, Música, Tesorería, Otros + alta de nombre nuevo con confirmación explícita (etiqueta, no rol ni permiso). `TREASURER` no accede.
4. **Navegación:** enlace "Ministry contacts" (`IconAddressBook`) visible para SUPER_ADMIN y ADMIN.

### Perfil (`/admin/configs`)

1. **Ficha de perfil** con identidad (nombre editable, correo de solo lectura con aviso de flujo verificado futuro, roles, estado 2FA), datos de contacto (teléfono/WhatsApp), canales autorizados (Telegram; sin activar notificaciones) y seguridad (enlace a `/admin/security`). Edición explícita por sección: nada se guarda sin pulsar el botón de guardar de esa sección.
2. **API `PATCH /api/admin/profile`:** ahora acepta ediciones parciales (solo campos enviados) y registra los campos modificados en auditoría. Correo de acceso no editable.

### Límites respetados

- Matriz de permisos intacta (sin roles dinámicos; USHER sin panel).
- Sin borrar cuentas físicamente; sin crear SUPER_ADMIN desde UI; sin auto-desactivación.
- Sin tocar lógica de 2FA, ni integraciones (correo, Telegram, n8n, pagos).
- Paleta navy/verde/lima, iconos Tabler, claro/oscuro y drawer responsive conservados; CSS propio sin Tailwind.

### Verificación de esta fase

- `npm run prisma:generate`, `npm run lint`, `npm run typecheck`, `npm run build` y `git diff --check` pasaron.
- Verificación reproducible de la API de usuarios: `npm run verify:admin-users` (`scripts/verify-admin-users-api.mts`) cubre POST disponible y protegido, rechazo de cambio de rol de SUPER_ADMIN y rechazo de auto-desactivación (helpers unitarios + revisión de cableado en las rutas).
- Capturas Playwright escritorio 1440 y móvil 390 × claro/oscuro en `C:\ProgramandoconClaude\Reportes\IPEC\admin-operations-phase-1\` (4 archivos), con componentes reales + datos representativos (BD local placeholder). Se corrigieron `min-width` de tabla en móvil y apilado de acciones en escritorio.

### Pendiente en esta fase

- Aplicar la migración en la BD aislada de demo (`npx prisma migrate deploy`) al momento del despliegue.
- Validación visual autenticada real con datos de la base aislada.
- Desplegar a demo y fusionar a `nextjs-migration` solo tras aprobación.

## Peticiones de oración y contacto pastoral (rama; sin desplegar)

Implementada en `feature/prayer-contact-workflow` según `docs/superpowers/specs/2026-10-13-prayer-contact-workflow-design.md`. Sin desplegar; no crear PR hasta autorización.

### Formulario público (`/api/prayer`)

1. **Dos opciones mutuamente excluyentes:** `PRAYER_ONLY` (solo oración) y `PRAYER_AND_CONTACT` (oración + contacto pastoral).
2. **Consentimiento separado:** `consentToStore` obligatorio en ambas; `consentToContact` obligatorio solo en `PRAYER_AND_CONTACT`.
3. **Opción A:** no pide teléfono, WhatsApp, horario ni contacto. Solo texto + consentimiento.
4. **Opción B:** requiere país, canal (`PHONE`/`WHATSAPP`), teléfono o WhatsApp, zona horaria y franja disponible.
5. **Países con contacto directo:** `US`, `CA`, `MX` ofrecen `PHONE` + `WHATSAPP`; demás países solo `WHATSAPP`.
6. **Validación servidor:** `validatePrayerRequest` en `src/lib/prayer-validation.ts` cubre países, canales, consentimiento, teléfono/WhatsApp, zona horaria y franja.
7. **Localización:** formulario traducido a `en`, `es`, `pt`, `ko`, `de`.

### Disponibilidad de ujieres

1. **Modelo:** `UsherAvailability` con `contactId` vinculado a `MinistryContact`. Migración segura conserva filas legacy.
2. **Candidatos:** solo contactos `active=true`, `authorized=true` con canal apropiado.
3. **Cálculo de franjas:** conversión de zona horaria del ujier a la del visitante.
4. **Sin disponibilidad:** la solicitud se guarda como `PENDING_ASSIGNMENT` sin prometer contacto inmediato.

### Gestión administrativa (`/admin/prayer-requests`)

1. **Cola profesional:** filtros por estado, tipo, país, canal, fecha y disponibilidad; detalle protegido; candidatos sugeridos; asignación manual explícita.
2. **Estados:** `NEW`, `PENDING_ASSIGNMENT`, `ASSIGNED`, `CONTACTED`, `CLOSED` con transiciones validadas.
3. **Permisos:** `SUPER_ADMIN` y `ADMIN` gestionan; `TREASURER` y `USHER` no acceden.
4. **Auditoría:** `PRAYER_REQUEST_CREATED`, `PRAYER_REQUEST_ASSIGNED`, `PRAYER_REQUEST_STATUS_CHANGED`, `PRAYER_REQUEST_EXPORTED`.
5. **Exportación CSV:** endpoint `GET /api/admin/prayer-requests/export` con filtro por tipo y fecha; limitado a peticiones sin contacto si es el filtro seleccionado.
6. **Vista imprimible:** ruta `/admin/prayer-requests/print` con markup optimizado para impresión; sin datos de contacto.

### Notificaciones internas

1. **Preferencias por usuario:** `NotificationPreference` con `newPrayerRequest`, `newContactRequest`, `pendingAssignment`, `assignmentMade`.
2. **Solo panel:** las preferencias controlan avisos internos; no activan Telegram, correo ni WhatsApp.
3. **UI:** sección "Notification preferences" en `/admin/configs` (Settings).

### Límites respetados

- Matriz de permisos intacta (sin roles dinámicos; USHER sin panel).
- Sin guardar IP cruda.
- Sin activar integraciones externas (Telegram, WhatsApp, correo, n8n).
- Paleta navy/verde/lima, iconos Tabler, claro/oscuro y drawer responsive conservados; CSS propio sin Tailwind.

### Verificación de esta fase

- `npm run prisma:generate`, `npm run lint`, `npm run typecheck`, `npm run build` y `git diff --check` pasaron.
- Verificación reproducible: `npm run verify:prayer-contact` (`scripts/verify-prayer-contact.mts`) cubre países/canales, consentimiento separado, validación de teléfono/WhatsApp, zona horaria, transiciones de estado y protección de APIs.
- Pendiente: validación visual autenticada real con datos de la base aislada.

### Pendiente en esta fase

- Aplicar la migración en la BD aislada de demo (`npx prisma migrate deploy`) al momento del despliegue.
- Validación visual autenticada real con datos de la base aislada.
- Desplegar a demo y fusionar a `nextjs-migration` solo tras aprobación.

## Próximas fases, en orden

El diseño operativo aprobado y los límites de cada fase se encuentran en `docs/superpowers/specs/2026-10-13-admin-operations-design.md`. La Fase 1 (Usuarios, Contactos ministeriales y Perfil) está implementada en rama; la siguiente autorizada tras desplegarla es la Fase 2.

1. **Seguridad y acceso:** probar visualmente 2FA, recuperación de contraseña basada en correo institucional cuando SMTP esté autorizado, revocación de sesiones y política de rate limiting.
2. **Contenido:** definir catálogo estable de bloques, editor de formato limitado, traducciones requeridas, borrador/publicación y restauración por revisión. No permitir HTML, CSS o JS arbitrario.
3. **Peticiones de oración:** terminar la vista de gestión, asignación y bitácora; confirmar retención/borrado. Antes de activar el formulario real, implementar disponibilidad por zona horaria y mensaje honesto fuera de horario.
4. **n8n y notificaciones:** tras autorización y credenciales institucionales, emitir evento mínimo después de persistir la solicitud. Telegram solo para IDs autorizados. WhatsApp queda pendiente de número institucional y proveedor.
5. **Donaciones:** integrar primero pagos alojados de PayPal y Square; validar firmas e idempotencia de webhooks. `TREASURER` recibe el mínimo acceso para conciliación.
6. **Revisión de producción:** solo tras aprobación expresa del pastor y una fase separada. No reutilizar el despliegue de demo como autorización.

## Referencias

- Diseño aprobado: `docs/superpowers/specs/2026-10-10-admin-prayer-donations-design.md`.
- Bootstrap inicial: `docs/ADMIN-BOOTSTRAP.md`.
- Estado de la migración: `MIGRATION-CHECKPOINT.md`.
