'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Einstellungen() {
  const stripeConnectVersion = 'stripe-oauth-v4';
  const searchParams = useSearchParams();
  const [veranstalter, setVeranstalter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (searchParams.get('success')==='stripe_connected') setMsg('✅ Stripe-Konto erfolgreich verbunden!');
    if (searchParams.get('error')==='connect_failed') {
      const reason = searchParams.get('reason');
      setMsg('❌ Verbindung fehlgeschlagen' + (reason ? ` (${reason})` : '') + '. Bitte versuche es erneut.');
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/veranstalter/data');
        const json = await res.json();

        if (!res.ok || !json.veranstalter) {
          window.location.href = '/veranstalter/login';
          return;
        }

        localStorage.setItem('veranstalter_name', json.veranstalter?.firmenname || '');
        setVeranstalter(json.veranstalter);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleStripeConnect = async () => {
    setConnecting(true);
    setMsg('');
    try {
      const res = await fetch('/api/stripe/connect', {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          veranstalterId: veranstalter?.id,
          version: stripeConnectVersion,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        setMsg('❌ ' + (data.error || 'Stripe-Verbindung fehlgeschlagen.') + ` [${res.status} / ${data.version || stripeConnectVersion}]`);
        setConnecting(false);
        return;
      }

      window.location.href = data.url;
    } catch (e) {
      setMsg('❌ Stripe-Verbindung fehlgeschlagen.');
      setConnecting(false);
    }
  };

  const handleStripeDashboard = async () => {
    const res = await fetch('/api/stripe/connect/manage', { method:'POST', headers:{'Content-Type':'application/json'} });
    const { url } = await res.json();
    window.open(url, '_blank');
  };

  if (loading) return <p style={{ color:'#666' }}>Laden...</p>;

  return (
    <div style={{ maxWidth:'680px' }}>
      <div style={{ marginBottom:'28px' }}>
        <h1 style={{ margin:'0 0 4px', fontSize:'26px', fontWeight:'700', color:'#111' }}>Einstellungen</h1>
        <p style={{ margin:0, color:'#6b7280', fontSize:'15px' }}>Zahlungseinstellungen und Profil.</p>
      </div>

      {msg && (
        <div style={{ background:msg.startsWith('✅')?'#f0fdf4':'#fef2f2', border:`1px solid ${msg.startsWith('✅')?'#86efac':'#fecaca'}`, borderRadius:'10px', padding:'14px 18px', marginBottom:'20px' }}>
          <p style={{ color:msg.startsWith('✅')?'#15803d':'#dc2626', margin:0, fontWeight:'500' }}>{msg}</p>
        </div>
      )}

      {/* Stripe */}
      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', overflow:'hidden', marginBottom:'16px' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f3f4f6' }}>
          <h2 style={{ margin:'0 0 4px', fontSize:'16px', fontWeight:'600', color:'#111' }}>💳 Stripe Zahlungskonto</h2>
          <p style={{ margin:0, color:'#6b7280', fontSize:'13px' }}>Verbinde dein Stripe-Konto um Ticketeinnahmen direkt zu erhalten.</p>
          <p style={{ margin:'6px 0 0', color:'#d97706', fontSize:'11px', fontWeight:600 }}>Connect-Version: {stripeConnectVersion}</p>
        </div>
        <div style={{ padding:'24px' }}>
          {veranstalter?.stripe_account_id && veranstalter?.stripe_charges_enabled ? (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
                <div style={{ width:'40px', height:'40px', background:'#dcfce7', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px' }}>✅</div>
                <div>
                  <p style={{ margin:0, fontWeight:'600', color:'#111', fontSize:'15px' }}>Konto verbunden</p>
                  <p style={{ margin:0, color:'#6b7280', fontSize:'13px' }}>ID: {veranstalter.stripe_account_id}</p>
                </div>
              </div>
              <button onClick={handleStripeDashboard} style={{ padding:'10px 18px', border:'1px solid #d1d5db', borderRadius:'8px', background:'#fff', color:'#374151', fontSize:'14px', fontWeight:'500', cursor:'pointer' }}>
                Stripe Dashboard öffnen ↗
              </button>
            </div>
          ) : (
            <div>
              <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'10px', padding:'16px', marginBottom:'20px' }}>
                <p style={{ color:'#92400e', margin:'0 0 4px', fontWeight:'600', fontSize:'14px' }}>⚠️ Kein Stripe-Konto verbunden</p>
                <p style={{ color:'#b45309', margin:0, fontSize:'13px' }}>Du kannst erst Events verkaufen wenn du ein Stripe-Konto verknüpft hast.</p>
              </div>
              <button onClick={handleStripeConnect} disabled={connecting}
                style={{ padding:'12px 24px', background:connecting?'#9ca3af':'#635bff', color:'#fff', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:connecting?'not-allowed':'pointer' }}>
                {connecting ? 'Weiterleitung...' : '🔗 Mit Stripe verbinden'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profil */}
      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e5e7eb', overflow:'hidden' }}>
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f3f4f6' }}>
          <h2 style={{ margin:0, fontSize:'16px', fontWeight:'600', color:'#111' }}>👤 Mein Profil</h2>
        </div>
        <div style={{ padding:'24px' }}>
          {[
            { label:'Firmenname', value:veranstalter?.firmenname },
            { label:'E-Mail', value:veranstalter?.kontakt_email },
            { label:'Plattformgebühr (Wolnaa)', value:`${veranstalter?.platform_fee_percent}%` },
          ].map((item, i, arr) => (
            <div key={item.label} style={{ display:'flex', justifyContent:'space-between', padding:'14px 0', borderBottom:i<arr.length-1?'1px solid #f3f4f6':'none' }}>
              <span style={{ color:'#6b7280', fontSize:'14px' }}>{item.label}</span>
              <span style={{ fontWeight:'500', color:'#111', fontSize:'14px' }}>{item.value}</span>
            </div>
          ))}
          <p style={{ margin:'16px 0 0', color:'#9ca3af', fontSize:'12px' }}>Für Profiländerungen kontaktiere bitte Wolnaa direkt.</p>
        </div>
      </div>
    </div>
  );
}
