"use client";

import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type LegalType = "impressum" | "datenschutz" | "agb" | "teilnahme" | "widerruf" | null;

const I18N = {
  de: {
    navEvents: "Events",
    navContact: "Kontakt",
    heroText: "Erlebe exklusive Events mit authentischen russischen Vibes und genieße unvergessliche Nächte voller Musik, guter Stimmung und einzigartiger Momente.",
    buyTickets: "Tickets kaufen",
    discoverEvents: "Events entdecken",
    from: "ab",
    openEvent: "Event öffnen",
    nextEvent: "Nächstes Event",
    viewTickets: "Tickets ansehen",
    noEventsTitle: "Neue Events kommen bald!",
    noEventsText: "Aktuell sind keine Events geplant. Folge uns auf Instagram um als Erstes von neuen Events zu erfahren!",
    followInstagram: "Instagram folgen",
    notification: "Benachrichtigung",
    aboutEyebrow: "WOLNAA",
    aboutTitle: "Events mit Gefühl, Energie und echten Momenten.",
    aboutText1: "Wolnaa steht für exklusive Nächte, authentische russische Vibes und eine Atmosphäre, die Menschen verbindet.",
    aboutText2: "Unsere Events bringen Musik, gute Stimmung und besondere Locations zusammen, damit aus einem Abend ein Erlebnis wird.",
    upcoming: "Upcoming",
    upcomingTitle: "Kommende Veranstaltungen",
    moments: "Moments",
    momentsTitle: "Nächte, die bleiben.",
    momentsText: "Eindrücke, Musik und Atmosphäre aus der Wolnaa Community.",
    community: "Community",
    followTitle: "Folge WOLNAA",
    followText: "Exklusive Eventvideos, Ankündigungen und Behind the Scenes auf TikTok und Instagram.",
    tiktokFollow: "TikTok folgen",
    faqTitle: "Häufige Fragen",
    contact: "Kontakt",
    contactTitle: "Schreib uns",
    contactText: "Fragen zu Tickets, Lounges oder Kooperationen? Wir antworten schnell!",
    today: "Heute!",
    tomorrow: "Morgen!",
    daysLeft: "Noch {days} Tage",
    faq: [
      { q: "Wie alt muss ich sein?", a: "Unsere Events sind ausschließlich für Personen ab 18 Jahren. Ein gültiger Ausweis wird beim Einlass kontrolliert." },
      { q: "Wie erhalte ich mein Ticket?", a: "Nach erfolgreicher Zahlung erhältst du dein Ticket mit QR-Code sofort per E-Mail." },
      { q: "Gibt es Lounges?", a: "Bei ausgewählten Events bieten wir exklusive VIP Lounges an. Die Verfügbarkeit siehst du direkt auf der Event-Seite." },
      { q: "Wo kann ich parken?", a: "Parkmöglichkeiten findest du in der Nähe des Veranstaltungsortes. Die genaue Adresse ist auf der Event-Seite verlinkt." },
    ],
  },
  ru: {
    navEvents: "События",
    navContact: "Контакты",
    heroText: "Открой для себя эксклюзивные события с настоящей русской атмосферой и незабываемые ночи с музыкой, настроением и особенными моментами.",
    buyTickets: "Купить билеты",
    discoverEvents: "Смотреть события",
    from: "от",
    openEvent: "Открыть событие",
    nextEvent: "Ближайшее событие",
    viewTickets: "Смотреть билеты",
    noEventsTitle: "Новые события скоро!",
    noEventsText: "Сейчас нет запланированных событий. Подпишись на Instagram, чтобы узнать о новых событиях первым.",
    followInstagram: "Подписаться в Instagram",
    notification: "Уведомление",
    aboutEyebrow: "WOLNAA",
    aboutTitle: "События с эмоцией, энергией и настоящими моментами.",
    aboutText1: "Wolnaa — это эксклюзивные ночи, настоящие русские вайбы и атмосфера, которая объединяет людей.",
    aboutText2: "Мы соединяем музыку, хорошее настроение и особенные локации, чтобы вечер стал настоящим событием.",
    upcoming: "Скоро",
    upcomingTitle: "Ближайшие события",
    moments: "Моменты",
    momentsTitle: "Ночи, которые остаются в памяти.",
    momentsText: "Впечатления, музыка и атмосфера сообщества Wolnaa.",
    community: "Сообщество",
    followTitle: "Следи за WOLNAA",
    followText: "Эксклюзивные видео, анонсы и закулисье в TikTok и Instagram.",
    tiktokFollow: "Подписаться в TikTok",
    faqTitle: "Частые вопросы",
    contact: "Контакты",
    contactTitle: "Напиши нам",
    contactText: "Вопросы о билетах, lounge или сотрудничестве? Мы быстро ответим!",
    today: "Сегодня!",
    tomorrow: "Завтра!",
    daysLeft: "Осталось {days} дн.",
    faq: [
      { q: "С какого возраста можно прийти?", a: "Наши события только для гостей от 18 лет. На входе проверяется действительный документ." },
      { q: "Как я получу билет?", a: "После успешной оплаты билет с QR-кодом сразу приходит на e-mail." },
      { q: "Есть ли lounge?", a: "На выбранных событиях доступны эксклюзивные VIP lounge. Доступность указана на странице события." },
      { q: "Где можно припарковаться?", a: "Парковки находятся рядом с локацией. Точный адрес указан на странице события." },
    ],
  },
} as const;

