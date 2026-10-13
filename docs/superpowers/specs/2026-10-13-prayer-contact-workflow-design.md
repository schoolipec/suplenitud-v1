# Diseño: peticiones de oración y contacto pastoral

**Fecha:** 2026-10-13
**Estado:** aprobado para implementación
**Entorno:** `demo.suplenitud.com` exclusivamente
**Rama:** `feature/prayer-contact-workflow`

## Propósito

Implementar un flujo completo de peticiones de oración con dos opciones mutuamente excluyentes (solo oración vs. contacto pastoral), disponibilidad de ujieres por zona horaria, cola administrativa profesional con asignación manual, exportación CSV, vista imprimible y notificaciones internas del panel.

## Límites innegociables

- Solo `demo.suplenitud.com`; nunca `suplenitud.com`, `www`, DNS, MailCow, n8n, PayPal, Square ni WhatsApp.
- No activar Telegram, WhatsApp, correo ni llamadas automáticas.
- No abrir el archivo restringido indicado en `../AGENTS.md`.
- No guardar secretos, contraseñas, IDs de bots ni credenciales.
- Mantener roles del panel: `SUPER_ADMIN`, `ADMIN`, `TREASURER`. Ujieres/contactos ministeriales nunca acceden al panel.
- No guardar IP cruda.
- Los ujieres son `MinistryContact`, nunca `User`.

## 1. Formulario público de oración

### Flujo

El formulario actual (`PrayerForm`) se sustituye por un nuevo flujo con dos opciones mutuamente excluyentes:

| Opción | Descripción | Campos adicionales |
|--------|-------------|-------------------|
| **A**  | "Solo deseo que oren por esta petición" | Solo texto de petición + consentimiento almacenamiento |
| **B**  | "Deseo ser contactado por un hermano encargado de oración" | Texto + país + canal + franja + consentimiento almacenamiento + consentimiento contacto |

### Reglas

- **Ambas opciones** requieren consentimiento explícito para almacenar y administrar la petición.
- **Opción A**: NO pide teléfono, WhatsApp, horario ni contacto. Solo texto + consentimiento.
- **Opción B**: requiere consentimiento **separado y explícito** para contacto pastoral.
- Email es opcional en ambas opciones.
- El texto de la petición es obligatorio y claro.
- Localizado para `en`, `es`, `pt`, `ko`, `de`.

### Validación servidor

- `requestType`: `PRAYER_ONLY` | `PRAYER_AND_CONTACT`
- `message`: string 10-2000 chars (obligatorio)
- `consentToStore`: boolean true (obligatorio)
- Si `PRAYER_AND_CONTACT`:
  - `consentToContact`: boolean true (obligatorio, separado)
  - `country`: código ISO 3166-1 alpha-2 (obligatorio)
  - `contactChannel`: `PHONE` | `WHATSAPP` (obligatorio)
  - `phone`: string válido (obligatorio si `PHONE`)
  - `whatsapp`: string válido (obligatorio si `WHATSAPP`)
  - `timeZone`: string IANA válida (obligatorio)
  - `availabilitySlotId`: UUID de franja disponible (obligatorio)

## 2. Contacto pastoral

### Países habilitados

| País | Código | Canales disponibles |
|------|--------|-------------------|
| Estados Unidos | `US` | Llamada directa + WhatsApp |
| Canadá | `CA` | Llamada directa + WhatsApp |
| México | `MX` | Llamada directa + WhatsApp |
| Otro | `*` | Solo WhatsApp |

### Validación

- `country`: código ISO 3166-1 alpha-2 (obligatorio para opción B)
- `contactChannel`: `PHONE` | `WHATSAPP`
- Si `PHONE`: `phone` debe estar presente y ser válido
- Si `WHATSAPP`: `whatsapp` debe estar presente y ser válido
- Formato internacional razonable: `+` seguido de 7-15 dígitos, sin espacios ni guiones
- No bloquear números válidos por formato estricto

### Franja horaria

- El visitante elige una franja disponible (generada desde la disponibilidad de ujieres), no escribe una hora libre.
- Si no hay disponibilidad compatible, la solicitud se guarda como `PENDING_ASSIGNMENT` sin prometer contacto inmediato.

