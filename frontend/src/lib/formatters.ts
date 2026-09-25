/**
 * Currency and date formatting utilities for Wadaan ERP.
 */

/**
 * Formats a numeric value or numeric string into Pakistani Rupee (PKR) currency format.
 * Example: 1500000 -> "PKR 1,500,000" or "Rs. 1,500,000" depending on locale output.
 */
export const formatPKR = (value: string | number): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num === null || num === undefined || isNaN(num)) {
    return 'PKR 0';
  }
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(num);
};
