export const formatDateForYNAB = (excelDate) => {
  if (!excelDate) return '';
  const [day, month, year] = excelDate.split('-');
  const date = new Date(`${year}-${month}-${day}`);
  return date?.toISOString()?.split('T')[0];
};
