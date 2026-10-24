import {allowsMuttizettel, type TimedEvent} from './event-timing';
export type Point = {x:number;y:number};
export type Signature = Point[][];
export type Person = {name:string;birthDate:string;address:string;phone:string};
export type ConsentInput = {eventId:string;minor:Person;parent:Person;companion:Person;mode:'digital'|'print';parentSignature:Signature;companionSignature:Signature;parentAgrees:boolean;companionAgrees:boolean;reviewed:boolean};
export type ConsentEvent = TimedEvent & {id:string;title:string;city?:string;location?:string;address?:string;min_age?:number;description?:string};
export const emptyPerson=():Person=>({name:'',birthDate:'',address:'',phone:''});
export function ageAt(birth:string,date:string) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!/^\d{4}-\d{2}-\d{2}$/.test(date))return NaN;
 const parsed=new Date(birth+'T12:00:00Z');
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==birth||birth>date)return NaN;
 return Number(date.slice(0,4))-Number(birth.slice(0,4))-(date.slice(5)<birth.slice(5)?1:0);
}
export function signatureValid(value:unknown):value is Signature {
 if(!Array.isArray(value)||!value.length||value.length>100)return false;
 let count=0, distance=0;
 for(const stroke of value) {
  if(!Array.isArray(stroke))return false;
  for(let i=0;i<stroke.length;i++) {
   const p=stroke[i];if(!p||!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<0||p.x>1||p.y<0||p.y>1)return false;
   count++;if(i)distance+=Math.hypot(p.x-stroke[i-1].x,p.y-stroke[i-1].y);
  }
 }
 return count>=3&&count<=4000&&distance>.08;
}
function text(value:unknown,min:number,max:number) {return typeof value==='string'&&value.trim().length>=min&&value.length<=max&&!/[\x00-\x08\x0b-\x1f]/.test(value);}
export function personError(person:Person,role:'minor'|'parent'|'companion',eventDate:string) {
 if(!person||!text(person.name,3,100)||!person.name.trim().includes(' '))return 'Bitte Vor- und Nachnamen angeben.';
 if(!text(person.address,8,200))return 'Bitte vollständige Anschrift mit Straße, Hausnummer, PLZ und Ort angeben.';
 if(role!=='minor'&&(!text(person.phone,6,35)||!/^\+?[\d\s()/.-]+$/.test(person.phone)))return 'Bitte eine erreichbare Telefonnummer angeben.';
 if(role!=='parent') {const age=ageAt(person.birthDate,eventDate);if(!Number.isFinite(age)||age>120)return 'Bitte ein gültiges Geburtsdatum angeben.';if(role==='minor'&&age!==16&&age!==17)return 'Der Muttizettel ist für Personen bestimmt, die am Eventtag 16 oder 17 Jahre alt sind.';if(role==='companion'&&age<18)return 'Die Begleitperson muss am Eventtag mindestens 18 Jahre alt sein.';}
 return '';
}
export function validateConsent(input:ConsentInput,event:ConsentEvent,now:number) {
 if(!input||input.eventId!==event.id||!allowsMuttizettel(event,now))return 'Diese Veranstaltung ist nicht mehr für den Muttizettel freigeschaltet.';
 for(const role of ['minor','parent','companion'] as const){const error=personError(input[role],role,event.date||'');if(error)return error;}
 if(input.minor.name.trim().toLocaleLowerCase()===input.companion.name.trim().toLocaleLowerCase()&&input.minor.birthDate===input.companion.birthDate)return 'Jugendliche Person und Begleitung müssen unterschiedliche Personen sein.';
 if(input.mode!=='print'&&input.mode!=='digital')return 'Bitte die Art der Unterschrift auswählen.';
 if(input.mode==='digital'&&(!signatureValid(input.parentSignature)||!signatureValid(input.companionSignature)||input.parentAgrees!==true||input.companionAgrees!==true))return 'Beide Personen müssen selbst unterschreiben und ihre Erklärung bestätigen.';
 if(input.reviewed!==true)return 'Bitte die Angaben vor dem PDF-Download prüfen und bestätigen.';
 return '';
}
export const delegationText='Als personensorgeberechtigte Person beauftrage ich die unten genannte volljährige Begleitperson, für die genannte jugendliche Person während dieser Veranstaltung die Erziehungs- und Aufsichtsaufgaben wahrzunehmen. Ich bin unter der angegebenen Telefonnummer erreichbar.';
export const companionText='Ich übernehme die vereinbarte Aufsicht, begleite die jugendliche Person während ihres Aufenthalts und achte auf die Einhaltung des Jugendschutzes. Die Aufsicht muss tatsächlich ausgeübt werden.';
