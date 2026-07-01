'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function VeranstalterDashboard() {
  const [stats, setStats] = useState({ totalEvents:0, totalTickets:0, totalUmsatz:0, stripeOk:false });
  const [events, setEvents] = useState<any[]>([]);
  const [veranstalter, setVeranstalter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/veranstalter/data');
        const json = await res.json();

        if (!res.ok || !json.veranstalter) {
          localStorage.removeItem('veranstalter_id');
          document.cookie = 'veranstalter_id=;max-age=0;path=/';
          window.location.href = '/veranstalter/login';
          return;
        }

        localStorage.setItem('veranstalter_name', json.veranstalter?.firmenname || '');
        setVeranstalter(json.veranstalter);

        const evList = json.events || [];
        setEvents(evList);
        setStats({
          totalEvents: evList.length,
          totalTickets: evList.reduce((s:number, e:any) => s + (e.tickets_sold||0), 0),
          totalUmsatz: evList.reduce((s:number, e:any) => s + (e.total_revenue||0), 0),
          stripeOk: !!json.veranstalter.stripe_charges_enabled,
        });
      } catch (e) {
        setError('Dashboard konnte nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p style={{ color:'#666' }}>Laden...</p>;
  if (error) return <p style={{ color:'#dc2626' }}>{error}</p>;

  const h = new Date().getHours();
  const greet = h < 12 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <div>
      <div style={{ marginBottom:'32px' }}>
        <h1 style={{ margin:'0 0 4px', fontSize:'26px', fontWeight:'700', color:'#111' }}>{greet}, {veranstalter?.firmenname}</h1>
        <p style={{ margin:0, color:'#6b7280', fontSize:'15px' }}>Hier ist deine Übersicht.</p>
      </div>

      {!stats.stripeOk && (
        <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'12px', padding:'16px 20px', marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ margin:'0 0 2px', fontWeight:'600', color:'#92400e', fontSize:'14px' }}>Stripe-Konto nicht verbunden</p>
            <p style={{ margin:0, color:'#b45309', fontSize:'13px' }}>Verbinde dein Stripe-Konto um Tickets zu verkaufen.</p>
          </div>
          <Link href="/veranstalter/einstellungen" style={{ background:'#f59e0b', color:'#fff', padding:'8px 16px', borderRadius:'8px', textDecoration:'none', fontSize:'13px', fontWeight:'600', whiteSpace:'nowrap' }}>Jetzt verbinden</Link>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'16px', marginBottom:'32px' }}>
        {[
          { label:'Events gesamt', value:stats.totalEvents, bg:'#eff6ff' },
          { label:'Tickets verkauft', value:stats.totalTickets, bg:'#f0fdf4' },
          { label:'Umsatz gesamt', value:`€${(stats.totalUmsatz/100).toFixed(2)}`, bg:'#fdf4ff' },
        ].map(c => (
          <div key={c.label} style={{ background:c.bg, border:'1px solid #e5e7eb', borderRadius:'12px', padding:'24px' }}>
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
                  <td style={{ padding:'16px 24px', textAlign:'right' }}>
                    <Link href={`/veranstalter/events/${e.id}/teilnehmer`} style={{ color:'#111827', border:'1px solid #d1d5db', borderRadius:'8px', padding:'7px 12px', textDecoration:'none', fontSize:'13px', fontWeight:600, whiteSpace:'nowrap' }}>Tickets ansehen</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