type Lang = keyof typeof I18N;


type EventItem = {
  id: string;
  title: string; city: string; date: string; time: string;
  location: string; address: string; image_url: string; price: string;
  description: string; tickets: any[];
  lounges: boolean; lounge_list: any[]; discount_codes: any[];
};

function createEventLink(event: EventItem): string {
  return `/event/${(event as any).slug || event.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "")}`;
}

function calcCountdown(d: string, lang: Lang = 'de') {
  if (!d) return null;
  const diff = new Date(d + "T00:00:00").getTime() - new Date().getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  const t = I18N[lang];
  if (days === 0) return t.today;
  if (days === 1) return t.tomorrow;
  return t.daysLeft.replace('{days}', String(days));
}

function formatDate(d: string, lang: Lang = 'de') {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(lang === "ru" ? "ru-RU" : "de-DE", {
      weekday: "short", day: "numeric", month: "long", year: "numeric"
    });
  } catch { return d; }
}

function getStartingPrice(event: EventItem): string {
  if (event.tickets && event.tickets.length > 0) return parseFloat(event.tickets[0].price || "0").toFixed(2);
  return parseFloat(event.price || "0").toFixed(2);
}

function EventCard({ event, lang }: { event: EventItem; lang: Lang }) {
  const t = I18N[lang];
  const [tapped, setTapped] = useState(false);
  function handleTouch() {
    setTapped(true);
    setTimeout(() => setTapped(false), 600);
  }
  return (
    <a href={createEventLink(event)} onTouchStart={handleTouch} className={`group block rounded-3xl overflow-hidden border transition-all duration-300 shadow-2xl hover:-translate-y-2 ${tapped ? "border-[#d6b36a] shadow-[0_0_30px_rgba(214,179,106,0.28)] scale-95" : "border-white/10 hover:border-[#d6b36a] hover:shadow-[0_0_30px_rgba(214,179,106,0.28)]"} bg-gradient-to-b from-zinc-950 to-black`}>
      <div className="relative h-56 flex items-center justify-center bg-[radial-gradient(circle_at_top,#2b1b00_0%,#111_38%,#000_100%)] overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-56 object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" decoding="async" />
        ) : (
          <Image src="/wolnaa-logo.png" alt="WOLNAA" width={230} height={90} className="h-auto w-[190px] object-contain opacity-90" />
        )}
      </div>
      <div className="p-7">
        <div className="flex items-center justify-between">
          <p className="text-[#d6b36a] text-sm font-medium tracking-wide">{formatDate(event.date, lang)}{event.time && ` · ${event.time}`}</p>
          {calcCountdown(event.date, lang) && <span className="bg-[#d6b36a] text-black text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">{calcCountdown(event.date, lang)}</span>}
        </div>
        <h3 className="text-2xl font-bold mt-3 leading-tight">{event.title}</h3>
        <p className="text-zinc-400 mt-2 text-sm">{event.city}{event.location && ` · ${event.location}`}</p>
        <div className="mt-5 flex items-center justify-between">
          <div>
            <p className="text-[#d6b36a] font-bold text-lg">{t.from} {getStartingPrice(event)} €</p>
            <p className="mt-1 text-[11px] text-zinc-500">inkl. 19% MwSt.</p>
          </div>
          {event.lounges && event.lounge_list?.length > 0 && (
            <span className="text-xs text-zinc-400 border border-zinc-700 rounded-full px-3 py-1">Lounge</span>
          )}
        </div>
        <div className="mt-6 w-full rounded-2xl bg-white py-4 text-center text-black text-sm font-bold tracking-wide group-hover:bg-[#d6b36a] group-active:bg-[#d6b36a] transition-colors duration-200">{t.openEvent}</div>
      </div>
    </a>
  );
}

