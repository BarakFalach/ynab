'use client';

import { useEffect, useState } from 'react';
import type { Trip, YnabCategory } from '@/lib/types';

const MAX_CATEGORIES = [
  'אופנה',
  'עיצוב הבית',
  'חשמל ומחשבים',
  'ספרים ודפוס',
  'קוסמטיקה וטיפוח',
  'מסעדות, קפה וברים',
  'מזון וצריכה',
  'תחבורה ורכבים',
  'פנאי, בידור וספורט',
  'טיסות ותיירות',
  'רפואה ובתי מרקחת',
  'שונות',
];
const DEFAULT_EXCLUDED = ['אופנה'];

export default function TripsPage() {
  const [categories, setCategories] = useState<YnabCategory[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [excluded, setExcluded] = useState<string[]>(DEFAULT_EXCLUDED);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTrips = async () => {
    const res = await fetch('/api/trips');
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to load trips');
    setTrips(await res.json());
  };

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const categoriesRes = await fetch('/api/categories');
      if (!categoriesRes.ok)
        throw new Error((await categoriesRes.json()).error || 'Failed to load categories');
      setCategories(await categoriesRes.json());
      await loadTrips();
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
  const today = new Date().toISOString().slice(0, 10);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCurrency('EUR');
    setStartDate('');
    setEndDate('');
    setCategoryId('');
    setExcluded(DEFAULT_EXCLUDED);
  };

  const toggleExcluded = (maxCategory: string) =>
    setExcluded((current) =>
      current.includes(maxCategory)
        ? current.filter((c) => c !== maxCategory)
        : [...current, maxCategory]
    );

  const canSave =
    !!name.trim() &&
    /^[A-Za-z]{3}$/.test(currency.trim()) &&
    !!startDate &&
    !!endDate &&
    endDate >= startDate &&
    !!categoryId &&
    !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const category = categories.find((c) => c.id === categoryId);
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingId,
          name,
          currency,
          start_date: startDate,
          end_date: endDate,
          category_id: categoryId,
          category_name: category?.name ?? null,
          excluded_max_categories: excluded,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save trip');
      resetForm();
      await loadTrips();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (t: Trip) => {
    setEditingId(t.id);
    setName(t.name);
    setCurrency(t.currency);
    setStartDate(t.start_date);
    setEndDate(t.end_date);
    setCategoryId(t.category_id);
    setExcluded(t.excluded_max_categories);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (t: Trip) => {
    if (!confirm(`Delete trip "${t.name}"?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/trips/${t.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to delete trip');
      if (editingId === t.id) resetForm();
      await loadTrips();
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
    <main className="page">
      <h1>Trips</h1>
      <p className="subtitle">
        Between the start and end dates, every card expense in the trip&apos;s currency goes to
        the trip category. This beats payee overrides and the default mapping. Expenses in the
        excluded Max categories keep their normal category. Rows the sync already uploaded move
        to the trip category on the next run, unless you changed their category by hand in YNAB.
      </p>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <>
          <section className="card">
            <h2>{editingId === null ? 'Add a trip' : 'Update trip'}</h2>
            <div className="form">
              <label className="field">
                <span>Name</span>
                <input
                  type="text"
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paris"
                />
              </label>

              <label className="field narrow">
                <span>Currency</span>
                <input
                  type="text"
                  className="input"
                  maxLength={3}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </label>

              <label className="field">
                <span>From</span>
                <input
                  type="date"
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>

              <label className="field">
                <span>To</span>
                <input
                  type="date"
                  className="input"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                />
                <small className="hint">Include days you booked things in advance</small>
              </label>

              <label className="field">
                <span>Category</span>
                <select
                  className="select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select a category…</option>
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

              <div className="field">
                <span>Keep normal category for (Max categories)</span>
                <div className="radios">
                  {MAX_CATEGORIES.map((maxCategory) => (
                    <label key={maxCategory} dir="auto">
                      <input
                        type="checkbox"
                        checked={excluded.includes(maxCategory)}
                        onChange={() => toggleExcluded(maxCategory)}
                      />
                      {maxCategory}
                    </label>
                  ))}
                </div>
              </div>

              <button className="btn" onClick={handleSave} disabled={!canSave}>
                {saving ? 'Saving…' : editingId === null ? 'Save trip' : 'Update trip'}
              </button>
              {editingId !== null && (
                <button className="linkBtn" onClick={resetForm} disabled={saving}>
                  Cancel
                </button>
              )}
            </div>
          </section>

          <section className="card">
            <h2>Trips ({trips.length})</h2>
            {trips.length === 0 ? (
              <p className="empty">No trips yet.</p>
            ) : (
              <div className="overrideList">
                {trips.map((t) => {
                  const active = t.start_date <= today && today <= t.end_date;
                  return (
                    <div key={t.id} className="overrideItem">
                      <div className="main">
                        <span className="payee">
                          {t.name} · {t.currency} · {t.start_date} → {t.end_date}
                          {active && ' · active'}
                        </span>
                        <span className="meta">
                          → {t.category_name ?? t.category_id}
                          {t.excluded_max_categories.length > 0 && (
                            <>
                              {' · keeps '}
                              <span dir="auto">{t.excluded_max_categories.join(', ')}</span>
                            </>
                          )}
                          {!validCategoryIds.has(t.category_id) && (
                            <span
                              className="staleBadge"
                              title="This category no longer exists in YNAB"
                            >
                              category missing
                            </span>
                          )}
                        </span>
                        <span className="date">
                          Updated {new Date(t.updated_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="overrideActions">
                        <button className="linkBtn" onClick={() => handleEdit(t)}>
                          Edit
                        </button>
                        <button className="linkBtn danger" onClick={() => handleDelete(t)}>
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
