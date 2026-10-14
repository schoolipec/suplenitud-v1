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
    const segments = pathname.split("/").filter(Boolean);
    const head = segments[0]?.toLowerCase();
    const inner = head && locales.has(head) && segments.length > 1 ? segments[1].toLowerCase() : head;
    if (inner === "admin" || inner === "api" || inner === "invite") return;
    let sessionId = sessionStorage.getItem(sessionKey);
    if (!sessionId) { sessionId = crypto.randomUUID(); sessionStorage.setItem(sessionKey, sessionId); }
    const firstSegment = pathname.split("/").filter(Boolean)[0];
    const locale = firstSegment && locales.has(firstSegment) ? firstSegment : "en";
    const deviceType = window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop";
    void fetch("/api/analytics/", {method: "POST", headers: {"content-type": "application/json"}, keepalive: true, body: JSON.stringify({sessionId, path: pathname, locale, referrer: referrerDomain(), deviceType})});
  }, [pathname]);
  return null;
}
