"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";

type Tab = "events" | "tickets" | "rechtliches" | "scanner" | "veranstalter";
type LegalKey = "impressum" | "datenschutz" | "agb" | "teilnahme" | "widerruf";
type TicketType = { name: string; price: string; quantity: string };
type Lounge = { name: string; persons: string; price: string };
type DiscountCode = { code: string; percent: string };

type EventItem = {
  id?: string;
  title: string; city: string; date: string; time: string; onlineSaleEndsAt: string;
  location: string; address: string; imageUrl: string; price: string;
  description: string; tickets: TicketType[];
  lounges: boolean; loungeList: Lounge[]; discountCodes: DiscountCode[];
  ticketsSold?: number; totalRevenue?: number;
};

type TicketRow = {
  id: string; ticket_id: string; event_id?: string | null; event_title: string;
  customer_name: string; customer_email: string;
  amount: number; status: string; checked_in_at: string | null; created_at: string;
};

type ScanResult = { valid: boolean; reason?: string; customerName?: string; eventTitle?: string; amount?: number; };

const LEGAL_LABELS: Record<LegalKey, string> = {
  impressum: "Impressum", datenschutz: "Datenschutz",
  agb: "AGB", teilnahme: "Teilnahmebedingungen", widerruf: "Widerrufsrecht",
};

const EMPTY: EventItem = {
  title: "", city: "", date: "", time: "", onlineSaleEndsAt: "", location: "", address: "",
  imageUrl: "", price: "", description: "",
  tickets: [{ name: "Standard", price: "", quantity: "" }],
  lounges: false, loungeList: [], discountCodes: [],
};

// Convert Supabase row → EventItem
function rowToEvent(r: any): EventItem {
  return {
    id: r.id,
    title: r.title ?? "",
    city: r.city ?? "",
    date: r.date ?? "",
    time: r.time ?? "",
    onlineSaleEndsAt: r.online_sale_ends_at ? new Date(r.online_sale_ends_at).toISOString().slice(0, 16) : "",
    location: r.location ?? "",
    address: r.address ?? "",
    imageUrl: r.image_url ?? "",
    price: r.price ?? "",
    description: r.description ?? "",
    tickets: r.tickets ?? [],
    lounges: r.lounges ?? false,
    loungeList: r.lounge_list ?? [],
    discountCodes: r.discount_codes ?? [],
    ticketsSold: Number(r.tickets_sold || 0),
    totalRevenue: Number(r.total_revenue || 0),
  };
}

