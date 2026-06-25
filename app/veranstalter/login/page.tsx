'use client';
import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function LoginForm() {
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (searchParams.get('error') === 'kein_zugang') setError('Kein Zugang. Bitte kontaktiere Wolnaa.');
  }, [searchParams]);

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/veranstalter/dashboard` },
    });
    if (error) setError('Fehler beim Senden. Bitte versuche es erneut.');
    else setSent(true);
    setLoading(false);
  };

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
      <div style={{ width:'100%', maxWidth:'420px', padding:'0 16px' }}>
        <div style={{ background:'#fff', borderRadius:'16px', padding:'40px', boxShadow:'0 4px 24px rgba(0,0,0,0.07)', border:'1px solid #f0f0f0' }}>
          <div style={{ textAlign:'center', marginBottom:'32px' }}>
            <p style={{ fontSize:'36px', margin:'0 0 12px' }}>🎟</p>
            <h1 style={{ margin:'0 0 6px', fontSize:'22px', fontWeight:'700', color:'#111' }}>Wolnaa</h1>
            <p style={{ margin:0, color:'#6b7280', fontSize:'14px' }}>Veranstalter-Portal</p>
          </div>
          {sent ? (
            <div style={{ textAlign:'center', padding:'16px 0' }}>
              <p style={{ fontSize:'40px', margin:'0 0 16px' }}>✅</p>
              <h2 style={{ margin:'0 0 8px', fontSize:'18px' }}>Link gesendet!</h2>
              <p style={{ color:'#6b7280', fontSize:'14px', lineHeight:'1.5', margin:0 }}>Prüfe deine E-Mails und klicke auf den Login-Link.<br/><strong>{email}</strong></p>
              <button onClick={() => { setSent(false); setEmail(''); }} style={{ marginTop:'20px', background:'none', border:'none', color:'#6b7280', cursor:'pointer', fontSize:'13px', textDecoration:'underline' }}>Andere E-Mail verwenden</button>
            </div>
          ) : (
            <>
              {error && <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'12px', marginBottom:'20px' }}><p style={{ color:'#dc2626', fontSize:'14px', margin:0 }}>{error}</p></div>}
              <div style={{ marginBottom:'16px' }}>
                <label style={{ display:'block', fontWeight:'500', fontSize:'14px', color:'#374151', marginBottom:'6px' }}>E-Mail Adresse</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} placeholder="deine@email.de"
                  style={{ width:'100%', padding:'12px 14px', border:'1px solid #d1d5db', borderRadius:'8px', fontSize:'15px', outline:'none', boxSizing:'border-box' as const, color:'#111' }} />
              </div>
              <button onClick={handleLogin} disabled={loading || !email.trim()}
                style={{ width:'100%', padding:'13px', background: loading||!email.trim() ? '#9ca3af':'#111827', color:'#fff', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor: loading||!email.trim() ? 'not-allowed':'pointer' }}>
                {loading ? 'Sende Link...' : '✉️ Magic Link senden'}
              </button>
              <p style={{ textAlign:'center', color:'#9ca3af', fontSize:'12px', marginTop:'20px', lineHeight:'1.5' }}>
                Nur für eingeladene Veranstalter.<br/>
                Noch kein Zugang? <a href="mailto:info@wolnaa.de" style={{ color:'#6b7280' }}>Kontaktiere uns</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VeranstalterLogin() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>Laden...</div>}>
      <LoginForm />
    </Suspense>
  );
}
