'use client';
import { useEffect, useRef, useState } from 'react';
import { summarizePromos, type PromoOrder } from '@/lib/promo-summary';

export default function EventPromoReport({ eventId, adminToken }: { eventId: string; adminToken?: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<PromoOrder[] | null>(null);
  const [error, setError] = useState('');
  const [asOf, setAsOf] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), [eventId]);
  async function load() {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setError(''); setRows(null);
    const timestamp = Math.floor(Date.now() / 1000);
    const found = new Map<string, PromoOrder>();
    const seen = new Set<string>();
    let cursor = '';
    try {
      do {
        const params = new URLSearchParams({ asOf: String(timestamp), ...(cursor ? { cursor } : {}) });
        const res = await fetch(`/api/events/${encodeURIComponent(eventId)}/promocodes?${params}`, {
          cache: 'no-store', signal: abort.signal, headers: adminToken ? { 'x-admin-token': adminToken } : undefined,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Auswertung fehlgeschlagen.');
        for (const row of data.rows) found.set(row.id, row);
        cursor = data.next || '';
        if (cursor && seen.has(cursor)) throw new Error('Auswertung unvollständig. Bitte erneut versuchen.');
        seen.add(cursor);
      } while (cursor);
      if (!abort.signal.aborted) { setRows([...found.values()]); setAsOf(timestamp); }
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Auswertung fehlgeschlagen.');
    } finally { if (!abort.signal.aborted) setBusy(false); }
  }
  return <section className="mt-4 min-w-0 border-t border-zinc-200 pt-3 text-zinc-900">
    <button type="button" aria-expanded={open} onClick={() => { setOpen(!open); if (!open && rows === null && !busy) void load(); }} className="min-h-11 text-left text-sm font-semibold underline underline-offset-4">Promocode-Verkäufe {open ? '▴' : '▾'}</button>
    {open && <div className="space-y-3 text-sm">
      {busy && <p role="status">Bezahlte Bestellungen werden ausgewertet …</p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      {rows !== null && <>
        {rows.length === 0 ? <p>Keine bezahlten Online-Bestellungen für dieses Event gefunden.</p> : <ul className="space-y-2">
          {summarizePromos(rows).map(group => <li key={group.code} className="rounded-lg bg-zinc-50 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2"><strong className="break-all">{group.code}</strong><span>{group.tickets} Tickets</span></div>
            <p className="mt-1 text-xs text-zinc-600">{group.orders} Bestellungen · {group.refunded} Tickets vollständig erstattet</p>
            {(group.partial > 0 || group.unknown > 0) && <p className="mt-1 text-xs text-amber-800">{group.partial} Bestellungen teilweise erstattet · {group.unknown} mit unbekannter Ticketmenge oder Erstattungsstatus</p>}
          </li>)}
        </ul>}
        <p className="text-xs text-zinc-500">Bezahlte Stripe-Bestellungen; vollständig erstattete Tickets abgezogen. Teil-Erstattungen können die tatsächliche Ticketzahl verringern. Code-Kombinationen zählen bei jedem enthaltenen Code. Kostenlose Gästetickets sind nicht enthalten.</p>
        <p className="text-xs text-zinc-500">Stand: {new Date(asOf * 1000).toLocaleString('de-DE')}</p>
      </>}
      {!busy && <button type="button" onClick={() => void load()} className="min-h-11 rounded-lg border border-zinc-300 px-3">{error ? 'Erneut versuchen' : 'Aktualisieren'}</button>}
    </div>}
  </section>;
}
