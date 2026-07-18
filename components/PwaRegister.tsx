"use client";

import { useEffect } from "react";

export default function PwaRegister({ worker, scope }: { worker: string; scope: string }) {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(worker, { scope }).catch(() => {
      // Die Website bleibt auch dann vollständig nutzbar, wenn Registrierung blockiert ist.
    });
  }, [scope, worker]);

  return null;
}
