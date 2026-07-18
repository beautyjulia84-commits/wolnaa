import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createVeranstalterAuthToken, VERANSTALTER_AUTH_COOKIE, veranstalterAuthCookieOptions } from '@/lib/veranstalter-auth';

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: 'E-Mail und Passwort fehlen.' }, { status: 400 });

  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: authData, error: authError } = await authClient.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json({ error: 'E-Mail oder Passwort ist falsch.' }, { status: 401 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data, error } = await supabase
    .from('veranstalter')
    .select('id, firmenname, aktiv')
    .eq('user_id', authData.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Kein Veranstalter-Zugang vorhanden.' }, { status: 403 });
  if (!data.aktiv) return NextResponse.json({ error: 'Dein Konto ist deaktiviert.' }, { status: 403 });

  const response = NextResponse.redirect(new URL('/veranstalter/dashboard', req.url));
  response.cookies.set('veranstalter_id', data.id, {
    path: '/',
    maxAge: 86400,
    httpOnly: false,
    sameSite: 'lax',
  });
  response.cookies.set(VERANSTALTER_AUTH_COOKIE, createVeranstalterAuthToken(data.id), veranstalterAuthCookieOptions());
  return response;
}
