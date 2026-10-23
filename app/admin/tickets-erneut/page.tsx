'use client';
import {useState} from 'react';
export default function ResendTickets() {
 const [ids,setIds]=useState(''),[oldEmail,setOldEmail]=useState(''),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[message,setMessage]=useState('');
 async function send(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage('Versand läuft …');try{const r=await fetch('/api/admin/resend-tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticketIds:ids.split(/[\s,]+/).filter(Boolean),oldEmail,email})});const d=await r.json();if(!r.ok)throw new Error(d.error);setDone(true);setMessage(`${d.count} vorhandene Tickets an ${d.email} erneut versendet. Adresse korrigiert. Versand-ID: ${d.messageId}. ${d.warning||''}`);}catch(e){setMessage(e instanceof Error?e.message:'Versand fehlgeschlagen');}finally{setBusy(false);}}
 return <main className="admin-tool-page"><div className="admin-tool-heading"><p className="admin-eyebrow">Ticket-Service</p><h1>Tickets erneut senden</h1><p>E-Mail-Adresse korrigieren und bestehende Tickets erneut zustellen. Die QR-Codes bleiben erhalten.</p></div>
 <form onSubmit={send} className="admin-form-panel"><h2>Bestellung zuordnen</h2>
 <label>Ticket-IDs<textarea required rows={4} value={ids} onChange={e=>setIds(e.target.value)} aria-describedby="ids-help"/></label><p id="ids-help" className="admin-form-hint">Mehrere IDs durch Zeilenumbrüche oder Kommas trennen.</p>
 <label>Bisherige E-Mail-Adresse<input required type="email" value={oldEmail} onChange={e=>setOldEmail(e.target.value)}/></label>
 <label>Neue E-Mail-Adresse<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <button disabled={busy||done} className="admin-primary admin-submit">{busy?'Versand läuft …':'Adresse korrigieren & erneut senden'}</button>
 {message && <p role="status" className="admin-feedback">{message}</p>}
 </form></main>;
}
