"use client";
import {berlinLocal,berlinInstant,defaultEndLocal,eventTiming} from '@/lib/event-timing';
import {splitAdminEvents} from '@/lib/admin-event-scope';
import {useEventClock} from '@/lib/use-event-clock';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";

function berlinInstantForDisplay(value:string) { try { return berlinInstant(value); } catch { return null; } }

type Tab = "overview" | "archiv" | "events" | "besucher" | "tickets" | "rechtliches" | "scanner" | "veranstalter" | "einstellungen";
type LegalKey = "impressum" | "datenschutz" | "agb" | "teilnahme" | "widerruf";
type TicketType = { name: string; price: string; quantity: string };
type Lounge = { name: string; persons: string; price: string };
type DiscountCode = { code: string; percent: string };

type EventItem = {
  id?: string;
  title: string; city: string; date: string; time: string; onlineSaleEndsAt: string; eventEndsAt: string; minAge: 16 | 18;
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
type AnalyticsData = {
  wheelSpins?: number;
  purchaseSources?: Record<string,number>;
  days: Record<string, { views: number; visits: number }>;
  paths: Record<string, number>;
  referrers: Record<string, number>;
  devices: Record<string, number>;
  checkouts: Record<string, number>;
  events: Array<{ id: string; title: string; slug?: string | null; date: string; time?: string; event_ends_at?: string | null; tickets_sold?: number | null; total_revenue?: number | null }>;
};

const EMPTY_ANALYTICS: AnalyticsData = { days: {}, paths: {}, referrers: {}, devices: {}, checkouts: {}, events: [] };

const LEGAL_LABELS: Record<LegalKey, string> = {
  impressum: "Impressum", datenschutz: "Datenschutz",
  agb: "AGB", teilnahme: "Teilnahmebedingungen", widerruf: "Widerrufsrecht",
};

const EMPTY: EventItem = {
  title: "", city: "", date: "", time: "", onlineSaleEndsAt: "", eventEndsAt: "", minAge: 18, location: "", address: "",
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
    onlineSaleEndsAt: r.online_sale_ends_at ? berlinLocal(r.online_sale_ends_at) : "",
    minAge: r.min_age === 16 ? 16 : 18,
    eventEndsAt: r.event_ends_at ? berlinLocal(r.event_ends_at) : defaultEndLocal(r.date),
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

const inp = "w-full rounded-xl border border-zinc-300 bg-white focus:border-[#d6b36a] px-4 py-3 text-black placeholder:text-zinc-600 outline-none transition-all text-sm";
const lbl = "block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide";
const saleEndDate = (value: string) => value.slice(0, 10);
const saleEndTime = (value: string) => value.includes("T") ? value.slice(11, 16) : "";

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-zinc-700">{label}</span>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 shrink-0 ${value ? "bg-[#d6b36a]" : "bg-zinc-700"}`}>
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
                <div key={i} className={`absolute w-8 h-8 border-[#d6b36a] ${cls}`} />
              ))}
              {scanning && <div className="absolute left-2 right-2 h-px bg-[#d6b36a]/80 top-1/2 animate-bounce" />}
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
            <div><p className="text-zinc-700 text-sm mb-4">{camError}</p><button onClick={startCamera} className="rounded-xl bg-[#d6b36a] text-black font-bold px-5 py-2.5 text-sm">Erneut versuchen</button></div>
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
      {msg && <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 text-green-700 text-sm">{msg}</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-red-700 text-sm">{error}</div>}
      <div className="mb-4">
        <label className="block text-xs text-zinc-600 mb-1">Firmenname</label>
        <input value={firmenname} onChange={e => setFirmenname(e.target.value)} placeholder="z.B. Event GmbH" className="w-full p-3 bg-white border border-zinc-300 rounded-xl text-zinc-950 text-sm outline-none focus:border-[#d6b36a]" />
      </div>
      <div className="mb-5">
        <label className="block text-xs text-zinc-600 mb-1">E-Mail Adresse</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="veranstalter@email.de" className="w-full p-3 bg-white border border-zinc-300 rounded-xl text-zinc-950 text-sm outline-none focus:border-[#d6b36a]" />
      </div>
      <button onClick={handleSubmit} disabled={loading} className="w-full py-3 bg-[#d6b36a] text-black font-bold rounded-xl text-sm disabled:opacity-50">
        {loading ? "Sende..." : "✉️ Einladung senden"}
      </button>
    </div>
  );
}

