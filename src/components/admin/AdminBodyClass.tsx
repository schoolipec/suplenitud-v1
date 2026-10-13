"use client";

import {usePathname} from "next/navigation";
import {useEffect} from "react";

/** Marks admin routes on <body> so the public header offset never applies inside the panel. */
export function AdminBodyClass() {
  const pathname = usePathname();
  useEffect(() => {
    const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");
    document.body.classList.toggle("is-admin", isAdmin);
    return () => {
      document.body.classList.remove("is-admin");
    };
  }, [pathname]);
  return null;
}
