'use client';
import {useEffect,useId,useRef,useState} from 'react';
type EventOption={id:string;title:string;date:string;location?:string};
export default function EventPicker({events,value,onChange,loading=false}:{events:EventOption[];value:string;onChange:(value:string)=>void;loading?:boolean}) {
 const [open,setOpen]=useState(false),[query,setQuery]=useState('');
 const id=useId(),root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),search=useRef<HTMLInputElement>(null);
 const selected=events.find(event=>event.id===value);
 const matches=events.filter(event=>`${event.title} ${event.date} ${event.location||''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 useEffect(()=>{if(!open)return;search.current?.focus();const outside=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};document.addEventListener('pointerdown',outside);return()=>document.removeEventListener('pointerdown',outside);},[open]);
 const date=(value:string)=>{const parsed=new Date(value+'T12:00:00');return Number.isFinite(parsed.getTime())?parsed.toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}):value;};
 return <div ref={root} className="admin-event-picker" onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'&&open){e.stopPropagation();setOpen(false);trigger.current?.focus();}}}>
  <span id={id+'-label'} className="admin-picker-label">Veranstaltung</span>
  <button ref={trigger} type="button" className="admin-picker-trigger" aria-labelledby={id+'-label '+id+'-value'} aria-expanded={open} aria-controls={id+'-panel'} disabled={loading} onClick={()=>{setQuery('');setOpen(!open);}}><span id={id+'-value'}>{selected?<><strong>{selected.title}</strong><small>{date(selected.date)}</small></>:loading?'Veranstaltungen werden geladen …':'Veranstaltung auswählen'}</span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m6 9 6 6 6-6"/></svg></button>
  {open&&<div id={id+'-panel'} className="admin-picker-panel"><input ref={search} type="search" aria-label="Veranstaltung suchen" placeholder="Event oder Ort suchen …" value={query} onChange={e=>setQuery(e.target.value)}/><div className="admin-picker-options" role="group" aria-label="Veranstaltungen">{matches.length?matches.map(event=><button key={event.id} type="button" aria-pressed={value===event.id} onClick={()=>{onChange(event.id);setOpen(false);trigger.current?.focus();}}><span><strong>{event.title}</strong><small>{date(event.date)}{event.location?' · '+event.location:''}</small></span><span aria-hidden="true">{value===event.id?'✓':''}</span></button>):<p role="status">{events.length?'Keine passende Veranstaltung.':'Keine Veranstaltungen verfügbar.'}</p>}</div></div>}
 </div>;
}
