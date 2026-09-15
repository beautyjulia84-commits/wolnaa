import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import QRCode from 'qrcode';
import { generateTicketPdf } from '../lib/ticket-pdf.ts';

// One fixed batch: reruns reuse the same ticket IDs and email idempotency key.
const batch = '20260915-NEUULM-JULIA';
const eventId = '1f2ccead-2867-40cb-9065-bc4d67961d6f';
const email = 'beautyjulia84@gmail.com';
const database = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const { data: event, error: eventError } = await database.from('events').select('id,title,date,location').eq('id', eventId).single();
if (eventError || !event || event.date !== '2026-09-19' || !event.location.includes('Neu-Ulm')) throw new Error('Neu-Ulm event verification failed');
const { data: previous, error: previousError } = await database.from('tickets').select('ticket_id').eq('event_id', eventId).like('ticket_id', `WOLNAA-GIVEAWAY-${batch}-%`);
if (previousError) throw previousError;
let ids = (previous || []).map(row => row.ticket_id).sort();
if (ids.length !== 0 && ids.length !== 14) throw new Error('Unexpected partial batch: manual review required');
if (!ids.length) ids = Array.from({length:14}, () => `WOLNAA-GIVEAWAY-${batch}-${crypto.randomUUID()}`);
const attachments = [];
for (const [index, ticketId] of ids.entries()) {
  const qr = await QRCode.toDataURL(ticketId, {width:400,margin:2});
  const pdf = await generateTicketPdf({ticketId,eventTitle:event.title,customerName:'Verlosung',ticketName:'Verlosungsticket · 19.09.2026 · Neu-Ulm',amountText:'0,00 €',qrBase64:qr.replace('data:image/png;base64,','')});
  attachments.push({filename:`WOLNAA-Neu-Ulm-Verlosung-${String(index+1).padStart(2,'0')}.pdf`,content:pdf.toString('base64'),contentType:'application/pdf'});
}
if (!previous?.length) {
  const {error} = await database.from('tickets').insert(ids.map(ticketId => ({ticket_id:ticketId,event_id:eventId,event_title:event.title,ticket_name:'Verlosungsticket',quantity:1,customer_name:'Verlosung',customer_email:email,amount:0,status:'paid'})));
  if (error) throw error;
}
const {data:sent,error:sendError} = await new Resend(process.env.RESEND_API_KEY!).emails.send({
  from:process.env.RESEND_FROM_EMAIL || 'WOLNAA Tickets <kontakt@wolnaa.de>',to:email,
  subject:'Deine 14 Verlosungstickets – WOLNAA Open Air Neu-Ulm',
  html:'<p>Hallo Julia,</p><p>im Anhang findest du 14 einzelne Verlosungstickets für <strong>Wolnaa (Open Air)</strong> am <strong>19. September 2026 im Bunker in Neu-Ulm</strong>.</p><p>Jedes PDF gilt für eine Person und enthält einen eigenen, einmalig einlösbaren QR-Code. Du kannst die PDFs einzeln an die Gewinner weitergeben.</p><p>Die Tickets sind kostenlos und werden nicht als Ticketverkäufe gezählt.</p><p>Viel Erfolg bei der Verlosung!<br>WOLNAA</p>',attachments,
},{idempotencyKey:batch});
if (sendError) throw new Error(JSON.stringify(sendError));
console.log(JSON.stringify({count:ids.length,event:event.title,email,messageId:sent?.id}));
