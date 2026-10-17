"use client";
import EventCountdown from "@/components/EventCountdown";
import EventIcon from "@/components/EventIcon";
import Link from "next/link";
import { useEffect, useState } from "react";
import {eventTiming} from '@/lib/event-timing';
import {useEventClock} from '@/lib/use-event-clock';
import DiscountWheel from '@/components/DiscountWheel';
import { influencerPercent, combinedWheelPercent } from '@/lib/wheel-promotion';

type TicketType = { name: string; price: string; quantity: string };
type Lounge = { name: string; persons: string; price: string; type?: string };
type DiscountCode = { code: string; percent: string };
type Availability = { activeIndex: number; remaining: number | null; soldOut: boolean; salesClosed?: boolean };
export type EventItem = {
  event_ends_at?: string | null; online_sale_ends_at?: string | null;
  id: string; title: string; city: string; date: string; time: string;
  location: string; address: string;
  image_url?: string; imageUrl?: string;
  veranstalter_id?: string | null;
  veranstalter?: { firmenname?: string | null; kontakt_email?: string | null } | null;
  price: string; description: string;
  tickets: TicketType[];
  lounges: boolean | Lounge[];
  lounge_list?: Lounge[]; loungeList?: Lounge[];
  discount_codes?: DiscountCode[]; discountCodes?: DiscountCode[];
};

function formatDate(d: string) {
  if (!d) return "";
  try { return new Date(d + "T00:00:00").toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); }
  catch { return d; }
}
function normalize(e: EventItem) {
  return {
    ...e,
    imageUrl: e.image_url || e.imageUrl || "",
    tickets: Array.isArray(e.tickets) ? e.tickets : [],
    loungeList: Array.isArray(e.lounge_list) ? e.lounge_list : Array.isArray(e.loungeList) ? e.loungeList : Array.isArray(e.lounges) ? e.lounges as Lounge[] : [],
    hasLounges: e.lounges === true || (Array.isArray(e.lounge_list) && e.lounge_list.length > 0) || (Array.isArray(e.loungeList) && e.loungeList.length > 0) || (Array.isArray(e.lounges) && (e.lounges as Lounge[]).length > 0),
    discountCodes: Array.isArray(e.discount_codes) ? e.discount_codes : Array.isArray(e.discountCodes) ? e.discountCodes : [],
  };
}

