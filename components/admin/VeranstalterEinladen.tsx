'use client';
import { useState } from 'react';

export default function VeranstalterEinladen() {
  const [form, setForm] = useState({ email:'', firmenname:'', telefon:'', website:'', platformFeePercent:'3' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{type:'success'|'error';message:string}|null>(null);
  const [open, setOpen] = useState(false);
  const set = (f:string, v:string) => setForm(p => ({ ...p, [f]:v }));

  const handleEinladen = async () => {
    if (!form.email || !form.firmenname) { setResult({ type:'error', message:'E-Mail und Firmenname sind Pflichtfelder.' }); return; }
    setLoading(true); setResult(null);
    const res = await fetch('/api/admin/veranstalter/einladen', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email:form.email, firmenname:form.firmenname, telefon:form.telefon||undefined, website:form.website||undefined, platformFeePercent:parseFloat(form.platformFeePercent) }),
    });
    const data = await res.json();
    if (data.success) {
      setResult({ type:'success', message:`✅ Einladung gesendet an ${form.email}` });
      setForm({ email:'', firmenname:'', telefon:'', website:'', platformFeePercent:'3' });
      setTimeout(() => setOpen(false), 2500);
    } else {
      setResult({ type:'error', message:data.error || 'Fehler beim Einladen.' });
    }
    setLoading(false);
  };

  const inp = { width:'100%', padding:'10px 12px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box' as const };

  return (
    <div>
      <button onClick={() => setOpen(!open)} style={{ background:'#111827', color:'#fff', padding:'10px 20px', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'500', cursor:'pointer' }}>
        + Veranstalter einladen
      </button>
      {open && (
        <div style={{ marginTop:'16px', background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', padding:'24px', maxWidth:'500px' }}>
          <h3 style={{ margin:'0 0 20px', fontSize:'16px', fontWeight:'600' }}>Neuen Veranstalter einladen</h3>
          {result && (
            <div style={{ background:result.type==='success'?'#f0fdf4':'#fef2f2', border:`1px solid ${result.type==='success'?'#86efac':'#fecaca'}`, borderRadius:'8px', padding:'12px', marginBottom:'16px' }}>
              <p style={{ margin:0, fontSize:'14px', color:result.type==='success'?'#15803d':'#dc2626' }}>{result.message}</p>
            </div>
          )}
          <div style={{ display:'grid', gap:'12px' }}>
            <div><label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>E-Mail *</label><input type="email" style={inp} value={form.email} onChange={e=>set('email',e.target.value)} placeholder="veranstalter@email.de" /></div>
            <div><label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>Firmenname *</label><input style={inp} value={form.firmenname} onChange={e=>set('firmenname',e.target.value)} placeholder="Max Mustermann Events" /></div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>Telefon</label><input style={inp} value={form.telefon} onChange={e=>set('telefon',e.target.value)} placeholder="+49 151..." /></div>
              <div><label style={{ display:'block', fontSize:'13px', fontWeight:'500', marginBottom:'5px' }}>Plattformgebühr (%)</label><input type="number" min="0" max="20" step="0.5" style={inp} value={form.platformFeePercent} onChange={e=>set('platformFeePercent',e.target.value)} /></div>
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', marginTop:'20px' }}>
            <button onClick={() => setOpen(false)} style={{ flex:1, padding:'10px', border:'1px solid #d1d5db', borderRadius:'8px', background:'#fff', color:'#374151', fontSize:'14px', cursor:'pointer' }}>Abbrechen</button>
            <button onClick={handleEinladen} disabled={loading} style={{ flex:2, padding:'10px', background:loading?'#9ca3af':'#111827', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'500', cursor:loading?'not-allowed':'pointer' }}>
              {loading ? 'Sende Einladung...' : '📧 Einladung senden'}
            </button>
          </div>
          <p style={{ margin:'12px 0 0', color:'#9ca3af', fontSize:'12px' }}>Der Veranstalter erhält eine Einladungs-E-Mail mit Magic Link.</p>
        </div>
      )}
    </div>
  );
}