## 3. Disponibilidad de ujieres

### Modelo

`UsherAvailability` se renombra conceptualmente a `MinistryContactAvailability` pero se mantiene la tabla `usher_availability` por compatibilidad. Se vincula a `MinistryContact` por `contactId` en vez de `usherName`.

### Migración segura

- La tabla `usher_availability` existente tiene `usherName` (texto).
- Se añade columna `contactId` UUID nullable.
- Se migra: para cada `usherName` distinto, buscar un `MinistryContact` con ese nombre; si existe, asignar `contactId`.
- Las filas sin contacto coincidente se conservan como legado (no se destruyen).
- Se añade índice en `contactId`.

### Cálculo de franjas

- La disponibilidad del ujier está en su zona horaria (`MinistryContact.timezone`).
- El visitante declara su zona horaria (`timeZone`).
- El servidor convierte la disponibilidad del ujier a la zona horaria del visitante.
- Las franjas se generan en bloques de 30 minutos dentro del rango disponible.

### Candidatos

- Solo contactos `active=true`, `authorized=true` con canal apropiado (`phone` o `whatsapp`).
- Un contacto puede tener múltiples franjas de disponibilidad.
- La franja solicitada debe estar dentro de la disponibilidad del contacto.

## 4. Gestión administrativa

### Cola profesional (`/admin/prayer-requests`)

**Filtros:**
- Estado: `NEW`, `PENDING_ASSIGNMENT`, `ASSIGNED`, `CONTACTED`, `CLOSED`
- Tipo: `PRAYER_ONLY`, `PRAYER_AND_CONTACT`
- País: código ISO
- Canal: `PHONE`, `WHATSAPP`
- Fecha: rango desde/hasta
- Disponibilidad: con/sin franja asignada

**Detalle protegido:**
- Solo `SUPER_ADMIN` y `ADMIN` ven el detalle completo.
- Los datos de contacto (teléfono, WhatsApp) solo se muestran a usuarios autorizados.

**Candidatos sugeridos:**
- Para cada solicitud con franja, mostrar contactos cuya disponibilidad cubre esa franja.
- Ordenados por: coincidencia de idioma, luego por menos asignaciones activas.

**Asignación manual:**
- Un solo contacto por solicitud.
- Acción explícita con confirmación.
- Registra `assignedById`, `assignedAt`.

**Estados:**
| Estado | Transición desde | Significado |
|--------|-----------------|-------------|
| `NEW` | — | Recién creada, sin revisar |
| `PENDING_ASSIGNMENT` | `NEW` | Sin disponibilidad compatible o sin asignar |
| `ASSIGNED` | `NEW`, `PENDING_ASSIGNMENT` | Contacto asignado |
| `CONTACTED` | `ASSIGNED` | Contacto realizado |
| `CLOSED` | cualquier | Finalizada |

**Auditoría:**
- Creación: `PRAYER_REQUEST_CREATED`
- Asignación: `PRAYER_REQUEST_ASSIGNED`
- Cambio de estado: `PRAYER_REQUEST_STATUS_CHANGED`
- Exportación: `PRAYER_REQUEST_EXPORTED`

### Permisos

| Rol | Acceso |
|-----|--------|
| `SUPER_ADMIN` | Todo |
| `ADMIN` | Ver, asignar, cambiar estado, exportar |
| `TREASURER` | Sin acceso |
| `USHER` | Sin acceso (ni siquiera como `User`) |

## 5. Peticiones sin contacto

### Vista separable

- Las peticiones `PRAYER_ONLY` se muestran en una vista/listado separable por fechas.
- Filtro por fecha desde/hasta.

### Exportación CSV

- Endpoint `GET /api/admin/prayer-requests/export?filter=...`
- Genera CSV con columnas: fecha, nombre, email (si existe), mensaje, país, estado.
- **Se limita a peticiones sin contacto** si ese es el filtro seleccionado.
- Registra auditoría `PRAYER_REQUEST_EXPORTED`.

### Vista imprimible

- Ruta `/admin/prayer-requests/print` con markup optimizado para impresión.
- Solo peticiones sin contacto por defecto, filtrable por fecha.
- Sin datos de contacto (teléfono, WhatsApp).
- Incluye fecha de generación y firma "Uso pastoral".

