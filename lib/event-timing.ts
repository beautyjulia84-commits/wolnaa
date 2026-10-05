/** All event form times use Europe/Berlin, independent of browser/server timezone. */
export type TimedEvent = { date?: string; time?: string; online_sale_ends_at?: string | null; event_ends_at?: string | null };
const zone = 'Europe/Berlin';
export function berlinLocal(value: string | number | Date): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: zone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23' }).formatToParts(date).map(p => [p.type,p.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function berlinInstant(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Datum und Uhrzeit bitte vollständig angeben.');
  const wall = Date.parse(value + ':00Z');
  const candidates = [1,2].map(hours => wall - hours * 3600000).filter(t => berlinLocal(t) === value);
  if (!candidates.length) throw new Error('Diese Uhrzeit existiert nicht (bitte Datum/Sommerzeit prüfen).');
  // For the repeated autumn hour choose the earlier instant, closing sales conservatively.
  return new Date(Math.min(...candidates)).toISOString();
}
export function defaultEndLocal(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return '';
  const next = new Date(date + 'T12:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
  return Number.isFinite(next.getTime()) ? next.toISOString().slice(0,10) + 'T05:00' : '';
}
export function eventTiming(event: TimedEvent, now = Date.now()) {
  let starts = NaN, ends = NaN;
  try { starts = Date.parse(berlinInstant(`${event.date}T${event.time || '00:00'}`)); } catch { /* invalid configuration fails closed */ }
  try { ends = Date.parse(event.event_ends_at || berlinInstant(defaultEndLocal(event.date || ''))); } catch { /* invalid configuration fails closed */ }
  const sale = event.online_sale_ends_at ? Date.parse(event.online_sale_ends_at) : starts;
  const salesEnd = Math.min(sale, ends);
  const ended = !Number.isFinite(ends) || now >= ends;
  return { starts, ends, salesEnd, ended, salesClosed: ended || !Number.isFinite(salesEnd) || now >= salesEnd,
    status: ended ? 'Abgeschlossen' : Number.isFinite(starts) && now >= starts ? 'Läuft' : 'Kommend' };
}
export function validateSchedule(event: { date?:string; time?:string; onlineSaleEndsAt?:string; eventEndsAt?:string }) {
  const starts = berlinInstant(`${event.date}T${event.time || '00:00'}`);
  const endAt = berlinInstant(event.eventEndsAt || defaultEndLocal(event.date || ''));
  const salesEndAt = event.onlineSaleEndsAt ? berlinInstant(event.onlineSaleEndsAt) : null;
  if (endAt <= starts) throw new Error('Das Veranstaltungsende muss nach dem Beginn liegen. Für Nachtveranstaltungen bitte den Folgetag wählen.');
  if (salesEndAt && salesEndAt > endAt) throw new Error('Der Online-Verkauf muss spätestens zum Veranstaltungsende schließen.');
  return { version: 1, endAt, salesEndAt };
}
