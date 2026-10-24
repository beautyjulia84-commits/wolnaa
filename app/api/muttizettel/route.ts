import {NextRequest,NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
import {withEventSchedules} from '@/lib/event-schedules';
import {validateConsent,type ConsentInput} from '@/lib/muttizettel';
import {createConsentPdf} from '@/lib/muttizettel-pdf';
export const runtime='nodejs';
const headers={'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'};
export async function POST(req:NextRequest) {
 if(req.headers.get('sec-fetch-site')==='cross-site')return NextResponse.json({error:'Bitte das Formular direkt auf Wolnaa öffnen.'},{status:403,headers});
 if(!req.headers.get('content-type')?.includes('application/json'))return NextResponse.json({error:'Ungültiges Formularformat.'},{status:415,headers});
 if(Number(req.headers.get('content-length')||0)>350000)return NextResponse.json({error:'Die Unterschriften sind zu groß. Bitte neu zeichnen.'},{status:413,headers});
 let input:ConsentInput;
 try {const text=await req.text();if(text.length>350000)throw new Error();input=JSON.parse(text);}catch{return NextResponse.json({error:'Formular konnte nicht gelesen werden.'},{status:400,headers});}
 if(!input||typeof input.eventId!=='string'||input.eventId.length>80)return NextResponse.json({error:'Bitte ein Event auswählen.'},{status:400,headers});
 try {
  const {data,error}=await supabase.from('events').select('id,title,date,time,city,location,address,description').eq('id',input.eventId).maybeSingle();
  if(error)throw new Error();
  if(!data)return NextResponse.json({error:'Veranstaltung nicht gefunden.'},{status:404,headers});
  const [event]=await withEventSchedules(supabase,[data]);
  const issue=validateConsent(input,event,Date.now());
  if(issue)return NextResponse.json({error:issue},{status:400,headers});
  // No database writes, emails, signatures or personal data retained by this endpoint.
  const pdf=await createConsentPdf(input,event);
  return new NextResponse(new Uint8Array(pdf),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="WOLNAA-Muttizettel.pdf"'}});
 }catch{return NextResponse.json({error:'Das PDF konnte gerade nicht erstellt werden. Deine Eingaben bleiben im geöffneten Formular erhalten. Bitte erneut versuchen.'},{status:503,headers});}
}
