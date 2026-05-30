"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 rounded-full bg-green-400/10 border border-green-400/30 flex items-center justify-center mx-auto mb-8">
          <span className="text-4xl text-green-400">✓</span>
        </div>
        <h1 className="text-4xl font-black mb-3">Zahlung erfolgreich!</h1>
        <p className="text-zinc-400 mb-8 leading-relaxed">
          Dein Ticket wurde bestätigt. Du erhältst in Kürze eine E-Mail mit deinem QR-Code.
        </p>
        <p className="text-zinc-600 text-sm mb-8">
          Bitte zeige den QR-Code beim Einlass vor. Das Ticket ist nur einmal gültig.
        </p>
        <Link
          href="/"
          className="inline-block rounded-2xl bg-yellow-400 text-black font-bold px-8 py-4 hover:bg-yellow-300 transition-colors"
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
