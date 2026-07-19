"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const EXCLUDED_PREFIXES = ["/admin", "/veranstalter", "/wolnaa-admin", "/api"];

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const visitSent = useRef(false);

  useEffect(() => {
    if (!pathname || EXCLUDED_PREFIXES.some(prefix => pathname.startsWith(prefix))) return;

    let referrer = "Direkt";
    if (document.referrer) {
      try { referrer = new URL(document.referrer).hostname; }
      catch { referrer = "Unbekannt"; }
    }

    fetch("/api/site-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer,
        device: window.matchMedia("(max-width: 767px)").matches ? "Mobil" : "Desktop",
        newVisit: !visitSent.current,
      }),
      keepalive: true,
    }).catch(() => undefined);
    visitSent.current = true;
  }, [pathname]);

  return null;
}
