-- Bank rules: how a Discount Bank row becomes a YNAB transaction.
-- Run in the Supabase SQL editor (same project as payee_overrides).

CREATE TABLE IF NOT EXISTS bank_rules (
  id                    SERIAL PRIMARY KEY,
  match_text            VARCHAR(255) NOT NULL,
  match_amount          NUMERIC(12,2),
  payee_name            VARCHAR(255) NOT NULL,
  category_id           UUID,
  category_name         VARCHAR(255),
  transfer_account_id   UUID,
  transfer_account_name VARCHAR(255),
  priority              INT NOT NULL DEFAULT 100,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (category_id IS NOT NULL OR transfer_account_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_rules_match
  ON bank_rules (match_text, COALESCE(match_amount, 0));

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bank_rules_updated ON bank_rules;
CREATE TRIGGER trg_bank_rules_updated
  BEFORE UPDATE ON bank_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE bank_rules DISABLE ROW LEVEL SECURITY;

INSERT INTO bank_rules
  (match_text, match_amount, payee_name, category_id, category_name, transfer_account_id, transfer_account_name)
VALUES
  ('משיכת שיק', -9000.00, 'Rent', '8c7399a1-4810-4f3b-9234-468f3741784f', 'Rent 🏠', NULL, NULL),
  ('משיכת שיק', -9400.00, 'Rent', '8c7399a1-4810-4f3b-9234-468f3741784f', 'Rent 🏠', NULL, NULL),
  ('משיכת שיק', -4800.00, 'Daycare', '730087de-9b66-40f2-bd13-fc50c8d61cdf', 'Lulu 🐣', NULL, NULL),
  ('משיכת שיק', -5200.00, 'Daycare', '730087de-9b66-40f2-bd13-fc50c8d61cdf', 'Lulu 🐣', NULL, NULL),
  ('וויקס.קום משכורת', NULL, 'Wix', 'ba63480c-d90d-481e-a780-83f834dd70f7', 'Inflow: Ready to Assign', NULL, NULL),
  ('מרמנת', NULL, 'Marmanet', 'ba63480c-d90d-481e-a780-83f834dd70f7', 'Inflow: Ready to Assign', NULL, NULL),
  ('מופ"ת מילו', NULL, 'Miluim', 'ba63480c-d90d-481e-a780-83f834dd70f7', 'Inflow: Ready to Assign', NULL, NULL),
  ('ביטוח לאומי', NULL, 'Bituach Leumi - Children', 'ba63480c-d90d-481e-a780-83f834dd70f7', 'Inflow: Ready to Assign', NULL, NULL),
  ('ביט משיכה', NULL, 'Bit', 'ba63480c-d90d-481e-a780-83f834dd70f7', 'Inflow: Ready to Assign', NULL, NULL),
  ('משרותי בורסה', NULL, 'Wix RSU', 'ba63480c-d90d-481e-a780-83f834dd70f7', 'Inflow: Ready to Assign', NULL, NULL),
  ('עמלת', NULL, 'Bank fee', '679f1333-f41f-45b8-a9dd-5948cb580481', 'Bills  📜', NULL, NULL),
  ('החזר דיסקונט עמלות', NULL, 'Bank fee', '679f1333-f41f-45b8-a9dd-5948cb580481', 'Bills  📜', NULL, NULL),
  ('עמ.ערב.שכר', NULL, 'Bank fee - rent guarantee', '8c7399a1-4810-4f3b-9234-468f3741784f', 'Rent 🏠', NULL, NULL),
  ('הפקדה לפיקדון', NULL, 'Bank Deposit (1 year)', '8e6fd41b-a588-4731-ba50-413fa533eca2', '🔒 Deposit', NULL, NULL),
  ('כ.א.ל חיוב', NULL, 'Dine Card', NULL, NULL, '927f4297-bbd0-428d-ae1c-ad04a42ade08', 'Dine Card'),
  ('הע. לאקסלנס', NULL, 'Excellence', '78921ff4-854a-4713-9358-573d858f6803', '📈  Excellence Trade (Out of Reach)', 'd0c0167e-3770-4342-a3ea-620faf0bcfc8', 'Excellence')
ON CONFLICT DO NOTHING;
