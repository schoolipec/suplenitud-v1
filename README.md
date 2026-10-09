# suPlenitud Next.js

Copia de trabajo de la migracion de la maqueta estatica `../suPlenitud/` a Next.js. La rama `nextjs-migration` se mantiene separada de `main`, que conserva la v1.

## Base tecnica

- Next.js 16 con App Router y TypeScript.
- React 19.
- `next-intl` para el routing y contenido localizado que se implementaran en las fases posteriores.
- CSS propio; no se utiliza Tailwind.

## Comandos locales

```powershell
npm run dev
npm run lint
npm run typecheck
npm run build
```

El dominio de produccion `suplenitud.com` no forma parte de este trabajo. Cualquier despliegue futuro se validara primero en `demo.suplenitud.com` y requerira una autorizacion separada.

Las reglas y el orden de migracion estan en `AGENTS.md` y `../IPEC-NEXTJS-CODEX-MAESTRO.md`.
