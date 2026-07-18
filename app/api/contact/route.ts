import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const message = String(body?.message ?? "").trim();

    if (!name || name.length > 100) {
      return NextResponse.json({ error: "Ungültiger Name." }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) {
      return NextResponse.json({ error: "Ungültige E-Mail-Adresse." }, { status: 400 });
    }
    if (message.length < 10 || message.length > 3000) {
      return NextResponse.json({ error: "Ungültige Nachricht." }, { status: 400 });
    }

    const escapedName = name.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);
    const escapedMessage = message.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character]!);

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "WOLNAA Kontakt <kontakt@wolnaa.de>",
      to: "kontakt@wolnaa.de",
      replyTo: email,
      subject: `Kontaktanfrage von ${name}`,
      html: `<h2>Neue Kontaktanfrage</h2><p><strong>Name:</strong> ${escapedName}</p><p><strong>E-Mail:</strong> ${email}</p><p><strong>Nachricht:</strong></p><p>${escapedMessage.replace(/\n/g, "<br>")}</p>`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Nachricht konnte nicht gesendet werden." }, { status: 500 });
  }
}
