'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VeranstalterEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'alle'|'kommend'|'vergangen'>('alle');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/veranstalter/events', { cache: 'no-store' });
        const json = await res.json();

        if (!res.ok) {
          window.location.href = '/veranstalter/login';
          return;
        }

        setEvents(json.events || []);
      } catch (e) {
        setError('Events konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  async function deleteEvent(event: any) {
    if (!window.confirm(`„${event.title}“ wirklich löschen?`)) return;
    setDeletingId(event.id);
    setError('');
    try {
      const res = await fetch(`/api/veranstalter/events?id=${encodeURIComponent(event.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Event konnte nicht gelöscht werden.');
      setEvents(current => current.filter(item => item.id !== event.id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Event konnte nicht gelöscht werden.');
    } finally {
      setDeletingId(null);
    }
  }

  const now = new Date();
  const filtered = events.filter(e => {
    if (filter==='kommend') return new Date(e.date) >= now;
    if (filter==='vergangen') return new Date(e.date) < now;
    return true;
  });

  if (loading) return <p style={{ color:'#666' }}>Laden...</p>;
  if (error) return <p style={{ color:'#dc2626' }}>{error}</p>;

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ margin:'0 0 4px', fontSize:'26px', fontWeight:'700', color:'#111' }}>Meine Events</h1>
          <p style={{ margin:0, color:'#6b7280', fontSize:'15px' }}>{events.length} Events insgesamt</p>
        </div>
        <Link href="/veranstalter/events/neu" style={{ background:'#111827', color:'#fff', padding:'10px 20px', borderRadius:'8px', textDecoration:'none', fontSize:'14px', fontWeight:'500' }}>+ Neues Event</Link>
      </div>

      <div style={{ display:'flex', gap:'8px', marginBottom:'20px' }}>
        {(['alle','kommend','vergangen'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding:'7px 16px', borderRadius:'20px', border:'1px solid', borderColor:filter===f?'#111827':'#e5e7eb', background:filter===f?'#111827':'#fff', color:filter===f?'#fff':'#6b7280', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
            {f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', padding:'48px', textAlign:'center' }}>
          <p style={{ color:'#6b7280' }}>Keine Events gefunden.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'12px' }}>
          {filtered.map((e:any) => {
            const isPast = new Date(e.date) < now;
            return (
              <div key={e.id} style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ flex:1 }}>
                  <h3 style={{ margin:'0 0 6px', fontSize:'16px', fontWeight:'600', color:'#111' }}>{e.title}</h3>
                  <p style={{ margin:0, color:'#6b7280', fontSize:'13px' }}>
                    {new Date(e.date).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'long',year:'numeric'})}
                    {e.location && ` · ${e.location}`} · {isPast ? 'Abgeschlossen' : 'Kommend'}
                  </p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginLeft:'24px' }}>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ margin:0, fontSize:'20px', fontWeight:'700', color:'#111' }}>{e.tickets_sold||0}</p>
                    <p style={{ margin:0, fontSize:'12px', color:'#9ca3af' }}>Tickets</p>
                  </div>
                  <Link href={`/veranstalter/events/${e.id}`} style={{ padding:'9px 14px', border:'1px solid #d1d5db', borderRadius:'8px', color:'#111827', textDecoration:'none', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap' }}>Bearbeiten</Link>
                  <Link href={`/veranstalter/events/${e.id}/teilnehmer`} style={{ padding:'9px 14px', border:'1px solid #111827', borderRadius:'8px', background:'#111827', color:'#fff', textDecoration:'none', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap' }}>Tickets/Kunden</Link>
                  <button onClick={() => deleteEvent(e)} disabled={deletingId === e.id} style={{ padding:'9px 14px', border:'1px solid #fecaca', borderRadius:'8px', background:'#fff', color:'#dc2626', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap', cursor:deletingId === e.id ? 'wait' : 'pointer', opacity:deletingId === e.id ? .6 : 1 }}>{deletingId === e.id ? 'Löschen…' : 'Löschen'}</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
