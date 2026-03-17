const MIN_YEAR = 2020;
const MAX_YEARS_IN_FUTURE = 1;

const isReasonableDate = (date) => {
  const year = date.getFullYear();
  const maxYear = new Date().getFullYear() + MAX_YEARS_IN_FUTURE;
  return year >= MIN_YEAR && year <= maxYear;
};

export const formatDateForYNAB = (excelDate) => {
  if (!excelDate) return '';
  
  if (typeof excelDate === 'number') {
    if (excelDate < 1) return '';
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime()) && isReasonableDate(date)) {
      return date.toISOString().split('T')[0];
    }
  }
  
  if (typeof excelDate === 'string') {
    const parts = excelDate.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year) {
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime()) && isReasonableDate(date)) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    const date = new Date(excelDate);
    if (!isNaN(date.getTime()) && isReasonableDate(date)) {
      return date.toISOString().split('T')[0];
    }
  }
  
  console.warn(`⚠️ Unable to parse date: ${excelDate}`);
  return '';
};
