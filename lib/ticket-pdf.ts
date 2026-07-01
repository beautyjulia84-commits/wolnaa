import { createCanvas, loadImage } from 'canvas';

type TicketPdfData = {
  ticketId: string;
  eventTitle: string;
  customerName: string;
  ticketName?: string;
  amountText?: string;
  qrBase64: string;
};

function wrapText(ctx: any, text: string, maxWidth: number) {
  const words = String(text || '').split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function drawLabelValue(ctx: any, label: string, value: string, x: number, y: number) {
  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 18px Arial';
  ctx.fillText(label.toUpperCase(), x, y);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 28px Arial';
  ctx.fillText(value || '-', x, y + 36);
}

export async function generateTicketPdf(data: TicketPdfData) {
  const width = 595;
  const height = 842;
  const canvas = createCanvas(width, height, 'pdf');
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, width - 76, height - 76);

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 34px Arial';
  ctx.fillText('WOLNAA', 62, 92);

  ctx.fillStyle = '#facc15';
  ctx.fillRect(width - 178, 60, 116, 34);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 15px Arial';
  ctx.fillText('E-TICKET', width - 148, 82);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(62, 124);
  ctx.lineTo(width - 62, 124);
  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.font = 'bold 40px Arial';
  const titleLines = wrapText(ctx, data.eventTitle, width - 124);
  titleLines.slice(0, 3).forEach((line, index) => {
    ctx.fillText(line, 62, 180 + index * 46);
  });

  const detailsTop = 340;
  drawLabelValue(ctx, 'Vor- und Nachname', data.customerName, 62, detailsTop);
  drawLabelValue(ctx, 'Ticket', data.ticketName || 'Standard Ticket', 62, detailsTop + 104);
  drawLabelValue(ctx, 'Preis', data.amountText || '-', 62, detailsTop + 208);

  ctx.fillStyle = '#6b7280';
  ctx.font = 'bold 18px Arial';
  ctx.fillText('TICKET-ID', 62, detailsTop + 312);
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 18px Courier New';
  ctx.fillText(data.ticketId, 62, detailsTop + 348);

  const qrImage = await loadImage(`data:image/png;base64,${data.qrBase64}`);
  const qrSize = 210;
  const qrX = width - 62 - qrSize;
  const qrY = 342;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 70);
  ctx.strokeStyle = '#d1d5db';
  ctx.setLineDash([6, 6]);
  ctx.strokeRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 70);
  ctx.setLineDash([]);
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = '#374151';
  ctx.font = 'bold 13px Arial';
  ctx.fillText('QR-Code am Einlass vorzeigen', qrX + 10, qrY + qrSize + 34);

  ctx.fillStyle = '#6b7280';
  ctx.font = '14px Arial';
  ctx.fillText('Dieses Ticket ist nur einmal gültig. Bitte digital oder ausgedruckt mitbringen.', 62, height - 98);
  ctx.fillText('Kontakt: kontakt@wolnaa.de', 62, height - 76);

  return canvas.toBuffer('application/pdf');
}
