export const validateExpense = (expense) => {
  if (!expense.account_id || typeof expense.account_id !== 'string') {
    return { valid: false, message: 'Missing or invalid account_id' };
  }
  if (!expense.date || !/^\d{4}-\d{2}-\d{2}$/.test(expense.date)) {
    return { valid: false, message: 'Missing or invalid date format (YYYY-MM-DD)' };
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
