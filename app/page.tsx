"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LegalType = "impressum" | "datenschutz" | "agb" | "teilnahme" | "widerruf" | null;

type EventItem = {
  id: string;
  title: string; city: string; date: string; time: string;
  location: string; address: string; image_url: string; price: string;
  description: string; tickets: any[];
  lounges: boolean; lounge_list: any[]; discount_codes: any[];
};

function createEventLink(title: string): string {
  return `/event/${title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "")}`;
}

function getStartingPrice(event: EventItem): string {
  if (event.tickets && event.tickets.length > 0) return parseFloat(event.tickets[0].price || "0").toFixed(2);
  return parseFloat(event.price || "0").toFixed(2);
}

function EventCard({ event }: { event: EventItem }) {
  return (
    <a href={createEventLink(event.title)} className="group block rounded-[32px] overflow-hidden border border-white/10 bg-gradient-to-b from-zinc-950 to-black hover:border-yellow-400 transition-all duration-300 shadow-2xl hover:shadow-yellow-400/10 hover:-translate-y-1">
      <div className="relative h-56 flex items-center justify-center bg-[radial-gradient(circle_at_top,#2b1b00_0%,#111_38%,#000_100%)] overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105" />
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
          {event.lounges && event.lounge_list?.length > 0 && (
            <span className="text-xs text-zinc-400 border border-zinc-700 rounded-full px-3 py-1">VIP Lounges</span>
          )}
        </div>
        <div className="mt-6 w-full rounded-2xl bg-white py-4 text-center text-black text-sm font-bold tracking-wide group-hover:bg-yellow-400 transition-colors duration-200">Event öffnen</div>
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

function LegalModal({ type, content, onClose }: { type: LegalType; content: string; onClose: () => void }) {
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
      <div className="bg-zinc-950 border border-zinc-700 rounded-3xl p-8 max-w-3xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black">{titles[type]}</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-yellow-400 transition-colors text-sm border border-zinc-700 rounded-full px-4 py-1.5">Schließen ✕</button>
        </div>
        {content ? <div className="whitespace-pre-wrap text-zinc-300 leading-7 text-base">{content}</div> : <p className="text-zinc-500 italic">Kein Inhalt hinterlegt.</p>}
      </div>
    </div>
  );
}


function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('wolnaa-cookie-consent');
    if (!consent) setVisible(true);
  }, []);

  function accept() {
    localStorage.setItem('wolnaa-cookie-consent', 'all');
    setVisible(false);
  }

  function decline() {
    localStorage.setItem('wolnaa-cookie-consent', 'necessary');
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      width: '90%', maxWidth: 560, zIndex: 9999,
      background: '#111', border: '1px solid #333',
      borderRadius: 20, padding: '20px 24px',
      boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      <div>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>🍪 Cookie-Hinweis</p>
        <p style={{ color: '#a1a1aa', fontSize: 13, lineHeight: 1.6 }}>
          Wir verwenden Cookies für den Betrieb der Website. Mit Klick auf "Alle akzeptieren" stimmst du der Nutzung aller Cookies zu.{' '}
          <button onClick={() => {}} style={{ color: '#facc15', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: 0 }}>Datenschutz</button>
        </p>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={accept} style={{
          flex: 1, background: '#facc15', color: '#000',
          border: 'none', borderRadius: 12, padding: '10px 16px',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
        }}>Alle akzeptieren</button>
        <button onClick={decline} style={{
          flex: 1, background: 'transparent', color: '#a1a1aa',
          border: '1px solid #333', borderRadius: 12, padding: '10px 16px',
          fontWeight: 600, fontSize: 14, cursor: 'pointer',
        }}>Nur notwendige</button>
      </div>
    </div>
  );
}

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [showLegal, setShowLegal] = useState<LegalType>(null);
  const [legalContent, setLegalContent] = useState<Record<string, string>>({});

  useEffect(() => {
    setMounted(true);
    loadEvents();
    loadLegal();
  }, []);

  async function loadEvents() {
    const { data, error } = await sb
      .from("events")
      .select("*")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Events laden Fehler:", error);
      setEvents([]);
      return;
    }

    setEvents((data ?? []).map((row: any) => row.data ?? row));
  }

  async function loadLegal() {
    const { data } = await sb.from("legal").select("*");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(r => { map[r.key] = r.content; });
      setLegalContent(map);
    }
  }

  const closeLegal = useCallback(() => setShowLegal(null), []);

  const legalLinks: [LegalType, string][] = [
    ["impressum", "Impressum"], ["datenschutz", "Datenschutz"],
    ["agb", "AGB"], ["teilnahme", "Teilnahmebedingungen"], ["widerruf", "Widerrufsrecht"],
  ];

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <section className="relative min-h-[38vh] flex items-start justify-center pt-10 md:pt-24 px-6 bg-[radial-gradient(circle_at_top,#241600_0%,#080808_42%,#000_100%)]">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/10 to-black" />
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-10">
            <Image src="/wolnaa-logo.png" alt="WOLNAA Logo" width={720} height={240} priority className="w-[300px] md:w-[620px] h-auto object-contain drop-shadow-[0_0_45px_rgba(255,210,80,0.22)]" />
          </div>
          <p className="mt-6 text-zinc-300 text-xl md:text-2xl tracking-wide">
            Exclusive Events&nbsp;•&nbsp;Russische Vibes&nbsp;•&nbsp;Unvergessliche Nächte.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://www.tiktok.com/@wolnaa"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-yellow-400/40 px-5 py-2.5 text-sm font-bold text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors"
            >
              TikTok
            </a>
            <a
              href="https://www.instagram.com/wolnaa"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-yellow-400/40 px-5 py-2.5 text-sm font-bold text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors"
            >
              Instagram
            </a>
          </div>
        </div>
      </section>

      <section id="events" className="max-w-7xl mx-auto px-6 py-24">
        <p className="text-yellow-400 uppercase tracking-[4px] text-sm mb-3">Upcoming</p>
        <h2 className="text-4xl md:text-6xl font-black mb-12">Kommende Veranstaltungen</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {mounted && events.length === 0 && <EmptyState />}
          {mounted && events.map(event => <EventCard key={event.id} event={event} />)}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 text-center">
        <div className="rounded-[32px] border border-white/10 bg-zinc-950/80 px-6 py-10">
          <p className="text-yellow-400 uppercase tracking-[4px] text-xs mb-3">Community</p>
          <h2 className="text-3xl md:text-5xl font-black mb-4">Folge WOLNAA</h2>
          <p className="text-zinc-400 max-w-2xl mx-auto mb-7">
            Exklusive Eventvideos, Ankündigungen und Behind the Scenes findest du auf TikTok und Instagram.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://www.tiktok.com/@wolnaa"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-yellow-400 px-6 py-4 text-sm font-black text-black hover:bg-yellow-300 transition-colors"
            >
              TikTok folgen
            </a>
            <a
              href="https://www.instagram.com/wolnaa"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/15 px-6 py-4 text-sm font-black text-white hover:border-yellow-400 hover:text-yellow-400 transition-colors"
            >
              Instagram folgen
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 pt-8 pb-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-400 mb-4">
          {legalLinks.map(([key, label]) => (
            <button key={key!} onClick={() => setShowLegal(key)} className="hover:text-yellow-400 transition-colors underline-offset-4 hover:underline">{label}</button>
          ))}
        </div>
        <p className="text-zinc-500 text-sm mb-3">© 2026 WOLNAA</p>
        <a href="/admin" className="inline-flex items-center gap-1.5 text-xs text-zinc-700 hover:text-zinc-500 transition-colors">⚙ Admin</a>
      </footer>

      <CookieBanner />
      {showLegal && <LegalModal type={showLegal} content={legalContent[showLegal!] ?? ""} onClose={closeLegal} />}
    </main>
  );
}
