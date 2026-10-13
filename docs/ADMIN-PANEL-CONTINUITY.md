# Continuidad del panel administrativo

**Actualizado:** 2026-10-12

**Rama:** `opencode/admin-panel-responsive` (basada en `nextjs-migration`)

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

## Rama opencode/admin-dashboard-visual-refresh (rediseño visual; sin desplegar)

Rediseño exclusivamente visual del panel sobre `origin/nextjs-migration@0af8e6b`, en la rama `opencode/admin-dashboard-visual-refresh`. Lógica, permisos, rutas, 2FA, APIs e integraciones intactos:

1. **Sidebar fija (escritorio):** `AdminNavigation` como columna sticky bajo el header público (78 px), con marca, enlaces + iconos Tabler (`@tabler/icons-react`, única familia) y Sign out anclado abajo. Estado activo con acento lima.
2. **Drawer móvil (390 px):** se reemplaza la franja horizontal por barra móvil sticky (botón de menú + marca + salir) y panel deslizable con overlay. Accesible: `aria-expanded`/`aria-controls`, Escape cierra y devuelve el foco, foco inicial al primer enlace, cierre al navegar. No solapa el header público fijo.
3. **Topbar contextual:** `AdminFrame` envuelve eyebrow + título en `.admin-topbar` sticky bajo el header; contenido en `.admin-workspace-body`.
4. **Tarjetas y tablas:** iconos en tarjetas del dashboard y visits; grid `auto-fit`; estados vacíos con `.admin-empty`; hover sutil en filas de tabla.
5. **Paleta y temas:** variables existentes navy/verde/lima (sin púrpura ni gradientes nuevos); dark mode automático vía `[data-theme="dark"]`; contraste AA (números de tarjeta usan `--ink` para legibilidad en oscuro); `:focus-visible` con anillo lima/verde.
6. **Validación:** lint, typecheck, build y `git diff --check` pasaron. Capturas escritorio/390 px × claro/oscuro (+ drawer abierto) en `C:\ProgramandoconClaude\Reportes\IPEC\admin-visual-refresh\` (18 archivos), generadas con componentes reales + markup representativo (BD local placeholder).

Pendiente: desplegar a demo tras aprobación; validación autenticada real con BD utilizable.

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

## Próximas fases, en orden

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
