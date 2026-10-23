'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useRef,useState,type ReactNode} from 'react';
const groups = [
 {title:'Verwaltung',items:[['/admin#overview','Übersicht'],['/admin#events','Aktuelle Events'],['/admin#archiv','Event-Archiv'],['/admin#veranstalter','Veranstalter']]},
 {title:'Tickets & Auswertung',items:[['/admin#tickets','Tickets'],['/admin/promocodes','Promocode-Auswertung'],['/admin#besucher','Besucher & Statistik'],['/admin/gaestetickets','Gästetickets'],['/admin/tickets-erneut','Ticket-Service'],['/admin#scanner','Check-in']]},
 {title:'Einstellungen',items:[['/admin#rechtliches','Rechtstexte'],['/admin#einstellungen','Mein Admin-Konto']]},
];
export default function AdminShell({children}:{children:ReactNode}) {
 const pathname=usePathname();
 const [open,setOpen]=useState(false),[hash,setHash]=useState('');
 const panel=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>{const sync=()=>{setHash(window.location.hash);setOpen(false);};sync();window.addEventListener('hashchange',sync);return()=>window.removeEventListener('hashchange',sync);},[pathname]);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!panel.current?.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
 const current=pathname==='/admin'?'/admin'+(hash||'#overview'):pathname;
 return <div className="wolnaa-admin admin-shell">
  <header className="admin-global-header"><div className="admin-header-inner">
   <Link href="/admin#overview" className="admin-brand" aria-label="Wolnaa Admin Übersicht"><img src="/wolnaa-logo-gold-header.png" width="120" height="33" alt="WOLNAA"/><span>Admin</span></Link>
   <div ref={panel} className="admin-menu-anchor"><button ref={trigger} className="admin-menu-button" aria-expanded={open} aria-controls="admin-navigation" aria-label={open?'Navigation schließen':'Navigation öffnen'} onClick={()=>setOpen(!open)}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d={open?'m6 6 12 12M18 6 6 18':'M4 6h16M4 12h16M4 18h16'}/></svg></button>
   <nav id="admin-navigation" className="admin-navigation" hidden={!open} aria-label="Admin-Navigation">{groups.map(group=><div key={group.title}><p>{group.title}</p>{group.items.map(([href,label])=><Link href={href} key={href} aria-current={current===href?'page':undefined} onClick={()=>setOpen(false)}>{label}</Link>)}</div>)}<Link href="/">Zur Website ↗</Link><button className="admin-logout" onClick={async()=>{const res=await fetch('/api/admin-login',{method:'DELETE'});if(res.ok)window.location.assign('/admin-login');}}>Abmelden</button></nav></div>
  </div></header>
  {children}
 </div>;
}
