import Decimal from 'decimal.js';
import { MathUtility as BaseMathUtility } from './math.util';

export class DateUtility {
  /**
   * Calculates the number of full days between two dates.
   * If dateB > dateA, returns positive number.
   * Example: DateUtility.daysBetween(dueDate, new Date()) -> days overdue.
   */
  static daysBetween(dateA: Date | string, dateB: Date | string): number {
    const dA = typeof dateA === 'string' ? new Date(dateA) : dateA;
    const dB = typeof dateB === 'string' ? new Date(dateB) : dateB;
    const diffMs = dB.getTime() - dA.getTime();
    return Math.floor(diffMs / 86_400_000);
  }
}

export class MathUtility extends BaseMathUtility {
  // Inherits create, add, subtract, isZeroSum, and safePercentage
}
