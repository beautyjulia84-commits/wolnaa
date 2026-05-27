"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const ticketId = params.get("ticketId");
  const event = params.get("event");
  const name = params.get("name");

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-24 h-24 rounded-full bg-green-400/10 border border-green-400/30 flex items-center justify-center mx-auto mb-8">
          <span className="text-4xl">✓</span>
        </div>

        <h1 className="text-4xl font-black mb-3">Zahlung erfolgreich!</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Hey {name}, dein Ticket für <span className="text-yellow-400 font-semibold">{event}</span> wurde bestätigt.
          Wir haben dir eine E-Mail mit deinem QR-Code geschickt.
        </p>

        <div className="rounded-2xl border border-white/10 bg-zinc-950 px-6 py-5 mb-8 text-left">
          <p className="text-zinc-500 text-xs mb-1">Ticket-ID</p>
          <p className="font-mono text-sm text-yellow-400 break-all">{ticketId}</p>
        </div>

        <p className="text-zinc-600 text-sm mb-8">
          Bitte zeige den QR-Code beim Einlass vor. Das Ticket ist nur einmal gültig.
        </p>

        <Link
          href="/"
          className="inline-block rounded-2xl bg-white text-black font-bold px-8 py-4 hover:bg-yellow-400 transition-colors"
        >
          Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
