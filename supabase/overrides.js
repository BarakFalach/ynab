import { supabase } from './supabaseConfig.js';

// Returns Map<normalizedPayeeName, category_id> for all configured payee overrides.
//
// The keys are the NORMALIZED payee names (slashes stripped) so they match the
// `nameWithOutSlash` value computed in mapper/expenseMapper.js. The Next.js UI
// normalizes before writing, so no normalization is needed here at read time.
//
// On any error this returns an empty Map so the mapper falls back to the default
// CategoriesMapper.json allocation — a Supabase outage never blocks uploads.
export const getOverridesMap = async () => {
  try {
    const { data, error } = await supabase
      .from('payee_overrides')
      .select('payee_name, category_id');

    if (error) {
      console.error('❌ Error loading payee overrides:', error);
      return new Map();
    }

    return new Map((data ?? []).map((r) => [r.payee_name, r.category_id]));
  } catch (error) {
    console.error('❌ Error loading payee overrides:', error);
    return new Map();
  }
};
