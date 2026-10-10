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
- La demo Next.js está publicada en `https://demo.suplenitud.com/` detrás de Traefik. El contenedor escucha solo internamente en 3000 y usa la base aislada `suplenitud_web`; `suplenitud.com` y `www.suplenitud.com` no fueron modificados.

## Pendiente obligatorio

1. Mantener las credenciales de la base aislada exclusivamente en el archivo de entorno del VPS; no versionarlas ni reutilizarlas.
2. Para cambios futuros, construir y validar localmente antes de actualizar solo la demo. La producción requiere una fase y autorización independientes.

## Reglas de continuidad

- Hacer commits pequeños y `git push` tras cada bloque verificado.
- No tocar producción ni el sitio estático de referencia.
- No abrir el archivo restringido indicado por `../AGENTS.md`.
