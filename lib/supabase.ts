import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Preserve the SDK's default public schema. ReturnType on the generic factory
// loses its defaults and makes table rows resolve to never.
let _supabase: SupabaseClient | null = null;

export const getSupabase = () => {
  if (!_supabase) {
    _supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabase;
};

// Lazy proxy so existing imports still work
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabase(), prop);
  }
});
