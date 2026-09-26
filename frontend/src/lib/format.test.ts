import { describe, it, expect } from 'vitest';
import { isInvoiceOverdue, getDaysOverdue, formatDate } from './format';

describe('format utilities & overdue calculations', () => {
  it('formatDate formats valid ISO dates cleanly', () => {
    expect(formatDate('2026-09-20T00:00:00.000Z')).toBe('20 Sept 2026');
    expect(formatDate(null)).toBe('—');
  });

  describe('isInvoiceOverdue', () => {
    it('returns false if invoice status is PAID or PENDING_CLEARANCE', () => {
      expect(isInvoiceOverdue('2020-01-01', 'PAID')).toBe(false);
      expect(isInvoiceOverdue('2020-01-01', 'PENDING_CLEARANCE')).toBe(false);
    });

    it('returns false if dueDate is in the future', () => {
      const futureDate = new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0];
      expect(isInvoiceOverdue(futureDate, 'UNPAID')).toBe(false);
      expect(isInvoiceOverdue(futureDate, 'PARTIAL')).toBe(false);
    });

    it('returns false if dueDate is today', () => {
      const today = new Date().toISOString().split('T')[0];
      expect(isInvoiceOverdue(today, 'UNPAID')).toBe(false);
    });

    it('returns true if dueDate is in the past for UNPAID or PARTIAL', () => {
      const pastDate = new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0];
      expect(isInvoiceOverdue(pastDate, 'UNPAID')).toBe(true);
      expect(isInvoiceOverdue(pastDate, 'PARTIAL')).toBe(true);
    });
  });

  describe('getDaysOverdue', () => {
    it('returns 0 for future or today dates', () => {
      const futureDate = new Date(Date.now() + 86400000 * 10).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      expect(getDaysOverdue(futureDate)).toBe(0);
      expect(getDaysOverdue(today)).toBe(0);
    });

    it('returns positive days count for past dates', () => {
      const pastDate = new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0];
      expect(getDaysOverdue(pastDate)).toBeGreaterThanOrEqual(5);
    });
  });
});