async function uploadImage(file: File, adminPw: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch("/api/admin/upload-image", {
    method: "POST",
    headers: adminPw ? { "x-admin-token": adminPw } : undefined,
    body: formData,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.url) {
    throw new Error(data.error || "Upload fehlgeschlagen.");
  }

  return data.url;
}

const inp = "w-full rounded-xl border border-zinc-300 bg-white focus:border-yellow-400 px-4 py-3 text-black placeholder:text-zinc-600 outline-none transition-all text-sm";
const lbl = "block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide";

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-zinc-300">{label}</span>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${value ? "bg-yellow-400" : "bg-zinc-700"}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

function ScannerView({ adminPw }: { adminPw: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState("");
  const [lastScanned, setLastScanned] = useState("");

  useEffect(() => { startCamera(); return () => stopCamera(); }, []);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setScanning(true); requestAnimationFrame(tick); }
    } catch { setCamError("Kamerazugriff verweigert."); }
  }
  function stopCamera() { cancelAnimationFrame(animRef.current); (videoRef.current?.srcObject as MediaStream)?.getTracks().forEach(t => t.stop()); }
  function tick() {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c || v.readyState !== v.HAVE_ENOUGH_DATA) { animRef.current = requestAnimationFrame(tick); return; }
    const ctx = c.getContext("2d")!; c.width = v.videoWidth; c.height = v.videoHeight;
    ctx.drawImage(v, 0, 0); const img = ctx.getImageData(0, 0, c.width, c.height);
    const code = jsQR(img.data, img.width, img.height);
    if (code?.data && code.data !== lastScanned) { setLastScanned(code.data); validate(code.data); return; }
    animRef.current = requestAnimationFrame(tick);
  }
  async function validate(ticketId: string) {
    setScanning(false);
    const res = await fetch("/api/validate-ticket", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-token": adminPw }, body: JSON.stringify({ ticketId }) });
    setResult(await res.json());
    setTimeout(() => { setResult(null); setLastScanned(""); setScanning(true); requestAnimationFrame(tick); }, 4000);
  }

  return (
    <div className="max-w-sm mx-auto">
      <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!result && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="relative w-44 h-44">
              {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl","top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl","bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl","bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl"].map((cls, i) => (
                <div key={i} className={`absolute w-8 h-8 border-yellow-400 ${cls}`} />
              ))}
              {scanning && <div className="absolute left-2 right-2 h-px bg-yellow-400/80 top-1/2 animate-bounce" />}
            </div>
            <p className="mt-4 text-white/60 text-sm">QR-Code in den Rahmen halten</p>
          </div>
        )}
        {result && (
          <div className={`absolute inset-0 flex items-center justify-center p-6 ${result.valid ? "bg-green-600/95" : "bg-red-600/95"}`}>
            <div className="text-center text-white">
              <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white flex items-center justify-center mx-auto mb-4 text-4xl font-bold">{result.valid ? "✓" : "✕"}</div>
              <h3 className="text-2xl font-bold mb-1">{result.valid ? "Gültig" : "Ungültig"}</h3>
              {result.valid ? (<><p className="font-semibold text-lg">{result.customerName}</p><p className="text-white/80 text-sm">{result.eventTitle}</p></>) : <p className="text-white/90">{result.reason}</p>}
            </div>
          </div>
        )}
        {camError && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/95 p-6 text-center">
            <div><p className="text-zinc-700 text-sm mb-4">{camError}</p><button onClick={startCamera} className="rounded-xl bg-yellow-400 text-black font-bold px-5 py-2.5 text-sm">Erneut versuchen</button></div>
          </div>
        )}
      </div>
    </div>
  );
}


