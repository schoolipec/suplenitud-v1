# Checkpoint de migración Next.js

**Actualizado:** 2026-10-09
**Rama:** `nextjs-migration`
**Remoto:** `schoolipec/suplenitud-v1`

## Verificado

- La maqueta de referencia permanece intacta en `../suPlenitud/` y `main` no fue modificada.
- El nuevo proyecto usa Next.js 16.4, React 19, TypeScript y `next-intl`.
- Los assets y CSS originales se migraron sin alterar a `public/assets/` y `src/styles/legacy/`.
- Existen Home inicial, ruta `/pastors/`, header/footer compartidos, tema persistente, redirects de rutas HTML antiguas, `robots.txt`, `sitemap.xml`, `.env.example` y Dockerfile standalone.
- Las rutas localizadas Home/Pastors, su validación de locale y el selector que conserva la página actual están implementados. La traducción completa del contenido aún está pendiente.
- Existe un esquema Prisma local aislado para mensajes de bendición, analytics y suscriptores; no se creó ninguna base de datos ni se ejecutó una migración.
- Existe el componente cliente del popup de bendición con espera única de 30 segundos y preferencia persistente; todavía falta conectarlo a la fuente PostgreSQL y sus traducciones.
- `npm run lint`, `npm run typecheck` y `npm run build` pasaron después de cada fase.
- No se desplegó ni publicó ningún cambio al VPS, `demo.suplenitud.com`, `suplenitud.com` o `www.suplenitud.com`.

## Pendiente obligatorio

1. Reestructurar las páginas bajo rutas localizadas y completar `next-intl` para `/`, `/es/`, `/pt/`, `/ko/`, `/de/` y sus equivalentes `/pastors/`.
2. Migrar íntegramente los cinco juegos de textos existentes, sin inventar contenido, y conectar selector de idioma conservando la ruta.
3. Completar visualmente Home y Pastors contra la maqueta; aún faltan bloques y controles móviles del HTML original.
4. Crear el esquema Prisma, migraciones y seed seguro para mensajes de bendición, analytics y suscriptores. No crear base de datos ni ejecutar migraciones contra el VPS.
5. Implementar el popup de 30 segundos con mensajes desde PostgreSQL y preferencia localStorage; no usar intervalos.
6. Mantener Prayer Request visible y deshabilitado, con el aviso traducido; no crear endpoint ni éxito simulado.
7. Implementar analytics de datos mínimos y contrato documentado para n8n, sin secretos ni IP cruda.
8. Añadir SEO localizado, pruebas de rutas/legacy/idiomas/popup y revisión visual responsive antes de cualquier despliegue.

## Reglas de continuidad

- Hacer commits pequeños y `git push` tras cada bloque verificado.
- No tocar producción ni el sitio estático de referencia.
- No abrir el archivo restringido indicado por `../AGENTS.md`.
