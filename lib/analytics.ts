import { supabase } from '@/lib/supabase';
export type AnalyticsEntry = { kind: 'view' | 'wheel' | 'purchase'; date: string; path?: string; source?: string; device?: string; newVisit?: boolean; count?: number };
export async function recordAnalytics(entry: Omit<AnalyticsEntry, 'date'>, id = crypto.randomUUID()) {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin' }).format(new Date());
  const { error } = await supabase.from('settings').upsert({ key: `analytics_entry:${id}`, value: JSON.stringify({ ...entry, date }) }, { onConflict: 'key' });
  if (error) throw new Error(error.message);
}
export function acquisitionSource(req: Request) {
  const cookie = req.headers.get('cookie')?.split(';').find(item => item.trim().startsWith('wolnaa-source='));
  try { return decodeURIComponent(cookie?.trim().slice('wolnaa-source='.length) || 'Direkt / unbekannt').slice(0,100); }
  catch { return 'Direkt / unbekannt'; }
}
