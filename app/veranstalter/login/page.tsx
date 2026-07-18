'use client';
import { useState } from 'react';

export default function VeranstalterLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/veranstalter/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: 'include',
      });
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }
      const data = await res.json();
      if (data.error) setError(data.error);
    } catch(e) {
      setError('Fehler beim Einloggen.');
    }
    setLoading(false);
  };

  const requestPasswordReset = async () => {
    if (!email.trim()) {
      setError('Bitte zuerst deine E-Mail-Adresse eingeben.');
      return;
    }
    setLoading(true);
    setError('');
    const res = await fetch('/api/veranstalter/passwort-vergessen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    setLoading(false);
    if (res.ok) setResetSent(true);
    else setError('Die E-Mail konnte nicht versendet werden.');
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb'}}>
      <div style={{width:'100%',maxWidth:'420px',padding:'0 16px'}}>
        <div style={{background:'#fff',borderRadius:'16px',padding:'40px',boxShadow:'0 4px 24px rgba(0,0,0,0.07)',border:'1px solid #f0f0f0'}}>
          <div style={{textAlign:'center',marginBottom:'32px'}}>
            <img src="/wolnaa-logo-gold-header.png" alt="Wolnaa" style={{height:'40px',width:'auto',display:'block',margin:'0 auto 16px'}} />
            <p style={{margin:0,color:'#6b7280',fontSize:'14px'}}>Veranstalter-Portal</p>
          </div>
          {error && <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'8px',padding:'12px',marginBottom:'20px'}}><p style={{color:'#dc2626',fontSize:'14px',margin:0}}>{error}</p></div>}
          {resetSent && <div style={{background:'#f0fdf4',border:'1px solid #86efac',borderRadius:'8px',padding:'12px',marginBottom:'20px'}}><p style={{color:'#15803d',fontSize:'14px',margin:0}}>Falls ein Konto existiert, wurde ein Link zum Festlegen des Passworts versendet.</p></div>}
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontWeight:'500',fontSize:'14px',color:'#374151',marginBottom:'6px'}}>E-Mail Adresse</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleSubmit()}
              placeholder="deine@email.de"
              style={{width:'100%',padding:'12px 14px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'15px',outline:'none',color:'#111',boxSizing:'border-box' as const}} />
          </div>
          <div style={{marginBottom:'16px'}}>
            <label style={{display:'block',fontWeight:'500',fontSize:'14px',color:'#374151',marginBottom:'6px'}}>Passwort</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key==='Enter' && handleSubmit()}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{width:'100%',padding:'12px 14px',border:'1px solid #d1d5db',borderRadius:'8px',fontSize:'15px',outline:'none',color:'#111',boxSizing:'border-box' as const}} />
          </div>
          <button onClick={handleSubmit} disabled={loading || !email.trim() || !password}
            style={{width:'100%',padding:'13px',background:loading||!email.trim()||!password?'#d1d5db':'#d6b36a',color:'#111',border:'none',borderRadius:'8px',fontSize:'15px',fontWeight:'700',cursor:loading||!email.trim()||!password?'not-allowed':'pointer'}}>
            {loading ? 'Prüfe...' : 'Einloggen'}
          </button>
          <button type="button" onClick={requestPasswordReset} disabled={loading} style={{width:'100%',marginTop:'12px',padding:'8px',border:'none',background:'transparent',color:'#6b7280',fontSize:'13px',cursor:'pointer'}}>Passwort festlegen oder vergessen?</button>
          <p style={{textAlign:'center',color:'#9ca3af',fontSize:'12px',marginTop:'20px'}}>
            Nur für eingeladene Veranstalter.
          </p>
        </div>
      </div>
    </div>
  );
}
