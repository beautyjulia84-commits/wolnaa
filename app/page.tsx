"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";

type Ticket = { label: string; price: string; };
type Lounge = { name: string; persons: string; price: string; };
type DiscountCode = { code: string; percent: string; };
type EventItem = {
  title: string; city: string; date: string; time: string;
  location: string; price: string; tickets?: Ticket[];
  imageUrl?: string; description: string; lounges: boolean;
  loungeList?: Lounge[]; discountCodes?: DiscountCode[];
};
type LegalType = "impressum" | "datenschutz" | "agb" | "teilnahme" | "widerruf" | null;

function createEventLink(title: string): string {
  return `/event/${title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "")}`;
}
function getStartingPrice(event: EventItem): string {
  if (event.tickets && event.tickets.length > 0) return event.tickets[0].price;
  return event.price || "0";
}
function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <a href={createEventLink(event.title)} className="group block rounded-[32px] overflow-hidden border border-white/10 bg-gradient-to-b from-zinc-950 to-black hover:border-yellow-400 transition-all duration-300 shadow-2xl hover:shadow-yellow-400/10 hover:-translate-y-1">
      <div className="relative h-56 flex items-center justify-center bg-[radial-gradient(circle_at_top,#2b1b00_0%,#111_38%,#000_100%)] overflow-hidden">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <Image src="/wolnaa-logo.png" alt="WOLNAA" width={230} height={90} className="h-auto w-[190px] object-contain opacity-90" />
        )}
      </div>
      <div className="p-7">
        <p className="text-yellow-400 text-sm font-medium tracking-wide">{event.date}{event.time && ` · ${event.time}`}</p>
        <h3 className="text-2xl font-bold mt-3 leading-tight">{event.title}</h3>
        <p className="text-zinc-400 mt-2 text-sm">{event.city}{event.location && ` · ${event.location}`}</p>
        <div className="mt-5 flex items-center justify-between">
          <p className="text-yellow-400 font-bold text-lg">ab {getStartingPrice(event)} €</p>
          {event.lounges && event.loungeList && event.loungeList.length > 0 && (
            <span className="text-xs text-zinc-400 border border-zinc-700 rounded-full px-3 py-1">VIP Lounges</span>
          )}
        </div>
        <div className="mt-6 w-full rounded-2xl bg-white py-4 text-center text-black text-sm font-bold tracking-wide group-hover:bg-yellow-400 transition-colors duration-200">
          Event öffnen
        </div>
      </div>
    </a>
  );
}

function EmptyState() {
  return (
    <div className="col-span-3 py-24 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-2"><span className="text-2xl">🎉</span></div>
      <p className="text-zinc-400 text-lg">Aktuell sind keine Events geplant.</p>
      <p className="text-zinc-600 text-sm">Schau bald wieder vorbei – neue Events kommen in Kürze!</p>
    </div>
  );
}

function LegalModal({ type, content, onClose }: { type: LegalType; content: string; onClose: () => void; }) {
  const titles: Record<string, string> = {
    impressum: "Impressum", datenschutz: "Datenschutzerklärung",
    agb: "Allgemeine Geschäftsbedingungen", teilnahme: "Teilnahmebedingungen", widerruf: "Widerrufsrecht",
  };
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);
  if (!type) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true">
      <div className="bg-zinc-950 border border-zinc-700 rounded-3xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black">{titles[type]}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-yellow-400 transition-colors text-sm border border-zinc-700 rounded-full px-4 py-1.5">Schließen ✕</button>
        </div>
        {content ? <div className="whitespace-pre-wrap text-zinc-300 leading-7 text-base">{content}</div> : <p className="text-zinc-500 italic">Kein Inhalt hinterlegt.</p>}
      </div>
    </div>
  );
}

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showLegal, setShowLegal] = useState<LegalType>(null);
  const [legalContent, setLegalContent] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedEvents = safeParseJSON<EventItem[]>(localStorage.getItem("wolnaa-events"), []);
    if (savedEvents.length > 0) setEvents(savedEvents);
    setLegalContent({
      impressum: localStorage.getItem("wolnaa-impressum") ?? "",
      datenschutz: localStorage.getItem("wolnaa-datenschutz") ?? "",
      agb: localStorage.getItem("wolnaa-agb") ?? "",
      teilnahme: localStorage.getItem("wolnaa-teilnahme") ?? "",
      widerruf: localStorage.getItem("wolnaa-widerruf") ?? "",
    });
  }, []);

  const closeLegal = useCallback(() => setShowLegal(null), []);

  const legalLinks: [LegalType, string][] = [
    ["impressum", "Impressum"], ["datenschutz", "Datenschutz"],
    ["agb", "AGB"], ["teilnahme", "Teilnahmebedingungen"], ["widerruf", "Widerrufsrecht"],
  ];

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[38vh] flex items-start justify-center pt-10 md:pt-24 px-6 bg-[radial-gradient(circle_at_top,#241600_0%,#080808_42%,#000_100%)]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black" />
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-10">
            <Image src="/wolnaa-logo.png" alt="WOLNAA Logo" width={720} height={240} priority className="w-[300px] md:w-[620px] h-auto object-contain drop-shadow-[0_0_45px_rgba(255,210,80,0.22)]" />
          </div>
          <p className="mt-6 text-zinc-300 text-xl md:text-2xl tracking-wide">
            Exclusive Events&nbsp;•&nbsp;Russische Vibes&nbsp;•&nbsp;Unvergessliche Nächte.
          </p>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="max-w-7xl mx-auto px-6 py-24">
        <p className="text-yellow-400 uppercase tracking-[4px] text-sm mb-3">Upcoming</p>
        <h2 className="text-4xl md:text-6xl font-black mb-12">Kommende Veranstaltungen</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {mounted && events.length === 0 && <EmptyState />}
          {mounted && events.map((event, index) => <EventCard key={`${event.title}-${index}`} event={event} />)}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 pt-8 pb-6 text-center">
        {/* Legal Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-400 mb-4">
          {legalLinks.map(([key, label]) => (
            <button key={key!} onClick={() => setShowLegal(key)} className="hover:text-yellow-400 transition-colors underline-offset-4 hover:underline">
              {label}
            </button>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-zinc-500 text-sm mb-4">© 2026 WOLNAA</p>

        {/* Admin Login */}
        <a href="/admin" className="inline-flex items-center gap-2 text-xs text-zinc-700 hover:text-zinc-500 transition-colors">
          <span>⚙</span> Admin
        </a>
      </footer>

      {showLegal && <LegalModal type={showLegal} content={legalContent[showLegal!] ?? ""} onClose={closeLegal} />}
    </main>
  );
}
