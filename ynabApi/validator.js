// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const validateExpense = (expense) => {
  if (!expense.account_id || typeof expense.account_id !== 'string') {
    return { valid: false, message: 'Missing or invalid account_id' };
  }
  if (!UUID_REGEX.test(expense.account_id)) {
    return { valid: false, message: `account_id must be a valid UUID format. Got: ${expense.account_id}` };
  }
  if (!expense.date || !/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) {
    return { valid: false, message: 'Missing or invalid date format (YYYY-MM-DD)' };
  }
  const expenseDate = new Date(expense.date);
  const today = new Date();
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(today.getFullYear() - 5);

  if (expenseDate > today) {
    return { valid: false, message: 'Date cannot be in the future' };
  }
  if (expenseDate < fiveYearsAgo) {
    return { valid: false, message: 'Date cannot be more than 5 years in the past' };
  }
  if (
    expense.amount === undefined ||
    typeof expense.amount !== 'number' ||
    !Number.isInteger(expense.amount)
  ) {
    return { valid: false, message: 'Missing or invalid amount (must be an integer)' };
  }
  if (expense.payee_name && typeof expense.payee_name !== 'string') {
    return { valid: false, message: 'Invalid payee_name' };
  }
  if (
    expense.category_id !== null &&
    (typeof expense.category_id !== 'string' && expense.category_id !== '')
  ) {
    return { valid: false, message: 'Invalid category_id' };
  }
  return { valid: true };
};

export const validateExpenses = (expenses) =>
  expenses.filter((expense) => {
    const result = validateExpense(expense);
    if (!result.valid) {
      console.log('Invalid expense:', result.message, expense);
    }
    return result.valid;
  });
