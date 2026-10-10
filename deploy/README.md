# Despliegue de demo

Este compose es una preparación versionada: no publica puertos y depende de que Traefik ya enrute `demo.suplenitud.com` al alias interno `suplenitud-demo` en la red `n8n-internal`.

Antes de ejecutarlo en el VPS se requiere completar las validaciones locales y visuales, crear la base y el usuario aislados de la aplicación, aplicar la migración y el seed con un operador autorizado, y reemplazar de forma controlada el contenedor Nginx estático existente. El archivo de entorno real se mantiene únicamente en el VPS y nunca se versiona.

No usar este compose para `suplenitud.com` ni `www.suplenitud.com`.
