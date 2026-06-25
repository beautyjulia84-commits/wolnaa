'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';

export default function VeranstalterDashboard() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [stats, setStats] = useState({ totalEvents:0, totalTickets:0, totalUmsatz:0, stripeOk:false });
  const [events, setEvents] = useState<any[]>([]);
  const [veranstalter, setVeranstalter] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: v } = await supabase.from('veranstalter').select('*').eq('user_id', user.id).single();
      if (!v) return;
      setVeranstalter(v);
      const { data: ev } = await supabase.from('events').select('id,title,date,tickets_sold,total_revenue').eq('veranstalter_id', v.id).order('date', { ascending:false }).limit(5);
      const evList = ev || [];
      setEvents(evList);
      setStats({
        totalEvents: evList.length,
        totalTickets: evList.reduce((s:number, e:any) => s + (e.tickets_sold||0), 0),
        totalUmsatz: evList.reduce((s:number, e:any) => s + (e.total_revenue||0), 0),
        stripeOk: v.stripe_charges_enabled,
      });
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <p style={{ color:'#666' }}>Laden...</p>;
  const h = new Date().getHours();
  const greet = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <div>
      <div style={{ marginBottom:'32px' }}>
        <h1 style={{ margin:'0 0 4px', fontSize:'26px', fontWeight:'700', color:'#111' }}>{greet}, {veranstalter?.firmenname} 👋</h1>
        <p style={{ margin:0, color:'#6b7280', fontSize:'15px' }}>Hier ist deine Übersicht.</p>
      </div>

      {!stats.stripeOk && (
        <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'12px', padding:'16px 20px', marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ margin:'0 0 2px', fontWeight:'600', color:'#92400e', fontSize:'14px' }}>⚠️ Stripe-Konto nicht verbunden</p>
            <p style={{ margin:0, color:'#b45309', fontSize:'13px' }}>Verbinde dein Stripe-Konto um Tickets zu verkaufen.</p>
          </div>
          <Link href="/veranstalter/einstellungen" style={{ background:'#f59e0b', color:'#fff', padding:'8px 16px', borderRadius:'8px', textDecoration:'none', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap' }}>Jetzt verbinden →</Link>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginBottom:'32px' }}>
        {[
          { label:'Events gesamt', value:stats.totalEvents, icon:'🎪', bg:'#eff6ff' },
          { label:'Tickets verkauft', value:stats.totalTickets, icon:'🎟', bg:'#f0fdf4' },
          { label:'Umsatz gesamt', value:`€${(stats.totalUmsatz/100).toFixed(2)}`, icon:'💶', bg:'#fdf4ff' },
        ].map(c => (
          <div key={c.label} style={{ background:c.bg, border:'1px solid #e5e7eb', borderRadius:'12px', padding:'24px' }}>
            <p style={{ fontSize:'28px', margin:'0 0 8px' }}>{c.icon}</p>
            <p style={{ fontSize:'30px', fontWeight:'700', margin:'0 0 4px', color:'#111' }}>{c.value}</p>
            <p style={{ color:'#6b7280', fontSize:'13px', margin:0 }}>{c.label}</p>
          </div>
        ))}
      </div>

      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', overflow:'hidden' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 24px', borderBottom:'1px solid #f3f4f6' }}>
          <h2 style={{ margin:0, fontSize:'17px', fontWeight:'600' }}>Meine Events</h2>
          <Link href="/veranstalter/events/neu" style={{ background:'#111827', color:'#fff', padding:'8px 16px', borderRadius:'8px', textDecoration:'none', fontSize:'13px' }}>+ Neues Event</Link>
        </div>
        {events.length === 0 ? (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <p style={{ fontSize:'36px', margin:'0 0 12px' }}>🎪</p>
            <p style={{ color:'#6b7280', margin:'0 0 16px' }}>Noch keine Events. Erstelle dein erstes Event!</p>
            <Link href="/veranstalter/events/neu" style={{ background:'#111827', color:'#fff', padding:'10px 20px', borderRadius:'8px', textDecoration:'none', fontSize:'14px' }}>Erstes Event erstellen</Link>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:'#f9fafb' }}>
              {['Event','Datum','Tickets','Umsatz',''].map(h => <th key={h} style={{ padding:'12px 24px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#6b7280', textTransform:'uppercase' }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {events.map((e:any, i:number) => (
                <tr key={e.id} style={{ borderTop: i===0?'none':'1px solid #f3f4f6' }}>
                  <td style={{ padding:'16px 24px', fontWeight:'500', color:'#111', fontSize:'14px' }}>{e.title}</td>
                  <td style={{ padding:'16px 24px', color:'#6b7280', fontSize:'14px' }}>{new Date(e.date).toLocaleDateString('de-DE',{day:'2-digit',month:'short',year:'numeric'})}</td>
                  <td style={{ padding:'16px 24px', color:'#111', fontSize:'14px' }}>{e.tickets_sold||0}</td>
                  <td style={{ padding:'16px 24px', color:'#111', fontSize:'14px', fontWeight:'500' }}>€{((e.total_revenue||0)/100).toFixed(2)}</td>
                  <td style={{ padding:'16px 24px' }}><Link href={`/veranstalter/events/${e.id}`} style={{ color:'#4f46e5', fontSize:'13px', textDecoration:'none', fontWeight:'500' }}>Bearbeiten →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
