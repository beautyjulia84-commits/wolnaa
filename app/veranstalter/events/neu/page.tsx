'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function NeuesEvent() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ title:'', date:'', time:'', location:'', description:'', ticket_price:'', max_tickets:'', image_url:'' });
  const set = (f:string, v:string) => setForm(p => ({ ...p, [f]:v }));

  const handleSave = async () => {
    if (!form.title || !form.date || !form.ticket_price) { setError('Bitte fülle alle Pflichtfelder aus.'); return; }
    setSaving(true); setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: v } = await supabase.from('veranstalter').select('id,stripe_account_id,stripe_charges_enabled').eq('user_id', user.id).single();
    if (!v?.stripe_charges_enabled) { setError('Bitte verbinde zuerst dein Stripe-Konto unter Einstellungen.'); setSaving(false); return; }
    const eventDate = form.time ? new Date(`${form.date}T${form.time}:00`).toISOString() : new Date(form.date).toISOString();
    const { error: e } = await supabase.from('events').insert({
      title: form.title, date: eventDate, location: form.location, description: form.description,
      ticket_price: Math.round(parseFloat(form.ticket_price)*100),
      max_tickets: parseInt(form.max_tickets)||null,
      image_url: form.image_url||null,
      veranstalter_id: v.id, stripe_account_id: v.stripe_account_id,
    });
    if (e) { setError('Fehler: '+e.message); setSaving(false); return; }
    router.push('/veranstalter/events');
  };

  const inp = { width:'100%', padding:'11px 14px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', color:'#111', boxSizing:'border-box' as const, outline:'none' };
  const lbl = { display:'block' as const, fontWeight:'500' as const, fontSize:'13px', color:'#374151', marginBottom:'6px' };

  return (
    <div style={{ maxWidth:'720px' }}>
      <div style={{ marginBottom:'28px' }}>
        <h1 style={{ margin:'0 0 4px', fontSize:'26px', fontWeight:'700', color:'#111' }}>Neues Event</h1>
        <p style={{ margin:0, color:'#6b7280', fontSize:'15px' }}>* Pflichtfelder</p>
      </div>
      {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'12px 16px', marginBottom:'24px' }}><p style={{ color:'#dc2626', fontSize:'14px', margin:0 }}>⚠️ {error}</p></div>}
      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', overflow:'hidden' }}>
        <div style={{ padding:'24px', borderBottom:'1px solid #f3f4f6' }}>
          <h2 style={{ margin:'0 0 16px', fontSize:'15px', fontWeight:'600', color:'#111' }}>🎪 Event-Informationen</h2>
          <div style={{ display:'grid', gap:'16px' }}>
            <div><label style={lbl}>Event-Name *</label><input style={inp} value={form.title} onChange={e=>set('title',e.target.value)} placeholder="z.B. PMU Summit 2025" /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
              <div><label style={lbl}>Datum *</label><input type="date" style={inp} value={form.date} onChange={e=>set('date',e.target.value)} /></div>
              <div><label style={lbl}>Uhrzeit</label><input type="time" style={inp} value={form.time} onChange={e=>set('time',e.target.value)} /></div>
            </div>
            <div><label style={lbl}>Veranstaltungsort</label><input style={inp} value={form.location} onChange={e=>set('location',e.target.value)} placeholder="z.B. Metropolis, Trier" /></div>
            <div><label style={lbl}>Beschreibung</label><textarea value={form.description} onChange={e=>set('description',e.target.value)} rows={4} style={{ ...inp, resize:'vertical' }} placeholder="Beschreibe dein Event..." /></div>
          </div>
        </div>
        <div style={{ padding:'24px', borderBottom:'1px solid #f3f4f6' }}>
          <h2 style={{ margin:'0 0 16px', fontSize:'15px', fontWeight:'600', color:'#111' }}>🎟 Ticket-Einstellungen</h2>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
            <div><label style={lbl}>Ticketpreis (€) *</label><input type="number" min="0" step="0.01" style={inp} value={form.ticket_price} onChange={e=>set('ticket_price',e.target.value)} placeholder="29.99" /></div>
            <div><label style={lbl}>Max. Tickets (leer = unbegrenzt)</label><input type="number" min="1" style={inp} value={form.max_tickets} onChange={e=>set('max_tickets',e.target.value)} placeholder="200" /></div>
          </div>
        </div>
        <div style={{ padding:'24px', borderBottom:'1px solid #f3f4f6' }}>
          <h2 style={{ margin:'0 0 16px', fontSize:'15px', fontWeight:'600', color:'#111' }}>🖼 Event-Bild</h2>
          <div><label style={lbl}>Bild-URL (optional)</label><input style={inp} value={form.image_url} onChange={e=>set('image_url',e.target.value)} placeholder="https://..." /></div>
        </div>
        <div style={{ padding:'20px 24px', background:'#f9fafb', display:'flex', justifyContent:'flex-end', gap:'12px' }}>
          <button onClick={() => router.back()} style={{ padding:'10px 20px', border:'1px solid #d1d5db', borderRadius:'8px', background:'#fff', color:'#374151', fontSize:'14px', cursor:'pointer' }}>Abbrechen</button>
          <button onClick={handleSave} disabled={saving} style={{ padding:'10px 20px', background:saving?'#9ca3af':'#111827', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'500', cursor:saving?'not-allowed':'pointer' }}>
            {saving ? 'Speichern...' : '✅ Event veröffentlichen'}
          </button>
        </div>
      </div>
    </div>
  );
}
