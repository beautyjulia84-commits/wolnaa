import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'E-Mail fehlt.' }, { status: 400 });

  const { data, error } = await supabase
    .from('veranstalter')
    .select('id, firmenname, aktiv')
    .eq('kontakt_email', email.trim().toLowerCase())
    .single();

  if (error || !data) return NextResponse.json({ error: 'Kein Zugang. Diese E-Mail ist nicht registriert.' }, { status: 403 });
  if (!data.aktiv) return NextResponse.json({ error: 'Dein Konto ist deaktiviert.' }, { status: 403 });

  return NextResponse.json({ success: true, veranstalter_id: data.id, firmenname: data.firmenname });
}
