'use client';

import { useEffect, useState } from 'react';
import type { BankRule, YnabAccount, YnabCategory, YnabPayee } from '@/lib/types';

type RuleAction = 'category' | 'transfer';

export default function BankRulesPage() {
  const [payees, setPayees] = useState<YnabPayee[]>([]);
  const [categories, setCategories] = useState<YnabCategory[]>([]);
  const [accounts, setAccounts] = useState<YnabAccount[]>([]);
  const [rules, setRules] = useState<BankRule[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [matchText, setMatchText] = useState('');
  const [matchAmount, setMatchAmount] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [action, setAction] = useState<RuleAction>('category');
  const [categoryId, setCategoryId] = useState('');
  const [transferAccountId, setTransferAccountId] = useState('');
  const [priority, setPriority] = useState('100');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRules = async () => {
    const res = await fetch('/api/bank-rules');
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load bank rules');
    setRules(await res.json());
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [payeesRes, categoriesRes, accountsRes] = await Promise.all([
        fetch('/api/payees'),
        fetch('/api/categories'),
        fetch('/api/accounts'),
      ]);
      if (!payeesRes.ok) throw new Error((await payeesRes.json()).error || 'Failed to load payees');
      if (!categoriesRes.ok)
        throw new Error((await categoriesRes.json()).error || 'Failed to load categories');
      if (!accountsRes.ok)
        throw new Error((await accountsRes.json()).error || 'Failed to load accounts');

      const payeesData: YnabPayee[] = await payeesRes.json();
      const categoriesData: YnabCategory[] = await categoriesRes.json();
      const accountsData: YnabAccount[] = await accountsRes.json();
      payeesData.sort((a, b) => a.name.localeCompare(b.name));
      accountsData.sort((a, b) => a.name.localeCompare(b.name));

      setPayees(payeesData);
      setCategories(categoriesData);
      setAccounts(accountsData);
      await loadRules();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const groupedCategories = new Map<string, YnabCategory[]>();
  for (const c of categories) {
    if (!groupedCategories.has(c.group)) groupedCategories.set(c.group, []);
    groupedCategories.get(c.group)!.push(c);
  }
  const validCategoryIds = new Set(categories.map((c) => c.id));
  const validAccountIds = new Set(accounts.map((a) => a.id));

  const resetForm = () => {
    setEditingId(null);
    setMatchText('');
    setMatchAmount('');
    setPayeeName('');
    setAction('category');
    setCategoryId('');
    setTransferAccountId('');
    setPriority('100');
  };

  const targetChosen = action === 'category' ? !!categoryId : !!transferAccountId;
  const canSave = !!matchText.trim() && !!payeeName.trim() && targetChosen && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const category = categories.find((c) => c.id === categoryId);
      const account = accounts.find((a) => a.id === transferAccountId);
      const transferChosen = action === 'transfer';
      const res = await fetch('/api/bank-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          match_text: matchText,
          match_amount: matchAmount.trim() === '' ? null : Number(matchAmount),
          payee_name: payeeName,
          category_id: categoryId || null,
          category_name: category?.name ?? null,
          transfer_account_id: transferChosen ? transferAccountId : null,
          transfer_account_name: transferChosen ? account?.name ?? null : null,
          priority,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save rule');
      resetForm();
      await loadRules();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (r: BankRule) => {
    setEditingId(r.id);
    setMatchText(r.match_text);
    setMatchAmount(r.match_amount === null ? '' : String(r.match_amount));
    setPayeeName(r.payee_name);
    setAction(r.transfer_account_id ? 'transfer' : 'category');
    setCategoryId(r.category_id ?? '');
    setTransferAccountId(r.transfer_account_id ?? '');
    setPriority(String(r.priority));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (r: BankRule) => {
    if (!confirm(`Delete rule for "${r.match_text}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/bank-rules/${r.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete rule');
      if (editingId === r.id) resetForm();
      await loadRules();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <main className="page">
      <h1>Bank rules</h1>
      <p className="subtitle">
        Rules turn Discount Bank statement rows into YNAB transactions. A row matches when its
        description contains the rule text (and the amount, if set); the lowest priority wins.
        Rows starting with &quot;מקס איט פי&quot; (Max card charges) are matched to the card
        statements automatically and need no rule.
      </p>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <section className="card">
            <h2>{editingId === null ? 'Add a rule' : 'Update rule'}</h2>
            <div className="form">
              <label className="field">
                <span>Bank description contains</span>
                <input
                  type="text"
                  className="input"
                  dir="auto"
                  value={matchText}
                  onChange={(e) => setMatchText(e.target.value)}
                  placeholder="e.g. משיכת שיק"
                />
              </label>

              <label className="field">
                <span>Only when amount is</span>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  dir="auto"
                  value={matchAmount}
                  onChange={(e) => setMatchAmount(e.target.value)}
                  placeholder="any amount"
                />
                <small className="hint">Debits are negative, e.g. -9000</small>
              </label>

              <label className="field">
                <span>YNAB payee</span>
                <input
                  type="text"
                  className="input"
                  dir="auto"
                  list="ynab-payees"
                  value={payeeName}
                  onChange={(e) => setPayeeName(e.target.value)}
                  placeholder="Existing or new payee name"
                  autoComplete="off"
                />
                <datalist id="ynab-payees">
                  {payees.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
              </label>

              <div className="field">
                <span>Then</span>
                <div className="radios">
                  <label>
                    <input
                      type="radio"
                      name="ruleAction"
                      checked={action === 'category'}
                      onChange={() => setAction('category')}
                    />
                    Assign category
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="ruleAction"
                      checked={action === 'transfer'}
                      onChange={() => setAction('transfer')}
                    />
                    Transfer to account
                  </label>
                </div>
              </div>

              {action === 'transfer' && (
                <label className="field">
                  <span>Account</span>
                  <select
                    className="select"
                    value={transferAccountId}
                    onChange={(e) => setTransferAccountId(e.target.value)}
                  >
                    <option value="">Select an account…</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="field">
                <span>
                  {action === 'transfer'
                    ? 'Category (only for tracking accounts such as Excellence)'
                    : 'Category'}
                </span>
                <select
                  className="select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">
                    {action === 'transfer' ? 'No category' : 'Select a category…'}
                  </option>
                  {Array.from(groupedCategories.entries()).map(([group, cats]) => (
                    <optgroup key={group} label={group}>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className="field narrow">
                <span>Priority</span>
                <input
                  type="number"
                  step="1"
                  className="input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                />
              </label>

              <button className="btn" onClick={handleSave} disabled={!canSave}>
                {saving ? 'Saving…' : editingId === null ? 'Save rule' : 'Update rule'}
              </button>
              {editingId !== null && (
                <button className="linkBtn" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Existing rules ({rules.length})</h2>
            {rules.length === 0 ? (
              <p className="empty">No rules yet.</p>
            ) : (
              <div className="overrideList">
                {rules.map((r) => {
                  const categoryMissing = !!r.category_id && !validCategoryIds.has(r.category_id);
                  const accountMissing =
                    !!r.transfer_account_id && !validAccountIds.has(r.transfer_account_id);
                  return (
                    <div key={r.id} className="overrideItem">
                      <div className="main">
                        <span className="payee">
                          <span dir="auto">{r.match_text}</span>
                          {' · '}
                          {r.match_amount === null
                            ? 'any amount'
                            : Number(r.match_amount).toFixed(2)}
                        </span>
                        <span className="meta">
                          → {r.payee_name}
                          {' · '}
                          {r.transfer_account_id
                            ? `Transfer → ${r.transfer_account_name ?? r.transfer_account_id}`
                            : r.category_name ?? r.category_id}
                          {r.transfer_account_id && r.category_id && (
                            <> ({r.category_name ?? r.category_id})</>
                          )}
                          {' · '}priority {r.priority}
                          {categoryMissing && (
                            <span
                              className="staleBadge"
                              title="This category no longer exists in YNAB"
                            >
                              category missing
                            </span>
                          )}
                          {accountMissing && (
                            <span
                              className="staleBadge"
                              title="This account no longer exists in YNAB"
                            >
                              account missing
                            </span>
                          )}
                        </span>
                        <span className="date">
                          Updated {new Date(r.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="overrideActions">
                        <button className="linkBtn" onClick={() => handleEdit(r)}>
                          Edit
                        </button>
                        <button className="linkBtn danger" onClick={() => handleDelete(r)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
