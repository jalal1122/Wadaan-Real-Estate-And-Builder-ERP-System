export { formatPKR } from './formatters';

/**
 * Formats a date string or Date object into human-readable DD-MMM-YYYY format (e.g. "15 Oct 2026").
 */
export const formatDate = (dateStr: string | Date | null | undefined): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
