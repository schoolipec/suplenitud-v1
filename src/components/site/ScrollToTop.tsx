"use client";

import {useEffect, useState} from "react";
import {usePathname} from "next/navigation";

export function ScrollToTop() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 480);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, {passive: true});
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const path = `/${pathname.split("/").filter(Boolean).join("/")}` || "/";
  if (path === "/admin" || path.startsWith("/admin/")) return null;
  if (!visible) return null;
  return <button className="scroll-to-top" type="button" onClick={() => window.scrollTo({top: 0, behavior: "smooth"})} aria-label="Back to top">↑</button>;
}