function EmptyState({ lang }: { lang: Lang }) {
  const t = I18N[lang];
  return (
    <div className="col-span-3 py-20 flex flex-col items-center justify-center text-center gap-4">
      <div className="w-20 h-20 rounded-full border border-[#d6b36a]/20 bg-[#d6b36a]/5 flex items-center justify-center mb-2">
        <span className="text-4xl">🎉</span>
      </div>
      <h3 className="text-2xl font-bold text-white">{t.noEventsTitle}</h3>
      <p className="text-zinc-400 text-sm max-w-sm leading-relaxed">{t.noEventsText}</p>
      <div className="flex gap-3 mt-2">
        <a href="https://www.instagram.com/wolnaa_event" target="_blank" rel="noopener noreferrer"
          className="rounded-2xl bg-[#d6b36a] px-6 py-3 text-sm font-bold text-black hover:bg-[#ead08d] active:bg-[#ead08d] active:scale-95 transition-all">
          📸 {t.followInstagram}
        </a>
        <a href="mailto:kontakt@wolnaa.de"
          className="rounded-2xl border border-white/15 px-6 py-3 text-sm font-bold text-white hover:border-[#d6b36a] hover:text-[#d6b36a] active:border-[#d6b36a] active:text-[#d6b36a] active:scale-95 transition-all">
          ✉️ {t.notification}
        </a>
      </div>
    </div>
  );
}


