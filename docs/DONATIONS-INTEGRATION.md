# Integración de ofrendas (checkout hospedado PayPal / Square)

**Estado:** solo base, totalmente inactiva. No existen credenciales, no se crean cobros, nada desplegado.

## Arquitectura

- El flujo futuro de dinero es checkout hospedado: la app nunca captura ni almacena tarjetas. La app crea la intención de orden (cuando esté habilitada), el donante paga en PayPal/Square, y la app conoce el resultado por webhooks verificados o por consulta oficial posterior.
- `src/lib/payments/config.ts` lee las variables `PAYMENTS_*` en servidor y expone solo etiquetas de estado (`disabled`, `missing_credentials`, `sandbox_ready`, `live_ready`). Los secretos nunca llegan al cliente ni al panel.
- `src/lib/payments/providers.ts` es la interfaz común `PaymentProvider`. Los adaptadores permanecen inactivos sin `PAYMENTS_ENABLED=true` más credenciales completas; nunca inventan URLs de aprobación.
- `src/lib/payments/state.ts` contiene el ciclo de vida (`PENDING → APPROVED → COMPLETED`, más `FAILED`, `CANCELLED`, `REFUNDED`; `CONFIRMED` heredado), los mapeos de eventos por proveedor, la verificación HMAC de Square y la regla de idempotencia.
- Rutas públicas: `POST /api/donations/checkout` responde 503 desactivado/incompleto y 501 configurado-pero-no-implementado. Ningún callback de navegador puede marcar pagos como completados, por diseño no existe esa ruta.
- Webhooks: `POST /api/webhooks/paypal` (rechaza 503 sin credenciales; la verificación PayPal exige llamada API en vivo), `POST /api/webhooks/square` (HMAC verificado sobre el cuerpo crudo antes de escribir; 401 con firma inválida; libro idempotente `UNIQUE(provider, external_id)`; solo transiciones válidas; auditoría mínima; sin correos ni envíos externos).
- `Donation` lleva proveedor, importe, moneda, campaña, fondo opcional, estado, referencia externa y `reconciledAt`. `DonationWebhookEvent` registra cada evento con estado de verificación/procesamiento.

## Qué falta recibir de la iglesia

Primero sandbox y después producción. Nada de esto requiere cambios de código, solo credenciales y configuración:

### Sandbox
1. Cuenta de desarrollador PayPal con cuenta sandbox de negocio.
2. App REST sandbox: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`.
3. Webhook sandbox suscrito a eventos de checkout/órdenes y capturas, apuntando a `https://demo.suplenitud.com/api/webhooks/paypal`: `PAYPAL_WEBHOOK_ID`.
4. Cuenta de desarrollador Square con ubicación sandbox de prueba.
5. Aplicación sandbox: `SQUARE_APPLICATION_ID`, `SQUARE_LOCATION_ID`, `SQUARE_ACCESS_TOKEN`.
6. Suscripción webhook sandbox para pagos/reembolsos apuntando a `https://demo.suplenitud.com/api/webhooks/square`: `SQUARE_WEBHOOK_SIGNATURE_KEY`.

### Producción
1. Los mismos seis valores PayPal desde una app REST en vivo más el webhook id en vivo.
2. Los mismos cinco valores Square desde la aplicación y ubicación de producción más la clave de firma en vivo.
3. `PAYMENTS_MODE=live` (el default es `sandbox`) y `PAYMENTS_ENABLED=true`, solo en el `.env` del VPS.

## Configuración posterior de webhooks

- Registrar las URLs públicas exactas de arriba en cada panel de proveedor; ambas deben ser alcanzables por HTTPS sin restricciones de IP que bloqueen al proveedor.
- Tras registrar, enviar un evento sandbox por proveedor y confirmar que aparece en `/admin/donations` como verificado y procesado.

## Procedimiento seguro de activación

1. Colocar las credenciales sandbox en el `.env` del VPS (nunca en Git).
2. Fijar `PAYMENTS_ENABLED=true` manteniendo `PAYMENTS_MODE=sandbox`.
3. Reconstruir y reiniciar solo el contenedor demo; confirmar que el panel muestra `sandbox_ready` por proveedor.
4. Ejecutar un pago sandbox por proveedor de extremo a extremo y conciliarlo en el panel.
5. Repetir con credenciales de producción y `PAYMENTS_MODE=live` solo tras aprobación explícita.

## Rollback

- Fijar `PAYMENTS_ENABLED=false` y reiniciar el contenedor demo. Checkout y webhooks responden 503 de inmediato; los registros y el libro de webhooks quedan intactos y auditables.

## Límites actuales

- No existe interfaz pública de ofrendas; nada se muestra a los visitantes.
- No hay llamadas reales implementadas; los adaptadores configurados responden 501 hasta que lleguen las llamadas de checkout hospedado.
- Sin purga automática de retención; sin correos ni avisos de ningún tipo.
- Tener Square POS **no** confirma que exista una aplicación de desarrollador ni las credenciales requeridas: POS es el producto de punto de venta, mientras las credenciales salen del panel de desarrollador Square (aplicación, ubicación, token de acceso, clave de firma de webhook). Debe obtenerse por separado.
