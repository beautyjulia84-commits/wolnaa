'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function Teilnehmerliste() {
  const supabase = createClientComponentClient();
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle'|'eingecheckt'|'ausstehend'>('alle');
  const [checkingIn, setCheckingIn] = useState<string|null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: ev } = await supabase.from('events').select('id,title,date,location').eq('id', eventId).single();
      setEvent(ev);
      const { data: tk } = await supabase.from('tickets').select('*').eq('event_id', eventId).order('created_at', { ascending:false });
      setTickets(tk || []);
      setLoading(false);
    };
    load();
  }, [eventId]);

  const handleCheckIn = async (ticketId:string, current:boolean) => {
    setCheckingIn(ticketId);
    const { error } = await supabase.from('tickets').update({ checked_in:!current, checked_in_at:!current?new Date().toISOString():null }).eq('id', ticketId);
    if (!error) setTickets(p => p.map(t => t.id===ticketId ? { ...t, checked_in:!current, checked_in_at:!current?new Date().toISOString():null } : t));
    setCheckingIn(null);
  };

  const filtered = tickets.filter(t => {
    const s = !search || t.buyer_name?.toLowerCase().includes(search.toLowerCase()) || t.buyer_email?.toLowerCase().includes(search.toLowerCase());
    const f = filter==='alle' || (filter==='eingecheckt'&&t.checked_in) || (filter==='ausstehend'&&!t.checked_in);
    return s && f;
  });

  const checkedIn = tickets.filter(t => t.checked_in).length;
  if (loading) return <p style={{ color:'#666' }}>Laden...</p>;

  return (
    <div>
      <div style={{ marginBottom:'24px' }}>
        <p style={{ margin:'0 0 4px', color:'#6b7280', fontSize:'14px' }}>← <a href="/veranstalter/events" style={{ color:'#6b7280', textDecoration:'none' }}>Meine Events</a></p>
        <h1 style={{ margin:'0 0 4px', fontSize:'24px', fontWeight:'700', color:'#111' }}>👥 Teilnehmerliste</h1>
        <p style={{ margin:0, color:'#6b7280', fontSize:'15px' }}>{event?.title} · {new Date(event?.date).toLocaleDateString('de-DE')}{event?.location && ` · ${event.location}`}</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px', marginBottom:'20px' }}>
        {[{label:'Tickets gesamt',value:tickets.length,bg:'#eff6ff'},{label:'Eingecheckt',value:checkedIn,bg:'#f0fdf4'},{label:'Ausstehend',value:tickets.length-checkedIn,bg:'#fffbeb'}].map(s => (
          <div key={s.label} style={{ background:s.bg, borderRadius:'10px', padding:'16px 20px', border:'1px solid #e5e7eb' }}>
            <p style={{ margin:'0 0 4px', fontSize:'24px', fontWeight:'700', color:'#111' }}>{s.value}</p>
            <p style={{ margin:0, fontSize:'13px', color:'#6b7280' }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', borderRadius:'10px', border:'1px solid #e5e7eb', padding:'16px 20px', marginBottom:'16px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
          <span style={{ fontSize:'13px', color:'#374151', fontWeight:'500' }}>Check-in Fortschritt</span>
          <span style={{ fontSize:'13px', fontWeight:'600' }}>{tickets.length>0?Math.round((checkedIn/tickets.length)*100):0}%</span>
        </div>
        <div style={{ background:'#f3f4f6', borderRadius:'4px', height:'8px', overflow:'hidden' }}>
          <div style={{ background:'#22c55e', height:'100%', width:`${tickets.length>0?(checkedIn/tickets.length)*100:0}%`, borderRadius:'4px', transition:'width 0.3s' }} />
        </div>
      </div>

      <div style={{ display:'flex', gap:'12px', marginBottom:'16px', flexWrap:'wrap' }}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Name oder E-Mail..." style={{ flex:1, minWidth:'200px', padding:'9px 14px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', outline:'none' }} />
        <div style={{ display:'flex', gap:'6px' }}>
          {(['alle','eingecheckt','ausstehend'] as const).map(f => (
            <button key={f} onClick={()=>setFilter(f)} style={{ padding:'8px 14px', borderRadius:'8px', border:'1px solid', borderColor:filter===f?'#111827':'#e5e7eb', background:filter===f?'#111827':'#fff', color:filter===f?'#fff':'#6b7280', fontSize:'13px', cursor:'pointer', fontWeight:'500' }}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', overflow:'hidden' }}>
        {filtered.length===0 ? <div style={{ padding:'48px', textAlign:'center' }}><p style={{ color:'#9ca3af' }}>Keine Teilnehmer gefunden.</p></div> : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f9fafb' }}>
              {['Name','E-Mail','Tickets','Datum','Status','Check-in'].map(h => <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#6b7280', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((t:any, i:number) => (
                <tr key={t.id} style={{ borderTop:i===0?'none':'1px solid #f3f4f6' }}>
                  <td style={{ padding:'14px 20px', fontWeight:'500', color:'#111', fontSize:'14px' }}>{t.buyer_name||'—'}</td>
                  <td style={{ padding:'14px 20px', color:'#6b7280', fontSize:'14px' }}>{t.buyer_email}</td>
                  <td style={{ padding:'14px 20px', color:'#111', fontSize:'14px' }}>{t.quantity}x</td>
                  <td style={{ padding:'14px 20px', color:'#6b7280', fontSize:'13px' }}>{new Date(t.created_at).toLocaleDateString('de-DE')}</td>
                  <td style={{ padding:'14px 20px' }}>
                    <span style={{ background:t.checked_in?'#dcfce7':'#f3f4f6', color:t.checked_in?'#15803d':'#6b7280', padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'500' }}>
                      {t.checked_in ? '✅ Eingecheckt' : '⏳ Ausstehend'}
                    </span>
                  </td>
                  <td style={{ padding:'14px 20px' }}>
                    <button onClick={()=>handleCheckIn(t.id,t.checked_in)} disabled={checkingIn===t.id}
                      style={{ padding:'7px 14px', borderRadius:'7px', border:'1px solid', borderColor:t.checked_in?'#fecaca':'#bbf7d0', background:t.checked_in?'#fef2f2':'#f0fdf4', color:t.checked_in?'#dc2626':'#16a34a', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
                      {checkingIn===t.id ? '...' : t.checked_in ? 'Rückgängig' : 'Einchecken'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ marginTop:'16px', textAlign:'right' }}>
        <button onClick={() => {
          const csv = [['Name','E-Mail','Tickets','Status','Datum'].join(','), ...tickets.map((t:any)=>[t.buyer_name||'',t.buyer_email,t.quantity,t.checked_in?'Eingecheckt':'Ausstehend',new Date(t.created_at).toLocaleDateString('de-DE')].join(','))].join('\n');
          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`teilnehmer-${eventId}.csv`; a.click();
        }} style={{ padding:'9px 18px', border:'1px solid #d1d5db', borderRadius:'8px', background:'#fff', color:'#374151', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
          📥 CSV exportieren
        </button>
      </div>
    </div>
  );
}
