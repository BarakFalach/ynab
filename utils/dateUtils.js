export const formatDateForYNAB = (excelDate) => {
  if (!excelDate) return '';
  
  // Handle Excel serial date numbers
  if (typeof excelDate === 'number') {
    // Excel epoch starts from 1900-01-01, but Excel incorrectly treats 1900 as a leap year
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // Handle string dates in DD-MM-YYYY format
  if (typeof excelDate === 'string') {
    const parts = excelDate.split('-');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      if (day && month && year) {
        const date = new Date(`${year}-${month}-${day}`);
        // Check if date is valid
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    
    // Try parsing as ISO date string
    const date = new Date(excelDate);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }
  
  // If all parsing attempts fail, return empty string
  console.warn(`⚠️ Unable to parse date: ${excelDate}`);
  return '';
};
