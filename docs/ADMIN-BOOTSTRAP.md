# Bootstrap de SuperAdmin

La autenticación administrativa usa Better Auth, Prisma y PostgreSQL de la aplicación. Esta operación se ejecuta una sola vez, después de aplicar la migración `20261011000000_add_administration_identity` en el entorno elegido.

## Reglas

- Ejecutar solo en el entorno aislado de demo hasta una autorización futura distinta.
- Definir `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `INITIAL_SUPERADMIN_EMAIL`, `INITIAL_SUPERADMIN_PASSWORD` y `ENABLE_INITIAL_SUPERADMIN_BOOTSTRAP=true` únicamente en el almacén de secretos local/VPS.
- El correo aprobado es `jscothserver@gmail.com`; la contraseña temporal debe tener al menos 16 caracteres.
- No pegar valores de secretos en la terminal compartida, documentación ni Git.
- Tras una ejecución correcta, eliminar las variables de bootstrap. La tabla `bootstrap_states` bloquea una segunda ejecución aun si esas variables permanecieran por error.

## Operación

Con los secretos ya cargados de forma segura en el entorno, ejecutar:

```powershell
npm run admin:bootstrap
```

La cuenta queda con rol `SUPER_ADMIN` y el primer acceso debe cambiar la contraseña temporal. La auditoría registra el bootstrap sin almacenar contraseñas.
