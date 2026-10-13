"use client";

import Image from "next/image";
import {usePathname} from "next/navigation";

const copyrightYear = 2026;

export function Footer() {
  const pathname = usePathname();
  const path = `/${pathname.split("/").filter(Boolean).join("/")}` || "/";
  if (path === "/admin" || path.startsWith("/admin/")) return null;
  return <footer><Image src="/assets/logo-dark.png" alt="Iglesia Plenitud en Cristo" width={640} height={640} /><p>5000 Spencer St, Las Vegas, NV 89119</p><p>702 328 2536</p><small>© {copyrightYear} Iglesia Plenitud en Cristo</small></footer>;
}
