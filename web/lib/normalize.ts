// Normalize a payee name to the exact string the worker uploads to YNAB.
//
// IMPORTANT: this MUST stay byte-for-byte equivalent to the regex used in the
// worker at mapper/expenseMapper.js:
//   payee_name?.replace(/[\\/]/g, '') ?? ''
// Overrides are stored under this normalized key so the mapper can match them.
export const normalizePayeeName = (name: string): string =>
  (name ?? '').replace(/[\\/]/g, '');
