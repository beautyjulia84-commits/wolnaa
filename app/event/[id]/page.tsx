"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type TicketType = {
  name: string;
  price: string;
  quantity?: string;
};

type Lounge = {
  name: string;
  persons: string;
  price: string;
};

type DiscountCode = {
  code: string;
  percent: string;
};

type EventItem = {
  title: string;
  city: string;
  date: string;
  time: string;
  location: string;
  address?: string;
  imageUrl?: string;
  price: string;
  description: string;
  tickets?: TicketType[];
  ticketTypes?: TicketType[];
  lounges?: boolean;
  loungeList?: Lounge[];
  discountCodes?: DiscountCode[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
}

function safeParseJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EventPage() {
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<EventItem | null>(null);
  const [notFound, setNotFound] = useState(false);

  // Ticket-Mengen pro Typ
  const [ticketQtys, setTicketQtys] = useState<Record<number, number>>({});

  // Lounge-Auswahl
  const [selectedLounge, setSelectedLounge] = useState<number | null>(null);

  // Rabattcode
  const [discountInput, setDiscountInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<DiscountCode | null>(null);
  const [discountError, setDiscountError] = useState("");

  // Checkboxen
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [isAdult, setIsAdult] = useState(false);

  // Checkout-Formular
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string }>({});

  // Lade-/Fehlerzustand
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Event aus Supabase laden
  useEffect(() => {
    async function loadEvent() {
      const { data, error } = await sb
        .from("events")
        .select("*")
        .order("created_at", { ascending: true });

      if (error || !data) {
        console.error("Event laden Fehler:", error);
        setNotFound(true);
        return;
      }

      const events = data.map((row: any) => row.data ?? row);
      const found = events.find((item: EventItem) => slugify(item.title) === id || (item as any).id === id);

      if (found) {
        setEvent(found);
      } else {
        setNotFound(true);
      }
    }

    loadEvent();
  }, [id]);

  if (notFound) {
    return (
      <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6">
        <p className="text-6xl">🎟️</p>
        <h1 className="text-4xl font-black text-yellow-400">Event nicht gefunden</h1>
        <Link href="/" className="text-zinc-400 hover:text-white transition-colors text-sm underline underline-offset-4">
          Zurück zur Startseite
        </Link>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  // Alle Ticket-Typen normalisieren (tickets oder ticketTypes)
  const allTickets = event.tickets ?? event.ticketTypes ?? [];

  // Gesamtmenge aller Tickets
  const totalTickets = Object.values(ticketQtys).reduce((a, b) => a + b, 0);

  // Gesamtpreis berechnen
  function calcTotal(): number {
    let total = 0;
    allTickets.forEach((ticket, i) => {
      total += (ticketQtys[i] ?? 0) * parseFloat(ticket.price || "0");
    });
    if (selectedLounge !== null && event?.loungeList) {
      total += parseFloat(event.loungeList[selectedLounge].price || "0");
    }
    if (appliedDiscount) {
      total = total * (1 - parseFloat(appliedDiscount.percent) / 100);
    }
    return total;
  }

  const total = calcTotal();

  function changeQty(index: number, delta: number) {
    setTicketQtys((prev) => ({
      ...prev,
      [index]: Math.max(0, (prev[index] ?? 0) + delta),
    }));
  }

  function applyDiscount() {
    setDiscountError("");
    const found = event?.discountCodes?.find(
      (dc) => dc.code.toLowerCase() === discountInput.trim().toLowerCase()
    );
    if (found) {
      setAppliedDiscount(found);
    } else {
      setAppliedDiscount(null);
      setDiscountError("Ungültiger Rabattcode.");
    }
  }

  function validateForm(): boolean {
    const errors: { name?: string; email?: string } = {};
    if (!customerName.trim()) errors.name = "Name ist erforderlich.";
    if (!customerEmail.trim()) {
      errors.email = "E-Mail ist erforderlich.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
      errors.email = "Bitte eine gültige E-Mail-Adresse eingeben.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitOrder() {
    if (!validateForm()) return;

    setLoading(true);
    setCheckoutError("");

    try {
      const ticketId = "WOLNAA-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      const lineItems = allTickets
        .map((ticket, i) => ({
          name: ticket.name,
          price: ticket.price,
          qty: ticketQtys[i] ?? 0,
        }))
        .filter((item) => item.qty > 0);

      if (selectedLounge !== null && event?.loungeList) {
        const lounge = event.loungeList[selectedLounge];
        lineItems.push({ name: lounge.name, price: lounge.price, qty: 1 });
      }

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventTitle: event?.title || "",
          customerName,
          customerEmail,
          lineItems,
          total,
          ticketId,
          discountCode: appliedDiscount?.code ?? null,
        }),
      });

      if (!response.ok) throw new Error("Server-Fehler");

      const data = await response.json();

      // ✅ Orders NICHT hier speichern – erst auf der Success-Page nach Stripe-Bestätigung
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Keine Checkout-URL erhalten.");
      }
    } catch {
      setCheckoutError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    } finally {
      setLoading(false);
    }
  }

  const canProceed = totalTickets > 0 && acceptedLegal && isAdult;

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Hero-Bild */}
      <div className="relative w-full h-[40vh] md:h-[55vh] overflow-hidden">
        {event.imageUrl ? (
          <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[radial-gradient(circle_at_top,#2b1b00_0%,#111_38%,#000_100%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 text-sm font-bold bg-black/50 backdrop-blur-sm hover:bg-black/80 transition-colors px-4 py-2 rounded-full"
        >
          ← Zurück
        </Link>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-24 -mt-16 relative z-10">
        {/* Titel-Block */}
        <div className="mb-10">
          <p className="text-yellow-400 text-sm font-medium tracking-wide mb-2">
            {event.date}{event.time && ` · ${event.time}`}
          </p>
          <h1 className="text-5xl md:text-7xl font-black leading-tight">{event.title}</h1>
          <p className="text-zinc-400 mt-3">
            {event.city}{event.location && ` · ${event.location}`}
          </p>
          {event.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-yellow-400 text-sm mt-2 hover:underline underline-offset-4"
            >
              📍 Google Maps öffnen
            </a>
          )}
        </div>

        {/* Tickets */}
        {allTickets.length > 0 && (
          <section className="rounded-3xl bg-zinc-950 border border-white/10 p-7 mb-6">
            <h2 className="text-2xl font-black mb-5">Tickets</h2>
            <div className="space-y-3">
              {allTickets.map((ticket, i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-black px-5 py-4">
                  <div>
                    <p className="font-semibold text-white">{ticket.name}</p>
                    <p className="text-yellow-400 font-bold mt-0.5">{ticket.price} €</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => changeQty(i, -1)}
                      className="w-9 h-9 rounded-full border border-white/20 hover:border-yellow-400 hover:text-yellow-400 transition-colors flex items-center justify-center font-bold"
                    >−</button>
                    <span className="w-5 text-center font-bold text-lg">{ticketQtys[i] ?? 0}</span>
                    <button
                      onClick={() => changeQty(i, 1)}
                      className="w-9 h-9 rounded-full bg-yellow-400 text-black hover:bg-yellow-300 transition-colors flex items-center justify-center font-bold"
                    >+</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* VIP Lounges – nur wenn vorhanden */}
        {event.lounges && event.loungeList && event.loungeList.length > 0 && (
          <section className="rounded-3xl bg-zinc-950 border border-white/10 p-7 mb-6">
            <h2 className="text-2xl font-black mb-5">VIP Lounges</h2>
            <div className="space-y-3">
              {event.loungeList.map((lounge, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedLounge(selectedLounge === i ? null : i)}
                  className={`w-full flex items-center justify-between rounded-2xl border px-5 py-4 transition-all text-left ${
                    selectedLounge === i
                      ? "border-yellow-400 bg-yellow-400/10"
                      : "border-white/10 bg-black hover:border-yellow-400/40"
                  }`}
                >
                  <div>
                    <p className="font-semibold">{lounge.name}</p>
                    <p className="text-zinc-400 text-sm">bis {lounge.persons} Personen</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-yellow-400 font-bold">{lounge.price} €</span>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedLounge === i ? "border-yellow-400 bg-yellow-400" : "border-zinc-600"}`}>
                      {selectedLounge === i && <span className="text-black text-xs font-bold">✓</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Rabattcode */}
        {event.discountCodes && event.discountCodes.length > 0 && (
          <section className="rounded-3xl bg-zinc-950 border border-white/10 p-7 mb-6">
            <h2 className="text-2xl font-black mb-5">Rabattcode</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={discountInput}
                onChange={(e) => { setDiscountInput(e.target.value); setDiscountError(""); setAppliedDiscount(null); }}
                placeholder="Code eingeben..."
                className="flex-1 rounded-2xl bg-black border border-zinc-800 focus:border-yellow-400 px-4 py-3 text-white placeholder:text-zinc-600 outline-none transition-colors text-sm"
              />
              <button
                onClick={applyDiscount}
                className="rounded-2xl bg-white/10 hover:bg-yellow-400 hover:text-black px-5 py-3 text-sm font-bold transition-colors"
              >
                Einlösen
              </button>
            </div>
            {appliedDiscount && <p className="text-green-400 text-sm mt-2">✓ Rabatt von {appliedDiscount.percent} % aktiv</p>}
            {discountError && <p className="text-red-400 text-sm mt-2">{discountError}</p>}
          </section>
        )}

        {/* Zusammenfassung & Kauf */}
        <section className="rounded-3xl bg-zinc-950 border border-white/10 p-7 mb-6">
          {/* Gesamtpreis */}
          {totalTickets > 0 && (
            <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
              <span className="text-zinc-300 font-medium">Gesamt</span>
              <span className="text-yellow-400 text-2xl font-black">
                {total.toFixed(2)} €
                {appliedDiscount && (
                  <span className="text-green-400 text-sm font-normal ml-2">−{appliedDiscount.percent} %</span>
                )}
              </span>
            </div>
          )}

          {/* 18+ */}
          <label className="flex items-start gap-3 cursor-pointer group mb-4">
            <div
              onClick={() => setIsAdult(!isAdult)}
              className={`mt-0.5 w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${isAdult ? "border-yellow-400 bg-yellow-400" : "border-zinc-600 group-hover:border-zinc-400"}`}
            >
              {isAdult && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <span className="text-zinc-300 text-sm leading-relaxed">
              Ich bestätige, dass ich mindestens <span className="text-white font-semibold">18 Jahre alt</span> bin.
            </span>
          </label>

          {/* AGB */}
          <label className="flex items-start gap-3 cursor-pointer group mb-6">
            <div
              onClick={() => setAcceptedLegal(!acceptedLegal)}
              className={`mt-0.5 w-5 h-5 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${acceptedLegal ? "border-yellow-400 bg-yellow-400" : "border-zinc-600 group-hover:border-zinc-400"}`}
            >
              {acceptedLegal && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <span className="text-zinc-300 text-sm leading-relaxed">
              Ich akzeptiere die{" "}
              <span className="text-yellow-400 underline underline-offset-2">AGB</span>{" "}
              und habe die{" "}
              <span className="text-yellow-400 underline underline-offset-2">Datenschutzerklärung</span>{" "}
              gelesen.
            </span>
          </label>

          <button
            disabled={!canProceed || loading}
            onClick={() => setCheckoutOpen(true)}
            className={`w-full rounded-2xl py-5 font-black text-base tracking-wide transition-all ${
              canProceed
                ? "bg-yellow-400 text-black hover:bg-yellow-300 active:scale-[0.98]"
                : "bg-white/10 text-zinc-600 cursor-not-allowed"
            }`}
          >
            {totalTickets === 0 ? "Ticket auswählen" : `Weiter zur Zahlung · ${total.toFixed(2)} €`}
          </button>
        </section>

        {/* Beschreibung */}
        {event.description && (
          <section className="rounded-3xl bg-zinc-950 border border-white/10 p-7">
            <h2 className="text-2xl font-black mb-4">Beschreibung</h2>
            <p className="text-zinc-300 leading-7 whitespace-pre-wrap">{event.description}</p>
          </section>
        )}
      </div>

      {/* ── Checkout Modal ── */}
      {checkoutOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6"
          onClick={() => setCheckoutOpen(false)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-t-[36px] md:rounded-[36px] w-full md:max-w-lg p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-black mb-2">Bestellung abschließen</h2>
            <p className="text-zinc-400 text-sm mb-6">
              {totalTickets} Ticket{totalTickets !== 1 ? "s" : ""} ·{" "}
              <span className="text-yellow-400 font-bold">{total.toFixed(2)} €</span>
            </p>

            {/* Name */}
            <div className="mb-4">
              <input
                value={customerName}
                onChange={(e) => { setCustomerName(e.target.value); setFormErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Vollständiger Name"
                className={`w-full rounded-2xl bg-black border px-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-colors ${formErrors.name ? "border-red-500" : "border-zinc-800 focus:border-yellow-400"}`}
              />
              {formErrors.name && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.name}</p>}
            </div>

            {/* E-Mail */}
            <div className="mb-6">
              <input
                value={customerEmail}
                onChange={(e) => { setCustomerEmail(e.target.value); setFormErrors((p) => ({ ...p, email: undefined })); }}
                placeholder="E-Mail-Adresse"
                type="email"
                className={`w-full rounded-2xl bg-black border px-5 py-4 text-white placeholder:text-zinc-600 outline-none transition-colors ${formErrors.email ? "border-red-500" : "border-zinc-800 focus:border-yellow-400"}`}
              />
              {formErrors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{formErrors.email}</p>}
            </div>

            {checkoutError && (
              <p className="text-red-400 text-sm text-center mb-4">{checkoutError}</p>
            )}

            <button
              onClick={submitOrder}
              disabled={loading}
              className="w-full bg-yellow-400 text-black rounded-2xl py-5 font-black hover:bg-yellow-300 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  Wird verarbeitet...
                </>
              ) : (
                "Jetzt mit Stripe bezahlen"
              )}
            </button>

            <button
              onClick={() => setCheckoutOpen(false)}
              className="w-full mt-3 rounded-2xl border border-white/10 py-4 text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
