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

  let dueDateStr: string;
  if (typeof dueDate === 'string') {
    dueDateStr = dueDate.substring(0, 10);
  } else {
    try {
      dueDateStr = dueDate.toISOString().split('T')[0];
    } catch {
      return false;
    }
  }

  const now = new Date();
  const todayUTC = now.toISOString().split('T')[0];
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // If due date is today or in the future in either UTC or local timezone, it is not overdue
  if (dueDateStr >= todayUTC || dueDateStr >= todayLocal) {
    return false;
  }

  return true;
};

/**
 * Calculates the number of calendar days an invoice is overdue (0 if today or in the future).
 */
export const getDaysOverdue = (dueDate: string | Date | null | undefined): number => {
  if (!dueDate) return 0;

  let dueDateStr: string;
  let targetTime: number;
  if (typeof dueDate === 'string') {
    dueDateStr = dueDate.substring(0, 10);
    const [y, m, d] = dueDateStr.split('-').map(Number);
    targetTime = new Date(y, m - 1, d).getTime();
  } else {
    try {
      dueDateStr = dueDate.toISOString().split('T')[0];
      targetTime = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime();
    } catch {
      return 0;
    }
  }

  const now = new Date();
  const todayUTC = now.toISOString().split('T')[0];
  const todayLocal = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  if (dueDateStr >= todayUTC || dueDateStr >= todayLocal) {
    return 0;
  }

  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diffDays = Math.floor((nowDate - targetTime) / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

