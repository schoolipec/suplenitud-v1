# Diseño: pausa temporal de peticiones públicas de oración

## Objetivo

Pausar de forma reversible el ingreso público de peticiones de oración mientras se redefine un flujo KISS. No se eliminan datos, herramientas administrativas ni contratos futuros de integración.

## Comportamiento aprobado

1. El Home conserva la sección de contacto físico y direcciones, pero no muestra `PrayerForm`.
2. Se elimina el CTA público de oración del hero; los demás enlaces públicos permanecen.
3. `POST /api/prayer` devuelve `404` cuando la función está pausada y no persiste datos, crea auditoría ni notificaciones.
4. La pausa se controla mediante `PRAYER_REQUESTS_PUBLIC_ENABLED`; su valor por defecto es apagado y solo `true` vuelve a habilitar el flujo.
5. Panel administrativo, registros existentes, APIs administrativas, contactos ministeriales, n8n y los planes de integración no cambian.

## Límites

- No se elimina `PrayerForm`, el modelo de Prisma ni ninguna solicitud existente.
- No se muestra aviso público alternativo durante la pausa.
- No se cambia producción; cualquier publicación posterior será exclusivamente en `demo.suplenitud.com` con validación.

## Verificación

- Home y locales no contienen formulario ni CTA de oración.
- `POST /api/prayer` devuelve `404` y la base no cambia.
- Rutas administrativas de peticiones siguen disponibles para una sesión autorizada.
- Lint, typecheck, build y `git diff --check` pasan.
