# Contrato futuro de peticiones de oración

> El diseño y la secuencia aprobados para esta integración viven en `superpowers/specs/2026-10-10-admin-prayer-donations-design.md` y `superpowers/plans/2026-10-10-admin-prayer-donations-plan.md`. Este contrato no autoriza todavía activar el formulario ni n8n.

La interfaz actual no envía información: el formulario permanece deshabilitado durante la migración.

Cuando sea autorizado, el flujo será `POST /api/prayer` en Next.js, validación del lado servidor y reenvío a un webhook n8n privado. La URL, autenticación y secreto del webhook nunca se expondrán al navegador ni se versionarán en este repositorio.

El evento podrá generar una confirmación de recepción y una alerta Telegram para responsables disponibles con IDs autorizados. Los ujieres no tendrán acceso al panel. Analytics no registrará nombre, teléfono/WhatsApp, correo ni contenido de la petición.
