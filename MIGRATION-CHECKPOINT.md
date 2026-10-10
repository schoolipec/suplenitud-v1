# Checkpoint de migración Next.js

**Actualizado:** 2026-10-10
**Rama:** `nextjs-migration`
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
- No se desplegó ni publicó ningún cambio al VPS, `demo.suplenitud.com`, `suplenitud.com` o `www.suplenitud.com`.

## Pendiente obligatorio

1. Ejecutar la migración y el seed únicamente en la nueva base/usuario aislados de la demo; no usar la base ni las credenciales de n8n.
2. Completar la revisión visual responsive y el flujo popup conectado a la base preparada.
3. Sustituir controladamente el contenedor Nginx de `demo.suplenitud.com`, validar HTTPS/rutas/SEO/popup/analytics y dejar intactos `suplenitud.com` y `www.suplenitud.com`.

## Reglas de continuidad

- Hacer commits pequeños y `git push` tras cada bloque verificado.
- No tocar producción ni el sitio estático de referencia.
- No abrir el archivo restringido indicado por `../AGENTS.md`.
