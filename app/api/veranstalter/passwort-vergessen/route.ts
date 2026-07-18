import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'E-Mail fehlt.' }, { status: 400 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: new URL('/veranstalter/passwort-festlegen', req.url).toString(),
  });

  // Immer dieselbe Antwort, damit keine registrierten E-Mail-Adressen verraten werden.
  return NextResponse.json({ success: true });
}
