'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function PasswortFestlegen() {
  const supabase = useMemo(() => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setReady(!!session));
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  async function save() {
    setError('');
    if (password.length < 10) return setError('Das Passwort muss mindestens 10 Zeichen lang sein.');
    if (password !== repeat) return setError('Die Passwörter stimmen nicht überein.');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError('Das Passwort konnte nicht gespeichert werden. Bitte fordere einen neuen Link an.');
    setSuccess(true);
    await supabase.auth.signOut();
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#f9fafb',padding:'16px'}}>
      <div style={{width:'100%',maxWidth:'420px',background:'#fff',borderRadius:'16px',padding:'40px',boxShadow:'0 4px 24px rgba(0,0,0,0.07)',border:'1px solid #f0f0f0'}}>
        <img src="/wolnaa-logo-gold-header.png" alt="Wolnaa" style={{height:'40px',width:'auto',display:'block',margin:'0 0 28px'}} />
        <h1 style={{margin:'0 0 8px',fontSize:'24px',color:'#111'}}>Passwort festlegen</h1>
        <p style={{margin:'0 0 24px',color:'#6b7280',fontSize:'14px'}}>Wähle ein sicheres Passwort für dein Veranstalterkonto.</p>
        {success ? <><p style={{color:'#15803d'}}>Dein Passwort wurde gespeichert.</p><a href="/veranstalter/login" style={{display:'block',marginTop:'20px',padding:'12px',background:'#d6b36a',color:'#111',borderRadius:'8px',textAlign:'center',fontWeight:700,textDecoration:'none'}}>Zur Anmeldung</a></> : !ready ? <p style={{color:'#dc2626',fontSize:'14px'}}>Der Link ist ungültig oder abgelaufen. Bitte fordere auf der Loginseite einen neuen Link an.</p> : <>
          {error && <p style={{color:'#dc2626',fontSize:'14px'}}>{error}</p>}
          <label style={{display:'block',fontSize:'14px',color:'#374151',marginBottom:'6px'}}>Neues Passwort</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" style={{width:'100%',padding:'12px',border:'1px solid #d1d5db',borderRadius:'8px',boxSizing:'border-box',marginBottom:'16px',color:'#111'}} />
          <label style={{display:'block',fontSize:'14px',color:'#374151',marginBottom:'6px'}}>Passwort wiederholen</label>
          <input type="password" value={repeat} onChange={e => setRepeat(e.target.value)} autoComplete="new-password" style={{width:'100%',padding:'12px',border:'1px solid #d1d5db',borderRadius:'8px',boxSizing:'border-box',marginBottom:'20px',color:'#111'}} />
          <button onClick={save} disabled={loading} style={{width:'100%',padding:'13px',background:'#d6b36a',color:'#111',border:'none',borderRadius:'8px',fontWeight:700,cursor:'pointer'}}>{loading ? 'Speichert…' : 'Passwort speichern'}</button>
        </>}
      </div>
    </div>
  );
}
