import type { SupabaseClient } from '@supabase/supabase-js';
import { berlinInstant, validateSchedule } from './event-timing';
const prefix = 'event-schedule:';
export async function withEventSchedules<T extends { id:string; online_sale_ends_at?:string|null }>(db: SupabaseClient, events:T[]) {
  if (!events.length) return [];
  const {data,error} = await db.from('settings').select('key,value').in('key',events.map(e => prefix + e.id));
  if (error) throw new Error('Veranstaltungszeiten konnten nicht geladen werden.');
  const settings = new Map((data || []).map(row => [row.key,JSON.parse(row.value)]));
  return events.map(event => {
    const saved = settings.get(prefix + event.id);
    // Prior form writers interpreted German wall times as UTC. Preserve their entered
    // wall-clock value and interpret it in Berlin until the event is explicitly saved.
    let salesEnd = event.online_sale_ends_at || null;
    if (!saved && salesEnd) {
      try { salesEnd = berlinInstant(new Date(salesEnd).toISOString().slice(0,16)); }
      catch { throw new Error('Gespeichertes Verkaufsende ist ungültig. Bitte Event bearbeiten.'); }
    }
    return { ...event, online_sale_ends_at: saved ? saved.salesEndAt : salesEnd, event_ends_at: saved?.endAt || null };
  });
}
export async function saveEventSchedule(db:SupabaseClient,id:string,schedule:ReturnType<typeof validateSchedule>) {
  const {error} = await db.from('settings').upsert({key:prefix+id,value:JSON.stringify(schedule)},{onConflict:'key'});
  if (error) throw new Error('Event gespeichert, Zeitplan aber nicht gespeichert. Bitte erneut speichern.');
}
