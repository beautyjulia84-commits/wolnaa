import {NextRequest,NextResponse} from 'next/server';
import QRCode from 'qrcode';
import {supabase} from '@/lib/supabase';
import {CUSTOMER_COOKIE,customerSessionEmail,escapeEmailPattern} from '@/lib/customer-access';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'};
export async function GET(req:NextRequest) {
  const email=customerSessionEmail(req.cookies.get(CUSTOMER_COOKIE)?.value);
  if (!email) return NextResponse.json({error:'Bitte anmelden.'},{status:401,headers});
  try {
    const id=req.nextUrl.searchParams.get('download');
    if(id && !/^WOLNAA-[a-zA-Z0-9-]+$/.test(id)) return NextResponse.json({error:'Ticket nicht gefunden.'},{status:404,headers});
    let query=supabase.from('tickets').select('ticket_id,event_id,event_title,customer_name,ticket_name,status,created_at').ilike('customer_email',escapeEmailPattern(email)).order('created_at',{ascending:false});
    if(id) query=query.eq('ticket_id',id).eq('status','paid');
    const {data,error}=await query.limit(500);
    if(error) throw error;
    if(id) {
      const ticket=data?.[0];
      if(!ticket) return NextResponse.json({error:'Ticket nicht verfügbar.'},{status:404,headers});
      let title=ticket.event_title || 'WOLNAA Event';
      if(ticket.event_id) {
        const {data:event}=await supabase.from('events').select('title,date,location').eq('id',ticket.event_id).maybeSingle();
        if(event) title=`${event.title} · ${event.date} · ${event.location || ''}`;
      }
      const qr=await QRCode.toDataURL(ticket.ticket_id,{width:400,margin:2});
      const {generateTicketPdf}=await import('@/lib/ticket-pdf');
      const pdf=await generateTicketPdf({ticketId:ticket.ticket_id,eventTitle:title,customerName:ticket.customer_name || '',ticketName:ticket.ticket_name || 'Standard',qrBase64:qr.replace('data:image/png;base64,','')});
      return new Response(new Uint8Array(pdf),{headers:{...headers,'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${ticket.ticket_id}.pdf"`}});
    }
    return NextResponse.json({email,tickets:data || []},{headers});
  } catch {return NextResponse.json({error:'Tickets konnten nicht geladen werden.'},{status:503,headers});}
}
