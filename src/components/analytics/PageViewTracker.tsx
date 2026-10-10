"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";

const sessionKey = "ipec-analytics-session";
const locales = new Set(["en", "es", "pt", "ko", "de"]);

function referrerDomain() {
  try { return document.referrer ? new URL(document.referrer).hostname : null; } catch { return null; }
}

export function PageViewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    let sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem(sessionKey, sessionId); }
    const firstSegment = pathname.split("/").filter(Boolean)[0];
    const locale = firstSegment && locales.has(firstSegment) ? firstSegment : "en";
    const deviceType = window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop";
    void fetch("/api/analytics/", {method: "POST", headers: {"content-type": "application/json"}, keepalive: true, body: JSON.stringify({sessionId, path: pathname, locale, referrer: referrerDomain(), deviceType})});
  }, [pathname]);
  return null;
}
