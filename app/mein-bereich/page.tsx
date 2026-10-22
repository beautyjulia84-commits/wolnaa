"use client";
import CustomerPageShell from '@/components/CustomerPageShell';
import {useEffect,useState,type FormEvent} from 'react';
type Ticket={ticket_id:string;event_title:string;ticket_name:string;status:string};
export default function MeinBereich() {
  const [email,setEmail]=useState('');
  const [code,setCode]=useState('');
  const [sent,setSent]=useState(false);
  const [account,setAccount]=useState<string|null>(null);
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  async function loadTickets() {
    try {
      const res=await fetch('/api/customer/tickets',{cache:'no-store'});
      if(res.status===401) {setAccount(null);return;}
      const data=await res.json();
      if(!res.ok) throw new Error(data.error);
      setAccount(data.email);setTickets(data.tickets);
    } catch {setError('Tickets konnten nicht geladen werden. Bitte erneut versuchen.');}
    finally {setLoading(false);}
  }
  useEffect(()=>{void loadTickets();},[]);
  async function submit(e:FormEvent) {
    e.preventDefault();setError('');setBusy(true);
    try {
      const res=await fetch('/api/customer/access',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sent?{action:'verify',code}:{action:'send',email})});
      const data=await res.json();
      if(!res.ok) throw new Error(data.error);
      if(sent) {await loadTickets();setCode('');} else setSent(true);
    } catch(e) {setError(e instanceof Error?e.message:'Anmeldung fehlgeschlagen.');}
    finally {setBusy(false);}
  }
  async function logout() {
    setBusy(true);setError('');
    try {
      const res=await fetch('/api/customer/access',{method:'DELETE'});
      if(!res.ok) throw new Error();
      setAccount(null);setTickets([]);setSent(false);setCode('');
    } catch {setError('Abmelden fehlgeschlagen. Bitte erneut versuchen.');}
    finally {setBusy(false);}
  }
  return <CustomerPageShell>
    {account ? <>
      <h1>Deine Tickets.</h1>
      <p>Angemeldet als <strong style={{overflowWrap:'anywhere'}}>{account}</strong></p>
      <button className="wolnaa-account-button" disabled={busy} onClick={logout}>Abmelden</button>
      <h2>Deine Tickets</h2>
      {!tickets.length && <p>Für diese E-Mail-Adresse sind keine Tickets hinterlegt. Verwende die Adresse aus deiner Bestellung.</p>}
      {tickets.map(ticket=><article key={ticket.ticket_id} className="wolnaa-ticket-card">
        <h2 style={{marginTop:0}}>{ticket.event_title || 'WOLNAA Event'}</h2><p>{ticket.ticket_name || 'Ticket'}</p>
        {ticket.status==='paid' ? <a className="wolnaa-gold-button" href={`/api/customer/tickets?download=${encodeURIComponent(ticket.ticket_id)}`}>Ticket als PDF herunterladen</a> : <p>{ticket.status==='checked_in'?'Bereits am Einlass verwendet':ticket.status==='cancelled'?'Storniert':ticket.status==='refunded'?'Erstattet':'Kein Download verfügbar'}</p>}
      </article>)}
    </> : <>
      <h1>Deine Tickets.<br />Dein Bereich.</h1>
      <p className="wolnaa-customer-intro">Melde dich mit der E-Mail-Adresse deines Ticketkaufs an.</p>
      <form onSubmit={submit}>
        {!sent ? <><label htmlFor="customer-email">E-Mail-Adresse</label><input id="customer-email" className="wolnaa-account-field" placeholder="name@beispiel.de" type="email" autoComplete="email" maxLength={254} value={email} onChange={e=>setEmail(e.target.value)} required /></> : <>
          <p role="status">Der Code wurde an {email} gesendet. Prüfe auch deinen Spam-Ordner. Er ist zehn Minuten gültig.</p>
          <label htmlFor="customer-code">Sechsstelliger Anmeldecode</label><input id="customer-code" className="wolnaa-account-field" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))} required />
        </>}
        <button className="wolnaa-gold-button wolnaa-account-button wolnaa-customer-primary" disabled={busy || loading}>{busy?'Bitte warten …':sent?'Anmelden':'Anmeldecode erhalten'}</button>
        {sent && <button type="button" className="wolnaa-account-button" disabled={busy} onClick={()=>{setSent(false);setCode('');setError('');}}>Andere Adresse / neuer Code</button>}
      <p className="wolnaa-customer-note">{loading ? "Anmeldung wird geprüft …" : "Ohne Passwort. Dein persönlicher Code kommt per E-Mail."}</p>
      </form>
    </>}
    {error && <p role="alert" style={{color:'#fca5a5'}}>{error}</p>}
    <div className="wolnaa-customer-help"><span>Tickets immer dabei</span><p>Nach der Anmeldung kannst du deine Tickets als PDF herunterladen.</p></div>
  </CustomerPageShell>;
}
