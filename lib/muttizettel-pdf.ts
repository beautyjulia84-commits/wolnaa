import {companionText,delegationText,type ConsentInput,type ConsentEvent} from './muttizettel';
import {eventTiming} from './event-timing';
/** Shared drawing routine also used for a rendered synthetic QA sample. */
export function drawConsentPdf(ctx:any,input:ConsentInput,event:ConsentEvent,created:Date,compact=false) {
 const width=595,height=842;ctx.fillStyle='#fff';ctx.fillRect(0,0,width,height);
 let y=42;
 function line(text:string,size=10,bold=false) {ctx.font=`${bold?'bold ':''}${size}px sans-serif`;ctx.fillStyle='#202124';ctx.fillText(text,42,y);y+=size+(compact?2:5);}
 function wrap(text:string,size=10){ctx.font=`${size}px sans-serif`;let row='';for(const word of text.split(/\s+/).flatMap(word=>{const parts:string[]=[];let part='';for(const char of word){if(ctx.measureText(part+char).width>500){parts.push(part);part='';}part+=char;}if(part)parts.push(part);return parts;})){if(ctx.measureText(row+' '+word).width>511&&row){line(row,size);row=word;}else row+=(row?' ':'')+word;}if(row)line(row,size);}
 function section(title:string){y+=9;ctx.fillStyle='#8b692d';ctx.fillRect(42,y-9,3,13);ctx.font='bold 11px sans-serif';ctx.fillStyle='#202124';ctx.fillText(title,51,y+1);y+=compact?15:19;}
 const date=(v:string)=>v?new Date(v+'T12:00:00').toLocaleDateString('de-DE'):'—';
 line('WOLNAA',17,true);line('Erziehungsbeauftragung / Muttizettel',17,true);line('Für diese Veranstaltung · § 1 Abs. 1 Nr. 4 JuSchG',9);
 section('Veranstaltung');wrap(event.title,12);wrap(`${date(event.date||'')} · Beginn ${event.time||'—'} Uhr · ${[event.location,event.city].filter(Boolean).join(', ')}`);if(event.address)wrap(event.address);
 const end=eventTiming(event).ends;wrap('Gültig während des gemeinsamen Aufenthalts, längstens bis '+new Date(end).toLocaleString('de-DE',{timeZone:'Europe/Berlin',dateStyle:'short',timeStyle:'short'})+' Uhr.');
 section('Jugendliche Person');wrap(input.minor.name,11);wrap('Geburtsdatum: '+date(input.minor.birthDate));wrap('Anschrift: '+input.minor.address);
 section('Personensorgeberechtigte Person');wrap(input.parent.name,11);wrap('Anschrift: '+input.parent.address);wrap('Telefon: '+input.parent.phone);
 section('Erziehungsbeauftragte Begleitperson');wrap(input.companion.name,11);wrap('Geburtsdatum: '+date(input.companion.birthDate));wrap('Anschrift: '+input.companion.address);wrap('Telefon: '+input.companion.phone);
 section('Vereinbarung');wrap(delegationText,9);y+=3;wrap(companionText,9);
 y+=10;line('Datum der Erstellung: '+created.toLocaleDateString('de-DE',{timeZone:'Europe/Berlin'}),9);
 const signTop=y+4,signHeight=58;
 for(const [index,signature] of [input.parentSignature,input.companionSignature].entries()) {
  const x=42+index*270;
  if(input.mode==='digital')for(const stroke of signature){ctx.beginPath();stroke.forEach((p,i)=>{const px=x+p.x*235,py=signTop+p.y*signHeight;i?ctx.lineTo(px,py):ctx.moveTo(px,py);});ctx.strokeStyle='#111';ctx.lineWidth=1.2;ctx.stroke();}
  ctx.strokeStyle='#999';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(x,signTop+signHeight+4);ctx.lineTo(x+235,signTop+signHeight+4);ctx.stroke();ctx.font='9px sans-serif';ctx.fillStyle='#333';ctx.fillText(index?'Unterschrift Begleitperson':'Unterschrift personensorgeberechtigte Person',x,signTop+signHeight+18);
 }
 y=signTop+signHeight+36;
 wrap(input.mode==='print'?'Noch nicht unterschrieben: Bitte ausdrucken und beide Unterschriften handschriftlich ergänzen.':'Die Unterschriften wurden von den ausfüllenden Personen gezeichnet. Es wurde keine Identitätsprüfung durchgeführt.',8);
 y+=3;wrap('Dieses Dokument ersetzt kein Ticket. Ausweise, Begleitung und Angaben werden am Einlass geprüft. Die Einlassregeln des Veranstalters gelten weiterhin. Eine Einlassgarantie besteht nicht.',8);
 if(y>812){if(!compact)return drawConsentPdf(ctx,input,event,created,true);throw new Error('Die Angaben sind zu lang für das Dokument. Bitte Anschriften kürzen.');}
 ctx.font='8px sans-serif';ctx.fillStyle='#777';ctx.fillText('WOLNAA · Persönliches Dokument · Bitte sicher aufbewahren',42,822);
}
export async function createConsentPdf(input:ConsentInput,event:ConsentEvent) {
 const {createCanvas}=await import('canvas');
 const canvas=createCanvas(595,842,'pdf');
 drawConsentPdf(canvas.getContext('2d'),input,event,new Date());
 return canvas.toBuffer('application/pdf');
}
