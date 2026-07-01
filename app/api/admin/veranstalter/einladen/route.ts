import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminRequest } from '@/lib/admin-auth';

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { email, firmenname, telefon, website, platformFeePercent } = await req.json();
  if (!email || !firmenname) return NextResponse.json({ error: 'E-Mail und Firmenname sind Pflichtfelder.' }, { status: 400 });

  try {
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/veranstalter/dashboard`,
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const { error: dbError } = await supabaseAdmin.from('veranstalter').insert({
      user_id: authData.user.id,
      firmenname, kontakt_email: email,
      telefon: telefon || null, website: website || null,
      platform_fee_percent: platformFeePercent || 3.00,
      aktiv: true,
    });

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
