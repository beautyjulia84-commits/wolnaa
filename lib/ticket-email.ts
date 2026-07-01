type TicketEmailItem = {
  ticketId: string;
  ticketName?: string;
  amountText?: string;
  qrContentId: string;
};

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
  tickets,
}: {
  eventTitle: string;
  customerName: string;
  tickets: TicketEmailItem[];
}) {
  const safeEventTitle = escapeHtml(eventTitle);
  const safeCustomerName = escapeHtml(customerName);
  const ticketCount = tickets.length;

  const ticketCards = tickets.map((ticket, index) => {
    const safeTicketId = escapeHtml(ticket.ticketId);
    const safeTicketName = escapeHtml(ticket.ticketName || 'Standard Ticket');
    const safeAmount = escapeHtml(ticket.amountText || '');
    const safeQrContentId = escapeHtml(ticket.qrContentId);

    return `
      <tr>
        <td style="padding:${index === 0 ? '0' : '18px 0 0'};">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="background:#0a0a0a;padding:18px 22px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="color:#ffffff;font-size:18px;font-weight:800;">WOLNAA Ticket</td>
                    <td align="right" style="color:#facc15;font-size:12px;font-weight:800;letter-spacing:1.5px;">${String(index + 1).padStart(2, '0')}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 22px 18px;">
                <div style="font-size:11px;color:#6b7280;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;margin-bottom:6px;">Veranstaltung</div>
                <div style="font-size:24px;line-height:1.2;color:#111827;font-weight:900;margin-bottom:20px;">${safeEventTitle}</div>

                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:18px;">
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px;font-weight:700;">Vor- und Nachname</td>
                    <td align="right" style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:800;">${safeCustomerName}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px;font-weight:700;">Ticket</td>
                    <td align="right" style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:800;">${safeTicketName}</td>
                  </tr>
                  ${safeAmount ? `
                  <tr>
                    <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:12px;font-weight:700;">Preis</td>
                    <td align="right" style="padding:8px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:13px;font-weight:800;">${safeAmount}</td>
                  </tr>` : ''}
                  <tr>
                    <td style="padding:8px 0;color:#6b7280;font-size:12px;font-weight:700;">Ticket-ID</td>
                    <td align="right" style="padding:8px 0;color:#111827;font-size:11px;font-family:Menlo,Consolas,monospace;font-weight:700;">${safeTicketId}</td>
                  </tr>
                </table>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center" style="background:#f9fafb;border:1px dashed #d1d5db;border-radius:16px;padding:18px;">
                      <img src="cid:${safeQrContentId}" alt="QR-Code" width="190" height="190" style="display:block;margin:0 auto 10px;border:0;" />
                      <div style="color:#374151;font-size:11px;font-weight:700;">QR-Code beim Einlass vorzeigen</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>`;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:28px 14px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <tr>
            <td align="center" style="padding:0 0 18px;">
              <table cellpadding="0" cellspacing="0" style="background:#000000;border-radius:16px;padding:12px 18px;">
                <tr>
                  <td><img src="https://wolnaa.de/wolnaa-logo.png" alt="WOLNAA" width="150" style="display:block;border:0;" /></td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;padding:24px 22px;text-align:center;">
              <div style="font-size:22px;font-weight:900;color:#111827;margin-bottom:8px;">Dein ${ticketCount > 1 ? 'Tickets sind' : 'Ticket ist'} bereit</div>
              <div style="font-size:14px;line-height:1.6;color:#4b5563;">Hallo <strong>${safeCustomerName}</strong>, hier ${ticketCount > 1 ? 'sind deine Tickets' : 'ist dein Ticket'} für <strong>${safeEventTitle}</strong>.</div>
            </td>
          </tr>
          ${ticketCards}
          <tr>
            <td align="center" style="padding:18px 8px 0;color:#6b7280;font-size:12px;line-height:1.6;">
              Dieses Ticket ist nur einmal gültig. Bei Fragen erreichst du uns unter <strong>kontakt@wolnaa.de</strong>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
