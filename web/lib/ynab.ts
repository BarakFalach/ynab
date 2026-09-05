import type { YnabAccount, YnabCategory, YnabPayee } from './types';

const BASE = 'https://api.youneedabudget.com/v1';

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.YNAB_ACCESS_TOKEN}`,
});

const budgetId = () => process.env.BUDGET_ID;

const assertConfig = () => {
  if (!process.env.YNAB_ACCESS_TOKEN || !process.env.BUDGET_ID) {
    throw new Error('Missing YNAB_ACCESS_TOKEN or BUDGET_ID environment variable.');
  }
};

// Fetch non-deleted payees from the YNAB budget. Cached for 5 minutes.
export async function fetchPayees(): Promise<YnabPayee[]> {
  assertConfig();
  const res = await fetch(`${BASE}/budgets/${budgetId()}/payees`, {
    headers: authHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YNAB payees request failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return (json.data?.payees ?? [])
    .filter((p: any) => !p.deleted)
    .map((p: any): YnabPayee => ({ id: p.id, name: p.name }));
}

// Fetch categories, flattened across groups, excluding hidden/deleted. Cached for 5 minutes.
export async function fetchCategories(): Promise<YnabCategory[]> {
  assertConfig();
  const res = await fetch(`${BASE}/budgets/${budgetId()}/categories`, {
    headers: authHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YNAB categories request failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return (json.data?.category_groups ?? [])
    .filter((g: any) => !g.deleted && !g.hidden)
    .flatMap((g: any) =>
      (g.categories ?? [])
        .filter((c: any) => !c.deleted && !c.hidden)
        .map((c: any): YnabCategory => ({ id: c.id, name: c.name, group: g.name }))
    );
}

export async function fetchAccounts(): Promise<YnabAccount[]> {
  assertConfig();
  const res = await fetch(`${BASE}/budgets/${budgetId()}/accounts`, {
    headers: authHeaders(),
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`YNAB accounts request failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  return (json.data?.accounts ?? [])
    .filter((a: any) => !a.deleted && !a.closed)
    .map(
      (a: any): YnabAccount => ({
        id: a.id,
        name: a.name,
        type: a.type,
        transfer_payee_id: a.transfer_payee_id ?? null,
      })
    );
}
