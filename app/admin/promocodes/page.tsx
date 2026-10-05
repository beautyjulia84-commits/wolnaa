'use client';
import {useEffect,useState} from 'react';
import EventPromoReport from '@/components/EventPromoReport';
export default function PromoReport() {
  const [events,setEvents]=useState<{id:string;title:string;date:string}[]>([]);
  const [eventId,setEventId]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    const abort=new AbortController();
    fetch('/api/admin/promo-events',{cache:'no-store',signal:abort.signal}).then(async res=>{const data=await res.json();if(!res.ok)throw new Error(data.error);setEvents(data.events || []);}).catch(e=>{if(!abort.signal.aborted)setError(e.message || 'Events konnten nicht geladen werden.');}).finally(()=>{if(!abort.signal.aborted)setLoading(false);});
    return ()=>abort.abort();
  },[]);
  const event=events.find(event=>event.id===eventId);
  return <main className="min-h-screen bg-zinc-50 p-4 text-zinc-950 sm:p-6"><div className="mx-auto max-w-3xl">
    <a href="/admin" className="underline">← Adminbereich</a>
    <h1 className="my-6 text-2xl font-bold">Promocode-Verkäufe pro Event</h1>
    <p>Wähle eine Veranstaltung. Anschließend kannst du ihre Verkäufe nach Promocode durchsuchen. Vergangene Veranstaltungen bleiben auswertbar.</p>
    {error && <p role="alert" className="my-4 text-red-700">{error}</p>}
    <label className="my-5 block font-semibold">Veranstaltung<select disabled={loading} value={eventId} onChange={e=>setEventId(e.target.value)} className="mt-2 block min-h-12 w-full rounded-lg border border-zinc-300 bg-white p-3 text-base"><option value="">{loading?'Veranstaltungen werden geladen …':'Bitte Veranstaltung auswählen'}</option>{events.map(event=><option key={event.id} value={event.id}>{event.title} · {new Date(event.date+'T12:00:00').toLocaleDateString('de-DE')}</option>)}</select></label>
    {event && <EventPromoReport key={event.id} eventId={event.id} eventTitle={event.title} eventDate={event.date} />}
  </div></main>;
}
