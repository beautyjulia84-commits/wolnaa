"use client";
import { useEffect, useState, useCallback } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
// ─── Types ────────────────────────────────────────────────────────────────────

type Ticket = {
  name: string;
  price: string;
  quantity: string;
};

type Lounge = {
  type: "Normal" | "VIP";
  name: string;
  persons: string;
  price: string;
};

type DiscountCode = {
  code: string;
  percent: string;
};

// FIX 1: Added "description" to the type (was missing, causing TS error with emptyEvent)
type EventItem = {
  id: string;
  title: string;
  city: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  address: string;
  description: string;
  imageUrl: string;
  tickets: Ticket[];
  lounges: Lounge[];
  discountCodes: DiscountCode[];
};

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  eventTitle: string;
  amount: number;
  status: string;
};

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
};

// ─── Constants ───────────────────────────────────────────────────────────────

const emptyEvent: EventItem = {
  id: "",
  title: "",
  city: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  address: "",
  description: "",
  imageUrl: "",
  tickets: [],
  lounges: [],
  discountCodes: [],
};

type TabId = "dashboard" | "event" | "events" | "orders" | "legal";

const NAV_ITEMS: { id: TabId; label: string; icon: string }[] = [
  { id: "dashboard", label: "Dashboard", icon: "⬡" },
  { id: "event", label: "Event erstellen", icon: "＋" },
  { id: "events", label: "Veranstaltungen", icon: "◈" },
  { id: "orders", label: "Bestellungen", icon: "◎" },
  { id: "legal", label: "Rechtliches", icon: "§" },
];

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WolnaaAdmin() {
  const [tab, setTab] = useState<TabId>("dashboard");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [eventData, setEventData] = useState<EventItem>(emptyEvent);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [impressum, setImpressum] = useState("");
  const [datenschutz, setDatenschutz] = useState("");
  const [agb, setAgb] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [legalSaved, setLegalSaved] = useState(false);

  // ─── Toast System ──────────────────────────────────────────────────────────

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  // ─── Load from localStorage ───────────────────────────────────────────────

  // FIX 4: All localStorage reads are now independent (were nested inside savedEvents if-block)
  useEffect(() => {
    async function loadEvents() {
      const { data } = await supabaseBrowser
        .from("events")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setEvents(data.map((e: any) => e.data));
      }
    }

    loadEvents();

    const savedOrders = localStorage.getItem("wolnaa-orders");
    const savedImpressum = localStorage.getItem("wolnaa-impressum");
    const savedDatenschutz = localStorage.getItem("wolnaa-datenschutz");
    const savedAgb = localStorage.getItem("wolnaa-agb");

    if (savedOrders) setOrders(JSON.parse(savedOrders));
    if (savedImpressum) setImpressum(savedImpressum);
    if (savedDatenschutz) setDatenschutz(savedDatenschutz);
    if (savedAgb) setAgb(savedAgb);
  }, []);

  useEffect(() => {
    async function saveEvents() {
      for (const event of events) {
        await supabaseBrowser
          .from("events")
          .upsert({
            id: event.id,
            data: event,
          });
      }
    }

    if (events.length > 0) {
      saveEvents();
    }
  }, [events]);

  useEffect(() => {
    localStorage.setItem("wolnaa-impressum", impressum);
  }, [impressum]);

  useEffect(() => {
    localStorage.setItem("wolnaa-datenschutz", datenschutz);
  }, [datenschutz]);

  useEffect(() => {
    localStorage.setItem("wolnaa-agb", agb);
  }, [agb]);

  // ─── Event Field Helpers ──────────────────────────────────────────────────

  function updateField(field: keyof EventItem, value: string) {
    setEventData((prev) => ({ ...prev, [field]: value }));
  }

  function addTicket() {
    setEventData((prev) => ({
      ...prev,
      tickets: [...prev.tickets, { name: "", price: "", quantity: "" }],
    }));
  }

  function updateTicket(index: number, field: keyof Ticket, value: string) {
    setEventData((prev) => ({
      ...prev,
      tickets: prev.tickets.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
  }

  function removeTicket(index: number) {
    setEventData((prev) => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index),
    }));
  }

  function addLounge(type: "Normal" | "VIP") {
    setEventData((prev) => ({
      ...prev,
      lounges: [...prev.lounges, { type, name: "", persons: "", price: "" }],
    }));
  }

  function updateLounge(index: number, field: keyof Lounge, value: string) {
    setEventData((prev) => ({
      ...prev,
      lounges: prev.lounges.map((l, i) => (i === index ? { ...l, [field]: value } : l)),
    }));
  }

  function removeLounge(index: number) {
    setEventData((prev) => ({
      ...prev,
      lounges: prev.lounges.filter((_, i) => i !== index),
    }));
  }

  function addDiscount() {
    setEventData((prev) => ({
      ...prev,
      discountCodes: [...prev.discountCodes, { code: "", percent: "" }],
    }));
  }

  function updateDiscount(index: number, field: keyof DiscountCode, value: string) {
    setEventData((prev) => ({
      ...prev,
      discountCodes: prev.discountCodes.map((d, i) =>
        i === index ? { ...d, [field]: value } : d
      ),
    }));
  }

  function removeDiscount(index: number) {
    setEventData((prev) => ({
      ...prev,
      discountCodes: prev.discountCodes.filter((_, i) => i !== index),
    }));
  }

  // ─── Save / Delete Event ──────────────────────────────────────────────────

  function saveEvent() {
    if (!eventData.title.trim()) {
      showToast("Bitte Event-Titel eingeben.", "error");
      return;
    }

    if (editingEventId) {
      setEvents((prev) =>
        prev.map((e) => (e.id === editingEventId ? { ...eventData, id: editingEventId } : e))
      );
      setEditingEventId(null);
      showToast("Event erfolgreich aktualisiert.", "success");
    } else {
      setEvents((prev) => [...prev, { ...eventData, id: crypto.randomUUID() }]);
      showToast("Event erfolgreich gespeichert.", "success");
    }

    setEventData(emptyEvent);
    setTab("events");
  }

  function startEditEvent(event: EventItem) {
    setEventData({
      ...event,
      tickets: event.tickets || [],
      lounges: event.lounges || [],
      discountCodes: event.discountCodes || [],
    });
    setEditingEventId(event.id);
    setTab("event");
  }

  function deleteEvent(id: string) {
    setEvents((prev) => prev.filter((e) => e.id !== id));
    setDeleteConfirm(null);
    showToast("Event gelöscht.", "info");
  }

  // ─── Orders ───────────────────────────────────────────────────────────────

  // FIX 5: cancelOrder now correctly matches by ticketId (the real unique id used in EventPage)
  function cancelOrder(id: string) {
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "Storniert" } : o))
    );
    showToast("Bestellung storniert.", "info");
  }

  // ─── Derived Data ─────────────────────────────────────────────────────────

  const today = new Date(new Date().toDateString());
  const upcomingEvents = events.filter((e) => new Date(e.date) >= today);
  const pastEvents = events.filter((e) => new Date(e.date) < today);
  const totalRevenue = orders
    .filter((o) => o.status !== "Storniert")
    .reduce((sum, o) => sum + Number(o.amount || 0), 0);

  // FIX 6: Dynamic title for create vs edit
  const eventTabLabel = editingEventId ? "Event bearbeiten" : "Event erstellen";

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,700;1,9..40,400&family=DM+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:       #080808;
          --surface:  #111111;
          --surface2: #181818;
          --border:   rgba(255,255,255,0.07);
          --border2:  rgba(255,255,255,0.12);
          --gold:     #F5C842;
          --gold-dim: rgba(245,200,66,0.12);
          --gold-mid: rgba(245,200,66,0.25);
          --text:     #F0EDE8;
          --muted:    #6B6862;
          --muted2:   #9C9790;
          --red:      #E05252;
          --red-dim:  rgba(224,82,82,0.12);
          --blue:     #5B8FF0;
          --blue-dim: rgba(91,143,240,0.12);
          --green:    #52C98B;
          --green-dim:rgba(82,201,139,0.12);
          --radius:   14px;
          --radius-lg:20px;
          --radius-xl:28px;
          --font: 'DM Sans', sans-serif;
          --mono: 'DM Mono', monospace;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font); }

        .admin-shell {
          display: flex;
          min-height: 100vh;
        }

        /* ── Sidebar ── */
        .sidebar {
          width: 240px;
          flex-shrink: 0;
          background: var(--surface);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          padding: 28px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }
        .sidebar-logo {
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--text);
          padding: 0 8px;
          margin-bottom: 32px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .sidebar-logo span {
          display: inline-block;
          width: 32px; height: 32px;
          background: var(--gold);
          border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; color: #000; font-weight: 700;
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          background: transparent;
          border: none;
          border-radius: var(--radius);
          padding: 11px 12px;
          color: var(--muted2);
          font-family: var(--font);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          transition: background 0.15s, color 0.15s;
          margin-bottom: 2px;
        }
        .nav-item:hover { background: var(--surface2); color: var(--text); }
        .nav-item.active {
          background: var(--gold-dim);
          color: var(--gold);
        }
        .nav-icon { font-size: 15px; width: 20px; text-align: center; opacity: 0.8; }

        .sidebar-footer {
          margin-top: auto;
          padding: 12px;
          font-size: 12px;
          color: var(--muted);
          letter-spacing: 0.3px;
        }

        /* ── Content ── */
        .content {
          flex: 1;
          padding: 40px 48px;
          max-width: 960px;
          overflow-x: hidden;
        }

        /* Mobile nav */
        .mobile-nav {
          display: none;
          padding: 16px;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          gap: 8px;
          flex-wrap: wrap;
        }
        .mobile-nav-btn {
          flex: 1; min-width: 120px;
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 10px 14px;
          color: var(--muted2);
          font-family: var(--font);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mobile-nav-btn.active { background: var(--gold-dim); color: var(--gold); border-color: var(--gold-mid); }

        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-nav { display: flex; }
          .content { padding: 24px 16px; }
        }

        /* ── Page header ── */
        .page-header {
          margin-bottom: 32px;
        }
        .page-title {
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
          color: var(--text);
        }
        .page-subtitle {
          font-size: 14px;
          color: var(--muted2);
          margin-top: 4px;
        }

        /* ── Stat cards ── */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 40px;
        }
        @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }
        .stat-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .stat-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: var(--gold);
          opacity: 0.4;
        }
        .stat-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 10px;
        }
        .stat-value {
          font-size: 36px;
          font-weight: 700;
          letter-spacing: -1px;
          color: var(--text);
          font-family: var(--mono);
        }

        /* ── Section ── */
        .section-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--muted2);
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 16px;
          margin-top: 40px;
        }
        .section-title:first-child { margin-top: 0; }

        /* ── Form card ── */
        .form-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 28px;
        }

        /* ── Input ── */
        .field-group { margin-bottom: 14px; }
        .field-label {
          display: block;
          font-size: 12px;
          font-weight: 500;
          color: var(--muted2);
          margin-bottom: 6px;
          letter-spacing: 0.3px;
        }
        .input {
          width: 100%;
          background: var(--surface2);
          border: 1px solid var(--border2);
          border-radius: var(--radius);
          padding: 12px 14px;
          color: var(--text);
          font-family: var(--font);
          font-size: 14px;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input::placeholder { color: var(--muted); }
        .input:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px var(--gold-dim);
        }
        textarea.input { min-height: 110px; resize: vertical; line-height: 1.6; }
        select.input { cursor: pointer; }

        /* ── Two columns ── */
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } }

        /* ── Row item (ticket / lounge / discount) ── */
        .row-item {
          background: var(--surface2);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 16px;
          display: grid;
          gap: 10px;
        }
        .row-item-ticket { grid-template-columns: 2fr 1fr 1fr auto; }
        .row-item-lounge { grid-template-columns: auto 2fr 1fr 1fr auto; }
        .row-item-discount { grid-template-columns: 2fr 1fr auto; }
        @media (max-width: 640px) {
          .row-item-ticket,
          .row-item-lounge,
          .row-item-discount { grid-template-columns: 1fr; }
        }

        /* ── Buttons ── */
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border: none;
          border-radius: var(--radius);
          padding: 11px 18px;
          font-family: var(--font);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.15s, transform 0.1s;
          white-space: nowrap;
        }
        .btn:hover { opacity: 0.88; }
        .btn:active { transform: scale(0.98); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-primary   { background: var(--gold); color: #000; }
        .btn-secondary { background: var(--surface2); color: var(--text); border: 1px solid var(--border2); }
        .btn-danger    { background: var(--red-dim); color: var(--red); border: 1px solid rgba(224,82,82,0.2); }
        .btn-ghost     { background: transparent; color: var(--muted2); border: 1px solid var(--border); }
        .btn-blue      { background: var(--blue-dim); color: var(--blue); border: 1px solid rgba(91,143,240,0.2); }
        .btn-sm        { padding: 8px 12px; font-size: 13px; border-radius: 10px; }
        .btn-full      { width: 100%; }
        .btn-add-section {
          display: flex; align-items: center; gap: 8px;
          background: var(--surface2);
          border: 1px dashed var(--border2);
          border-radius: var(--radius);
          padding: 11px 16px;
          color: var(--muted2);
          font-family: var(--font); font-size: 14px; font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-add-section:hover { border-color: var(--gold); color: var(--gold); background: var(--gold-dim); }

        /* ── Section divider ── */
        .divider {
          border: none;
          border-top: 1px solid var(--border);
          margin: 28px 0;
        }
        .section-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .section-row-title {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
        }

        /* ── Image upload ── */
        .upload-zone {
          border: 1px dashed var(--border2);
          border-radius: var(--radius-lg);
          padding: 20px;
          text-align: center;
          background: var(--surface2);
          transition: border-color 0.15s;
          cursor: pointer;
          position: relative;
        }
        .upload-zone:hover { border-color: var(--gold); }
        .upload-zone input[type="file"] {
          position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
        }
        .upload-zone-label { font-size: 13px; color: var(--muted2); }
        .upload-preview {
          width: 100%;
          height: 180px;
          object-fit: cover;
          border-radius: var(--radius-lg);
          margin-top: 12px;
          display: block;
        }

        /* ── Event cards ── */
        .events-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 640px) { .events-grid { grid-template-columns: 1fr; } }
        .event-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .event-card:hover { border-color: var(--border2); }
        .event-card-img {
          width: 100%;
          height: 160px;
          object-fit: cover;
          display: block;
        }
        .event-card-img-placeholder {
          width: 100%; height: 80px;
          background: var(--surface2);
          display: flex; align-items: center; justify-content: center;
          color: var(--muted); font-size: 13px;
        }
        .event-card-body { padding: 18px; }
        .event-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }
        .event-card-meta {
          font-size: 13px;
          color: var(--muted2);
          margin-bottom: 2px;
        }
        .event-card-actions {
          display: flex; gap: 8px; margin-top: 14px;
        }
        .event-card-past { opacity: 0.5; }

        /* ── Order cards ── */
        .order-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          padding: 20px 22px;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          transition: border-color 0.15s;
        }
        .order-card:hover { border-color: var(--border2); }
        .order-name { font-size: 15px; font-weight: 700; }
        .order-email { font-size: 13px; color: var(--muted2); margin-top: 2px; }
        .order-event { font-size: 13px; color: var(--muted2); margin-top: 6px; }
        .order-amount {
          font-size: 18px; font-weight: 700; font-family: var(--mono);
          color: var(--gold); white-space: nowrap;
        }
        .order-right { text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 10px; }

        /* ── Badges ── */
        .badge {
          display: inline-flex; align-items: center;
          padding: 4px 10px;
          border-radius: 100px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.3px;
        }
        .badge-green  { background: var(--green-dim); color: var(--green); }
        .badge-red    { background: var(--red-dim); color: var(--red); }
        .badge-gold   { background: var(--gold-dim); color: var(--gold); }
        .badge-muted  { background: var(--surface2); color: var(--muted2); border: 1px solid var(--border); }

        /* ── Legal ── */
        .legal-section { margin-bottom: 28px; }
        .legal-label {
          font-size: 14px; font-weight: 600; color: var(--text);
          margin-bottom: 8px; display: block;
        }

        /* ── Empty state ── */
        .empty-state {
          text-align: center;
          padding: 48px 24px;
          color: var(--muted);
          font-size: 14px;
        }
        .empty-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.3; }

        /* ── Toast ── */
        .toast-container {
          position: fixed;
          bottom: 28px; right: 28px;
          display: flex; flex-direction: column; gap: 10px;
          z-index: 1000;
          pointer-events: none;
        }
        .toast {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 18px;
          border-radius: var(--radius);
          font-size: 14px; font-weight: 500;
          box-shadow: 0 8px 32px rgba(0,0,0,0.5);
          animation: toast-in 0.25s ease;
          pointer-events: auto;
        }
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .toast-success { background: #0e1f16; border: 1px solid rgba(82,201,139,0.3); color: var(--green); }
        .toast-error   { background: #1f0e0e; border: 1px solid rgba(224,82,82,0.3); color: var(--red); }
        .toast-info    { background: #141824; border: 1px solid rgba(91,143,240,0.3); color: var(--blue); }

        /* ── Confirm dialog ── */
        .overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.7);
          display: flex; align-items: center; justify-content: center;
          z-index: 500;
          backdrop-filter: blur(4px);
        }
        .dialog {
          background: var(--surface);
          border: 1px solid var(--border2);
          border-radius: var(--radius-xl);
          padding: 32px;
          width: 100%;
          max-width: 380px;
          margin: 16px;
        }
        .dialog-title { font-size: 18px; font-weight: 700; margin-bottom: 10px; }
        .dialog-body  { font-size: 14px; color: var(--muted2); margin-bottom: 24px; line-height: 1.6; }
        .dialog-actions { display: flex; gap: 10px; }

        /* ── VIP tag ── */
        .lounge-type-vip   { color: var(--gold); font-size: 12px; font-weight: 700; background: var(--gold-dim); padding: 4px 10px; border-radius: 8px; white-space: nowrap; }
        .lounge-type-normal { color: var(--muted2); font-size: 12px; font-weight: 600; background: var(--surface2); padding: 4px 10px; border-radius: 8px; white-space: nowrap; border: 1px solid var(--border); }
      `}</style>

      <div className="admin-shell" style={{ fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── Desktop sidebar ── */}
        <aside className="sidebar">
          <div className="sidebar-logo">
            <span>W</span>
            Wolnaa
          </div>
          <nav>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`nav-item${tab === item.id ? " active" : ""}`}
                onClick={() => {
                  if (item.id !== "event") setEditingEventId(null);
                  setTab(item.id);
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.id === "event" ? eventTabLabel : item.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-footer">Admin Panel v1.0</div>
        </aside>

        {/* ── Mobile nav ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div className="mobile-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`mobile-nav-btn${tab === item.id ? " active" : ""}`}
                onClick={() => {
                  if (item.id !== "event") setEditingEventId(null);
                  setTab(item.id);
                }}
              >
                {item.id === "event" ? eventTabLabel : item.label}
              </button>
            ))}
          </div>

          {/* ── Main content ── */}
          <main className="content">

            {/* ── Dashboard ── */}
            {tab === "dashboard" && (
              <div>
                <div className="page-header">
                  <h1 className="page-title">Dashboard</h1>
                  <p className="page-subtitle">Übersicht deiner Veranstaltungen & Umsätze</p>
                </div>

                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Events</div>
                    <div className="stat-value">{events.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Bestellungen</div>
                    <div className="stat-value">{orders.length}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Umsatz</div>
                    <div className="stat-value">{totalRevenue.toFixed(0)} €</div>
                  </div>
                </div>

                {upcomingEvents.length > 0 && (
                  <>
                    <div className="section-title">Nächste Events</div>
                    <div className="events-grid">
                      {upcomingEvents.slice(0, 4).map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEdit={startEditEvent}
                          onDelete={(id) => setDeleteConfirm(id)}
                        />
                      ))}
                    </div>
                  </>
                )}

                {events.length === 0 && (
                  <div className="empty-state">
                    <div className="empty-icon">◈</div>
                    <p>Noch keine Events. Erstelle dein erstes Event!</p>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 16 }}
                      onClick={() => setTab("event")}
                    >
                      Event erstellen
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── Event Form ── */}
            {tab === "event" && (
              <div>
                <div className="page-header">
                  {/* FIX 6: Shows correct title when editing */}
                  <h1 className="page-title">{eventTabLabel}</h1>
                  <p className="page-subtitle">
                    {editingEventId
                      ? "Bestehende Veranstaltung bearbeiten"
                      : "Neue Veranstaltung anlegen"}
                  </p>
                </div>

                <div className="form-card">

                  {/* Basic info */}
                  <div className="section-title" style={{ marginTop: 0 }}>Basis-Informationen</div>

                  <div className="field-group">
                    <label className="field-label">Event-Titel *</label>
                    <input
                      className="input"
                      value={eventData.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="z.B. Summer Rooftop Night"
                    />
                  </div>

                  <div className="grid-2">
                    <div className="field-group">
                      <label className="field-label">Stadt</label>
                      <input
                        className="input"
                        value={eventData.city}
                        onChange={(e) => updateField("city", e.target.value)}
                        placeholder="Stuttgart"
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Datum</label>
                      <input
                        className="input"
                        type="date"
                        value={eventData.date}
                        onChange={(e) => updateField("date", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="field-group">
                      <label className="field-label">Startzeit</label>
                      <input
                        className="input"
                        type="time"
                        value={eventData.startTime}
                        onChange={(e) => updateField("startTime", e.target.value)}
                      />
                    </div>
                    <div className="field-group">
                      <label className="field-label">Endzeit</label>
                      <input
                        className="input"
                        type="time"
                        value={eventData.endTime}
                        onChange={(e) => updateField("endTime", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="field-group">
                    <label className="field-label">Location / Venue</label>
                    <input
                      className="input"
                      value={eventData.location}
                      onChange={(e) => updateField("location", e.target.value)}
                      placeholder="Club XY, Halle Z …"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Adresse (für Google Maps)</label>
                    <input
                      className="input"
                      value={eventData.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Musterstraße 1, 70173 Stuttgart"
                    />
                  </div>

                  <div className="field-group">
                    <label className="field-label">Beschreibung</label>
                    <textarea
                      className="input"
                      value={eventData.description}
                      onChange={(e) => updateField("description", e.target.value)}
                      placeholder="Beschreibe dein Event …"
                    />
                  </div>

                  {/* Image upload */}
                  <div className="field-group">
                    <label className="field-label">Titelbild</label>
                    <div className="upload-zone">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onloadend = () =>
                            setEventData((prev) => ({
                              ...prev,
                              imageUrl: reader.result as string,
                            }));
                          reader.readAsDataURL(file);
                        }}
                      />
                      <div className="upload-zone-label">
                        {eventData.imageUrl ? "Bild ändern — klicken oder ziehen" : "Bild hochladen — klicken oder ziehen"}
                      </div>
                    </div>
                    {eventData.imageUrl && (
                      <img
                        src={eventData.imageUrl}
                        alt="Vorschau"
                        className="upload-preview"
                      />
                    )}
                  </div>

                  <hr className="divider" />

                  {/* Tickets */}
                  <div className="section-row">
                    <span className="section-row-title">Tickets</span>
                    <button className="btn-add-section" onClick={addTicket}>
                      ＋ Ticket hinzufügen
                    </button>
                  </div>

                  {(eventData.tickets || []).length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                      Noch keine Tickets angelegt.
                    </p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(eventData.tickets || []).map((ticket, i) => (
                      <div className="row-item row-item-ticket" key={i}>
                        <input
                          className="input"
                          value={ticket.name}
                          onChange={(e) => updateTicket(i, "name", e.target.value)}
                          placeholder="Ticket-Name"
                        />
                        <input
                          className="input"
                          type="number"
                          value={ticket.price}
                          onChange={(e) => updateTicket(i, "price", e.target.value)}
                          placeholder="Preis €"
                        />
                        <input
                          className="input"
                          type="number"
                          value={ticket.quantity}
                          onChange={(e) => updateTicket(i, "quantity", e.target.value)}
                          placeholder="Anzahl"
                        />
                        <button className="btn btn-danger btn-sm" onClick={() => removeTicket(i)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <hr className="divider" />

                  {/* Lounges */}
                  <div className="section-row">
                    <span className="section-row-title">Lounges</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn-add-section" onClick={() => addLounge("Normal")}>
                        ＋ Normal
                      </button>
                      <button
                        className="btn-add-section"
                        style={{ borderColor: "var(--gold-mid)", color: "var(--gold)" }}
                        onClick={() => addLounge("VIP")}
                      >
                        ＋ VIP
                      </button>
                    </div>
                  </div>

                  {(eventData.lounges || []).length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                      Noch keine Lounges angelegt.
                    </p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(eventData.lounges || []).map((lounge, i) => (
                      <div className="row-item row-item-lounge" key={i}>
                        <select
                          className="input"
                          value={lounge.type}
                          onChange={(e) =>
                            updateLounge(i, "type", e.target.value as "Normal" | "VIP")
                          }
                        >
                          <option value="Normal">Normal</option>
                          <option value="VIP">VIP</option>
                        </select>
                        <input
                          className="input"
                          value={lounge.name}
                          onChange={(e) => updateLounge(i, "name", e.target.value)}
                          placeholder="Name"
                        />
                        <input
                          className="input"
                          type="number"
                          value={lounge.persons}
                          onChange={(e) => updateLounge(i, "persons", e.target.value)}
                          placeholder="Personen"
                        />
                        <input
                          className="input"
                          type="number"
                          value={lounge.price}
                          onChange={(e) => updateLounge(i, "price", e.target.value)}
                          placeholder="Preis €"
                        />
                        <button className="btn btn-danger btn-sm" onClick={() => removeLounge(i)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <hr className="divider" />

                  {/* Discount codes */}
                  <div className="section-row">
                    <span className="section-row-title">Rabattcodes / Promoter</span>
                    <button className="btn-add-section" onClick={addDiscount}>
                      ＋ Code hinzufügen
                    </button>
                  </div>

                  {(eventData.discountCodes || []).length === 0 && (
                    <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                      Noch keine Codes angelegt.
                    </p>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {(eventData.discountCodes || []).map((discount, i) => (
                      <div className="row-item row-item-discount" key={i}>
                        <input
                          className="input"
                          value={discount.code}
                          onChange={(e) =>
                            updateDiscount(i, "code", e.target.value.toUpperCase())
                          }
                          placeholder="Code z.B. ANNA20"
                          style={{ fontFamily: "var(--mono)", letterSpacing: "0.5px" }}
                        />
                        <input
                          className="input"
                          type="number"
                          value={discount.percent}
                          onChange={(e) => updateDiscount(i, "percent", e.target.value)}
                          placeholder="Rabatt %"
                        />
                        <button className="btn btn-danger btn-sm" onClick={() => removeDiscount(i)}>
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  <hr className="divider" />

                  <div style={{ display: "flex", gap: 10 }}>
                    <button className="btn btn-primary" style={{ minWidth: 160 }} onClick={saveEvent}>
                      {editingEventId ? "Änderungen speichern" : "Event speichern"}
                    </button>
                    {editingEventId && (
                      <button
                        className="btn btn-ghost"
                        onClick={() => {
                          setEditingEventId(null);
                          setEventData(emptyEvent);
                          setTab("events");
                        }}
                      >
                        Abbrechen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── Events list ── */}
            {tab === "events" && (
              <div>
                <div className="page-header">
                  <h1 className="page-title">Veranstaltungen</h1>
                  <p className="page-subtitle">{events.length} Events insgesamt</p>
                </div>

                {/* FIX 2 & 3: Past events section is now correctly OUTSIDE the upcoming grid */}
                {upcomingEvents.length > 0 ? (
                  <>
                    <div className="section-title">Aktuelle & kommende Events</div>
                    <div className="events-grid">
                      {upcomingEvents.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onEdit={startEditEvent}
                          onDelete={(id) => setDeleteConfirm(id)}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">◈</div>
                    <p>Keine bevorstehenden Events.</p>
                    <button
                      className="btn btn-primary"
                      style={{ marginTop: 16 }}
                      onClick={() => setTab("event")}
                    >
                      Erstes Event erstellen
                    </button>
                  </div>
                )}

                {pastEvents.length > 0 && (
                  <>
                    <div className="section-title">Vergangene Events</div>
                    <div className="events-grid">
                      {pastEvents.map((event) => (
                        // FIX 3: Stable key using event.id, not crypto.randomUUID()
                        <EventCard
                          key={event.id}
                          event={event}
                          past
                          onEdit={startEditEvent}
                          onDelete={(id) => setDeleteConfirm(id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── Orders ── */}
            {tab === "orders" && (
              <div>
                <div className="page-header">
                  <h1 className="page-title">Bestellungen</h1>
                  <p className="page-subtitle">{orders.length} Bestellungen · {totalRevenue.toFixed(2)} € Umsatz</p>
                </div>

                {orders.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">◎</div>
                    <p>Noch keine Bestellungen vorhanden.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {orders.map((order) => (
                      <div className="order-card" key={order.id}>
                        <div>
                          <div className="order-name">{order.customerName}</div>
                          <div className="order-email">{order.customerEmail}</div>
                          <div className="order-event">{order.eventTitle}</div>
                        </div>
                        <div className="order-right">
                          <div className="order-amount">
                            {Number(order.amount || 0).toFixed(2)} €
                          </div>
                          <span
                            className={`badge ${
                              order.status === "Storniert"
                                ? "badge-red"
                                : order.status === "Bezahlt"
                                ? "badge-green"
                                : "badge-muted"
                            }`}
                          >
                            {order.status}
                          </span>
                          {order.status !== "Storniert" && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => cancelOrder(order.id)}
                            >
                              Stornieren
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Legal ── */}
            {tab === "legal" && (
              <div>
                <div className="page-header">
                  <h1 className="page-title">Rechtliches</h1>
                  <p className="page-subtitle">Impressum, Datenschutz und AGB verwalten</p>
                </div>

                <div className="form-card">
                  <div className="legal-section">
                    <label className="legal-label">Impressum</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 140 }}
                      value={impressum}
                      onChange={(e) => { setImpressum(e.target.value); setLegalSaved(false); }}
                      placeholder="Angaben gemäß § 5 TMG …"
                    />
                  </div>

                  <div className="legal-section">
                    <label className="legal-label">Datenschutzerklärung</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 140 }}
                      value={datenschutz}
                      onChange={(e) => { setDatenschutz(e.target.value); setLegalSaved(false); }}
                      placeholder="Informationen gemäß DSGVO …"
                    />
                  </div>

                  <div className="legal-section">
                    <label className="legal-label">AGB</label>
                    <textarea
                      className="input"
                      style={{ minHeight: 140 }}
                      value={agb}
                      onChange={(e) => { setAgb(e.target.value); setLegalSaved(false); }}
                      placeholder="Allgemeine Geschäftsbedingungen …"
                    />
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      localStorage.setItem("wolnaa-impressum", impressum);
                      localStorage.setItem("wolnaa-datenschutz", datenschutz);
                      localStorage.setItem("wolnaa-agb", agb);
                      setLegalSaved(true);
                      showToast("Rechtliche Texte gespeichert.", "success");
                    }}
                  >
                    {legalSaved ? "✓ Gespeichert" : "Änderungen speichern"}
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* ── Delete confirm dialog ── */}
        {deleteConfirm && (
          <div className="overlay" onClick={() => setDeleteConfirm(null)}>
            <div className="dialog" onClick={(e) => e.stopPropagation()}>
              <div className="dialog-title">Event löschen?</div>
              <div className="dialog-body">
                Diese Aktion kann nicht rückgängig gemacht werden. Das Event wird
                dauerhaft entfernt.
              </div>
              <div className="dialog-actions">
                <button
                  className="btn btn-danger"
                  style={{ flex: 1 }}
                  onClick={() => deleteEvent(deleteConfirm)}
                >
                  Ja, löschen
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setDeleteConfirm(null)}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Toasts ── */}
        <div className="toast-container">
          {toasts.map((t) => (
            <div key={t.id} className={`toast toast-${t.type}`}>
              {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"} {t.message}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── EventCard Sub-component ──────────────────────────────────────────────────

function EventCard({
  event,
  past = false,
  onEdit,
  onDelete,
}: {
  event: EventItem;
  past?: boolean;
  onEdit: (event: EventItem) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`event-card${past ? " event-card-past" : ""}`}>
      {event.imageUrl ? (
        <img src={event.imageUrl} alt={event.title} className="event-card-img" />
      ) : (
        <div className="event-card-img-placeholder">Kein Bild</div>
      )}
      <div className="event-card-body">
        <div className="event-card-title">{event.title}</div>
        <div className="event-card-meta">
          {event.city} · {event.date} · {event.startTime}
          {event.endTime && ` — ${event.endTime}`}
        </div>
        {event.location && (
          <div className="event-card-meta">{event.location}</div>
        )}
        <div className="event-card-actions">
          <button className="btn btn-blue btn-sm" onClick={() => onEdit(event)}>
            Bearbeiten
          </button>
          <button className="btn btn-danger btn-sm" onClick={() => onDelete(event.id)}>
            Löschen
          </button>
        </div>
      </div>
    </div>
  );
}
