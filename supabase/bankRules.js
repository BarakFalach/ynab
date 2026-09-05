import { supabase } from './supabaseConfig.js';

export const getBankRules = async () => {
  try {
    const { data, error } = await supabase.from('bank_rules').select('*');
    if (error) {
      console.error(`bank_rules unavailable (${error.code ?? 'error'}: ${error.message}); continuing with no rules`);
      return [];
    }
    return (data ?? []).sort((a, b) => a.priority - b.priority || b.match_text.length - a.match_text.length);
  } catch (error) {
    console.error(`bank_rules unavailable (${error.message}); continuing with no rules`);
    return [];
  }
};
