---
name: reconcile
description: Reconcile YNAB against the Discount Bank account and the Max credit cards. Runs the deterministic syncs, then handles only the judgment calls (categories, unknown bank rows, stale pending rows) with yes/no questions, and ends with a balance table. Use when the user says /reconcile, "sync my budget", "reconcile", or asks whether YNAB matches the bank or cards.
---

# /reconcile

Two layers. Keep them apart.

| Layer | Who does it | Never cross |
|---|---|---|
| Arithmetic: scraping, matching rows by id/date/amount, deciding what is new, stale, or duplicate, balance checks | `scripts/sync-bank.js` and `scripts/sync-cards.js` | Do not re-derive matches by hand, do not "fix" a mismatch by editing YNAB directly |
| Judgment: what category an unknown payee gets, what rule an unknown bank row needs, whether a stale row may be deleted, explaining a discrepancy | You, with the user's yes/no | Do not guess silently; every write outside the scripts is proposed first |

Everything runs from the repo root with Node 22: prefix commands with `fnm exec --using=22.23.2`.
Scratch files go in the session scratchpad directory. Read `BANK_RULES_SETUP.md` once if you have not.

## Procedure

### 1. Dry runs, both sources

```
fnm exec --using=22.23.2 node scripts/sync-bank.js  --days 30 --json <scratch>/bank.json
fnm exec --using=22.23.2 node scripts/sync-cards.js --days 45 --json <scratch>/cards.json
```

Both open a Chrome window for login. If a scrape fails on a login selector, check
`PUPPETEER_ARGS` is passed in `scraping/bank.js` and `scraping/cards.js`; do not retry more than twice.
Read the two JSON files, not the console tables.

### 2. Apply the safe part

If `bank.json` has `unmatched` empty → rerun the bank sync with `--upload`.
If `cards.json` has every card's `consistency.cleared.ok` true and `staleToDelete` 0 → rerun cards with `--upload`.
Otherwise continue to step 3 first; the uploads happen after the user answers.

### 3. Judgment calls, one table each, only when non-empty

**Uncategorized card rows** (`cards.json.uncategorized`). For each distinct payee:
- Look at YNAB history for that payee: `GET /budgets/{BUDGET_ID}/payees` to find the payee id, then
  `GET /budgets/{BUDGET_ID}/payees/{id}/transactions`; if the last 3+ transactions share one category,
  propose that category as a payee override. Otherwise propose the category the Max category
  (`maxCategory`) would map to, and if `maxCategory` is missing from `mapper/CategoriesMapper.json`,
  propose adding it there with the closest YNAB category.
- Present: payee · Max category · proposed YNAB category · evidence (e.g. "12 of 12 past rows").

**Unmatched bank rows** (`bank.json.unmatched`). For each: description · amount · what it looks like ·
proposed rule (`match_text`, optional `match_amount`, payee, category or transfer account). A Max row
that did not match any card means the card scrape window was too short or the bill has not settled;
say so instead of proposing a rule.

**Stale pending rows** (`cards.json.cards[].actions` with `delete-stale`). List them with the settled
row that replaces each, when one exists. These are removed only with `--apply-deletes`.

**Extra rows** (`extra`): cleared YNAB rows not on the Max statement. Report only. Never delete.

Ask the user with one question per table, answerable yes/no or by naming a category. Do not proceed
past this step without an answer for deletions. Categories and rules may be applied when the user
says "apply all".

### 4. Apply what was approved

- Payee override: upsert into Supabase `payee_overrides` `{ payee_name, category_id, category_name }`
  (payee_name with `/` and `\` stripped, exactly as uploaded). Use the `supabase` client from
  `supabase/supabaseConfig.js`.
- Bank rule: insert into `bank_rules` with the columns in `supabase/bank_rules.sql`.
- Mapper addition: append to `mapper/CategoriesMapper.json` (`id`, `category_group_name`, `name`, `CardName`).
- Then rerun: bank with `--upload`, cards with `--upload` and, if deletions were approved, `--apply-deletes`.
- Rows already in YNAB that the new override should have categorized: update them with
  `PATCH /budgets/{BUDGET_ID}/transactions` so the fix is not only forward-looking.

### 5. Report

End with one table, no more:

| Account | YNAB | Source | |
|---|---|---|---|
| Shared Account | balance | Discount balance | ✓ / difference |
| Executive Card | cleared / uncleared sums | Max settled / pending sums | ✓ / difference |
| Adi's Card | same | same | ✓ / difference |

Then: rows created, cleared, deleted; rules and overrides added; anything still flagged yellow in
YNAB with a one-line reason each. If everything matched and nothing needed a decision, say so in two
lines and stop.

## Rules

- The scripts' output is the truth for matching. If a number looks wrong, rerun the script with
  `--offline` to inspect, do not patch YNAB around it.
- Dine Card (CAL) has no scraper. Its bank debits become transfers; its spending is entered by hand.
  Do not invent rows for it.
- Never run `--apply-deletes` without an explicit yes in this conversation.
- Card payments and immediate Max charges are created by the bank sync as transfers. If a card looks
  overpaid or underpaid, the bank sync is where to look.
- Keep the report short; the user reads it on a phone.