export default function AdminPage() {
  const eventNow = useEventClock();
  const [authed, setAuthed] = useState(false);
  const [adminPw, setAdminPw] = useState("");
  const [tab, setTab] = useState<Tab>("overview");
  const [showForm, setShowForm] = useState(false);
  const [ev, setEv] = useState<EventItem>(EMPTY);
  const [evIdx, setEvIdx] = useState<string | null>(null); // now stores Supabase ID
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventError, setEventError] = useState("");
  const [evLoading, setEvLoading] = useState(false);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [selectedTicketEventId, setSelectedTicketEventId] = useState("");
  const [legal, setLegal] = useState<Record<LegalKey, string>>({ impressum: "", datenschutz: "", agb: "", teilnahme: "", widerruf: "" });
  const [legalTab, setLegalTab] = useState<LegalKey>("impressum");
  const [legalSaved, setLegalSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPasswordRepeat, setAccountPasswordRepeat] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsData>(EMPTY_ANALYTICS);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [eventSearch, setEventSearch] = useState("");
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30>(7);

  useEffect(() => {
    // Middleware schützt die Route - wenn wir hier sind, sind wir eingeloggt
    setAuthed(true);
    setAdminPw(process.env.NEXT_PUBLIC_ADMIN_PW ?? "");
  }, []);

  useEffect(() => {
    if (authed) { loadEvents(); loadLegal(); loadAccount(); loadAnalytics(); }
  }, [authed]);

  async function loadAccount() {
    const res = await fetch("/api/admin/account", {
      headers: adminPw ? { "x-admin-token": adminPw } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setAccountEmail(data.email || "");
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    setAnalyticsError("");
    try {
      const res = await fetch("/api/admin/overview", {
        headers: adminPw ? { "x-admin-token": adminPw } : undefined,
        cache: "no-store",
      });
      const data = await res.json();
      if (res.ok) setAnalytics({ ...EMPTY_ANALYTICS, ...data });
      else setAnalyticsError(data.error || "Besucherdaten konnten nicht geladen werden.");
    } catch {
      setAnalyticsError("Besucherdaten konnten nicht geladen werden.");
    }
    setAnalyticsLoading(false);
  }

  async function saveAccount() {
    setAccountMessage("");
    setAccountError("");
    if (accountPassword && accountPassword !== accountPasswordRepeat) {
      setAccountError("Die Passwörter stimmen nicht überein.");
      return;
    }
    setAccountLoading(true);
    const res = await fetch("/api/admin/account", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(adminPw ? { "x-admin-token": adminPw } : {}),
      },
      body: JSON.stringify({ email: accountEmail, password: accountPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setAccountLoading(false);
    if (!res.ok) {
      setAccountError(data.error || "Einstellungen konnten nicht gespeichert werden.");
      return;
    }
    setAccountEmail(data.email || accountEmail);
    setAccountPassword("");
    setAccountPasswordRepeat("");
    setAccountMessage("E-Mail-Adresse und Zugang wurden gespeichert.");
  }

  async function loadEvents() {
    setEvLoading(true);
    setEventError("");
    try {
    const res = await fetch("/api/admin/events", {
      headers: adminPw ? { "x-admin-token": adminPw } : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setEvents((data.events ?? []).map(rowToEvent));
    } else {
      setEventError(data.error || "Veranstaltungen konnten nicht geladen werden.");
    }
    } catch { setEventError("Veranstaltungen konnten nicht geladen werden."); }
    finally { setEvLoading(false); }
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
    void loadAnalytics();
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
    void loadAnalytics();
  }

  function showEventTickets(id?: string) {
    const event = events.find(e => e.id === id);
    setSelectedTicketEventId(id || "");
    navigateTab("tickets");
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

  const isPast = (event: EventItem) => eventTiming({date:event.date,time:event.time,event_ends_at:event.eventEndsAt ? berlinInstantForDisplay(event.eventEndsAt) : null}, eventNow).ended;
  const currentEvents = eventNow ? events.filter(event => !isPast(event)).sort((a,b) => a.date.localeCompare(b.date)) : [];
  const archivedEvents = eventNow ? events.filter(isPast).sort((a,b) => b.date.localeCompare(a.date)) : [];
  const visibleEvents = (tab === "archiv" ? archivedEvents : currentEvents).filter(event => `${event.title} ${event.city}`.toLowerCase().includes(eventSearch.toLowerCase()));
  const selectedTicketEvent = events.find(event => event.id === selectedTicketEventId);
  const filtered = selectedTicketEvent ? tickets.filter(ticket => ticketBelongsToEvent(ticket, selectedTicketEvent)) : [];
  const selectedRevenue = filtered.reduce((s, t) => s + t.amount, 0);
  const selectedCheckedIn = filtered.filter(t => t.status === "checked_in").length;
  const eventTicketStats = currentEvents.map(event => {
    return {
      event,
      total: event.ticketsSold || 0,
      checkedIn: 0,
      revenue: (event.totalRevenue || 0) / 100,
    };
  });

  function navigateTab(next: Tab) {
    setTab(next); setEventSearch("");
    window.location.hash = next;
  }
  useEffect(() => {
    const sync = () => {
      const key = window.location.hash.slice(1);
      if (["overview","events","archiv","besucher","tickets","rechtliches","scanner","veranstalter","einstellungen"].includes(key)) setTab(key as Tab);
      else setTab("overview");
    };
    sync(); window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  const analyticsDates = Array.from({ length: analyticsDays }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (analyticsDays - 1 - index));
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(date);
  });
  const analyticsPeriod = analyticsDates.map(date => ({ date, ...(analytics.days[date] ?? { views: 0, visits: 0 }) }));
  const periodViews = analyticsPeriod.reduce((sum, day) => sum + day.views, 0);
  const periodVisits = analyticsPeriod.reduce((sum, day) => sum + day.visits, 0);
  const maxViews = Math.max(1, ...analyticsPeriod.map(day => day.views));
  const topEntries = (entries: Record<string, number>) => Object.entries(entries).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const totalDevices = Object.values(analytics.devices).reduce((sum, count) => sum + count, 0);
  const allEventConversions = analytics.events.map(event => {
    const slug = event.slug || event.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]+/g, "");
    const views = analytics.paths[`/event/${slug}`] ?? analytics.paths[`/event/${event.id}`] ?? 0;
    const checkouts = analytics.checkouts[event.id] ?? 0;
    const sold = Number(event.tickets_sold || 0);
    const revenue = Number(event.total_revenue || 0) / 100;
    return { ...event, views, checkouts, sold, revenue, conversion: views ? (sold / views) * 100 : 0 };
  }).sort((a, b) => b.views - a.views || b.sold - a.sold);

  const {current:eventConversions, archived:archivedConversions} = splitAdminEvents(allEventConversions,eventNow);
  const activeTotals = eventConversions.reduce((sum,event) => ({views:sum.views+event.views,sold:sum.sold+event.sold,revenue:sum.revenue+event.revenue}),{views:0,sold:0,revenue:0});
  const metrics = (rows: typeof eventConversions) => <div className="admin-performance-list">{rows.length ? rows.map(event => <article key={event.id} className="admin-performance-card">
    <div><h3>{event.title}</h3><p>{new Date(event.date+"T12:00:00").toLocaleDateString("de-DE")} · {eventTiming(event,eventNow).status}</p></div>
    <dl>{[["Aufrufe",event.views],["Checkouts",event.checkouts],["Tickets",event.sold],["Umsatz",event.revenue.toLocaleString("de-DE",{style:"currency",currency:"EUR"})]].map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
  </article>) : <p className="p-6 text-sm text-zinc-500">Keine Veranstaltungen in diesem Bereich.</p>}</div>;

  if (!authed) {
    return (
      <main className="min-h-screen bg-zinc-50 flex items-center justify-center p-6 text-zinc-950">
        <p className="text-sm text-zinc-500">Adminbereich wird geladen…</p>
      </main>
    );
  }

  return (
    <div className="wolnaa-admin min-h-screen bg-zinc-50 text-zinc-950 flex flex-col">


      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-10">

        {tab === "overview" && <section>
          <div className="admin-page-heading"><div><p className="admin-eyebrow">WOLNAA Verwaltung</p><h1>Übersicht</h1><p>Aktuelle Veranstaltungen und Verkäufe auf einen Blick.</p></div><button onClick={openNew} className="admin-primary">Event erstellen</button></div>
          {analyticsError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-red-700">{analyticsError} <button onClick={loadAnalytics} className="underline">Erneut laden</button></p>}
          <div className="admin-kpis">{[["Aktuelle Events",eventConversions.length],["Event-Aufrufe",activeTotals.views],["Verkaufte Tickets",activeTotals.sold],["Ticketumsatz",activeTotals.revenue.toLocaleString("de-DE",{style:"currency",currency:"EUR"})]].map(([label,value]) => <div key={label}><span>{label}</span><strong>{analyticsLoading || !eventNow || analyticsError ? "–" : value}</strong></div>)}</div>
          <p className="mb-6 text-xs text-zinc-500">Kennzahlen der noch nicht beendeten Events, jeweils seit Erfassungsbeginn. Admin- und Veranstalter-Events.</p>
          <div className="admin-section-heading"><h2>Aktuelle Veranstaltungen</h2><button onClick={() => navigateTab("events")}>Events verwalten →</button></div>
          {analyticsLoading ? <p role="status" className="p-6">Veranstaltungen werden geladen …</p> : !analyticsError && metrics(eventConversions)}
          <div className="admin-shortcuts"><button onClick={() => navigateTab("besucher")}><strong>Besucher & Statistik</strong><span>Verlauf, Herkunft und Geräte ansehen →</span></button><button onClick={() => navigateTab("archiv")}><strong>Event-Archiv</strong><span>Vergangene Events und Auswertungen →</span></button></div>
        </section>}
        {/* Events */}
        {(tab === "events" || tab === "archiv") && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div><h1 className="text-lg font-bold">{tab === "archiv" ? "Event-Archiv" : "Aktuelle Events"}</h1><p className="text-zinc-600 text-xs mt-0.5">{tab === "archiv" ? "Abgeschlossene Veranstaltungen bleiben hier erhalten." : "Kommende und laufende Veranstaltungen."}</p></div>
              <button onClick={openNew} className="rounded-xl bg-[#d6b36a] text-black font-bold px-4 py-2 text-sm hover:bg-[#c5a15b] transition-colors">+ Neues Event</button>
            </div>
            <label className="mb-5 block text-sm font-medium">Event suchen<input className={inp + " mt-2"} value={eventSearch} onChange={e => setEventSearch(e.target.value)} placeholder="Titel oder Stadt" /></label>
            {eventError && <p role="alert" className="mb-4 text-sm text-red-700">{eventError} <button onClick={loadEvents} className="underline">Erneut laden</button></p>}
            {evLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#d6b36a] border-t-transparent rounded-full animate-spin" /></div>
            ) : visibleEvents.length === 0 ? (
              <div className="text-center py-16 rounded-2xl border-2 border-dashed border-zinc-300 bg-white">
                <p className="text-zinc-600 text-sm mb-3">Keine passenden Veranstaltungen.</p>
                <button onClick={openNew} className="rounded-xl bg-[#d6b36a] text-black font-bold px-4 py-2 text-sm">Event erstellen</button>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleEvents.map((e) => (
                  <div key={e.id} className="bg-white border border-zinc-200 rounded-2xl p-3 shadow-sm hover:border-zinc-300 transition-colors">
                    <div className="flex items-center gap-3">
                      {e.imageUrl ? <img src={e.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-zinc-100 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{e.title}</p>
                        <p className="text-zinc-600 text-xs">{e.city}{e.location ? ` · ${e.location}` : ""}</p>
                        <p className="text-[#9b7435] text-xs">{e.date}{e.time ? ` · ${e.time}` : ""} · {eventNow > 0 ? eventTiming({date:e.date,time:e.time,event_ends_at:e.eventEndsAt ? berlinInstantForDisplay(e.eventEndsAt) : null},eventNow).status : ""}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-200">
                      <button onClick={() => openEdit(e)} className="flex-1 rounded-xl border border-zinc-300 text-zinc-700 text-xs py-2 hover:border-[#d6b36a] hover:text-black transition-colors font-medium">Bearbeiten</button>
                      <button onClick={() => showEventTickets(e.id)} className="flex-1 rounded-xl border border-zinc-300 text-zinc-700 text-xs py-2 hover:border-[#d6b36a] hover:text-black transition-colors font-medium">Tickets</button>
                      <button onClick={() => delEv(e.id!)} className="flex-1 rounded-xl border border-zinc-200 text-zinc-500 text-xs py-2 hover:border-red-300 hover:text-red-600 transition-colors font-medium">Löschen</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {tab === "archiv" && <section className="mt-8"><h2 className="mb-4 text-lg font-bold">Archivierte Event-Auswertungen</h2><p className="mb-4 text-sm text-zinc-500">Admin- und Veranstalter-Events nach ihrem Veranstaltungsende.</p>{metrics(archivedConversions.filter(event => event.title.toLowerCase().includes(eventSearch.toLowerCase())))}</section>}
          </div>
        )}

        {/* Besucher */}
        {tab === "besucher" && (
          <div>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-lg font-bold">Website-Besucher</h1>
                <p className="mt-0.5 text-xs text-zinc-600">Websiteweite Besuche und Seitenaufrufe; getrennt von den aktuellen Event-Kennzahlen</p>
              </div>
              <button onClick={loadAnalytics} disabled={analyticsLoading} className="rounded-xl border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 hover:border-[#d6b36a] disabled:opacity-50">
                {analyticsLoading ? "Lädt…" : "↻ Aktualisieren"}
              </button>
            </div>

            <div className="mb-5 inline-flex rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
              {([7, 30] as const).map(days => (
                <button key={days} onClick={() => setAnalyticsDays(days)} className={`rounded-lg px-4 py-2 text-xs font-bold ${analyticsDays === days ? "bg-[#d6b36a] text-black" : "text-zinc-600 hover:bg-zinc-100"}`}>
                  {days} Tage
                </button>
              ))}
            </div>
            {analyticsError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{analyticsError}</div>}

            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Besuche", value: periodVisits },
                { label: "Seitenaufrufe", value: periodViews },
                { label: "Seiten je Besuch", value: periodVisits ? (periodViews / periodVisits).toFixed(1) : "0" },
                { label: "Heute", value: analytics.days[analyticsDates.at(-1) ?? ""]?.visits ?? 0 },
              ].map(item => (
                <div key={item.label} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                  <p className="text-2xl font-bold text-[#9b7435]">{item.value}</p>
                  <p className="mt-1 text-xs text-zinc-600">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mb-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-sm font-bold">Verlauf</h2>
                <span className="text-xs text-zinc-500">Seitenaufrufe pro Tag</span>
              </div>
              <div className="flex h-44 items-end gap-1.5 sm:gap-3">
                {analyticsPeriod.map(day => (
                  <div key={day.date} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${day.date}: ${day.views} Aufrufe, ${day.visits} Besuche`}>
                    <span className="text-[10px] font-semibold text-zinc-500">{day.views || ""}</span>
                    <div className="w-full min-h-1 rounded-t-md bg-[#d6b36a]" style={{ height: `${Math.max(3, (day.views / maxViews) * 100)}%` }} />
                    <span className="text-[9px] text-zinc-500">{new Date(`${day.date}T12:00:00`).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {[
                { title: "Beliebte Seiten", entries: topEntries(analytics.paths), empty: "Noch keine Seitenaufrufe" },
                { title: "Herkunft der Aufrufe", entries: topEntries(analytics.referrers), empty: "Noch keine Herkunftsdaten" },
                { title: "Ticketkäufe nach Herkunft (Tickets)", entries: topEntries(analytics.purchaseSources ?? {}), empty: "Wird ab dieser Änderung erfasst; ohne Zuordnung: Direkt / unbekannt" },
              ].map(block => (
                <div key={block.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-4 text-sm font-bold">{block.title}</h2>
                  {block.entries.length ? (
                    <div className="space-y-3">
                      {block.entries.map(([label, count]) => (
                        <div key={label} className="flex items-center justify-between gap-4 text-sm">
                          <span className="truncate text-zinc-700">{label}</span>
                          <span className="font-bold text-[#9b7435]">{count}</span>
                        </div>
                      ))}
                    </div>
                  ) : <p className="text-sm text-zinc-500">{block.empty}</p>}
                </div>
              ))}

              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:col-span-2">
                <h2 className="mb-4 text-sm font-bold">Geräte</h2>
                <div className="grid grid-cols-2 gap-3">
                  {["Mobil", "Desktop"].map(device => {
                    const count = analytics.devices[device] ?? 0;
                    const percent = totalDevices ? Math.round((count / totalDevices) * 100) : 0;
                    return (
                      <div key={device} className="rounded-xl bg-zinc-50 p-4">
                        <div className="flex justify-between text-sm"><span>{device}</span><strong>{percent}%</strong></div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200"><div className="h-full rounded-full bg-[#d6b36a]" style={{ width: `${percent}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <section className="mt-6"><h2 className="mb-2 text-lg font-bold">Aktuelle Event-Aufrufe und Verkäufe</h2><p className="mb-4 text-sm text-zinc-500">Nur kommende und laufende Events. Vergangene Events findest du im Archiv.</p>{metrics(eventConversions)}</section>

            <p className="mt-5 text-xs leading-5 text-zinc-500">Die Statistik speichert nur zusammengefasste Werte. Namen, E-Mail-Adressen und vollständige IP-Adressen werden nicht erfasst. Ein Besuch beginnt beim Öffnen oder Neuladen der Website.</p>
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
                <div key={s.l} className="bg-white border border-zinc-200 rounded-2xl p-4 text-center shadow-sm">
                  <p className="text-xl font-bold text-[#9b7435]">{s.v}</p>
                  <p className="text-zinc-600 text-xs mt-0.5">{s.l}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mb-4">
              {selectedTicketEvent ? (
                <div className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-700">
                  {selectedTicketEvent.title}
                </div>
              ) : (
                <div className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm text-zinc-500">
                  Wähle unten eine Veranstaltung aus.
                </div>
              )}
              {selectedTicketEvent && <button onClick={() => setSelectedTicketEventId("")} className="rounded-xl border border-zinc-300 bg-white px-4 text-zinc-700 hover:border-[#d6b36a] hover:text-black text-sm transition-colors">Wechseln</button>}
              <button onClick={() => loadTickets(selectedTicketEvent)} className="rounded-xl border border-zinc-300 bg-white px-4 text-zinc-700 hover:border-[#d6b36a] hover:text-black text-sm transition-colors">↻</button>
            </div>
            {ticketLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-[#d6b36a] border-t-transparent rounded-full animate-spin" /></div>
            ) : !selectedTicketEvent ? (
              <div className="space-y-2">
                {eventTicketStats.length === 0 ? (
                  <div className="text-center py-12 rounded-2xl border border-zinc-200 bg-white text-zinc-500 text-sm">Keine Veranstaltungen vorhanden.</div>
                ) : eventTicketStats.map(({ event, total, checkedIn, revenue }) => (
                  <button key={event.id || event.title} onClick={() => { setSelectedTicketEventId(event.id || ""); loadTickets(event); }} className="w-full bg-white border border-zinc-200 rounded-2xl p-4 shadow-sm hover:border-[#d6b36a] transition-colors text-left">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate text-zinc-950">{event.title}</p>
                        <p className="text-zinc-600 text-xs mt-1">{event.date}{event.location ? ` · ${event.location}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-5 shrink-0 text-right">
                        <div><p className="text-[#9b7435] font-bold text-sm">{total}</p><p className="text-zinc-600 text-xs">Tickets</p></div>
                        
                        <div><p className="text-zinc-950 font-bold text-sm">€{revenue.toFixed(2)}</p><p className="text-zinc-600 text-xs">Umsatz</p></div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="admin-ticket-table w-full text-sm">
                    <thead><tr className="border-b border-zinc-200 bg-zinc-50">{["Name & E-Mail", "Event", "Betrag", "Status", "Aktion", "Check-in"].map(h => <th key={h} className="text-left text-zinc-600 font-medium px-4 py-3 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {filtered.length === 0 ? <tr><td colSpan={6} className="text-center text-zinc-600 py-10 text-sm">Keine Einträge für diese Veranstaltung.</td></tr>
                        : filtered.map(t => (
                          <tr key={t.id} className="border-b border-zinc-100 hover:bg-zinc-50 transition-colors">
                            <td data-label="Person" className="px-4 py-3"><p className="font-semibold text-sm">{t.customer_name}</p><p className="text-zinc-600 text-xs">{t.customer_email}</p></td>
                            <td data-label="Veranstaltung" className="px-4 py-3 text-zinc-700 text-xs whitespace-nowrap">{t.event_title}</td>
                            <td data-label="Betrag" className="px-4 py-3 font-bold text-sm whitespace-nowrap">€{t.amount.toFixed(2)}</td>
                            <td data-label="Status" className="px-4 py-3 whitespace-nowrap"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${t.status === "checked_in" ? "bg-green-400/10 text-green-700" : t.status === "cancelled" ? "bg-red-400/10 text-red-700" : "bg-[#d6b36a]/15 text-[#765725]"}`}>{t.status === "checked_in" ? "✓ Eingecheckt" : t.status === "cancelled" ? "✕ Storniert" : "Bezahlt"}</span></td>
                            <td data-label="Aktion" className="px-4 py-3 whitespace-nowrap">{t.status !== "cancelled" && <button onClick={() => cancelTicket(t.ticket_id, t.customer_name)} className="rounded-lg border border-red-500/30 text-red-700 text-xs px-3 py-1.5 hover:bg-red-500/10 transition-colors font-medium">Stornieren</button>}</td>
                            <td data-label="Check-in" className="px-4 py-3 text-zinc-600 text-xs whitespace-nowrap">{t.checked_in_at ? new Date(t.checked_in_at).toLocaleString("de-DE") : "—"}</td>
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
              <button onClick={saveLegal} className={`rounded-xl font-bold px-4 py-2 text-sm transition-colors ${legalSaved ? "bg-green-500 text-white" : "bg-[#d6b36a] text-black hover:bg-[#c5a15b]"}`}>{legalSaved ? "✓ Gespeichert" : "Speichern"}</button>
            </div>
            <div className="flex gap-1 mb-4 bg-white border border-zinc-200 rounded-xl p-1 overflow-x-auto shadow-sm">
              {(Object.keys(LEGAL_LABELS) as LegalKey[]).map(k => (
                <button key={k} onClick={() => setLegalTab(k)} className={`shrink-0 text-xs font-medium px-3 py-2 rounded-lg transition-colors ${legalTab === k ? "bg-[#d6b36a] text-black" : "text-zinc-600 hover:bg-zinc-100 hover:text-black"}`}>{LEGAL_LABELS[k]}</button>
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

        {tab === "einstellungen" && (
          <div className="mx-auto max-w-xl">
            <div className="mb-5">
              <h1 className="text-lg font-bold">Einstellungen</h1>
              <p className="mt-0.5 text-xs text-zinc-600">Admin-E-Mail und Passwort verwalten</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
              {accountMessage && <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">✓ {accountMessage}</div>}
              {accountError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{accountError}</div>}
              <div className="mb-5">
                <label className={lbl}>Admin-E-Mail-Adresse</label>
                <input type="email" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} autoComplete="email" className={inp} />
                <p className="mt-1.5 text-xs text-zinc-500">Diese Adresse wird künftig für die Admin-Anmeldung und Passwort-Links verwendet.</p>
              </div>
              <div className="border-t border-zinc-200 pt-5">
                <h2 className="mb-4 text-sm font-bold">Passwort ändern</h2>
                <div className="space-y-4">
                  <div>
                    <label className={lbl}>Neues Passwort</label>
                    <input type="password" value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="Mindestens 10 Zeichen" autoComplete="new-password" className={inp} />
                  </div>
                  <div>
                    <label className={lbl}>Passwort wiederholen</label>
                    <input type="password" value={accountPasswordRepeat} onChange={e => setAccountPasswordRepeat(e.target.value)} autoComplete="new-password" className={inp} />
                  </div>
                </div>
                <p className="mt-2 text-xs text-zinc-500">Leer lassen, wenn nur die E-Mail-Adresse geändert werden soll.</p>
              </div>
              <button onClick={saveAccount} disabled={accountLoading || !accountEmail.trim()} className="mt-6 w-full rounded-xl bg-[#d6b36a] py-3.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-[#c5a15b] disabled:cursor-not-allowed disabled:opacity-50">
                {accountLoading ? "Speichert…" : "Änderungen speichern"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Event Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="admin-event-editor w-full md:max-w-2xl bg-white border border-zinc-200 rounded-t-3xl md:rounded-3xl max-h-[95vh] overflow-y-auto text-black" onClick={e => e.stopPropagation()}>
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
                  <div><label className={lbl} htmlFor="event-min-age">Eintrittsalter</label><select id="event-min-age" value={ev.minAge} onChange={e => f("minAge", Number(e.target.value) as 16 | 18)} className={inp}><option value={18}>Ab 18 Jahren</option><option value={16}>Ab 16 Jahren – Muttizettel</option></select><p className="text-zinc-500 text-xs mt-1.5">Events ab 16 erscheinen in der Muttizettel-Auswahl.</p></div>
                  <div><label className={lbl}>Veranstaltungsende (deutsche Ortszeit)</label><input type="datetime-local" value={ev.eventEndsAt || defaultEndLocal(ev.date)} onChange={e => f("eventEndsAt", e.target.value)} className={inp} /><p className="text-zinc-600 text-xs mt-1.5">Ab diesem Zeitpunkt nicht mehr öffentlich sichtbar. Bei Nachtveranstaltungen den Folgetag wählen. Standard: Folgetag 05:00.</p></div>
                  <div>
                    <label className={lbl}>Online-Verkauf endet (deutsche Ortszeit)</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="block text-xs text-zinc-500 mb-1.5">Datum</span>
                        <input
                          type="date"
                          value={saleEndDate(ev.onlineSaleEndsAt)}
                          onChange={e => f("onlineSaleEndsAt", e.target.value ? `${e.target.value}T${saleEndTime(ev.onlineSaleEndsAt) || "23:59"}` : "")}
                          className={inp}
                        />
                      </div>
                      <div>
                        <span className="block text-xs text-zinc-500 mb-1.5">Uhrzeit</span>
                        <input
                          type="time"
                          step="300"
                          value={saleEndTime(ev.onlineSaleEndsAt)}
                          disabled={!saleEndDate(ev.onlineSaleEndsAt)}
                          onChange={e => f("onlineSaleEndsAt", `${saleEndDate(ev.onlineSaleEndsAt)}T${e.target.value}`)}
                          className={`${inp} disabled:opacity-50 disabled:cursor-not-allowed`}
                        />
                      </div>
                    </div>
                    <p className="text-zinc-600 text-xs mt-1.5">Ab dann können keine neuen Bestellungen gestartet werden. Ohne Angabe gilt der Veranstaltungsbeginn. Bereits geöffnete Checkouts können noch bis zu 30 Minuten bezahlt werden.</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50"><p className="text-base font-bold text-zinc-900 mb-0">Adresse & Bild</p></div>
                <div className="p-4 space-y-3">
                  <div>
                    <label className={lbl}>Adresse (Google Maps)</label>
                    <input value={ev.address} onChange={e => f("address", e.target.value)} placeholder="Musterstr. 1, 10115 Berlin" className={inp} />
                    {ev.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noopener noreferrer" className="text-[#9b7435] text-xs mt-1.5 inline-block hover:underline">In Google Maps prüfen →</a>}
                  </div>
                  <div>
                    <label className={lbl}>Bild hochladen</label>
                    <div className="space-y-2">
                      <label className="flex items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-zinc-300 hover:border-[#d6b36a] py-4 cursor-pointer transition-colors bg-white">
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
                  <div><p className="text-base font-bold text-zinc-900 mb-0">Ticketphasen</p><p className="mt-1 text-xs text-zinc-500">Automatischer Wechsel in dieser Reihenfolge</p></div>
                  <button onClick={() => f("tickets", [...ev.tickets, { name: "", price: "", quantity: "" }])} className="text-[#9b7435] text-xs font-bold hover:text-[#765725]">+ Phase</button>
                </div>
                <div className="p-4 space-y-3">
                  {ev.tickets.map((t, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex justify-between"><p className="text-xs text-zinc-600">Phase {i + 1}</p><button onClick={() => f("tickets", ev.tickets.filter((_, j) => j !== i))} className="text-zinc-600 hover:text-red-600 text-xs transition-colors">Entfernen</button></div>
                      <div className="grid grid-cols-3 gap-2">
                        <input placeholder="Name" value={t.name} onChange={e => setTix(i, "name", e.target.value)} className={inp} />
                        <input placeholder="Preis €" value={t.price} onChange={e => setTix(i, "price", e.target.value)} inputMode="decimal" className={inp} />
                        <input placeholder={i === ev.tickets.length - 1 ? "Leer = unbegrenzt" : "Kontingent"} value={t.quantity} onChange={e => setTix(i, "quantity", e.target.value.replace(/\D/g, ""))} inputMode="numeric" className={inp} />
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
                      <button onClick={() => f("loungeList", [...ev.loungeList, { name: "", persons: "", price: "" }])} className="text-[#9b7435] text-xs font-bold hover:text-[#765725] transition-colors">+ Lounge hinzufügen</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex items-center justify-between">
                  <p className="text-base font-bold text-zinc-900 mb-0">Rabattcodes</p>
                  <button onClick={() => f("discountCodes", [...ev.discountCodes, { code: "", percent: "" }])} className="text-[#9b7435] text-xs font-bold hover:text-[#765725]">+ Hinzufügen</button>
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
              <button onClick={saveEv} disabled={!ev.title || saveLoading} className="flex-1 rounded-xl bg-[#d6b36a] text-black font-bold py-3.5 text-sm hover:bg-[#c5a15b] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {saveLoading ? <><div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />Speichern...</> : (evIdx ? "Änderungen speichern" : "Event erstellen")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
