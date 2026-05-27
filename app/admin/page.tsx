"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import jsQR from "jsqr";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Page = "dashboard" | "events" | "event-new" | "event-edit" | "tickets" | "rechtliches" | "scanner";
type LegalKey = "impressum" | "datenschutz" | "agb" | "teilnahme" | "widerruf";
type TicketType = { name: string; price: string; quantity: string };
type Lounge = { name: string; persons: string; price: string };
type DiscountCode = { code: string; percent: string };
type EventItem = {
  title: string; city: string; date: string; time: string; endTime: string;
  location: string; address: string; imageUrl: string; price: string;
  description: string; tickets: TicketType[];
  lounges: boolean; loungeList: Lounge[]; discountCodes: DiscountCode[];
};
type TicketRow = {
  id: string; ticket_id: string; event_title: string;
  customer_name: string; customer_email: string;
  amount: number; status: string; checked_in_at: string | null; created_at: string;
};
type ScanResult = { valid: boolean; reason?: string; customerName?: string; eventTitle?: string; amount?: number; };

const LEGAL_LABELS: Record<LegalKey, string> = {
  impressum: "Impressum", datenschutz: "Datenschutz",
  agb: "AGB", teilnahme: "Teilnahmebedingungen", widerruf: "Widerrufsrecht",
};
const EMPTY: EventItem = {
  title: "", city: "", date: "", time: "", endTime: "", location: "", address: "",
  imageUrl: "", price: "", description: "",
  tickets: [{ name: "Standard", price: "", quantity: "" }],
  lounges: false, loungeList: [], discountCodes: [],
};

function safeJSON<T>(r: string | null, fb: T): T {
  if (!r) return fb; try { return JSON.parse(r); } catch { return fb; }
}

// ── Input styles ──
const inp = "w-full rounded-xl border border-zinc-700 bg-zinc-900 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/10 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition-all text-sm";
const lbl = "block text-sm font-medium text-zinc-300 mb-2";

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className={lbl}>{label}</label>
      {children}
      {hint && <p className="text-zinc-500 text-xs mt-1.5">{hint}</p>}
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm font-medium text-zinc-300">{label}</span>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full transition-colors flex items-center px-0.5 ${value ? "bg-yellow-400" : "bg-zinc-700"}`}>
        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

