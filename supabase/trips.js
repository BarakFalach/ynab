import { supabase } from './supabaseConfig.js';

export const getTrips = async () => {
  try {
    const { data, error } = await supabase.from('trips').select('*');
    if (error) {
      console.error(`trips unavailable (${error.code ?? 'error'}: ${error.message}); continuing with no trips`);
      return [];
    }
    return data ?? [];
  } catch (error) {
    console.error(`trips unavailable (${error.message}); continuing with no trips`);
    return [];
  }
};
