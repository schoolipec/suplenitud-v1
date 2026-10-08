# suPlenitud - Sitio Web De La Iglesia

Proyecto reservado para el futuro sitio web de la iglesia en `suplenitud.com`.

## Estado

El sitio esta publicado para revision en `https://demo.suplenitud.com` desde el 2026-10-08. El dominio principal `suplenitud.com` no fue modificado.

- El directorio de publicacion del VPS es `/opt/suplenitud-demo/site`.
- Un contenedor Nginx exclusivo sirve ese directorio mediante Traefik; no publica puertos propios.
- Traefik administra un certificado Let's Encrypt individual para `demo.suplenitud.com` y redirige HTTP a HTTPS.
- La pagina principal y la ruta `pastors/` responden `HTTPS 200` con certificado valido.
- Actualmente el dominio principal conserva MyWebsite NOW de IONOS; no cambiar A/AAAA de `@` o `www` sin un plan de migracion aprobado.

La maqueta local incluye inicio, contacto con mapa, formulario de oracion, selector de idioma (ingles, espanol, portugues, coreano y aleman), tema claro/oscuro y la ruta local `/pastors/`. Esta ultima resume la trayectoria pastoral de Mario y Adriana Alsina con referencias publicas a Global Harvest Theological Institute. Tambien reserva una seccion de Instagram: por ahora enlaza al perfil publico de Global Harvest Online; no consume ni replica publicaciones hasta definir una integracion autorizada.

## Ejecucion local

El sitio es estatico y se puede previsualizar desde esta carpeta con:

```powershell
py -m http.server 4173
```

Abrir `http://127.0.0.1:4173/`. La historia pastoral esta disponible en `/pastors/`.

## Proxima Revision

Revisar visualmente la demo antes de programar cualquier migracion a `suplenitud.com`. Las futuras publicaciones deben sincronizar recursivamente esta carpeta hacia `/opt/suplenitud-demo/site`, excluir documentacion y secretos, y conservar `suplenitud.com` sin cambios hasta una autorizacion de migracion separada.
