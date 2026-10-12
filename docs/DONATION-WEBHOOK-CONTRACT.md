# Contrato futuro de webhooks de donaciones

PayPal y Square no se conectan hasta que existan cuentas institucionales y secretos guardados exclusivamente en el VPS.

Cada webhook deberá verificar la firma oficial del proveedor antes de registrar una transacción. La referencia externa será única y el procesamiento idempotente. Solo se guardarán proveedor, referencia, importe, moneda, campaña, fecha y estado; nunca tarjetas ni datos bancarios.

Estados permitidos: `PENDING`, `CONFIRMED`, `FAILED`, `REFUNDED`. El navegador no puede confirmar pagos. Tesorería solo consulta y concilia; SuperAdmin conserva la administración de usuarios y configuración.
