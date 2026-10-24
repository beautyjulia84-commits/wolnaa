'use client';
import {useRef} from 'react';
import type {Signature} from '@/lib/muttizettel';
export default function SignaturePad({label,value,onChange}:{label:string;value:Signature;onChange:(value:Signature)=>void}) {
 const drawing=useRef(false),live=useRef<Signature>(value);
 live.current=value;
 const point=(event:React.PointerEvent<SVGSVGElement>)=>{const box=event.currentTarget.getBoundingClientRect();return {x:Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),y:Math.max(0,Math.min(1,(event.clientY-box.top)/box.height))};};
 return <div className="mutti-signature"><p>{label}</p><svg viewBox="0 0 600 200" preserveAspectRatio="none" role="img" aria-label={label+' – mit Finger oder Maus zeichnen'} onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);drawing.current=true;const next=[...value,[point(event)]];live.current=next;onChange(next);}} onPointerMove={event=>{if(!drawing.current)return;if(live.current.flat().length>=4000)return;const next=live.current.map((stroke,index)=>index===live.current.length-1?[...stroke,point(event)]:stroke);live.current=next;onChange(next);}} onPointerUp={()=>{drawing.current=false;}} onPointerCancel={()=>{drawing.current=false;}}>
 {value.map((stroke,index)=><polyline key={index} points={stroke.map(p=>`${p.x*600},${p.y*200}`).join(' ')} fill="none" stroke="#191919" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>)}
 </svg><button type="button" onClick={()=>onChange([])}>Unterschrift löschen</button></div>;
}
