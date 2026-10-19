"use client";

import {useEffect} from "react";
import type {AdminLocale} from "@/i18n/admin-shell";

// Compatibility layer for legacy admin views while their copy is progressively
// moved into the typed catalog. It only replaces known interface strings and
// never touches names, petitions, CMS text, notes, email addresses or IDs.
const spanish: Record<string, string> = {
  "Administration": "Administración", "Settings": "Configuración", "Security": "Seguridad", "Save": "Guardar", "Cancel": "Cancelar", "Close": "Cerrar", "Refresh": "Actualizar", "Refreshing…": "Actualizando…", "Loading…": "Cargando…", "Search": "Buscar", "Actions": "Acciones", "Status": "Estado", "Active": "Activo", "Deactivated": "Desactivado", "Pending": "Pendiente", "Authorized": "Autorizado", "Not configured": "No configurado", "Name": "Nombre", "Email": "Correo", "Phone": "Teléfono", "Ministry": "Ministerio", "Channels": "Canales", "Locale": "Idioma", "Language": "Idioma", "Time zone": "Zona horaria", "Created": "Creado", "Activity": "Actividad", "Detail": "Detalle", "Details": "Detalles", "From": "Desde", "To": "Hasta", "Apply range": "Aplicar rango", "Apply filters": "Aplicar filtros", "All statuses": "Todos los estados", "All states": "Todos los estados", "All providers": "Todos los proveedores", "All ministries": "Todos los ministerios", "Filter by status": "Filtrar por estado", "Filter by provider": "Filtrar por proveedor", "Filter by ministry": "Filtrar por ministerio", "Search contacts": "Buscar contactos", "Search by name, ministry or phone…": "Buscar por nombre, ministerio o teléfono…", "Add contact": "Agregar contacto", "Add ministry contact": "Agregar contacto de ministerio", "Edit": "Editar", "Edit contact": "Editar contacto", "Create contact": "Crear contacto", "Save changes": "Guardar cambios", "Saving…": "Guardando…", "Full name": "Nombre completo", "New ministry…": "Nuevo ministerio…", "New ministry name": "Nombre del nuevo ministerio", "Phone (optional)": "Teléfono (opcional)", "WhatsApp (optional)": "WhatsApp (opcional)", "Telegram ID (optional)": "ID de Telegram (opcional)", "Administrative notes (optional)": "Notas administrativas (opcional)", "Authorized for future ministry communications": "Autorizado para futuras comunicaciones ministeriales", "No channels": "Sin canales", "Deactivate": "Desactivar", "Reactivate": "Reactivar", "Donations": "Donaciones", "Records": "Registros", "Records in filter": "Registros en el filtro", "Latest 100 shown": "Se muestran los últimos 100", "Date": "Fecha", "Reference": "Referencia", "Amount": "Monto", "Provider": "Proveedor", "Campaign": "Campaña", "Fund": "Fondo", "Reconciled": "Conciliado", "Configuration state": "Estado de configuración", "Enabled": "Activado", "Mode": "Modo", "Yes": "Sí", "No": "No", "verified": "verificado", "unverified": "sin verificar", "processed": "procesado", "pending": "pendiente", "Top pages": "Páginas principales", "Top countries": "Países principales", "US states": "Estados de EE. UU.", "Languages": "Idiomas", "Devices": "Dispositivos", "Referrers": "Referencias", "Geography: GeoLite2 active": "Geografía: GeoLite2 activa", "Geography unavailable: GeoLite2 not configured": "Geografía no disponible: GeoLite2 no está configurado", "No public page views in this range.": "No hay vistas públicas en este rango.", "No identified origins in this range.": "No hay orígenes identificados en este rango.", "No US state visits in this range.": "No hay visitas de estados de EE. UU. en este rango.", "No visits in this range.": "No hay visitas en este rango.", "No external referrers in this range.": "No hay referencias externas en este rango.", "Content blocks": "Bloques de contenido", "Published": "Publicado", "Draft": "Borrador", "Complete": "Completo", "Legacy key": "Clave heredada", "Review & publish": "Revisar y publicar", "Save draft": "Guardar borrador", "Draft preview": "Vista previa del borrador", "Published version": "Versión publicada", "Revision history": "Historial de revisiones", "Upload image": "Subir imagen", "Image alternative text": "Texto alternativo de la imagen", "Prayer requests": "Peticiones de oración", "Notifications": "Notificaciones", "Notification preferences": "Preferencias de notificaciones", "Internal alerts": "Alertas internas", "Mark all read": "Marcar todo como leído", "Mark read": "Marcar como leído", "Mark unread": "Marcar como no leído", "No notifications yet.": "Aún no hay notificaciones.", "Two-factor": "Dos factores", "Password": "Contraseña", "Current password": "Contraseña actual", "New password": "Contraseña nueva", "Forgot your password?": "¿Olvidaste tu contraseña?", "Sign in": "Iniciar sesión", "Signing in…": "Iniciando sesión…", "Verify and continue": "Verificar y continuar", "Verifying…": "Verificando…", "Password recovery": "Recuperación de contraseña", "Back to sign in": "Volver a iniciar sesión",
};
const english = Object.fromEntries(Object.entries(spanish).map(([from, to]) => [to, from]));

function replaceText(root: ParentNode, dictionary: Record<string, string>) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const original = node.nodeValue ?? "";
    const trimmed = original.trim();
    const translated = dictionary[trimmed];
    if (!translated) continue;
    node.nodeValue = original.replace(trimmed, translated);
  }
  root.querySelectorAll<HTMLElement>("[placeholder],[title],[aria-label]").forEach((element) => {
    for (const attribute of ["placeholder", "title", "aria-label"] as const) {
      const value = element.getAttribute(attribute);
      if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]);
    }
  });
}

export function AdminLocaleBridge({locale}: {locale: AdminLocale}) {
  useEffect(() => {
    const root = document.querySelector("main.admin-shell, .admin-frame") ?? document.body;
    const dictionary = locale === "es" ? spanish : english;
    const apply = () => replaceText(root, dictionary);
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, {childList: true, subtree: true, characterData: true});
    return () => observer.disconnect();
  }, [locale]);
  return null;
}
