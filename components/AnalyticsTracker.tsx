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

    const params = new URLSearchParams(window.location.search);
    if (params.get('utm_source')) referrer = params.get('utm_source')!.slice(0,100);
    else if (params.has('gclid')) referrer = 'Google Ads';
    else if (params.has('fbclid')) referrer = 'Meta (Instagram / Facebook)';
    else if (/instagram/i.test(referrer)) referrer = 'Instagram';
    else if (/google/i.test(referrer)) referrer = 'Google';
    else if (referrer === window.location.hostname) referrer = 'Direkt / unbekannt';
    fetch("/api/runtime/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: pathname,
        referrer,
        device: window.matchMedia("(max-width: 767px)").matches ? "Mobil" : "Desktop",
        newVisit: !visitSent.current,
        attributionConsent: localStorage.getItem('wolnaa-cookie-consent') === 'all',
      }),
      keepalive: true,
    }).catch(() => undefined);
    visitSent.current = true;
    const updateConsent = () => {
      fetch('/api/runtime/sync', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:pathname,referrer,attributionOnly:true,attributionConsent:localStorage.getItem('wolnaa-cookie-consent') === 'all'}),keepalive:true}).catch(() => undefined);
    };
    window.addEventListener('wolnaa-consent-change',updateConsent);
    return () => window.removeEventListener('wolnaa-consent-change',updateConsent);
  }, [pathname]);

  return null;
}
