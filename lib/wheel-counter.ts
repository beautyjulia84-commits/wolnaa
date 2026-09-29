import type { SupabaseClient } from '@supabase/supabase-js';

// A separate counter starts at zero when the new promotion is first used.
const COUNTER_KEY = 'wheel_spins:nuernberg:30-40:every-70:v1';

export async function claimWheelSpin(client: SupabaseClient): Promise<number> {
  const { error: initError } = await client.from('settings').upsert(
    { key: COUNTER_KEY, value: '0' },
    { onConflict: 'key', ignoreDuplicates: true },
  );
  if (initError) throw new Error('Wheel counter unavailable');

  for (let attempt = 0; attempt < 20; attempt++) {
    const { data, error } = await client.from('settings').select('value').eq('key', COUNTER_KEY).single();
    if (error || !data || !/^\d+$/.test(data.value)) throw new Error('Wheel counter unavailable');
    const next = Number(data.value) + 1;
    if (!Number.isSafeInteger(next) || next < 1) throw new Error('Invalid wheel counter');

    // Compare-and-swap: concurrent requests cannot claim the same spin number.
    const { data: updated, error: updateError } = await client.from('settings')
      .update({ value: String(next) }).eq('key', COUNTER_KEY).eq('value', data.value)
      .select('value').maybeSingle();
    if (updateError) throw new Error('Wheel counter unavailable');
    if (updated) return next;
  }
  throw new Error('Wheel counter busy');
}
