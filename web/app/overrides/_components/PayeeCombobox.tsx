'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { YnabPayee } from '@/lib/types';

const MAX_RESULTS = 50;

interface Props {
  payees: YnabPayee[];
  value: string; // selected payee name ('' when none)
  onChange: (name: string) => void;
}

export default function PayeeCombobox({ payees, value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the visible text in sync when the selection changes from outside
  // (e.g. clicking "Edit" on an existing override, or clearing after save).
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Close the dropdown when tapping/clicking elsewhere.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery(value); // revert to the selected value if nothing was picked
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? payees.filter((p) => p.name.toLowerCase().includes(q))
      : payees;
    return matches.slice(0, MAX_RESULTS);
  }, [payees, query]);

  const select = (name: string) => {
    onChange(name);
    setQuery(name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault();
        select(filtered[highlight].name);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery(value);
    }
  };

  return (
    <div ref={rootRef} className="combo">
      <input
        type="text"
        className="input"
        value={query}
        placeholder="Type to search payees…"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      {open && filtered.length > 0 && (
        <ul className="listbox" role="listbox">
          {filtered.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === highlight}
              className={`option${i === highlight ? ' active' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                select(p.name);
              }}
              onMouseEnter={() => setHighlight(i)}
            >
              {p.name}
            </li>
          ))}
        </ul>
      )}
      {open && query.trim() && filtered.length === 0 && (
        <ul className="listbox">
          <li className="option muted">No matches</li>
        </ul>
      )}
    </div>
  );
}
