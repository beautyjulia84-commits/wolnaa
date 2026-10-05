import {NextRequest,NextResponse} from 'next/server';
import {supabase} from '@/lib/supabase';
import {withEventSchedules} from '@/lib/event-schedules';
import {eventTiming} from '@/lib/event-timing';
export const dynamic = 'force-dynamic';
export async function GET(req:NextRequest) {
  try {
    const slug = req.nextUrl.searchParams.get('slug');
    let query = supabase.from('events').select('id,slug,title,city,date,time,online_sale_ends_at,location,address,image_url,price,description,tickets,lounges,lounge_list,discount_codes,veranstalter_id,veranstalter:veranstalter_id(firmenname,kontakt_email)').order('created_at',{ascending:true});
    if (slug) query = query.eq('slug',slug);
    const {data,error} = await query;
    if (error) throw error;
    const rows = await withEventSchedules(supabase,data || []);
    return NextResponse.json({events:slug ? rows : rows.filter(event => !eventTiming(event).ended)}, {headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'Veranstaltungen konnten nicht geladen werden.'},{status:503,headers:{'Cache-Control':'no-store'}}); }
}
