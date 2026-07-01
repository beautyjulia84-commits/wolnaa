'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VeranstalterEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'alle'|'kommend'|'vergangen'>('alle');

  useEffect(() => {
    const load = async () => {
      try {
        const cookieVid = document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('veranstalter_id='))?.split('=')[1];
        const vid = cookieVid || localStorage.getItem('veranstalter_id');

        if (!vid) {
          window.location.href = '/veranstalter/login';
          return;
        }

        const res = await fetch('/api/veranstalter/events?vid=' + encodeURIComponent(vid));
        const json = await res.json();

        if (!res.ok) {
          window.location.href = '/veranstalter/login';
          return;
        }

        localStorage.setItem('veranstalter_id', vid);
        setEvents(json.events || []);
      } catch (e) {
        setError('Events konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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
                <div style={{ display:'flex', alignItems:'center', gap:'16px', marginLeft:'24px' }}>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ margin:0, fontSize:'20px', fontWeight:'700', color:'#111' }}>{e.tickets_sold||0}</p>
                    <p style={{ margin:0, fontSize:'12px', color:'#9ca3af' }}>Tickets</p>
                  </div>
                  <Link href={`/veranstalter/events/${e.id}/teilnehmer`} style={{ padding:'8px 14px', border:'1px solid #e5e7eb', borderRadius:'8px', color:'#374151', textDecoration:'none', fontSize:'13px', fontWeight:'500' }}>Teilnehmer</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
