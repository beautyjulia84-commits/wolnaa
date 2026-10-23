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
  return <main className="admin-tool-page"><div className="admin-tool-heading"><p className="admin-eyebrow">Auswertung</p><h1>Promocode-Verkäufe</h1><p>Verkäufe und eingelöste Codes für eine Veranstaltung auswerten. Auch archivierte Events bleiben verfügbar.</p></div>
    <section className="admin-form-panel"><h2>Veranstaltung wählen</h2>
    {error && <p role="alert" className="admin-feedback text-red-700">{error}</p>}
    <label>Veranstaltung<select disabled={loading} value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">{loading?'Veranstaltungen werden geladen …':'Veranstaltung auswählen'}</option>{events.map(event=><option key={event.id} value={event.id}>{event.title} · {new Date(event.date+'T12:00:00').toLocaleDateString('de-DE')}</option>)}</select></label>
    {!loading && !error && !event && <p className="admin-form-hint">Wähle ein Event, um seine Promocode-Auswertung zu öffnen.</p>}
    {event && <EventPromoReport key={event.id} eventId={event.id} eventTitle={event.title} eventDate={event.date} />}
    </section></main>;
}
