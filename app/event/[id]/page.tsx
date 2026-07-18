"use client";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TicketType = { name: string; price: string; quantity: string };
type Lounge = { name: string; persons: string; price: string; type?: string };
type DiscountCode = { code: string; percent: string };
type EventItem = {
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

function slugify(t: string) {
  return t.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
}
function calcCountdown(d: string) {
  if (!d) return null;
  const diff = new Date(d + "T00:00:00").getTime() - new Date().getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (days < 0) return null;
  if (days === 0) return "Heute!";
  if (days === 1) return "Morgen!";
  return `Noch ${days} Tage`;
}

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

export default function EventPage() {
  const params = useParams();
  const id = params?.id as string;
  const [event, setEvent] = useState<EventItem | null>(null);
  const [notFound, setNotFound] = useState(false);
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

  useEffect(() => { loadEvent(); }, [id]);

  async function loadEvent() {
    try {
      const { data } = await sb
        .from("events")
        .select("*, veranstalter:veranstalter_id(firmenname,kontakt_email)")
        .eq("slug", id)
        .single();
      if (data) setEvent(data);
      else setNotFound(true);
    } catch { setNotFound(true); }
  }

  if (notFound) return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
      <p className="text-5xl">🎟️</p>
      <h1 className="text-2xl font-bold text-[#d6b36a]">Event nicht gefunden</h1>
      <Link href="/" className="text-zinc-500 hover:text-white text-sm">← Zur Startseite</Link>
    </main>
  );

  if (!event) return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#d6b36a] border-t-transparent rounded-md animate-spin" />
    </main>
  );

  const n = normalize(event);
  const totalTickets = Object.values(ticketQtys).reduce((a, b) => a + b, 0);
  const hasSelection = totalTickets > 0;

  function calcTotal() {
    let t = n.tickets.reduce((s, tk, i) => s + (ticketQtys[i] ?? 0) * toMoney(tk.price), 0);
    if (selectedLounge !== null && n.loungeList[selectedLounge]) t += toMoney(n.loungeList[selectedLounge].price);
    if (appliedDiscount) t *= (1 - toDiscountPercent(appliedDiscount.percent) / 100);
    return t;
  }
  const total = calcTotal();
  const organizerName = event.veranstalter?.firmenname || event.title || "der Veranstalter";

  function applyDiscount() {
    setDiscountError(""); setDiscountSuccess(false);
    const code = discountInput.trim().toUpperCase();
    if (!code) { setDiscountError("Bitte einen Code eingeben."); return; }
    const found = n.discountCodes.find((d: DiscountCode) => d.code.toUpperCase() === code);
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
    if (!validate()) return;
    setLoading(true); setCheckoutError("");
    try {
      const ticketId = "WOLNAA-" + Math.random().toString(36).substring(2, 10).toUpperCase();
      const lineItems = n.tickets.map((t, i) => ({ name: t.name, price: t.price, qty: ticketQtys[i] ?? 0 })).filter(t => t.qty > 0);
      if (selectedLounge !== null && n.loungeList[selectedLounge]) lineItems.push({ name: n.loungeList[selectedLounge].name, price: n.loungeList[selectedLounge].price, qty: 1 });
      const res = await fetch("/api/create-checkout-session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event?.id, eventTitle: event?.title || "", customerName, customerEmail, lineItems, total, ticketId, discountCode: appliedDiscount?.code ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fehler aufgetreten.");
      if (data.url) window.location.href = data.url; else throw new Error("Fehler aufgetreten.");
    } catch (err: any) { setCheckoutError(err?.message || "Fehler aufgetreten. Bitte erneut versuchen."); }
    finally { setLoading(false); }
  }

  const canCheckout = acceptedLegal && isAdult && hasSelection;

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/65 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="WOLNAA Startseite" className="flex items-center">
            <Image src="/wolnaa-logo-gold-transparent.png" alt="WOLNAA" width={260} height={96} priority className="h-20 w-auto object-contain md:h-24 -my-3" />
          </Link>
          <Link href="/" className="text-xs font-bold uppercase tracking-[0.18em] text-white/70 transition-colors hover:text-[#d6b36a]">
            Zurück
          </Link>
        </div>
      </header>

      <div className="relative h-[68vh] min-h-[520px] overflow-hidden">
        {n.imageUrl ? <img src={n.imageUrl} alt={event.title} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gradient-to-br from-zinc-900 to-black" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/20" />
      </div>

      <div className="max-w-3xl mx-auto px-5 -mt-40 relative z-10 pb-44">
        <div className="mb-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.28em] text-[#d6b36a]">WOLNAA EVENT</p>
          <h1 className="text-4xl font-semibold leading-tight mb-6 md:text-6xl">{event.title}</h1>
          <div className="flex flex-col gap-3">
            {event.date && <div className="flex flex-col gap-1"><div className="flex items-center gap-3"><span className="w-9 h-9 rounded-md bg-black/35 border border-white/10 flex items-center justify-center shrink-0">📅</span><span className="text-zinc-200 text-sm">{formatDate(event.date)}{event.time ? ` · ${event.time} Uhr` : ""}</span></div>{calcCountdown(event.date) && <span className="ml-12 bg-[#d6b36a] text-black text-xs font-bold px-2 py-0.5 rounded-md w-fit">{calcCountdown(event.date)}</span>}</div>}
            {event.city && <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-md bg-black/35 border border-white/10 flex items-center justify-center shrink-0">📍</span><span className="text-zinc-200 text-sm">{event.city}{event.location ? ` · ${event.location}` : ""}</span></div>}
            {event.address && <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-md bg-black/35 border border-white/10 flex items-center justify-center shrink-0">🗺️</span><a href={`https://maps.google.com/?q=${encodeURIComponent(event.address)}`} target="_blank" rel="noopener noreferrer" className="text-[#d6b36a] text-sm hover:underline">{event.address}</a></div>}
          </div>
        </div>
        {event.description && <div className="bg-black/35 border border-white/10 rounded-md p-6 mb-8 backdrop-blur-md"><p className="text-zinc-200 text-sm leading-7 whitespace-pre-wrap">{event.description}</p></div>}
      </div>

      {step === "info" && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/80 p-5 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">Ab</p>
              <p className="text-2xl font-bold text-[#d6b36a]">{n.tickets.length > 0 ? formatMoney(toMoney(n.tickets[0].price)) : "Kostenlos"}</p><p className="mt-1 text-xs text-zinc-500">inkl. 19% MwSt.</p>
            </div>
            <button onClick={() => setStep("tickets")} className="bg-[#d6b36a] text-black font-bold px-8 py-4 rounded-md text-base hover:bg-[#ead08d] transition-colors uppercase tracking-[0.12em]">Tickets kaufen →</button>
          </div>
        </div>
      )}

      {step === "tickets" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center" onClick={() => setStep("info")}>
          <div className="w-full max-w-2xl bg-black border-t border-white/10 rounded-t-xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-black border-b border-white/10 px-6 pt-6 pb-4 flex items-center justify-between">
              <div><h2 className="text-lg font-bold">Tickets auswählen</h2><p className="text-zinc-500 text-sm mt-0.5">{event.title}</p></div>
              <button onClick={() => setStep("info")} className="w-9 h-9 rounded-md border border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {n.tickets.map((ticket, i) => (
                <div key={i} className="flex items-center justify-between bg-black/35 border border-white/10 rounded-md px-5 py-4">
                  <div><p className="font-bold text-base">{ticket.name || "Ticket"}</p><p className="text-[#d6b36a] font-bold mt-0.5">{formatMoney(toMoney(ticket.price))}</p><p className="mt-1 text-[11px] text-zinc-500">inkl. 19% MwSt.</p></div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setTicketQtys(p => ({ ...p, [i]: Math.max(0, (p[i] ?? 0) - 1) }))} className="w-9 h-9 rounded-md border border-zinc-700 flex items-center justify-center font-bold hover:border-[#d6b36a] hover:text-[#d6b36a] transition-colors text-lg">−</button>
                    <span className="w-6 text-center font-bold">{ticketQtys[i] ?? 0}</span>
                    <button onClick={() => setTicketQtys(p => ({ ...p, [i]: (p[i] ?? 0) + 1 }))} className="w-9 h-9 rounded-md bg-[#d6b36a] text-black flex items-center justify-center font-bold hover:bg-[#ead08d] transition-colors text-lg">+</button>
                  </div>
                </div>
              ))}
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
              {hasSelection && (
                <div className="bg-black/35 border border-white/10 rounded-md px-5 py-4">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3">Rabattcode</p>
                  <div className="flex gap-2">
                    <input type="text" value={discountInput} onChange={e => { setDiscountInput(e.target.value.toUpperCase()); setDiscountError(""); setDiscountSuccess(false); setAppliedDiscount(null); }} onKeyDown={e => e.key === "Enter" && applyDiscount()} placeholder="Code eingeben" className="flex-1 bg-zinc-900 border border-zinc-700 focus:border-[#d6b36a] rounded-md px-4 py-3 text-white placeholder:text-zinc-600 outline-none text-sm font-mono uppercase transition-colors" />
                    <button onClick={applyDiscount} className="bg-[#d6b36a] text-black font-bold px-5 py-3 rounded-md text-sm hover:bg-[#ead08d] transition-colors shrink-0">Einlösen</button>
                  </div>
                  {discountSuccess && appliedDiscount && <p className="text-green-400 text-xs mt-2">✓ {toDiscountPercent(appliedDiscount.percent)}% Rabatt wird angewendet</p>}
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
                  <div><p className="text-zinc-500 text-xs">Gesamt</p>{appliedDiscount && <p className="text-green-400 text-xs">− {toDiscountPercent(appliedDiscount.percent)}% Rabatt</p>}<p className="text-2xl font-bold text-[#d6b36a]">{formatMoney(total)}</p><p className="mt-1 text-[11px] text-zinc-500">inkl. 19% MwSt.</p></div>
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

      {step === "checkout" && (
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
