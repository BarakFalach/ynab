# Bank Rules — Setup

Bank rules turn a Discount Bank statement row into a YNAB transaction. They live in
Supabase (`bank_rules`), are edited in the web app under **Bank rules**, and are read by
the worker (`scripts/sync-bank.js`) on every run.

## 1. Create the table

Run `supabase/bank_rules.sql` in the Supabase SQL editor (same project as
`payee_overrides`). It creates the table and seeds the rules that reproduced the
June–September 2026 reconciliation: rent and daycare cheques, Wix / Marmanet / Miluim
salaries, Bituach Leumi, Bit, CAL → Dine Card transfer, Excellence transfer, bank fees,
the fixed deposit, and RSU proceeds.

## 2. How a row is mapped

1. Description starts with `מקס איט פי` → matched to the Max card whose completed
   transactions charged on that date sum to the same amount → transfer to that card.
   No rule needed. Unmatched Max rows land uncategorized and flagged yellow.
2. Otherwise the first rule whose `match_text` appears in the description and whose
   `match_amount` is empty or equals the amount wins (lower `priority` first, then the
   longer `match_text`). The rule sets the payee and either a category or a transfer
   account (plus a category when the target is a tracking account such as Excellence).
3. No rule → payee is the raw description, uncategorized, flagged yellow.

Every uploaded row carries `import_id = discount:<statement reference>`, and rows that
already exist in YNAB with the same date and amount are skipped, so re-running is safe.

## 3. Running

```
npm run sync:bank -- --days 30            # dry run: prints what would change
npm run sync:bank -- --days 30 --upload   # uploads, then checks the balance
```

Needs Node ≥ 22.22.2 (`.nvmrc`) and `DISCOUNT_ID`, `DISCOUNT_PASSWORD`, `DISCOUNT_NUM`
in `.env`.