function FeaturedEvent({ event, lang }: { event: EventItem; lang: Lang }) {
  const t = I18N[lang];
  return (
    <a href={createEventLink(event)} className="group mb-12 grid overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/70 md:grid-cols-[1.15fr_0.85fr]">
      <div className="relative min-h-[320px] overflow-hidden bg-zinc-950 md:min-h-[420px]">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" decoding="async" />
        ) : (
          <Image src="/wolnaa-logo.png" alt="WOLNAA" width={360} height={140} className="absolute left-1/2 top-1/2 h-auto w-56 -translate-x-1/2 -translate-y-1/2 object-contain opacity-80" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/25 to-transparent" />
      </div>

      <div className="flex flex-col justify-center p-7 md:p-10">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#d6b36a]">
          {t.nextEvent}
        </p>

        <h3 className="text-3xl font-semibold leading-tight md:text-5xl">
          {event.title}
        </h3>

        <p className="mt-5 text-sm leading-relaxed text-zinc-400 md:text-base">
          {formatDate(event.date, lang)}{event.time && ` · ${event.time}`}
          {event.city && ` · ${event.city}`}
          {event.location && ` · ${event.location}`}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <span>
            <span className="block text-lg font-bold text-[#d6b36a]">{t.from} {getStartingPrice(event)} €</span>
            <span className="mt-1 block text-[11px] text-zinc-500">inkl. 19% MwSt.</span>
          </span>
          <span className="inline-flex h-12 items-center justify-center rounded-full bg-[#d6b36a] px-6 text-sm font-bold text-black transition-colors group-hover:bg-[#ead08d]">
            {t.viewTickets}
          </span>
        </div>
      </div>
    </a>
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
        <div className="flex flex-col items-center mb-6 gap-3">
          <button onClick={onClose} className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#d6b36a] text-black font-bold text-sm border border-[#ead08d] rounded-full px-4 py-2 shadow-lg z-50">Schließen ✕</button>
          <h2 className="text-2xl font-bold text-center">{titles[type]}</h2>
        </div>
        {content ? <div className="text-zinc-300 leading-7 text-base">{content.split("\n").map((line, i) => {
  const urlRegex = /(https?:\/\/[^\s]+|[\w.-]+@[\w.-]+\.[a-z]{2,})/gi;
  const parts = line.split(urlRegex);
  return <p key={i} className="mb-2">{parts.map((part, j) => {
    if (part.match(/^https?:\/\//)) return <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="text-[#d6b36a] underline">{part}</a>;
    if (part.match(/[\w.-]+@[\w.-]+\.[a-z]{2,}/)) return <a key={j} href={`mailto:${part}`} className="text-[#d6b36a] underline">{part}</a>;
    return part;
  })}</p>;
})}</div> : <p className="text-zinc-500 italic">Kein Inhalt hinterlegt.</p>}
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
  const [lang, setLang] = useState<Lang>("de");
  const t = I18N[lang];

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
    const { data } = await sb.from("settings").select("*");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(r => { map[r.key] = r.value; });
      setLegalContent(map);
    }
  }

  const closeLegal = useCallback(() => setShowLegal(null), []);

  const legalLinks: [LegalType, string][] = [
    ["impressum", "Impressum"], ["datenschutz", "Datenschutz"],
    ["agb", "AGB"], ["teilnahme", "Teilnahmebedingungen"], ["widerruf", "Widerrufsrecht"],
  ];

  const featuredEvent = mounted && events.length > 0 ? events[0] : null;
  const remainingEvents = featuredEvent ? events.slice(1) : events;

  return (
    <main className="min-h-screen bg-black text-white overflow-hidden">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/65 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
          <a href="/" aria-label="WOLNAA Startseite" className="flex items-center">
            <Image src="/wolnaa-logo.png" alt="WOLNAA" width={180} height={64} priority className="h-20 w-auto object-contain md:h-24 -my-3" />
          </a>

          <nav className="hidden items-center gap-8 text-sm font-bold uppercase tracking-[0.22em] text-white/75 md:flex">
            <a href="#events" className="transition-colors hover:text-[#d6b36a]">{t.navEvents}</a>
            <a href="#kontakt" className="transition-colors hover:text-[#d6b36a]">{t.navContact}</a>
          </nav>

          <div className="flex items-center rounded-full border border-white/15 bg-black/25 p-1 text-xs font-bold uppercase tracking-[0.16em]">
            {(["de", "ru"] as Lang[]).map((item) => (
              <button
                key={item}
                onClick={() => setLang(item)}
                className={`rounded-full px-3 py-2 transition-all ${lang === item ? "bg-[#d6b36a] text-black" : "text-white/70 hover:text-[#d6b36a]"}`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <section className="relative flex min-h-[92vh] items-center justify-center overflow-hidden bg-black px-6 pb-16 pt-32 md:min-h-screen">
        <video className="absolute inset-0 z-0 h-full w-full object-cover" src="/hero-wolnaa.mp4" autoPlay muted loop playsInline preload="metadata" poster="/hero-bg.png" />
        <div style={{position:"absolute",inset:0,zIndex:0,background:"linear-gradient(to bottom, rgba(0,0,0,0.45), rgba(0,0,0,0.55), rgba(0,0,0,0.92))"}} />
        <div className="relative z-10 max-w-7xl mx-auto text-center pt-40 md:pt-56">
          <p className="text-zinc-400 text-base tracking-wide md:hidden">
            {t.heroText}
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-8 md:hidden">
            <a href="#events" className="inline-flex h-14 w-56 items-center justify-center rounded-2xl bg-[#d6b36a] text-black font-bold text-base hover:bg-[#ead08d] active:scale-95 transition-all">{t.buyTickets}</a>
            <a href="#events" className="inline-flex h-14 w-56 items-center justify-center rounded-2xl border border-white/30 text-white font-bold text-base hover:border-[#d6b36a] hover:text-[#d6b36a] active:scale-95 transition-all">{t.discoverEvents}</a>
          </div>

        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 md:grid-cols-[0.9fr_1.1fr] md:items-end">
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#d6b36a]">
            {t.aboutEyebrow}
          </p>
          <h2 className="text-4xl font-semibold leading-tight md:text-6xl">
            {t.aboutTitle}
          </h2>
        </div>

        <div className="space-y-6 text-base leading-8 text-zinc-400 md:text-lg">
          <p>
            {t.aboutText1}
          </p>
          <p>
            {t.aboutText2}
          </p>
        </div>
      </section>

      <section id="events" className="mx-auto max-w-7xl px-6 py-16">
        <p className="mb-3 text-sm uppercase tracking-[0.26em] text-[#d6b36a]">{t.upcoming}</p>
        <h2 className="mb-10 text-4xl font-semibold md:text-5xl">{t.upcomingTitle}</h2>

        {featuredEvent && <FeaturedEvent event={featuredEvent} lang={lang} />}

        <div className="grid gap-8 md:grid-cols-3">
          {mounted && events.length === 0 && <EmptyState lang={lang} />}
          {mounted && remainingEvents.map(event => <EventCard key={event.id} event={event} lang={lang} />)}
        </div>
      </section>


      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#d6b36a]">
              {t.moments}
            </p>
            <h2 className="text-4xl font-semibold leading-tight md:text-5xl">
              {t.momentsTitle}
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-zinc-400 md:text-base">
            {t.momentsText}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className={`relative overflow-hidden rounded-3xl bg-zinc-950 ${item === 0 ? "md:col-span-2 md:row-span-2 min-h-[420px]" : "min-h-[260px]"}`}>
              <video
                className="absolute inset-0 h-full w-full object-cover"
                src="/hero-wolnaa.mp4"
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            </div>
          ))}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 text-center">
        <div className="px-6 py-10">
          <p className="text-[#d6b36a] uppercase tracking-[0.26em] text-xs mb-3">
            {t.community}
          </p>

          <h2 className="text-3xl md:text-5xl font-semibold mb-4">
            {t.followTitle}
          </h2>

          <p className="text-zinc-400 max-w-2xl mx-auto mb-7">
            {t.followText}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="https://www.tiktok.com/@wolnaa_event?_r=1&_t=ZG-96mDjgLge8H"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl bg-[#d6b36a] px-6 py-4 text-sm font-bold text-black hover:bg-[#ead08d] active:bg-[#ead08d] active:scale-95 transition-all"
            >
              {t.tiktokFollow}
            </a>

            <a
              href="https://www.instagram.com/wolnaa_event?igsh=MWExbHJlcms3ZXp4MQ=="
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/15 px-6 py-4 text-sm font-bold text-white hover:border-[#d6b36a] hover:text-[#d6b36a] active:border-[#d6b36a] active:text-[#d6b36a] active:scale-95 transition-all"
            >
              {t.followInstagram}
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div>
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.28em] text-[#d6b36a]">FAQ</p>
          <h2 className="mb-12 text-center text-4xl font-semibold md:text-5xl">{t.faqTitle}</h2>
          <div className="mx-auto max-w-3xl divide-y divide-white/10 border-y border-white/10">
            {t.faq.map((item, i) => (
              <details key={i} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-left text-base font-semibold text-white transition-colors hover:text-[#d6b36a] md:text-lg">
                  {item.q}
                  <span className="text-sm text-[#d6b36a] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-6 text-sm leading-7 text-zinc-400 md:text-base">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Kontakt */}
      <section id="kontakt" className="max-w-5xl mx-auto px-4 pb-10">
        <div className="px-6 py-10 text-center">
          <p className="text-[#d6b36a] uppercase tracking-[0.26em] text-xs mb-3">{t.contact}</p>
          <h2 className="text-3xl md:text-4xl font-semibold mb-4">{t.contactTitle}</h2>
          <p className="text-zinc-400 max-w-xl mx-auto mb-8 text-sm leading-relaxed">
            {t.contactText}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="https://www.instagram.com/wolnaa_event" target="_blank" rel="noopener noreferrer"
              className="rounded-2xl bg-[#d6b36a] px-6 py-4 text-sm font-bold text-black hover:bg-[#ead08d] active:bg-[#ead08d] active:scale-95 transition-all flex items-center gap-2">
              Instagram DM
            </a>
            <a href="mailto:kontakt@wolnaa.de"
              className="rounded-2xl border border-white/15 px-6 py-4 text-sm font-bold text-white hover:border-[#d6b36a] hover:text-[#d6b36a] active:border-[#d6b36a] active:text-[#d6b36a] active:scale-95 transition-all flex items-center gap-2">
              ✉️ kontakt@wolnaa.de
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 pt-8 pb-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-400 mb-4">
          {legalLinks.map(([key, label]) => (
            <button key={key!} onClick={() => setShowLegal(key)} className="hover:text-[#d6b36a] active:text-[#d6b36a] transition-colors underline-offset-4 hover:underline active:underline">{label}</button>
          ))}
        </div>
        <p className="text-zinc-500 text-sm mb-3">© {new Date().getFullYear()} WOLNAA</p>

      </footer>

      <CookieBanner />
      {showLegal && <LegalModal type={showLegal} content={legalContent[showLegal!] ?? ""} onClose={closeLegal} />}
    </main>
  );
}
