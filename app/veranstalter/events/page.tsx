'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { eventTiming } from '@/lib/event-timing';
import { useEventClock } from '@/lib/use-event-clock';
import EventCard from '@/components/veranstalter/EventCard';

export default function VeranstalterEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'alle'|'kommend'|'vergangen'>('alle');
  const now = useEventClock();
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('/api/veranstalter/events', { cache: 'no-store' });
        const json = await res.json();
        if (res.status === 401 || res.status === 403) { window.location.href = '/veranstalter/login'; return; }
        if (!res.ok) throw new Error(json.error || 'Events konnten nicht geladen werden.');
        if (!cancelled) setEvents(json.events || []);
      } catch { if (!cancelled) setError('Events konnten nicht geladen werden. Bitte lade die Seite erneut.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load(); return () => { cancelled = true; };
  }, []);
  const filtered = events.filter(e => filter === 'alle' || (filter === 'vergangen' ? eventTiming(e,now).ended : !eventTiming(e,now).ended));
  return <div className="space-y-5 text-zinc-900">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Meine Events</h1><p className="text-sm text-zinc-600">{events.length} Events insgesamt</p></div><Link href="/veranstalter/events/neu" className="flex min-h-11 items-center rounded-lg bg-zinc-900 px-4 text-sm font-semibold text-white">+ Neues Event</Link></div>
    <div className="flex flex-wrap gap-2">{(['alle','kommend','vergangen'] as const).map(f => <button key={f} type="button" aria-pressed={filter===f} onClick={() => setFilter(f)} className={`min-h-11 rounded-full border px-4 text-sm ${filter===f ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700'}`}>{f === 'alle' ? 'Alle' : f === 'kommend' ? 'Aktuell & kommend' : 'Vergangen'}</button>)}</div>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {loading ? <p role="status">Events werden geladen …</p> : !error && filtered.length === 0 ? <p className="rounded-xl border border-zinc-200 p-6">Keine Events gefunden.</p> : <div className="grid min-w-0 gap-4">{filtered.map(e => <EventCard key={e.id} event={e} onDeleted={id => setEvents(current => current.filter(e => e.id !== id))} />)}</div>}
  </div>;
}