## 6. Notificaciones internas

### Modelo

`NotificationPreference` por `userId`:
- `newPrayerRequest`: boolean (default true)
- `newContactRequest`: boolean (default true)
- `pendingAssignment`: boolean (default true)
- `assignmentMade`: boolean (default true)

### Comportamiento

- Las preferencias solo controlan avisos internos del panel.
- **No** activan Telegram, correo ni WhatsApp.
- Se muestran en `/admin/configs` (Settings) como sección "Notification preferences".
- El admin puede activar/desactivar cada tipo.

### API

- `GET /api/admin/notification-preferences` — obtiene preferencias del usuario actual
- `PATCH /api/admin/notification-preferences` — actualiza preferencias

## 7. Modelo de datos

### Nuevos campos en PrayerRequest

```
requestType        PrayerRequestType  @default(PRAYER_ONLY)
message            String             @db.Text
country            String?           @db.VarChar(2)
contactChannel     String?           @map("contact_contact")
phone              String?
whatsapp           String?
timeZone           String?           @db.VarChar(64)
availabilitySlotId String?           @map("availability_slot_id") @db.Uuid
consentToContact   Boolean            @default(false) @map("consent_to_contact")
```

### PrayerAssignment actualizado

- `usherName` se mantiene por compatibilidad pero se añade `contactId` UUID nullable.
- La asignación se vincula a `MinistryContact` cuando es posible.

### Nuevos modelos

```prisma
enum PrayerRequestType {
  PRAYER_ONLY
  PRAYER_AND_CONTACT
}

enum PrayerRequestStatus {
  NEW
  PENDING_ASSIGNMENT
  ASSIGNED
  CONTACTED
  CLOSED
}

model MinistryContactAvailability {
  id        String   @id @default(uuid()) @db.Uuid
  contactId String   @map("contact_id") @db.Uuid
  weekday   Int
  startTime String   @map("start_time")
  endTime   String   @map("end_time")
  active    Boolean  @default(true)
  contact   MinistryContact @relation(fields: [contactId], references: [id], onDelete: Cascade)

  @@index([contactId, weekday])
  @@map("usher_availability")
}

model NotificationPreference {
  id                   String @id
  userId               String @unique @map("user_id")
  newPrayerRequest     Boolean @default(true) @map("new_prayer_request")
  newContactRequest    Boolean @default(true) @map("new_contact_request")
  pendingAssignment    Boolean @default(true) @map("pending_assignment")
  assignmentMade       Boolean @default(true) @map("assignment_made")
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamptz(6)
  user                 User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("notification_preferences")
}
```

### Auditoría de peticiones

Se extiende `AuditLog` con acciones:
- `PRAYER_REQUEST_CREATED`
- `PRAYER_REQUEST_ASSIGNED`
- `PRAYER_REQUEST_STATUS_CHANGED`
- `PRAYER_REQUEST_EXPORTED`

## 8. Seguridad

- Todas las APIs mutantes validan `hasValidPublicOrigin` + `requireMinistryManager` (SUPER_ADMIN/ADMIN).
- El formulario público tiene rate limiting (máximo 5 peticiones por IP por hora).
- No se guarda IP cruda.
- Los datos de contacto solo se muestran a usuarios autorizados.
- CSRF: las mutaciones admin validan Origin.

## 9. Calidad

### Pruebas

- Script `verify-prayer-contact` en `scripts/verify-prayer-contact.mts`:
  - Validación de países y canales
  - Validación de consentimiento separado
  - Validación de canales requeridos
  - Validación de disponibilidad y conversión de zona horaria
  - Validación de permisos por rol
  - Validación de transiciones de estado

### Verificación

- `npm run prisma:generate`
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- `npm run git diff --check`

### Visual

- Escritorio y móvil (390px)
- Claro y oscuro
- Formulario público con ambas opciones
- Cola admin con filtros y asignación
- Vista imprimible

## 10. Pendiente de autorización

- Activar notificaciones externas (Telegram, correo, WhatsApp)
- Integración con n8n para envío de eventos
- Configuración de SMTP para email
- Cualquier integración de pago
