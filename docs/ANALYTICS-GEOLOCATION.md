# Analítica pública privada y geolocalización opcional

**Alcance:** solo visitas públicas en `/admin/visits`. Publicada únicamente en demo.

## Qué se mide

- Page views y sesiones anónimas (`sessionId` aleatorio por pestaña, sin login).
- Ruta, idioma, tipo de dispositivo, dominio de referrer y fecha.
- País (todas las visitas con origen identificado) y estado/región solo para `US`.

## Qué nunca se guarda

- IP de visitante, hash de IP, ciudad, código postal o cualquier ubicación precisa.
- Datos de usuarios autenticados: las sesiones con cookie de Better Auth no se cuentan.
- Rutas `/admin/*` (con o sin prefijo de idioma), `/api/*`, `/invite/*` y bots conocidos: se descartan en servidor con 204.

## Proveedor GeoLite2/MaxMind (opcional)

- Variable `GEOIP_DATABASE_PATH` apunta a un archivo `GeoLite2-City.mmdb` local.
- La base **no** se descarga en esta rama, **no** va a Git y **no** lleva claves.
- Sin base configurada o con archivo ausente/ilegible, la analítica funciona igual sin país/estado y `/admin/visits` muestra "Geography unavailable: GeoLite2 not configured".
- Futuro en VPS: montar el archivo fuera del repo (p. ej. `/opt/suplenitud-demo/geoip/`) y actualizarlo con una cuenta licenciada de MaxMind; solo hay que fijar la variable y reconstruir.

## Confianza en el proxy

- `GEO_TRUST_PROXY_HEADERS=true` solo detrás de Traefik controlado. En cualquier otro caso un cliente podría falsificar `X-Forwarded-For`.
- Solo se lee la primera entrada de `X-Forwarded-For` y solo si es un literal IP válido.

## Nota operativa de la base demo

- La tabla heredada `analytics_events` pertenecía al rol de n8n. Para que la migración de analítica pudiera ejecutar su DDL en la base aislada, su propiedad se transfirió una sola vez a `suplenitud_app`. No se modificó ninguna tabla ni rol de producción.

## Retención

No hay borrado automático todavía. Definir política aprobada (ventana de retención y purga) antes de activarla; documentarla aquí cuando exista.
