import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAuthedVeranstalterId } from '@/lib/veranstalter-auth';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function safeExtension(file: File) {
  const fromName = file.name.split('.').pop()?.toLowerCase();
  const fromType = file.type.split('/').pop()?.toLowerCase();
  const ext = fromName || fromType || 'jpg';
  return ext.replace(/[^a-z0-9]/g, '').slice(0, 8) || 'jpg';
}

export async function POST(req: Request) {
  const veranstalterId = getAuthedVeranstalterId(req);

  if (!veranstalterId) {
    return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 });
  }

  const { data: veranstalter } = await supabase
    .from('veranstalter')
    .select('id, aktiv')
    .eq('id', veranstalterId)
    .single();

  if (!veranstalter?.aktiv) {
    return NextResponse.json({ error: 'Kein Zugriff.' }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Keine Bilddatei gefunden.' }, { status: 400 });
  }

  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Nur Bilder sind erlaubt.' }, { status: 400 });
  }

  const ext = safeExtension(file);
  const fileName = `veranstalter/${veranstalterId}/events/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from('images')
    .upload(fileName, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from('images').getPublicUrl(fileName);

  return NextResponse.json({ url: data.publicUrl });
}
