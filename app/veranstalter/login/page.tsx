'use client';
import { Suspense } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!email.trim()) return;
    setLoading(true); setError('');
    const res = await fetch('/api/veranstalter/check-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();
    if (data.error) { setError(data.error); setLoading(false); }
    else if (data.success) {
      localStorage.setItem('veranstalter_email', email.trim());
      localStorage.setItem('veranstalter_id', data.veranstalter_id);
      localStorage.setItem('veranstalter_name', data.firmenname);
      document.cookie = 'veranstalter_id=' + data.veranstalter_id + '; path=/; max-age=86400';
      window.location.href = '/veranstalter/dashboard?vid=' + data.veranstalter_id + '&name=' + encodeURIComponent(data.firmenname);
    }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb'}}>
      <div style={{width:'100%',maxWidth:'420px',padding:'0 16px'}}>
        <div style={{background:'#fff',borderRadius:'16px',padding:'40px',boxShadow:'0 4px 24px rgba(0,0,0,0.07)',border:'1px solid #f0f0f0'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <p style={{fontSize:'36px',margin:'0 0 12px'}}>🎟</p>
            <h1 style={{margin:'0 0 6px',fontSize:'22px',fontWeight:'700',color:'#111'}}>Wolnaa</h1>
            <p style={{margin:0,color:'#6b7280',fontSize:'14px'}}>Veranstalter-Portal</p>
          </div>
          {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'12px',marginBottom:'20px'}}><p style={{color:'#dc2626',fontSize:'14px',margin:0}}>{error}</p></div>}
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontWeight:'500',fontSize:'14px',color:'#374151',marginBottom:'6px'}}>E-Mail Adresse</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter' && handleLogin()} placeholder="deine@email.de"
              style={{width:'100%',padding:'12px 14px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'15px',outline:'none',color:'#111'}} />
          </div>
          <button onClick={handleLogin} disabled={loading || !email.trim()}
            style={{width:'100%',padding:'13px',background:loading||!email.trim()?'#9ca3af':'#111827',color:'#fff',border:'none',borderRadius:'8px',fontSize:'15px',fontWeight:'600',cursor:loading||!email.trim()?'not-allowed':'pointer'}}>
            {loading ? 'Prüfe Zugang...' : 'Einloggen'}
          </button>
          <p style={{textAlign:'center',color:'#9ca3af',fontSize:'12px',marginTop:'20px'}}>
            Nur für eingeladene Veranstalter.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VeranstalterLogin() {
  return (
    <Suspense fallback={<div>Laden...</div>}>
      <LoginForm />
    </Suspense>
  );
}
