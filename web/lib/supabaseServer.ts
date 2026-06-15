import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (_supabase) return _supabase;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase environment variables. Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  }
  _supabase = createClient(url, key, { auth: { persistSession: false } });
  return _supabase;
}
