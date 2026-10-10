# suPlenitud Next.js

Copia de trabajo de la migracion de la maqueta estatica `../suPlenitud/` a Next.js. La rama `nextjs-migration` se mantiene separada de `main`, que conserva la v1.

## Base tecnica

- Next.js 16 con App Router y TypeScript.
- React 19.
- `next-intl` para routing localizado: English canónico en `/` y `es`, `pt`, `ko`, `de` con prefijo.
- CSS propio; no se utiliza Tailwind.
- Prisma y PostgreSQL aislado para mensajes de bendición, analytics y futuras suscripciones. Nunca reutilizar la base o las credenciales de n8n.

## Comandos locales

```powershell
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Base de datos de la aplicación

`prisma/migrations/` contiene la migración inicial y `prisma/seed.sql` contiene un seed idempotente del primer mensaje de bendición en los cinco idiomas. Ambos se aplican manualmente, únicamente contra la base aislada `suplenitud_web` después de crear sus credenciales fuera del repositorio. No se ejecutan automáticamente al construir la imagen ni contra producción.

Las variables requeridas están documentadas en `.env.example`; no copies secretos al repositorio.

El dominio de produccion `suplenitud.com` no forma parte de este trabajo. La única publicación autorizable durante la migración es `demo.suplenitud.com`, tras las verificaciones locales y visuales completas.

Las reglas y el orden de migracion estan en `AGENTS.md` y `../IPEC-NEXTJS-CODEX-MAESTRO.md`.
