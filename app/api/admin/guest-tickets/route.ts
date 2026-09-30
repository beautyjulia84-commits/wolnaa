import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import QRCode from 'qrcode';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabase } from '@/lib/supabase';
import { generateTicketPdf } from '@/lib/ticket-pdf';
import { buildTicketEmailHtml } from '@/lib/ticket-email';

export const maxDuration = 60;
export async function GET(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error:'Nicht autorisiert'}, {status:401});
  const {data,error} = await supabase.from('events').select('id,title,date,location').gte('date',new Date().toISOString().slice(0,10)).order('date');
  return error ? NextResponse.json({error:error.message},{status:500}) : NextResponse.json({events:data});
}
export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) return NextResponse.json({error:'Nicht autorisiert'}, {status:401});
  try {
    const {eventId,email,name,count,batch} = await req.json();
    if (typeof eventId!=='string' || typeof email!=='string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || typeof name!=='string' || !name.trim() || name.length>100 || !Number.isInteger(count) || count<1 || count>20 || typeof batch!=='string' || !/^[a-zA-Z0-9-]{8,80}$/.test(batch)) return NextResponse.json({error:'Ungültige Angaben'},{status:400});
    const {data:event,error:eventError} = await supabase.from('events').select('id,title,date,location').eq('id',eventId).single();
    if (eventError || !event || event.date<new Date().toISOString().slice(0,10)) return NextResponse.json({error:'Veranstaltung nicht verfügbar'},{status:400});
    const digest=createHash('sha256').update(JSON.stringify([eventId,email.toLowerCase(),name.trim(),count,batch])).digest('hex').slice(0,24);
    const key=`guest-ticket-mail:${digest}`;
    const {data:receipt,error:receiptError}=await supabase.from('settings').select('value').eq('key',key).maybeSingle();
    if(receiptError) throw receiptError;
    if(receipt) return NextResponse.json({...JSON.parse(receipt.value),alreadySent:true});
    const title=`${event.title} · ${event.date.split('-').reverse().join('.')} · ${event.location}`;
    const rows=Array.from({length:count},(_,i)=>({ticket_id:`WOLNAA-GIVEAWAY-${digest}-${i+1}`,event_id:eventId,event_title:event.title,ticket_name:'Gästeticket',quantity:1,customer_name:name.trim(),customer_email:email.toLowerCase(),amount:0,status:'paid'}));
    const attachments=[];
    for(const row of rows) {
      const qr=await QRCode.toDataURL(row.ticket_id,{width:400,margin:2});
      const pdf=await generateTicketPdf({ticketId:row.ticket_id,eventTitle:title,customerName:row.customer_name,ticketName:'Gästeticket',amountText:'0,00 €',qrBase64:qr.replace('data:image/png;base64,','')});
      attachments.push({filename:`${row.ticket_id}.pdf`,content:pdf.toString('base64'),contentType:'application/pdf'});
    }
    const {error:insertError}=await supabase.from('tickets').upsert(rows,{onConflict:'ticket_id',ignoreDuplicates:true});
    if(insertError) throw insertError;
    const {data:sent,error:sendError}=await new Resend(process.env.RESEND_API_KEY!).emails.send({from:process.env.RESEND_FROM_EMAIL || 'WOLNAA Tickets <kontakt@wolnaa.de>',to:email,subject:`${count} Gästetickets – ${title}`,html:buildTicketEmailHtml({eventTitle:title,customerName:name.trim(),ticketCount:count}),attachments},{idempotencyKey:key});
    if(sendError) throw new Error(sendError.message);
    const result={success:true,count,email,messageId:sent?.id};
    const {error:saveError}=await supabase.from('settings').upsert({key,value:JSON.stringify(result)},{onConflict:'key'});
    if(saveError) return NextResponse.json({...result,warning:'Versendet; Versandbeleg konnte nicht gespeichert werden. Nicht erneut senden.'});
    return NextResponse.json(result);
  } catch(error) {
    return NextResponse.json({error:error instanceof Error ? error.message : 'Versand fehlgeschlagen'},{status:500});
  }
}
