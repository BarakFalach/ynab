'use client';

import { useEffect, useMemo, useState } from 'react';
import { normalizePayeeName } from '@/lib/normalize';
import type { PayeeOverride, YnabCategory, YnabPayee } from '@/lib/types';
import PayeeCombobox from './_components/PayeeCombobox';

export default function OverridesPage() {
  const [payees, setPayees] = useState<YnabPayee[]>([]);
  const [categories, setCategories] = useState<YnabCategory[]>([]);
  const [overrides, setOverrides] = useState<PayeeOverride[]>([]);

  const [selectedPayee, setSelectedPayee] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOverrides = async () => {
    const res = await fetch('/api/overrides');
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load overrides');
    setOverrides(await res.json());
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [payeesRes, categoriesRes] = await Promise.all([
        fetch('/api/payees'),
        fetch('/api/categories'),
      ]);
      if (!payeesRes.ok) throw new Error((await payeesRes.json()).error || 'Failed to load payees');
      if (!categoriesRes.ok)
        throw new Error((await categoriesRes.json()).error || 'Failed to load categories');

      const payeesData: YnabPayee[] = await payeesRes.json();
      const categoriesData: YnabCategory[] = await categoriesRes.json();
      payeesData.sort((a, b) => a.name.localeCompare(b.name));

      setPayees(payeesData);
      setCategories(categoriesData);
      await loadOverrides();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Group categories by group name for <optgroup> rendering.
  const groupedCategories = useMemo(() => {
    const groups = new Map<string, YnabCategory[]>();
    for (const c of categories) {
      if (!groups.has(c.group)) groups.set(c.group, []);
      groups.get(c.group)!.push(c);
    }
    return Array.from(groups.entries());
  }, [categories]);

  const validCategoryIds = useMemo(
    () => new Set(categories.map((c) => c.id)),
    [categories]
  );

  const normalizedSelectedPayee = selectedPayee ? normalizePayeeName(selectedPayee) : '';
  const showsNormalizationNote =
    selectedPayee && normalizedSelectedPayee !== selectedPayee;

  const handleSave = async () => {
    if (!selectedPayee || !selectedCategory) return;
    setSaving(true);
    setError(null);
    try {
      const category = categories.find((c) => c.id === selectedCategory);
      const res = await fetch('/api/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payee_name: selectedPayee,
          category_id: selectedCategory,
          category_name: category?.name ?? null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save override');
      setSelectedPayee('');
      setSelectedCategory('');
      await loadOverrides();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (o: PayeeOverride) => {
    setSelectedPayee(o.payee_name);
    setSelectedCategory(o.category_id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (payeeName: string) => {
    if (!confirm(`Delete override for "${payeeName}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/overrides/${encodeURIComponent(payeeName)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete override');
      await loadOverrides();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <main className="page">
      <h1>Payee Category Overrides</h1>
      <p className="subtitle">
        Override the YNAB category for a payee. At upload time this takes precedence over
        the default credit-card category mapping. Applies to both cards.
      </p>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <section className="card">
            <h2>Add / update an override</h2>
            <div className="form">
              <label className="field">
                <span>Payee</span>
                <PayeeCombobox
                  payees={payees}
                  value={selectedPayee}
                  onChange={setSelectedPayee}
                />
              </label>

              <label className="field">
                <span>Category</span>
                <select
                  className="select"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="">Select a category…</option>
                  {groupedCategories.map(([group, cats]) => (
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

              <button
                className="btn"
                onClick={handleSave}
                disabled={!selectedPayee || !selectedCategory || saving}
              >
                {saving ? 'Saving…' : 'Save override'}
              </button>
            </div>
            {showsNormalizationNote && (
              <p className="note">
                Will be stored as <code>{normalizedSelectedPayee}</code> (slashes removed to
                match the uploaded payee name).
              </p>
            )}
          </section>

          <section className="card">
            <h2>Existing overrides ({overrides.length})</h2>
            {overrides.length === 0 ? (
              <p className="empty">No overrides yet.</p>
            ) : (
              <div className="overrideList">
                {overrides.map((o) => {
                  const stale = !validCategoryIds.has(o.category_id);
                  return (
                    <div key={o.id} className="overrideItem">
                      <div className="main">
                        <span className="payee">{o.payee_name}</span>
                        <span className="meta">
                          {o.category_name ?? o.category_id}
                          {stale && (
                            <span
                              className="staleBadge"
                              title="This category no longer exists in YNAB"
                            >
                              category missing
                            </span>
                          )}
                        </span>
                        <span className="date">
                          Updated {new Date(o.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="overrideActions">
                        <button className="linkBtn" onClick={() => handleEdit(o)}>
                          Edit
                        </button>
                        <button
                          className="linkBtn danger"
                          onClick={() => handleDelete(o.payee_name)}
                        >
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
