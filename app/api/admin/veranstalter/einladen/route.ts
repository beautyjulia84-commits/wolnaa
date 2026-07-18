import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { isAdminRequest } from '@/lib/admin-auth';

const resend = new Resend(process.env.RESEND_API_KEY!);

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[character]!);
}

export async function POST(req: NextRequest) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { email, firmenname, telefon, website, platformFeePercent } = await req.json();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedFirmenname = String(firmenname || '').trim();
  if (!normalizedEmail || !normalizedFirmenname) return NextResponse.json({ error: 'E-Mail und Firmenname sind Pflichtfelder.' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return NextResponse.json({ error: 'Ungültige E-Mail-Adresse.' }, { status: 400 });

  try {
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin).replace(/\/$/, '');
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: normalizedEmail,
      options: { redirectTo: `${appUrl}/veranstalter/passwort-festlegen` },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

    const { error: dbError } = await supabaseAdmin.from('veranstalter').insert({
      user_id: authData.user.id,
      firmenname: normalizedFirmenname, kontakt_email: normalizedEmail,
      telefon: telefon || null, website: website || null,
      platform_fee_percent: platformFeePercent || 3.00,
      aktiv: true,
    });

    if (dbError) {
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const safeName = escapeHtml(normalizedFirmenname);
    const inviteLink = escapeHtml(authData.properties.action_link);
    const appLink = `${appUrl}/veranstalter/login`;
    const { error: emailError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'WOLNAA <kontakt@wolnaa.de>',
      to: normalizedEmail,
      subject: 'Dein Zugang zum WOLNAA Veranstalter-Portal',
      html: `
        <div style="margin:0;background:#f4f4f5;padding:32px 16px;font-family:Arial,sans-serif;color:#18181b">
          <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:16px;padding:36px">
            <h1 style="margin:0 0 10px;font-size:24px">Willkommen bei WOLNAA</h1>
            <p style="margin:0 0 24px;color:#52525b;line-height:1.6">Hallo ${safeName}, dein Veranstalter-Zugang wurde eingerichtet.</p>
            <a href="${inviteLink}" style="display:block;background:#d6b36a;color:#18181b;text-decoration:none;text-align:center;font-weight:700;padding:14px 18px;border-radius:9px;margin-bottom:12px">Passwort festlegen</a>
            <a href="${appLink}" style="display:block;background:#18181b;color:#fff;text-decoration:none;text-align:center;font-weight:700;padding:14px 18px;border-radius:9px">Veranstalter-App öffnen &amp; installieren</a>
            <div style="margin-top:26px;padding-top:22px;border-top:1px solid #e4e4e7;color:#71717a;font-size:13px;line-height:1.6">
              <strong style="color:#3f3f46">App installieren:</strong><br>
              iPhone/iPad: Link in Safari öffnen, „Teilen“ und „Zum Home-Bildschirm“ wählen.<br>
              Android: Link in Chrome öffnen und „App installieren“ wählen.
            </div>
          </div>
        </div>`,
    });

    if (emailError) {
      await supabaseAdmin.from('veranstalter').delete().eq('user_id', authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: 'Einladung konnte nicht versendet werden.' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
