"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const params = useSearchParams();
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
    if (typeof window !== "undefined" && (window as any).ttq) {
      (window as any).ttq.track("CompletePayment", {
        content_name: "WOLNAA Ticket",
        currency: "EUR",
      });
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center px-6">
      <div className={`max-w-md w-full text-center transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
        
        {/* Logo */}
        <div className="mb-8">
          <div className="w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center mx-auto mb-4">
            <span className="text-black font-black text-2xl">W</span>
          </div>
          <p className="text-zinc-600 text-xs tracking-widest uppercase">Wolnaa · Exclusive Events</p>
        </div>

        {/* Check */}
        <div className="relative mb-8">
          <div className="w-28 h-28 rounded-full bg-green-400/10 border-2 border-green-400/30 flex items-center justify-center mx-auto">
            <svg className="w-12 h-12 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="absolute inset-0 rounded-full bg-green-400/5 blur-2xl" />
        </div>

        <h1 className="text-4xl font-black mb-3 tracking-tight">Zahlung erfolgreich!</h1>
        <p className="text-zinc-400 mb-6 leading-relaxed text-sm">
          Dein Ticket wurde bestätigt. Du erhältst gleich eine E-Mail mit deinem persönlichen QR-Code.
        </p>

        {/* Info Box */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 mb-8 text-left space-y-3">
          {[
            { icon: "📧", text: "Ticket-E-Mail wird gesendet" },
            { icon: "📱", text: "QR-Code beim Einlass vorzeigen" },
            { icon: "🔒", text: "Ticket ist nur einmal gültig" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-zinc-300 text-sm">{item.text}</span>
            </div>
          ))}
        </div>

        <Link href="/" className="inline-block w-full rounded-2xl bg-yellow-400 text-black font-black px-8 py-4 hover:bg-yellow-300 transition-colors text-base mb-3">
          Zurück zur Startseite
        </Link>
        <p className="text-zinc-600 text-xs">🔒 Sichere Zahlung über Stripe</p>
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
