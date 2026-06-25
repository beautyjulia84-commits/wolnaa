'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function VeranstalterEvents() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'alle'|'kommend'|'vergangen'>('alle');

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: v } = await supabase.from('veranstalter').select('id').eq('user_id', user.id).single();
      if (!v) return;
      const { data } = await supabase.from('events').select('*').eq('veranstalter_id', v.id).order('date', { ascending:false });
      setEvents(data || []);
      setLoading(false);
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
          <p style={{ fontSize:'36px', margin:'0 0 12px' }}>🎪</p>
          <p style={{ color:'#6b7280' }}>Keine Events gefunden.</p>
        </div>
      ) : (
        <div style={{ display:'grid', gap:'12px' }}>
          {filtered.map((e:any) => {
            const isPast = new Date(e.date) < now;
            return (
              <div key={e.id} style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                    <h3 style={{ margin:0, fontSize:'16px', fontWeight:'600', color:'#111' }}>{e.title}</h3>
                    <span style={{ background:isPast?'#f3f4f6':'#dcfce7', color:isPast?'#6b7280':'#15803d', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'500' }}>
                      {isPast ? 'Abgeschlossen' : 'Kommend'}
                    </span>
                  </div>
                  <p style={{ margin:0, color:'#6b7280', fontSize:'13px' }}>
                    📅 {new Date(e.date).toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'long',year:'numeric'})}
                    {e.location && ` · 📍 ${e.location}`}
                  </p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:'32px', marginLeft:'24px' }}>
                  <div style={{ textAlign:'center' }}>
                    <p style={{ margin:0, fontSize:'20px', fontWeight:'700', color:'#111' }}>{e.tickets_sold||0}</p>
                    <p style={{ margin:0, fontSize:'12px', color:'#9ca3af' }}>Tickets</p>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <Link href={`/veranstalter/events/${e.id}/teilnehmer`} style={{ padding:'8px 14px', border:'1px solid #e5e7eb', borderRadius:'8px', color:'#374151', textDecoration:'none', fontSize:'13px', fontWeight:'500' }}>👥 Teilnehmer</Link>
                    <Link href={`/veranstalter/events/${e.id}`} style={{ padding:'8px 14px', background:'#111827', borderRadius:'8px', color:'#fff', textDecoration:'none', fontSize:'13px', fontWeight:'500' }}>Bearbeiten</Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
