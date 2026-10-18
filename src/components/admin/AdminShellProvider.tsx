"use client";

import {createContext, useContext, useMemo, useState, useTransition} from "react";
import {useRouter} from "next/navigation";
import type {ReactNode} from "react";
import {adminMessages, type AdminLocale, type AdminMessages} from "@/i18n/admin-shell";

type AdminShellContextValue = {
  locale: AdminLocale;
  t: AdminMessages;
  switching: boolean;
  setLocale: (next: AdminLocale) => void;
};

const AdminShellContext = createContext<AdminShellContextValue | null>(null);

export function AdminShellProvider({initialLocale, children}: {initialLocale: AdminLocale; children: ReactNode}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<AdminLocale>(initialLocale);
  const [switching, startTransition] = useTransition();

  const value = useMemo<AdminShellContextValue>(() => {
    return {
      locale,
      t: adminMessages[locale],
      switching,
      setLocale: (next) => {
        if (next === locale) return;
        setLocaleState(next);
        startTransition(() => {
          void (async () => {
            try {
              await fetch("/api/admin/language", {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify({locale: next}),
              });
            } finally {
              router.refresh();
            }
          })();
        });
      },
    };
  }, [locale, switching, router]);

  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>;
}

export function useAdminShell(): AdminShellContextValue {
  const context = useContext(AdminShellContext);
  if (!context) throw new Error("useAdminShell must be used within AdminShellProvider");
  return context;
}
