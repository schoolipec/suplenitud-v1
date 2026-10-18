export const adminLocales = ["en", "es"] as const;
export type AdminLocale = (typeof adminLocales)[number];
export const DEFAULT_ADMIN_LOCALE: AdminLocale = "en";
export const ADMIN_LANGUAGE_COOKIE = "ipec-admin-language";

export function resolveAdminLocale(value: string | null | undefined): AdminLocale {
  return adminLocales.includes(value as AdminLocale) ? (value as AdminLocale) : DEFAULT_ADMIN_LOCALE;
}

export function isAdminLocale(value: unknown): value is AdminLocale {
  return typeof value === "string" && (adminLocales as readonly string[]).includes(value);
}

export type AdminMessages = {
  navigation: {
    aria: string;
    groups: {main: string; ministry: string; content: string; system: string};
    overview: string;
    users: string;
    ministryContacts: string;
    visits: string;
    prayerRequests: string;
    ushers: string;
    websiteContent: string;
    donations: string;
    notifications: string;
    settings: string;
  };
  breadcrumbs: {root: string; labels: Record<string, string>};
  userMenu: {
    aria: string;
    profile: string;
    security: string;
    alerts: string;
    language: string;
    signOut: string;
    signingOut: string;
    close: string;
  };
  notifications: {
    title: string;
    empty: string;
    loading: string;
    error: string;
    viewAll: string;
    unread: string;
    bell: string;
  };
  mobile: {openMenu: string; closeMenu: string};
  languageNames: Record<AdminLocale, string>;
  roles: Record<string, string>;
  notificationTypes: Record<string, string>;
};

export const adminMessages: Record<AdminLocale, AdminMessages> = {
  en: {
    navigation: {
      aria: "Administration",
      groups: {main: "Main", ministry: "Ministry and Pastoral", content: "Content and Finance", system: "System and Audit"},
      overview: "Overview",
      users: "Users",
      ministryContacts: "Ministry contacts",
      visits: "Visits",
      prayerRequests: "Prayer requests",
      ushers: "Ushers",
      websiteContent: "Website content",
      donations: "Donations",
      notifications: "Notifications",
      settings: "Settings",
    },
    breadcrumbs: {
      root: "Administration",
      labels: {
        "/admin": "Overview",
        "/admin/users": "Users",
        "/admin/ministry-contacts": "Ministry contacts",
        "/admin/visits": "Visits",
        "/admin/prayer-requests": "Prayer requests",
        "/admin/notifications": "Notifications",
        "/admin/ushers": "Ushers",
        "/admin/usher-availability": "Usher availability",
        "/admin/donations": "Donations",
        "/admin/content": "Website content",
        "/admin/template": "Website content",
        "/admin/configs": "Settings",
        "/admin/security": "Security",
      },
    },
    userMenu: {
      aria: "Account menu",
      profile: "Profile",
      security: "Security and 2FA",
      alerts: "Notifications inbox",
      language: "Language",
      signOut: "Sign out",
      signingOut: "Signing out",
      close: "Close menu",
    },
    notifications: {
      title: "Notifications",
      empty: "No unread notifications.",
      loading: "Loading notifications...",
      error: "Notifications could not be loaded.",
      viewAll: "View all notifications",
      unread: "unread",
      bell: "Notifications",
    },
    mobile: {openMenu: "Open menu", closeMenu: "Close menu"},
    languageNames: {en: "English", es: "Español"},
    roles: {SUPER_ADMIN: "Super admin", ADMIN: "Admin", TREASURER: "Treasurer"},
    notificationTypes: {
      NEW_PRAYER_REQUEST: "New prayer request",
      NEW_CONTACT_REQUEST: "New contact request",
      PENDING_ASSIGNMENT: "Pending assignment",
      ASSIGNMENT_MADE: "Assignment made",
    },
  },
  es: {
    navigation: {
      aria: "Administración",
      groups: {main: "Principal", ministry: "Ministerio y Pastoral", content: "Contenido y Finanzas", system: "Sistema y Auditoría"},
      overview: "Resumen",
      users: "Usuarios",
      ministryContacts: "Contactos de ministerio",
      visits: "Visitas",
      prayerRequests: "Peticiones de oración",
      ushers: "Ujieres",
      websiteContent: "Contenido del sitio",
      donations: "Donaciones",
      notifications: "Notificaciones",
      settings: "Configuración",
    },
    breadcrumbs: {
      root: "Administración",
      labels: {
        "/admin": "Resumen",
        "/admin/users": "Usuarios",
        "/admin/ministry-contacts": "Contactos de ministerio",
        "/admin/visits": "Visitas",
        "/admin/prayer-requests": "Peticiones de oración",
        "/admin/notifications": "Notificaciones",
        "/admin/ushers": "Ujieres",
        "/admin/usher-availability": "Disponibilidad de ujieres",
        "/admin/donations": "Donaciones",
        "/admin/content": "Contenido del sitio",
        "/admin/template": "Contenido del sitio",
        "/admin/configs": "Configuración",
        "/admin/security": "Seguridad",
      },
    },
    userMenu: {
      aria: "Menú de usuario",
      profile: "Perfil",
      security: "Seguridad y 2FA",
      alerts: "Alertas",
      language: "Idioma",
      signOut: "Cerrar sesión",
      signingOut: "Cerrando sesión",
      close: "Cerrar",
    },
    notifications: {
      title: "Notificaciones",
      empty: "No tienes notificaciones sin leer.",
      loading: "Cargando notificaciones...",
      error: "No se pudieron cargar las notificaciones.",
      viewAll: "Ver todas las notificaciones",
      unread: "sin leer",
      bell: "Notificaciones",
    },
    mobile: {openMenu: "Abrir menú", closeMenu: "Cerrar menú"},
    languageNames: {en: "English", es: "Español"},
    roles: {SUPER_ADMIN: "Superadministrador", ADMIN: "Administrador", TREASURER: "Tesorero"},
    notificationTypes: {
      NEW_PRAYER_REQUEST: "Nueva petición de oración",
      NEW_CONTACT_REQUEST: "Nueva solicitud de contacto",
      PENDING_ASSIGNMENT: "Asignación pendiente",
      ASSIGNMENT_MADE: "Asignación realizada",
    },
  },
};

export function adminRoleLabel(messages: AdminMessages, role: string): string {
  return messages.roles[role] ?? role;
}
