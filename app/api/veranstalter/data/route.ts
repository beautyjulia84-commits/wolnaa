import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { searchParams } = new URL(req.url);
  const vid = searchParams.get('vid');
  if (!vid) return NextResponse.json({ error: 'Keine ID' }, { status: 400 });

  const { data: v } = await supabase.from('veranstalter').select('*').eq('id', vid).single();
  if (!v) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });

  const { data: ev } = await supabase.from('events').select('id,title,date,tickets_sold,total_revenue').eq('veranstalter_id', vid).order('date', { ascending: false }).limit(5);

  return NextResponse.json({ veranstalter: v, events: ev || [] });
}
