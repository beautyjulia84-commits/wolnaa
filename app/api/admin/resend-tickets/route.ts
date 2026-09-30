import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { Resend } from 'resend';
import QRCode from 'qrcode';
import { isAdminRequest } from '@/lib/admin-auth';
import { supabase } from '@/lib/supabase';
import { generateTicketPdf } from '@/lib/ticket-pdf';
import { buildTicketEmailHtml } from '@/lib/ticket-email';
export const maxDuration=60;
export async function POST(req:NextRequest) {
 if(!isAdminRequest(req)) return NextResponse.json({error:'Nicht autorisiert'},{status:401});
 try {
  const {ticketIds,oldEmail,email}=await req.json();
  const validEmail=(s:unknown)=>typeof s==='string'&&s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
  if(!Array.isArray(ticketIds)||ticketIds.length<1||ticketIds.length>20||ticketIds.some(id=>typeof id!=='string'||!/^WOLNAA-[A-Za-z0-9-]+$/.test(id))||new Set(ticketIds).size!==ticketIds.length||!validEmail(oldEmail)||!validEmail(email)) return NextResponse.json({error:'Ungültige Angaben'},{status:400});
  const ids=[...ticketIds].sort();
  const key='ticket-email-correction:'+createHash('sha256').update(JSON.stringify([ids,oldEmail,email])).digest('hex');
  const {data:receipt,error:receiptError}=await supabase.from('settings').select('value').eq('key',key).maybeSingle();
  if(receiptError) throw receiptError;
  if(receipt) return NextResponse.json({...JSON.parse(receipt.value),alreadySent:true});
  const {data:rows,error}=await supabase.from('tickets').select('*').in('ticket_id',ids).order('ticket_id');
  if(error) throw error;
  if(!rows||rows.length!==ids.length||rows.some(t=>t.status!=='paid'||![oldEmail,email].includes(t.customer_email))||new Set(rows.map(t=>t.event_id)).size!==1||new Set(rows.map(t=>t.customer_name)).size!==1) return NextResponse.json({error:'Ticketstatus, Empfänger oder Veranstaltung stimmt nicht überein'},{status:409});
  const {data:event,error:eventError}=await supabase.from('events').select('title,date,location').eq('id',rows[0].event_id).single();
  if(eventError||!event) throw new Error('Veranstaltung nicht gefunden');
  const title=`${event.title} · ${event.date.split('-').reverse().join('.')} · ${event.location}`;
  const attachments=[];
  for(const t of rows) {
   const qr=await QRCode.toDataURL(t.ticket_id,{width:400,margin:2});
   const pdf=await generateTicketPdf({ticketId:t.ticket_id,eventTitle:title,customerName:t.customer_name,ticketName:t.ticket_name||'Standard',qrBase64:qr.replace('data:image/png;base64,','')});
   attachments.push({filename:`${t.ticket_id}.pdf`,content:pdf.toString('base64'),contentType:'application/pdf'});
  }
  const {data:updated,error:updateError}=await supabase.from('tickets').update({customer_email:email}).in('ticket_id',ids).in('customer_email',[oldEmail,email]).eq('status','paid').select('ticket_id');
  if(updateError||updated?.length!==ids.length) throw new Error('Adresskorrektur fehlgeschlagen; kein Versand');
  const {data:sent,error:sendError}=await new Resend(process.env.RESEND_API_KEY!).emails.send({from:process.env.RESEND_FROM_EMAIL||'WOLNAA Tickets <kontakt@wolnaa.de>',to:email,subject:`Deine Tickets erneut – ${title}`,html:buildTicketEmailHtml({eventTitle:title,customerName:rows[0].customer_name,ticketCount:rows.length}),attachments},{idempotencyKey:key});
  if(sendError) throw new Error(sendError.message);
  const result={success:true,count:rows.length,email,messageId:sent?.id};
  const {error:saveError}=await supabase.from('settings').upsert({key,value:JSON.stringify(result)},{onConflict:'key'});
  return NextResponse.json({...result,warning:saveError?'Versendet; Beleg nicht gespeichert. Nicht erneut senden.':undefined});
 } catch(e) {return NextResponse.json({error:e instanceof Error?e.message:'Versand fehlgeschlagen'},{status:500});}
}
