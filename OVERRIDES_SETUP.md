# Payee Category Overrides — Setup

This feature lets you override the YNAB category for a specific payee. At upload
time, the mapper checks for a payee override **before** falling back to the
default credit-card category mapping in `mapper/CategoriesMapper.json`.

Overrides are **global per payee** (one override per payee, applies to both
the Barak and Adi cards) and are stored in Supabase. The override UI lives in the
Next.js app under `web/` (see `web/README.md`); the worker-side mapper reads the
overrides from the same Supabase table.

## 1. Create the Supabase table

Run this in the Supabase SQL Editor (same project as `transaction_logs`):

```sql
CREATE TABLE payee_overrides (
  id            SERIAL PRIMARY KEY,
  payee_name    VARCHAR(255) NOT NULL UNIQUE,   -- normalized (slashes stripped)
  category_id   UUID NOT NULL,
  category_name VARCHAR(255),                   -- denormalized for UI display
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_payee_overrides_payee ON payee_overrides(payee_name);

-- keep updated_at fresh on edits
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payee_overrides_updated
  BEFORE UPDATE ON payee_overrides
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Row-Level Security: match the existing transaction_logs posture (disabled).
-- Without this, inserts via the anon key fail with
-- "new row violates row-level security policy" if RLS is on for the table.
ALTER TABLE payee_overrides DISABLE ROW LEVEL SECURITY;
```

Notes:
- `payee_name` is the **normalized** payee name (slashes `/` and `\` stripped).
  This must match the value the mapper uploads to YNAB. The Next.js POST handler
  normalizes the name before writing, so the stored key always matches.
- `UNIQUE(payee_name)` enforces one override per payee and enables upsert via
  `onConflict: 'payee_name'`.
- RLS is disabled, matching the existing `transaction_logs` table. The anon key is
  only used server-side in the Next.js route handlers, never exposed to the browser.
  If you prefer to keep RLS enabled, add a permissive policy instead:
  ```sql
  ALTER TABLE payee_overrides ENABLE ROW LEVEL SECURITY;
  CREATE POLICY anon_all ON payee_overrides
    FOR ALL TO anon USING (true) WITH CHECK (true);
  ```

## 2. How the worker applies overrides

- `supabase/overrides.js` exports `getOverridesMap()` returning
  `Map<normalizedPayeeName, category_id>`.
- `mapper/mapper.js` fetches this map once per run and threads it through
  `processSheet` into `mapCardExpenseToYnabExpense`.
- `mapper/expenseMapper.js` resolves the category with precedence:
  **override > `CategoriesMapper.json` (by card category) > `null`**.

If Supabase is unreachable, `getOverridesMap()` returns an empty map and the
mapper falls back to the default mapping — uploads are never blocked.