function VeranstalterEinladen({ adminPw }: { adminPw: string }) {
  const [email, setEmail] = useState("");
  const [firmenname, setFirmenname] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!email || !firmenname) { setError("E-Mail und Firmenname sind Pflichtfelder."); return; }
    setLoading(true); setError(""); setMsg("");
    const res = await fetch("/api/admin/veranstalter/einladen", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": adminPw },
      body: JSON.stringify({ email, firmenname }),
    });
    const data = await res.json();
    if (data.error) setError("API Fehler: " + data.error);
    else { setMsg("✅ Einladung an " + email + " gesendet!"); setEmail(""); setFirmenname(""); }
    setLoading(false);
  };

  return (
    <div>
      <h1 className="text-lg font-bold mb-5">Veranstalter einladen</h1>
      {msg && <div className="bg-green-950 border border-green-700 rounded-xl p-3 mb-4 text-green-400 text-sm">{msg}</div>}
      {error && <div className="bg-red-950 border border-red-700 rounded-xl p-3 mb-4 text-red-400 text-sm">{error}</div>}
      <div className="mb-4">
        <label className="block text-xs text-zinc-600 mb-1">Firmenname</label>
        <input value={firmenname} onChange={e => setFirmenname(e.target.value)} placeholder="z.B. Event GmbH" className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm" />
      </div>
      <div className="mb-5">
        <label className="block text-xs text-zinc-600 mb-1">E-Mail Adresse</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="veranstalter@email.de" className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm" />
      </div>
      <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-yellow-400 text-black font-bold rounded-xl text-sm disabled:opacity-50">
        {loading ? "Sende..." : "✉️ Einladung senden"}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState(""); const [pwErr, setPwErr] = useState(""); const [adminPw, setAdminPw] = useState("");
  const [tab, setTab] = useState<Tab>("events");
  const [showForm, setShowForm] = useState(false);
  const [ev, setEv] = useState<EventItem>(EMPTY);
  const [evIdx, setEvIdx] = useState<string | null>(null); // now stores Supabase ID
  const [events, setEvents] = useState<EventItem[]>([]);
  const [evLoading, setEvLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [selectedTicketEventId, setSelectedTicketEventId] = useState("");
  const [legal, setLegal] = useState<Record<LegalKey, string>>({ impressum: "", datenschutz: "", agb: "", teilnahme: "", widerruf: "" });
  const [legalTab, setLegalTab] = useState<LegalKey>("impressum");
  const [legalSaved, setLegalSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    // Middleware schützt die Route - wenn wir hier sind, sind wir eingeloggt
    setAuthed(true);
    setAdminPw(process.env.NEXT_PUBLIC_ADMIN_PW ?? "");
  }, []);

  useEffect(() => {
    if (authed) { loadEvents(); loadLegal(); }
  }, [authed]);

  async function loadEvents() {
    setEvLoading(true);
    const res = await fetch("/api/admin/events", {
      headers: adminPw ? { "x-admin-token": adminPw } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEvents((data.events ?? []).map(rowToEvent));
    } else {
      console.error("Events laden Fehler:", data.error);
      setEvents([]);
    }
    setEvLoading(false);
  }

  async function loadLegal() {
    const res = await fetch("/api/admin/settings", {
      headers: adminPw ? { "x-admin-token": adminPw } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const map: Record<string, string> = {};
      (data.settings ?? []).forEach((r: any) => { map[r.key] = r.value; });
      setLegal({
        impressum: map.impressum ?? "",
        datenschutz: map.datenschutz ?? "",
        agb: map.agb ?? "",
        teilnahme: map.teilnahme ?? "",
        widerruf: map.widerruf ?? "",
      });
    } else {
      console.error("Rechtliches laden Fehler:", data.error);
    }
  }

  async function saveLegal() {
    setLegalSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(adminPw ? { "x-admin-token": adminPw } : {}),
      },
      body: JSON.stringify({ settings: legal }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("Speichern fehlgeschlagen: " + (data.error || "Unbekannter Fehler"));
      return;
    }

    setLegalSaved(true);
    setTimeout(() => setLegalSaved(false), 2000);
  }

  async function loadTickets(event?: EventItem) {
    setTicketLoading(true);

    if (!event) {
      setTickets([]);
      setTicketLoading(false);
      return;
    }

    const params = new URLSearchParams();
    if (event.id) params.set("eventId", event.id);
    params.set("eventTitle", event.title);

    const res = await fetch(`/api/admin/tickets?${params.toString()}`, {
      headers: adminPw ? { "x-admin-token": adminPw } : undefined,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      console.error("Tickets laden Fehler:", data.error);
      setTickets([]);
      setTicketLoading(false);
      return;
    }

    setTickets(data.tickets ?? []);

    setTicketLoading(false);
  }

  async function login() {
    setPwErr("");
    const res = await fetch("/api/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) { setAdminPw(pw); setAuthed(true); }
    else setPwErr("Falsches Passwort.");
  }

  async function logout() {
    await fetch("/api/admin-login", { method: "DELETE" });
    setAuthed(false);
  }

  async function saveEv() {
    if (!ev.title) return;
    setSaveLoading(true);
    const res = await fetch("/api/admin/events", {
      method: evIdx ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(adminPw ? { "x-admin-token": adminPw } : {}),
      },
      body: JSON.stringify({ event: evIdx ? { ...ev, id: evIdx } : ev }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("Speichern fehlgeschlagen: " + (data.error || "Unbekannter Fehler"));
      setSaveLoading(false);
      return;
    }

    await loadEvents();
    setSaveLoading(false);
    setShowForm(false);
  }

  async function delEv(id: string) {
    if (!confirm("Event wirklich löschen?")) return;

    const res = await fetch(`/api/admin/events/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert("Löschen fehlgeschlagen: " + (data.error || "Unbekannter Fehler"));
      return;
    }

    await loadEvents();
  }

  function showEventTickets(id?: string) {
    const event = events.find(e => e.id === id);
    setSelectedTicketEventId(id || "");
    setTab("tickets");
    loadTickets(event);
  }

  function openNew() { setEv(JSON.parse(JSON.stringify(EMPTY))); setEvIdx(null); setShowForm(true); }
  function openEdit(e: EventItem) { setEv(JSON.parse(JSON.stringify(e))); setEvIdx(e.id ?? null); setShowForm(true); }
  function f<K extends keyof EventItem>(k: K, v: EventItem[K]) { setEv(p => ({ ...p, [k]: v })); }
  function setTix(i: number, k: keyof TicketType, v: string) { const t = [...ev.tickets]; t[i] = { ...t[i], [k]: v }; f("tickets", t); }
  function setLng(i: number, k: keyof Lounge, v: string) { const l = [...ev.loungeList]; l[i] = { ...l[i], [k]: v }; f("loungeList", l); }
  function setDC(i: number, k: keyof DiscountCode, v: string) { const d = [...ev.discountCodes]; d[i] = { ...d[i], [k]: v }; f("discountCodes", d); }

  async function cancelTicket(ticketId: string, name: string) {
    if (!confirm(`Ticket von ${name} wirklich stornieren? Der Kunde erhält sein Geld zurück.`)) return;
    const res = await fetch("/api/cancel-ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": adminPw },
      body: JSON.stringify({ ticketId }),
    });
    if (res.ok) { alert("✅ Storniert! Kunde wird per E-Mail informiert."); loadTickets(selectedTicketEvent); }
    else { const d = await res.json(); alert("Fehler: " + d.error); }
  }

  function ticketBelongsToEvent(ticket: TicketRow, event: EventItem) {
    return ticket.event_id === event.id || (!ticket.event_id && ticket.event_title === event.title);
  }

  const selectedTicketEvent = events.find(event => event.id === selectedTicketEventId);
  const filtered = selectedTicketEvent ? tickets.filter(ticket => ticketBelongsToEvent(ticket, selectedTicketEvent)) : [];
  const selectedRevenue = filtered.reduce((s, t) => s + t.amount, 0);
  const selectedCheckedIn = filtered.filter(t => t.status === "checked_in").length;
  const eventTicketStats = events.map(event => {
    return {
      event,
      total: event.ticketsSold || 0,
      checkedIn: 0,
      revenue: (event.totalRevenue || 0) / 100,
    };
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "events", label: "Events" },
    { key: "tickets", label: "Tickets" },
    { key: "rechtliches", label: "Rechtliches" },
    { key: "scanner", label: "Scanner" },
    { key: "veranstalter", label: "Veranstalter" },
  ];

  if (!authed) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/wolnaa-logo.png" alt="Wolnaa" className="h-16 w-auto mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white">Admin</h1>
            <p className="text-zinc-600 text-sm mt-1">Bitte anmelden</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className={lbl}>Passwort</label>
              <input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwErr(""); }} onKeyDown={e => e.key === "Enter" && login()} placeholder="••••••••" className={inp} autoFocus />
              {pwErr && <p className="text-red-400 text-xs mt-1.5">{pwErr}</p>}
            </div>
            <button onClick={login} className="w-full rounded-xl bg-yellow-400 text-black font-bold py-3 hover:bg-yellow-300 transition-colors">Anmelden</button>
          </div>
          <p className="text-center mt-5"><Link href="/" className="text-zinc-600 text-sm hover:text-zinc-700">← Zurück zur Website</Link></p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col">
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <img src="/wolnaa-logo.png" alt="Wolnaa" className="h-8 w-auto" />
            <span className="font-bold text-sm hidden sm:block">Admin</span>
          </div>
          <nav className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-yellow-400 text-black" : "text-zinc-700 hover:text-white hover:bg-zinc-800"}`}>{t.label}</button>
            ))}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <Link href="/" className="hidden sm:flex items-center gap-1.5 rounded-lg border border-zinc-700 text-zinc-300 text-xs px-3 py-1.5 hover:border-yellow-400 hover:text-yellow-400 transition-colors">
              ← Zur Website
            </Link>
            <button onClick={logout} className="text-zinc-600 text-xs hover:text-white">Logout</button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24 md:pb-8">

        {/* Events */}
        {tab === "events" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div><h1 className="text-lg font-bold">Events</h1><p className="text-zinc-600 text-xs mt-0.5">{events.length} gesamt</p></div>
              <button onClick={openNew} className="rounded-xl bg-yellow-400 text-black font-bold px-4 py-2 text-sm hover:bg-yellow-300 transition-colors">+ Neues Event</button>
            </div>
            {evLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : events.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border-2 border-dashed border-zinc-800">
                <p className="text-zinc-600 text-sm mb-3">Noch keine Events vorhanden.</p>
                <button onClick={openNew} className="rounded-xl bg-yellow-400 text-black font-bold px-4 py-2 text-sm">Event erstellen</button>
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((e) => (
                  <div key={e.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      {e.imageUrl ? <img src={e.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-zinc-800 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{e.title}</p>
                        <p className="text-zinc-600 text-xs">{e.city}{e.location ? ` · ${e.location}` : ""}</p>
                        <p className="text-yellow-400 text-xs">{e.date}{e.time ? ` · ${e.time}` : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-200">
                      <button onClick={() => openEdit(e)} className="flex-1 rounded-xl border border-zinc-700 text-zinc-300 text-xs py-2 hover:border-yellow-400 hover:text-yellow-400 transition-colors font-medium">Bearbeiten</button>
                      <button onClick={() => showEventTickets(e.id)} className="flex-1 rounded-xl border border-zinc-700 text-zinc-300 text-xs py-2 hover:border-yellow-400 hover:text-yellow-400 transition-colors font-medium">Tickets</button>
                      <button onClick={() => delEv(e.id!)} className="flex-1 rounded-xl border border-zinc-800 text-zinc-600 text-xs py-2 hover:border-red-500/50 hover:text-red-400 transition-colors font-medium">Löschen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tickets */}
        {tab === "tickets" && (
          <div>
            <div className="mb-5">
              <h1 className="text-lg font-bold">Tickets</h1>
              <p className="text-zinc-600 text-xs mt-0.5">{selectedTicketEvent ? `Kundendaten für ${selectedTicketEvent.title}` : "Bitte Veranstaltung auswählen"}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[{ l: "Tickets", v: filtered.length }, { l: "Eingecheckt", v: selectedCheckedIn }, { l: "Umsatz", v: `€${selectedRevenue.toFixed(2)}` }].map(s => (
                <div key={s.l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                  <p className="text-xl font-bold text-yellow-400">{s.v}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              {selectedTicketEvent ? (
                <div className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300">
                  {selectedTicketEvent.title}
                </div>
              ) : (
                <div className="flex-1 rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-600">
                  Wähle unten eine Veranstaltung aus.
                </div>
              )}
              {selectedTicketEvent && <button onClick={() => setSelectedTicketEventId("")} className="rounded-xl border border-zinc-700 px-4 text-zinc-700 hover:text-white text-sm transition-colors">Wechseln</button>}
              <button onClick={() => loadTickets(selectedTicketEvent)} className="rounded-xl border border-zinc-700 px-4 text-zinc-700 hover:text-white text-sm transition-colors">↻</button>
            </div>
            {ticketLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
            ) : !selectedTicketEvent ? (
              <div className="space-y-2">
                {eventTicketStats.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl border border-zinc-800 text-zinc-600 text-sm">Keine Veranstaltungen vorhanden.</div>
                ) : eventTicketStats.map(({ event, total, checkedIn, revenue }) => (
                  <button key={event.id || event.title} onClick={() => { setSelectedTicketEventId(event.id || ""); loadTickets(event); }} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 hover:border-yellow-400 transition-colors text-left">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-white">{event.title}</p>
                        <p className="text-zinc-600 text-xs mt-1">{event.date}{event.location ? ` · ${event.location}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-5 shrink-0 text-right">
                        <div><p className="text-yellow-400 font-bold text-sm">{total}</p><p className="text-zinc-600 text-xs">Tickets</p></div>
                        <div><p className="text-green-400 font-bold text-sm">{checkedIn}</p><p className="text-zinc-600 text-xs">Check-in</p></div>
                        <div><p className="text-white font-bold text-sm">€{revenue.toFixed(2)}</p><p className="text-zinc-600 text-xs">Umsatz</p></div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-zinc-800">{["Name & E-Mail", "Event", "Betrag", "Status", "Check-in", ""].map(h => <th key={h} className="text-left text-zinc-600 font-medium px-4 py-3 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {filtered.length === 0 ? <tr><td colSpan={6} className="text-center text-zinc-600 py-10 text-sm">Keine Einträge für diese Veranstaltung.</td></tr>
                        : filtered.map(t => (
                          <tr key={t.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                            <td className="px-4 py-3"><p className="font-semibold text-sm">{t.customer_name}</p><p className="text-zinc-600 text-xs">{t.customer_email}</p></td>
                            <td className="px-4 py-3 text-zinc-700 text-xs whitespace-nowrap">{t.event_title}</td>
                            <td className="px-4 py-3 font-bold text-sm whitespace-nowrap">€{t.amount.toFixed(2)}</td>
                            <td className="px-4 py-3 whitespace-nowrap"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.status === "checked_in" ? "bg-green-400/10 text-green-400" : t.status === "cancelled" ? "bg-red-400/10 text-red-400" : "bg-yellow-400/10 text-yellow-400"}`}>{t.status === "checked_in" ? "✓ Eingecheckt" : t.status === "cancelled" ? "✕ Storniert" : "Bezahlt"}</span></td>
                            <td className="px-4 py-3 whitespace-nowrap">{t.status !== "cancelled" && <button onClick={() => cancelTicket(t.ticket_id, t.customer_name)} className="rounded-lg border border-red-500/30 text-red-400 text-xs px-3 py-1.5 hover:bg-red-500/10 transition-colors font-medium">Stornieren</button>}</td>
                            <td className="px-4 py-3 text-zinc-600 text-xs whitespace-nowrap">{t.checked_in_at ? new Date(t.checked_in_at).toLocaleString("de-DE") : "—"}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rechtliches */}
        {tab === "rechtliches" && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div><h1 className="text-lg font-bold">Rechtliches</h1><p className="text-zinc-600 text-xs mt-0.5">Texte verwalten</p></div>
              <button onClick={saveLegal} className={`rounded-xl font-bold px-4 py-2 text-sm transition-colors ${legalSaved ? "bg-green-500 text-white" : "bg-yellow-400 text-black hover:bg-yellow-300"}`}>{legalSaved ? "✓ Gespeichert" : "Speichern"}</button>
            </div>
            <div className="flex gap-1 mb-4 bg-zinc-900 border border-zinc-800 rounded-xl p-1 overflow-x-auto">
              {(Object.keys(LEGAL_LABELS) as LegalKey[]).map(k => (
                <button key={k} onClick={() => setLegalTab(k)} className={`shrink-0 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${legalTab === k ? "bg-yellow-400 text-black" : "text-zinc-600 hover:text-white"}`}>{LEGAL_LABELS[k]}</button>
              ))}
            </div>
            <textarea value={legal[legalTab]} onChange={e => setLegal(p => ({ ...p, [legalTab]: e.target.value }))} placeholder={`${LEGAL_LABELS[legalTab]} hier eingeben...`} rows={20} className={inp + " resize-none"} />
          </div>
        )}

        {/* Scanner */}
        {tab === "scanner" && (
          <div>
            <div className="mb-5"><h1 className="text-lg font-bold">Check-In Scanner</h1><p className="text-zinc-600 text-xs mt-0.5">QR-Codes scannen</p></div>
            <ScannerView adminPw={adminPw} />
          </div>
        )}

        {tab === "veranstalter" && (
          <div className="p-5">
            <VeranstalterEinladen adminPw={adminPw} />
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-zinc-200">
        <div className="flex">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex-1 py-3.5 text-center text-xs font-semibold transition-colors border-t-2 ${tab === t.key ? "text-yellow-400 border-yellow-400 bg-zinc-800/50" : "text-zinc-600 border-transparent"}`}>{t.label}</button>
          ))}
        </div>
      </nav>

      {/* Event Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="w-full md:max-w-2xl bg-white border border-zinc-200 rounded-t-3xl md:rounded-3xl max-h-[95vh] overflow-y-auto text-black" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-bold text-base">{evIdx ? "Event bearbeiten" : "Neues Event erstellen"}</h2>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 rounded-lg border border-zinc-300 text-zinc-600 hover:text-black flex items-center justify-center">✕</button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50"><p className="text-base font-bold text-zinc-900 mb-0">Allgemein</p></div>
                <div className="p-4 space-y-3">
                  <div><label className={lbl}>Event-Name *</label><input value={ev.title} onChange={e => f("title", e.target.value)} placeholder="z.B. Wolna Berlin" className={inp} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Stadt *</label><input value={ev.city} onChange={e => f("city", e.target.value)} placeholder="Berlin" className={inp} /></div>
                    <div><label className={lbl}>Location</label><input value={ev.location} onChange={e => f("location", e.target.value)} placeholder="Club Name" className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className={lbl}>Datum *</label><input type="date" value={ev.date} onChange={e => f("date", e.target.value)} className={inp} /></div>
                    <div>
                      <label className={lbl}>Uhrzeit (z.B. 22:00)</label>
                      <input type="text" inputMode="numeric" value={ev.time} onChange={e => { let v = e.target.value.replace(/[^0-9:]/g, ""); if (v.length === 2 && !v.includes(":") && ev.time.length < 2) v += ":"; if (v.length <= 5) f("time", v); }} placeholder="22:00" maxLength={5} className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className={lbl}>Online-Verkauf bis</label>
                    <input type="datetime-local" value={ev.onlineSaleEndsAt} onChange={e => f("onlineSaleEndsAt", e.target.value)} className={inp} />
                    <p className="text-zinc-600 text-xs mt-1">Nach diesem Zeitpunkt können online keine Tickets mehr gekauft werden.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50"><p className="text-base font-bold text-zinc-900 mb-0">Adresse & Bild</p></div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className={lbl}>Adresse (Google Maps)</label>
                    <input value={ev.address} onChange={e => f("address", e.target.value)} placeholder="Musterstr. 1, 10115 Berlin" className={inp} />
                    {ev.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noopener noreferrer" className="text-yellow-400 text-xs mt-1.5 inline-block hover:underline">In Google Maps prüfen →</a>}
                  </div>
                  <div>
                    <label className={lbl}>Bild hochladen</label>
                    <div className="space-y-2">
                      <label className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-zinc-300 hover:border-yellow-400 py-4 cursor-pointer transition-colors bg-white">
                        <svg className="w-5 h-5 text-zinc-900" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <span className="text-zinc-900 text-sm font-semibold">{uploadingImage ? "Wird hochgeladen..." : "Bild auswählen"}</span>
                        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingImage(true);
                          try {
                            const url = await uploadImage(file, adminPw);
                            f("imageUrl", url);
                          } catch (err: any) { alert(err?.message || "Upload fehlgeschlagen."); }
                          finally { setUploadingImage(false); }
                        }} />
                      </label>
                      <input value={ev.imageUrl} onChange={e => f("imageUrl", e.target.value)} placeholder="oder Bild-URL eingeben..." className={inp} />
                    </div>
                    {ev.imageUrl && <img src={ev.imageUrl} alt="" className="mt-2 h-24 w-full object-cover rounded-xl" onError={e => (e.currentTarget.style.display = "none")} />}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50"><p className="text-base font-bold text-zinc-900 mb-0">Beschreibung</p></div>
                <div className="p-4"><textarea value={ev.description} onChange={e => f("description", e.target.value)} placeholder="Beschreibe das Event..." rows={4} className={inp + " resize-none"} /></div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                  <p className="text-base font-bold text-zinc-900 mb-0">Ticket-Typen</p>
                  <button onClick={() => f("tickets", [...ev.tickets, { name: "", price: "", quantity: "" }])} className="text-yellow-400 text-xs font-bold hover:text-yellow-300">+ Hinzufügen</button>
                </div>
                <div className="p-4 space-y-3">
                  {ev.tickets.map((t, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between"><p className="text-xs text-zinc-600">Ticket {i + 1}</p><button onClick={() => f("tickets", ev.tickets.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-600 text-xs transition-colors">Entfernen</button></div>
                      <div className="grid grid-cols-3 gap-2">
                        <input placeholder="Name" value={t.name} onChange={e => setTix(i, "name", e.target.value)} className={inp} />
                        <input placeholder="Preis €" value={t.price} onChange={e => setTix(i, "price", e.target.value)} inputMode="decimal" className={inp} />
                        <input placeholder="Anzahl" value={t.quantity} onChange={e => setTix(i, "quantity", e.target.value)} inputMode="numeric" className={inp} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50"><p className="text-base font-bold text-zinc-900 mb-0">Lounge</p></div>
                <div className="p-4 space-y-3">
                  <Toggle value={ev.lounges} onChange={v => f("lounges", v)} label="Lounges anbieten" />
                  {ev.lounges && (
                    <div className="space-y-3 pt-3 border-t border-zinc-200">
                      {ev.loungeList.map((l, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex justify-between"><p className="text-xs text-zinc-600">Lounge {i + 1}</p><button onClick={() => f("loungeList", ev.loungeList.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-600 text-xs transition-colors">Entfernen</button></div>
                          <div className="grid grid-cols-3 gap-2">
                            <input placeholder="Name" value={l.name} onChange={e => setLng(i, "name", e.target.value)} className={inp} />
                            <input placeholder="Personen" value={l.persons} onChange={e => setLng(i, "persons", e.target.value)} inputMode="numeric" className={inp} />
                            <input placeholder="Preis €" value={l.price} onChange={e => setLng(i, "price", e.target.value)} inputMode="decimal" className={inp} />
                          </div>
                        </div>
                      ))}
                      <button onClick={() => f("loungeList", [...ev.loungeList, { name: "", persons: "", price: "" }])} className="text-yellow-400 text-xs font-bold hover:text-yellow-300 transition-colors">+ Lounge hinzufügen</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                  <p className="text-base font-bold text-zinc-900 mb-0">Rabattcodes</p>
                  <button onClick={() => f("discountCodes", [...ev.discountCodes, { code: "", percent: "" }])} className="text-yellow-400 text-xs font-bold hover:text-yellow-300">+ Hinzufügen</button>
                </div>
                <div className="p-4 space-y-3">
                  {ev.discountCodes.length === 0 && <p className="text-zinc-600 text-xs">Keine Rabattcodes konfiguriert.</p>}
                  {ev.discountCodes.map((d, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between"><p className="text-xs text-zinc-600">Code {i + 1}</p><button onClick={() => f("discountCodes", ev.discountCodes.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-600 text-xs transition-colors">Entfernen</button></div>
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="CODE (z.B. WOLNAA10)" value={d.code} onChange={e => setDC(i, "code", e.target.value.toUpperCase())} className={inp + " font-mono uppercase"} />
                        <input placeholder="Rabatt in % (z.B. 10)" value={d.percent} onChange={e => setDC(i, "percent", e.target.value)} inputMode="numeric" className={inp} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-zinc-200 px-5 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-zinc-300 py-3.5 text-sm font-semibold text-zinc-600 hover:text-black transition-colors">Abbrechen</button>
              <button onClick={saveEv} disabled={!ev.title || saveLoading} className="flex-1 rounded-xl bg-yellow-400 text-black font-bold py-3.5 text-sm hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {saveLoading ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Speichern...</> : (evIdx ? "Änderungen speichern" : "Event erstellen")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