// ── Scanner ──
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
    <div className="max-w-md mx-auto">
      <div className="relative rounded-2xl overflow-hidden bg-black border border-zinc-800" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {!result && !camError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <div className="relative w-48 h-48">
              {["top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl","top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl","bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl","bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl"].map((cls, i) => (
                <div key={i} className={`absolute w-9 h-9 border-yellow-400 ${cls}`} />
              ))}
              {scanning && <div className="absolute left-2 right-2 h-px bg-yellow-400/80 top-1/2 animate-bounce" />}
            </div>
            <p className="mt-5 text-white/60 text-sm">QR-Code in den Rahmen halten</p>
          </div>
        )}
        {result && (
          <div className={`absolute inset-0 flex items-center justify-center p-6 ${result.valid ? "bg-green-500/95" : "bg-red-500/95"}`}>
            <div className="text-center text-white">
              <div className="w-20 h-20 rounded-full bg-white/20 border-2 border-white flex items-center justify-center mx-auto mb-4 text-4xl font-bold">{result.valid ? "✓" : "✕"}</div>
              <h3 className="text-2xl font-bold mb-1">{result.valid ? "Gültig" : "Ungültig"}</h3>
              {result.valid ? (<><p className="font-semibold text-lg">{result.customerName}</p><p className="text-white/80">{result.eventTitle}</p></>) : <p className="text-white/90">{result.reason}</p>}
              <p className="text-white/40 text-xs mt-5">Scanner startet neu...</p>
            </div>
          </div>
        )}
        {camError && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/95 p-6 text-center">
            <div><p className="text-zinc-400 mb-4">{camError}</p><button onClick={startCamera} className="rounded-xl bg-yellow-400 text-black font-bold px-5 py-2.5 text-sm">Erneut versuchen</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── MAIN ──
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState(""); const [pwErr, setPwErr] = useState(""); const [adminPw, setAdminPw] = useState("");
  const [page, setPage] = useState<Page>("dashboard");

  const [events, setEvents] = useState<EventItem[]>([]);
  const [ev, setEv] = useState<EventItem>(EMPTY);
  const [evIdx, setEvIdx] = useState<number | null>(null);

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketFilter, setTicketFilter] = useState("");

  const [legal, setLegal] = useState<Record<LegalKey, string>>({ impressum: "", datenschutz: "", agb: "", teilnahme: "", widerruf: "" });
  const [legalTab, setLegalTab] = useState<LegalKey>("impressum");
  const [legalSaved, setLegalSaved] = useState(false);

  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("wolnaa-admin") === "true") { setAuthed(true); setAdminPw(localStorage.getItem("wolnaa-admin-pw") ?? ""); }
  }, []);
  useEffect(() => {
    if (!authed) return;
    setEvents(safeJSON(localStorage.getItem("wolnaa-events"), []));
    setLegal({ impressum: localStorage.getItem("wolnaa-impressum") ?? "", datenschutz: localStorage.getItem("wolnaa-datenschutz") ?? "", agb: localStorage.getItem("wolnaa-agb") ?? "", teilnahme: localStorage.getItem("wolnaa-teilnahme") ?? "", widerruf: localStorage.getItem("wolnaa-widerruf") ?? "" });
  }, [authed]);
  useEffect(() => { if (authed && page === "tickets") loadTickets(); }, [authed, page]);

  async function login() {
    setPwErr("");
    const res = await fetch("/api/admin-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
    if (res.ok) { localStorage.setItem("wolnaa-admin", "true"); localStorage.setItem("wolnaa-admin-pw", pw); setAdminPw(pw); setAuthed(true); }
    else setPwErr("Falsches Passwort.");
  }
  function logout() { localStorage.removeItem("wolnaa-admin"); localStorage.removeItem("wolnaa-admin-pw"); setAuthed(false); }
  async function loadTickets() { setTicketLoading(true); const { data } = await supabase.from("tickets").select("*").order("created_at", { ascending: false }); setTickets(data ?? []); setTicketLoading(false); }

  function saveEvs(u: EventItem[]) { setEvents(u); localStorage.setItem("wolnaa-events", JSON.stringify(u)); }
  function delEv(i: number) { if (!confirm("Event löschen?")) return; saveEvs(events.filter((_, j) => j !== i)); }
  function newEvent() { setEv(JSON.parse(JSON.stringify(EMPTY))); setEvIdx(null); setPage("event-new"); }
  function editEvent(i: number) { setEv(JSON.parse(JSON.stringify(events[i]))); setEvIdx(i); setPage("event-edit"); }
  function saveEv() { const u = [...events]; evIdx !== null ? u[evIdx] = ev : u.push(ev); saveEvs(u); setPage("events"); }
  function f<K extends keyof EventItem>(k: K, v: EventItem[K]) { setEv(p => ({ ...p, [k]: v })); }
  function setTix(i: number, k: keyof TicketType, v: string) { const t = [...ev.tickets]; t[i] = { ...t[i], [k]: v }; f("tickets", t); }
  function setLng(i: number, k: keyof Lounge, v: string) { const l = [...ev.loungeList]; l[i] = { ...l[i], [k]: v }; f("loungeList", l); }
  function setDC(i: number, k: keyof DiscountCode, v: string) { const d = [...ev.discountCodes]; d[i] = { ...d[i], [k]: v }; f("discountCodes", d); }
  function saveLegal() { Object.entries(legal).forEach(([k, v]) => localStorage.setItem(`wolnaa-${k}`, v)); setLegalSaved(true); setTimeout(() => setLegalSaved(false), 2000); }

  const filtered = ticketFilter ? tickets.filter(t => t.event_title.toLowerCase().includes(ticketFilter.toLowerCase())) : tickets;
  const revenue = tickets.reduce((s, t) => s + t.amount, 0);
  const checkedIn = tickets.filter(t => t.status === "checked_in").length;

  const navItems = [
    { key: "dashboard" as Page, label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
    { key: "events" as Page, label: "Events", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
    { key: "tickets" as Page, label: "Tickets", icon: "M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" },
    { key: "rechtliches" as Page, label: "Rechtliches", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
    { key: "scanner" as Page, label: "Scanner", icon: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" },
  ];

  const activeTab = ["event-new", "event-edit"].includes(page) ? "events" : page;

  // ── Login ──
  if (!authed) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mx-auto mb-4"><span className="text-black font-black text-xl">W</span></div>
            <h1 className="text-2xl font-bold text-white">WOLNAA Admin</h1>
            <p className="text-zinc-500 text-sm mt-1">Bitte anmelden</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div>
              <label className={lbl}>Passwort</label>
              <input type="password" value={pw} onChange={e => { setPw(e.target.value); setPwErr(""); }} onKeyDown={e => e.key === "Enter" && login()} placeholder="••••••••" className={inp} autoFocus />
              {pwErr && <p className="text-red-400 text-xs mt-1.5">{pwErr}</p>}
            </div>
            <button onClick={login} className="w-full rounded-xl bg-yellow-400 text-black font-bold py-3 hover:bg-yellow-300 transition-colors">Anmelden</button>
          </div>
          <p className="text-center mt-5"><Link href="/" className="text-zinc-600 text-sm hover:text-zinc-400">← Zurück zur Website</Link></p>
        </div>
      </main>
    );
  }

  // ── Layout ──
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col md:flex-row">

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col bg-zinc-900 border-r border-zinc-800 sticky top-0 h-screen">
        <div className="p-5 border-b border-zinc-800 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center"><span className="text-black font-black text-sm">W</span></div>
          <div><p className="font-bold text-sm text-white">WOLNAA</p><p className="text-zinc-500 text-xs">Adminbereich</p></div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setPage(item.key)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all font-medium ${activeTab === item.key ? "bg-yellow-400 text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-800"}`}>
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-zinc-800 space-y-0.5">
          <Link href="/" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Zur Website
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Abmelden
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile Header */}
        <div className="md:hidden bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-yellow-400 flex items-center justify-center"><span className="text-black font-black text-xs">W</span></div>
            <span className="font-bold text-sm">{navItems.find(n => n.key === activeTab)?.label ?? "Admin"}</span>
          </div>
          <div className="flex gap-3 items-center">
            <Link href="/" className="text-zinc-500 text-xs">Website</Link>
            <button onClick={logout} className="text-zinc-500 text-xs">Logout</button>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">

          {/* ── DASHBOARD ── */}
          {page === "dashboard" && (
            <div className="p-6 md:p-8 max-w-5xl">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Willkommen zurück 👋</h1>
                <p className="text-zinc-500 mt-1">Hier ist deine aktuelle Übersicht.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: "Veröffentlichte Events", value: events.length, sub: "gesamt" },
                  { label: "Bestellungen", value: tickets.length, sub: "gesamt" },
                  { label: "Eingecheckt", value: checkedIn, sub: "von " + tickets.length },
                  { label: "Umsatz", value: `€${revenue.toFixed(2)}`, sub: "gesamt" },
                ].map(s => (
                  <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <p className="text-zinc-500 text-xs font-medium mb-2">{s.label}</p>
                    <p className="text-2xl font-bold text-white">{s.value}</p>
                    <p className="text-zinc-600 text-xs mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Published Events Table */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mb-6">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                  <h2 className="font-bold text-white">Veröffentlichte Events</h2>
                  <button onClick={newEvent} className="rounded-xl bg-yellow-400 text-black font-bold px-4 py-2 text-sm hover:bg-yellow-300 transition-colors">+ Neues Event</button>
                </div>
                {events.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-zinc-500 mb-3">Noch keine Events vorhanden.</p>
                    <button onClick={newEvent} className="rounded-xl bg-yellow-400 text-black font-bold px-4 py-2 text-sm">Erstes Event erstellen</button>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead><tr className="border-b border-zinc-800"><th className="text-left text-zinc-500 font-medium px-6 py-3 text-xs uppercase tracking-wide">Event</th><th className="text-left text-zinc-500 font-medium px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">Ausgestellt</th><th className="text-left text-zinc-500 font-medium px-4 py-3 text-xs uppercase tracking-wide hidden md:table-cell">Verbleibend</th><th className="text-left text-zinc-500 font-medium px-4 py-3 text-xs uppercase tracking-wide">Umsatz</th><th className="px-4 py-3"></th></tr></thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {events.map((e, i) => {
                        const issued = tickets.filter(t => t.event_title === e.title).length;
                        const total = e.tickets.reduce((s, t) => s + (parseInt(t.quantity) || 0), 0);
                        const evRevenue = tickets.filter(t => t.event_title === e.title).reduce((s, t) => s + t.amount, 0);
                        return (
                          <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4">
                              <p className="font-semibold text-white">{e.title}</p>
                              <p className="text-zinc-500 text-sm">{e.location || e.city}</p>
                              <p className="text-zinc-600 text-xs mt-0.5">{e.date}{e.time ? ` · ${e.time}` : ""}</p>
                            </td>
                            <td className="px-4 py-4 text-white hidden md:table-cell">{issued}</td>
                            <td className="px-4 py-4 hidden md:table-cell">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-zinc-800 rounded-full h-1.5 max-w-24"><div className="bg-yellow-400 h-1.5 rounded-full" style={{ width: total > 0 ? `${Math.min((issued / total) * 100, 100)}%` : "0%" }} /></div>
                                <span className="text-zinc-400 text-sm">{total > 0 ? total - issued : "∞"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 font-bold text-white">€{evRevenue.toFixed(2)}</td>
                            <td className="px-4 py-4">
                              <button onClick={() => editEvent(i)} className="rounded-lg border border-zinc-700 text-zinc-400 text-xs px-3 py-1.5 hover:border-yellow-400 hover:text-yellow-400 transition-colors">Bearbeiten</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Recent Tickets */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                  <h2 className="font-bold text-white">Letzte Bestellungen</h2>
                  <button onClick={() => setPage("tickets")} className="text-yellow-400 text-sm font-medium hover:text-yellow-300 transition-colors">Alle anzeigen →</button>
                </div>
                {tickets.length === 0 ? (
                  <div className="text-center py-10"><p className="text-zinc-500 text-sm">Noch keine Bestellungen.</p></div>
                ) : (
                  <table className="w-full">
                    <thead><tr className="border-b border-zinc-800">{["Zeit", "Name", "Event", "Betrag", "Status"].map(h => <th key={h} className="text-left text-zinc-500 font-medium px-5 py-3 text-xs uppercase tracking-wide">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-zinc-800/30">
                      {tickets.slice(0, 5).map(t => (
                        <tr key={t.id} className="hover:bg-zinc-800/20 transition-colors">
                          <td className="px-5 py-3 text-zinc-500 text-xs">{new Date(t.created_at).toLocaleDateString("de-DE")}</td>
                          <td className="px-5 py-3 text-white text-sm font-medium">{t.customer_name}</td>
                          <td className="px-5 py-3 text-zinc-400 text-sm">{t.event_title}</td>
                          <td className="px-5 py-3 text-white font-bold text-sm">€{t.amount.toFixed(2)}</td>
                          <td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.status === "checked_in" ? "bg-green-400/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"}`}>{t.status === "checked_in" ? "Eingecheckt" : "Bezahlt"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── EVENTS LIST ── */}
          {page === "events" && (
            <div className="p-6 md:p-8 max-w-5xl">
              <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-xl font-bold">Events</h1><p className="text-zinc-500 text-sm mt-0.5">{events.length} Event{events.length !== 1 ? "s" : ""}</p></div>
                <button onClick={newEvent} className="rounded-xl bg-yellow-400 text-black font-bold px-4 py-2.5 text-sm hover:bg-yellow-300 transition-colors">+ Neues Event</button>
              </div>
              {events.length === 0 ? (
                <div className="text-center py-20 rounded-2xl border-2 border-dashed border-zinc-800">
                  <p className="text-zinc-500 mb-3">Noch keine Events.</p>
                  <button onClick={newEvent} className="rounded-xl bg-yellow-400 text-black font-bold px-4 py-2.5 text-sm">Erstes Event erstellen</button>
                </div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <table className="w-full">
                    <thead><tr className="border-b border-zinc-800">{["Event", "Datum", "Tickets", ""].map(h => <th key={h} className="text-left text-zinc-500 font-medium px-5 py-3 text-xs uppercase tracking-wide">{h}</th>)}</tr></thead>
                    <tbody className="divide-y divide-zinc-800/50">
                      {events.map((e, i) => (
                        <tr key={i} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              {e.imageUrl ? <img src={e.imageUrl} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" /> : <div className="w-12 h-12 rounded-xl bg-zinc-800 shrink-0" />}
                              <div>
                                <p className="font-semibold text-white">{e.title}</p>
                                <p className="text-zinc-500 text-sm">{e.city}{e.location ? ` · ${e.location}` : ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-zinc-400 text-sm">{e.date}{e.time ? ` · ${e.time}` : ""}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-wrap gap-1">
                              {e.tickets.map((t, j) => <span key={j} className="rounded-full bg-zinc-800 text-zinc-400 text-xs px-2.5 py-1">{t.name} · €{t.price}</span>)}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => editEvent(i)} className="rounded-lg border border-zinc-700 text-zinc-400 text-xs px-3 py-1.5 hover:border-yellow-400 hover:text-yellow-400 transition-colors">Bearbeiten</button>
                              <button onClick={() => delEv(i)} className="rounded-lg border border-zinc-800 text-zinc-600 text-xs px-3 py-1.5 hover:border-red-500/40 hover:text-red-400 transition-colors">Löschen</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── EVENT FORM (new/edit) ── */}
          {(page === "event-new" || page === "event-edit") && (
            <div className="p-6 md:p-8 max-w-3xl">
              <div className="flex items-center gap-3 mb-8">
                <button onClick={() => setPage("events")} className="text-zinc-500 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                </button>
                <div>
                  <h1 className="text-xl font-bold">{page === "event-new" ? "Neues Event erstellen" : "Event bearbeiten"}</h1>
                  <p className="text-zinc-500 text-sm mt-0.5">Alle Pflichtfelder ausfüllen</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Event Info */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800"><h3 className="font-bold text-white">Event-Informationen</h3></div>
                  <div className="p-6 space-y-5">
                    <FormField label="Event-Name *">
                      <input value={ev.title} onChange={e => f("title", e.target.value)} placeholder="z.B. Wolna Berlin" className={inp} />
                    </FormField>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField label="Stadt *">
                        <input value={ev.city} onChange={e => f("city", e.target.value)} placeholder="Berlin" className={inp} />
                      </FormField>
                      <FormField label="Venue / Location">
                        <input value={ev.location} onChange={e => f("location", e.target.value)} placeholder="Club Name" className={inp} />
                      </FormField>
                    </div>
                  </div>
                </div>

                {/* Dates */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800"><h3 className="font-bold text-white">Datum & Uhrzeit</h3></div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="col-span-2 md:col-span-1"><FormField label="Startet *"><input type="date" value={ev.date} onChange={e => f("date", e.target.value)} className={inp} /></FormField></div>
                      <div><FormField label="Uhrzeit"><input type="time" value={ev.time} onChange={e => f("time", e.target.value)} className={inp} /></FormField></div>
                      <div className="col-span-2 md:col-span-1"><FormField label="Endet"><input type="date" value={ev.endTime} onChange={e => f("endTime", e.target.value)} className={inp} /></FormField></div>
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800"><h3 className="font-bold text-white">Adresse & Bild</h3></div>
                  <div className="p-6 space-y-5">
                    <FormField label="Vollständige Adresse" hint="Wird für Google Maps verwendet">
                      <input value={ev.address} onChange={e => f("address", e.target.value)} placeholder="Musterstraße 1, 10115 Berlin" className={inp} />
                      {ev.address && <a href={`https://maps.google.com/?q=${encodeURIComponent(ev.address)}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-yellow-400 text-xs mt-2 font-medium hover:underline">In Google Maps prüfen →</a>}
                    </FormField>
                    <FormField label="Bild-URL">
                      <input value={ev.imageUrl} onChange={e => f("imageUrl", e.target.value)} placeholder="https://..." className={inp} />
                      {ev.imageUrl && <img src={ev.imageUrl} alt="" className="mt-3 h-40 w-full object-cover rounded-xl border border-zinc-700" onError={e => (e.currentTarget.style.display = "none")} />}
                    </FormField>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800"><h3 className="font-bold text-white">Beschreibung</h3></div>
                  <div className="p-6">
                    <textarea value={ev.description} onChange={e => f("description", e.target.value)} placeholder="Beschreibe das Event für deine Gäste..." rows={5} className={inp + " resize-none"} />
                  </div>
                </div>

                {/* Tickets */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="font-bold text-white">Ticket-Typen</h3>
                    <button onClick={() => f("tickets", [...ev.tickets, { name: "", price: "", quantity: "" }])} className="text-yellow-400 text-sm font-semibold hover:text-yellow-300 transition-colors">+ Hinzufügen</button>
                  </div>
                  <div className="p-6 space-y-3">
                    <div className="grid grid-cols-[1fr_100px_90px_32px] gap-3 items-center">
                      {["Bezeichnung", "Preis (€)", "Anzahl", ""].map(h => <p key={h} className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{h}</p>)}
                    </div>
                    {ev.tickets.map((t, i) => (
                      <div key={i} className="grid grid-cols-[1fr_100px_90px_32px] gap-3 items-center">
                        <input placeholder="z.B. Standard" value={t.name} onChange={e => setTix(i, "name", e.target.value)} className={inp} />
                        <input placeholder="15.00" value={t.price} onChange={e => setTix(i, "price", e.target.value)} className={inp} />
                        <input placeholder="500" value={t.quantity} onChange={e => setTix(i, "quantity", e.target.value)} className={inp} />
                        <button onClick={() => f("tickets", ev.tickets.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg border border-zinc-700 text-zinc-500 hover:border-red-500/50 hover:text-red-400 transition-colors flex items-center justify-center text-sm">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* VIP Lounges */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800"><h3 className="font-bold text-white">VIP Lounges</h3></div>
                  <div className="p-6 space-y-4">
                    <Toggle value={ev.lounges} onChange={v => f("lounges", v)} label="VIP Lounges für dieses Event anbieten" />
                    {ev.lounges && (
                      <div className="space-y-3 pt-4 border-t border-zinc-800">
                        <div className="grid grid-cols-[1fr_80px_100px_32px] gap-3 items-center">
                          {["Lounge Name", "Personen", "Preis (€)", ""].map(h => <p key={h} className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{h}</p>)}
                        </div>
                        {ev.loungeList.map((l, i) => (
                          <div key={i} className="grid grid-cols-[1fr_80px_100px_32px] gap-3 items-center">
                            <input placeholder="VIP Area" value={l.name} onChange={e => setLng(i, "name", e.target.value)} className={inp} />
                            <input placeholder="10" value={l.persons} onChange={e => setLng(i, "persons", e.target.value)} className={inp} />
                            <input placeholder="500.00" value={l.price} onChange={e => setLng(i, "price", e.target.value)} className={inp} />
                            <button onClick={() => f("loungeList", ev.loungeList.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg border border-zinc-700 text-zinc-500 hover:border-red-500/50 hover:text-red-400 transition-colors flex items-center justify-center text-sm">✕</button>
                          </div>
                        ))}
                        <button onClick={() => f("loungeList", [...ev.loungeList, { name: "", persons: "", price: "" }])} className="text-yellow-400 text-sm font-semibold hover:text-yellow-300 transition-colors">+ Lounge hinzufügen</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rabattcodes */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                    <h3 className="font-bold text-white">Rabattcodes</h3>
                    <button onClick={() => f("discountCodes", [...ev.discountCodes, { code: "", percent: "" }])} className="text-yellow-400 text-sm font-semibold hover:text-yellow-300 transition-colors">+ Hinzufügen</button>
                  </div>
                  <div className="p-6 space-y-3">
                    {ev.discountCodes.length === 0 && <p className="text-zinc-500 text-sm">Keine Rabattcodes konfiguriert.</p>}
                    {ev.discountCodes.length > 0 && (
                      <div className="grid grid-cols-[1fr_120px_32px] gap-3 items-center">
                        {["Code", "Rabatt (%)", ""].map(h => <p key={h} className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{h}</p>)}
                      </div>
                    )}
                    {ev.discountCodes.map((d, i) => (
                      <div key={i} className="grid grid-cols-[1fr_120px_32px] gap-3 items-center">
                        <input placeholder="WOLNAA10" value={d.code} onChange={e => setDC(i, "code", e.target.value.toUpperCase())} className={inp + " font-mono uppercase"} />
                        <input placeholder="10" value={d.percent} onChange={e => setDC(i, "percent", e.target.value)} className={inp} />
                        <button onClick={() => f("discountCodes", ev.discountCodes.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg border border-zinc-700 text-zinc-500 hover:border-red-500/50 hover:text-red-400 transition-colors flex items-center justify-center text-sm">✕</button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save Buttons */}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setPage("events")} className="flex-1 rounded-xl border border-zinc-700 py-3.5 text-sm font-semibold text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors">Abbrechen</button>
                  <button onClick={saveEv} disabled={!ev.title} className="flex-1 md:flex-none md:px-8 rounded-xl bg-yellow-400 text-black font-bold py-3.5 text-sm hover:bg-yellow-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {page === "event-edit" ? "Änderungen speichern" : "Event erstellen"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── TICKETS ── */}
          {page === "tickets" && (
            <div className="p-6 md:p-8 max-w-5xl">
              <div className="mb-6"><h1 className="text-xl font-bold">Tickets & Bestellungen</h1><p className="text-zinc-500 text-sm mt-0.5">Alle Ticketkäufe im Überblick</p></div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                {[{ l: "Tickets gesamt", v: tickets.length }, { l: "Eingecheckt", v: checkedIn }, { l: "Umsatz", v: `€${revenue.toFixed(2)}` }].map(s => (
                  <div key={s.l} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                    <p className="text-2xl font-bold text-white">{s.v}</p>
                    <p className="text-zinc-500 text-xs mt-1 font-medium">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mb-4">
                <div className="flex-1 relative">
                  <svg className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input value={ticketFilter} onChange={e => setTicketFilter(e.target.value)} placeholder="Nach Event suchen..." className={inp + " pl-11"} />
                </div>
                <button onClick={loadTickets} className="rounded-xl border border-zinc-700 px-5 text-zinc-400 hover:text-white hover:border-zinc-500 transition-colors text-sm font-medium">↻</button>
              </div>
              {ticketLoading ? (
                <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-zinc-800">{["Name & E-Mail", "Event", "Betrag", "Status", "Check-in", "Ticket-ID"].map(h => <th key={h} className="text-left text-zinc-500 font-medium px-5 py-3 text-xs uppercase tracking-wide">{h}</th>)}</tr></thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {filtered.length === 0 ? <tr><td colSpan={6} className="text-center text-zinc-600 py-12">Keine Einträge.</td></tr>
                          : filtered.map(t => (
                            <tr key={t.id} className="hover:bg-zinc-800/30 transition-colors">
                              <td className="px-5 py-3.5"><p className="font-semibold text-white text-sm">{t.customer_name}</p><p className="text-zinc-500 text-xs">{t.customer_email}</p></td>
                              <td className="px-5 py-3.5 text-zinc-400 text-sm">{t.event_title}</td>
                              <td className="px-5 py-3.5 font-bold text-white text-sm">€{t.amount.toFixed(2)}</td>
                              <td className="px-5 py-3.5"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${t.status === "checked_in" ? "bg-green-400/10 text-green-400" : "bg-yellow-400/10 text-yellow-400"}`}>{t.status === "checked_in" ? "✓ Eingecheckt" : "Bezahlt"}</span></td>
                              <td className="px-5 py-3.5 text-zinc-500 text-xs">{t.checked_in_at ? new Date(t.checked_in_at).toLocaleString("de-DE") : "—"}</td>
                              <td className="px-5 py-3.5 font-mono text-zinc-600 text-xs">{t.ticket_id.slice(0, 12)}...</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── RECHTLICHES ── */}
          {page === "rechtliches" && (
            <div className="p-6 md:p-8 max-w-3xl">
              <div className="flex items-center justify-between mb-6">
                <div><h1 className="text-xl font-bold">Rechtliches</h1><p className="text-zinc-500 text-sm mt-0.5">AGB, Impressum & Datenschutz verwalten</p></div>
                <button onClick={saveLegal} className={`rounded-xl font-bold px-5 py-2.5 text-sm transition-all ${legalSaved ? "bg-green-500 text-white" : "bg-yellow-400 text-black hover:bg-yellow-300"}`}>{legalSaved ? "✓ Gespeichert" : "Speichern"}</button>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="flex overflow-x-auto border-b border-zinc-800">
                  {(Object.keys(LEGAL_LABELS) as LegalKey[]).map(k => (
                    <button key={k} onClick={() => setLegalTab(k)} className={`shrink-0 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${legalTab === k ? "border-yellow-400 text-white bg-zinc-800/50" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}>{LEGAL_LABELS[k]}</button>
                  ))}
                </div>
                <div className="p-6">
                  <textarea value={legal[legalTab]} onChange={e => setLegal(p => ({ ...p, [legalTab]: e.target.value }))} placeholder={`${LEGAL_LABELS[legalTab]} hier eingeben...`} rows={24} className={inp + " resize-none"} />
                </div>
              </div>
            </div>
          )}

          {/* ── SCANNER ── */}
          {page === "scanner" && (
            <div className="p-6 md:p-8 max-w-2xl">
              <div className="mb-6"><h1 className="text-xl font-bold">Check-In Scanner</h1><p className="text-zinc-500 text-sm mt-0.5">QR-Codes scannen und Tickets validieren</p></div>
              <ScannerView adminPw={adminPw} />
            </div>
          )}

        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex z-20 safe-area-pb">
        {navItems.map(item => (
          <button key={item.key} onClick={() => setPage(item.key)} className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${activeTab === item.key ? "text-yellow-400" : "text-zinc-600"}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={activeTab === item.key ? 2.2 : 1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d={item.icon} /></svg>
            <span className="text-[10px] font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
