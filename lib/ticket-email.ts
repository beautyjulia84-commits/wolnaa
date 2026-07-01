function escapeHtml(value: string) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(value || 0);
}

export function buildTicketEmailHtml({
  eventTitle,
  customerName,
  ticketCount,
}: {
  eventTitle: string;
  customerName: string;
  ticketCount: number;
}) {
  const safeEventTitle = escapeHtml(eventTitle);
  const safeCustomerName = escapeHtml(customerName);
  const plural = ticketCount > 1;

  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;padding:28px 18px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
          <tr>
            <td style="padding:0 0 26px;text-align:center;">
              <div style="font-size:30px;font-weight:900;letter-spacing:2px;color:#111827;">WOLNAA</div>
            </td>
          </tr>
          <tr>
            <td style="font-size:16px;line-height:1.7;color:#111827;">
              <p style="margin:0 0 16px;">Hallo <strong>${safeCustomerName}</strong>,</p>
              <p style="margin:0 0 16px;">vielen Dank f&uuml;r deine Bestellung.</p>
              <p style="margin:0 0 16px;">
                ${plural ? 'Deine Tickets sind' : 'Dein Ticket ist'} im Anhang dieser E-Mail als druckbares PDF hinterlegt.
              </p>
              <p style="margin:0 0 22px;">
                Veranstaltung: <strong>${safeEventTitle}</strong>
              </p>
              <p style="margin:0;color:#4b5563;font-size:14px;">
                Bitte bringe ${plural ? 'die Tickets' : 'das Ticket'} digital oder ausgedruckt mit. Der QR-Code wird am Einlass gescannt.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
              Bei Fragen erreichst du uns unter <strong>kontakt@wolnaa.de</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
