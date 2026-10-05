'use client';
import { useId, useState } from 'react';
import Link from 'next/link';
import EventPromoReport from '@/components/EventPromoReport';
import { eventTiming, type TimedEvent } from '@/lib/event-timing';
import { useEventClock } from '@/lib/use-event-clock';

type Event = TimedEvent & { id: string; title: string; location?: string; tickets_sold?: number; total_revenue?: number; ticket_stats_warning?: string | null };
export default function EventCard({ event, onDeleted }: { event: Event; onDeleted: (id: string) => void }) {
  const now = useEventClock();
  const confirmationId = useId();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function remove() {
    setBusy(true); setError('');
    try {
      const res = await fetch(`/api/veranstalter/events?id=${encodeURIComponent(event.id)}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Event konnte nicht gelöscht werden.');
      onDeleted(event.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Löschen fehlgeschlagen.'); }
    finally { setBusy(false); setConfirming(false); }
  }
  return <article className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{event.title}</h2><p className="mt-1 text-sm text-zinc-600">{event.date ? new Date(event.date + 'T12:00:00').toLocaleDateString('de-DE') : ''}{event.location ? ` · ${event.location}` : ''}</p></div>
      {now > 0 && <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs">{eventTiming(event,now).status}</span>}
    </div>
    <div className="my-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span><strong>{event.tickets_sold || 0}</strong> Tickets</span>{event.total_revenue !== undefined && <span><strong>{new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR'}).format(event.total_revenue / 100)}</strong> Umsatz</span>}</div>
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Link href={`/veranstalter/events/${event.id}`} className="flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-semibold">Bearbeiten</Link>
      <Link href={`/veranstalter/events/${event.id}/teilnehmer`} className="flex min-h-11 items-center justify-center rounded-lg bg-zinc-900 px-3 text-sm font-semibold text-white">Tickets / Kunden</Link>
      <button type="button" onClick={() => setConfirming(true)} disabled={busy || confirming} className="min-h-11 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">{busy ? 'Löschen …' : 'Löschen'}</button>
    </div>
    {confirming && <div role="alertdialog" aria-labelledby={confirmationId} className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm" onKeyDown={e => { if(e.key === 'Escape' && !busy) setConfirming(false); }}>
      <h3 id={confirmationId} className="font-semibold">„{event.title}“ wirklich löschen?</h3>
      <p className="mt-1">Das Event wird dauerhaft entfernt. Events mit ausgestellten Tickets bleiben erhalten.</p>
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" autoFocus disabled={busy} onClick={() => setConfirming(false)} className="min-h-11 rounded-lg border border-zinc-300 bg-white px-3">Abbrechen</button><button type="button" disabled={busy} onClick={() => void remove()} className="min-h-11 rounded-lg bg-red-700 px-3 text-white disabled:opacity-50">{busy ? 'Löschen …' : 'Endgültig löschen'}</button></div>
    </div>}
    {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
    {event.ticket_stats_warning && <p className="mt-3 text-xs text-amber-800">{event.ticket_stats_warning}</p>}
    <EventPromoReport eventId={event.id} eventTitle={event.title} eventDate={event.date} />
  </article>;
}
