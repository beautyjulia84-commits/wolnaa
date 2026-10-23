'use client';
import { useEffect, useState } from 'react';
type Event = {id:string;title:string;date:string;location:string};
export default function GuestTickets() {
 const [events,setEvents]=useState<Event[]>([]),[eventId,setEventId]=useState(''),[email,setEmail]=useState(''),[name,setName]=useState(''),[count,setCount]=useState(1),[batch,setBatch]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[done,setDone]=useState(false);
 useEffect(()=>{fetch('/api/admin/guest-tickets').then(r=>r.json()).then(d=>{setEvents(d.events||[]);if(d.error)setMessage(d.error);}).catch(()=>setMessage('Veranstaltungen konnten nicht geladen werden.'));},[]);
 async function send(e:React.FormEvent) {e.preventDefault();setBusy(true);setMessage('Tickets werden erstellt und versendet …');try {const r=await fetch('/api/admin/guest-tickets',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId,email,name,count,batch})});const d=await r.json();if(!r.ok)throw new Error(d.error);setDone(true);setMessage(`${d.count} Tickets an ${d.email} versendet. Versand-ID: ${d.messageId}. ${d.warning||''}`);}catch(e){setMessage(e instanceof Error?e.message:'Versand fehlgeschlagen');}finally{setBusy(false);}}
 return <main className="admin-tool-page"><div className="admin-tool-heading"><p className="admin-eyebrow">Ticket-Service</p><h1>Gästetickets</h1><p>Kostenlose Tickets mit eigenem QR-Code direkt per E-Mail versenden.</p></div>
 <form onSubmit={send} className="admin-form-panel">
 <h2>Veranstaltung & Empfänger</h2>
 <label>Veranstaltung<select required value={eventId} onChange={e=>setEventId(e.target.value)}><option value="">Veranstaltung auswählen</option>{events.map(e=><option key={e.id} value={e.id}>{e.title} · {e.date}</option>)}</select></label>
 <label>Name des Empfängers<input required autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>
 <label>E-Mail-Adresse<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>
 <div className="admin-form-row"><label>Anzahl Tickets<input required type="number" min="1" max="20" value={count} onChange={e=>setCount(Number(e.target.value))}/></label><label>Versandkennung<input required minLength={8} pattern="[a-zA-Z0-9-]+" value={batch} onChange={e=>setBatch(e.target.value)} aria-describedby="batch-help"/></label></div>
 <p id="batch-help" className="admin-form-hint">Mindestens 8 Zeichen: Buchstaben, Zahlen oder Bindestriche. Bei einem erneuten Versandversuch dieselbe Kennung verwenden.</p>
 <button disabled={busy||done} className="admin-primary admin-submit">{busy?'Versand läuft …':'Gästetickets erstellen und senden'}</button>
 {message && <p role="status" className="admin-feedback">{message}</p>}
 </form></main>;
}
