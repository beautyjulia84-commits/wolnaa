"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TicketType = { name: string; price: string; quantity: string };
type Lounge = { name: string; persons: string; price: string };
type DiscountCode = { code: string; percent: string };
type EventItem = {
  id: string; title: string; city: string; date: string; time: string;
  location: string; address: string; image_url: string; price: string;
  description: string; tickets: TicketType[];
  lounges: boolean; lounge_list: Lounge[]; discount_codes: DiscountCode[];
};

function slugify(t: string) {
  return t.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
}

function formatDate(d: string) {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("de-DE", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    });
  } catch { return d; }
}

export default function EventPage() {
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [ticketQtys, setTicketQtys] = useState<Record<number, number>>({});
  const [selectedLounge, setSelectedLounge] = useState<number | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [discountSuccess, setDiscountSuccess] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  useEffect(() => { loadEvent(); }, [id]);

  async function loadEvent() {
    const { data } = await sb.from("events").select("*");
    if (!data) { setNotFound(true); return; }
    const found = data.find((e: EventItem) => slugify(e.title) === id);
    if (found) setEvent(found); else setNotFound(true);
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-5xl">🎟️</p>
        <h1 className="text-2xl font-black text-yellow-400">Event nicht gefunden</h1>
        <Link href="/" className="text-zinc-500 hover:text-white text-sm transition-colors">← Zur Startseite</Link>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  const allTickets = event.tickets ?? [];
  const loungeList = event.lounge_list ?? [];
  const discountCodes = event.discount_codes ?? [];
  const totalTickets = Object.values(ticketQtys).reduce((a, b) => a + b, 0);

  function calcTotal() {
    let t = allTickets.reduce((s, tk, i) => s + (ticketQtys[i] ?? 0) * parseFloat(tk.price || "0"), 0);
    if (selectedLounge !== null && loungeList[selectedLounge]) {
      t += parseFloat(loungeList[selectedLounge].price || "0");
    }
    if (appliedDiscount) t *= (1 - parseFloat(appliedDiscount.percent) / 100);
    return t;
  }

  const total = calcTotal();

  function applyDiscount() {
    setDiscountError(""); setDiscountSuccess(false);
    const code = discountInput.trim().toUpperCase();
    if (!code) { setDiscountError("Bitte einen Code eingeben."); return; }
    const found = discountCodes.find((d: DiscountCode) => d.code.toUpperCase() === code);
    if (found) { setAppliedDiscount(found); setDiscountSuccess(true); }
    else { setAppliedDiscount(null); setDiscountError("Ungültiger Rabattcode."); }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.name = "Name erforderlich.";
    if (!customerEmail.trim()) e.email = "E-Mail erforderlich.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) e.email = "Ungültige E-Mail-Adresse.";
    setFormErrors(e);
    return !Object.keys(e).length;
  }

  async function submitOrder() {
    if (!validate()) return;
    setLoading(true); setCheckoutError("");
    try {
      const ticketId = "WOLNAA-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const lineItems = allTickets
        .map((t, i) => ({ name: t.name, price: t.price, qty: ticketQtys[i] ?? 0 }))
        .filter(t => t.qty > 0);
      if (selectedLounge !== null && loungeList[selectedLounge]) {
        const l = loungeList[selectedLounge];
        lineItems.push({ name: l.name, price: l.price, qty: 1 });
      }
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventTitle: event!.title, customerName, customerEmail, lineItems, total, ticketId, discountCode: appliedDiscount?.code ?? null }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error();
    } catch {
      setCheckoutError("Fehler aufgetreten. Bitte erneut versuchen.");
    } finally { setLoading(false); }
  }

  const canProceed = totalTickets > 0 && acceptedLegal && isAdult;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">

      {/* Hero */}
      <div className="relative h-[45vh] md:h-[55vh] overflow-hidden">
        {event.image_url
          ? <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-zinc-950 to-black" />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/40 to-transparent" />
        <Link href="/" className="absolute top-5 left-5 flex items-center gap-2 text-xs font-bold bg-white/10 backdrop-blur-md border border-white/10 text-white rounded-full px-4 py-2.5 hover:bg-white/20 transition-all">
          ← Zurück
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 -mt-20 relative z-10 pb-20">

        {/* Event Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-black leading-none tracking-tight mb-4">{event.title}</h1>
          <div className="flex flex-col gap-2">
            {event.date && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <span className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">📅</span>
                <span>{formatDate(event.date)}{event.time ? ` · ${event.time} Uhr` : ""}</span>
              </div>
            )}
            {event.city && (
              <div className="flex items-center gap-2.5 text-sm text-zinc-300">
                <span className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">📍</span>
                <span>{event.city}{event.location ? ` · ${event.location}` : ""}</span>
              </div>
            )}
            {event.address && (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">🗺️</span>
                <a href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`} target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:text-yellow-300 transition-colors hover:underline underline-offset-2">
                  {event.address}
                </a>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">

          {/* Description */}
          {event.description && (
            <div className="lg:flex-1">
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Über das Event</h2>
                <p className="text-zinc-300 text-sm leading-7 whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

          {/* Booking */}
          <div className="lg:w-96 space-y-4">

            {/* Tickets */}
            {allTickets.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Tickets auswählen</h2>
                <div className="space-y-3">
                  {allTickets.map((ticket, i) => (
                    <div key={i} className={`flex items-center justify-between rounded-2xl border px-4 py-3.5 transition-colors ${(ticketQtys[i] ?? 0) > 0 ? "border-yellow-400/50 bg-yellow-400/5" : "border-zinc-800 bg-zinc-950/50"}`}>
                      <div>
                        <p className="font-semibold text-sm">{ticket.name}</p>
                        <p className="text-yellow-400 font-bold text-sm mt-0.5">{parseFloat(ticket.price || "0").toFixed(2)} €</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button onClick={() => setTicketQtys(p => ({ ...p, [i]: Math.max(0, (p[i] ?? 0) - 1) }))} className="w-8 h-8 rounded-full border border-zinc-700 flex items-center justify-center font-bold hover:border-yellow-400 hover:text-yellow-400 transition-colors text-sm">−</button>
                        <span className="w-5 text-center font-bold">{ticketQtys[i] ?? 0}</span>
                        <button onClick={() => setTicketQtys(p => ({ ...p, [i]: (p[i] ?? 0) + 1 }))} className="w-8 h-8 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold hover:bg-yellow-300 transition-colors text-sm">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIP Lounges */}
            {event.lounges && loungeList.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">VIP Lounge</h2>
                <div className="space-y-2">
                  {loungeList.map((lounge, i) => (
                    <button key={i} onClick={() => setSelectedLounge(selectedLounge === i ? null : i)}
                      className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-all ${selectedLounge === i ? "border-yellow-400 bg-yellow-400/10" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"}`}>
                      <div>
                        <p className="font-semibold text-sm">{lounge.name}</p>
                        <p className="text-zinc-500 text-xs mt-0.5">bis {lounge.persons} Personen</p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-yellow-400 font-bold text-sm">{parseFloat(lounge.price || "0").toFixed(2)} €</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedLounge === i ? "border-yellow-400 bg-yellow-400" : "border-zinc-700"}`}>
                          {selectedLounge === i && <span className="text-black text-[10px] font-black">✓</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Rabattcode */}
            {discountCodes.length > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5">
                <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Rabattcode</h2>
                <div className="flex gap-2">
                  <input type="text" value={discountInput}
                    onChange={e => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(""); setDiscountSuccess(false); setAppliedDiscount(null); }}
                    onKeyDown={e => e.key === "Enter" && applyDiscount()}
                    placeholder="Code eingeben"
                    className="flex-1 min-w-0 rounded-xl bg-zinc-950 border border-zinc-700 focus:border-yellow-400 px-4 py-3 text-white placeholder:text-zinc-600 outline-none text-sm font-mono uppercase transition-colors" />
                  <button onClick={applyDiscount} className="rounded-xl bg-yellow-400 text-black font-bold px-4 py-3 text-sm hover:bg-yellow-300 transition-colors shrink-0">Einlösen</button>
                </div>
                {discountSuccess && appliedDiscount && <p className="text-green-400 text-xs mt-2">✓ {appliedDiscount.percent}% Rabatt wird angewendet</p>}
                {discountError && <p className="text-red-400 text-xs mt-2">{discountError}</p>}
              </div>
            )}

            {/* Gesamtpreis */}
            {totalTickets > 0 && (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl px-5 py-4 flex items-center justify-between">
                <div>
                  <p className="text-zinc-500 text-xs font-medium">Gesamtbetrag</p>
                  {appliedDiscount && <p className="text-green-400 text-xs mt-0.5">− {appliedDiscount.percent}% Rabatt</p>}
                </div>
                <p className="text-3xl font-black text-yellow-400">{total.toFixed(2)} €</p>
              </div>
            )}

            {/* Checkboxen */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <label className="flex items-start gap-3 cursor-pointer group" onClick={() => setIsAdult(!isAdult)}>
                <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all ${isAdult ? "bg-yellow-400 border-yellow-400" : "border-zinc-600 group-hover:border-zinc-500"}`}>
                  {isAdult && <span className="text-black text-[10px] font-black">✓</span>}
                </div>
                <span className="text-zinc-400 text-sm leading-relaxed">Ich bin mindestens <span className="text-white font-semibold">18 Jahre alt</span>.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer group" onClick={() => setAcceptedLegal(!acceptedLegal)}>
                <div className={`mt-0.5 w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all ${acceptedLegal ? "bg-yellow-400 border-yellow-400" : "border-zinc-600 group-hover:border-zinc-500"}`}>
                  {acceptedLegal && <span className="text-black text-[10px] font-black">✓</span>}
                </div>
                <span className="text-zinc-400 text-sm leading-relaxed">Ich akzeptiere <span className="text-yellow-400 underline underline-offset-2">AGB</span> & <span className="text-yellow-400 underline underline-offset-2">Datenschutz</span>.</span>
              </label>
            </div>

            {/* CTA */}
            <button onClick={() => setCheckoutOpen(true)} disabled={!canProceed}
              className={`w-full rounded-2xl py-5 font-black text-base transition-all duration-200 ${canProceed ? "bg-yellow-400 text-black hover:bg-yellow-300 shadow-lg shadow-yellow-400/20" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"}`}>
              {totalTickets === 0 ? "Ticket auswählen" : `Jetzt kaufen · ${total.toFixed(2)} €`}
            </button>

            <p className="text-center text-zinc-600 text-xs">🔒 Sichere Zahlung über Stripe</p>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end md:items-center justify-center p-0 md:p-6" onClick={() => setCheckoutOpen(false)}>
          <div className="w-full md:max-w-md bg-zinc-900 border border-zinc-800 rounded-t-[2rem] md:rounded-[2rem] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black">Bestellung abschließen</h2>
                  <p className="text-zinc-500 text-sm mt-0.5">{totalTickets} Ticket{totalTickets !== 1 ? "s" : ""} · <span className="text-yellow-400 font-bold">{total.toFixed(2)} €</span></p>
                </div>
                <button onClick={() => setCheckoutOpen(false)} className="w-8 h-8 rounded-full border border-zinc-700 text-zinc-400 flex items-center justify-center hover:text-white transition-colors text-sm">✕</button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Vollständiger Name</label>
                <input value={customerName} onChange={e => { setCustomerName(e.target.value); setFormErrors(p => ({ ...p, name: "" })); }} placeholder="Max Mustermann"
                  className={`w-full rounded-xl border bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-600 outline-none text-sm transition-colors ${formErrors.name ? "border-red-500" : "border-zinc-700 focus:border-yellow-400"}`} />
                {formErrors.name && <p className="text-red-400 text-xs mt-1.5">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">E-Mail-Adresse</label>
                <input type="email" value={customerEmail} onChange={e => { setCustomerEmail(e.target.value); setFormErrors(p => ({ ...p, email: "" })); }} placeholder="max@example.de"
                  className={`w-full rounded-xl border bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-600 outline-none text-sm transition-colors ${formErrors.email ? "border-red-500" : "border-zinc-700 focus:border-yellow-400"}`} />
                {formErrors.email && <p className="text-red-400 text-xs mt-1.5">{formErrors.email}</p>}
              </div>
              <p className="text-zinc-600 text-xs">Das Ticket wird nach Zahlung an diese E-Mail gesendet.</p>
              {checkoutError && <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3"><p className="text-red-400 text-sm">{checkoutError}</p></div>}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setCheckoutOpen(false)} className="flex-1 rounded-xl border border-zinc-700 py-3.5 text-sm font-semibold text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors">Zurück</button>
              <button onClick={submitOrder} disabled={loading} className="flex-1 rounded-xl bg-yellow-400 text-black font-black py-3.5 text-sm hover:bg-yellow-300 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Laden...</> : "Mit Stripe bezahlen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
