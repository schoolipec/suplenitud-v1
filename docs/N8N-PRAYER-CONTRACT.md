# Contrato futuro de peticiones de oración

La interfaz actual no envía información: el formulario permanece deshabilitado durante la migración.

Cuando sea autorizado, el flujo será `POST /api/prayer` en Next.js, validación del lado servidor y reenvío a un webhook n8n privado. La URL, autenticación y secreto del webhook nunca se expondrán al navegador ni se versionarán en este repositorio.

El evento podrá generar un correo de confirmación y una alerta para el responsable funcional. Analytics no registrará nombre, correo ni el contenido de la petición.
