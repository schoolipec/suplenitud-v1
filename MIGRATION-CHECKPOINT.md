# Checkpoint de migración Next.js

**Actualizado:** 2026-10-16
**Rama:** `nextjs-migration` (incluye `3c7b60e`)
**Remoto:** `schoolipec/suplenitud-v1`

## Verificado

- La maqueta de referencia permanece intacta en `../suPlenitud/` y `main` no fue modificada.
- El nuevo proyecto usa Next.js 16.4, React 19, TypeScript y `next-intl`.
- Los assets y CSS originales se migraron sin alterar a `public/assets/` y `src/styles/legacy/`.
- Existen Home inicial, ruta `/pastors/`, header/footer compartidos, tema persistente, redirects de rutas HTML antiguas, `robots.txt`, `sitemap.xml`, `.env.example` y Dockerfile standalone.
- Home y Pastors reutilizan una sola plantilla por página y sirven los cinco juegos de textos existentes en `en`, `es`, `pt`, `ko` y `de`; el selector conserva la ruta actual y recuerda la selección manual en una cookie.
- Existe un esquema Prisma aislado, la migración SQL inicial y un seed SQL idempotente con el mensaje inicial en los cinco idiomas; no se creó ninguna base de datos ni se ejecutó una migración.
- El popup de bendición consulta PostgreSQL después de 30 segundos, se muestra una vez por sesión y respeta la preferencia persistente. Si la base aún no está preparada, no se muestra ni expone un error al visitante.
- `npm run lint`, `npm run typecheck` y `npm run build` pasaron tras el cierre de código. Las diez rutas canónicas y ambos redirects legacy fueron verificados localmente con respuestas correctas.
- Existe `deploy/docker-compose.demo.yml` para sustituir únicamente el Nginx de la demo por el contenedor Next.js detrás de Traefik, sin exponer el puerto 3000 ni afectar producción.
- La demo Next.js está publicada en `https://demo.suplenitud.com/` detrás de Traefik. El contenedor escucha solo internamente en 3000 y usa la base aislada `suplenitud_web`; `suplenitud.com` y `www.suplenitud.com` no fueron modificados.

## Pendiente obligatorio

1. Mantener las credenciales de la base aislada exclusivamente en el archivo de entorno del VPS; no versionarlas ni reutilizarlas.
2. Para cambios futuros, construir y validar localmente antes de actualizar solo la demo. La producción requiere una fase y autorización independientes.
3. La evolución aprobada de administración, contenido, peticiones, Telegram/n8n y donaciones está especificada en `docs/superpowers/specs/2026-10-10-admin-prayer-donations-design.md` y su plan de fases. No activar el formulario ni integraciones externas antes de completar sus fases verificadas.
4. La entrada pública de peticiones de oración está pausada temporalmente en demo: `PRAYER_REQUESTS_PUBLIC_ENABLED=false` oculta el CTA y formulario, y las APIs públicas relacionadas responden `404`. El panel, los datos existentes y los planes de n8n no cambian. Para reactivarla se requiere aprobar el nuevo flujo KISS, cambiar la variable a `true` y reconstruir el contenedor de demo.
5. La Fase A está publicada en demo: Better Auth, identidad/roles/auditoría, `/admin`, bootstrap único y cambio obligatorio de contraseña. El selector de idioma no aparece en administración; las rutas administrativas con prefijo de idioma redirigen a su ruta canónica sin prefijo.
6. El bloque TOTP de dos factores está publicado en demo con la migración `20261012020000_add_two_factor` y las rutas `/admin/security` y `/admin/two-factor`. La inscripción es voluntaria y no se deben documentar sus secretos ni códigos de recuperación.
7. Los modelos y rutas de contenido, peticiones, disponibilidad y donaciones permanecen en alcance por fases; las integraciones externas requieren secretos y cuentas institucionales. Consultar `docs/ADMIN-PANEL-CONTINUITY.md` antes de continuar.
8. La base responsive del panel está integrada en `nextjs-migration` (hasta `3690274`, incluye permisos por rol, sign out y rediseño visual). La Fase 1 de operaciones está en la rama `feature/admin-operations-phase-1` (sin desplegar): usuarios con activar/desactivar (`User.active` + revocación de sesiones + hook de sesión), editar nombre/rol, forzar cambio de contraseña y auditoría; `POST /api/admin/users` restaurado con `active: true` y `mustChangePassword: true`; el servidor rechaza cambios de rol de cuentas `SUPER_ADMIN` (`cannot_change_super_admin_role`); contactos ministeriales (`MinistryContact`, migración `20261013100000_add_ministry_contacts_and_user_activation`, ruta `/admin/ministry-contacts` para SUPER_ADMIN/ADMIN, catálogo de ministerios con alta confirmada, sin DELETE físico); perfil `/admin/configs` como ficha con edición explícita por sección; `PATCH /api/admin/profile` con ediciones parciales; verificación `npm run verify:admin-users`. Matriz de permisos intacta. Validación local completa y capturas en `C:\ProgramandoconClaude\Reportes\IPEC\admin-operations-phase-1\`. Detalle en `docs/ADMIN-PANEL-CONTINUITY.md`.

## Reglas de continuidad

- Hacer commits pequeños y `git push` tras cada bloque verificado.
- No tocar producción ni el sitio estático de referencia.
- No abrir el archivo restringido indicado por `../AGENTS.md`.
