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

/**
 * Determines whether a deal invoice or milestone is overdue.
 * An invoice is overdue if it is not settled (PAID or PENDING_CLEARANCE) and its due date has passed.
 */
export const isInvoiceOverdue = (
  dueDate: string | Date | null | undefined,
  paymentStatus?: string
): boolean => {
  if (!dueDate) return false;
  if (paymentStatus === 'PAID' || paymentStatus === 'PENDING_CLEARANCE') return false;

  let dueYear: number;
  let dueMonth: number;
  let dueDay: number;

  if (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueDate)) {
    const [y, m, d] = dueDate.substring(0, 10).split('-').map(Number);
    dueYear = y;
    dueMonth = m - 1;
    dueDay = d;
  } else {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return false;
    dueYear = d.getFullYear();
    dueMonth = d.getMonth();
    dueDay = d.getDate();
  }

  const now = new Date();
  const endOfDueDay = new Date(dueYear, dueMonth, dueDay, 23, 59, 59, 999).getTime();

  return endOfDueDay < now.getTime();
};

/**
 * Calculates the number of calendar days an invoice is overdue (0 if today or in the future).
 */
export const getDaysOverdue = (dueDate: string | Date | null | undefined): number => {
  if (!dueDate) return 0;
  let dueYear: number;
  let dueMonth: number;
  let dueDay: number;

  if (typeof dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dueDate)) {
    const [y, m, d] = dueDate.substring(0, 10).split('-').map(Number);
    dueYear = y;
    dueMonth = m - 1;
    dueDay = d;
  } else {
    const d = new Date(dueDate);
    if (isNaN(d.getTime())) return 0;
    dueYear = d.getFullYear();
    dueMonth = d.getMonth();
    dueDay = d.getDate();
  }

  const now = new Date();
  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const targetDueDate = new Date(dueYear, dueMonth, dueDay).getTime();
  const diffDays = Math.floor((nowDate - targetDueDate) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