function toMoney(value: unknown) {
  const normalized = String(value ?? "0").replace(",", ".").replace(/[^\d.-]/g, "");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

function toDiscountPercent(value: unknown) {
  const normalized = String(value ?? "").replace(",", ".").replace(/[^\d.-]/g, "");
  const percent = Number.parseFloat(normalized);
  if (!Number.isFinite(percent)) return 0;
  return Math.min(Math.max(percent, 0), 100);
}

function formatMoney(value: number) {
  return `${(Number.isFinite(value) ? value : 0).toFixed(2)} €`;
}

export default function EventDetails({ event, initialNow }: { event: EventItem; initialNow: number }) {
  const clock = useEventClock();
  const now = clock || initialNow;
  const [step, setStep] = useState<"info" | "tickets" | "checkout">("info");
  const [ticketQtys, setTicketQtys] = useState<Record<number, number>>({});
  const [selectedLounge, setSelectedLounge] = useState<number | null>(null);
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountError, setDiscountError] = useState("");
  const [discountSuccess, setDiscountSuccess] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [isAdult, setIsAdult] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [wheelPercent, setWheelPercent] = useState(0);

  const [availabilityError, setAvailabilityError] = useState(false);
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    let disposed = false;
    setAvailabilityError(false);
    setAvailability(null);
    fetch(`/api/events/${event.id}/availability`, { cache: "no-store", signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Verfügbarkeit nicht erreichbar");
        return response.json();
      })
      .then(data => { if (!disposed) setAvailability(data); })
      .catch(() => { if (!disposed) setAvailabilityError(true); })
      .finally(() => clearTimeout(timeout));
    return () => { disposed = true; clearTimeout(timeout); controller.abort(); };
  }, [event.id, availabilityAttempt]);

  const n = normalize(event);
  const timing = eventTiming(event, now);
  const salesClosed = !now || timing.salesClosed || availability?.salesClosed === true;
  const activeTicketIndex = availability?.activeIndex ?? -1;
  const activeTicket = activeTicketIndex >= 0 ? n.tickets[activeTicketIndex] : null;
  const totalTickets = Object.values(ticketQtys).reduce((a, b) => a + b, 0);
  const hasSelection = totalTickets > 0;

  function calcTotal() {
    let t = n.tickets.reduce((s, tk, i) => s + (ticketQtys[i] ?? 0) * toMoney(tk.price), 0);
    const extra = influencerPercent(event!.id,appliedDiscount?.code);
    if (wheelPercent || extra) t *= (1 - combinedWheelPercent(wheelPercent,extra) / 100);
    if (selectedLounge !== null && n.loungeList[selectedLounge]) t += toMoney(n.loungeList[selectedLounge].price);
    if (appliedDiscount && !wheelPercent && !extra) t *= (1 - toDiscountPercent(appliedDiscount.percent) / 100);
    return t;
  }
  const total = calcTotal();
  const organizerName = event.veranstalter?.firmenname || event.title || "der Veranstalter";

  function applyDiscount() {
    setDiscountError(""); setDiscountSuccess(false);
    const code = discountInput.trim().toUpperCase();
    if (!code) { setDiscountError("Bitte einen Code eingeben."); return; }
    const extra = influencerPercent(event!.id,code);
    if (wheelPercent && !extra) {setAppliedDiscount(null);setDiscountError('Zum Glücksrad gilt nur einfachwowa, janchik oder CHRIS.');return;}
    const found = extra ? {code,percent:'10'} : n.discountCodes.find((d: DiscountCode) => d.code.toUpperCase() === code);
    if (found && toDiscountPercent(found.percent) > 0) { setAppliedDiscount(found); setDiscountSuccess(true); }
    else if (found) { setAppliedDiscount(null); setDiscountError("Rabattcode ist nicht korrekt konfiguriert."); }
    else { setAppliedDiscount(null); setDiscountError("Ungültiger Rabattcode."); }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.name = "Name erforderlich.";
    if (!customerEmail.trim()) e.email = "E-Mail erforderlich.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) e.email = "Ungültige E-Mail-Adresse.";
    setFormErrors(e); return !Object.keys(e).length;
  }

  async function submitOrder() {
    if (eventTiming(event!).salesClosed) { setCheckoutError("Der Online-Verkauf ist beendet."); return; }
    if (!validate()) return;
    setLoading(true); setCheckoutError("");
    try {
      const ticketId = "WOLNAA-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const lineItems = n.tickets.map((t, i) => ({ name: t.name, price: t.price, qty: ticketQtys[i] ?? 0 })).filter(t => t.qty > 0);
      if (selectedLounge !== null && n.loungeList[selectedLounge]) lineItems.push({ name: n.loungeList[selectedLounge].name, price: n.loungeList[selectedLounge].price, qty: 1 });
      const res = await fetch("/api/create-checkout-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event?.id, eventTitle: event?.title || "", customerName, customerEmail, lineItems, total, ticketId, discountCode: appliedDiscount?.code ?? null, wheelDiscount: wheelPercent > 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler aufgetreten.");
      if (data.url) window.location.href = data.url; else throw new Error("Fehler aufgetreten.");
    } catch (err: any) {
      setCheckoutError(err?.message || "Fehler aufgetreten. Bitte erneut versuchen.");
      setTicketQtys({});
      const response = await fetch(`/api/events/${event.id}/availability`, { cache: "no-store" });
      const available = await response.json().catch(() => null);
      if (response.ok && available) setAvailability(available);
    }
    finally { setLoading(false); }
  }

  const canCheckout = acceptedLegal && isAdult && hasSelection;

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="relative h-[68svh] min-h-[440px] max-h-[820px] overflow-hidden md:h-[72svh] md:min-h-[520px]">
        {n.imageUrl ? <img src={n.imageUrl} fetchPriority="high" decoding="async" alt={event.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/15" />
        <div className="absolute inset-x-0 top-0 z-10 mx-auto max-w-3xl px-5 pt-5 md:pt-8">
          <Link href="/" className="inline-flex min-h-11 items-center rounded-md border border-white/25 bg-black/65 px-4 py-3 text-sm text-white backdrop-blur-sm transition-colors hover:border-[#d6b36a] hover:text-[#d6b36a] focus-visible:outline-2 focus-visible:outline-[#d6b36a]">← Zurück</Link>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 mx-auto max-w-3xl px-5 pb-4">
          <EventCountdown event={event} overlay />
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 pt-5 relative z-10 pb-40 md:pt-8">
        <div className="mb-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-[#d6b36a]">WOLNAA EVENT</p>
          <h1 className="text-3xl font-semibold leading-tight mb-5 md:text-5xl">{event.title}</h1>
          <div className="grid gap-5 text-sm text-zinc-300 sm:grid-cols-2">
            <div><p className="mb-2 flex items-center gap-2 text-zinc-400"><EventIcon kind="calendar" />Beginn</p><p>{formatDate(event.date)}{event.time ? ` · ${event.time} Uhr` : ''}</p></div>
            {Number.isFinite(timing.ends) && <div><p className="mb-2 flex items-center gap-2 text-zinc-400"><EventIcon kind="clock" />Ende</p><p>{new Intl.DateTimeFormat('de-DE', {timeZone:'Europe/Berlin',day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(timing.ends))} Uhr</p></div>}
            <div className="border-t border-white/10 pt-5 sm:col-span-2"><p className="mb-2 flex items-center gap-2 text-zinc-400"><EventIcon kind="pin" />Veranstaltungsort</p><p>{event.city}{event.location ? ` · ${event.location}` : ''}</p>{event.address && <><p className="mt-1">{event.address}</p><a href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[#d6b36a] underline underline-offset-4">Location &amp; Anreise</a></>}</div>
          </div>
        </div>
        {event.description && <div className="max-w-2xl border-t border-white/10 pt-6"><p className="text-zinc-400 text-sm leading-7 whitespace-pre-wrap">{event.description}</p></div>}
        {!salesClosed && event.id === 'd3a2c95d-893d-4ee4-8645-b28ec7f61063' && <DiscountWheel eventId={event.id} onReward={setWheelPercent} />}
      </div>

      {salesClosed && <p role="status" className="mx-auto max-w-3xl p-6 text-center text-[#d6b36a]">{timing.ended ? "Diese Veranstaltung ist beendet." : "Der Online-Ticketverkauf ist beendet."}</p>}
      {(step === "info" || salesClosed) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 p-5 backdrop-blur-xl">
          {availabilityError && !salesClosed && <p role="alert" className="mx-auto mb-3 max-w-2xl text-sm text-amber-200">Ticketverfügbarkeit konnte nicht geladen werden. <button className="underline" onClick={() => setAvailabilityAttempt(value => value + 1)}>Erneut versuchen</button></p>}
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              {!salesClosed && <p className="text-xs text-zinc-500 uppercase tracking-widest">Ab</p>}
              <p className="text-2xl font-bold text-[#d6b36a]">{salesClosed ? "Online-Verkauf beendet" : !availability ? "Wird geladen…" : activeTicket ? formatMoney(toMoney(activeTicket.price)) : "Ausverkauft"}</p>{!salesClosed && activeTicket && <p className="mt-1 text-xs text-zinc-500">inkl. 19% MwSt.</p>}
            </div>
            <button onClick={() => setStep("tickets")} disabled={salesClosed || !availability || (!activeTicket && !n.hasLounges)} className="bg-[#d6b36a] text-black font-bold px-8 py-4 rounded-md text-base hover:bg-[#ead08d] transition-colors uppercase tracking-[0.12em] disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500">{salesClosed ? "Online-Verkauf beendet" : !availability ? "Bitte warten" : activeTicket || n.hasLounges ? "Tickets kaufen →" : "Ausverkauft"}</button>
          </div>
        </div>
      )}

      {!salesClosed && step === "tickets" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => setStep("info")}>
          <div className="w-full max-w-2xl bg-black border-t border-white/10 rounded-t-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-black border-b border-white/10 px-6 pt-6 pb-4 flex items-center justify-between">
              <div><h2 className="text-lg font-bold">Tickets auswählen</h2><p className="text-zinc-500 text-sm mt-0.5">{event.title}</p></div>
              <button onClick={() => setStep("info")} className="w-9 h-9 rounded-md border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {activeTicket && (
                <div className="flex items-center justify-between bg-black/35 border border-white/10 rounded-md px-5 py-4">
                  <div><p className="font-bold text-base">{activeTicket.name || "Ticket"}</p><p className="text-[#d6b36a] font-bold mt-0.5">{formatMoney(toMoney(activeTicket.price))}</p><p className="mt-1 text-[11px] text-zinc-500">inkl. 19% MwSt.{availability?.remaining !== null && availability?.remaining !== undefined ? ` · Noch ${availability.remaining} verfügbar` : ""}</p></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTicketQtys(p => ({ ...p, [activeTicketIndex]: Math.max(0, (p[activeTicketIndex] ?? 0) - 1) }))} className="w-9 h-9 rounded-md border border-zinc-700 flex items-center justify-center font-bold hover:border-[#d6b36a] hover:text-[#d6b36a] transition-colors text-lg">−</button>
                    <span className="w-6 text-center font-bold">{ticketQtys[activeTicketIndex] ?? 0}</span>
                    <button onClick={() => setTicketQtys(p => ({ ...p, [activeTicketIndex]: Math.min(availability?.remaining ?? Number.POSITIVE_INFINITY, (p[activeTicketIndex] ?? 0) + 1) }))} className="w-9 h-9 rounded-md bg-[#d6b36a] text-black flex items-center justify-center font-bold hover:bg-[#ead08d] transition-colors text-lg">+</button>
                  </div>
                </div>
              )}
              {!activeTicket && !n.hasLounges && <p className="py-8 text-center text-zinc-400">Dieses Event ist ausverkauft.</p>}
              {n.hasLounges && n.loungeList.length > 0 && (
                <>
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest pt-2">Lounge</p>
                  {n.loungeList.map((lounge, i) => (
                    <button key={i} onClick={() => setSelectedLounge(selectedLounge === i ? null : i)} className={`w-full flex items-center justify-between rounded-md border px-5 py-4 text-left transition-all ${selectedLounge === i ? "border-[#d6b36a] bg-[#d6b36a]/10" : "border-white/10 bg-zinc-950"}`}>
                      <div><p className="font-bold">{lounge.name}</p><p className="text-zinc-500 text-xs mt-0.5">bis {lounge.persons} Personen</p></div>
                      <div className="flex items-center gap-3"><span className="text-[#d6b36a] font-bold">{formatMoney(toMoney(lounge.price))}</span><div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${selectedLounge === i ? "bg-[#d6b36a] border-[#d6b36a]" : "border-zinc-600"}`}>{selectedLounge === i && <span className="text-black text-xs font-bold">✓</span>}</div></div>
                    </button>
                  ))}
                </>
              )}
              {wheelPercent > 0 && <p className="text-sm text-[#d6b36a]">Dein Glücksrad-Rabatt: {wheelPercent} % auf Tickets – automatisch angewendet.</p>}
              {hasSelection && (
                <div className="bg-black/35 border border-white/10 rounded-md px-5 py-4">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Rabattcode</p>
                  <div className="flex gap-2">
                    <input type="text" value={discountInput} onChange={e => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(""); setDiscountSuccess(false); setAppliedDiscount(null); }} onKeyDown={e => e.key === "Enter" && applyDiscount()} placeholder="Code eingeben" className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-[#d6b36a] rounded-md px-4 py-3 text-white placeholder:text-zinc-600 outline-none text-sm font-mono uppercase transition-colors" />
                    <button onClick={applyDiscount} className="bg-[#d6b36a] text-black font-bold px-5 py-3 rounded-md text-sm hover:bg-[#ead08d] transition-colors shrink-0">Einlösen</button>
                  </div>
                  {discountSuccess && appliedDiscount && <p className="text-green-400 text-xs mt-2">✓ {toDiscountPercent(appliedDiscount.percent)}{wheelPercent ? ' zusätzliche Prozentpunkte auf Tickets' : '% Rabatt wird angewendet'}</p>}
                  {discountError && <p className="text-red-400 text-xs mt-2">{discountError}</p>}
                </div>
              )}
              <div className="bg-black/35 border border-white/10 rounded-md px-5 py-4 space-y-3">
                <div className="rounded-md border border-white/10 bg-zinc-950 px-4 py-3">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Rechtlicher Hinweis</p>
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Vertragspartner für Veranstaltung und Ticket ist <span className="text-white font-semibold">{organizerName}</span>.
                    Wolnaa stellt die Plattform und Tickettechnik bereit. Die Zahlung wird sicher über Stripe verarbeitet.
                  </p>
                </div>
                <label className="flex items-start gap-3 cursor-pointer" onClick={() => setIsAdult(!isAdult)}>
                  <div className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${isAdult ? "bg-[#d6b36a] border-[#d6b36a]" : "border-zinc-600"}`}>{isAdult && <span className="text-black text-[10px] font-bold">✓</span>}</div>
                  <span className="text-zinc-400 text-sm leading-relaxed">Ich bin mindestens <span className="text-white font-semibold">18 Jahre alt</span>.</span>
                </label>
                <label className="flex items-start gap-3 cursor-pointer" onClick={() => setAcceptedLegal(!acceptedLegal)}>
                  <div className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center transition-all ${acceptedLegal ? "bg-[#d6b36a] border-[#d6b36a]" : "border-zinc-600"}`}>{acceptedLegal && <span className="text-black text-[10px] font-bold">✓</span>}</div>
                  <span className="text-zinc-400 text-sm leading-relaxed">Ich akzeptiere die <Link href="/agb" target="_blank" className="text-[#d6b36a] underline underline-offset-2">AGB</Link>, die <Link href="/datenschutz" target="_blank" className="text-[#d6b36a] underline underline-offset-2">Datenschutzerklärung</Link> und die Hinweise zum jeweiligen Veranstalter.</span>
                </label>
              </div>
            </div>
            <div className="sticky bottom-0 bg-black border-t border-white/10 px-6 py-5">
              {hasSelection && (
                <div className="flex items-center justify-between mb-4">
                  <div><p className="text-zinc-500 text-xs">Gesamt</p>{(wheelPercent > 0 || appliedDiscount) && <p className="text-green-400 text-xs">− {wheelPercent ? combinedWheelPercent(wheelPercent, influencerPercent(event.id, appliedDiscount?.code)) : toDiscountPercent(appliedDiscount?.percent)}% Rabatt{wheelPercent ? ' auf Tickets' : ''}</p>}<p className="text-2xl font-bold text-[#d6b36a]">{formatMoney(total)}</p><p className="mt-1 text-[11px] text-zinc-500">inkl. 19% MwSt.</p></div>
                  <p className="text-zinc-600 text-xs">{totalTickets} Ticket{totalTickets !== 1 ? "s" : ""}</p>
                </div>
              )}
              <button onClick={() => {
                  if (typeof window !== "undefined" && (window as any).ttq) {
                    (window as any).ttq.track("InitiateCheckout", {
                      content_name: event?.title || "Event",
                      value: total,
                      currency: "EUR",
                    });
                  }
                  setStep("checkout");
                }} disabled={!canCheckout} className={`w-full py-4 rounded-md font-bold text-base transition-all ${canCheckout ? "bg-[#d6b36a] text-black hover:bg-[#ead08d]" : "bg-zinc-900 text-zinc-600 cursor-not-allowed"}`}>
                {!hasSelection ? "Ticket auswählen" : !isAdult || !acceptedLegal ? "Bitte Bedingungen akzeptieren" : `Weiter · ${formatMoney(total)}`}
              </button>
              <p className="text-center text-zinc-600 text-xs mt-3">🔒 Sichere Zahlung über Stripe</p>
            </div>
          </div>
        </div>
      )}

      {!salesClosed && step === "checkout" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => setStep("tickets")}>
          <div className="w-full max-w-2xl bg-black border-t border-white/10 rounded-t-xl" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-6 pb-4 border-b border-white/10 flex items-center justify-between">
              <div><h2 className="text-lg font-bold">Bestellung abschließen</h2><p className="text-zinc-500 text-sm mt-0.5">{totalTickets} Ticket{totalTickets !== 1 ? "s" : ""} · <span className="text-[#d6b36a] font-bold">{formatMoney(total)}</span></p><p className="mt-1 text-[11px] text-zinc-500">inkl. 19% MwSt.</p></div>
              <button onClick={() => setStep("tickets")} className="w-9 h-9 rounded-md border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="rounded-md border border-white/10 bg-zinc-950 px-4 py-3">
                <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Bestellhinweis</p>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Veranstalter und Vertragspartner: <span className="text-white font-semibold">{organizerName}</span>.
                  Wolnaa ist Plattformanbieter. Die Zahlung erfolgt über Stripe; bei verbundenen Veranstalterkonten wird die Zahlung dem Stripe-Konto des Veranstalters zugeordnet.
                </p>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">Vollständiger Name</label>
                <input value={customerName} onChange={e => { setCustomerName(e.target.value); setFormErrors(p => ({ ...p, name: "" })); }} placeholder="Max Mustermann" className={`w-full rounded-md border bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-600 outline-none text-sm transition-colors ${formErrors.name ? "border-red-500" : "border-zinc-700 focus:border-[#d6b36a]"}`} />
                {formErrors.name && <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-2 uppercase tracking-widest">E-Mail-Adresse</label>
                <input type="email" value={customerEmail} onChange={e => { setCustomerEmail(e.target.value); setFormErrors(p => ({ ...p, email: "" })); }} placeholder="max@example.de" className={`w-full rounded-md border bg-zinc-950 px-4 py-3 text-white placeholder:text-zinc-600 outline-none text-sm transition-colors ${formErrors.email ? "border-red-500" : "border-zinc-700 focus:border-[#d6b36a]"}`} />
                {formErrors.email && <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>}
              </div>
              <p className="text-zinc-600 text-xs">Das Ticket wird nach Zahlung an diese E-Mail gesendet.</p>
              {checkoutError && <div className="bg-red-500/10 border border-red-500/20 rounded-md px-4 py-3"><p className="text-red-400 text-sm">{checkoutError}</p></div>}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setStep("tickets")} className="flex-1 rounded-md border border-zinc-700 py-4 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">← Zurück</button>
              <button onClick={submitOrder} disabled={loading} className="flex-1 rounded-md bg-[#d6b36a] text-black font-bold py-4 text-sm hover:bg-[#ead08d] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-md animate-spin" />Laden...</> : "Mit Stripe bezahlen →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
